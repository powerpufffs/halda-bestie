import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";
import { handleAgentTurn } from "./agent/handle-turn.ts";
import { createAgentStateStore } from "./agent/state-store-factory.ts";
import { parseAllowedSenders, resolveSenderId } from "./allowlist.ts";
import {
  createOpenAiCompatibleClient,
  describeLlmConfig,
  readLlmConfig,
} from "./llm/openai-compatible.ts";
import { splitIntoTextBubbles } from "./message-chunks.ts";

// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts
const agentTransport =
  process.env.AGENT_TRANSPORT === "terminal" ? "terminal" : "imessage";
const imessageMode = process.env.IMESSAGE_MODE === "local" ? "local" : "cloud";
const stateStore = createAgentStateStore();
const llmConfig = readLlmConfig();
const llmClient = createOpenAiCompatibleClient(llmConfig);
const llmRuntime =
  llmClient && llmConfig.enabled
    ? { client: llmClient, config: llmConfig }
    : undefined;
const allowLlmFallback = process.env.ALLOW_LLM_FALLBACK === "true";

if (!llmRuntime && !allowLlmFallback) {
  console.error(
    [
      "[halda] LLM is required for conversational replies.",
      "Set LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL in the process environment before starting the agent.",
      "For isolated state-machine smoke tests only, set ALLOW_LLM_FALLBACK=true.",
    ].join("\n"),
  );
  process.exit(1);
}

if (llmRuntime) {
  await verifyLlmRuntime(llmRuntime);
}

const app = await createSpectrumApp();

console.log(`[halda] Transport is ${agentTransport}.`);
if (agentTransport === "imessage") {
  console.log(`[halda] iMessage mode is ${imessageMode}.`);
}
console.log(`[halda] LLM is ${describeLlmConfig(llmConfig)}.`);
if (!llmClient) {
  console.warn(
    "[halda] LLM fallback is enabled; outgoing replies will use the outage fallback.",
  );
}
console.log(
  agentTransport === "terminal"
    ? "[halda] Starting terminal chat UI."
    : imessageMode === "local"
      ? "[halda] Watching inbound messages to this Mac's Messages.app account."
      : "[halda] Listening through the Spectrum project line.",
);

const numberAllowList = parseAllowedSenders(
  process.env.ALLOWED_SENDERS ?? "+18015896615,+18018756414,+18018746129",
);
console.log(`[halda] Allowlist active for ${numberAllowList.size} sender(s).`);

// `app.messages` is an async iterable. Each tick yields a `space` (the
// conversation) and an inbound `message`. Reply by awaiting `space.send(...)`.
for await (const [space, message] of app.messages) {
  console.log("[halda] Received message", {
    id: message.id,
    platform: message.platform,
    type: message.content.type,
    sender: message.sender?.id ?? "unknown",
    space: space.id,
  });

  const senderId =
    resolveSenderId(message.sender?.id, space.id) ??
    (agentTransport === "terminal" ? space.id : undefined);
  if (
    message.content.type === "text" &&
    senderId &&
    (agentTransport === "terminal" || numberAllowList.has(senderId))
  ) {
    const result = await handleAgentTurn(
      {
        channel: agentTransport,
        userId: `${agentTransport}:${senderId}`,
        threadId: space.id,
        text: message.content.text,
        timestamp: message.timestamp ?? new Date(),
        externalMessageId: message.id,
      },
      stateStore,
      { llmRuntime },
    );

    console.log("[halda] Sending reply", {
      to: space.id,
      lifecycleStage: result.profile.lifecycleStage,
      generationMode: result.generationMode,
      selectedToolKeys: result.selectedToolKeys,
      toolCallDefinitionCount: result.toolCallDefinitions.length,
      goalStack: result.goalStack,
      text: result.reply,
    });

    try {
      const bubbles = splitIntoTextBubbles(result.reply);
      for (const [index, bubble] of bubbles.entries()) {
        // eslint-disable-next-line no-await-in-loop -- preserve human-like bubble order.
        await space.send(bubble);
        console.log("[halda] Reply bubble sent", {
          to: space.id,
          index: index + 1,
          count: bubbles.length,
        });
      }
    } catch (error) {
      console.error("[halda] Failed to send reply", error);
    }
  } else if (message.content.type !== "text") {
    console.log("[halda] Ignoring non-text message", {
      id: message.id,
      type: message.content.type,
    });
  } else {
    console.log("[halda] Ignoring message from non-allowlisted sender", {
      id: message.id,
      sender: senderId ?? message.sender?.id ?? "unknown",
      space: space.id,
    });
  }
}

async function createSpectrumApp() {
  try {
    if (agentTransport === "terminal") {
      return await Spectrum({
        providers: [terminal.config()],
      });
    }

    return await Spectrum({
      projectId: process.env.PROJECT_ID!,
      projectSecret: process.env.PROJECT_SECRET!,
      providers: [imessage.config({ local: imessageMode === "local" })],
    });
  } catch (error) {
    if (imessageMode === "local" && isIMessageDatabaseError(error)) {
      console.error(
        [
          "[halda] Could not open the local Messages database.",
          "",
          "Local iMessage mode requires macOS Full Disk Access for the app running this process.",
          "Open System Settings -> Privacy & Security -> Full Disk Access, then add your terminal or IDE",
          "(for example Terminal, Warp, VS Code, Cursor, or the Codex app). Restart that app afterwards.",
          "",
          "If the error mentioned a missing better_sqlite3.node binding, run:",
          "  bun run repair:imessage-native",
        ].join("\n"),
      );
      process.exit(1);
    }

    throw error;
  }
}

function isIMessageDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "DATABASE" ||
    String(maybeError.message ?? "").includes("database")
  );
}

async function verifyLlmRuntime(
  runtime: NonNullable<typeof llmRuntime>,
): Promise<void> {
  try {
    await runtime.client.chat.completions.create({
      model: runtime.config.model,
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
      max_completion_tokens: 8,
    });
  } catch (error) {
    console.error(
      [
        "[halda] LLM healthcheck failed; refusing to start live messaging.",
        `Provider: ${describeLlmConfig(runtime.config)}`,
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        "Check LLM_API_KEY / LLM_BASE_URL / LLM_MODEL, then restart the agent.",
      ].join("\n"),
    );
    process.exit(1);
  }
}

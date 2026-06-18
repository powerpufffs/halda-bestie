import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { handleAgentTurn } from "./agent/handle-turn.ts";
import { createAgentStateStore } from "./agent/state-store-factory.ts";
import { parseAllowedSenders, resolveSenderId } from "./allowlist.ts";
import {
  createOpenAiCompatibleClient,
  describeLlmConfig,
  readLlmConfig,
} from "./llm/openai-compatible.ts";

// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts
const imessageMode = process.env.IMESSAGE_MODE === "local" ? "local" : "cloud";
const stateStore = createAgentStateStore();
const llmConfig = readLlmConfig();
const llmClient = createOpenAiCompatibleClient(llmConfig);

const app = await createSpectrumApp();

console.log(`[halda] Agent is running in ${imessageMode} mode.`);
console.log(`[halda] LLM is ${describeLlmConfig(llmConfig)}.`);
if (!llmClient) {
  console.log(
    "[halda] Using deterministic agent scaffold until LLM_* env vars are configured.",
  );
}
console.log(
  imessageMode === "local"
    ? "[halda] Watching inbound messages to this Mac's Messages.app account."
    : "[halda] Listening through the Spectrum project line.",
);

const numberAllowList = parseAllowedSenders(
  process.env.ALLOWED_SENDERS ??
    "+18015896615,+18018756414,+18018746129",
);
console.log(
  `[halda] Allowlist active for ${numberAllowList.size} sender(s).`,
);

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

  const senderId = resolveSenderId(message.sender?.id, space.id);
  if (
    message.content.type === "text" &&
    senderId &&
    numberAllowList.has(senderId)
  ) {
    const result = await handleAgentTurn(
      {
        channel: "imessage",
        userId: `imessage:${senderId}`,
        threadId: space.id,
        text: message.content.text,
        timestamp: message.timestamp ?? new Date(),
      },
      stateStore,
    );

    console.log("[halda] Sending reply", {
      to: space.id,
      lifecycleStage: result.profile.lifecycleStage,
      selectedToolKeys: result.selectedToolKeys,
      toolCallDefinitionCount: result.toolCallDefinitions.length,
      goalStack: result.goalStack,
      text: result.reply,
    });

    try {
      await space.send(result.reply);
      console.log("[halda] Reply sent", { to: space.id });
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
    return await Spectrum({
      projectId: process.env.PROJECT_ID!,
      projectSecret: process.env.PROJECT_SECRET!,
      providers: [
        // iMessage
        imessage.config({ local: imessageMode === "local" }),
      ],
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

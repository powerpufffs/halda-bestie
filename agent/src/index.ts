import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { handleAgentTurn } from "./agent/handle-turn.ts";
import { InMemoryAgentStateStore } from "./agent/state-store.ts";

// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts
const imessageMode = process.env.IMESSAGE_MODE === "local" ? "local" : "cloud";
const stateStore = new InMemoryAgentStateStore();

const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [
    // iMessage
    imessage.config({ local: imessageMode === "local" }),
  ],
});

console.log(`[halda] Agent is running in ${imessageMode} mode.`);
console.log(
  imessageMode === "local"
    ? "[halda] Watching inbound messages to this Mac's Messages.app account."
    : "[halda] Listening through the Spectrum project line.",
);

const numberAllowList = new Set(
  (process.env.ALLOWED_SENDERS ?? "+18015896615,+18018756414")
    .split(",")
    .map((sender) => sender.trim())
    .filter(Boolean),
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

  const senderId = message.sender?.id;
  if (message.content.type === "text" && senderId && numberAllowList.has(senderId)) {
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
      text: result.reply,
    });

    try {
      await space.send(result.reply);
      console.log("[halda] Reply sent", { to: space.id });
    } catch (error) {
      console.error("[halda] Failed to send reply", error);
    }
  } else {
    console.log("[halda] Ignoring non-text message", {
      id: message.id,
      type: message.content.type,
    });
  }
}

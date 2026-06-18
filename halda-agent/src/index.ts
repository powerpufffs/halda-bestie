import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts
const imessageMode = process.env.IMESSAGE_MODE === "local" ? "local" : "cloud";

const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [
    // iMessage
    imessage.config({ local: imessageMode === "local" }),
  ],
});

console.log(`[halda] Echo bot is running in ${imessageMode} mode.`);
console.log(
  imessageMode === "local"
    ? "[halda] Watching inbound messages to this Mac's Messages.app account."
    : "[halda] Listening through the Spectrum project line.",
);

const numberAllowList = ["+18015896615", "+18018756414"];
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

  if (message.content.type === "text" && numberAllowList.includes(message.sender?.id ?? "")) {
    const reply = `echo: ${message.content.text}`;

    console.log("[halda] Sending reply", { to: space.id, text: reply });

    try {
      await space.send(reply);
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

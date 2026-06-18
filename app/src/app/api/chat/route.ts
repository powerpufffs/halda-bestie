import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { readWebSession } from "@/lib/lightweight-auth";
import { handleWebChatTurn, type WebChatMessage } from "@/lib/web-chat";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const session = await readWebSession();
  if (!session) return new Response("not signed in", { status: 401 });

  const body = await request.json() as { messages?: UIMessage[] };
  const text = extractLatestUserText(body.messages);
  if (!text) return new Response("missing message", { status: 400 });

  const stream = createUIMessageStream<WebChatMessage>({
    originalMessages: body.messages as WebChatMessage[] | undefined,
    async execute({ writer }) {
      const reply = await handleWebChatTurn({ session, text });
      const textId = `web-reply-${Date.now()}`;

      writer.write({ type: "text-start", id: textId });
      for (const chunk of chunkText(reply)) {
        writer.write({ type: "text-delta", id: textId, delta: chunk });
        // Small beat so the demo visibly streams without making the UI feel slow.
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      writer.write({ type: "text-end", id: textId });
    },
    onError: () => "halda had trouble answering from the web. try once more.",
  });

  return createUIMessageStreamResponse({ stream });
}

function extractLatestUserText(messages: UIMessage[] | undefined): string | undefined {
  const message = messages?.toReversed().find((item) => item.role === "user");
  if (!message) return undefined;

  const text = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return text || undefined;
}

function chunkText(text: string): string[] {
  const chunks = text.match(/\S+\s*/g);
  return chunks && chunks.length > 0 ? chunks : [text];
}

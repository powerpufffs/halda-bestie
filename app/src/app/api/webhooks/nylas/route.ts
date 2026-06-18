import { after, NextResponse, type NextRequest } from "next/server";
import { processHaldaInboxWebhook } from "@/lib/halda-email-channel";
import {
  processNylasMessageWebhook,
  saveWebhookEvent,
  updateWebhookEventStatus,
} from "@/lib/email-ingestion";
import { verifyNylasSignature } from "@/lib/nylas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");
  if (!challenge) {
    return new NextResponse("ok", {
      status: 200,
      headers: {
        "Content-Length": "2",
        "Content-Type": "text/plain",
      },
    });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: {
      "Content-Length": String(Buffer.byteLength(challenge)),
      "Content-Type": "text/plain",
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-nylas-signature") ?? request.headers.get("X-Nylas-Signature");
  const signatureVerified = verifyNylasSignature(rawBody, signature);
  if (!signatureVerified) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const eventType = readEventType(payload);
  const eventId = await saveWebhookEvent({
    eventType,
    externalEventId: readExternalEventId(payload),
    payload,
    signatureVerified,
  });

  after(async () => {
    try {
      if (eventType.startsWith("message.")) {
        const handledByHaldaInbox = await processHaldaInboxWebhook(payload);
        if (!handledByHaldaInbox) {
          await processNylasMessageWebhook(payload);
        }
        await updateWebhookEventStatus({ id: eventId, status: "processed" });
      } else {
        await updateWebhookEventStatus({ id: eventId, status: "ignored" });
      }
    } catch (error) {
      await updateWebhookEventStatus({
        id: eventId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return NextResponse.json({ ok: true });
}

function readEventType(payload: Record<string, unknown>): string {
  return readString(payload.type) ?? readString(payload.event_type) ?? "unknown";
}

function readExternalEventId(payload: Record<string, unknown>): string | undefined {
  return readString(payload.id) ?? readString(payload.webhook_delivery_id);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

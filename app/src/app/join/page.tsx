import {
  StudentDashboard,
  type InboxDashboardView,
} from "@/components/halda/student-dashboard";
import { getInboxDashboard } from "@/lib/email-ingestion";
import {
  createSmsVerificationChallenge,
  readWebSession,
  type VerifiedWebSession,
} from "@/lib/lightweight-auth";
import {
  resolveWebsiteHandoffCode,
  verifyWebsiteHandoffToken,
} from "@/lib/website-handoff";
import { loadWebChatMessages, type WebChatMessage } from "@/lib/web-chat";
import { AutoSubmitVerification } from "./auto-submit-verification";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

const emptyDashboard: InboxDashboardView = {
  accounts: [],
  messages: [],
  extractions: [],
};

export default async function JoinPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const demo = readQuery(params.demo);
  const demoUserId = readDemoUserId(readQuery(params.u));
  const demoCode = readDemoCode(readQuery(params.otp));
  const code = readQuery(params.c);
  const token = readQuery(params.token) ?? await resolveOptionalHandoffCode(code);
  const connected = readQuery(params.connected);
  const error = readQuery(params.error);
  const forceResend = readQuery(params.resend) === "1";
  const sendCode = readQuery(params.send) === "1" || forceResend;
  const synced = readQuery(params.synced);
  const verified = readQuery(params.verified);

  if (demo && demoUserId) {
    const challenge = sendCode || demoCode
      ? await createSmsVerificationChallenge({
          payload: demoPayload({ code: demo, userId: demoUserId }),
          handoffToken: demoHandoffToken(demo, demoUserId),
          codeOverride: demoCode,
          forceNew: forceResend || Boolean(demoCode),
        })
      : undefined;

    return (
      <JoinShell
        autoCode={challenge ? demoCode : undefined}
        challengeId={challenge?.id}
        error={error}
        expiresAt={challenge?.expiresAt}
        maskedDestination={challenge?.maskedDestination}
        resent={challenge ? forceResend || !challenge.reused : false}
        demo={demo}
        demoUserId={demoUserId}
      />
    );
  }

  const session = await readWebSession();

  if (!token && session) {
    return renderDashboard(session, {
      connected,
      handoffVerified: verified ? "sms verified. your console is loaded." : "signed in.",
      synced,
    });
  }

  if (!token) {
    return (
      <JoinShell
        error={error ?? "open the secure link halda texted you to finish sign in."}
      />
    );
  }

  let tokenChallenge:
    | Awaited<ReturnType<typeof createSmsVerificationChallenge>>
    | undefined;

  try {
    const payload = verifyWebsiteHandoffToken(token);
    if (session?.externalUserId === payload.userId) {
      return renderDashboard(session, {
        connected,
        handoffVerified: "sms verified. your console is loaded.",
        synced,
      });
    }

    tokenChallenge = await createSmsVerificationChallenge({
      payload,
      handoffToken: token,
      forceNew: forceResend,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "handoff failed.";
    if (session) {
      return renderDashboard(session, {
        connected,
        handoffVerified: "signed in.",
        synced,
      });
    }

    return <JoinShell error={message} />;
  }

  return (
    <JoinShell
      challengeId={tokenChallenge.id}
      debugCode={tokenChallenge.debugCode}
      error={error}
      expiresAt={tokenChallenge.expiresAt}
      maskedDestination={tokenChallenge.maskedDestination}
      resent={forceResend || !tokenChallenge.reused}
      token={token}
    />
  );
}

async function resolveOptionalHandoffCode(code: string | undefined): Promise<string | undefined> {
  if (!code) return undefined;
  return resolveWebsiteHandoffCode(code);
}

function readDemoUserId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return decoded.includes(":") ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function readDemoCode(value: string | undefined): string | undefined {
  const code = value?.replace(/\D/g, "");
  return code?.length === 6 ? code : undefined;
}

function demoPayload(input: { code: string; userId: string }) {
  return {
    userId: input.userId,
    threadId: `demo:${input.code}`,
    lifecycleStage: "unknown",
    interests: [],
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

function demoHandoffToken(code: string, userId: string): string {
  return `demo:${code}:${userId}`;
}

async function renderDashboard(
  session: VerifiedWebSession,
  status: {
    connected?: string;
    handoffVerified?: string;
    synced?: string;
  },
) {
  let dashboard = emptyDashboard;
  let dataWarning: string | undefined;
  let webChatMessages: WebChatMessage[] = [];

  try {
    dashboard = await getInboxDashboard(session.userId);
  } catch {
    dataWarning = "dashboard data is offline locally, but your sms session worked.";
  }

  try {
    webChatMessages = await loadWebChatMessages(session);
  } catch {
    dataWarning ??= "chat history is offline locally, but your sms session worked.";
  }

  if (!dataWarning && dashboard === emptyDashboard) {
    dataWarning = "dashboard data is empty locally, but your sms session worked.";
  }

  return (
    <StudentDashboard
      connected={status.connected}
      dashboard={dashboard}
      dataWarning={dataWarning}
      externalUserId={session.externalUserId}
      handoffVerified={status.handoffVerified}
      sessionVerified
      synced={status.synced}
      webChatMessages={webChatMessages}
    />
  );
}

function JoinShell({
  autoCode,
  challengeId,
  debugCode,
  demo,
  demoUserId,
  error,
  expiresAt,
  maskedDestination,
  resent,
  token,
}: {
  autoCode?: string;
  challengeId?: string;
  debugCode?: string;
  demo?: string;
  demoUserId?: string;
  error?: string;
  expiresAt?: string;
  maskedDestination?: string;
  resent?: boolean;
  token?: string;
}) {
  return (
    <main className="min-h-screen bg-[#e7e0d4] text-[#17202a]">
      <div className="mx-auto grid min-h-screen w-full max-w-[430px] place-items-center bg-[#ece6da] px-4 py-8">
      <section className="w-full rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-6 shadow-[6px_6px_0_#17202a]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[8px] border-2 border-[#17202a] bg-[#17202a] text-sm font-bold text-[#fffaf0] shadow-[3px_3px_0_#17202a]">
            h
          </div>
          <div>
            <p className="font-bold tracking-[0.02em]">halda</p>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#596673]">secure console sign in</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black">verify your phone</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#596673]">
          {challengeId && maskedDestination
            ? `enter the 6 digit code sent to ${maskedDestination ?? "your phone"}.`
            : demo && demoUserId
              ? "send a one-time code to this conversation, then enter it here."
              : "this link needs a valid sms handoff before we can open your console."}
        </p>

        {resent && challengeId ? (
          <p className="mt-3 rounded-[6px] border-2 border-[#17202a] bg-[#d7eee9] px-3 py-2 text-sm text-[#17202a]">
            code sent. it expires at {formatTime(expiresAt)}.
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-[6px] border-2 border-[#17202a] bg-[#f3c7bb] px-3 py-2 text-sm text-[#17202a]">
            {error}
          </p>
        ) : null}

        {demo && demoUserId && !challengeId ? (
          <div className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">code</span>
              <input
                autoComplete="one-time-code"
                className="h-12 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 text-lg tracking-[0.28em] text-[#9aa9b3] outline-none"
                disabled
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
              />
            </label>
            <a
              className="grid h-11 place-items-center rounded-[6px] border-2 border-[#17202a] bg-[#17202a] px-4 text-sm font-bold text-[#fffaf0] shadow-[4px_4px_0_#17202a] transition hover:-translate-y-0.5"
              href={`/join?demo=${encodeURIComponent(demo)}&u=${encodeURIComponent(Buffer.from(demoUserId).toString("base64url"))}&send=1`}
            >
              send code
            </a>
          </div>
        ) : null}

        {challengeId && (token || (demo && demoUserId)) ? (
          <form action="/api/auth/verify-sms" className="mt-5 grid gap-3" id="sms-verification-form" method="post">
            <input name="challengeId" type="hidden" value={challengeId} />
            {token ? <input name="token" type="hidden" value={token} /> : null}
            {demo && demoUserId ? (
              <>
                <input name="demo" type="hidden" value={demo} />
                <input name="demoUserId" type="hidden" value={demoUserId} />
              </>
            ) : null}
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">code</span>
              <input
                autoComplete="one-time-code"
                className="h-12 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 text-lg tracking-[0.28em] outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
                defaultValue={autoCode ? "" : undefined}
                inputMode="numeric"
                maxLength={6}
                name="code"
                pattern="[0-9]*"
                placeholder="000000"
                required
              />
            </label>
            <button
              className="h-11 rounded-[6px] border-2 border-[#17202a] bg-[#17202a] px-4 text-sm font-bold text-[#fffaf0] shadow-[4px_4px_0_#17202a] transition hover:-translate-y-0.5"
              type="submit"
            >
              open my console
            </button>
          </form>
        ) : null}

        {autoCode ? (
          <AutoSubmitVerification code={autoCode} formId="sms-verification-form" />
        ) : null}

        {debugCode ? (
          <p className="mt-4 rounded-md bg-[#fff7df] px-3 py-2 text-sm text-[#735316]">
            local demo code: <span className="font-mono font-semibold">{debugCode}</span>
          </p>
        ) : null}

        {token || (demo && demoUserId && challengeId) ? (
          <a
            className="mt-4 inline-flex text-sm font-bold text-[#17202a] underline-offset-4 hover:underline"
            href={token ? `/join?token=${encodeURIComponent(token)}&resend=1` : `/join?demo=${encodeURIComponent(demo ?? "")}&u=${encodeURIComponent(Buffer.from(demoUserId ?? "").toString("base64url"))}&resend=1`}
          >
            send a new code
          </a>
        ) : null}
      </section>
      </div>
    </main>
  );
}

function formatTime(value: string | undefined): string {
  if (!value) return "soon";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function readQuery(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

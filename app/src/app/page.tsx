import {
  StudentDashboard,
  type InboxDashboardView,
} from "@/components/halda/student-dashboard";
import { getInboxDashboard } from "@/lib/email-ingestion";
import { readWebSession } from "@/lib/lightweight-auth";
import { ensureUserForExternalId, readExternalUserId } from "@/lib/user-identity";
import { loadWebChatMessages, type WebChatMessage } from "@/lib/web-chat";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

const emptyDashboard: InboxDashboardView = {
  accounts: [],
  messages: [],
  extractions: [],
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await readWebSession();
  const externalUserId = readQuery(params.userId)
    ? readExternalUserId(readQuery(params.userId))
    : session?.externalUserId ?? readExternalUserId(undefined);
  const error = readQuery(params.error);
  const connected = readQuery(params.connected);
  const synced = readQuery(params.synced);
  let dashboard = emptyDashboard;
  let dataWarning: string | undefined;
  const sessionMatchesUser = session?.externalUserId === externalUserId;
  let webChatMessages: WebChatMessage[] = [];

  try {
    const userId = session && sessionMatchesUser
      ? session.userId
      : await ensureUserForExternalId(externalUserId);
    dashboard = await getInboxDashboard(userId);
  } catch {
    dataWarning =
      "inbox data is offline locally, so the shell is showing an empty dashboard.";
  }

  if (session && sessionMatchesUser) {
    try {
      webChatMessages = await loadWebChatMessages(session);
    } catch {
      dataWarning ??= "chat history is offline locally, but the console is ready.";
    }
  }

  return (
    <StudentDashboard
      connected={connected}
      dashboard={dashboard}
      dataWarning={dataWarning}
      error={error}
      externalUserId={externalUserId}
      handoffVerified={sessionMatchesUser ? "signed in." : undefined}
      sessionVerified={sessionMatchesUser}
      synced={synced}
      webChatMessages={webChatMessages}
    />
  );
}

function readQuery(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

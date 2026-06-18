import {
  StudentDashboard,
  type InboxDashboardView,
} from "@/components/halda/student-dashboard";
import { getInboxDashboard } from "@/lib/email-ingestion";
import { ensureUserForExternalId, readExternalUserId } from "@/lib/user-identity";

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
  const externalUserId = readExternalUserId(readQuery(params.userId));
  const error = readQuery(params.error);
  const connected = readQuery(params.connected);
  const synced = readQuery(params.synced);
  let dashboard = emptyDashboard;
  let dataWarning: string | undefined;

  try {
    const userId = await ensureUserForExternalId(externalUserId);
    dashboard = await getInboxDashboard(userId);
  } catch {
    dataWarning =
      "inbox data is offline locally, so the shell is showing an empty dashboard.";
  }

  return (
    <StudentDashboard
      connected={connected}
      dashboard={dashboard}
      dataWarning={dataWarning}
      error={error}
      externalUserId={externalUserId}
      synced={synced}
    />
  );
}

function readQuery(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

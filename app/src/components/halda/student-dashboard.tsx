import { HaldaButton, HaldaProgress, HaldaTabs, HaldaTooltip } from "./base-ui";
import {
  CrewPanel,
  Empty,
  Metric,
  MissionPanel,
  Panel,
  SchoolPanel,
  Status,
  Tag,
  crewUpdates,
  formatDate,
  formatLabel,
  navItems,
  quickActions,
  schoolMatches,
  stringifyExtraction,
} from "./student-dashboard-widgets";
import { WebChatWidget } from "./web-chat-widget";
import type { WebChatMessage } from "@/lib/web-chat";

export interface InboxDashboardView {
  accounts: Array<{
    id: string;
    email_address: string | null;
    status: string;
    last_synced_at: Date | string | null;
    connected_at: Date | string;
  }>;
  messages: Array<{
    id: string;
    subject: string | null;
    from_address: string | null;
    received_at: Date | string | null;
    classification: string;
    college_related: boolean;
    snippet: string | null;
  }>;
  extractions: Array<{
    id: string;
    extraction_type: string;
    student_facing_summary: string | null;
    confidence: string | number;
    extracted_json: unknown;
  }>;
}

interface StudentDashboardProps {
  dashboard: InboxDashboardView;
  externalUserId: string;
  error?: string;
  connected?: string;
  synced?: string;
  dataWarning?: string;
  handoffVerified?: string;
  sessionVerified?: boolean;
  webChatMessages?: WebChatMessage[];
}

type DashboardIdentityProps = Pick<StudentDashboardProps, "externalUserId" | "sessionVerified"> & {
  accountCount: number;
};

export function StudentDashboard(props: StudentDashboardProps) {
  const inboxScore = Math.min(
    100,
    props.dashboard.extractions.length * 12 +
      props.dashboard.messages.filter((message) => message.college_related).length * 8,
  );

  return (
    <main className="min-h-screen bg-[#e7e0d4] text-[#17202a]" id="top">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#ece6da]">
        <MainColumn {...props} inboxScore={inboxScore} />
      </div>

      <MobileNav />
    </main>
  );
}

function MainColumn(props: StudentDashboardProps & { inboxScore: number }) {
  return (
    <section className="min-w-0 px-4 pb-28 pt-4">
      <MobileHeader />
      <HeroSection
        actionCount={props.dashboard.extractions.length}
        inboxScore={props.inboxScore}
        messageCount={props.dashboard.messages.length}
      />
      <StatusStack
        connected={props.connected}
        dataWarning={props.dataWarning}
        error={props.error}
        handoffVerified={props.handoffVerified}
        synced={props.synced}
      />
      <WorkspaceSection
        accountCount={props.dashboard.accounts.length}
        externalUserId={props.externalUserId}
        sessionVerified={props.sessionVerified}
      />
      <WebChatWidget
        enabled={Boolean(props.sessionVerified)}
        initialMessages={props.webChatMessages ?? []}
      />
      <SnapshotStack dashboard={props.dashboard} />
      <InboxPanels dashboard={props.dashboard} />
    </section>
  );
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <BrandLockup subtitle="mission control" />
      <HaldaTooltip label="demo mode keeps the user id editable while we wire auth and student accounts">
        ?
      </HaldaTooltip>
    </header>
  );
}

function BrandLockup({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-[8px] border-2 border-[#17202a] bg-[#17202a] text-sm font-bold text-[#fffaf0] shadow-[3px_3px_0_#17202a]">
        h
      </div>
      <div>
        <div className="font-bold tracking-[0.02em]">halda</div>
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#596673]">{subtitle}</div>
      </div>
    </div>
  );
}

function HeroSection({
  actionCount,
  inboxScore,
  messageCount,
}: {
  actionCount: number;
  inboxScore: number;
  messageCount: number;
}) {
  return (
    <section className="mt-5 grid gap-4">
      <div className="rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-5 shadow-[6px_6px_0_#17202a]">
        <div className="flex flex-col justify-between gap-5">
          <div>
            <p className="inline-flex rounded-[4px] border-2 border-[#17202a] bg-[#d7eee9] px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#17202a]">today</p>
            <h1 className="mt-2 text-[28px] font-black leading-tight text-[#17202a]">
              turn the college mess into a tiny next move
            </h1>
            <p className="mt-3 text-base font-medium leading-7 text-[#596673]">
              halda tracks the student lane, keeps open loops alive, and pulls real deadlines from the inbox.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric value={actionCount} label="open loops" />
            <Metric value={messageCount} label="emails read" />
          </div>
        </div>
        <QuickActions />
      </div>

      <Panel action={<span className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">junior</span>} title="season progress">
        <div className="grid gap-4">
          <HaldaProgress label="application runway" value={42} />
          <HaldaProgress label="inbox clarity" value={inboxScore} />
          <div className="rounded-[6px] border-2 border-[#17202a] bg-[#f4d17b] px-3 py-2 text-sm font-bold text-[#17202a]">
            next best move: pick one school list filter.
          </div>
        </div>
      </Panel>
    </section>
  );
}

function QuickActions() {
  return (
    <div className="mt-5 grid gap-2">
      {quickActions.map((action) => (
        <button
          className="group min-h-[72px] rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 text-left shadow-[3px_3px_0_#17202a] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#17202a]"
          key={action.label}
          type="button"
        >
          <span
            className={`block h-2 w-10 rounded-full ${
              action.tone === "teal"
                ? "bg-[#2a8c84]"
                : action.tone === "gold"
                  ? "bg-[#d9a441]"
                  : "bg-[#e46f5b]"
            }`}
          />
          <span className="mt-4 block text-sm font-bold text-[#17202a]">{action.label}</span>
          <span className="mt-1 block text-xs font-semibold text-[#596673]">{action.detail}</span>
        </button>
      ))}
    </div>
  );
}

function StatusStack({
  connected,
  dataWarning,
  error,
  handoffVerified,
  synced,
}: Pick<StudentDashboardProps, "connected" | "dataWarning" | "error" | "handoffVerified" | "synced">) {
  if (!error && !connected && !synced && !dataWarning && !handoffVerified) return null;

  return (
    <section className="mt-4 grid gap-3">
      {error ? <Status tone="bad">{error}</Status> : null}
      {handoffVerified ? <Status tone="good">{handoffVerified}</Status> : null}
      {connected ? (
        <Status tone="good">inbox connected. synced {synced ?? "0"} recent message(s).</Status>
      ) : synced ? (
        <Status tone="info">synced {synced} recent message(s).</Status>
      ) : null}
      {dataWarning ? <Status tone="info">{dataWarning}</Status> : null}
    </section>
  );
}

function WorkspaceSection({
  accountCount,
  externalUserId,
  sessionVerified,
}: DashboardIdentityProps) {
  return (
    <section className="mt-4 grid gap-4">
      <Panel
        action={<HaldaTooltip label="the tabs are Base UI primitives with halda styling">?</HaldaTooltip>}
        title="workspace"
      >
        <HaldaTabs
          items={[
            { value: "mission", label: "mission", kicker: "next 90 days", children: <MissionPanel /> },
            { value: "schools", label: "schools", kicker: "3 signals", children: <SchoolPanel /> },
            { value: "crew", label: "crew", kicker: "social proof", children: <CrewPanel /> },
          ]}
        />
      </Panel>

      <ConnectInboxPanel accountCount={accountCount} externalUserId={externalUserId} sessionVerified={sessionVerified} />
    </section>
  );
}

function ConnectInboxPanel({
  accountCount,
  externalUserId,
  sessionVerified,
}: DashboardIdentityProps) {
  return (
    <Panel action={<span className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">{accountCount} linked</span>} title="connect inbox">
      <form action="/api/nylas/auth" className="grid gap-3" method="get">
        {sessionVerified ? (
          <div className="rounded-[6px] border-2 border-[#17202a] bg-[#f4efdf] px-3 py-2">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">signed in as</div>
            <div className="mt-1 truncate font-mono text-xs font-semibold text-[#17202a]">{externalUserId}</div>
            <input name="userId" type="hidden" value={externalUserId} />
          </div>
        ) : (
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">demo user id</span>
            <input
              aria-label="demo user id"
              className="h-10 min-w-0 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#2a8c84]/30"
              defaultValue={externalUserId}
              name="userId"
            />
          </label>
        )}
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#596673]">email</span>
          <input
            aria-label="email to connect"
            className="h-10 min-w-0 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#2a8c84]/30"
            name="loginHint"
            placeholder="student@email.com"
          />
        </label>
        <select
          className="h-10 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#2a8c84]/30"
          defaultValue="google"
          name="provider"
        >
          <option value="google">google</option>
          <option value="microsoft">microsoft</option>
        </select>
        <HaldaButton type="submit">connect inbox</HaldaButton>
      </form>

      <form action="/api/nylas/sync" className="mt-3" method="post">
        <input name="userId" type="hidden" value={externalUserId} />
        <HaldaButton className="w-full" tone="outline" type="submit">
          sync recent mail
        </HaldaButton>
      </form>
    </Panel>
  );
}

function SnapshotStack({ dashboard }: { dashboard: InboxDashboardView }) {
  return (
    <section className="mt-4 grid gap-4">
      <SchoolSignals />
      <CrewPulse />
      <ConnectedAccountsPanel accounts={dashboard.accounts} />
    </section>
  );
}

function InboxPanels({ dashboard }: { dashboard: InboxDashboardView }) {
  return (
    <section className="mt-4 grid gap-4">
      <InboxIntelligencePanel extractions={dashboard.extractions} />
      <RecentMessagesPanel messages={dashboard.messages} />
    </section>
  );
}

function InboxIntelligencePanel({ extractions }: { extractions: InboxDashboardView["extractions"] }) {
  return (
    <Panel title="inbox intelligence">
      {extractions.length === 0 ? (
        <Empty>no extracted action items yet.</Empty>
      ) : (
        <ul className="grid gap-3">
          {extractions.map((item) => (
            <li className="rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 shadow-[3px_3px_0_#17202a]" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-[#17202a]">
                    {formatLabel(item.extraction_type)}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#596673]">
                    {item.student_facing_summary ?? stringifyExtraction(item.extracted_json)}
                  </p>
                </div>
                <span className="rounded-[4px] border-2 border-[#17202a] bg-[#d7eee9] px-2 py-1 text-xs font-bold text-[#17202a]">
                  {Math.round(Number(item.confidence) * 100)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentMessagesPanel({ messages }: { messages: InboxDashboardView["messages"] }) {
  return (
    <Panel title="recent messages">
      {messages.length === 0 ? (
        <Empty>no messages synced yet.</Empty>
      ) : (
        <ul className="grid gap-3">
          {messages.map((message) => (
            <li className="rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 shadow-[3px_3px_0_#17202a]" key={message.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-bold text-[#17202a]">
                  {message.subject ?? "(no subject)"}
                </span>
                {message.college_related ? <Tag tone="teal">college</Tag> : null}
                <Tag>{message.classification}</Tag>
              </div>
              <div className="mt-1 text-xs font-semibold text-[#596673]">
                {message.from_address ?? "unknown sender"} - {formatDate(message.received_at)}
              </div>
              {message.snippet ? <p className="mt-2 text-sm font-medium leading-6 text-[#596673]">{message.snippet}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SchoolSignals() {
  return (
    <Panel compact title="school signals">
      <ul className="grid gap-3">
        {schoolMatches.map((school) => (
          <li className="flex items-center justify-between gap-3" key={school.name}>
            <div>
              <div className="text-sm font-bold">{school.name}</div>
              <div className="text-xs font-semibold text-[#596673]">{school.signal}</div>
            </div>
            <Tag tone={school.fit === "reach" ? "coral" : "teal"}>{school.fit}</Tag>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CrewPulse() {
  return (
    <Panel compact title="crew pulse">
      <ul className="grid gap-3">
        {crewUpdates.map((update, index) => (
          <li className="flex items-start gap-3 text-sm font-semibold text-[#536576]" key={update}>
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[4px] border-2 border-[#17202a] bg-[#dce8f5] text-xs font-bold text-[#17202a]">
              {index + 1}
            </span>
            <span>{update}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ConnectedAccountsPanel({ accounts }: { accounts: InboxDashboardView["accounts"] }) {
  return (
    <Panel compact title="connected accounts">
      {accounts.length === 0 ? (
        <Empty>no inbox connected yet.</Empty>
      ) : (
        <ul className="grid gap-3">
          {accounts.map((account) => (
            <li className="rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] p-3 shadow-[3px_3px_0_#17202a]" key={account.id}>
              <div className="text-sm font-bold">{account.email_address ?? "unknown email"}</div>
              <div className="mt-1 text-xs font-semibold text-[#596673]">
                {account.status} - last synced {formatDate(account.last_synced_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MobileNav() {
  return (
    <nav className="fixed bottom-3 left-1/2 z-20 grid w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 grid-cols-4 gap-1 rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-1 shadow-[5px_5px_0_#17202a]">
      {navItems.map((item, index) => (
        <a
          className={`h-11 rounded-[5px] text-xs font-bold uppercase tracking-[0.04em] ${
            index === 0 ? "border-2 border-[#17202a] bg-[#17202a] text-[#fffaf0]" : "text-[#596673]"
          } grid place-items-center`}
          href={item === "chat" ? "#chat" : "#top"}
          key={item}
        >
          {item}
        </a>
      ))}
    </nav>
  );
}

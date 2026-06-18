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
}

export function StudentDashboard(props: StudentDashboardProps) {
  const inboxScore = Math.min(
    100,
    props.dashboard.extractions.length * 12 +
      props.dashboard.messages.filter((message) => message.college_related).length * 8,
  );

  return (
    <main className="min-h-screen bg-[#f4f8f8] text-[#172637]">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_340px]">
        <DesktopSidebar />
        <MainColumn {...props} inboxScore={inboxScore} />
        <RightRail dashboard={props.dashboard} />
      </div>

      <MobileNav />
    </main>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden min-h-screen border-r border-[#dbe6e8] bg-[#fbfdfd] px-4 py-5 lg:block">
      <BrandLockup subtitle="student cockpit" />

      <nav className="mt-8 grid gap-1">
        {navItems.map((item, index) => (
          <button
            className={`flex h-11 items-center justify-between rounded-md px-3 text-sm font-medium transition ${
              index === 0
                ? "bg-[#e5f2ef] text-[#113c3b]"
                : "text-[#607283] hover:bg-[#edf4f4] hover:text-[#193247]"
            }`}
            key={item}
            type="button"
          >
            <span>{item}</span>
            {index === 0 ? <span className="h-2 w-2 rounded-full bg-[#2a8c84]" /> : null}
          </button>
        ))}
      </nav>

      <div className="mt-8 rounded-lg border border-[#dbe6e8] bg-white p-4">
        <div className="text-xs font-medium text-[#6b7d8b]">current lane</div>
        <div className="mt-2 text-lg font-semibold">junior sprint</div>
        <p className="mt-2 text-sm leading-relaxed text-[#607283]">
          list, tests, money, essays. one clean stack.
        </p>
      </div>
    </aside>
  );
}

function MainColumn(props: StudentDashboardProps & { inboxScore: number }) {
  return (
    <section className="min-w-0 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
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
        synced={props.synced}
      />
      <WorkspaceSection
        accountCount={props.dashboard.accounts.length}
        externalUserId={props.externalUserId}
      />
      <InboxPanels dashboard={props.dashboard} />
    </section>
  );
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-between gap-3 lg:hidden">
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
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#193247] text-sm font-semibold text-white">
        h
      </div>
      <div>
        <div className="font-semibold">halda</div>
        <div className="text-xs text-[#6b7d8b]">{subtitle}</div>
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
    <section className="mt-5 grid gap-4 lg:mt-0 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-lg border border-[#dbe6e8] bg-white p-5 shadow-[0_18px_50px_rgba(35,62,76,0.07)] sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-medium text-[#2a8c84]">today</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight text-[#172637] sm:text-4xl">
              turn the college mess into a tiny next move
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#607283]">
              halda tracks the student lane, keeps open loops alive, and pulls real deadlines from the inbox.
            </p>
          </div>
          <div className="grid min-w-36 grid-cols-2 gap-2 text-center md:grid-cols-1">
            <Metric value={actionCount} label="open loops" />
            <Metric value={messageCount} label="emails read" />
          </div>
        </div>
        <QuickActions />
      </div>

      <Panel action={<span className="text-xs text-[#758694]">junior</span>} title="season progress">
        <div className="grid gap-4">
          <HaldaProgress label="application runway" value={42} />
          <HaldaProgress label="inbox clarity" value={inboxScore} />
          <div className="rounded-md bg-[#fff7df] px-3 py-2 text-sm text-[#735316]">
            next best move: pick one school list filter.
          </div>
        </div>
      </Panel>
    </section>
  );
}

function QuickActions() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {quickActions.map((action) => (
        <button
          className="group min-h-24 rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#b8ccd1] hover:bg-white hover:shadow-[0_14px_28px_rgba(35,62,76,0.08)]"
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
          <span className="mt-4 block text-sm font-semibold text-[#172637]">{action.label}</span>
          <span className="mt-1 block text-xs text-[#758694]">{action.detail}</span>
        </button>
      ))}
    </div>
  );
}

function StatusStack({
  connected,
  dataWarning,
  error,
  synced,
}: Pick<StudentDashboardProps, "connected" | "dataWarning" | "error" | "synced">) {
  if (!error && !connected && !synced && !dataWarning) return null;

  return (
    <section className="mt-4 grid gap-3">
      {error ? <Status tone="bad">{error}</Status> : null}
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
}: {
  accountCount: number;
  externalUserId: string;
}) {
  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
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

      <ConnectInboxPanel accountCount={accountCount} externalUserId={externalUserId} />
    </section>
  );
}

function ConnectInboxPanel({
  accountCount,
  externalUserId,
}: {
  accountCount: number;
  externalUserId: string;
}) {
  return (
    <Panel action={<span className="text-xs text-[#758694]">{accountCount} linked</span>} title="connect inbox">
      <form action="/api/nylas/auth" className="grid gap-3" method="get">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-[#607283]">demo user id</span>
          <input
            aria-label="demo user id"
            className="h-10 min-w-0 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            defaultValue={externalUserId}
            name="userId"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium text-[#607283]">email</span>
          <input
            aria-label="email to connect"
            className="h-10 min-w-0 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            name="loginHint"
            placeholder="student@email.com"
          />
        </label>
        <select
          className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
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

function InboxPanels({ dashboard }: { dashboard: InboxDashboardView }) {
  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-2">
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
            <li className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#172637]">
                    {formatLabel(item.extraction_type)}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#607283]">
                    {item.student_facing_summary ?? stringifyExtraction(item.extracted_json)}
                  </p>
                </div>
                <span className="rounded-full bg-[#e7f4f1] px-2 py-1 text-xs font-medium text-[#11635d]">
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
            <li className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4" key={message.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-semibold text-[#172637]">
                  {message.subject ?? "(no subject)"}
                </span>
                {message.college_related ? <Tag tone="teal">college</Tag> : null}
                <Tag>{message.classification}</Tag>
              </div>
              <div className="mt-1 text-xs text-[#758694]">
                {message.from_address ?? "unknown sender"} - {formatDate(message.received_at)}
              </div>
              {message.snippet ? <p className="mt-2 text-sm leading-6 text-[#607283]">{message.snippet}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RightRail({ dashboard }: { dashboard: InboxDashboardView }) {
  return (
    <aside className="hidden min-h-screen border-l border-[#dbe6e8] bg-[#fbfdfd] px-5 py-6 lg:block">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">live snapshot</div>
          <div className="text-xs text-[#758694]">demo student</div>
        </div>
        <HaldaTooltip label="right rail building blocks for milestones, social proof, and inbox state">
          ?
        </HaldaTooltip>
      </div>

      <div className="mt-5 grid gap-4">
        <SchoolSignals />
        <CrewPulse />
        <ConnectedAccountsPanel accounts={dashboard.accounts} />
      </div>
    </aside>
  );
}

function SchoolSignals() {
  return (
    <Panel compact title="school signals">
      <ul className="grid gap-3">
        {schoolMatches.map((school) => (
          <li className="flex items-center justify-between gap-3" key={school.name}>
            <div>
              <div className="text-sm font-semibold">{school.name}</div>
              <div className="text-xs text-[#758694]">{school.signal}</div>
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
          <li className="flex items-start gap-3 text-sm text-[#536576]" key={update}>
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e8f0fb] text-xs font-semibold text-[#2d5d90]">
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
            <li className="rounded-md border border-[#dbe6e8] bg-white p-3" key={account.id}>
              <div className="text-sm font-semibold">{account.email_address ?? "unknown email"}</div>
              <div className="mt-1 text-xs text-[#758694]">
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
    <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-4 gap-1 rounded-lg border border-[#dbe6e8] bg-white/95 p-1 shadow-[0_14px_40px_rgba(35,62,76,0.18)] backdrop-blur lg:hidden">
      {navItems.map((item, index) => (
        <button
          className={`h-11 rounded-md text-xs font-medium ${
            index === 0 ? "bg-[#193247] text-white" : "text-[#607283]"
          }`}
          key={item}
          type="button"
        >
          {item}
        </button>
      ))}
    </nav>
  );
}

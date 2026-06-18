"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  DemoEmailThread,
  DemoEventItem,
  DemoMemoryItem,
  DemoMetric,
  DemoMissionControlSnapshot,
  DemoOpenLoop,
  DemoStateSection,
  DemoUserOption,
} from "@/lib/demo-mission-control-types";

const toneStyles = {
  teal: "border-[#2a8178] bg-[#123f3d] text-[#8af4e4]",
  gold: "border-[#8b6c26] bg-[#3f3217] text-[#ffd479]",
  coral: "border-[#8f4b3e] bg-[#3a211f] text-[#ffad9d]",
  violet: "border-[#6757a8] bg-[#2c2843] text-[#c7b8ff]",
  blue: "border-[#376c9a] bg-[#122c3d] text-[#a8d9ff]",
} as const;

const statusStyles = {
  active: "border-[#35c6b6]/50 bg-[#103b39] text-[#8af4e4]",
  warming: "border-[#d9a441]/50 bg-[#3f3217] text-[#ffd479]",
  quiet: "border-[#5d6c76]/70 bg-[#152128] text-[#a9bbc4]",
} as const;

interface DemoMissionControlProps {
  initialUserId?: string;
}

export function DemoMissionControl({ initialUserId }: DemoMissionControlProps) {
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const query = useQuery({
    queryKey: ["demo-mission-control", selectedUserId ?? "auto"],
    queryFn: () => fetchSnapshot(selectedUserId),
    placeholderData: (previous) => previous,
    refetchInterval: 1_500,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const snapshot = query.data;

  useEffect(() => {
    if (!selectedUserId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("userId", selectedUserId);
    window.history.replaceState(null, "", url);
  }, [selectedUserId]);

  if (!snapshot) return <MissionControlLoading />;

  return (
    <main className="min-h-screen bg-[#071116] text-[#edf7f6]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(103,230,210,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(103,230,210,0.05)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="mx-auto grid w-full max-w-[1480px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <TopBar
          isFetching={query.isFetching}
          onSelectUser={setSelectedUserId}
          selectedUserId={selectedUserId ?? snapshot.selectedUserId}
          snapshot={snapshot}
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="grid gap-4">
            <ProfilePanel snapshot={snapshot} />
            <AgentPanel snapshot={snapshot} />
          </div>
          <ConversationApp messages={snapshot.messages} user={snapshot.userState.displayName} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <EmailThreadPanel thread={snapshot.emailThread} />
          <OpenLoopsPanel events={snapshot.events} loops={snapshot.openLoops} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <StateSectionsPanel sections={snapshot.stateSections} />
          <MemoryPanel memory={snapshot.memory} />
        </section>
      </div>
    </main>
  );
}

async function fetchSnapshot(userId?: string): Promise<DemoMissionControlSnapshot> {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  const response = await fetch(`/api/demo/mission-control?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Failed to load mission control snapshot.");
  return (await response.json()) as DemoMissionControlSnapshot;
}

function TopBar({
  isFetching,
  onSelectUser,
  selectedUserId,
  snapshot,
}: {
  isFetching: boolean;
  onSelectUser: (value: string) => void;
  selectedUserId: string;
  snapshot: DemoMissionControlSnapshot;
}) {
  return (
    <header className="grid gap-4 border-b border-[#22323a] pb-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase text-[#7fded1]">
          <span>halda</span>
          <span className="h-1 w-1 rounded-full bg-[#d9a441]" />
          <span>agent state monitor</span>
          <span className={cx("rounded-full border px-2 py-1", sourceClass(snapshot.source))}>
            {snapshot.source}
          </span>
          <span className={cx("h-2.5 w-2.5 rounded-full", isFetching ? "bg-[#67e6d2]" : "bg-[#536472]")} />
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          actual state for the live demo
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9fb2bd]">
          A database-backed view of the selected user, current agent context, stored messages, email thread data, and open loops.
        </p>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-medium uppercase text-[#7d929e]">selected user</span>
        <select
          className="h-12 w-full rounded-md border border-[#2d414c] bg-[#101d24] px-3 text-sm font-medium text-white outline-none transition focus:border-[#67e6d2] focus:ring-2 focus:ring-[#67e6d2]/20"
          onChange={(event) => onSelectUser(event.target.value)}
          value={selectedUserId}
        >
          {snapshot.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label} - {user.sublabel}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

function ProfilePanel({ snapshot }: { snapshot: DemoMissionControlSnapshot }) {
  return (
    <Panel title="user profile state">
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-white">{snapshot.userState.displayName}</h2>
            <p className="mt-1 font-mono text-xs text-[#7d929e]">{snapshot.userState.externalId}</p>
          </div>
          <span className={cx("w-fit rounded-full border px-2 py-1 text-xs", userStatusClass(snapshot.users, snapshot.selectedUserId))}>
            {formatLabel(snapshot.userState.lifecycleStage)}
          </span>
        </div>

        <MetricGrid metrics={snapshot.metrics} />

        {snapshot.userState.summary ? (
          <div className="rounded-md border border-[#263943] bg-[#0c1820] p-4 text-sm leading-6 text-[#d8e5e9]">
            {snapshot.userState.summary}
          </div>
        ) : (
          <EmptyState>No profile summary stored yet.</EmptyState>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Readout label="profile key" value={snapshot.agentState.profileKey} />
          <Readout label="profile version" value={`v${snapshot.userState.profileVersion}`} />
          <Readout label="profile updated" value={formatTimestamp(snapshot.userState.updatedAt)} />
          <Readout label="confidence" value={`${Math.round(snapshot.userState.lifecycleConfidence * 100)}%`} />
        </div>

        <PillGroup label="tags" values={snapshot.userState.tags} />
        <PillGroup label="interests" values={snapshot.userState.interests} />
        <PillGroup label="constraints" values={snapshot.userState.constraints} tone="coral" />
      </div>
    </Panel>
  );
}

function AgentPanel({ snapshot }: { snapshot: DemoMissionControlSnapshot }) {
  return (
    <Panel title="agent turn state">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Readout label="run state" value={snapshot.agentState.runState} />
          <Readout label="current flow" value={snapshot.agentState.currentFlow || "none"} />
          <Readout label="current intent" value={snapshot.agentState.currentIntent || "none"} />
          <Readout label="state updated" value={formatTimestamp(snapshot.agentState.updatedAt)} />
        </div>

        {snapshot.agentState.shortTermSummary ? (
          <div className="rounded-md border border-[#263943] bg-[#0c1820] p-4 text-sm leading-6 text-[#d8e5e9]">
            {snapshot.agentState.shortTermSummary}
          </div>
        ) : (
          <EmptyState>No conversation summary stored yet.</EmptyState>
        )}

        <StateRecord title="slot values" record={snapshot.agentState.slotValues} emptyLabel="No active slots tracked." />
        <PillGroup label="tool access" values={snapshot.agentState.selectedTools} tone="violet" />
      </div>
    </Panel>
  );
}

function ConversationApp({
  messages,
  user,
}: {
  messages: DemoMissionControlSnapshot["messages"];
  user: string;
}) {
  return (
    <Panel title="conversation history">
      <div className="mx-auto max-w-[520px] overflow-hidden rounded-[34px] border border-[#2d414c] bg-[#0b1115] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        <div className="rounded-[26px] bg-[#f4f6f8] text-[#111820]">
          <div className="border-b border-[#dfe4e8] px-4 py-3 text-center">
            <div className="text-sm font-semibold">{user}</div>
            <div className="text-xs text-[#6d7881]">Halda agent transcript</div>
          </div>
          <div className="grid max-h-[560px] min-h-[420px] content-end gap-3 overflow-y-auto px-3 py-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl bg-[#e8edf1] px-4 py-3 text-center text-sm text-[#65727d]">
                No stored conversation messages for this user yet.
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MessageBubble({ message }: { message: DemoMissionControlSnapshot["messages"][number] }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const bubbleClass = isUser
    ? "ml-auto bg-[#0b84ff] text-white"
    : isAssistant
      ? "mr-auto bg-[#e9edf0] text-[#111820]"
      : "mx-auto bg-[#d7dfe5] text-[#3c4952]";

  return (
    <div className={cx("max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5", bubbleClass)}>
      {message.subject ? <div className="mb-1 text-xs opacity-75">{message.subject}</div> : null}
      <div>{message.body || "(empty message)"}</div>
      <div className="mt-1 text-[11px] opacity-65">
        {message.role} · {message.channel} · {formatRelative(message.time)}
      </div>
    </div>
  );
}

function EmailThreadPanel({ thread }: { thread: DemoEmailThread | null }) {
  return (
    <Panel title="email thread">
      {!thread ? (
        <EmptyState>No email messages captured for this user yet.</EmptyState>
      ) : (
        <div className="grid gap-3">
          <div>
            <div className="text-lg font-semibold text-white">{thread.subject}</div>
            <div className="mt-1 font-mono text-xs text-[#7d929e]">{thread.threadId}</div>
          </div>
          <div className="grid max-h-[560px] gap-3 overflow-y-auto">
            {thread.messages.map((message) => (
              <article className="rounded-md border border-[#263943] bg-[#0c1820] p-4" key={message.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{message.fromName ?? message.from}</div>
                    <div className="mt-1 text-xs text-[#8ea3ad]">{message.from}</div>
                  </div>
                  <div className="text-xs text-[#7d929e]">{formatTimestamp(message.receivedAt)}</div>
                </div>
                <div className="mt-3 text-sm font-semibold text-[#d8e5e9]">{message.subject}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#aebfc7]">
                  {message.body || message.snippet || "(empty email body)"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[#2d414c] px-2 py-1 text-[#9fb2bd]">
                    {message.classification}
                  </span>
                  {message.collegeRelated ? (
                    <span className="rounded-full border border-[#2a8178] bg-[#123f3d] px-2 py-1 text-[#8af4e4]">
                      college related
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function OpenLoopsPanel({
  events,
  loops,
}: {
  events: DemoEventItem[];
  loops: DemoOpenLoop[];
}) {
  return (
    <Panel title="open loops and agent events">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">open loops</h3>
          {loops.length === 0 ? (
            <EmptyState>No open loops for this user.</EmptyState>
          ) : (
            <div className="grid gap-2">
              {loops.map((loop) => (
                <div className="rounded-md border border-[#263943] bg-[#0c1820] p-3" key={loop.id}>
                  <div className="text-sm font-semibold leading-6 text-white">{loop.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8ea3ad]">
                    <span>{loop.status}</span>
                    <span>priority {loop.priority}</span>
                    {loop.blocking ? <span className="text-[#ffad9d]">blocking</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">recent events</h3>
          {events.length === 0 ? (
            <EmptyState>No agent events logged yet.</EmptyState>
          ) : (
            <div className="grid divide-y divide-[#22323a]">
              {events.map((event) => (
                <div className="py-3 first:pt-0 last:pb-0" key={event.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{formatLabel(event.type)}</div>
                      <div className="mt-1 text-sm leading-6 text-[#aebfc7]">{event.summary}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#2d414c] px-2 py-1 text-xs text-[#b6c7cf]">
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-[#657b87]">{formatRelative(event.time)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function StateSectionsPanel({ sections }: { sections: DemoStateSection[] }) {
  return (
    <Panel title="known user context">
      <div className="grid gap-3">
        {sections.map((section) => (
          <StateRecord
            emptyLabel={section.emptyLabel}
            key={section.title}
            record={Object.fromEntries(section.items.map((item) => [item.key, item.value]))}
            title={section.title}
          />
        ))}
      </div>
    </Panel>
  );
}

function MemoryPanel({ memory }: { memory: DemoMemoryItem[] }) {
  return (
    <Panel title="flattened memory index">
      {memory.length === 0 ? (
        <EmptyState>No profile memory keys have been written yet.</EmptyState>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {memory.map((item) => (
            <div className="rounded-md border border-[#263943] bg-[#0c1820] p-3" key={item.id}>
              <div className="text-xs uppercase text-[#7d929e]">{item.source}</div>
              <div className="mt-1 text-sm font-semibold text-white">{item.label}</div>
              <div className="mt-1 text-sm leading-6 text-[#aebfc7]">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MetricGrid({ metrics }: { metrics: DemoMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {metrics.map((metric) => (
        <div className={cx("rounded-md border p-3", toneStyles[metric.tone])} key={metric.label}>
          <div className="text-xs uppercase opacity-75">{metric.label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-white">{metric.value}</div>
          <div className="mt-1 text-xs opacity-80">{metric.delta}</div>
        </div>
      ))}
    </div>
  );
}

function StateRecord({
  emptyLabel,
  record,
  title,
}: {
  emptyLabel: string;
  record: Record<string, unknown>;
  title: string;
}) {
  const entries = Object.entries(record);

  return (
    <div className="rounded-md border border-[#263943] bg-[#0c1820] p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-[#8ea3ad]">{title}</div>
      {entries.length === 0 ? (
        <div className="text-sm text-[#657b87]">{emptyLabel}</div>
      ) : (
        <div className="grid gap-2">
          {entries.map(([key, value]) => (
            <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)]" key={key}>
              <div className="text-xs text-[#7d929e]">{formatLabel(key)}</div>
              <div className="break-words font-mono text-xs leading-5 text-[#d8e5e9]">{String(value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cx("rounded-lg border border-[#22323a] bg-[#0a161d]/95 p-4 shadow-[0_18px_54px_rgba(0,0,0,0.24)] sm:p-5", className)}>
      <h2 className="mb-4 text-sm font-semibold uppercase text-[#c7d5dc]">{title}</h2>
      {children}
    </section>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#263943] bg-[#0c1820] p-3">
      <div className="text-xs font-medium uppercase text-[#7d929e]">{label}</div>
      <div className="mt-2 truncate text-sm font-semibold text-white" title={value}>
        {value}
      </div>
    </div>
  );
}

function PillGroup({
  label,
  tone = "teal",
  values,
}: {
  label: string;
  tone?: "teal" | "coral" | "violet";
  values: string[];
}) {
  if (values.length === 0) return null;

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase text-[#7d929e]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span className={cx("rounded-full border px-2.5 py-1 text-xs font-medium", toneStyles[tone])} key={value}>
            {formatLabel(value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[#2d414c] bg-[#0c1820] px-4 py-5 text-sm text-[#7d929e]">
      {children}
    </div>
  );
}

function MissionControlLoading() {
  return (
    <main className="min-h-screen bg-[#071116] px-4 py-4 text-[#edf7f6] sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1480px] gap-4">
        <div className="h-24 animate-pulse rounded-lg border border-[#22323a] bg-[#0a161d]" />
        <div className="h-[520px] animate-pulse rounded-lg border border-[#22323a] bg-[#0a161d]" />
      </div>
    </main>
  );
}

function sourceClass(source: DemoMissionControlSnapshot["source"]): string {
  return source === "database"
    ? "border-[#67e6d2]/40 bg-[#102d2b] text-[#9af4e8]"
    : "border-[#e46f5b]/45 bg-[#3a211f] text-[#ffad9d]";
}

function userStatusClass(users: DemoUserOption[], selectedUserId: string): string {
  const status = users.find((user) => user.id === selectedUserId)?.status ?? "quiet";
  return statusStyles[status];
}

function formatTimestamp(value: string | null): string {
  if (!value) return "not stored";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(value: string): string {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const seconds = Math.floor(delta / 1_000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

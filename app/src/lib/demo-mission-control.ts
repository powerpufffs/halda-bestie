import { rows, sql } from "./db";
import type {
  DemoAgentLane,
  DemoEmailThread,
  DemoEventItem,
  DemoMemoryItem,
  DemoMessageItem,
  DemoMissionControlSnapshot,
  DemoOpenLoop,
  DemoStateSection,
  DemoUserOption,
} from "./demo-mission-control-types";

const REFRESH_MS = 1_500;

interface DbUserRow {
  id: string;
  display_name: string | null;
  first_name: string | null;
  external_user_id: string | null;
  lifecycle_stage: string | null;
  lifecycle_stage_confidence: number | string | null;
}

interface DbProfileRow {
  display_name: string | null;
  first_name: string | null;
  external_user_id: string | null;
  lifecycle_stage: string | null;
  lifecycle_stage_confidence: number | string | null;
  agent_profile_key: string | null;
  profile_version: number | null;
  profile_summary: string | null;
  facts: unknown;
  preferences: unknown;
  interests: unknown;
  constraints: unknown;
  milestones: unknown;
  tool_access: unknown;
  communication_style: unknown;
  tags: unknown;
  modified_at: Date | string | null;
}

interface DbConversationRow {
  current_intent: string | null;
  current_flow: string | null;
  slot_values: unknown;
  short_term_summary: string | null;
  modified_at: Date | string | null;
}

interface DbOpenLoopRow {
  id: string;
  loop_type: string;
  status: string;
  priority: number;
  blocking: boolean;
  prompt: string | null;
}

interface DbEventRow {
  id: string;
  event_type: string;
  status: "started" | "succeeded" | "failed" | "skipped";
  occurred_at: Date | string;
  output: unknown;
  error: string | null;
}

interface DbMessageRow {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  channel: string | null;
  subject: string | null;
  body: string | null;
  occurred_at: Date | string;
}

interface DbEmailMessageRow {
  id: string;
  provider_thread_id: string | null;
  from_address: string | null;
  from_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: Date | string | null;
  classification: string;
  college_related: boolean;
}

export async function getDemoMissionControlSnapshot(
  requestedUserId?: string | null,
): Promise<DemoMissionControlSnapshot> {
  const selectedFallback = requestedUserId?.trim() || "website:demo";

  try {
    const users = await listDatabaseUsers();
    const selectedUserId = requestedUserId ?? users[0]?.id ?? selectedFallback;
    const snapshot = await readDatabaseSnapshot(users, selectedUserId);
    return snapshot ?? emptySnapshot(selectedUserId, users, "database");
  } catch {
    return emptySnapshot(selectedFallback, [], "unavailable");
  }
}

async function listDatabaseUsers(): Promise<DemoUserOption[]> {
  const result = await rows<DbUserRow>(sql`
    select u.id,
           u.display_name,
           u.first_name,
           concat(mp.platform_key, ':', umi.external_identity) as external_user_id,
           up.lifecycle_stage,
           up.lifecycle_stage_confidence
    from halda.users u
    left join lateral (
      select messaging_platform_id, external_identity
      from halda.user_messaging_identities
      where user_id = u.id
        and deleted_at is null
      order by is_primary desc, id desc
      limit 1
    ) umi on true
    left join halda.messaging_platforms mp
      on mp.id = umi.messaging_platform_id
    left join halda.user_profiles up
      on up.user_id = u.id
     and up.deleted_at is null
    where u.deleted_at is null
    order by u.modified_at desc
    limit 10
  `);

  return result.map((user, index) => {
    const externalId = user.external_user_id ?? `db:${user.id}`;
    const label = user.display_name ?? user.first_name ?? displayFromExternalId(externalId, index);
    const confidence = Number(user.lifecycle_stage_confidence ?? 0);

    return {
      id: externalId,
      label,
      sublabel: externalId,
      lifecycleStage: user.lifecycle_stage ?? "unknown",
      status: confidence > 0.75 ? "active" : confidence > 0 ? "warming" : "quiet",
    };
  });
}

async function readDatabaseSnapshot(
  users: DemoUserOption[],
  selectedUserId: string,
): Promise<DemoMissionControlSnapshot | undefined> {
  const dbUserId = await findDbUserId(selectedUserId);
  if (!dbUserId) return undefined;

  const [profile] = await rows<DbProfileRow>(sql`
    select u.display_name,
           u.first_name,
           identities.external_user_id,
           up.lifecycle_stage,
           up.lifecycle_stage_confidence,
           up.agent_profile_key,
           up.profile_version,
           up.profile_summary,
           up.facts,
           up.preferences,
           up.interests,
           up.constraints,
           up.milestones,
           up.tool_access,
           up.communication_style,
           up.tags,
           up.modified_at
    from halda.users u
    left join halda.user_profiles up
      on up.user_id = u.id
     and up.deleted_at is null
    left join lateral (
      select concat(mp.platform_key, ':', umi.external_identity) as external_user_id
      from halda.user_messaging_identities umi
      join halda.messaging_platforms mp
        on mp.id = umi.messaging_platform_id
      where umi.user_id = u.id
        and umi.deleted_at is null
      order by umi.is_primary desc, umi.id desc
      limit 1
    ) identities on true
    where u.id = ${dbUserId}::uuid
      and u.deleted_at is null
    limit 1
  `);
  if (!profile) return undefined;

  const [conversation] = await rows<DbConversationRow>(sql`
    select current_intent,
           current_flow,
           slot_values,
           short_term_summary,
           modified_at
    from halda.conversation_states
    where user_id = ${dbUserId}::uuid
      and deleted_at is null
    order by modified_at desc
    limit 1
  `);

  const [openLoops, events, messages, emailThread] = await Promise.all([
    readOpenLoops(dbUserId),
    readEvents(dbUserId),
    readMessages(dbUserId),
    readEmailThread(dbUserId),
  ]);

  const facts = asRecord(profile.facts);
  const preferences = asRecord(profile.preferences);
  const milestones = asRecord(profile.milestones);
  const communicationStyle = asRecord(profile.communication_style);
  const interests = asStringArray(profile.interests);
  const constraints = asStringArray(profile.constraints);
  const toolAccess = asStringArray(profile.tool_access);
  const tags = asStringArray(profile.tags);
  const externalId = profile.external_user_id ?? selectedUserId;
  const displayName = profile.display_name ?? profile.first_name ?? displayFromExternalId(externalId, 0);
  const lifecycleConfidence = Number(profile.lifecycle_stage_confidence ?? 0);
  const stateSections = buildStateSections({ facts, preferences, milestones, communicationStyle });
  const selectedUser = users.find((user) => user.id === externalId);
  const userOption = {
    id: externalId,
    label: selectedUser?.label ?? displayName,
    sublabel: externalId,
    lifecycleStage: profile.lifecycle_stage ?? "unknown",
    status: lifecycleConfidence > 0.75 ? "active" : lifecycleConfidence > 0 ? "warming" : "quiet",
  } satisfies DemoUserOption;

  return {
    generatedAt: new Date().toISOString(),
    refreshMs: REFRESH_MS,
    selectedUserId: externalId,
    users: ensureSelectedUser(users, userOption),
    source: "database",
    userState: {
      displayName: userOption.label,
      externalId,
      lifecycleStage: profile.lifecycle_stage ?? "unknown",
      lifecycleConfidence,
      profileVersion: profile.profile_version ?? 1,
      summary: profile.profile_summary ?? "",
      tags,
      interests,
      constraints,
      facts,
      preferences,
      milestones,
      communicationStyle,
      updatedAt: profile.modified_at ? asIso(profile.modified_at) : null,
    },
    agentState: {
      runState: events.some((event) => event.status === "started") ? "running" : "idle",
      profileKey: profile.agent_profile_key ?? "unknown",
      currentIntent: conversation?.current_intent ?? "",
      currentFlow: conversation?.current_flow ?? "",
      queueDepth: openLoops.length,
      selectedTools: toolAccess,
      slotValues: asRecord(conversation?.slot_values),
      shortTermSummary: conversation?.short_term_summary ?? "",
      updatedAt: conversation?.modified_at ? asIso(conversation.modified_at) : null,
    },
    metrics: [
      {
        label: "lifecycle",
        value: formatLabel(profile.lifecycle_stage ?? "unknown"),
        delta: `${Math.round(lifecycleConfidence * 100)}% confidence`,
        tone: "teal",
      },
      {
        label: "open loops",
        value: String(openLoops.length),
        delta: `${openLoops.filter((loop) => loop.blocking).length} blocking`,
        tone: "gold",
      },
      {
        label: "events",
        value: String(events.length),
        delta: events[0] ? formatRelativeLabel(events[0].time) : "none logged",
        tone: "blue",
      },
      {
        label: "messages",
        value: String(messages.length),
        delta: emailThread ? `${emailThread.messages.length} email(s)` : "agent transcript",
        tone: "violet",
      },
    ],
    signals: [
      {
        label: "lifecycle confidence",
        value: Math.round(lifecycleConfidence * 100),
        description: "Raw confidence stored on halda.user_profiles.",
        tone: "teal",
      },
      {
        label: "known facts",
        value: Object.keys(facts).length,
        description: "Count of durable fact keys in the profile.",
        tone: "blue",
      },
      {
        label: "preferences",
        value: Object.keys(preferences).length,
        description: "Count of preference keys in the profile.",
        tone: "violet",
      },
      {
        label: "constraints",
        value: constraints.length,
        description: "Count of tracked user constraints.",
        tone: "coral",
      },
    ],
    lanes: buildAgentLanes(conversation, openLoops, events, messages),
    openLoops,
    memory: buildMemory({ facts, preferences, milestones, communicationStyle, interests, constraints }),
    events,
    messages,
    emailThread,
    stateSections,
  };
}

async function findDbUserId(selectedUserId: string): Promise<string | undefined> {
  if (selectedUserId.startsWith("db:")) return selectedUserId.slice(3);

  const [identity] = await rows<{ user_id: string }>(sql`
    select umi.user_id
    from halda.user_messaging_identities umi
    join halda.messaging_platforms mp
      on mp.id = umi.messaging_platform_id
    where concat(mp.platform_key, ':', umi.external_identity) = ${selectedUserId}
      and umi.deleted_at is null
    limit 1
  `);

  return identity?.user_id;
}

async function readOpenLoops(dbUserId: string): Promise<DemoOpenLoop[]> {
  const result = await rows<DbOpenLoopRow>(sql`
    select id,
           loop_type,
           status,
           priority,
           blocking,
           prompt
    from halda.agent_open_loops
    where user_id = ${dbUserId}::uuid
      and status in ('open', 'snoozed')
      and deleted_at is null
    order by priority desc, modified_at desc
    limit 8
  `);

  return result.map((loop) => ({
    id: loop.id,
    title: loop.prompt ?? formatLabel(loop.loop_type),
    status: loop.status,
    priority: loop.priority,
    blocking: loop.blocking,
  }));
}

async function readEvents(dbUserId: string): Promise<DemoEventItem[]> {
  const result = await rows<DbEventRow>(sql`
    select id,
           event_type,
           status,
           occurred_at,
           output,
           error
    from halda.agent_events
    where user_id = ${dbUserId}::uuid
      and deleted_at is null
    order by occurred_at desc
    limit 12
  `);

  return result.map((event) => ({
    id: event.id,
    time: asIso(event.occurred_at),
    type: event.event_type,
    summary: event.error ?? eventSummary(event),
    status: event.status,
  }));
}

async function readMessages(dbUserId: string): Promise<DemoMessageItem[]> {
  const result = await rows<DbMessageRow>(sql`
    select m.id,
           m.role,
           mp.platform_key as channel,
           m.subject,
           m.body,
           m.occurred_at
    from halda.messages m
    join halda.conversations c
      on c.id = m.conversation_id
    left join halda.messaging_platforms mp
      on mp.id = m.messaging_platform_id
    where c.user_id = ${dbUserId}::uuid
      and m.deleted_at is null
    order by m.occurred_at desc
    limit 24
  `);

  return result.reverse().map((message) => ({
    id: message.id,
    role: message.role,
    channel: message.channel ?? "message",
    subject: message.subject ?? undefined,
    body: message.body ?? "",
    time: asIso(message.occurred_at),
  }));
}

async function readEmailThread(dbUserId: string): Promise<DemoEmailThread | null> {
  const [latest] = await rows<DbEmailMessageRow>(sql`
    select id,
           provider_thread_id,
           from_address,
           from_name,
           subject,
           snippet,
           body_text,
           received_at,
           classification,
           college_related
    from halda.email_messages
    where user_id = ${dbUserId}::uuid
      and deleted_at is null
    order by received_at desc nulls last, created_at desc
    limit 1
  `);
  if (!latest) return null;

  const result = latest.provider_thread_id
    ? await rows<DbEmailMessageRow>(sql`
        select id,
               provider_thread_id,
               from_address,
               from_name,
               subject,
               snippet,
               body_text,
               received_at,
               classification,
               college_related
        from halda.email_messages
        where user_id = ${dbUserId}::uuid
          and provider_thread_id = ${latest.provider_thread_id}
          and deleted_at is null
        order by received_at asc nulls last, created_at asc
        limit 12
      `)
    : await rows<DbEmailMessageRow>(sql`
        select id,
               provider_thread_id,
               from_address,
               from_name,
               subject,
               snippet,
               body_text,
               received_at,
               classification,
               college_related
        from halda.email_messages
        where user_id = ${dbUserId}::uuid
          and deleted_at is null
        order by received_at asc nulls last, created_at asc
        limit 8
      `);

  return {
    threadId: latest.provider_thread_id ?? "recent-email",
    subject: latest.subject ?? "Recent email thread",
    messages: result.map((message) => ({
      id: message.id,
      from: message.from_address ?? "unknown sender",
      fromName: message.from_name ?? undefined,
      subject: message.subject ?? latest.subject ?? "No subject",
      snippet: message.snippet ?? "",
      body: message.body_text ?? message.snippet ?? "",
      receivedAt: message.received_at ? asIso(message.received_at) : null,
      classification: message.classification,
      collegeRelated: message.college_related,
    })),
  };
}

function emptySnapshot(
  selectedUserId: string,
  users: DemoUserOption[],
  source: DemoMissionControlSnapshot["source"],
): DemoMissionControlSnapshot {
  const option = {
    id: selectedUserId,
    label: displayFromExternalId(selectedUserId, 0),
    sublabel: selectedUserId,
    lifecycleStage: "unknown",
    status: "quiet" as const,
  };

  return {
    generatedAt: new Date().toISOString(),
    refreshMs: REFRESH_MS,
    selectedUserId,
    users: ensureSelectedUser(users, option),
    source,
    userState: {
      displayName: option.label,
      externalId: selectedUserId,
      lifecycleStage: "unknown",
      lifecycleConfidence: 0,
      profileVersion: 0,
      summary: "",
      tags: [],
      interests: [],
      constraints: [],
      facts: {},
      preferences: {},
      milestones: {},
      communicationStyle: {},
      updatedAt: null,
    },
    agentState: {
      runState: source === "database" ? "idle" : "unavailable",
      profileKey: "unknown",
      currentIntent: "",
      currentFlow: "",
      queueDepth: 0,
      selectedTools: [],
      slotValues: {},
      shortTermSummary: "",
      updatedAt: null,
    },
    metrics: [
      { label: "lifecycle", value: "unknown", delta: "0% confidence", tone: "teal" },
      { label: "open loops", value: "0", delta: "0 blocking", tone: "gold" },
      { label: "events", value: "0", delta: "none logged", tone: "blue" },
      { label: "messages", value: "0", delta: "none captured", tone: "violet" },
    ],
    signals: [],
    lanes: [],
    openLoops: [],
    memory: [],
    events: [],
    messages: [],
    emailThread: null,
    stateSections: buildStateSections({
      facts: {},
      preferences: {},
      milestones: {},
      communicationStyle: {},
    }),
  };
}

function buildAgentLanes(
  conversation: DbConversationRow | undefined,
  openLoops: DemoOpenLoop[],
  events: DemoEventItem[],
  messages: DemoMessageItem[],
): DemoAgentLane[] {
  return [
    {
      id: "profile",
      label: "profile",
      status: conversation ? "complete" : "queued",
      detail: conversation?.current_flow ? `current flow: ${formatLabel(conversation.current_flow)}` : "no conversation state row",
      progress: conversation ? 100 : 0,
    },
    {
      id: "messages",
      label: "messages",
      status: messages.length > 0 ? "complete" : "queued",
      detail: `${messages.length} stored message(s) in halda.messages`,
      progress: messages.length > 0 ? 100 : 0,
    },
    {
      id: "open-loops",
      label: "open loops",
      status: openLoops.length > 0 ? "running" : "queued",
      detail: `${openLoops.length} unresolved loop(s)`,
      progress: openLoops.length > 0 ? 100 : 0,
    },
    {
      id: "events",
      label: "events",
      status: events.some((event) => event.status === "started") ? "running" : events.length > 0 ? "complete" : "queued",
      detail: `${events.length} recent agent event(s)`,
      progress: events.length > 0 ? 100 : 0,
    },
  ];
}

function buildMemory(input: {
  facts: Record<string, unknown>;
  preferences: Record<string, unknown>;
  milestones: Record<string, unknown>;
  communicationStyle: Record<string, unknown>;
  interests: string[];
  constraints: string[];
}): DemoMemoryItem[] {
  const memory: DemoMemoryItem[] = [];

  for (const [key, value] of Object.entries(input.facts).slice(0, 4)) {
    memory.push({ id: `fact:${key}`, label: formatLabel(key), value: formatValue(value), confidence: 1, source: "facts" });
  }

  for (const interest of input.interests.slice(0, 3)) {
    memory.push({ id: `interest:${interest}`, label: "interest", value: interest, confidence: 1, source: "interests" });
  }

  for (const constraint of input.constraints.slice(0, 3)) {
    memory.push({ id: `constraint:${constraint}`, label: "constraint", value: constraint, confidence: 1, source: "constraints" });
  }

  for (const [key, value] of Object.entries(input.preferences).slice(0, 3)) {
    memory.push({ id: `preference:${key}`, label: formatLabel(key), value: formatValue(value), confidence: 1, source: "preferences" });
  }

  for (const [key, value] of Object.entries(input.milestones).slice(0, 3)) {
    memory.push({ id: `milestone:${key}`, label: formatLabel(key), value: formatValue(value), confidence: 1, source: "milestones" });
  }

  for (const [key, value] of Object.entries(input.communicationStyle).slice(0, 2)) {
    memory.push({ id: `communication:${key}`, label: formatLabel(key), value: formatValue(value), confidence: 1, source: "communication style" });
  }

  return memory.slice(0, 12);
}

function buildStateSections(input: {
  facts: Record<string, unknown>;
  preferences: Record<string, unknown>;
  milestones: Record<string, unknown>;
  communicationStyle: Record<string, unknown>;
}): DemoStateSection[] {
  return [
    sectionFromRecord("facts", "No durable facts tracked yet.", input.facts),
    sectionFromRecord("preferences", "No preferences tracked yet.", input.preferences),
    sectionFromRecord("milestones", "No milestones tracked yet.", input.milestones),
    sectionFromRecord("communication style", "No communication style tracked yet.", input.communicationStyle),
  ];
}

function sectionFromRecord(title: string, emptyLabel: string, record: Record<string, unknown>): DemoStateSection {
  return {
    title,
    emptyLabel,
    items: Object.entries(record).map(([key, value]) => ({
      key: formatLabel(key),
      value: formatValue(value),
    })),
  };
}

function eventSummary(event: DbEventRow): string {
  const output = asRecord(event.output);
  const summary = output.summary ?? output.message ?? output.result;
  return typeof summary === "string" ? summary : `${formatLabel(event.event_type)} ${event.status}`;
}

function ensureSelectedUser(users: DemoUserOption[], selected: DemoUserOption): DemoUserOption[] {
  if (users.some((user) => user.id === selected.id)) return users;
  return [selected, ...users];
}

function displayFromExternalId(externalId: string, index: number): string {
  const raw = externalId.split(":").at(-1) ?? `student ${index + 1}`;
  if (/^\+?\d+$/.test(raw)) return `Student ${index + 1}`;

  return raw
    .replaceAll(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatRelativeLabel(value: string): string {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

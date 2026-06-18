export interface DemoUserOption {
  id: string;
  label: string;
  sublabel: string;
  lifecycleStage: string;
  status: "active" | "warming" | "quiet";
}

export interface DemoMetric {
  label: string;
  value: string;
  delta: string;
  tone: "teal" | "gold" | "coral" | "violet" | "blue";
}

export interface DemoStateSignal {
  label: string;
  value: number;
  description: string;
  tone: "teal" | "gold" | "coral" | "violet" | "blue";
}

export interface DemoAgentLane {
  id: string;
  label: string;
  status: "running" | "queued" | "complete" | "blocked";
  detail: string;
  progress: number;
}

export interface DemoOpenLoop {
  id: string;
  title: string;
  status: string;
  priority: number;
  blocking: boolean;
}

export interface DemoMemoryItem {
  id: string;
  label: string;
  value: string;
  confidence: number;
  source: string;
}

export interface DemoEventItem {
  id: string;
  time: string;
  type: string;
  summary: string;
  status: "started" | "succeeded" | "failed" | "skipped";
}

export interface DemoMessageItem {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  channel: string;
  body: string;
  time: string;
  subject?: string;
}

export interface DemoEmailMessageItem {
  id: string;
  from: string;
  fromName?: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string | null;
  classification: string;
  collegeRelated: boolean;
}

export interface DemoEmailThread {
  threadId: string;
  subject: string;
  messages: DemoEmailMessageItem[];
}

export interface DemoStateSection {
  title: string;
  emptyLabel: string;
  items: Array<{
    key: string;
    value: string;
  }>;
}

export interface DemoMissionControlSnapshot {
  generatedAt: string;
  refreshMs: number;
  selectedUserId: string;
  users: DemoUserOption[];
  source: "database" | "unavailable";
  userState: {
    displayName: string;
    externalId: string;
    lifecycleStage: string;
    lifecycleConfidence: number;
    profileVersion: number;
    summary: string;
    tags: string[];
    interests: string[];
    constraints: string[];
    facts: Record<string, unknown>;
    preferences: Record<string, unknown>;
    milestones: Record<string, unknown>;
    communicationStyle: Record<string, unknown>;
    updatedAt: string | null;
  };
  agentState: {
    runState: string;
    profileKey: string;
    currentIntent: string;
    currentFlow: string;
    queueDepth: number;
    selectedTools: string[];
    slotValues: Record<string, unknown>;
    shortTermSummary: string;
    updatedAt: string | null;
  };
  metrics: DemoMetric[];
  signals: DemoStateSignal[];
  lanes: DemoAgentLane[];
  openLoops: DemoOpenLoop[];
  memory: DemoMemoryItem[];
  events: DemoEventItem[];
  messages: DemoMessageItem[];
  emailThread: DemoEmailThread | null;
  stateSections: DemoStateSection[];
}

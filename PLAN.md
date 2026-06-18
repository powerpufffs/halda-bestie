# PLAN.md - Halda HITLAB Hackathon

## Project

Working name: **Next by Halda**

Hackathon: HITLAB World Cup 2026, Track 2, Halda bounty

Goal: win the competition by building a demo that maximizes the judging rubric while laying a clean foundation the team can divide and build against.

## Product Thesis

Halda should reach students before they become college-website traffic.

The product is a text-native, career-first AI guide for high schoolers and transfer students. It should feel like texting a knowledgeable older friend: casual, concise, socially aware, and useful enough to open again tomorrow.

The core product loop:

1. Student texts or chats about a future curiosity, concern, or school question.
2. Agent answers the immediate question first.
3. Agent learns one useful profile fact or opens one lightweight loop.
4. Student completes a short quest, comparison, checklist item, quiz, or milestone.
5. Agent unlocks better recommendations, social context, or rewards.
6. Agent nudges the student later through the channel that fits the moment.

This gives Halda what it wants: earlier funnel capture, richer behavioral data, stronger student-school matching, and a credible reason for students to keep engaging before they are ready to apply.

## Judging Strategy

The rubric is weighted:

- Student Experience: 40%
- Technical Execution: 35%
- Creativity and Insight: 25%

The demo must feel excellent before it feels architecturally impressive. Judges need to believe a real sophomore, junior, senior, or transfer student would voluntarily keep texting this thing.

### Student Experience Targets

Conversational quality:

- Feels like texting a smart older friend.
- No form-like lock-in.
- Answer the student's latest question first, then re-anchor open loops gently.
- Tone is short, warm, specific, and grade-aware.

Personalization depth:

- Different personas must get dramatically different experiences.
- Grade, career interest, budget, location, confidence, and application stage all change the answer.
- Open loops and profile facts must carry across turns and channels.

Reason to return:

- Daily or weekly next move.
- Micro-quests and milestones.
- Profile Passport that shows what the agent has learned and what it unlocked.
- Social/community signals like "students near you also explored..."

Career-first discovery:

- Lead with "what do you want your life/work to feel like?" before "where do you want to go?"
- Career to major to school.
- Use schools as paths to outcomes, not as the first object.

Grade-aware guidance:

- Sophomore: exploration, course choices, confidence, lightweight quests.
- Junior: timeline, tests, visits, scholarship prep, school list.
- Senior: applications, essays, FAFSA, deadlines, acceptance comparison.
- Transfer: credits, pathways, program fit, deadlines, cost/time-to-degree.

### Technical Execution Targets

Multi-channel:

- iMessage/SMS-like texting through Spectrum is the primary polished channel.
- Gmail polling adapter is the demo secondary channel.
- Website chat can be added as a thin adapter if time permits.
- All channels write to the same messages table and use the same agent core.

SMS handoff:

- Web chat can ask for a phone number and continue via Spectrum/iMessage.
- For hackathon, it is acceptable that local iMessage simulates texting through a cloud number.

Real data:

- Use College Scorecard for real institution data.
- Add O*NET/BLS career data only if time permits.
- Avoid mock data for school facts shown in the main demo.

Profile building and memory:

- Every interaction writes messages.
- Important inferred or confirmed state becomes user events, agent open loops, or profile metadata.
- Open loops persist in Postgres, not runtime memory.

Multi-tenant:

- All rows are scoped by internal user IDs and identity mappings.
- Never key durable student data only by phone, email, or web session.

Demo stability:

- Keep the live path narrow.
- Have seeded personas and known questions.
- Prefer boring durable storage over clever runtime-only state.

### Creativity and Insight Targets

Novel angle:

- "Profile Passport": a student-visible map of what Halda has learned and what that unlocks.
- Agent can handle multiple open conversational loops inside one linear text thread.
- Dynamic tool bundles by grade and intent.

Community feature:

- Privacy-safe social layer, not a feed.
- Examples:
  - "Three students from your area saved nursing this week."
  - "Want to compare your list with a friend code?"
  - "Students looking at UVU nursing also asked about Weber and SLCC."

100K GTM:

- Partner with school districts, counselors, and local sponsors.
- Zogo-style rewards funded by colleges, credit unions, healthcare systems, and local employers.
- Student acquisition through counselors, QR flyers, classroom modules, friend invites, and SMS continuity.

Product instinct:

- Students do not want a college CRM.
- Students want help making sense of their future without feeling behind or judged.
- The agent should make the next step feel smaller.

## Product Principles

1. **Answer first, collect second.**
   If the student asks a real question, answer it before asking for missing profile info.

2. **No form prison.**
   Students can ignore questions, switch topics, half-answer, or come back later.

3. **Career before college.**
   Start from life, interests, work style, and outcomes. Then map to majors and schools.

4. **Every interaction should improve the passport.**
   A message should either answer, remember, classify, enrich, or move something forward.

5. **Use student language without trying too hard.**
   Casual and clear. Never corporate. Never fake teen slang.

6. **Small social proof beats a social network.**
   Use privacy-safe cohort signals and friend codes before building feeds or public profiles.

7. **Durable state beats clever memory.**
   If the student would be confused if the agent forgot it, store it in Postgres.

## Demo Personas

These are suggested seeded demo profiles. Adjust if the team receives official persona details.

### Maya - Senior, First-Gen, Nursing

Known:

- Grade: senior
- Interest: nursing
- Region: Utah
- Concern: affordability and deadlines
- Needs: essay help, FAFSA checklist, scholarship matching, application timeline

Experience:

- Agent gets specific about UVU, Weber, SLCC, and nearby nursing pathways.
- Agent offers a short "senior next 7 days" plan.
- Agent can email a summary to Maya or a parent/counselor.

### Caleb - Junior, CS/Gaming, Socially Motivated

Known:

- Grade: junior
- Interest: computer science, game development, AI
- Concern: does not know what matters for admissions yet
- Needs: junior timeline, test planning, project ideas, school list

Experience:

- Agent suggests a summer project quest.
- Agent compares CS programs using real school data.
- Agent shows privacy-safe peer signal: "other juniors interested in CS also saved..."

### Devon - Sophomore, Undecided

Known:

- Grade: sophomore
- Interest: unsure
- Concern: future feels vague
- Needs: exploration, confidence, lightweight career discovery

Experience:

- Agent leads with a low-pressure career vibe quiz.
- Agent gives a 10th-grade checklist.
- Agent assigns one micro-quest and invites Devon back tomorrow.

### Jordan - Transfer Student

Known:

- Current status: community college or college transfer
- Interest: finishing faster and avoiding lost credits
- Concern: transfer credits, cost, deadlines
- Needs: transfer pathways, major requirement comparison, time-to-degree

Experience:

- Agent uses transfer-aware language.
- Agent tracks current institution and target institutions.
- Agent suggests credit-transfer next steps and application deadlines.

## Core User Experience

### First Touch

The first message should not feel like onboarding.

Bad:

> Welcome to Halda. What is your name, grade, high school, intended major, and preferred institution?

Good:

> hey, I can help you figure out careers, majors, schools, scholarships, or application stuff. what are you trying to sort out right now?

If the student starts with a question, answer the question. Then ask one useful follow-up.

### Open Loop Re-Anchoring

When the agent asks a question and the student changes topics, the agent should park the original question and handle the new topic.

Example:

Agent:

> what grade are you in? that changes the advice a lot.

Student:

> does UVU have nursing?

Agent:

> yep, UVU has nursing pathways, and the important thing is that nursing usually gets competitive around prereqs and clinicals. If you are early in high school, the move is different than if you are applying this year.
>
> quick housekeeping so I do not steer you wrong: sophomore, junior, senior, or transfer?

This behavior is powered by durable open loops.

### Profile Passport

Student-visible memory layer:

- "I know you are a junior."
- "You are exploring nursing and healthcare."
- "You care about staying near Utah County."
- "You asked about affordability."
- "Unlocked: nursing pathway checklist, scholarship scan, UVU/Weber/SLCC comparison."

The passport makes personalization legible and builds trust. It also demonstrates Halda's lead-profile value.

### Micro-Quests

Short, repeatable actions:

- Answer 3 career vibe questions.
- Save 2 possible majors.
- Compare 2 schools.
- Complete junior timeline check.
- Draft essay hook.
- Add one application deadline.
- Ask for one scholarship scan.

Rewards can be:

- Points/badges for demo.
- Sponsor-funded gift cards in GTM narrative.
- Better recommendations in product reality.

## System Architecture

Use Spectrum as the primary messaging runtime for iMessage/SMS-like interaction.

Do not introduce Flue/Eve for the hackathon scaffold unless Spectrum or custom adapters become a blocker. Spectrum already gives us a clean messaging interface around spaces, users, messages, and sends. Flue/Eve can remain a future production option for broader agent orchestration.

### Architecture Overview

```txt
Spectrum iMessage/SMS listener
Gmail polling adapter
Website chat API adapter
        |
        v
normalize inbound message
        |
        v
upsert user + messaging identity + conversation
        |
        v
insert halda.messages inbound row
        |
        v
debounce/batch by channel thread or user
        |
        v
load context:
- recent messages
- user
- materialized user profile
- identities
- conversations
- conversation state
- open loops
- recent agent events
- institution enrollments
- relevant institution data
        |
        v
classify latest intent + open-loop resolution
        |
        v
select lifecycle agent profile
        |
        v
assemble dynamic prompt + lifecycle/intent/channel tool bundle
        |
        v
run LLM/tool loop
        |
        v
write agent_events + user_events + open_loop updates
        |
        v
send outbound via channel adapter
        |
        v
insert halda.messages outbound row
```

### Channel Adapters

All channels should call the same core functions.

```ts
type NormalizedInboundMessage = {
  provider: "imessage" | "sms" | "gmail" | "website" | "mobile_app";
  externalMessageId: string;
  externalThreadId: string;
  fromAddress: string;
  toAddress: string;
  body: string;
  subject?: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
};
```

```ts
type NormalizedOutboundMessage = {
  provider: "imessage" | "sms" | "gmail" | "website" | "mobile_app";
  conversationId: string;
  toAddress: string;
  body: string;
  subject?: string;
  metadata?: Record<string, unknown>;
};
```

### Spectrum Adapter

Responsibilities:

- Listen to `app.messages`.
- Normalize Spectrum `space` and `message`.
- Send outbound replies with `space.send`.
- Use `space.responding` or typing indicators for polish.
- Store `space.id`, `message.id`, platform, sender ID, and raw metadata.

### Gmail Adapter

Hackathon approach:

- Use Gmail API with a Workspace email.
- Poll every 5-10 seconds for unread messages.
- Fetch full message.
- Normalize into the same inbound contract.
- Send replies through Gmail API.
- Mark processed messages as read or apply a label.

Production approach:

- Upgrade to Gmail Pub/Sub watch or a provider-specific inbound email webhook.

### Website Chat Adapter

Hackathon approach:

- Thin HTTP route that accepts a message and session ID.
- Writes normalized inbound message.
- Returns or streams agent reply.
- Can collect phone number and hand off to Spectrum.

## Agent Runtime Decision

Use a normal Node process plus Postgres-backed durable state for the hackathon.

Reasoning:

- Current repo is a Spectrum Node app.
- Spectrum wants a persistent listener.
- Gmail polling also wants a persistent or scheduled process.
- The team needs simple, inspectable architecture.
- Postgres can provide durable state, run recovery, and audit logs.

Future production path:

- Vercel Workflow or Cloudflare Workflows can own durable agent turn execution.
- Cloudflare Durable Objects may be useful for per-conversation serialization or real-time web chat.
- Eve/Flue may be useful if we later want a single higher-level agent framework across many channels.

Do not use runtime memory as canonical state. Runtime memory is allowed only for the current turn, current tool selection, debounce timers, and temporary generation state.

## Lifecycle Agent Profiles

Each student lifecycle stage should map to an explicit agent profile. These profiles are global definitions that control prompt posture, default goals, available tools, milestone logic, and what "good guidance" means for that student.

Start with profiles in code/config, not the database:

```txt
agent/src/agent/profiles/unknown.ts
agent/src/agent/profiles/sophomore.ts
agent/src/agent/profiles/junior.ts
agent/src/agent/profiles/senior.ts
agent/src/agent/profiles/transfer.ts
agent/src/agent/profiles/current-college.ts
```

Each lifecycle agent profile defines:

- `profileKey`
- lifecycle stage labels it can serve
- system prompt fragment
- tone and response policy
- default student goals
- default open loops
- stage-specific tools
- milestone model
- risk flags
- demo success criteria

The database stores the student's current assigned profile and confidence. The code owns the actual prompt and tool bundle definitions so teammates can review behavior in normal source files.

Lifecycle stage should support uncertainty:

- `unknown`
- `sophomore`
- `junior`
- `senior`
- `transfer`
- `current_college`
- `gap_year`

Students can also have tags that cross stages, such as `dual_enrollment`, `first_generation`, `international`, `parent_involved`, `transfer_curious`, or `athlete`.

## Agent State Model

The student experiences one linear text thread. The agent internally tracks lifecycle profile, short-term state, long-term state, open loops, and event history.

### State Layers

Raw session context:

- Recent messages from the current channel/thread.
- Used for immediate conversational continuity.
- Kept small, usually the last N relevant messages plus current inbound burst.

Short-term conversation state:

- Current intent.
- Current flow.
- Partially filled slots.
- Active lifecycle agent profile for this conversation.
- Recent compact summary for this conversation.
- Can start in `conversations.metadata`, then move to `conversation_states` if it grows.

Long-term materialized profile:

- Current lifecycle stage and confidence.
- Stable facts, interests, preferences, constraints, communication style, and milestone progress.
- Read directly at runtime so the agent does not need to re-parse all past messages.
- Lives in `user_profiles`.

Append-only history:

- `messages` records raw transcript.
- `user_events` records product/student timeline.
- `agent_events` records AI actions and tool calls.
- Profile snapshots preserve how the materialized profile changed over time.

### Open Loops

Open loops are durable pending conversational obligations.

Examples:

- collect_first_name
- collect_grade_level
- collect_intended_major
- ask_parent_summary_permission
- wait_for_email_verification
- follow_up_saved_school
- compare_two_schools
- complete_junior_timeline

Rules:

- Open loops live in Postgres.
- Open loops can be answered, partially answered, ignored, snoozed, or cancelled.
- The agent should not force the user back into a loop if they asked a new real question.
- Re-anchor only when useful and natural.

### Agent Events

Agent events are audit logs for what the agent did.

Examples:

- classified_intent
- created_open_loop
- completed_open_loop
- called_college_scorecard
- searched_institution
- sent_email_summary
- updated_conversation_topic
- failed_tool_call

Agent events are useful for:

- Debugging.
- Judge explanation.
- Agent catch-up.
- Analytics.
- Future replay/evaluation.

### Materialized User Profile

`user_profiles` is the fast-read current state for the agent. It is intentionally mutable.

Examples of materialized profile state:

- lifecycle stage: senior
- profile summary: "Maya is a senior in Utah exploring nursing. She is first-gen, cost-sensitive, and worried about deadlines."
- interests: nursing, healthcare, staying near Utah County
- constraints: cost, deadline anxiety, needs parent/counselor summary
- communication style: concise, reassuring, likes checklists
- milestones: FAFSA not started, school list started, essay draft not started
- tool access: senior tools, scholarship tools, email summary tools

This state is updated by explicit tools, post-turn compaction, and important user events.

### User Events

User events are product/business timeline events.

Examples:

- completed_quest
- saved_school
- saved_major
- unlocked_badge
- started_sms_handoff
- completed_sms_handoff
- requested_email_summary
- added_application_deadline

### Profile Snapshots

Keep the current profile mutable, but snapshot it whenever it is compacted or materially changed.

Snapshot triggers:

- Lifecycle stage changes.
- Major interests or constraints change.
- A milestone is completed.
- A profile compaction job runs.
- A teammate manually corrects a profile during demo prep.

This gives us both speed and auditability:

```txt
append-only events -> materialized profile -> versioned snapshots
```

## Dynamic Tool Bundles

Do not provide the LLM with one massive tool list. Assemble tools per turn.

```txt
tools = base tools
      + lifecycle agent profile tools
      + current-intent tools
      + channel-specific tools
```

Runtime assembly:

```txt
load user_profile.lifecycle_stage
load matching lifecycle agent profile
merge base prompt + lifecycle prompt + profile summary
merge base tools + lifecycle tools + intent tools + channel tools
```

### Base Tools

- save_profile_fact
- update_user_profile
- snapshot_user_profile
- create_open_loop
- complete_open_loop
- snooze_open_loop
- create_user_event
- lookup_college
- search_programs
- send_email_summary
- handoff_to_text
- log_agent_event

### Sophomore Tools

- career_interest_quiz
- build_10th_grade_plan
- suggest_exploration_quest
- recommend_courses_to_try
- explain_major_options

### Junior Tools

- build_junior_timeline
- sat_act_planner
- college_match_search
- summer_plan_builder
- campus_visit_planner
- scholarship_prep_checklist

### Senior Tools

- application_deadline_tracker
- essay_feedback
- fafsa_checklist
- scholarship_matcher
- acceptance_comparison
- enrollment_checklist

### Transfer Tools

- credit_transfer_estimator
- community_college_pathway
- major_requirement_compare
- transfer_deadline_tracker
- time_to_degree_estimator

### Channel Tools

iMessage/SMS:

- send_short_reply
- send_followup_nudge
- ask_for_email_handoff

Email:

- send_summary
- send_checklist
- send_parent_or_counselor_copy

Website:

- render_profile_passport
- start_text_handoff
- show_school_comparison

## Conversation Policy

Before each response, classify the latest message.

Classifier dimensions:

- answers_open_loop: yes/no/partial
- topic_switch: yes/no
- new_question: yes/no
- action_request: yes/no
- sentiment: neutral/confused/anxious/excited/frustrated
- school_mentioned: optional
- career_mentioned: optional
- grade_signal: optional
- urgency: low/medium/high

Response policy:

1. If the student asks a direct question, answer it first.
2. If the message resolves an open loop, complete or update that loop.
3. If the message partially resolves a loop, ask one clarifying question.
4. If the message ignores a non-blocking loop, keep it open.
5. If an open loop is important and natural to ask again, re-anchor briefly.
6. If the student is anxious or confused, reduce scope and give one next move.
7. If the student is senior/transfer and deadlines matter, be more concrete.

## Data Model

Use schema `halda`.

All tables:

- `id uuid primary key default uuidv7()`
- `created_at timestamptz not null default now()`
- `modified_at timestamptz not null default now()`
- `deleted_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb` where useful

Postgres version assumption:

- Prefer Postgres 18+ native `uuidv7()`.
- If unavailable, generate UUIDv7 in app code or use an extension.

### Core Tables

- `halda.users`
- `halda.user_profiles`
- `halda.messaging_platforms`
- `halda.user_messaging_identities`
- `halda.conversations`
- `halda.conversation_states`
- `halda.messages`
- `halda.pre_tertiary_institutions`
- `halda.tertiary_institutions`
- `halda.user_institution_enrollments`
- `halda.user_events`
- `halda.user_profile_snapshots`
- `halda.agent_open_loops`
- `halda.agent_events`

Profile memory:

- `user_profiles` is the mutable fast-read state the agent loads every turn.
- `user_profile_snapshots` stores version history whenever the profile is compacted or materially changed.
- `user_events` remains the immutable timeline used for analytics and profile reconstruction.
- Flexible facts should start in `user_profiles.facts`, `user_profiles.preferences`, `user_profiles.interests`, and `user_profiles.constraints`.
- Promote stable facts into first-class columns only after requirements settle.

### Runtime Tables

The DDL includes `halda.agent_runs` because it is cheap and helpful for recovery, but the first implementation can use it lightly. Use it when we need explicit queue, retry, locking, or cancellation behavior.

- `halda.agent_runs`
- `halda.inbound_message_batches` can be added later if simple debounce timers are not enough.

## Initial Postgres DDL

```sql
create schema if not exists halda;

create table if not exists halda.users (
  id uuid primary key default uuidv7(),
  display_name text,
  first_name text,
  last_name text,
  user_type text not null default 'student'
    check (user_type in ('student', 'guardian', 'counselor', 'institution_staff', 'halda_agent', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_profiles (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  lifecycle_stage text not null default 'unknown'
    check (lifecycle_stage in ('unknown', 'sophomore', 'junior', 'senior', 'transfer', 'current_college', 'gap_year')),
  lifecycle_stage_confidence numeric(4, 3) not null default 0
    check (lifecycle_stage_confidence >= 0 and lifecycle_stage_confidence <= 1),
  agent_profile_key text not null default 'unknown',
  profile_version integer not null default 1,
  profile_summary text,
  facts jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  interests jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  milestones jsonb not null default '{}'::jsonb,
  tool_access jsonb not null default '{}'::jsonb,
  communication_style jsonb not null default '{}'::jsonb,
  tags text[] not null default array[]::text[],
  last_compacted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.messaging_platforms (
  id uuid primary key default uuidv7(),
  platform_key text not null unique check (platform_key ~ '^[a-z0-9_]+$'),
  display_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_messaging_identities (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  messaging_platform_id uuid not null references halda.messaging_platforms(id),
  external_identity text not null,
  normalized_identity text not null,
  display_name text,
  is_primary boolean not null default false,
  is_halda_controlled boolean not null default false,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.pre_tertiary_institutions (
  id uuid primary key default uuidv7(),
  name text not null,
  institution_type text not null default 'high_school'
    check (institution_type in ('high_school', 'middle_school', 'k12', 'homeschool', 'ged', 'international', 'other')),
  city text,
  region text,
  country_code text not null default 'US',
  postal_code text,
  nces_school_id text,
  ceeb_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.tertiary_institutions (
  id uuid primary key default uuidv7(),
  name text not null,
  institution_type text not null default 'college'
    check (institution_type in ('university', 'college', 'community_college', 'trade_school', 'bootcamp', 'other')),
  city text,
  region text,
  country_code text not null default 'US',
  postal_code text,
  ipeds_unit_id integer,
  ope_id text,
  scorecard_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_institution_enrollments (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  institution_level text not null check (institution_level in ('pre_tertiary', 'tertiary')),
  pre_tertiary_institution_id uuid references halda.pre_tertiary_institutions(id),
  tertiary_institution_id uuid references halda.tertiary_institutions(id),
  enrollment_started_at date,
  enrollment_ended_at date,
  enrollment_status text not null default 'unknown'
    check (enrollment_status in ('planned', 'current', 'completed', 'transferred', 'withdrawn', 'unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_institution_enrollments_one_institution_chk check (
    (institution_level = 'pre_tertiary' and pre_tertiary_institution_id is not null and tertiary_institution_id is null)
    or
    (institution_level = 'tertiary' and tertiary_institution_id is not null and pre_tertiary_institution_id is null)
  ),
  constraint user_institution_enrollments_dates_chk check (
    enrollment_ended_at is null
    or enrollment_started_at is null
    or enrollment_ended_at >= enrollment_started_at
  )
);

create table if not exists halda.conversations (
  id uuid primary key default uuidv7(),
  user_id uuid references halda.users(id),
  title text,
  topic text,
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.conversation_states (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  conversation_id uuid not null references halda.conversations(id),
  agent_profile_key text not null default 'unknown',
  current_intent text,
  current_flow text,
  slot_values jsonb not null default '{}'::jsonb,
  short_term_summary text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.messages (
  id uuid primary key default uuidv7(),
  conversation_id uuid not null references halda.conversations(id),
  messaging_platform_id uuid not null references halda.messaging_platforms(id),
  from_identity_id uuid references halda.user_messaging_identities(id),
  to_identity_id uuid references halda.user_messaging_identities(id),
  from_address text,
  to_address text,
  external_message_id text,
  external_thread_id text,
  in_reply_to_external_message_id text,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content_type text not null default 'text'
    check (content_type in ('text', 'html', 'attachment', 'tool_call', 'tool_result', 'json')),
  subject text,
  body text,
  status text not null default 'received'
    check (status in ('received', 'queued', 'sent', 'failed', 'ignored')),
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint messages_has_from_chk check (from_identity_id is not null or nullif(from_address, '') is not null),
  constraint messages_has_to_chk check (to_identity_id is not null or nullif(to_address, '') is not null)
);

create table if not exists halda.user_events (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  message_id uuid references halda.messages(id),
  event_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_profile_snapshots (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  user_profile_id uuid not null references halda.user_profiles(id),
  profile_version integer not null,
  lifecycle_stage text not null,
  agent_profile_key text not null,
  profile_json jsonb not null,
  snapshot_reason text not null default 'compaction'
    check (snapshot_reason in ('compaction', 'lifecycle_transition', 'milestone_update', 'manual_correction', 'backfill', 'debug')),
  created_from_message_id uuid references halda.messages(id),
  created_from_event_id uuid references halda.user_events(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.agent_open_loops (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  source_message_id uuid references halda.messages(id),
  loop_type text not null,
  status text not null default 'open'
    check (status in ('open', 'snoozed', 'completed', 'cancelled', 'failed')),
  priority integer not null default 0,
  blocking boolean not null default false,
  prompt text,
  expected_response_schema jsonb,
  result jsonb,
  due_at timestamptz,
  snoozed_until timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.agent_events (
  id uuid primary key default uuidv7(),
  user_id uuid references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  message_id uuid references halda.messages(id),
  agent_open_loop_id uuid references halda.agent_open_loops(id),
  event_type text not null,
  status text not null default 'succeeded'
    check (status in ('started', 'succeeded', 'failed', 'skipped')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.agent_runs (
  id uuid primary key default uuidv7(),
  user_id uuid references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  trigger_message_id uuid references halda.messages(id),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  locked_by text,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  last_heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists user_messaging_identities_platform_identity_uidx
  on halda.user_messaging_identities (messaging_platform_id, normalized_identity)
  where deleted_at is null;

create unique index if not exists user_profiles_user_uidx
  on halda.user_profiles (user_id)
  where deleted_at is null;

create index if not exists user_profiles_lifecycle_stage_idx
  on halda.user_profiles (lifecycle_stage, agent_profile_key)
  where deleted_at is null;

create unique index if not exists conversation_states_conversation_uidx
  on halda.conversation_states (conversation_id)
  where deleted_at is null;

create index if not exists conversation_states_user_idx
  on halda.conversation_states (user_id, id desc)
  where deleted_at is null;

create unique index if not exists user_profile_snapshots_version_uidx
  on halda.user_profile_snapshots (user_id, profile_version)
  where deleted_at is null;

create index if not exists user_profile_snapshots_user_idx
  on halda.user_profile_snapshots (user_id, id desc)
  where deleted_at is null;

create unique index if not exists messages_platform_external_message_uidx
  on halda.messages (messaging_platform_id, external_message_id)
  where external_message_id is not null and deleted_at is null;

create index if not exists messages_conversation_id_idx
  on halda.messages (conversation_id, id desc)
  where deleted_at is null;

create index if not exists messages_platform_thread_idx
  on halda.messages (messaging_platform_id, external_thread_id, id desc)
  where external_thread_id is not null and deleted_at is null;

create index if not exists conversations_user_status_idx
  on halda.conversations (user_id, status, id desc)
  where deleted_at is null;

create index if not exists user_events_user_idx
  on halda.user_events (user_id, occurred_at desc)
  where deleted_at is null;

create index if not exists agent_open_loops_user_status_idx
  on halda.agent_open_loops (user_id, status, priority desc, id desc)
  where deleted_at is null;

create index if not exists agent_events_user_idx
  on halda.agent_events (user_id, occurred_at desc)
  where deleted_at is null;

create index if not exists agent_runs_status_idx
  on halda.agent_runs (status, id)
  where deleted_at is null;

create index if not exists agent_runs_claim_idx
  on halda.agent_runs (status, lock_expires_at, id)
  where deleted_at is null;

create index if not exists user_institution_enrollments_user_idx
  on halda.user_institution_enrollments (user_id, enrollment_status)
  where deleted_at is null;

create unique index if not exists tertiary_institutions_ipeds_uidx
  on halda.tertiary_institutions (ipeds_unit_id)
  where ipeds_unit_id is not null and deleted_at is null;

create or replace function halda.set_modified_at()
returns trigger
language plpgsql
as $$
begin
  new.modified_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users',
    'user_profiles',
    'messaging_platforms',
    'user_messaging_identities',
    'pre_tertiary_institutions',
    'tertiary_institutions',
    'user_institution_enrollments',
    'conversations',
    'conversation_states',
    'messages',
    'user_events',
    'user_profile_snapshots',
    'agent_open_loops',
    'agent_events',
    'agent_runs'
  ]
  loop
    execute format('drop trigger if exists trg_set_modified_at on halda.%I', table_name);
    execute format(
      'create trigger trg_set_modified_at before update on halda.%I for each row execute function halda.set_modified_at()',
      table_name
    );
  end loop;
end $$;

insert into halda.messaging_platforms (platform_key, display_name)
values
  ('gmail', 'Gmail'),
  ('website', 'Website'),
  ('mobile_app', 'Mobile App'),
  ('sms', 'SMS'),
  ('imessage', 'iMessage')
on conflict (platform_key) do update
set display_name = excluded.display_name,
    modified_at = now();
```

## Implementation Phases

### Phase 0 - Team Scaffold

Owner: architecture

- Commit `PLAN.md`.
- Add environment variable documentation without exposing `.env`.
- Decide database provider.
- Decide LLM provider.
- Add basic project structure:
  - `src/db`
  - `src/channels`
  - `src/agent`
  - `src/tools`
  - `src/data`
  - `src/demo`

### Phase 1 - Database and Persistence

Owner: backend

- Create Postgres schema.
- Add DB client.
- Add migrations or SQL bootstrap.
- Add functions:
  - upsert messaging platform
  - upsert user identity
  - find or create user
  - find or create conversation
  - insert inbound message
  - insert outbound message
  - find or create user profile
  - update materialized profile fields
  - snapshot user profile after compaction or lifecycle changes
  - load and update conversation state
  - create/list/complete open loops
  - log agent event

Success:

- Sending one Spectrum message creates user, identity, profile, conversation, conversation state, inbound message, outbound message.

### Phase 2 - Agent Core

Owner: agent

- Build `handleInboundMessage(normalizedMessage)`.
- Build lifecycle agent profile registry.
- Build context loader.
- Build intent/open-loop classifier.
- Build prompt composer.
- Build dynamic tool bundle assembler.
- Build profile update and compaction policy.
- Build response generator.
- Build action applier that writes profile updates/open loops/events/messages.

Success:

- Agent can infer/confirm lifecycle stage, select the right lifecycle profile, remember it in `user_profiles`, answer unrelated questions, and re-anchor later.

### Phase 3 - Spectrum Texting

Owner: messaging

- Replace echo bot with normalized inbound handler.
- Add allowlist for demo safety.
- Use typing indicators.
- Add simple debounce.
- Send generated reply back through Spectrum.

Success:

- Local iMessage/SMS-like flow works end to end.

### Phase 4 - Real Data

Owner: data/tools

- Add College Scorecard lookup by school name.
- Cache useful institution rows in `tertiary_institutions`.
- Add school comparison tool.
- Add fields relevant to:
  - tuition/cost
  - admission rate where available
  - graduation rate
  - median earnings where available
  - location
  - institution type

Success:

- Judge can ask about a real school and get real stats.

### Phase 5 - Gmail Adapter

Owner: integrations

- Configure Gmail API OAuth for Workspace account.
- Poll unread messages.
- Normalize inbound email.
- Send replies.
- Mark processed messages as read or labeled.

Success:

- Same user can email and continue context if identity is linked or seeded.

### Phase 6 - Website Chat / Profile Passport

Owner: frontend

- Build thin web chat if time permits.
- Show Profile Passport if time permits.
- Add phone handoff:
  - collect phone
  - create identity
  - send first Spectrum message

Success:

- Web chat to text handoff demo works.

### Phase 7 - Demo Polish

Owner: everyone

- Seed personas.
- Seed school examples.
- Script judge flows.
- Add graceful fallbacks.
- Log errors visibly for team, not user.
- Practice demo with bad inputs and topic switches.

## Demo Script

### Flow 1 - Devon, Sophomore, Undecided

Goal: show career-first and reason to return.

1. Student texts: "idk what I want to do after high school"
2. Agent responds casually and offers a 3-question career vibe quiz.
3. Student answers one or two questions.
4. Agent creates a mini profile and one micro-quest.
5. Agent says it will check in tomorrow.

Rubric hit:

- Conversational quality
- Career-first discovery
- Grade-aware guidance
- Reason to return

### Flow 2 - Caleb, Junior, CS

Goal: show dynamic grade-specific tools and real data.

1. Student asks: "what should I be doing junior year if I maybe want cs?"
2. Agent gives a junior timeline.
3. Student asks: "what about UVU vs Utah State?"
4. Agent uses real data and compares schools.
5. Agent creates a project/summer plan quest.

Rubric hit:

- Personalization
- Real data
- Grade-aware guidance
- Product instinct

### Flow 3 - Maya, Senior, Nursing, Email Summary

Goal: show multi-channel and profile memory.

1. Student texts: "I want nursing but I'm worried I missed deadlines"
2. Agent gives senior-specific next steps.
3. Agent asks if she wants an email summary.
4. Student gives email.
5. Gmail adapter sends summary.
6. Student replies by email with a follow-up.
7. Agent continues context.

Rubric hit:

- Multi-channel availability
- Profile memory
- Email continuity
- Technical execution

### Flow 4 - Jordan, Transfer

Goal: show transfer-specific personalization.

1. Student says: "I'm at SLCC and want to transfer without wasting credits"
2. Agent detects transfer path.
3. Agent asks target major/school only if needed.
4. Agent gives transfer-aware plan.

Rubric hit:

- Personalization depth
- Novel angle
- Product instinct

## GTM Plan to 100K Students

Positioning:

> A free, text-first future guide for high school students, funded by institutions and local partners who want earlier, better-fit student relationships.

### Channels

School districts and counselors:

- Free classroom modules for career exploration.
- Counselor dashboard later.
- QR code posters and assemblies.

Institution partners:

- Colleges sponsor pathway quests.
- Programs sponsor major-specific checklists.
- Admissions teams get warmer, earlier student interest.

Local sponsor rewards:

- Credit unions.
- Healthcare systems.
- Local employers.
- Workforce boards.

Student growth:

- Friend codes.
- Compare lists with a friend.
- Group/school-level progress challenges.
- "Send me my plan" SMS/email share loops.

### 100K Growth Model

Assumptions:

- 50 school/district partners.
- Average reachable students per partner: 2,500.
- Activation rate: 20%.
- Activated students: 25,000.
- Viral/invite multiplier: 1.3x.
- Institution/sponsor campaigns: 25,000 additional activations.
- Paid/partner media and counselor pushes: 40,000 additional activations.

Path:

- Month 1: 5 pilot schools, 2,000 students.
- Month 2: 15 schools, 10,000 cumulative students.
- Month 3: 30 schools, 30,000 cumulative students.
- Month 4: sponsor-funded reward quests, 55,000 cumulative students.
- Month 5: college partner campaigns, 80,000 cumulative students.
- Month 6: 100,000+ cumulative students.

Why math is credible:

- Schools already need college and career readiness programming.
- The product is free to students.
- Sponsors fund rewards because students are top-of-funnel future customers/workforce.
- Colleges get earlier behavioral signals than website visits.

## Risk Register

### Risk: Agent feels like a form

Mitigation:

- Answer first.
- One follow-up at a time.
- Persist open loops.
- Re-anchor gently.

### Risk: Multi-channel gets flaky

Mitigation:

- Make Spectrum primary.
- Gmail polling is secondary.
- Seed identities for demo.
- Keep web chat optional.

### Risk: Real data lookup fails

Mitigation:

- Cache known schools used in demo.
- Show source/fallback wording.
- Do not fabricate exact stats.

### Risk: Open-loop logic gets too complex

Mitigation:

- Start with explicit rules.
- Only track a small number of loop types.
- Make open-loop state visible in logs.

### Risk: Privacy concerns

Mitigation:

- No public student profiles.
- Social features use aggregate/cohort signals or friend codes.
- Show Profile Passport so students know what is remembered.

### Risk: Framework overbuild

Mitigation:

- Spectrum plus custom adapters.
- Postgres as truth.
- Avoid adding Flue/Eve unless a concrete blocker appears.

## Team Workstreams

### Messaging

- Spectrum adapter
- Gmail poller
- Web chat route if time
- Delivery status and outbound logging

### Persistence

- Postgres schema
- DB client
- Repository functions
- Seed data

### Agent

- Prompt design
- Intent classifier
- Open-loop policy
- Dynamic tool bundle assembly
- Tool call logging

### Data

- College Scorecard client
- Institution cache
- School comparison tool
- Seed known demo schools

### Product/Demo

- Persona scripts
- Tone guide
- Profile Passport content
- GTM slide/section
- Judge path rehearsal

## Build Priorities

Must have:

- Spectrum texting end to end.
- Messages persisted.
- Users and identities persisted.
- Materialized user profiles persisted.
- Conversations persisted.
- Conversation state persisted.
- Open loops persisted.
- Lifecycle agent profiles in code/config.
- Grade-aware responses.
- Real school lookup/comparison.
- Demo personas seeded.

Should have:

- Gmail polling and replies.
- Email summary.
- Profile Passport view or text rendering.
- Micro-quests and user events.
- Social proof/cohort signal.

Stretch:

- Website chat.
- Web to text handoff.
- Friend codes.
- Sponsor reward mock.
- Transfer credit estimator.
- Vercel/Cloudflare durable workflow migration.

## Definition of Done for Hackathon Demo

The project is demo-ready when:

- A judge can text the agent and receive natural, useful replies.
- The agent adapts to sophomore, junior, senior, and transfer contexts.
- The agent loads a lifecycle-specific profile and tool bundle for each seeded persona.
- The agent reads a materialized user profile instead of relying only on raw history.
- The agent remembers across turns.
- The agent handles topic switches without losing pending questions.
- Real school data is used in at least one live flow.
- A second channel, preferably Gmail, can demonstrate context continuity.
- The database clearly shows messages, identities, conversations, open loops, and events.
- The team can explain the GTM path to 100K students with credible channel math.

## North Star

The winning demo is not "a chatbot for college search."

The winning demo is:

> A text-native student relationship engine that helps teenagers make their next future decision while quietly building the earliest, richest, most useful enrollment intent graph Halda could offer colleges.

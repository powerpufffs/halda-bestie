import { sql, type SQL } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import {
  conversationStateFromRow,
  displayNameForPlatform,
  isUuid,
  jsonb,
  openLoopFromRow,
  parseIdentity,
  profileFromRow,
  textArray,
  type ConversationStateRow,
  type IdRow,
  type OpenLoopRow,
  type UserProfileRow,
} from "./postgres-state-codec.ts";
import type {
  AgentEvent,
  AgentMessageRecord,
  AgentOpenLoop,
  ConversationState,
  StudentProfileState,
} from "./types.ts";
import type { AgentStateStore } from "./state-store.ts";
import { insertAgentEvent, insertMessageRecord } from "./postgres-state-writes.ts";

export class PostgresAgentStateStore implements AgentStateStore {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async getProfile(userId: string): Promise<StudentProfileState> {
    const dbUserId = await this.#ensureUser(userId);
    const [existing] = await this.#rows<UserProfileRow>(sql`
      select lifecycle_stage,
             lifecycle_stage_confidence,
             agent_profile_key,
             profile_version,
             profile_summary,
             facts,
             preferences,
             interests,
             constraints,
             milestones,
             tool_access,
             communication_style,
             tags,
             modified_at
      from halda.user_profiles
      where user_id = ${dbUserId}::uuid
        and deleted_at is null
      limit 1
    `);

    if (existing) return profileFromRow(userId, existing);

    const [created] = await this.#rows<UserProfileRow>(sql`
      insert into halda.user_profiles (user_id)
      values (${dbUserId}::uuid)
      returning lifecycle_stage,
                lifecycle_stage_confidence,
                agent_profile_key,
                profile_version,
                profile_summary,
                facts,
                preferences,
                interests,
                constraints,
                milestones,
                tool_access,
                communication_style,
                tags,
                modified_at
    `);

    if (!created) throw new Error("Failed to create user profile");
    return profileFromRow(userId, created);
  }

  async saveProfile(profile: StudentProfileState): Promise<void> {
    const dbUserId = await this.#ensureUser(profile.userId);
    const updated = await this.#rows<IdRow>(sql`
      update halda.user_profiles
      set lifecycle_stage = ${profile.lifecycleStage},
          lifecycle_stage_confidence = ${profile.lifecycleStageConfidence},
          agent_profile_key = ${profile.agentProfileKey},
          profile_version = ${profile.profileVersion},
          profile_summary = ${profile.profileSummary ?? null},
          facts = ${jsonb(profile.facts)},
          preferences = ${jsonb(profile.preferences)},
          interests = ${jsonb(profile.interests)},
          constraints = ${jsonb(profile.constraints)},
          milestones = ${jsonb(profile.milestones)},
          tool_access = ${jsonb(profile.toolAccess)},
          communication_style = ${jsonb(profile.communicationStyle)},
          tags = ${textArray(profile.tags)}
      where user_id = ${dbUserId}::uuid
        and deleted_at is null
      returning id
    `);

    if (updated.length > 0) {
      await this.#updateUserFromProfile(dbUserId, profile);
      return;
    }

    await this.#rows<IdRow>(sql`
      insert into halda.user_profiles (
        user_id,
        lifecycle_stage,
        lifecycle_stage_confidence,
        agent_profile_key,
        profile_version,
        profile_summary,
        facts,
        preferences,
        interests,
        constraints,
        milestones,
        tool_access,
        communication_style,
        tags
      )
      values (
        ${dbUserId}::uuid,
        ${profile.lifecycleStage},
        ${profile.lifecycleStageConfidence},
        ${profile.agentProfileKey},
        ${profile.profileVersion},
        ${profile.profileSummary ?? null},
        ${jsonb(profile.facts)},
        ${jsonb(profile.preferences)},
        ${jsonb(profile.interests)},
        ${jsonb(profile.constraints)},
        ${jsonb(profile.milestones)},
        ${jsonb(profile.toolAccess)},
        ${jsonb(profile.communicationStyle)},
        ${textArray(profile.tags)}
      )
      returning id
    `);
    await this.#updateUserFromProfile(dbUserId, profile);
  }

  async getConversationState(userId: string, threadId: string): Promise<ConversationState> {
    const { dbUserId, conversationId } = await this.#ensureConversation(userId, threadId);
    const [existing] = await this.#rows<ConversationStateRow>(sql`
      select agent_profile_key,
             current_intent,
             current_flow,
             slot_values,
             short_term_summary,
             modified_at
      from halda.conversation_states
      where user_id = ${dbUserId}::uuid
        and conversation_id = ${conversationId}::uuid
        and deleted_at is null
      limit 1
    `);

    if (existing) return conversationStateFromRow(userId, threadId, existing);

    const [created] = await this.#rows<ConversationStateRow>(sql`
      insert into halda.conversation_states (user_id, conversation_id, metadata)
      values (${dbUserId}::uuid, ${conversationId}::uuid, ${jsonb({ externalThreadId: threadId })})
      returning agent_profile_key,
                current_intent,
                current_flow,
                slot_values,
                short_term_summary,
                modified_at
    `);

    if (!created) throw new Error("Failed to create conversation state");
    return conversationStateFromRow(userId, threadId, created);
  }

  async saveConversationState(state: ConversationState): Promise<void> {
    const { dbUserId, conversationId } = await this.#ensureConversation(state.userId, state.threadId);
    const updated = await this.#rows<IdRow>(sql`
      update halda.conversation_states
      set agent_profile_key = ${state.agentProfileKey},
          current_intent = ${state.currentIntent ?? null},
          current_flow = ${state.currentFlow ?? null},
          slot_values = ${jsonb(state.slotValues)},
          short_term_summary = ${state.shortTermSummary ?? null},
          metadata = ${jsonb({ externalThreadId: state.threadId })}
      where user_id = ${dbUserId}::uuid
        and conversation_id = ${conversationId}::uuid
        and deleted_at is null
      returning id
    `);

    if (updated.length > 0) return;

    await this.#rows<IdRow>(sql`
      insert into halda.conversation_states (
        user_id,
        conversation_id,
        agent_profile_key,
        current_intent,
        current_flow,
        slot_values,
        short_term_summary,
        metadata
      )
      values (
        ${dbUserId}::uuid,
        ${conversationId}::uuid,
        ${state.agentProfileKey},
        ${state.currentIntent ?? null},
        ${state.currentFlow ?? null},
        ${jsonb(state.slotValues)},
        ${state.shortTermSummary ?? null},
        ${jsonb({ externalThreadId: state.threadId })}
      )
      returning id
    `);
  }

  async listOpenLoops(userId: string): Promise<AgentOpenLoop[]> {
    const dbUserId = await this.#ensureUser(userId);
    const rows = await this.#rows<OpenLoopRow>(sql`
      select id,
             conversation_id,
             loop_type,
             status,
             priority,
             blocking,
             prompt,
             result,
             metadata,
             created_at,
             modified_at
      from halda.agent_open_loops
      where user_id = ${dbUserId}::uuid
        and status = 'open'
        and deleted_at is null
      order by priority desc, id desc
    `);

    return rows.map((row) => openLoopFromRow(userId, row));
  }

  async upsertOpenLoop(loop: AgentOpenLoop): Promise<void> {
    const dbUserId = await this.#ensureUser(loop.userId);
    const conversationId = loop.threadId
      ? (await this.#ensureConversation(loop.userId, loop.threadId)).conversationId
      : null;
    const existingId = await this.#findOpenLoopId(dbUserId, loop.id, loop.loopType, conversationId);

    if (existingId) {
      await this.#rows<IdRow>(sql`
        update halda.agent_open_loops
        set conversation_id = ${conversationId}::uuid,
            loop_type = ${loop.loopType},
            status = ${loop.status},
            priority = ${loop.priority},
            blocking = ${loop.blocking},
            prompt = ${loop.prompt},
            result = ${loop.result ? jsonb(loop.result) : null},
            completed_at = case when ${loop.status} = 'completed' then now() else completed_at end,
            metadata = ${jsonb({ externalThreadId: loop.threadId })}
        where id = ${existingId}::uuid
        returning id
      `);
      return;
    }

    await this.#rows<IdRow>(sql`
      insert into halda.agent_open_loops (
        user_id,
        conversation_id,
        loop_type,
        status,
        priority,
        blocking,
        prompt,
        result,
        completed_at,
        metadata
      )
      values (
        ${dbUserId}::uuid,
        ${conversationId}::uuid,
        ${loop.loopType},
        ${loop.status},
        ${loop.priority},
        ${loop.blocking},
        ${loop.prompt},
        ${loop.result ? jsonb(loop.result) : null},
        case when ${loop.status} = 'completed' then now() else null end,
        ${jsonb({ externalThreadId: loop.threadId })}
      )
      returning id
    `);
  }

  async logMessage(message: AgentMessageRecord): Promise<void> {
    const participant = await this.#ensureUserIdentity(message.userId);
    const { conversationId } = await this.#ensureConversation(message.userId, message.threadId);

    await insertMessageRecord({
      conversationId,
      message,
      participant,
      rows: (query) => this.#rows(query),
    });
  }

  async logEvents(events: AgentEvent[]): Promise<void> {
    for (const event of events) {
      // eslint-disable-next-line no-await-in-loop -- keep user/conversation creation ordered for a turn.
      const dbUserId = await this.#ensureUser(event.userId);
      const conversationId = event.threadId
        // eslint-disable-next-line no-await-in-loop -- this may create the shared conversation row.
        ? (await this.#ensureConversation(event.userId, event.threadId)).conversationId
        : null;

      // eslint-disable-next-line no-await-in-loop -- preserve event order in the audit log.
      await insertAgentEvent({
        conversationId,
        dbUserId,
        event,
        rows: (query) => this.#rows(query),
      });
    }
  }

  async #findOpenLoopId(
    dbUserId: string,
    loopId: string,
    loopType: string,
    conversationId: string | null,
  ): Promise<string | undefined> {
    if (isUuid(loopId)) {
      const [existing] = await this.#rows<IdRow>(sql`
        select id
        from halda.agent_open_loops
        where id = ${loopId}::uuid
          and deleted_at is null
        limit 1
      `);
      if (existing) return existing.id;
    }

    const [existing] = await this.#rows<IdRow>(sql`
      select id
      from halda.agent_open_loops
      where user_id = ${dbUserId}::uuid
        and loop_type = ${loopType}
        and status in ('open', 'snoozed')
        and (
          (${conversationId}::uuid is null and conversation_id is null)
          or conversation_id = ${conversationId}::uuid
        )
        and deleted_at is null
      order by priority desc, id desc
      limit 1
    `);

    return existing?.id;
  }

  async #ensureConversation(
    userId: string,
    threadId: string,
  ): Promise<{ dbUserId: string; conversationId: string }> {
    const dbUserId = await this.#ensureUser(userId);
    const [existing] = await this.#rows<IdRow>(sql`
      select id
      from halda.conversations
      where user_id = ${dbUserId}::uuid
        and metadata->>'externalThreadId' = ${threadId}
        and deleted_at is null
      order by id desc
      limit 1
    `);

    if (existing) {
      await this.#rows<IdRow>(sql`
        update halda.conversations
        set last_message_at = now()
        where id = ${existing.id}::uuid
        returning id
      `);
      return { dbUserId, conversationId: existing.id };
    }

    const [created] = await this.#rows<IdRow>(sql`
      insert into halda.conversations (user_id, last_message_at, metadata)
      values (${dbUserId}::uuid, now(), ${jsonb({ externalThreadId: threadId })})
      returning id
    `);

    if (!created) throw new Error("Failed to create conversation");
    return { dbUserId, conversationId: created.id };
  }

  async #ensureUser(userId: string): Promise<string> {
    return (await this.#ensureUserIdentity(userId)).dbUserId;
  }

  async #ensureUserIdentity(userId: string): Promise<{
    dbUserId: string;
    identityId: string;
    platformId: string;
    identity: ReturnType<typeof parseIdentity>;
  }> {
    const identity = parseIdentity(userId);
    const platformId = await this.#ensurePlatform(identity.platformKey);
    const [existing] = await this.#rows<IdRow & { user_id: string }>(sql`
      select id,
             user_id
      from halda.user_messaging_identities
      where messaging_platform_id = ${platformId}::uuid
        and normalized_identity = ${identity.normalizedIdentity}
        and deleted_at is null
      limit 1
    `);

    if (existing) {
      return {
        dbUserId: existing.user_id,
        identityId: existing.id,
        platformId,
        identity,
      };
    }

    const [createdUser] = await this.#rows<IdRow>(sql`
      insert into halda.users (metadata)
      values (${jsonb({
        accountStatus: "anonymous",
        anonymous: true,
        firstSeenExternalUserId: userId,
        firstSeenPlatform: identity.platformKey,
      })})
      returning id
    `);

    if (!createdUser) throw new Error("Failed to create user");

    const [createdIdentity] = await this.#rows<IdRow>(sql`
      insert into halda.user_messaging_identities (
        user_id,
        messaging_platform_id,
        external_identity,
        normalized_identity,
        is_primary,
        metadata
      )
      values (
        ${createdUser.id}::uuid,
        ${platformId}::uuid,
        ${identity.externalIdentity},
        ${identity.normalizedIdentity},
        true,
        ${jsonb({ externalUserId: userId })}
      )
      returning id
    `);

    if (!createdIdentity) throw new Error("Failed to create messaging identity");

    return {
      dbUserId: createdUser.id,
      identityId: createdIdentity.id,
      platformId,
      identity,
    };
  }

  async #updateUserFromProfile(dbUserId: string, profile: StudentProfileState): Promise<void> {
    const metadata = userMetadataFromProfile(profile);

    await this.#rows<IdRow>(sql`
      update halda.users
      set user_type = ${userTypeFromProfile(profile)},
          metadata = metadata || ${jsonb(metadata)}
      where id = ${dbUserId}::uuid
        and deleted_at is null
      returning id
    `);
  }

  async #ensurePlatform(platformKey: string): Promise<string> {
    const [existing] = await this.#rows<IdRow>(sql`
      select id
      from halda.messaging_platforms
      where platform_key = ${platformKey}
        and deleted_at is null
      limit 1
    `);

    if (existing) return existing.id;

    const [created] = await this.#rows<IdRow>(sql`
      insert into halda.messaging_platforms (platform_key, display_name)
      values (${platformKey}, ${displayNameForPlatform(platformKey)})
      on conflict (platform_key) do update
      set display_name = excluded.display_name
      returning id
    `);

    if (!created) throw new Error(`Failed to create messaging platform: ${platformKey}`);
    return created.id;
  }

  async #rows<T>(query: SQL): Promise<T[]> {
    return (await this.#db.execute(query)) as unknown as T[];
  }
}

function userMetadataFromProfile(profile: StudentProfileState): Record<string, unknown> {
  const onboarding = asRecord(profile.facts.onboarding);
  const complete = profile.facts.onboardingComplete === true || onboarding.complete === true;

  return {
    accountStatus: complete ? "identified" : "anonymous",
    anonymous: !complete,
    lifecycleStage: profile.lifecycleStage,
    agentProfileKey: profile.agentProfileKey,
    onboardingComplete: complete,
    onboardingRole: stringValue(profile.facts.onboardingRole) ?? stringValue(onboarding.role),
    collegeIntent: stringValue(profile.facts.collegeIntent) ?? stringValue(onboarding.collegeIntent),
    gradeLevel: stringValue(profile.facts.gradeLevel) ?? stringValue(onboarding.gradeLevel),
    profileUpdatedAt: new Date().toISOString(),
  };
}

function userTypeFromProfile(profile: StudentProfileState): string {
  const onboardingRole = stringValue(profile.facts.onboardingRole);
  if (onboardingRole === "supporter") return "guardian";
  if (onboardingRole === "counselor") return "counselor";
  if (onboardingRole === "institution_staff") return "institution_staff";
  return "student";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

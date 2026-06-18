import { randomInt } from "node:crypto";
import { rows, sql } from "./db";
import { ensureUserForExternalId } from "./user-identity";
import {
  asRecord,
  CHALLENGE_TTL_MS,
  destinationFromExternalUserId,
  hashOpaqueToken,
  hashVerificationCode,
  type ChallengeRow,
  type IdRow,
  jsonb,
  maskDestination,
  MAX_ATTEMPTS,
  parseExternalUserId,
  readString,
  safeEqual,
  shouldExposeAuthCodes,
} from "./web-auth-shared";
import { issueWebSession, type IssuedWebSession } from "./web-session";
import type { WebsiteHandoffPayload } from "./website-handoff";

export interface SmsVerificationChallenge {
  id: string;
  expiresAt: string;
  maskedDestination: string;
  debugCode?: string;
  reused: boolean;
}

export async function createSmsVerificationChallenge(input: {
  payload: WebsiteHandoffPayload;
  handoffToken: string;
  codeOverride?: string;
  forceNew?: boolean;
}): Promise<SmsVerificationChallenge> {
  const userId = await ensureUserForExternalId(input.payload.userId);
  const handoffTokenHash = hashOpaqueToken(input.handoffToken, "handoff");
  const destination = destinationFromExternalUserId(input.payload.userId);

  if (input.forceNew) {
    await cancelPendingChallenges(userId, handoffTokenHash);
  } else {
    const existing = await readPendingChallenge(userId, handoffTokenHash);
    if (existing) return challengeView(existing, true);
  }

  const code = readSixDigitCode(input.codeOverride) ?? randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const exposeCode = shouldExposeAuthCodes();
  const [created] = await rows<ChallengeRow>(sql`
    insert into halda.web_sms_challenges (
      user_id,
      handoff_external_user_id,
      handoff_thread_id,
      handoff_token_hash,
      destination,
      code_hash,
      expires_at,
      metadata
    )
    values (
      ${userId}::uuid,
      ${input.payload.userId},
      ${input.payload.threadId},
      ${handoffTokenHash},
      ${destination},
      ${hashVerificationCode(userId, handoffTokenHash, code)},
      ${expiresAt.toISOString()},
      ${jsonb({
        lifecycleStage: input.payload.lifecycleStage,
        firstName: input.payload.firstName,
        highSchool: input.payload.highSchool,
        role: input.payload.role,
        gradeLevel: input.payload.gradeLevel,
        interests: input.payload.interests,
        debugCode: exposeCode ? code : undefined,
      })}
    )
    returning id,
              user_id,
              handoff_token_hash,
              destination,
              code_hash,
              status,
              attempt_count,
              expires_at,
              metadata
  `);

  if (!created) throw new Error("could not create sms verification.");
  await queueVerificationMessage({
    userId,
    externalUserId: input.payload.userId,
    destination,
    code,
    challengeId: created.id,
    expiresAt,
  });

  return challengeView(created, false, exposeCode ? code : undefined);
}

function readSixDigitCode(value: string | undefined): string | undefined {
  const code = value?.replace(/\D/g, "");
  return code?.length === 6 ? code : undefined;
}

export async function verifySmsChallenge(input: {
  challengeId: string;
  handoffToken: string;
  code: string;
  payload: WebsiteHandoffPayload;
}): Promise<IssuedWebSession> {
  const handoffTokenHash = hashOpaqueToken(input.handoffToken, "handoff");
  const [challenge] = await rows<ChallengeRow>(sql`
    select id,
           user_id,
           handoff_token_hash,
           destination,
           code_hash,
           status,
           attempt_count,
           expires_at,
           metadata
    from halda.web_sms_challenges
    where id = ${input.challengeId}::uuid
      and handoff_token_hash = ${handoffTokenHash}
      and deleted_at is null
    limit 1
  `);

  if (!challenge || challenge.status !== "pending") {
    throw new Error("that verification link is no longer active.");
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await expireChallenge(challenge.id);
    throw new Error("that code expired. resend it and try again.");
  }

  const cleanedCode = input.code.replace(/\D/g, "");
  const expected = hashVerificationCode(challenge.user_id, handoffTokenHash, cleanedCode);
  if (!safeEqual(challenge.code_hash, expected)) {
    await recordFailedAttempt(challenge);
    throw new Error("that code did not match. try once more.");
  }

  await rows(sql`
    update halda.web_sms_challenges
    set status = 'completed',
        completed_at = now(),
        modified_at = now()
    where id = ${challenge.id}::uuid
  `);
  await markMessagingIdentityVerified(input.payload.userId, challenge.user_id);
  await markUserVerified(challenge.user_id, input.payload.userId);

  return issueWebSession({
    userId: challenge.user_id,
    externalUserId: input.payload.userId,
    handoffThreadId: input.payload.threadId,
    lifecycleStage: input.payload.lifecycleStage,
  });
}

async function readPendingChallenge(
  userId: string,
  handoffTokenHash: string,
): Promise<ChallengeRow | undefined> {
  const [existing] = await rows<ChallengeRow>(sql`
    select id,
           user_id,
           handoff_token_hash,
           destination,
           code_hash,
           status,
           attempt_count,
           expires_at,
           metadata
    from halda.web_sms_challenges
    where user_id = ${userId}::uuid
      and handoff_token_hash = ${handoffTokenHash}
      and status = 'pending'
      and expires_at > now()
      and deleted_at is null
    order by created_at desc
    limit 1
  `);

  return existing;
}

async function cancelPendingChallenges(userId: string, handoffTokenHash: string): Promise<void> {
  await rows(sql`
    update halda.web_sms_challenges
    set status = 'cancelled',
        modified_at = now()
    where user_id = ${userId}::uuid
      and handoff_token_hash = ${handoffTokenHash}
      and status = 'pending'
      and deleted_at is null
  `);
}

async function expireChallenge(challengeId: string): Promise<void> {
  await rows(sql`
    update halda.web_sms_challenges
    set status = 'expired',
        modified_at = now()
    where id = ${challengeId}::uuid
  `);
}

async function recordFailedAttempt(challenge: ChallengeRow): Promise<void> {
  const attemptCount = Number(challenge.attempt_count ?? 0) + 1;
  await rows(sql`
    update halda.web_sms_challenges
    set attempt_count = ${attemptCount},
        status = case when ${attemptCount} >= ${MAX_ATTEMPTS} then 'failed' else status end,
        modified_at = now()
    where id = ${challenge.id}::uuid
  `);
}

async function queueVerificationMessage(input: {
  userId: string;
  externalUserId: string;
  destination: string;
  code: string;
  challengeId: string;
  expiresAt: Date;
}): Promise<void> {
  const identity = parseExternalUserId(input.externalUserId);
  const channel = identity.platformKey === "imessage" ? "imessage" : "sms";
  await rows<IdRow>(sql`
    insert into halda.notification_outbox (
      user_id,
      channel,
      destination,
      body,
      reason,
      status,
      scheduled_for,
      metadata
    )
    values (
      ${input.userId}::uuid,
      ${channel},
      ${input.destination},
      ${`${input.code} is your Halda verification code.`},
      'web_sms_verification',
      'queued',
      now(),
      ${jsonb({
        challengeId: input.challengeId,
        expiresAt: input.expiresAt.toISOString(),
      })}
    )
    returning id
  `);
}

async function markMessagingIdentityVerified(externalUserId: string, userId: string): Promise<void> {
  const identity = parseExternalUserId(externalUserId);
  await rows(sql`
    update halda.user_messaging_identities identities
    set verified_at = coalesce(verified_at, now()),
        modified_at = now(),
        metadata = identities.metadata || ${jsonb({ verifiedBy: "web_sms_challenge", verifiedAt: new Date().toISOString() })}
    from halda.messaging_platforms platforms
    where platforms.id = identities.messaging_platform_id
      and identities.user_id = ${userId}::uuid
      and platforms.platform_key = ${identity.platformKey}
      and identities.normalized_identity = ${identity.normalizedIdentity}
      and identities.deleted_at is null
      and platforms.deleted_at is null
  `);
}

async function markUserVerified(userId: string, externalUserId: string): Promise<void> {
  await rows(sql`
    update halda.users
    set metadata = metadata || ${jsonb({
      accountStatus: "verified_sms",
      anonymous: false,
      verifiedExternalUserId: externalUserId,
      verifiedAt: new Date().toISOString(),
    })},
        modified_at = now()
    where id = ${userId}::uuid
      and deleted_at is null
  `);
}

function challengeView(
  challenge: ChallengeRow,
  reused: boolean,
  freshDebugCode?: string,
): SmsVerificationChallenge {
  const metadata = asRecord(challenge.metadata);
  const debugCode = shouldExposeAuthCodes()
    ? freshDebugCode ?? readString(metadata.debugCode)
    : undefined;

  return {
    id: challenge.id,
    expiresAt: new Date(challenge.expires_at).toISOString(),
    maskedDestination: maskDestination(challenge.destination),
    debugCode,
    reused,
  };
}

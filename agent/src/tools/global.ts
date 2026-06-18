import { z } from "zod";
import { createOpenLoop } from "../agent/state-store.ts";
import { lookupScorecardInstitution } from "../data/scorecard-search.ts";
import { defineTool } from "./types.ts";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const communicationStyleSchema = z.object({
  slangLevel: z.enum(["low", "medium", "high"]).optional(),
  roastLevel: z.enum(["none", "light"]).optional(),
  emojiLevel: z.enum(["none", "sparse"]).optional(),
  detailLevel: z.enum(["brief", "balanced", "detailed"]).optional(),
  directness: z.enum(["balanced", "high"]).optional(),
  supportLevel: z.enum(["normal", "gentle"]).optional(),
  notes: z.string().max(240).optional(),
});

export const globalTools = [
  defineTool({
    key: "update_communication_style",
    description:
      "Persist how the student wants Halda to talk. Use only when the student asks to change tone, slang, emoji use, roasting, directness, detail level, or gentleness.",
    inputSchema: communicationStyleSchema,
    async execute(input, context) {
      const profile = await context.store.getProfile(context.userId);
      const updates = compactRecord(input as Record<string, unknown>);
      const communicationStyle = {
        ...profile.communicationStyle,
        ...updates,
        userSteerable: true,
        source: "update_communication_style",
        updatedAt: context.timestamp.toISOString(),
      };

      await context.store.saveProfile({
        ...profile,
        communicationStyle,
      });

      return {
        updated: true,
        communicationStyle,
      };
    },
  }),
  defineTool({
    key: "save_profile_fact",
    description: "Persist a stable fact, interest, preference, or constraint about the student.",
    inputSchema: z.object({
      category: z.enum(["fact", "interest", "preference", "constraint", "tag"]),
      key: z.string().min(1),
      value: z.union([z.string(), z.number(), z.boolean(), jsonRecordSchema]),
      confidence: z.number().min(0).max(1).default(1),
    }),
    async execute(input, context) {
      const profile = await context.store.getProfile(context.userId);
      const nextProfile = { ...profile };

      if (input.category === "interest" && typeof input.value === "string") {
        nextProfile.interests = [...new Set([...profile.interests, input.value])];
      } else if (input.category === "constraint" && typeof input.value === "string") {
        nextProfile.constraints = [...new Set([...profile.constraints, input.value])];
      } else if (input.category === "preference") {
        nextProfile.preferences = { ...profile.preferences, [input.key]: input.value };
      } else if (input.category === "tag" && typeof input.value === "string") {
        nextProfile.tags = [...new Set([...profile.tags, input.value])];
      } else {
        nextProfile.facts = { ...profile.facts, [input.key]: input.value };
      }

      await context.store.saveProfile(nextProfile);

      return {
        saved: true,
        category: input.category,
        key: input.key,
        confidence: input.confidence,
      };
    },
  }),
  defineTool({
    key: "update_user_profile",
    description: "Update the student's materialized profile after a meaningful turn.",
    inputSchema: z.object({
      profileSummary: z.string().optional(),
      facts: jsonRecordSchema.default({}),
      preferences: jsonRecordSchema.default({}),
      milestones: jsonRecordSchema.default({}),
      interests: z.array(z.string()).default([]),
      constraints: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
    }),
    async execute(input, context) {
      const profile = await context.store.getProfile(context.userId);
      const nextProfile = {
        ...profile,
        profileSummary: input.profileSummary ?? profile.profileSummary,
        facts: { ...profile.facts, ...input.facts },
        preferences: { ...profile.preferences, ...input.preferences },
        milestones: { ...profile.milestones, ...input.milestones },
        interests: [...new Set([...profile.interests, ...input.interests])],
        constraints: [...new Set([...profile.constraints, ...input.constraints])],
        tags: [...new Set([...profile.tags, ...input.tags])],
      };

      await context.store.saveProfile(nextProfile);

      return {
        updated: true,
        profileVersion: nextProfile.profileVersion,
        lifecycleStage: nextProfile.lifecycleStage,
      };
    },
  }),
  defineTool({
    key: "create_open_loop",
    description: "Track a pending question, follow-up, or unresolved conversational obligation.",
    inputSchema: z.object({
      loopType: z.string().min(1),
      prompt: z.string().min(1),
      priority: z.number().int().default(0),
      blocking: z.boolean().default(false),
    }),
    async execute(input, context) {
      const loop = createOpenLoop({
        userId: context.userId,
        threadId: context.threadId,
        loopType: input.loopType,
        prompt: input.prompt,
        priority: input.priority,
        blocking: input.blocking,
      });

      await context.store.upsertOpenLoop(loop);

      return {
        created: true,
        loopId: loop.id,
        loopType: loop.loopType,
      };
    },
  }),
  defineTool({
    key: "complete_open_loop",
    description: "Mark a pending conversational obligation as answered or no longer needed.",
    inputSchema: z.object({
      loopType: z.string().min(1),
      result: jsonRecordSchema.default({}),
    }),
    async execute(input, context) {
      const loops = await context.store.listOpenLoops(context.userId);
      const loop = loops.find((candidate) => candidate.loopType === input.loopType);

      if (!loop) {
        return {
          completed: false,
          reason: "open_loop_not_found",
        };
      }

      await context.store.upsertOpenLoop({
        ...loop,
        status: "completed",
        result: input.result,
      });

      return {
        completed: true,
        loopId: loop.id,
        loopType: loop.loopType,
      };
    },
  }),
  defineTool({
    key: "log_agent_event",
    description: "Audit a classification, profile update, tool call, or agent decision.",
    inputSchema: z.object({
      eventType: z.string().min(1),
      input: jsonRecordSchema.default({}),
      output: jsonRecordSchema.default({}),
    }),
    async execute(input, context) {
      await context.store.logEvents([
        {
          userId: context.userId,
          threadId: context.threadId,
          eventType: input.eventType,
          input: input.input,
          output: input.output,
          createdAt: context.timestamp,
        },
      ]);

      return {
        logged: true,
        eventType: input.eventType,
      };
    },
  }),
  defineTool({
    key: "lookup_college",
    description: "Look up real institution facts from imported College Scorecard data.",
    inputSchema: z.object({
      query: z.string().min(1),
      region: z.string().optional(),
    }),
    async execute(input) {
      const result = await lookupScorecardInstitution({
        query: input.query,
        state: input.region,
      });

      if (result) {
        return {
          status: "ok",
          source: "College Scorecard",
          institution: result,
        };
      }

      return {
        status: "not_found",
        source: "College Scorecard",
        query: input.query,
        region: input.region,
      };
    },
  }),
  defineTool({
    key: "send_email_summary",
    description: "Send a student or counselor-friendly summary by email.",
    inputSchema: z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      summary: z.string().min(1),
      includeChecklist: z.boolean().default(true),
    }),
    async execute(input) {
      return {
        status: "not_connected",
        to: input.to,
        subject: input.subject,
        nextStep: "Wire this tool to the email provider before sending external messages.",
      };
    },
  }),
];

function compactRecord(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    }),
  );
}

/**
 * @rpg-node Schemas - All Zod validation schemas for yar MCP tools
 * @rpg-deps zod
 * @rpg-flow Used by tools/ for input validation
 */

import { z } from "zod";

// ─── Tool 1: yar_join ──────────────────────────────────────

export const JoinSchema = z.object({
  channel: z.string()
    .min(1, "Channel name is required")
    .max(100, "Channel name must not exceed 100 characters")
    .describe("Channel name to join. Created automatically if it doesn't exist."),
  nickname: z.string()
    .min(1, "Nickname is required")
    .max(50, "Nickname must not exceed 50 characters")
    .regex(/^[\w가-힣\-]+$/, "Nickname must be alphanumeric, Korean, hyphens, or underscores")
    .describe("Your display name in the channel. Must be unique within the channel."),
}).strict();

export type JoinInput = z.infer<typeof JoinSchema>;

// ─── Tool 2: yar_say ───────────────────────────────────────

export const SaySchema = z.object({
  channel: z.string()
    .min(1, "Channel name is required")
    .max(100)
    .describe("Channel to send message to"),
  text: z.string()
    .min(1, "Message text is required")
    .max(65536, "Message must not exceed 64KB")
    .describe("Message text. Use @nickname to mention someone."),
}).strict();

export type SayInput = z.infer<typeof SaySchema>;

// ─── Tool 3: yar_listen ────────────────────────────────────

export const ListenSchema = z.object({
  channel: z.string()
    .min(1, "Channel name is required")
    .max(100)
    .describe("Channel to listen on"),
  timeout_seconds: z.number()
    .int()
    .min(5, "Minimum timeout is 5 seconds")
    .max(120, "Maximum timeout is 120 seconds")
    .default(30)
    .describe("How long to wait for messages (seconds). Default 30, max 120."),
  after_id: z.string()
    .optional()
    .describe("Only return messages after this message ID (cursor). Omit for all new messages."),
  mentions_only: z.boolean()
    .default(false)
    .describe("If true, only return messages that @mention you."),
}).strict();

export type ListenInput = z.infer<typeof ListenSchema>;

// ─── Tool 4: yar_leave ────────────────────────────────────

export const LeaveSchema = z.object({
  channel: z.string()
    .min(1)
    .max(100)
    .optional()
    .describe("Channel to leave. Omit to list all channels and their members."),
}).strict();

export type LeaveInput = z.infer<typeof LeaveSchema>;

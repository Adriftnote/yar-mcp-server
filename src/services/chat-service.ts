/**
 * @rpg-node ChatService - Channel message posting, fetching with cursor + echo filter, @mention parsing
 * @rpg-deps database.ts, constants.ts, types.ts, error-mapper.ts, channel-service.ts
 * @rpg-flow tools/chat-tools.ts -> ChatService -> database.ts
 */

import { randomUUID } from "node:crypto";
import { getDb } from "./database.js";
import {
  MAX_MESSAGE_SIZE,
  RATE_LIMIT_PER_SECOND,
  CHANNEL_MSG_RETAIN_MS,
  LISTEN_MAX_MESSAGES,
} from "../constants.js";
import { YarError, ErrorCode } from "../errors/error-mapper.js";
import { resolveChannelId, getNickname } from "./channel-service.js";
import { parseMentions } from "../utils/mentions.js";
import type { ChannelMessage } from "../types.js";

/** Row shape from SQLite channel_messages table */
interface ChannelMessageRow {
  message_id: string;
  channel_id: string;
  sender_id: string;
  nickname: string;
  body: string;
  mentions: string;
  created_at: number;
}

function rowToChannelMessage(row: ChannelMessageRow): ChannelMessage {
  return {
    message_id: row.message_id,
    channel_id: row.channel_id,
    sender_id: row.sender_id,
    nickname: row.nickname,
    body: row.body,
    mentions: JSON.parse(row.mentions) as string[],
    created_at: row.created_at,
  };
}

/** In-memory rate limiter: session_id -> timestamps of recent sends */
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(sessionId: string): void {
  const now = Date.now();
  const windowStart = now - 1000;
  const timestamps = rateLimitMap.get(sessionId) ?? [];
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= RATE_LIMIT_PER_SECOND) {
    throw new YarError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded: max ${RATE_LIMIT_PER_SECOND} messages/second. Wait and retry.`
    );
  }

  recent.push(now);
  rateLimitMap.set(sessionId, recent);
}

/** Post a message to a channel */
export function postMessage(params: {
  channel_name: string;
  sender_id: string;
  text: string;
}): ChannelMessage {
  checkRateLimit(params.sender_id);

  // Body size check
  const bodyBytes = Buffer.byteLength(params.text, "utf-8");
  if (bodyBytes > MAX_MESSAGE_SIZE) {
    throw new YarError(
      ErrorCode.VALIDATION_ERROR,
      `Message body is ${bodyBytes} bytes, exceeding the ${MAX_MESSAGE_SIZE} byte limit (64KB)`
    );
  }

  const channelId = resolveChannelId(params.channel_name);

  // Verify sender is in channel
  const nickname = getNickname(channelId, params.sender_id);
  if (!nickname) {
    throw new YarError(
      ErrorCode.NOT_IN_CHANNEL,
      `Not in channel '${params.channel_name}'. Use yar_join first.`
    );
  }

  const db = getDb();
  const mentions = parseMentions(params.text, channelId, db);
  const now = Date.now();
  const messageId = randomUUID();

  db.prepare(`
    INSERT INTO channel_messages (message_id, channel_id, sender_id, nickname, body, mentions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(messageId, channelId, params.sender_id, nickname, params.text, JSON.stringify(mentions), now);

  return {
    message_id: messageId,
    channel_id: channelId,
    sender_id: params.sender_id,
    nickname,
    body: params.text,
    mentions,
    created_at: now,
  };
}

/** Fetch messages from a channel with cursor-based pagination and echo filter */
export function fetchMessages(params: {
  channel_name: string;
  own_session_id: string;
  after_id?: string;
  mentions_only?: boolean;
  own_nickname?: string;
}): { messages: ChannelMessage[]; last_id: string | null } {
  const channelId = resolveChannelId(params.channel_name);
  const db = getDb();

  // Resolve cursor: after_id -> created_at
  // If cursor message was GC'd, fallback to recent messages only (last 60s)
  // to avoid re-fetching the entire 24h window
  let afterCreatedAt = 0;
  if (params.after_id) {
    const cursorRow = db.prepare(
      "SELECT created_at FROM channel_messages WHERE message_id = ?"
    ).get(params.after_id) as { created_at: number } | undefined;
    if (cursorRow) {
      afterCreatedAt = cursorRow.created_at;
    } else {
      // Cursor message was deleted by GC — fallback to recent window
      afterCreatedAt = Date.now() - 60_000;
    }
  }

  // Fetch messages: exclude own, after cursor
  const conditions = [
    "channel_id = ?",
    "sender_id != ?",
    "created_at > ?",
  ];
  const binds: unknown[] = [channelId, params.own_session_id, afterCreatedAt];

  // Filter mentions_only: messages where our nickname appears in mentions JSON array.
  // Safe because nicknames are validated to match [\w가-힣\-]+ (no quotes possible).
  if (params.mentions_only && params.own_nickname) {
    conditions.push("mentions LIKE ?");
    binds.push(`%"${params.own_nickname}"%`);
  }

  const where = conditions.join(" AND ");
  const rows = db.prepare(`
    SELECT * FROM channel_messages
    WHERE ${where}
    ORDER BY created_at ASC
    LIMIT ?
  `).all(...binds, LISTEN_MAX_MESSAGES) as ChannelMessageRow[];

  const messages = rows.map(rowToChannelMessage);
  const lastId = messages.length > 0 ? messages[messages.length - 1].message_id : (params.after_id ?? null);

  return { messages, last_id: lastId };
}

/** Clean up expired channel messages (older than CHANNEL_MSG_RETAIN_MS) */
export function cleanupExpiredChannelMessages(): number {
  const db = getDb();
  const cutoff = Date.now() - CHANNEL_MSG_RETAIN_MS;
  const result = db.prepare(
    "DELETE FROM channel_messages WHERE created_at < ?"
  ).run(cutoff);

  // Prune stale entries from in-memory rate limiter
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap) {
    const recent = timestamps.filter((t) => t > now - 1000);
    if (recent.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recent);
    }
  }

  return result.changes;
}

/**
 * @rpg-node WebMonitor - Express HTTP server for chat monitoring + web chat participation
 * @rpg-deps express, better-sqlite3, constants.ts
 * @rpg-flow Standalone entry point -> reads yar.db readonly -> serves REST API + static HTML
 */

import express from "express";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { DB_PATH } from "../constants.js";
import { parseMentions } from "../utils/mentions.js";
import { exec } from "node:child_process";
import { platform } from "node:os";

const PORT = 3847;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve web/ directory: in dist/ after build, or in project root during dev
function resolveWebDir(): string {
  // When running from dist/web/server.js, web/ is at ../../web/
  const fromDist = join(__dirname, "..", "..", "web");
  if (existsSync(join(fromDist, "index.html"))) return fromDist;
  // Fallback: relative to project root
  const fromRoot = join(__dirname, "..", "web");
  if (existsSync(join(fromRoot, "index.html"))) return fromRoot;
  throw new Error(`Cannot find web/index.html. Searched: ${fromDist}, ${fromRoot}`);
}

// Open DB readonly with WAL
function openDb(): Database.Database {
  if (!existsSync(DB_PATH)) {
    console.error(`[yar-monitor] DB not found at ${DB_PATH}`);
    console.error(`[yar-monitor] Start a yar chat session first to create the database.`);
    process.exit(1);
  }
  // Open read-write to participate in WAL protocol (required to see MCP server's WAL writes)
  // Only SELECT queries are executed — no writes
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 3000");
  return db;
}

const db = openDb();
const app = express();
app.use(express.json());

// --- REST API ---

interface ChannelRow {
  channel_id: string;
  channel_name: string;
  description: string;
  created_at: number;
}

interface MemberRow {
  nickname: string;
  session_id: string;
}

interface MessageRow {
  message_id: string;
  channel_id: string;
  sender_id: string;
  nickname: string;
  body: string;
  mentions: string;
  created_at: number;
}

// GET /api/channels — list channels with member nicknames
app.get("/api/channels", (_req, res) => {
  try {
    const channels = db.prepare(
      "SELECT channel_id, channel_name, description, created_at FROM channels ORDER BY created_at ASC"
    ).all() as ChannelRow[];

    const result = channels.map((ch) => {
      const members = db.prepare(
        "SELECT nickname, session_id FROM channel_subscriptions WHERE channel_id = ? ORDER BY subscribed_at ASC"
      ).all(ch.channel_id) as MemberRow[];

      return {
        channel_id: ch.channel_id,
        channel_name: ch.channel_name,
        description: ch.description,
        members: members.map((m) => m.nickname),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/messages?channel=NAME&after_id=ID — fetch messages (no echo filter for monitor)
app.get("/api/messages", (req, res) => {
  try {
    const channelName = req.query.channel as string;
    if (!channelName) {
      res.status(400).json({ error: "channel parameter required" });
      return;
    }

    const channelRow = db.prepare(
      "SELECT channel_id FROM channels WHERE channel_name = ?"
    ).get(channelName) as { channel_id: string } | undefined;

    if (!channelRow) {
      res.json({ messages: [], last_id: null });
      return;
    }

    const afterId = req.query.after_id as string | undefined;
    let afterCreatedAt = 0;

    if (afterId) {
      const cursorRow = db.prepare(
        "SELECT created_at FROM channel_messages WHERE message_id = ?"
      ).get(afterId) as { created_at: number } | undefined;
      afterCreatedAt = cursorRow ? cursorRow.created_at : Date.now() - 60_000;
    }

    const rows = db.prepare(`
      SELECT * FROM channel_messages
      WHERE channel_id = ? AND created_at > ?
      ORDER BY created_at ASC
      LIMIT 100
    `).all(channelRow.channel_id, afterCreatedAt) as MessageRow[];

    const messages = rows.map((r) => ({
      message_id: r.message_id,
      nickname: r.nickname,
      body: r.body,
      mentions: JSON.parse(r.mentions) as string[],
      created_at: r.created_at,
    }));

    const lastId = messages.length > 0
      ? messages[messages.length - 1].message_id
      : (afterId ?? null);

    res.json({ messages, last_id: lastId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/members?channel=NAME — channel members
app.get("/api/members", (req, res) => {
  try {
    const channelName = req.query.channel as string;
    if (!channelName) {
      res.status(400).json({ error: "channel parameter required" });
      return;
    }

    const channelRow = db.prepare(
      "SELECT channel_id FROM channels WHERE channel_name = ?"
    ).get(channelName) as { channel_id: string } | undefined;

    if (!channelRow) {
      res.json({ members: [] });
      return;
    }

    const members = db.prepare(
      "SELECT nickname FROM channel_subscriptions WHERE channel_id = ? ORDER BY subscribed_at ASC"
    ).all(channelRow.channel_id) as { nickname: string }[];

    res.json({ members: members.map((m) => m.nickname) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// --- Web session management ---
// Track web users: nickname -> session_id
const webSessions = new Map<string, string>();

function getOrCreateWebSession(nickname: string): string {
  let sessionId = webSessions.get(nickname);
  if (sessionId) return sessionId;

  sessionId = `web-${randomUUID()}`;
  webSessions.set(nickname, sessionId);

  // Register session in DB (matches schema: registered_at, last_heartbeat)
  db.prepare(`
    INSERT OR IGNORE INTO sessions (session_id, session_name, status, registered_at, last_heartbeat)
    VALUES (?, ?, 'online', ?, ?)
  `).run(sessionId, `web:${nickname}`, Date.now(), Date.now());

  return sessionId;
}

function ensureWebUserInChannel(channelId: string, sessionId: string, nickname: string): void {
  const existing = db.prepare(
    "SELECT nickname FROM channel_subscriptions WHERE channel_id = ? AND session_id = ?"
  ).get(channelId, sessionId) as { nickname: string } | undefined;

  if (!existing) {
    db.prepare(`
      INSERT INTO channel_subscriptions (channel_id, session_id, nickname, subscribed_at)
      VALUES (?, ?, ?, ?)
    `).run(channelId, sessionId, nickname, Date.now());
  }
}

// POST /api/send — send a message from the web UI
app.post("/api/send", (req, res) => {
  try {
    const { channel, nickname, text } = req.body as {
      channel?: string;
      nickname?: string;
      text?: string;
    };

    if (!channel || !nickname || !text) {
      res.status(400).json({ error: "channel, nickname, and text are required" });
      return;
    }

    // Get or create channel
    let channelRow = db.prepare(
      "SELECT channel_id FROM channels WHERE channel_name = ?"
    ).get(channel) as { channel_id: string } | undefined;

    if (!channelRow) {
      const channelId = randomUUID();
      db.prepare(`
        INSERT INTO channels (channel_id, channel_name, description, created_by, created_at)
        VALUES (?, ?, '', 'web', ?)
      `).run(channelId, channel, Date.now());
      channelRow = { channel_id: channelId };
    }

    const sessionId = getOrCreateWebSession(nickname);
    ensureWebUserInChannel(channelRow.channel_id, sessionId, nickname);

    const mentions = parseMentions(text, channelRow.channel_id, db);
    const messageId = randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT INTO channel_messages (message_id, channel_id, sender_id, nickname, body, mentions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(messageId, channelRow.channel_id, sessionId, nickname, text, JSON.stringify(mentions), now);

    res.json({ message_id: messageId, channel: channel, nickname, mentions });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Serve static files
const webDir = resolveWebDir();
app.use(express.static(webDir));

// Cross-platform browser open
function openBrowser(url: string): void {
  const os = platform();
  const cmd = os === "darwin" ? "open" : os === "win32" ? "start" : "xdg-open";
  exec(`${cmd} ${url}`, (err) => {
    if (err) console.log(`[yar-monitor] Could not auto-open browser. Visit: ${url}`);
  });
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`[yar-monitor] Listening on http://localhost:${PORT}`);
  console.log(`[yar-monitor] DB: ${DB_PATH}`);
  openBrowser(`http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log("[yar-monitor] Shutting down...");
  server.close();
  db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

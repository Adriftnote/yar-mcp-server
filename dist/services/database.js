/**
 * @rpg-node Database - SQLite connection, WAL mode, version-based migrations
 * @rpg-deps better-sqlite3, constants.ts
 * @rpg-flow Entry point for all data access -> provides db instance to services
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { DB_PATH, DB_DIR, DB_BUSY_TIMEOUT } from "../constants.js";
let db = null;
/** Get current schema version from schema_meta table */
function getSchemaVersion(database) {
    try {
        const row = database.prepare("SELECT value FROM schema_meta WHERE key = 'version'").get();
        return row ? parseInt(row.value, 10) : 0;
    }
    catch {
        // Table doesn't exist yet
        return 0;
    }
}
/** Set schema version */
function setSchemaVersion(database, version) {
    database.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)").run(String(version));
}
/** V1: Original schema (sessions, channels, channel_subscriptions, messages, message_deliveries) */
function migrateV1(database) {
    database.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      session_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      capabilities TEXT NOT NULL DEFAULT '[]',
      working_directory TEXT NOT NULL DEFAULT '',
      registered_at INTEGER NOT NULL,
      last_heartbeat INTEGER NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_last_heartbeat ON sessions(last_heartbeat);

    CREATE TABLE IF NOT EXISTS channels (
      channel_id TEXT PRIMARY KEY,
      channel_name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(channel_name);
  `);
}
/** V2: Channel chat model - add nickname to subscriptions, add channel_messages, drop old tables */
function migrateV2(database) {
    // Drop old messaging tables (destructive - ok for dev data)
    database.exec(`
    DROP TABLE IF EXISTS message_deliveries;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS channel_subscriptions;
  `);
    // Recreate channel_subscriptions with nickname column
    database.exec(`
    CREATE TABLE IF NOT EXISTS channel_subscriptions (
      channel_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      subscribed_at INTEGER NOT NULL,
      PRIMARY KEY (channel_id, session_id),
      FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_channel_nick
      ON channel_subscriptions(channel_id, nickname);
  `);
    // Create channel_messages table
    database.exec(`
    CREATE TABLE IF NOT EXISTS channel_messages (
      message_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      body TEXT NOT NULL,
      mentions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chanmsg_channel_created
      ON channel_messages(channel_id, created_at);
  `);
}
/** Run all pending migrations */
function runMigrations(database) {
    const currentVersion = getSchemaVersion(database);
    const migrations = [
        { version: 1, migrate: migrateV1 },
        { version: 2, migrate: migrateV2 },
    ];
    for (const { version, migrate } of migrations) {
        if (currentVersion < version) {
            console.error(`[yar] Running migration v${version}...`);
            database.transaction(() => {
                migrate(database);
                setSchemaVersion(database, version);
            })();
        }
    }
}
/** Initialize and return the database connection */
export function getDb() {
    if (db)
        return db;
    mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    // Enable WAL mode for concurrent read/write
    db.pragma("journal_mode = WAL");
    db.pragma(`busy_timeout = ${DB_BUSY_TIMEOUT}`);
    db.pragma("foreign_keys = ON");
    // Run migrations
    runMigrations(db);
    return db;
}
/** Close the database connection gracefully */
export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
//# sourceMappingURL=database.js.map
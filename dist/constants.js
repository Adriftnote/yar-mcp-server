/**
 * @rpg-node Constants - Global configuration values for yar-mcp-server
 * @rpg-deps none
 * @rpg-flow Referenced by all modules for configuration values
 */
import { homedir } from "node:os";
import { join } from "node:path";
/** Maximum response size in characters before truncation */
export const CHARACTER_LIMIT = 25_000;
/** Heartbeat interval in milliseconds (15 seconds) */
export const HEARTBEAT_INTERVAL_MS = 15_000;
/** Session TTL in milliseconds - sessions expire after 60 seconds without heartbeat */
export const SESSION_TTL_MS = 60_000;
/** Maximum message body size in bytes (64 KB) */
export const MAX_MESSAGE_SIZE = 65_536;
/** Rate limit: max messages per second per session */
export const RATE_LIMIT_PER_SECOND = 10;
/** Default page size for pagination */
export const DEFAULT_PAGE_SIZE = 20;
/** Maximum page size for pagination */
export const MAX_PAGE_SIZE = 50;
/** Retention for channel messages (24 hours in ms) */
export const CHANNEL_MSG_RETAIN_MS = 24 * 60 * 60 * 1000;
/** Garbage collection interval in milliseconds (60 seconds) */
export const GC_INTERVAL_MS = 60_000;
/** SQLite busy timeout in milliseconds */
export const DB_BUSY_TIMEOUT = 5_000;
/** Database directory and path */
export const DB_DIR = join(homedir(), ".claude", "yar");
export const DB_PATH = join(DB_DIR, "yar.db");
/** listen: DB polling interval (1 second) */
export const LISTEN_POLL_INTERVAL_MS = 1_000;
/** listen: default timeout (30 seconds) */
export const LISTEN_DEFAULT_TIMEOUT_S = 30;
/** listen: maximum timeout (120 seconds) */
export const LISTEN_MAX_TIMEOUT_S = 120;
/** listen: max messages to return per listen call */
export const LISTEN_MAX_MESSAGES = 50;
//# sourceMappingURL=constants.js.map
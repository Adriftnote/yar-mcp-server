/**
 * @rpg-node Constants - Global configuration values for yar-mcp-server
 * @rpg-deps none
 * @rpg-flow Referenced by all modules for configuration values
 */
/** Maximum response size in characters before truncation */
export declare const CHARACTER_LIMIT = 25000;
/** Heartbeat interval in milliseconds (15 seconds) */
export declare const HEARTBEAT_INTERVAL_MS = 15000;
/** Session TTL in milliseconds - sessions expire after 60 seconds without heartbeat */
export declare const SESSION_TTL_MS = 60000;
/** Maximum message body size in bytes (64 KB) */
export declare const MAX_MESSAGE_SIZE = 65536;
/** Rate limit: max messages per second per session */
export declare const RATE_LIMIT_PER_SECOND = 10;
/** Default page size for pagination */
export declare const DEFAULT_PAGE_SIZE = 20;
/** Maximum page size for pagination */
export declare const MAX_PAGE_SIZE = 50;
/** Retention for channel messages (24 hours in ms) */
export declare const CHANNEL_MSG_RETAIN_MS: number;
/** Garbage collection interval in milliseconds (60 seconds) */
export declare const GC_INTERVAL_MS = 60000;
/** SQLite busy timeout in milliseconds */
export declare const DB_BUSY_TIMEOUT = 5000;
/** Database directory and path */
export declare const DB_DIR: string;
export declare const DB_PATH: string;
/** listen: DB polling interval (1 second) */
export declare const LISTEN_POLL_INTERVAL_MS = 1000;
/** listen: default timeout (30 seconds) */
export declare const LISTEN_DEFAULT_TIMEOUT_S = 30;
/** listen: maximum timeout (120 seconds) */
export declare const LISTEN_MAX_TIMEOUT_S = 120;
/** listen: max messages to return per listen call */
export declare const LISTEN_MAX_MESSAGES = 50;
//# sourceMappingURL=constants.d.ts.map
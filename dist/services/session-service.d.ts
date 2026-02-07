/**
 * @rpg-node SessionService - Session CRUD, heartbeat, cleanup
 * @rpg-deps database.ts, constants.ts, types.ts, error-mapper.ts
 * @rpg-flow tools/session-tools.ts -> SessionService -> database.ts
 */
import type { Session, SessionStatus } from "../types.js";
/** Register a new session or update an existing one (ON CONFLICT replaces) */
export declare function registerSession(params: {
    session_name: string;
    status: SessionStatus;
    capabilities: string[];
    working_directory: string;
    metadata: Record<string, unknown>;
}): Session;
/** Deregister (remove) a session */
export declare function deregisterSession(sessionId: string): void;
/** Update heartbeat timestamp, optionally update status/metadata */
export declare function heartbeatSession(params: {
    session_id: string;
    status?: SessionStatus;
    metadata?: Record<string, unknown>;
}): Session;
/** Clean up expired sessions and their orphaned channel subscriptions */
export declare function cleanupExpiredSessions(): number;
//# sourceMappingURL=session-service.d.ts.map
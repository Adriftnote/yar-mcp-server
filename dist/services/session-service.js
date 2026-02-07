/**
 * @rpg-node SessionService - Session CRUD, heartbeat, cleanup
 * @rpg-deps database.ts, constants.ts, types.ts, error-mapper.ts
 * @rpg-flow tools/session-tools.ts -> SessionService -> database.ts
 */
import { randomUUID } from "node:crypto";
import { getDb } from "./database.js";
import { SESSION_TTL_MS } from "../constants.js";
import { YarError, ErrorCode } from "../errors/error-mapper.js";
function rowToSession(row) {
    return {
        session_id: row.session_id,
        session_name: row.session_name,
        status: row.status,
        capabilities: JSON.parse(row.capabilities),
        working_directory: row.working_directory,
        registered_at: row.registered_at,
        last_heartbeat: row.last_heartbeat,
        metadata: JSON.parse(row.metadata),
    };
}
/** Register a new session or update an existing one (ON CONFLICT replaces) */
export function registerSession(params) {
    const db = getDb();
    const now = Date.now();
    const sessionId = randomUUID();
    const stmt = db.prepare(`
    INSERT INTO sessions (session_id, session_name, status, capabilities, working_directory, registered_at, last_heartbeat, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(sessionId, params.session_name, params.status, JSON.stringify(params.capabilities), params.working_directory, now, now, JSON.stringify(params.metadata));
    return {
        session_id: sessionId,
        session_name: params.session_name,
        status: params.status,
        capabilities: params.capabilities,
        working_directory: params.working_directory,
        registered_at: now,
        last_heartbeat: now,
        metadata: params.metadata,
    };
}
/** Deregister (remove) a session */
export function deregisterSession(sessionId) {
    const db = getDb();
    const result = db.prepare("DELETE FROM sessions WHERE session_id = ?").run(sessionId);
    if (result.changes === 0) {
        throw new YarError(ErrorCode.SESSION_NOT_FOUND, `Session '${sessionId}' not found`);
    }
    // Also clean up subscriptions
    db.prepare("DELETE FROM channel_subscriptions WHERE session_id = ?").run(sessionId);
}
/** Update heartbeat timestamp, optionally update status/metadata */
export function heartbeatSession(params) {
    const db = getDb();
    const now = Date.now();
    const existing = db.prepare("SELECT * FROM sessions WHERE session_id = ?").get(params.session_id);
    if (!existing) {
        throw new YarError(ErrorCode.SESSION_NOT_FOUND, `Session '${params.session_id}' not found. Re-register with yar_register_session.`);
    }
    const newStatus = params.status ?? existing.status;
    const newMetadata = params.metadata
        ? JSON.stringify({ ...JSON.parse(existing.metadata), ...params.metadata })
        : existing.metadata;
    db.prepare(`
    UPDATE sessions SET last_heartbeat = ?, status = ?, metadata = ? WHERE session_id = ?
  `).run(now, newStatus, newMetadata, params.session_id);
    return rowToSession({
        ...existing,
        last_heartbeat: now,
        status: newStatus,
        metadata: newMetadata,
    });
}
/** Clean up expired sessions and their orphaned channel subscriptions */
export function cleanupExpiredSessions() {
    const db = getDb();
    const cutoff = Date.now() - SESSION_TTL_MS;
    // Get expired session IDs before deleting
    const expiredRows = db.prepare("SELECT session_id FROM sessions WHERE last_heartbeat < ?").all(cutoff);
    if (expiredRows.length === 0)
        return 0;
    const expiredIds = expiredRows.map((r) => r.session_id);
    // Delete subscriptions and sessions in a transaction
    db.transaction(() => {
        const placeholders = expiredIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM channel_subscriptions WHERE session_id IN (${placeholders})`).run(...expiredIds);
        db.prepare("DELETE FROM sessions WHERE last_heartbeat < ?").run(cutoff);
    })();
    return expiredIds.length;
}
//# sourceMappingURL=session-service.js.map
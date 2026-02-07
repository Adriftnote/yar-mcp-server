#!/usr/bin/env node
/**
 * @rpg-node Index - Composition root for yar-mcp-server
 * @rpg-deps McpServer, StdioServerTransport, database, session-service, chat-service, chat-tools
 * @rpg-flow Entry point -> init DB -> register tools -> auto-register session -> start heartbeat + GC -> connect transport
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDb, closeDb } from "./services/database.js";
import { registerChatTools } from "./tools/chat-tools.js";
import { registerSession, deregisterSession, heartbeatSession, cleanupExpiredSessions, } from "./services/session-service.js";
import { cleanupExpiredChannelMessages } from "./services/chat-service.js";
import { HEARTBEAT_INTERVAL_MS, GC_INTERVAL_MS } from "./constants.js";
import { setOwnSessionId } from "./services/session-state.js";
const server = new McpServer({
    name: "yar-mcp-server",
    version: "2.0.0",
});
// Initialize database
getDb();
// Register all tools (4 channel chat tools)
registerChatTools(server);
// Auto-registered session tracking
let ownSessionId = null;
let heartbeatTimer = null;
let gcTimer = null;
/** Graceful shutdown: deregister session, clear timers, close DB */
function shutdown() {
    console.error("[yar] Shutting down...");
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    if (gcTimer) {
        clearInterval(gcTimer);
        gcTimer = null;
    }
    // Deregister own session
    if (ownSessionId) {
        try {
            deregisterSession(ownSessionId);
            console.error("[yar] Session deregistered");
        }
        catch {
            // Best effort - session may already be gone
        }
        ownSessionId = null;
        setOwnSessionId(null);
    }
    closeDb();
    process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
// Main
async function main() {
    // Auto-register session on startup
    const sessionName = process.env.YAR_SESSION_NAME ?? `session-${process.pid}`;
    try {
        const session = registerSession({
            session_name: sessionName,
            status: "active",
            capabilities: [],
            working_directory: process.cwd(),
            metadata: { auto_registered: true },
        });
        ownSessionId = session.session_id;
        setOwnSessionId(ownSessionId);
        console.error(`[yar] Auto-registered as '${sessionName}' (${ownSessionId})`);
    }
    catch (error) {
        console.error("[yar] Auto-registration failed:", error);
    }
    // Start heartbeat interval
    heartbeatTimer = setInterval(() => {
        if (!ownSessionId)
            return;
        try {
            heartbeatSession({ session_id: ownSessionId });
        }
        catch {
            // Session may have been cleaned up externally
            console.error("[yar] Heartbeat failed, session may have expired");
            ownSessionId = null;
        }
    }, HEARTBEAT_INTERVAL_MS);
    // Start GC interval (cleanup expired sessions + channel messages)
    gcTimer = setInterval(() => {
        try {
            const expiredSessions = cleanupExpiredSessions();
            const expiredMessages = cleanupExpiredChannelMessages();
            if (expiredSessions > 0 || expiredMessages > 0) {
                console.error(`[yar] GC: removed ${expiredSessions} expired sessions, ${expiredMessages} expired messages`);
            }
        }
        catch (error) {
            console.error("[yar] GC error:", error);
        }
    }, GC_INTERVAL_MS);
    // Connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[yar] MCP server running via stdio (v2 channel chat)");
}
main().catch((error) => {
    console.error("[yar] Server error:", error);
    closeDb();
    process.exit(1);
});
//# sourceMappingURL=index.js.map
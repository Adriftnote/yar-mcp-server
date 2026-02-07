/**
 * @rpg-node ChatTools - MCP tool registrations for channel chat (join, say, listen, leave)
 * @rpg-deps McpServer, schemas, chat-service, channel-service, session-state, error-mapper
 * @rpg-flow index.ts -> registerChatTools(server) -> binds all 4 tools
 */
import { JoinSchema, SaySchema, ListenSchema, LeaveSchema } from "../schemas/tool-schemas.js";
import { joinOrCreate, leaveChannel, listChannels, resolveChannelId, getNickname } from "../services/channel-service.js";
import { postMessage, fetchMessages } from "../services/chat-service.js";
import { getOwnSessionId } from "../services/session-state.js";
import { mapToToolError } from "../errors/error-mapper.js";
import { YarError, ErrorCode } from "../errors/error-mapper.js";
import { LISTEN_POLL_INTERVAL_MS } from "../constants.js";
/** User-friendly display + hidden metadata for AI */
function chat(display, meta) {
    const content = [{ type: "text", text: display }];
    if (meta) {
        content.push({ type: "text", text: `<!--meta:${JSON.stringify(meta)}-->` });
    }
    return { content };
}
/** JSON-only response (for list channels etc.) */
function ok(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
function requireSession() {
    const sid = getOwnSessionId();
    if (!sid) {
        throw new YarError(ErrorCode.SESSION_NOT_FOUND, "Server session not registered. Restart the MCP server.");
    }
    return sid;
}
/** Register all 4 chat tools on the MCP server */
export function registerChatTools(server) {
    // ─── yar_join ────────────────────────────────────────────
    server.tool("yar_join", "Join a chat channel with a nickname. Creates the channel if it doesn't exist. Returns member list.", JoinSchema.shape, async (params) => {
        try {
            const sessionId = requireSession();
            const result = joinOrCreate({
                channel_name: params.channel,
                session_id: sessionId,
                nickname: params.nickname,
            });
            const memberList = result.members
                .map((m) => `  ${m.status === "active" ? "🟢" : "⚪"} ${m.nickname}`)
                .join("\n");
            return chat(`🚪 #${result.channel.channel_name} 입장! (${params.nickname})\n\n👥 멤버:\n${memberList}`, { session_id: sessionId, channel: result.channel.channel_name });
        }
        catch (error) {
            return mapToToolError(error);
        }
    });
    // ─── yar_say ─────────────────────────────────────────────
    server.tool("yar_say", "Send a message to a channel. Use @nickname to mention someone. Must join the channel first.", SaySchema.shape, async (params) => {
        try {
            const sessionId = requireSession();
            const msg = postMessage({
                channel_name: params.channel,
                sender_id: sessionId,
                text: params.text,
            });
            return chat(`💬 ${msg.nickname}: ${msg.body}`, { message_id: msg.message_id, channel: params.channel, mentions: msg.mentions });
        }
        catch (error) {
            return mapToToolError(error);
        }
    });
    // ─── yar_listen ──────────────────────────────────────────
    server.tool("yar_listen", "Wait for new messages in a channel (long-poll). Excludes your own messages. Use after_id as cursor to avoid duplicates.", ListenSchema.shape, async (params) => {
        try {
            const sessionId = requireSession();
            const channelId = resolveChannelId(params.channel);
            const ownNickname = getNickname(channelId, sessionId);
            if (!ownNickname) {
                throw new YarError(ErrorCode.NOT_IN_CHANNEL, `Not in channel '${params.channel}'. Use yar_join first.`);
            }
            const deadline = Date.now() + params.timeout_seconds * 1000;
            const startTime = Date.now();
            // Poll loop
            while (Date.now() < deadline) {
                const { messages, last_id } = fetchMessages({
                    channel_name: params.channel,
                    own_session_id: sessionId,
                    after_id: params.after_id,
                    mentions_only: params.mentions_only,
                    own_nickname: ownNickname,
                });
                if (messages.length > 0) {
                    const chatLines = messages
                        .map((m) => `💬 ${m.nickname}: ${m.body}`)
                        .join("\n");
                    return chat(chatLines, { channel: params.channel, last_id, timed_out: false });
                }
                // Wait before next poll
                await new Promise((resolve) => setTimeout(resolve, LISTEN_POLL_INTERVAL_MS));
            }
            // Timed out
            return chat(`⏳ ${params.timeout_seconds}초 대기 — 새 메시지 없음`, { channel: params.channel, last_id: params.after_id ?? null, timed_out: true });
        }
        catch (error) {
            return mapToToolError(error);
        }
    });
    // ─── yar_leave ───────────────────────────────────────────
    server.tool("yar_leave", "Leave a channel, or list all channels and their members (omit channel parameter).", LeaveSchema.shape, async (params) => {
        try {
            const sessionId = requireSession();
            if (params.channel) {
                leaveChannel(params.channel, sessionId);
                return chat(`👋 #${params.channel} 채널에서 퇴장`);
            }
            // No channel specified → list all channels
            const channels = listChannels();
            if (channels.length === 0) {
                return chat("📋 활성 채널 없음");
            }
            const lines = channels.map((ch) => {
                const names = ch.members.map((m) => `${m.status === "active" ? "🟢" : "⚪"} ${m.nickname}`).join(", ");
                return `  #${ch.channel} (${ch.members.length}명): ${names}`;
            }).join("\n");
            return chat(`📋 활성 채널:\n${lines}`);
        }
        catch (error) {
            return mapToToolError(error);
        }
    });
}
//# sourceMappingURL=chat-tools.js.map
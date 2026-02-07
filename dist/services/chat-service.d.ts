/**
 * @rpg-node ChatService - Channel message posting, fetching with cursor + echo filter, @mention parsing
 * @rpg-deps database.ts, constants.ts, types.ts, error-mapper.ts, channel-service.ts
 * @rpg-flow tools/chat-tools.ts -> ChatService -> database.ts
 */
import type { ChannelMessage } from "../types.js";
/** Post a message to a channel */
export declare function postMessage(params: {
    channel_name: string;
    sender_id: string;
    text: string;
}): ChannelMessage;
/** Fetch messages from a channel with cursor-based pagination and echo filter */
export declare function fetchMessages(params: {
    channel_name: string;
    own_session_id: string;
    after_id?: string;
    mentions_only?: boolean;
    own_nickname?: string;
}): {
    messages: ChannelMessage[];
    last_id: string | null;
};
/** Clean up expired channel messages (older than CHANNEL_MSG_RETAIN_MS) */
export declare function cleanupExpiredChannelMessages(): number;
//# sourceMappingURL=chat-service.d.ts.map
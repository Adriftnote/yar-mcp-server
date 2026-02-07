/**
 * @rpg-node ChannelService - Channel CRUD, subscriptions with nicknames
 * @rpg-deps database.ts, constants.ts, types.ts, error-mapper.ts
 * @rpg-flow tools/chat-tools.ts -> ChannelService -> database.ts
 */
import type { Channel } from "../types.js";
/** Member info returned from getMembers */
export interface ChannelMember {
    nickname: string;
    session_id: string;
    status: string;
}
/**
 * Join a channel, creating it if it doesn't exist.
 * Returns channel info and member list.
 */
export declare function joinOrCreate(params: {
    channel_name: string;
    session_id: string;
    nickname: string;
}): {
    channel: Channel;
    members: ChannelMember[];
};
/** Leave a channel */
export declare function leaveChannel(channelName: string, sessionId: string): void;
/** Get members of a channel by channel_id */
export declare function getMembers(channelId: string): ChannelMember[];
/** List all channels with member counts */
export declare function listChannels(): Array<{
    channel: string;
    members: ChannelMember[];
}>;
/** Resolve channel_name to channel_id, throwing if not found */
export declare function resolveChannelId(channelName: string): string;
/** Get nickname for a session in a channel */
export declare function getNickname(channelId: string, sessionId: string): string | null;
//# sourceMappingURL=channel-service.d.ts.map
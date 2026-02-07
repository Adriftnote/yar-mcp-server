/**
 * @rpg-node ChannelService - Channel CRUD, subscriptions with nicknames
 * @rpg-deps database.ts, constants.ts, types.ts, error-mapper.ts
 * @rpg-flow tools/chat-tools.ts -> ChannelService -> database.ts
 */
import { randomUUID } from "node:crypto";
import { getDb } from "./database.js";
import { YarError, ErrorCode } from "../errors/error-mapper.js";
function rowToChannel(row) {
    return {
        channel_id: row.channel_id,
        channel_name: row.channel_name,
        description: row.description,
        created_by: row.created_by,
        created_at: row.created_at,
    };
}
/**
 * Join a channel, creating it if it doesn't exist.
 * Returns channel info and member list.
 */
export function joinOrCreate(params) {
    const db = getDb();
    const now = Date.now();
    // Get or create channel
    let channelRow = db.prepare("SELECT * FROM channels WHERE channel_name = ?").get(params.channel_name);
    if (!channelRow) {
        const channelId = randomUUID();
        db.prepare(`
      INSERT INTO channels (channel_id, channel_name, description, created_by, created_at)
      VALUES (?, ?, '', ?, ?)
    `).run(channelId, params.channel_name, params.session_id, now);
        channelRow = {
            channel_id: channelId,
            channel_name: params.channel_name,
            description: "",
            created_by: params.session_id,
            created_at: now,
        };
    }
    // Check if already subscribed (same session)
    const existingSub = db.prepare("SELECT nickname FROM channel_subscriptions WHERE channel_id = ? AND session_id = ?").get(channelRow.channel_id, params.session_id);
    if (existingSub) {
        // Already in channel - update nickname if different
        if (existingSub.nickname !== params.nickname) {
            // Check nickname conflict
            const nickConflict = db.prepare("SELECT session_id FROM channel_subscriptions WHERE channel_id = ? AND nickname = ? AND session_id != ?").get(channelRow.channel_id, params.nickname, params.session_id);
            if (nickConflict) {
                throw new YarError(ErrorCode.NICKNAME_TAKEN, `Nickname '${params.nickname}' is already taken in channel '${params.channel_name}'`);
            }
            db.prepare("UPDATE channel_subscriptions SET nickname = ? WHERE channel_id = ? AND session_id = ?").run(params.nickname, channelRow.channel_id, params.session_id);
        }
    }
    else {
        // Check nickname uniqueness in channel
        const nickConflict = db.prepare("SELECT session_id FROM channel_subscriptions WHERE channel_id = ? AND nickname = ?").get(channelRow.channel_id, params.nickname);
        if (nickConflict) {
            throw new YarError(ErrorCode.NICKNAME_TAKEN, `Nickname '${params.nickname}' is already taken in channel '${params.channel_name}'`);
        }
        db.prepare(`
      INSERT INTO channel_subscriptions (channel_id, session_id, nickname, subscribed_at)
      VALUES (?, ?, ?, ?)
    `).run(channelRow.channel_id, params.session_id, params.nickname, now);
    }
    const members = getMembers(channelRow.channel_id);
    return {
        channel: rowToChannel(channelRow),
        members,
    };
}
/** Leave a channel */
export function leaveChannel(channelName, sessionId) {
    const db = getDb();
    const channel = db.prepare("SELECT channel_id FROM channels WHERE channel_name = ?").get(channelName);
    if (!channel) {
        throw new YarError(ErrorCode.CHANNEL_NOT_FOUND, `Channel '${channelName}' not found`);
    }
    const result = db.prepare("DELETE FROM channel_subscriptions WHERE channel_id = ? AND session_id = ?").run(channel.channel_id, sessionId);
    if (result.changes === 0) {
        throw new YarError(ErrorCode.NOT_IN_CHANNEL, `Not in channel '${channelName}'`);
    }
    // Clean up empty channels
    const remaining = db.prepare("SELECT COUNT(*) as cnt FROM channel_subscriptions WHERE channel_id = ?").get(channel.channel_id);
    if (remaining.cnt === 0) {
        db.prepare("DELETE FROM channels WHERE channel_id = ?").run(channel.channel_id);
    }
}
/** Get members of a channel by channel_id */
export function getMembers(channelId) {
    const db = getDb();
    const rows = db.prepare(`
    SELECT cs.nickname, cs.session_id, COALESCE(s.status, 'offline') as status
    FROM channel_subscriptions cs
    LEFT JOIN sessions s ON s.session_id = cs.session_id
    WHERE cs.channel_id = ?
    ORDER BY cs.subscribed_at ASC
  `).all(channelId);
    return rows;
}
/** List all channels with member counts */
export function listChannels() {
    const db = getDb();
    const channelRows = db.prepare("SELECT * FROM channels ORDER BY created_at DESC").all();
    return channelRows.map((row) => ({
        channel: row.channel_name,
        members: getMembers(row.channel_id),
    }));
}
/** Resolve channel_name to channel_id, throwing if not found */
export function resolveChannelId(channelName) {
    const db = getDb();
    const row = db.prepare("SELECT channel_id FROM channels WHERE channel_name = ?").get(channelName);
    if (!row) {
        throw new YarError(ErrorCode.CHANNEL_NOT_FOUND, `Channel '${channelName}' not found`);
    }
    return row.channel_id;
}
/** Get nickname for a session in a channel */
export function getNickname(channelId, sessionId) {
    const db = getDb();
    const row = db.prepare("SELECT nickname FROM channel_subscriptions WHERE channel_id = ? AND session_id = ?").get(channelId, sessionId);
    return row?.nickname ?? null;
}
//# sourceMappingURL=channel-service.js.map
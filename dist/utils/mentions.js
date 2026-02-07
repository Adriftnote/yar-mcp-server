/**
 * @rpg-node MentionParser - Shared @mention parsing utility
 * @rpg-deps better-sqlite3
 * @rpg-flow chat-service.ts, web/server.ts -> parseMentions()
 */
/**
 * Parse @mentions from message text.
 * Only includes nicknames that actually exist in the channel.
 */
export function parseMentions(body, channelId, db) {
    const mentionPattern = /@([\w가-힣\-]+)/g;
    const rawMentions = new Set();
    let match;
    while ((match = mentionPattern.exec(body)) !== null) {
        rawMentions.add(match[1]);
    }
    if (rawMentions.size === 0)
        return [];
    // Validate against actual channel members
    const rows = db.prepare("SELECT nickname FROM channel_subscriptions WHERE channel_id = ?").all(channelId);
    const memberNicknames = new Set(rows.map((r) => r.nickname));
    return [...rawMentions].filter((n) => memberNicknames.has(n));
}
//# sourceMappingURL=mentions.js.map
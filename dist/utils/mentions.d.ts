/**
 * @rpg-node MentionParser - Shared @mention parsing utility
 * @rpg-deps better-sqlite3
 * @rpg-flow chat-service.ts, web/server.ts -> parseMentions()
 */
import type Database from "better-sqlite3";
/**
 * Parse @mentions from message text.
 * Only includes nicknames that actually exist in the channel.
 */
export declare function parseMentions(body: string, channelId: string, db: Database.Database): string[];
//# sourceMappingURL=mentions.d.ts.map
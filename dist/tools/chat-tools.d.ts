/**
 * @rpg-node ChatTools - MCP tool registrations for channel chat (join, say, listen, leave)
 * @rpg-deps McpServer, schemas, chat-service, channel-service, session-state, error-mapper
 * @rpg-flow index.ts -> registerChatTools(server) -> binds all 4 tools
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/** Register all 4 chat tools on the MCP server */
export declare function registerChatTools(server: McpServer): void;
//# sourceMappingURL=chat-tools.d.ts.map
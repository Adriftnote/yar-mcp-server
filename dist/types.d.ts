/**
 * @rpg-node Types - All TypeScript interfaces for yar-mcp-server
 * @rpg-deps none
 * @rpg-flow Referenced by services, tools, schemas for type definitions
 */
/** Session status values */
export type SessionStatus = "active" | "idle" | "busy";
/** Session record stored in SQLite */
export interface Session {
    session_id: string;
    session_name: string;
    status: SessionStatus;
    capabilities: string[];
    working_directory: string;
    registered_at: number;
    last_heartbeat: number;
    metadata: Record<string, unknown>;
}
/** Channel record stored in SQLite */
export interface Channel {
    channel_id: string;
    channel_name: string;
    description: string;
    created_by: string;
    created_at: number;
}
/** Channel subscription with nickname */
export interface ChannelSubscription {
    channel_id: string;
    session_id: string;
    nickname: string;
    subscribed_at: number;
}
/** Channel message record stored in SQLite */
export interface ChannelMessage {
    message_id: string;
    channel_id: string;
    sender_id: string;
    nickname: string;
    body: string;
    mentions: string[];
    created_at: number;
}
/** Standard MCP tool result content */
export interface ToolContent {
    [key: string]: unknown;
    type: "text";
    text: string;
}
/** Standard MCP tool result - index signature required by MCP SDK */
export interface ToolResult {
    [key: string]: unknown;
    content: ToolContent[];
    isError?: boolean;
}
//# sourceMappingURL=types.d.ts.map
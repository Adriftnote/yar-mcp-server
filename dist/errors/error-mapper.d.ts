/**
 * @rpg-node ErrorMapper - Maps domain errors to MCP tool error responses
 * @rpg-deps types.ts
 * @rpg-flow Called by tools/ when operations fail -> returns isError:true responses
 */
import type { ToolResult } from "../types.js";
/** Domain-specific error codes */
export declare enum ErrorCode {
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    SESSION_EXPIRED = "SESSION_EXPIRED",
    CHANNEL_NOT_FOUND = "CHANNEL_NOT_FOUND",
    CHANNEL_EXISTS = "CHANNEL_EXISTS",
    ALREADY_SUBSCRIBED = "ALREADY_SUBSCRIBED",
    NOT_SUBSCRIBED = "NOT_SUBSCRIBED",
    NICKNAME_TAKEN = "NICKNAME_TAKEN",
    NOT_IN_CHANNEL = "NOT_IN_CHANNEL",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    DATABASE_ERROR = "DATABASE_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR"
}
/** Custom error with error code */
export declare class YarError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
/** Map any error to an MCP isError:true tool result */
export declare function mapToToolError(error: unknown): ToolResult;
//# sourceMappingURL=error-mapper.d.ts.map
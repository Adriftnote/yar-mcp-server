/**
 * @rpg-node ErrorMapper - Maps domain errors to MCP tool error responses
 * @rpg-deps types.ts
 * @rpg-flow Called by tools/ when operations fail -> returns isError:true responses
 */
/** Domain-specific error codes */
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
    ErrorCode["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    ErrorCode["CHANNEL_NOT_FOUND"] = "CHANNEL_NOT_FOUND";
    ErrorCode["CHANNEL_EXISTS"] = "CHANNEL_EXISTS";
    ErrorCode["ALREADY_SUBSCRIBED"] = "ALREADY_SUBSCRIBED";
    ErrorCode["NOT_SUBSCRIBED"] = "NOT_SUBSCRIBED";
    ErrorCode["NICKNAME_TAKEN"] = "NICKNAME_TAKEN";
    ErrorCode["NOT_IN_CHANNEL"] = "NOT_IN_CHANNEL";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
})(ErrorCode || (ErrorCode = {}));
/** Custom error with error code */
export class YarError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "YarError";
    }
}
/** Map any error to an MCP isError:true tool result */
export function mapToToolError(error) {
    if (error instanceof YarError) {
        return {
            content: [{ type: "text", text: `Error [${error.code}]: ${error.message}` }],
            isError: true,
        };
    }
    if (error instanceof Error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
    return {
        content: [{ type: "text", text: `Error: ${String(error)}` }],
        isError: true,
    };
}
//# sourceMappingURL=error-mapper.js.map
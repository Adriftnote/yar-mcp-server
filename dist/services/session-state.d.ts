/**
 * @rpg-node SessionState - Shared state for the auto-registered session
 * @rpg-deps none
 * @rpg-flow index.ts sets ownSessionId -> services/tools read via getOwnSessionId()
 */
export declare function setOwnSessionId(id: string | null): void;
export declare function getOwnSessionId(): string | null;
//# sourceMappingURL=session-state.d.ts.map
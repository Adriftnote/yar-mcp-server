/**
 * @rpg-node SessionState - Shared state for the auto-registered session
 * @rpg-deps none
 * @rpg-flow index.ts sets ownSessionId -> services/tools read via getOwnSessionId()
 */
let ownSessionId = null;
export function setOwnSessionId(id) {
    ownSessionId = id;
}
export function getOwnSessionId() {
    return ownSessionId;
}
//# sourceMappingURL=session-state.js.map
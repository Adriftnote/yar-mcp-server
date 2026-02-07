/**
 * @rpg-node SessionState - Shared state for the auto-registered session
 * @rpg-deps none
 * @rpg-flow index.ts sets ownSessionId -> services/tools read via getOwnSessionId()
 */

let ownSessionId: string | null = null;

export function setOwnSessionId(id: string | null): void {
  ownSessionId = id;
}

export function getOwnSessionId(): string | null {
  return ownSessionId;
}

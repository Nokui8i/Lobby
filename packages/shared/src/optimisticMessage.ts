export const OPTIMISTIC_MESSAGE_ID_PREFIX = "opt-" as const;

export function createOptimisticMessageId(): string {
  return `${OPTIMISTIC_MESSAGE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX);
}

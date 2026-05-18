import { isOptimisticMessageId } from '@lobby/shared';

export function mergeServerMessagesWithPending<T extends { id: string; senderId: string; text: string }>(
  serverRows: T[],
  pendingRows: T[],
): T[] {
  const stillPending = pendingRows.filter((pending) => {
    return !serverRows.some(
      (server) => server.senderId === pending.senderId && server.text === pending.text,
    );
  });
  return [...serverRows, ...stillPending];
}

export function pruneAcknowledgedPending<T extends { id: string; senderId: string; text: string }>(
  pendingRows: T[],
  serverRows: T[],
): T[] {
  return pendingRows.filter((pending) => {
    if (!isOptimisticMessageId(pending.id)) {
      return true;
    }
    return !serverRows.some(
      (server) => server.senderId === pending.senderId && server.text === pending.text,
    );
  });
}

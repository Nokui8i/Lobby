/** מיון רשימת שיחות: עם הודעות שלא נקראו קודם, אחר כך לפי עדכון אחרון */
export function compareByUnreadThenUpdatedMs(
  unreadA: number,
  unreadB: number,
  updatedAtMsA: number,
  updatedAtMsB: number,
): number {
  const aFlag = unreadA > 0 ? 1 : 0;
  const bFlag = unreadB > 0 ? 1 : 0;
  if (aFlag !== bFlag) {
    return bFlag - aFlag;
  }
  return updatedAtMsB - updatedAtMsA;
}

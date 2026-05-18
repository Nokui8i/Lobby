export const CHAT_THREAD_DELETED_BY_UIDS_FIELD = "deletedByUids" as const;

export const DELETE_CHAT_THREAD_CONFIRM = {
  title: "מחיקת שיחה",
  body: "האם אתם בטוחים שברצונכם למחוק את השיחה? היא תוסר מהרשימה שלכם. אם תישלחו או תקבלו הודעה חדשה, היא עלולה להופיע שוב. שיחות שלא נמחקו על ידי שני הצדדים נמחקות אוטומטית מהמערכת אחרי שנה.",
  confirmLabel: "מחקו שיחה",
} as const;

export const DELETE_SUPPORT_INQUIRY_CONFIRM = {
  title: "מחיקת פנייה",
  body: "האם אתם בטוחים שברצונכם למחוק את הפנייה? הפנייה וכל ההודעות יימחקו לצמיתות מהחשבון שלכם ומהמערכת.",
  confirmLabel: "מחקו פנייה",
} as const;

export function isChatThreadHiddenForUser(deletedByUids: unknown, userId: string): boolean {
  return Array.isArray(deletedByUids) && deletedByUids.some((id) => typeof id === "string" && id === userId);
}

export function allChatParticipantsMarkedDeleted(
  participantIds: unknown,
  deletedByUids: unknown,
): boolean {
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return false;
  }
  if (!Array.isArray(deletedByUids)) {
    return false;
  }
  const deleted = deletedByUids.filter((id): id is string => typeof id === "string");
  return participantIds.every((id) => typeof id === "string" && deleted.includes(id));
}

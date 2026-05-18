const MODERATION_UPDATE_FREEZE_NOTICE_HE =
  "המודעה מוקפאת — ימי הפרסום (30) לא נספרים עד אישור וחזרה ללוח, כדי שלא תאבדו ימים ששילמתם עליהם.";

function buildModerationUpdateNotificationBody(adminNote) {
  const note = String(adminNote ?? "").trim();
  if (!note) {
    return MODERATION_UPDATE_FREEZE_NOTICE_HE;
  }
  return `${note}\n\n${MODERATION_UPDATE_FREEZE_NOTICE_HE}`;
}

module.exports = {
  MODERATION_UPDATE_FREEZE_NOTICE_HE,
  buildModerationUpdateNotificationBody,
};

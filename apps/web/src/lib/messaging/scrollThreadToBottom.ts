/** גלילה רק בתוך אזור ההודעות — בלי לזוז את העמוד כולו. */
export function scrollThreadToBottom(
  container: HTMLElement | null,
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
) {
  if (!container) {
    return;
  }
  if (anchor && typeof anchor.scrollIntoView === "function") {
    anchor.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
    return;
  }
  container.scrollTo({ top: container.scrollHeight, behavior });
}

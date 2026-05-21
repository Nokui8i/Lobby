/** Admin — מחלקות Tailwind משותפות (Lovable / bubble) */

export const ap = {
  page: "mx-auto max-w-[900px]",
  pageWide: "mx-auto max-w-[920px]",
  header: "mb-5 flex items-start justify-between gap-4",
  back: "mb-2 inline-block text-sm font-semibold text-primary hover:underline",
  title: "font-display mb-1 text-2xl font-semibold tracking-tight text-foreground",
  sub: "text-muted-foreground text-sm",
  refreshBtn:
    "rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold shadow-bubble transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-55",
  filters: "mb-5 flex flex-wrap gap-2",
  filter:
    "rounded-full border border-border bg-card px-3.5 py-2 text-sm font-bold transition-colors hover:bg-muted/50",
  filterOn:
    "rounded-full border border-primary bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground",
  select: "rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium",
  searchInput: "min-w-[160px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm",
  error: "mb-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive",
  empty: "py-8 text-center text-muted-foreground",
  list: "flex list-none flex-col gap-3 p-0",
  item: "bubble-card rounded-[20px] border-0 p-4",
  itemTop: "mb-3 flex justify-between gap-3",
  itemTitleLink: "text-base font-semibold text-primary hover:underline",
  reason: "mb-1.5 text-sm text-muted-foreground",
  other: "mb-2 text-sm",
  meta: "text-sm text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:hover:underline",
  time: "shrink-0 text-xs text-muted-foreground",
  listingSubtitle: "text-sm text-muted-foreground",
  actionSelect:
    "w-full cursor-pointer rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-55",
  rowActions:
    "mt-3 flex flex-wrap justify-end gap-2 [&_button]:rounded-xl [&_button]:border [&_button]:border-border [&_button]:bg-card [&_button]:px-3.5 [&_button]:py-2 [&_button]:text-sm [&_button]:font-bold [&_button]:transition-colors [&_button]:hover:bg-muted/50 disabled:[&_button]:opacity-55",
  draftField: "flex flex-col gap-1.5",
  draftLabel: "text-sm font-bold",
  draftTextarea: "w-full resize-y rounded-xl border border-border px-3 py-2.5 text-sm",
  pendingSection:
    "mb-6 rounded-[20px] border border-primary/35 bg-accent/40 p-4 shadow-bubble",
  pendingTitle: "mb-3 text-base font-semibold",
  pendingList: "flex list-none flex-col gap-2.5 p-0",
  pendingItem: "flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3",
  pendingLink: "font-bold text-primary hover:underline",
  pendingMeta: "mt-1 text-sm text-muted-foreground",
  pendingActions: "flex shrink-0 gap-2",
  approveBtn:
    "rounded-xl border border-primary/45 bg-card px-3 py-2 text-sm font-bold text-primary hover:bg-muted/50",
  rejectBtn:
    "rounded-xl border border-destructive/35 bg-card px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/5",
  /** מודל אישור — ביטול (Lovable / bubble) */
  modalCancelBtn:
    "min-h-10 min-w-[5.5rem] rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-bubble transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-55",
  /** מודל — אישור רגיל (מותג) */
  modalConfirmBtn:
    "btn-puffy min-h-10 min-w-[5.5rem] rounded-xl border-0 px-4 py-2.5 text-sm font-bold shadow-puffy transition-[background,opacity] hover:!bg-[var(--brand-hover)] disabled:pointer-events-none disabled:opacity-55",
  /** מודל — אישור מחיקה */
  modalDangerConfirmBtn:
    "min-h-10 min-w-[5.5rem] rounded-xl border-0 bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground shadow-bubble transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-55",
  /** כפתורי שורה בכרטיס באנר (גלריה) */
  bannerCardActionBtn:
    "h-9 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-bold text-foreground shadow-bubble transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-55",
  bannerCardDangerBtn:
    "h-9 rounded-xl border border-destructive/35 bg-card px-3.5 py-2 text-sm font-bold text-destructive shadow-bubble transition-colors hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-55",
} as const;

export const up = {
  page: ap.pageWide,
  searchRow: "mb-5 flex flex-wrap gap-2.5",
  searchInput:
    "min-w-0 flex-[1_1_220px] rounded-xl border border-border bg-card px-3.5 py-3 text-base",
  searchBtn:
    "rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-55",
  listingsLink:
    "inline-flex items-center rounded-xl border border-primary/35 bg-secondary/80 px-3.5 py-2 text-[13px] font-bold text-primary no-underline hover:bg-secondary",
  bannedBadge:
    "mb-2 inline-block rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive",
  staffBadge:
    "mb-2 ms-1.5 inline-block rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground",
  meta: "mt-1 text-sm text-muted-foreground",
  dangerBtn: "!border-destructive/25 !text-destructive",
  banReasonInput:
    "mt-2 w-full resize-y rounded-xl border border-border px-3 py-2.5 text-base",
  toast: "mb-3.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-700",
  toastError: "bg-destructive/10 text-destructive",
  resetLinkBox:
    "mt-2.5 rounded-xl bg-muted p-2.5 text-start text-xs [direction:ltr] [word-break:break-all]",
  noAccess: "py-8 text-center text-muted-foreground",
} as const;

export const lp = {
  itemRow: "flex flex-row-reverse items-start gap-3.5",
  thumb: "h-[72px] w-[88px] shrink-0 rounded-xl object-cover",
  thumbPlaceholder: "h-[72px] w-[88px] shrink-0 rounded-xl bg-muted",
  itemBody: "min-w-0 flex-1",
  statusPill:
    "inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground",
  countdown: "font-bold text-[#008ecb]",
  modNote: "mt-2 rounded-xl bg-amber-500/12 px-2.5 py-2 text-xs leading-snug text-amber-900",
  actions: "mt-3 flex flex-wrap justify-end gap-2",
  linkBtn:
    "inline-flex items-center rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] font-bold text-primary no-underline hover:bg-muted/50",
  editForm: "flex max-w-[560px] flex-col gap-3.5",
  field:
    "[&_label]:mb-1.5 [&_label]:block [&_label]:text-[13px] [&_label]:font-bold [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:px-3 [&_select]:py-2.5 [&_textarea]:min-h-[100px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-border [&_textarea]:px-3 [&_textarea]:py-2.5",
  readonlyBlock: "rounded-xl bg-muted px-3.5 py-3 text-sm leading-snug",
  toolbar: "mt-2 flex flex-wrap gap-2",
  primaryBtn:
    "rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-60",
  dangerBtn:
    "rounded-xl border border-destructive/35 bg-card px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/5",
} as const;

export const ic = {
  shell: "flex min-h-0 flex-1 flex-col bg-card",
  listToolbar: "flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3.5 pt-3.5",
  listTitle: "m-0 text-[15px] font-extrabold text-foreground",
  listFilters: "flex flex-wrap gap-2 [&_input]:rounded-lg [&_input]:border [&_input]:border-border [&_input]:bg-muted [&_input]:px-2.5 [&_input]:py-2 [&_input]:text-[13px] [&_select]:rounded-lg [&_select]:border [&_select]:border-border [&_select]:bg-muted [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-[13px]",
  listScroll: "min-h-0 flex-1 overflow-y-auto",
  list: "m-0 list-none p-0",
  threadCard:
    "block border-b border-border px-4 py-3.5 text-inherit no-underline transition-colors hover:bg-muted/40",
  threadCardActive: "border-s-[3px] border-s-brand bg-brand/5",
  threadCardUnread: "bg-accent/50",
  threadTitleRow: "flex min-w-0 items-center gap-2 [&_strong]:min-w-0 [&_strong]:flex-1 [&_strong]:text-sm [&_strong]:font-extrabold",
  threadUnreadDot: "size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px_rgba(0,157,224,0.25)]",
  threadCardRow: "flex justify-between gap-2.5",
  threadMeta: "mt-1 text-xs text-muted-foreground",
  threadPreview: "mt-1.5 line-clamp-2 text-[13px] text-muted-foreground",
  threadTime: "text-[11px] whitespace-nowrap text-muted-foreground",
  unreadBadge:
    "min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] leading-5 font-black text-white",
  placeholder:
    "flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground",
  threadShell: "flex min-h-0 flex-1 flex-col",
  threadToolbar:
    "flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-3",
  toolbarActions: "flex flex-wrap gap-2",
  btn: "cursor-pointer rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimary: "border-primary bg-primary text-primary-foreground",
  assignedBanner:
    "shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-bold text-amber-900",
  messagesScroll: "min-h-0 flex-1 overflow-y-auto p-4",
  messagesInner: "flex flex-col gap-2.5",
  introCard:
    "max-w-[92%] self-start rounded-[14px] border border-primary/35 bg-gradient-to-br from-secondary/80 to-accent/30 p-3.5",
  introCardTitle: "mb-1.5 text-sm font-black text-foreground",
  introCardMeta: "m-0 text-xs leading-snug text-muted-foreground [&_a]:font-extrabold [&_a]:text-primary",
  bubbleWrap: "flex max-w-[85%] flex-col",
  bubbleWrapMine: "self-end items-end",
  bubbleWrapOther: "self-start items-start",
  bubble: "rounded-[14px] px-3.5 py-2.5 text-sm leading-snug whitespace-pre-wrap",
  bubbleMine: "bg-foreground text-background",
  bubbleOther: "border border-border/80 bg-card",
  bubbleTime: "mt-1 text-[11px] text-muted-foreground",
  composerSticky: "shrink-0 border-t border-border px-4 py-3 pb-4",
  composer: "flex items-end gap-2.5 [&_textarea]:max-h-[120px] [&_textarea]:min-h-11 [&_textarea]:flex-1 [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-border [&_textarea]:px-3 [&_textarea]:py-2.5",
  sendError: "mb-2 text-[13px] font-bold text-destructive",
  muted: "p-4 text-sm text-muted-foreground",
} as const;

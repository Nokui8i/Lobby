"use client";

import {
  isProtectedOwnerUser,
  STAFF_ROLE_LABELS,
  staffCanAccessNav,
  staffCanPerformAction,
  type AdminUserRecord,
  type AssignableStaffRole,
} from "@lobby/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AdminConfirmModal } from "@/components/AdminConfirmModal";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  banAdminUser,
  deleteAdminUser,
  revokeAdminStaffRole,
  searchAdminUsers,
  sendAdminPasswordReset,
  setAdminStaffRole,
  unbanAdminUser,
} from "@/lib/firebase/functions";
import reportStyles from "../reports/reports.module.css";
import styles from "./users.module.css";

type PendingAction =
  | { type: "ban"; user: AdminUserRecord }
  | { type: "unban"; user: AdminUserRecord }
  | { type: "reset"; user: AdminUserRecord }
  | { type: "delete"; user: AdminUserRecord }
  | { type: "set_staff"; user: AdminUserRecord; role: AssignableStaffRole }
  | { type: "revoke_staff"; user: AdminUserRecord };

function formatUserDate(iso: string): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return "—";
  }
}

function AdminUsersPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q")?.trim() ?? "";
  const { user: me, staffRole } = useAdminAuth();
  const canAccess = staffRole ? staffCanAccessNav(staffRole, "users") : false;
  const canBan = staffRole ? staffCanPerformAction(staffRole, "users.ban") : false;
  const canReset = staffRole ? staffCanPerformAction(staffRole, "users.password_reset") : false;
  const canDelete = staffRole ? staffCanPerformAction(staffRole, "users.delete") : false;
  const canManageStaff = staffRole ? staffCanPerformAction(staffRole, "users.manage_staff") : false;

  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [banReason, setBanReason] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);

  const load = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setError(false);
    try {
      const list = await searchAdminUsers(searchQuery ?? "");
      const visible =
        staffRole === "owner" ? list : list.filter((u) => !isProtectedOwnerUser(u));
      setUsers(visible);
    } catch {
      setUsers([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [staffRole]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    void load(initialQuery || undefined);
  }, [canAccess, load, initialQuery]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim() ?? "";
    setQuery(q);
    if (canAccess && q) {
      void load(q);
    }
  }, [searchParams, canAccess, load]);

  function patchUser(updated: AdminUserRecord) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function removeUser(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function runPendingAction() {
    if (!pending) {
      return;
    }
    setBusyId(pending.user.id);
    setToast(null);
    setResetLink(null);
    try {
      if (pending.type === "ban") {
        const updated = await banAdminUser(pending.user.id, banReason.trim() || undefined);
        patchUser(updated);
        setToast({ kind: "ok", text: "המשתמש נחסם." });
      } else if (pending.type === "unban") {
        const updated = await unbanAdminUser(pending.user.id);
        patchUser(updated);
        setToast({ kind: "ok", text: "החסימה הוסרה." });
      } else if (pending.type === "reset") {
        const result = await sendAdminPasswordReset(pending.user.id);
        if (result.resetLink) {
          setResetLink(result.resetLink);
        }
        setToast({ kind: "ok", text: result.message });
      } else if (pending.type === "delete") {
        await deleteAdminUser(pending.user.id);
        removeUser(pending.user.id);
        setToast({ kind: "ok", text: "המשתמש נמחק מהמערכת." });
      } else if (pending.type === "set_staff") {
        const updated = await setAdminStaffRole(pending.user.id, pending.role);
        patchUser(updated);
        setToast({
          kind: "ok",
          text: `${updated.displayName} הוגדר כ־${STAFF_ROLE_LABELS[pending.role]}. יש להתחבר מחדש לאדמין.`,
        });
      } else if (pending.type === "revoke_staff") {
        const updated = await revokeAdminStaffRole(pending.user.id);
        patchUser(updated);
        setToast({ kind: "ok", text: "הוסר מהצוות." });
      }
      setPending(null);
      setBanReason("");
    } catch {
      setToast({ kind: "err", text: "הפעולה נכשלה. נסו שוב או בדקו הרשאות." });
    } finally {
      setBusyId(null);
    }
  }

  if (!canAccess) {
    return (
      <div className={styles.page}>
        <p className={styles.noAccess}>אין הרשאה לעמוד לקוחות.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={reportStyles.header}>
        <div>
          <Link href="/" className={reportStyles.back}>
            ← לוח בקרה
          </Link>
          <h1>לקוחות</h1>
          <p className={reportStyles.sub}>
            תמיכה: חיפוש, באן, איפוס סיסמה
            {canManageStaff ? " · בעלים: הוספה לצוות" : ""}
            {canDelete ? " · מחיקה" : ""}
          </p>
        </div>
        <button
          type="button"
          className={reportStyles.refreshBtn}
          disabled={loading}
          onClick={() => void load(query)}
        >
          רענון
        </button>
      </header>

      <form
        className={styles.searchRow}
        onSubmit={(e) => {
          e.preventDefault();
          void load(query);
        }}
      >
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="אימייל, שם, או מזהה משתמש…"
          aria-label="חיפוש משתמשים"
        />
        <button type="submit" className={styles.searchBtn} disabled={loading}>
          חיפוש
        </button>
      </form>

      {toast ? (
        <p className={toast.kind === "ok" ? styles.toast : `${styles.toast} ${styles.toastError}`} role="status">
          {toast.text}
        </p>
      ) : null}

      {resetLink ? (
        <div className={styles.resetLinkBox} role="region" aria-label="קישור איפוס סיסמה">
          {resetLink}
        </div>
      ) : null}

      {error ? <p className={reportStyles.error}>שגיאה בטעינה.</p> : null}
      {loading ? <p className={reportStyles.empty}>טוען משתמשים…</p> : null}
      {!loading && users.length === 0 ? <p className={reportStyles.empty}>לא נמצאו משתמשים.</p> : null}

      <ul className={reportStyles.list}>
        {users.map((user) => {
          const isSelf = me?.uid === user.id;
          const isOwnerAccount = isProtectedOwnerUser(user);
          const isHiddenFromStaff = isOwnerAccount && staffRole !== "owner";
          if (isHiddenFromStaff) {
            return null;
          }
          return (
          <li key={user.id} className={reportStyles.item}>
            <div className={reportStyles.itemTop}>
              <div>
                {user.banned ? <span className={styles.bannedBadge}>חסום</span> : null}
                {user.isStaff ? (
                  <span className={styles.staffBadge}>
                    {user.staffRole ? STAFF_ROLE_LABELS[user.staffRole] : "צוות"}
                  </span>
                ) : null}
                <h2>{user.displayName}</h2>
                <p className={reportStyles.listingTitle}>{user.email ?? "ללא אימייל"}</p>
                <p className={styles.meta}>
                  מזהה: {user.id}
                  {user.providers.length > 0 ? ` · התחברות: ${user.providers.join(", ")}` : ""}
                </p>
                {user.banReason ? <p className={styles.meta}>סיבת חסימה: {user.banReason}</p> : null}
              </div>
              <time className={reportStyles.time}>עודכן {formatUserDate(user.updatedAt)}</time>
            </div>
            <div className={reportStyles.actions}>
              {isSelf ? (
                <p className={styles.meta}>זה החשבון שלך — לא ניתן לבצע פעולות על עצמך מהממשק.</p>
              ) : isOwnerAccount ? (
                <p className={styles.meta}>חשבון בעלים — לא ניתן לבצע פעולות.</p>
              ) : user.isStaff ? (
                <>
                  <p className={styles.meta}>
                    משתמש צוות — אין חסימה או מחיקה מכאן.
                    {canManageStaff && user.staffRole !== "owner" ? (
                      <>
                        {" "}
                        <Link href="/staff">ניהול בצוות →</Link>
                      </>
                    ) : null}
                  </p>
                  {canManageStaff && user.staffRole && user.staffRole !== "owner" ? (
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={busyId === user.id}
                      onClick={() => setPending({ type: "revoke_staff", user })}
                    >
                      הסר מהצוות
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  {canReset ? (
                    <button
                      type="button"
                      disabled={busyId === user.id}
                      onClick={() => {
                        setResetLink(null);
                        setPending({ type: "reset", user });
                      }}
                    >
                      איפוס סיסמה
                    </button>
                  ) : null}
                  {canBan ? (
                    user.banned ? (
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => setPending({ type: "unban", user })}
                      >
                        שחרור מחסימה
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        disabled={busyId === user.id}
                        onClick={() => {
                          setBanReason("");
                          setPending({ type: "ban", user });
                        }}
                      >
                        חסימה
                      </button>
                    )
                  ) : null}
                  {canManageStaff ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => setPending({ type: "set_staff", user, role: "moderator" })}
                      >
                        הפוך לעובד
                      </button>
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => setPending({ type: "set_staff", user, role: "admin" })}
                      >
                        הפוך למנהל
                      </button>
                    </>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={busyId === user.id}
                      onClick={() => setPending({ type: "delete", user })}
                    >
                      מחיקת לקוח
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </li>
          );
        })}
      </ul>

      <AdminConfirmModal
        open={pending?.type === "ban"}
        title="לחסום את המשתמש?"
        description={
          <>
            <p>
              {pending?.user.displayName} ({pending?.user.email ?? pending?.user.id}) לא יוכל להתחבר או לפרסם.
            </p>
            <label>
              סיבה (אופציונלי)
              <textarea
                className={styles.banReasonInput}
                rows={3}
                maxLength={200}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </label>
          </>
        }
        confirmLabel="חסום"
        danger
        busy={busyId !== null}
        onCancel={() => {
          setPending(null);
          setBanReason("");
        }}
        onConfirm={() => void runPendingAction()}
      />

      <AdminConfirmModal
        open={pending?.type === "unban"}
        title="לשחרר את המשתמש מחסימה?"
        description={
          <p>
            {pending?.user.displayName} יוכל שוב להתחבר ולהשתמש בפלטפורמה.
          </p>
        }
        confirmLabel="שחרור"
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPendingAction()}
      />

      <AdminConfirmModal
        open={pending?.type === "reset"}
        title="לשלוח איפוס סיסמה?"
        description={
          <p>
            יישלח מייל לאיפוס ל־{pending?.user.email ?? "—"} (רק למשתמשים עם סיסמה, לא Google בלבד).
          </p>
        }
        confirmLabel="שליחה"
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPendingAction()}
      />

      <AdminConfirmModal
        open={pending?.type === "set_staff"}
        title="להוסיף לצוות המערכת?"
        description={
          <p>
            {pending?.user.displayName} יוכל להיכנס לאפליקציית הניהול בתפקיד{" "}
            {pending?.type === "set_staff" ? STAFF_ROLE_LABELS[pending.role] : ""}. יידרש להתחבר מחדש.
          </p>
        }
        confirmLabel="הוסף"
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPendingAction()}
      />

      <AdminConfirmModal
        open={pending?.type === "revoke_staff"}
        title="להסיר מהצוות?"
        description={<p>{pending?.user.displayName} יאבד גישה לאדמין.</p>}
        confirmLabel="הסר"
        danger
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPendingAction()}
      />

      <AdminConfirmModal
        open={pending?.type === "delete"}
        title="למחוק את הלקוח לצמיתות?"
        description={
          <p>
            פעולה בלתי הפיכה: מחיקת חשבון Auth, פרופיל Firestore והסתרת מודעות. רק לבעלים.
          </p>
        }
        confirmLabel="מחק"
        danger
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPendingAction()}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <p className={styles.noAccess}>טוען…</p>
        </div>
      }
    >
      <AdminUsersPageInner />
    </Suspense>
  );
}

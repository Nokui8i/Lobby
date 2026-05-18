"use client";

import {
  STAFF_ROLE_LABELS,
  staffCanAccessNav,
  type AdminUserRecord,
  type AssignableStaffRole,
} from "@lobby/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminConfirmModal } from "@/components/AdminConfirmModal";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  fetchAdminStaff,
  revokeAdminStaffRole,
  setAdminStaffRole,
} from "@/lib/firebase/functions";
import reportStyles from "../reports/reports.module.css";
import userStyles from "../users/users.module.css";

type PendingStaffAction =
  | { type: "set_role"; user: AdminUserRecord; role: AssignableStaffRole }
  | { type: "revoke"; user: AdminUserRecord };

export default function AdminStaffPage() {
  const { user: me, staffRole } = useAdminAuth();
  const canAccess = staffRole ? staffCanAccessNav(staffRole, "staff") : false;

  const [staff, setStaff] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<PendingStaffAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await fetchAdminStaff();
      setStaff(list);
    } catch {
      setStaff([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    void load();
  }, [canAccess, load]);

  function patchMember(updated: AdminUserRecord) {
    if (!updated.isStaff) {
      setStaff((prev) => prev.filter((u) => u.id !== updated.id));
      return;
    }
    setStaff((prev) => {
      const exists = prev.some((u) => u.id === updated.id);
      if (exists) {
        return prev.map((u) => (u.id === updated.id ? updated : u));
      }
      return [updated, ...prev];
    });
  }

  async function runPending() {
    if (!pending) {
      return;
    }
    setBusyId(pending.user.id);
    setToast(null);
    try {
      if (pending.type === "set_role") {
        const updated = await setAdminStaffRole(pending.user.id, pending.role);
        patchMember(updated);
        setToast({ kind: "ok", text: `התפקיד עודכן ל־${STAFF_ROLE_LABELS[pending.role]}.` });
      } else {
        const updated = await revokeAdminStaffRole(pending.user.id);
        patchMember(updated);
        setToast({ kind: "ok", text: "הוסר מהצוות." });
      }
      setPending(null);
    } catch {
      setToast({ kind: "err", text: "הפעולה נכשלה." });
    } finally {
      setBusyId(null);
    }
  }

  if (!canAccess) {
    return (
      <div className={userStyles.page}>
        <p className={userStyles.noAccess}>רק בעלים יכול לנהל את צוות המערכת.</p>
      </div>
    );
  }

  return (
    <div className={userStyles.page}>
      <header className={reportStyles.header}>
        <div>
          <Link href="/" className={reportStyles.back}>
            ← לוח בקרה
          </Link>
          <h1>צוות המערכת</h1>
          <p className={reportStyles.sub}>
            הקצאת עובד או מנהל — חפשו לקוח בעמוד «לקוחות» והוסיפו לצוות, או נהלו כאן.
          </p>
        </div>
        <button type="button" className={reportStyles.refreshBtn} disabled={loading} onClick={() => void load()}>
          רענון
        </button>
      </header>

      <p className={userStyles.meta}>
        <Link href="/users">← חיפוש לקוח להוספה לצוות</Link>
      </p>

      {toast ? (
        <p
          className={toast.kind === "ok" ? userStyles.toast : `${userStyles.toast} ${userStyles.toastError}`}
          role="status"
        >
          {toast.text}
        </p>
      ) : null}

      {error ? <p className={reportStyles.error}>שגיאה בטעינה.</p> : null}
      {loading ? <p className={reportStyles.empty}>טוען…</p> : null}
      {!loading && staff.length === 0 ? <p className={reportStyles.empty}>אין עדיין צוות מוגדר.</p> : null}

      <ul className={reportStyles.list}>
        {staff.map((member) => {
          const role = member.staffRole ?? "moderator";
          const isOwner = role === "owner";
          const isSelf = me?.uid === member.id;
          const isProtected = isOwner || isSelf;
          return (
            <li key={member.id} className={reportStyles.item}>
              <div className={reportStyles.itemTop}>
                <div>
                  <span className={userStyles.staffBadge}>{STAFF_ROLE_LABELS[role]}</span>
                  <h2>{member.displayName}</h2>
                  <p className={reportStyles.listingTitle}>{member.email ?? member.id}</p>
                </div>
              </div>
              {!isProtected ? (
                <div className={reportStyles.actions}>
                  {role !== "moderator" ? (
                    <button
                      type="button"
                      disabled={busyId === member.id}
                      onClick={() => setPending({ type: "set_role", user: member, role: "moderator" })}
                    >
                      הורד לעובד
                    </button>
                  ) : null}
                  {role !== "admin" ? (
                    <button
                      type="button"
                      disabled={busyId === member.id}
                      onClick={() => setPending({ type: "set_role", user: member, role: "admin" })}
                    >
                      העלה למנהל
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={userStyles.dangerBtn}
                    disabled={busyId === member.id}
                    onClick={() => setPending({ type: "revoke", user: member })}
                  >
                    הסר מהצוות
                  </button>
                </div>
              ) : (
                <p className={userStyles.meta}>
                  {isSelf
                    ? "זה החשבון שלך — לא ניתן לשנות את התפקיד שלך מהממשק."
                    : "תפקיד בעלים — לא ניתן לשנות בממשק."}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <AdminConfirmModal
        open={pending?.type === "set_role"}
        title="לעדכן תפקיד?"
        description={
          <p>
            {pending?.user.displayName} יקבל תפקיד{" "}
            {pending?.type === "set_role" ? STAFF_ROLE_LABELS[pending.role] : ""} במערכת הניהול.
            יידרש להתנתק ולהתחבר מחדש כדי שההרשאות ייכנסו לתוקף.
          </p>
        }
        confirmLabel="עדכון"
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPending()}
      />

      <AdminConfirmModal
        open={pending?.type === "revoke"}
        title="להסיר מהצוות?"
        description={
          <p>
            {pending?.user.displayName} יאבד גישה לאפליקציית הניהול ויישאר לקוח רגיל בלבד.
          </p>
        }
        confirmLabel="הסר"
        danger
        busy={busyId !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => void runPending()}
      />
    </div>
  );
}

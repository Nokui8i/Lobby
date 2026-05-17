"use client";

import { STAFF_ROLE_LABELS, type StaffRole } from "@lobby/shared";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { resolveStaffRoleForAdminUser } from "@/lib/staffAuth";

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

type AdminAuthContextValue = {
  user: User | null;
  staffRole: StaffRole | null;
  staffRoleLabel: string;
  isStaff: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);


export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const logout = useCallback(async () => {
    try {
      await signOut(getFirebaseAuth());
    } finally {
      setUser(null);
      setStaffRole(null);
    }
  }, []);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    const bump = () => setLastActivity(Date.now());
    events.forEach((e) => document.addEventListener(e, bump, true));
    return () => events.forEach((e) => document.removeEventListener(e, bump, true));
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    const id = window.setInterval(() => {
      if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
        void logout();
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user, lastActivity, logout]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      void (async () => {
        if (!nextUser) {
          setUser(null);
          setStaffRole(null);
          setIsLoading(false);
          return;
        }
        try {
          const role = await resolveStaffRoleForAdminUser(nextUser);
          if (!role) {
            await signOut(auth);
            setUser(null);
            setStaffRole(null);
          } else {
            setUser(nextUser);
            setStaffRole(role);
            setLastActivity(Date.now());
          }
        } catch {
          await signOut(auth);
          setUser(null);
          setStaffRole(null);
        } finally {
          setIsLoading(false);
        }
      })();
    });
    return () => unsub();
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      staffRole,
      staffRoleLabel: staffRole ? STAFF_ROLE_LABELS[staffRole] : "",
      isStaff: staffRole != null,
      isLoading,
      logout,
    }),
    [user, staffRole, isLoading, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}

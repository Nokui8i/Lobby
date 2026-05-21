"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { resolveStaffRoleForAdminUser } from "@/lib/staffAuth";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isStaff, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isStaff) router.replace("/");
  }, [isLoading, isStaff, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!isFirebaseConfigured()) {
      setError("חסר חיבור Firebase. הגדירו .env.local");
      setSubmitting(false);
      return;
    }

    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const role = await resolveStaffRoleForAdminUser(cred.user);
      if (!role) {
        await auth.signOut();
        setError("אין הרשאות צוות למשתמש הזה.");
        return;
      }
      router.replace("/");
    } catch {
      setError("אימייל או סיסמה שגויים.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || isStaff) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center">
        <Skeleton className="size-12 rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg text-xl font-bold">
              L
            </span>
            <p className="font-display text-primary text-2xl font-semibold tracking-tight">LOBBY</p>
            <CardDescription>כניסת צוות</CardDescription>
          </div>
          <CardTitle className="font-display text-xl">התחברות לניהול</CardTitle>
          <CardDescription>רק משתמשים עם הרשאת צוות יכולים להיכנס.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">אימייל</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">סיסמה</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
            </div>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "מתחבר…" : "כניסה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

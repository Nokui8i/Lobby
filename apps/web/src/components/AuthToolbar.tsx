"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { useChatInboxOptional } from "@/contexts/ChatInboxContext";
import { useLobbyNotificationsOptional } from "@/contexts/LobbyNotificationsContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

function unreadLabel(n: number) {
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

export function AuthToolbar() {
  const { user, loading, openAuthModal, signOutUser } = useLobbyAuth();
  const inbox = useChatInboxOptional();
  const notifications = useLobbyNotificationsOptional();
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!isFirebaseConfigured()) {
    return <span className="text-muted-foreground text-xs">אין חיבור לשרת</span>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2" role="status" aria-busy="true" aria-label="טוען תפריט">
        <Skeleton className="h-9 w-20" />
      </div>
    );
  }

  if (!user) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={openAuthModal}>
        כניסה
      </Button>
    );
  }

  const msgCount = inbox?.totalUnread ?? 0;
  const notifCount = notifications?.unreadCount ?? 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            החשבון שלי
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/account">אזור אישי</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/notifications" className="flex w-full items-center justify-between">
              התראות
              {notifCount > 0 ? <Badge variant="secondary">{unreadLabel(notifCount)}</Badge> : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/chat" className="flex w-full items-center justify-between">
              הודעות
              {msgCount > 0 ? <Badge variant="secondary">{unreadLabel(msgCount)}</Badge> : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setLogoutOpen(true)}>יציאה</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>להתנתק מלובי?</DialogTitle>
            <DialogDescription>לא תוכלו לשלוח הודעות או לפרסם עד שתתחברו שוב.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setLogoutOpen(false)}>
              ביטול
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setLogoutOpen(false);
                void signOutUser();
              }}
            >
              להתנתק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

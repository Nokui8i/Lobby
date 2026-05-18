"use client";

import type { ReactNode } from "react";
import { LobbyAuthProvider, useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { ChatInboxProvider } from "@/contexts/ChatInboxContext";
import { LobbyNotificationsProvider } from "@/contexts/LobbyNotificationsContext";
import { SavedListingsProvider } from "@/contexts/SavedListingsContext";
import { AuthModal } from "@/components/AuthModal";

function AuthModalHost() {
  const { authModalOpen, closeAuthModal } = useLobbyAuth();
  return <AuthModal open={authModalOpen} onClose={closeAuthModal} />;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LobbyAuthProvider>
      <SavedListingsProvider>
        <ChatInboxProvider>
          <LobbyNotificationsProvider>
            {children}
            <AuthModalHost />
          </LobbyNotificationsProvider>
        </ChatInboxProvider>
      </SavedListingsProvider>
    </LobbyAuthProvider>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthToolbar } from "@/components/AuthToolbar";
import { useLobbyAuth } from "@/contexts/LobbyAuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/isConfigured";
import styles from "../page.module.css";

type HomeHeaderVariant = "home" | "flat";

export function HomeHeader({ variant = "home" }: { variant?: HomeHeaderVariant }) {
  const router = useRouter();
  const { user, loading, openAuthModal } = useLobbyAuth();

  function handlePublishClick() {
    if (loading || !isFirebaseConfigured()) {
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }
    router.push("/publish");
  }

  return (
    <header className={variant === "flat" ? styles.headerFlat : styles.header}>
      <button
        type="button"
        className={`${styles.headerTextButton} ${styles.headerPublishButton}`}
        onClick={handlePublishClick}
      >
        פרסום
      </button>
      <Link className={styles.logo} href="/">
        LOBBY
      </Link>
      <AuthToolbar variant="home" />
    </header>
  );
}

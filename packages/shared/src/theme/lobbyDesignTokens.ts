import { lovableTheme } from "./lovableTheme";

/** מקור יחיד לצבעים — Lovable / Lobby (web, admin, mobile). */
export const lobbyDesign = {
  colors: {
    background: lovableTheme.colors.background,
    foreground: lovableTheme.colors.graphite,
    muted: lovableTheme.colors.muted,
    mutedDark: lovableTheme.colors.mutedDark,
    card: lovableTheme.colors.white,
    border: lovableTheme.colors.border,
    action: lovableTheme.colors.brand,
    actionHover: lovableTheme.colors.brandHover,
    actionSoft: lovableTheme.colors.brandSoft,
    brand: lovableTheme.colors.brand,
    brandStrong: lovableTheme.colors.brandHover,
    brandSoft: lovableTheme.colors.brandSoft,
    primary: lovableTheme.colors.brand,
    primaryStrong: lovableTheme.colors.brandHover,
    primarySoft: lovableTheme.colors.brandSoft,
    accentCta: lovableTheme.colors.brand,
    destructive: lovableTheme.colors.destructive,
    surfaceSoft: lovableTheme.colors.surfaceSoft,
    graphite: lovableTheme.colors.graphite,
  },
  layout: {
    containerMaxPx: 1280,
    gutterPx: 24,
    headerHeightPx: 80,
    radiusPx: lovableTheme.radius.card,
    cardShadow: lovableTheme.shadow.bubble,
  },
} as const;

export type LobbyDesign = typeof lobbyDesign;

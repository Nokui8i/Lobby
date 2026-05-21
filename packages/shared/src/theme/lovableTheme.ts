/**
 * מערכת עיצוב Lobby — מיושרת ל-Lovable (lobby-home).
 * מקור עיון: docs/reference/lobby-home-lovable
 *
 * מותג: Cerulean Blue (Wolt Blue) — #009DE0, hover מאט #008ECB, rgb(0, 157, 224).
 */
export const lovableTheme = {
  colors: {
    background: "#ffffff",
    white: "#ffffff",
    graphite: "#202125",
    muted: "#64748b",
    mutedDark: "#475569",
    border: "#f1f5f9",
    brand: "#009de0",
    brandHover: "#008ecb",
    brandSoft: "#e8f5fd",
    surfaceSoft: "#f8f9fa",
    destructive: "#f53939",
  },
  fonts: {
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    display: "var(--font-heebo-next), ui-sans-serif, system-ui, sans-serif",
  },
  radius: {
    card: 16,
    button: 16,
  },
  shadow: {
    bubble: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)",
    puffy: "0 1px 2px rgba(0, 157, 224, 0.18)",
    float: "0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.04)",
  },
} as const;

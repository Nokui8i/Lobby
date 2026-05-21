import { lobbyDesign, lovableTheme } from '@lobby/shared';

/** צבעים וצל — מיושר ל־apps/web globals.css + Lovable */
export const L = {
  ...lobbyDesign.colors,
  unread: '#FF4D6D',
  shadowBubble: lovableTheme.shadow.bubble,
  shadowPuffy: lovableTheme.shadow.puffy,
  radiusCard: lovableTheme.radius.card,
} as const;

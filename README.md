# Lobby / לובי

פלטפורמת השכרת דירות בישראל — ללא דמי תיווך לשוכרים. הכנסה מפרסום, חידוש וקידום מודעות בלבד.

**זה לא MVP.** המטרה היא מוצר **מוכן להשקה עסקית** (אתר + אפליקציה), לא דמו או פרוטוטיפ.

## מסמכי מוצר (חובה לקרוא לפני עבודה)

| מסמך | תוכן |
|------|------|
| [`docs/RENTAL_PLATFORM_WORKPLAN.md`](docs/RENTAL_PLATFORM_WORKPLAN.md) | תוכנית מלאה, מסכים, מחזור חיים, **רשימת חובה להשקה** |
| [`.cursor/rules/rental-platform-product.mdc`](.cursor/rules/rental-platform-product.mdc) | כללי מוצר לסוכן / מפתח |

## מונורפו

- `apps/web` — Next.js
- `apps/mobile` — Expo / React Native
- `packages/shared` — טיפוסים ולוגיקה משותפת
- `firebase/` — Firestore, Storage, Functions

## פקודות שימושיות

הרצה **מתיקיית השורש** של המונורפו (`הבית שלי`):

| אפליקציה | פקודה | כתובת |
|----------|--------|--------|
| **אתר (web)** | `npm run web:dev` או `npm run dev:web` | http://localhost:3000 |
| **אדמין** | `npm run admin:dev` או `npm run dev:admin` | http://localhost:3001 |
| **מובייל (Expo)** | `npm run mobile:start` או `npm run dev:mobile` | QR / אמולטור |

```bash
# אתר
npm run web:dev

# ממשק ניהול (פורט 3001)
npm run admin:dev

# אפליקציה (Expo)
npm run mobile:start

npm run firebase:deploy
```

עיצוב: מקור משותף ב־`packages/shared` (`lobbyDesign`) + Mainline/shadcn ב־`apps/web`. אדמין ומובייל משתמשים באותם צבעים ופריסה (1220px / gutter) בהדרגה.

## סטטוס עיקרי (עדכון ידני)

**קיים:** פיד, עמוד דירה, פרסום/עריכה, צ׳אט, אזור אישי, דיווחים, התראות, מחזור חיים, עמודי משפט.

**חובה לפני השקה:** תשתית כתובות (חיפוש כמו Yad2), סינון מלא, תשלום (פרסום/חידוש/קידום), אדמין.

פרטים מלאים — ב־`docs/RENTAL_PLATFORM_WORKPLAN.md` תחת **מוכנות להשקה**.

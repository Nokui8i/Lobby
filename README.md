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

```bash
npm run web:dev
npm run mobile:start
npm run firebase:deploy
```

## סטטוס עיקרי (עדכון ידני)

**קיים:** פיד, עמוד דירה, פרסום/עריכה, צ׳אט, אזור אישי, דיווחים, התראות, מחזור חיים, עמודי משפט.

**חובה לפני השקה:** תשתית כתובות (חיפוש כמו Yad2), סינון מלא, תשלום (פרסום/חידוש/קידום), אדמין.

פרטים מלאים — ב־`docs/RENTAL_PLATFORM_WORKPLAN.md` תחת **מוכנות להשקה**.

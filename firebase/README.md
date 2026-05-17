# Firebase Setup

## פרויקט Lobby (Production dev)

| שדה | ערך |
| --- | --- |
| **Project ID** | `lobby-rental-platform` |
| **Console** | https://console.firebase.google.com/project/lobby-rental-platform/overview |
| **Firestore** | מסד `(default)` באזור **eur3** (אירופה multi-region) |
| **אפליקציות** | Web: `Lobby Web` · Android package: `com.lobby.rental` |

מה כבר הוגדר מה־CLI:

- Firestore + פריסת `firestore.rules`
- APIs: Firestore, Identity Toolkit (Auth), Firebase Storage API
- אפליקציית Web ואנדרואיד רשומות בפרויקט

מה נשאר לעשות **ב־Console / חיוב**:

1. **Firebase Storage — Get started**  
   בלי זה לא ניתן לפרוס `storage.rules`. אם מופיעה דרישה לחיוב, יש לקשר Billing לפרויקט ב־Google Cloud ואז להפעיל Storage מה־Firebase Console.  
   https://console.firebase.google.com/project/lobby-rental-platform/storage  

2. **Authentication**  
   ב־Firebase Console → Authentication → Sign-in method: להפעיל לפחות **Email/Password** (ולהוסיף בהמשך Google וכו׳ לפי צורך).

3. **Android — `google-services.json` (Lobby mobile / Expo)**  
   - **Option A (CLI, after `firebase login` on this machine):** from repo root run  
     `npm run firebase:sync-google-services`  
     This overwrites `apps/mobile/google-services.json` from Firebase (same as Console download).  
   - **Option B (Console):** Project settings → **Lobby Android** → Download `google-services.json` → save as `apps/mobile/google-services.json`.  
   - Add **SHA-1** (debug + release) in Console when using **Google Sign-In** on Android.  
   - The file is gitignored; `app.config.js` sets `android.googleServicesFile` only when the file exists.  
   - After adding the file, run `npx expo prebuild --platform android` (or **EAS Build**) so the native project picks it up. **Expo Go** does not ship your `google-services.json`; use a **development build** for native Google Sign-In.  
   - Web SDK JSON for env vars: `npm run firebase:print-web-config` (then map fields to `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` in `.env.local`).

4. **אבטחת מפתח Web (מומלץ)**  
   ב־Google Cloud Console → APIs & Services → Credentials: להגביל את מפתח ה־API לדומיינים של האתר (ול־localhost לפיתוח).

קבצי ניהול מקומיים:

- `firebase.json` + `.firebaserc` — פרויקט ברירת מחדל ל־`firebase deploy`

---

This folder will hold Lobby Firebase configuration:

- `firestore.rules` for Firestore security.
- `storage.rules` for listing and chat media.
- `functions/` for lifecycle cleanup, payments, reports, and notifications.

Planned Cloud Functions:

- Expire active listings after 30 days.
- Delete expired listings after the 14-day renewal window.
- Delete rented listings after publisher confirmation.
- Delete chats older than one year.
- Create paid listing publications after successful payment.

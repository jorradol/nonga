# Nong A v5.0 Step 2F Firebase Client Auth Config

Step 2F prepares the frontend for real Firebase Auth without removing local mock/demo flows yet.

## Current Config Status

`firebase-applet-config.json` is still a placeholder config:

- `apiKey` contains `FakePlaceholder`
- `authDomain` is present: `nonga-marketplace.firebaseapp.com`
- `projectId` is present: `nonga-marketplace`
- `storageBucket` is present: `nonga-marketplace.appspot.com`
- `messagingSenderId` is present but placeholder-like
- `appId` is present but placeholder-like
- `measurementId` is not set

This means local development remains in mock/demo mode until real Firebase web config is supplied through `VITE_FIREBASE_*` env values.

## Auth Modes

The client auth mode is resolved in `src/lib/firebase/firebaseConfigGuard.ts`.

- `dev-mock`: local development with fake Firebase config. Mock/demo session is allowed.
- `beta-token`: transitional beta mode when explicit beta token env is configured without full Firebase client auth.
- `firebase-auth`: real Firebase web config is present and usable.
- `invalid-production-config`: production build/runtime has fake or missing Firebase client config.

`src/lib/firebase/index.ts` exports:

- `firebaseClientAuthMode`
- `firebaseClientConfigReport`
- `isFirebaseAuthReady`
- `isMockConfig`
- `isMockAuthStorageEnabled`
- `isSandboxAuthToolsEnabled`
- `firebaseAuthUnavailableMessage`

## Production Safety

When production has fake Firebase config:

- mock auth storage is not enabled
- simulated sessions are not persisted
- sandbox dealer role switcher is not enabled
- Thor Auto Demo tools are not enabled from `isDealerDemoToolsEnabled()`
- console reports `invalid-production-config`

User-facing message:

> ระบบเข้าสู่ระบบยังไม่ได้เปิดใช้งานในสภาพแวดล้อมนี้ครับ

UI should not show technical words such as token, API, Unauthorized, or raw Firebase config errors.

## Firebase Auth Header Helper

`src/services/auth/firebaseAuthHeaders.ts` provides:

- `getCurrentUserIdToken()`
- `getFirebaseAuthHeaders()`
- `requireFirebaseAuthHeaders()`

The helper only returns `Authorization: Bearer <idToken>` when Firebase client auth is ready and a real Firebase user is signed in. It does not mint or send fake tokens.

Step 2F does not migrate every fetch to Firebase ID tokens yet. Existing dealer/beta/dev token compatibility remains in place.

## Required Client Config For Production

Set real Firebase web app config:

```json
{
  "apiKey": "...",
  "authDomain": "...firebaseapp.com",
  "projectId": "...",
  "storageBucket": "...appspot.com",
  "messagingSenderId": "...",
  "appId": "...",
  "measurementId": "..."
}
```

Enable required Firebase Auth providers in Firebase Console, such as Email/Password and Google.

## Required Backend Env

Backend verification from Step 2B still requires one credential path:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- or `GOOGLE_APPLICATION_CREDENTIALS`

## Still Not Full Production

Remaining items for Step 2H:

- make frontend dealer/admin API helpers prefer Firebase ID tokens when real auth is ready
- remove production exposure to default DEV dealer/admin tokens
- decide whether public/member sell form remains enabled
- disable or remove sandbox role switching from production UI entirely
- add stricter Firestore rules for `users`, `dealerMembers`, listings, images, and later chat history
- keep chat history migration separate

## Step 2G update

Production auth hardening is documented in `docs/production-auth-mode-hardening-v5.md`.

Client-side dealer/admin token helpers no longer fall back to hardcoded dev tokens in production, and the sandbox role switcher / Thor Auto Demo tools remain guarded behind dev/mock mode.

## Step 2H update

Real Firebase Web Auth config can now be supplied by env and overrides `firebase-applet-config.json`.

See `docs/firebase-web-auth-login-flow-v5.md` for the limited login test plan, Firestore profile documents, dealer membership test data, and public signup guard.

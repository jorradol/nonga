# Nong A v5.0 Step 2G Production Auth Hardening

Step 2G tightens production auth mode without removing local dev or beta compatibility.

## Environment Modes

Central client config/mode helpers live in `src/lib/firebase/firebaseConfigGuard.ts`.

- `isLocalDev`: Vite dev runtime.
- `isProduction`: Vite production runtime.
- `isBetaMode`: explicit beta token mode.
- `isFirebaseAuthMode`: real Firebase web config is usable.
- `isInvalidProductionConfig`: production has fake or missing Firebase web config.

Current fake Firebase config still resolves to `dev-mock` locally and `invalid-production-config` in production.

## Mock, Sandbox, And Demo Inventory

- Sandbox role switcher: `src/components/UserProfileView.tsx`.
- Thor Auto Demo tools: `src/utils/dealerDemoSession.ts`.
- Simulated users: `nonga_simulated_users` in localStorage, guarded by Step 2F mock storage flags.
- Mock session: `nonga_auth_session` in localStorage, guarded by Step 2F mock storage flags.
- Client dealer/admin beta headers: `src/utils/apiAuthHeaders.ts`.
- Backend dealer/admin stub token compatibility: `src/server/apiAuth.ts` and legacy owner route guards.
- Dev Firebase token maps: `NONGA_DEV_FIREBASE_TOKEN_MAP`, `NONGA_DEV_USER_PROFILE_MAP`, `NONGA_DEV_DEALER_MEMBERSHIP_MAP`, disabled when `NODE_ENV=production`.

## Production Rules

Production must not expose or use:

- sandbox role switcher
- Thor Auto Demo role upgrade
- simulated dealer login
- hardcoded default dealer token
- hardcoded default admin token
- dev Firebase token maps
- raw `guest-user-100` upgrade path to dealer

If production has fake Firebase config, auth stays blocked with:

> ระบบเข้าสู่ระบบยังไม่ได้เปิดใช้งานในสภาพแวดล้อมนี้ครับ

## Token Hardening

`src/utils/apiAuthHeaders.ts` no longer falls back to:

- `nonga-v4-dev-dealer-token`
- `nonga-v4-dev-admin-token`

when `import.meta.env.PROD` is true. Explicit env values are still accepted for beta/staging compatibility.

`src/server/apiAuth.ts` no longer returns hardcoded dev tokens from `getStubTokensForDev()` when `NODE_ENV=production`.

## Beta Mode

Beta mode remains available only with explicit env:

- `NONGA_BETA_DEALER_ID`
- `NONGA_DEALER_API_TOKEN`
- `NONGA_DEALER_TOKEN_MAP`
- client-side `VITE_NONGA_DEALER_API_TOKEN` or `VITE_NONGA_ADMIN_API_TOKEN` where transitional browser helpers still need them

Beta token binding still verifies requested dealer scope server-side. It must not silently fall back to Thor Auto Demo.

## Local Dev

Local dev remains unchanged for smoke tests:

- Thor Auto Demo tools are enabled.
- Sandbox role switcher is visible.
- default dev dealer/admin tokens are still available outside production.
- mock sessions and simulated users continue to work.

## Tests

New test:

```bash
npm run test:v50-production-auth-mode
```

It checks production fake config blocking, sandbox hiding, token default blocking, explicit beta env behavior, and local dev Thor Auto Demo availability.

## Step 2H Recommendations

- Use real `VITE_FIREBASE_*` config from deployment env and keep `firebase-applet-config.json` as local placeholder fallback only.
- Migrate dealer/admin frontend fetch helpers to prefer `getFirebaseAuthHeaders()` when real Firebase Auth is ready.
- Remove client exposure of dealer/admin beta tokens for production.
- Add deployment-time env validation for Firebase Admin credentials.
- Add production Firestore rules for `users`, `dealerMembers`, listings, images, and later chat history.
- Move chat history persistence from localStorage to a server/database path after auth is fully real.

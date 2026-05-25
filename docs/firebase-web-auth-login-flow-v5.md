# Nong A v5.0 Step 2H Firebase Web Auth Login Flow

Step 2H prepares the app to use real Firebase Web Auth config through environment variables while keeping local mock and limited beta flows intact.

## Where To Get Firebase Web Config

Open Firebase Console:

1. Go to Project settings.
2. Open the General tab.
3. Under Your apps, select or create the Web app.
4. Copy the Firebase SDK config values.

Set these values in the deployment environment:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` if Analytics is enabled
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`, normally `(default)`

`firebase-applet-config.json` remains a placeholder fallback for local mock mode. Real staging/production config should come from env and must not be hardcoded into the repo.

## Client Config Resolution

`src/lib/firebase/firebaseConfigGuard.ts` now has:

- `resolveFirebaseClientConfig()`
- `detectFirebaseClientConfig()`
- `firebaseAuthEnvironment()`

`src/lib/firebase/index.ts` initializes Firebase with the resolved config, so `VITE_FIREBASE_*` values override `firebase-applet-config.json`.

When env config is real, client mode becomes `firebase-auth`.

## Login And Token Flow

When Firebase config is real:

- `AuthContext` listens to `onAuthStateChanged`.
- `authService.loginWithEmail()` uses Firebase Email/Password login.
- `authService.loginWithGoogle()` uses Firebase Google popup login.
- `authService.logout()` signs out of Firebase.
- `getCurrentUserIdToken()` reads the current Firebase user ID token.
- `getFirebaseAuthHeaders()` sends `Authorization: Bearer <idToken>` only when a real signed-in Firebase user exists.

Current test environment still uses fake config, so `getFirebaseAuthHeaders()` correctly returns no fake token.

## Backend Verification

Backend verification remains in `src/server/serverAuthContext.ts`.

For real staging/production, configure one Firebase Admin credential path:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- or `GOOGLE_APPLICATION_CREDENTIALS`

Local smoke tests use `NONGA_DEV_FIREBASE_TOKEN_MAP`, `NONGA_DEV_USER_PROFILE_MAP`, and `NONGA_DEV_DEALER_MEMBERSHIP_MAP`. Production ignores these dev maps.

## User Profile Test Data

Firestore `users/{uid}` should include:

```json
{
  "uid": "firebase-auth-uid",
  "email": "member@example.com",
  "displayName": "Test Member",
  "role": "member",
  "status": "active"
}
```

Dealer user profile:

```json
{
  "uid": "firebase-dealer-uid",
  "email": "dealer@example.com",
  "displayName": "Test Dealer",
  "role": "dealer",
  "status": "active",
  "dealerId": "thor-auto",
  "dealerName": "Thor Auto Demo"
}
```

Admin profiles should use `role: "admin"` or `role: "superadmin"` with `status: "active"`. Superadmin should be limited to the owner/team account.

## Dealer Membership Test Data

Firestore `dealerMembers` rows should include:

```json
{
  "uid": "firebase-dealer-uid",
  "dealerId": "thor-auto",
  "roleInDealer": "owner",
  "status": "active",
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

This lets the backend resolve `uid -> dealer membership -> dealerId` and reject mismatched `X-Dealer-Id`.

## Public Signup

Public signup is not open by default for real Firebase mode.

- Local mock dev can still register simulated users.
- Real Firebase signup requires `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=true`.
- If public signup is disabled, the UI shows: `ระบบสมัครสมาชิกสาธารณะยังไม่ได้เปิดใช้งานในสภาพแวดล้อมนี้ครับ`
- Dealer role must be granted by admin/superadmin by creating/updating `users/{uid}` and `dealerMembers`.

## Limited Real Login Test Plan

1. Configure `VITE_FIREBASE_*` and Firebase Admin env.
2. Enable Email/Password or Google provider in Firebase Console.
3. Create one member test account and one dealer test account.
4. Create `users/{uid}` documents with `status: "active"`.
5. Create one active `dealerMembers` row for the dealer.
6. Login as member: profile should work, Dealer Portal should be denied.
7. Login as dealer: Dealer Portal and Chat to Draft should work for only that dealer.
8. Try mismatched dealer scope: backend should reject it.

Step 2H does not migrate all frontend fetches to Firebase ID tokens. Existing beta/dev compatibility remains documented for the next step.

## Step 2I update

Real user/dealer schemas and resolver rules are documented in `docs/user-dealer-membership-resolution-v5.md`.

The backend now derives dealer access from active `dealerMembers` rows and blocks suspended users server-side.

## Step 2J update

Limited real Firebase role test user setup is documented in `docs/firebase-role-test-users-v5.md`.

Use `npm run seed:v50-firebase-role-test-users -- --dry-run --json` to generate Firestore seed documents from env without storing passwords in the repo.

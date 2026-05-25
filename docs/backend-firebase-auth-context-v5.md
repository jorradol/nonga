# Nong A v5.0 Step 2B Backend Firebase Auth Context

Step 2B adds the first backend layer for real Firebase authentication. It does not migrate chat history and does not remove DEV/mock or beta token compatibility yet.

## Current Firebase Config

Client Firebase still reads `firebase-applet-config.json`.

Current status:

- `apiKey` contains `FakePlaceholder`, so the frontend stays in mock mode through `isMockConfig`.
- `AuthContext` and `authService` already support real Firebase Auth when a real client config is provided.
- In real mode, user profiles are read/written at `users/{uid}`.
- Mock sessions still persist in `localStorage` key `nonga_auth_session`.
- Simulated users still persist in `nonga_simulated_users`.

Client production env/config still needed:

- real Firebase web app config for `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
- enabled Firebase Auth providers such as Email/Password or Google
- Firestore rules for `users`, `dealerMembers`, dealer data, and chat history

## Backend Firebase Admin Env

Backend token verification lives in `src/server/serverAuthContext.ts`.

Production should configure one of these credential paths:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: full service account JSON string
- or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- or `GOOGLE_APPLICATION_CREDENTIALS` with optional `FIREBASE_PROJECT_ID`

Aliases supported:

- `NONGA_FIREBASE_PROJECT_ID`
- `GOOGLE_CLOUD_PROJECT`
- `GCLOUD_PROJECT`

Without these credentials, the backend will not verify real Firebase ID tokens. DEV/mock tests can use `NONGA_DEV_FIREBASE_TOKEN_MAP`, but production ignores it.

## Server Auth Context

`getServerAuthContext(req)` reads `Authorization: Bearer <firebase-id-token>`, verifies it, then resolves:

```ts
{
  uid: string;
  email: string;
  displayName: string;
  role: AuthRole;
  status: UserStatus;
  dealerId?: string;
  dealerName?: string;
  memberships: DealerMembership[];
  provider: "firebase";
  verificationMode: "firebase-admin" | "dev-mock";
}
```

Invalid or missing Firebase credentials/tokens return a `ServerAuthError` with status `401`.

## User Role Resolver

`resolveUserAuthProfile(identity)` resolves `uid -> user profile`.

Resolution order:

- DEV only: `NONGA_DEV_USER_PROFILE_MAP`
- Production-ready path: Firestore `users/{uid}`
- Fallback: signed-in Firebase users become `member` with `pending` status until a real profile exists

Production should explicitly store `role`, `status`, and optional dealer fields in `users/{uid}`. Thor Auto Demo is not hardcoded into the production resolver.

## Dealer Membership Resolver

`resolveDealerMemberships(uid)` prepares `uid -> dealer memberships`.

Resolution order:

- DEV only: `NONGA_DEV_DEALER_MEMBERSHIP_MAP`
- Production-ready path: Firestore collection `dealerMembers`, queried by `uid`

Recommended document shape:

```ts
{
  uid: string;
  dealerId: string;
  roleInDealer: "owner" | "staff";
  status: "active" | "pending" | "disabled";
  createdAt: string;
  updatedAt: string;
}
```

`authorizeDealerScope(context, requestedDealerId)` allows active dealer memberships and rejects mismatched dealer IDs.

## Compatibility

`src/server/apiAuth.ts` now supports three backend auth paths:

- Firebase token path: preferred production direction
- beta token binding path: existing `NONGA_DEALER_TOKEN_MAP` or `NONGA_BETA_DEALER_ID`
- DEV stub path: existing `nonga-v4-dev-dealer-token` / `nonga-v4-dev-admin-token`

This keeps existing smoke tests and Thor Auto Demo flows working while adding the real auth context layer.

## Step 2C Remaining Work

- Send real Firebase ID tokens from the frontend instead of dealer/admin stub tokens.
- Continue tightening dealer/admin API guards with Firebase-first auth in production.
- Deprecate legacy owner routes that trust `X-Owner-Id`.
- Harden Firestore rules for `users`, `dealerMembers`, dealer inventory, images, and chat history.
- Move chat sessions/messages to database storage when ready.
- Disable sandbox role switching outside DEV/mock.

## Step 2C update

Step 2C applies server auth context to dealer API scope checks and documents endpoint coverage in `docs/dealer-api-server-auth-v5.md`.

Dealer APIs now reject mismatched Firebase dealer membership scope and mismatched beta token dealer scope before route handlers run.

## Step 2F update

Frontend Firebase config is now checked by `src/lib/firebase/firebaseConfigGuard.ts`.

`src/services/auth/firebaseAuthHeaders.ts` prepares the client-side helper for sending real Firebase ID tokens once real Firebase web config is provided.

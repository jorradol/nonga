# Nong A v5.0 Step 2N Staging Environment Setup

This document prepares an internal staging environment for Nong A v5.0. It does not open public Online Beta, does not deploy production rules, and must not contain real secrets.

## 1. Staging Env Checklist

Frontend env:

```bash
VITE_FIREBASE_API_KEY="<from Firebase Console>"
VITE_FIREBASE_AUTH_DOMAIN="<project-id>.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="<project-id>"
VITE_FIREBASE_STORAGE_BUCKET="<project-id>.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="<sender-id>"
VITE_FIREBASE_APP_ID="<web-app-id>"
VITE_FIREBASE_MEASUREMENT_ID="<optional-measurement-id>"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
VITE_NONGA_PUBLIC_SIGNUP_ENABLED="false"
```

Backend env, choose exactly one credential path:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="<staging service account JSON from secret manager>"
```

or:

```bash
FIREBASE_PROJECT_ID="<project-id>"
FIREBASE_CLIENT_EMAIL="<service-account-email>"
FIREBASE_PRIVATE_KEY="<private-key-with-escaped-newlines>"
```

AI/app env:

```bash
GEMINI_API_KEY="<staging Gemini key>"
APP_URL="https://<staging-domain>"
NODE_ENV="production"
```

Optional limited beta-token env, only if staging still needs the compatibility path:

```bash
NONGA_BETA_DEALER_ID="<dealer-id>"
NONGA_DEALER_TOKEN_MAP='{"thor-auto":"<strong-random-token>"}'
NONGA_DEALER_API_TOKEN="<strong-random-token-if-single-dealer-beta>"
NONGA_ADMIN_API_TOKEN="<strong-random-admin-token-if-needed>"
VITE_NONGA_DEALER_API_TOKEN="<only-if-staging-client-must-use-beta-token>"
VITE_NONGA_ADMIN_API_TOKEN="<only-if-staging-client-must-use-beta-token>"
```

Do not use in staging:

- `nonga-v4-dev-dealer-token`
- `nonga-v4-dev-admin-token`
- `NONGA_DEV_FIREBASE_TOKEN_MAP`
- `NONGA_DEV_USER_PROFILE_MAP`
- `NONGA_DEV_DEALER_MEMBERSHIP_MAP`

Rules:

- Never commit real Firebase private keys or service account JSON.
- Never put real secrets into `.env.example`.
- Keep `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false` unless there is an explicit user onboarding decision.
- Keep `firebase-applet-config.json` as local placeholder fallback only; staging must use env values.

## 2. Firebase Auth Test Users

Create at least three staging test users in Firebase Console > Authentication:

- Member test user.
- Dealer test user.
- Admin or superadmin test user.

Process:

1. Create each user in Firebase Auth.
2. Copy each UID from Firebase Console.
3. Set seed env locally or in a secure admin shell:

```bash
NONGA_TEST_MEMBER_UID="<member-uid>"
NONGA_TEST_MEMBER_EMAIL="member.staging@example.test"
NONGA_TEST_MEMBER_DISPLAY_NAME="Nong A Staging Member"

NONGA_TEST_DEALER_UID="<dealer-uid>"
NONGA_TEST_DEALER_EMAIL="dealer.staging@example.test"
NONGA_TEST_DEALER_DISPLAY_NAME="Nong A Staging Dealer"
NONGA_TEST_DEALER_ID="thor-auto"
NONGA_TEST_DEALER_NAME="Thor Auto Staging"

NONGA_TEST_ADMIN_UID="<admin-uid>"
NONGA_TEST_ADMIN_EMAIL="admin.staging@example.test"
NONGA_TEST_ADMIN_DISPLAY_NAME="Nong A Staging Admin"
NONGA_TEST_ADMIN_ROLE="admin"
```

4. Dry-run first:

```bash
npm run seed:v50-firebase-role-test-users -- --dry-run --json
```

5. Review the generated `users/{uid}` and `dealerMembers/{uid_dealerId}` documents.
6. Write to staging Firestore only after review:

```bash
npm run seed:v50-firebase-role-test-users -- --write
```

Expected documents:

- `users/{memberUid}` with `role: "member"`, `status: "active"`.
- `users/{dealerUid}` with `role: "dealer"`, `status: "active"`, `dealerId`.
- `dealerMembers/{dealerUid_dealerId}` with `roleInDealer: "owner"`, `status: "active"`.
- `users/{adminUid}` with `role: "admin"` or `"superadmin"`, `status: "active"`.

## 3. Firestore And Storage Rules Staging

Current rules are drafts:

- `firestore.rules.draft`
- `storage.rules.draft`

Do not deploy them directly to production. For staging:

1. Copy draft files into staging-only rule filenames or Firebase config paths:

```bash
copy firestore.rules.draft firestore.rules
copy storage.rules.draft storage.rules
```

2. Run static repo validation:

```bash
npm run test:v50-security-rules
```

3. Run Firebase Emulator Suite rules tests before deploy. If automated emulator tests are not written yet, run the manual checklist from `docs/firestore-storage-rules-v5.md`.

Suggested CLI checks:

```bash
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use --add <staging-project-id>
npx -y firebase-tools@latest emulators:start --only firestore,storage
```

Deploy to staging only after emulator validation:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,storage --project <staging-project-id>
```

Before deploy:

- Confirm `chatSessions` read/write cases.
- Confirm dealer A cannot read/write dealer B records.
- Confirm member cannot change `role`, `status`, or `dealerId`.
- Confirm Storage image upload paths require active dealer membership.
- Confirm pending/disabled memberships cannot write dealer scoped data.

## 4. User-Facing Technical Error Fix

Step 2N removes the main known user-facing technical chat error.

Changed:

- `src/hooks/chat/useChat.ts`: AI streaming fallback now shows only a generic Thai message while logging the real error to console.
- `src/store.ts`: legacy chat/AI description fallback no longer shows raw technical details or API key wording to users.

User-facing message:

```text
ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ
```

Still logged for debugging:

- AI streaming callback errors.
- Mock fallback errors.
- AI description generator errors.

Continue checking during staging:

- Chat to Draft failure messages.
- Draft save failure messages.
- Image upload failure messages.
- Auth/permission denied messages.
- Dealer scope mismatch messages.

## 5. Persistent Storage Check

Current staging-sensitive storage:

- `data/marketplace-inventory.json`
- `data/dealer-draft-inventory.json`
- `data/listing-images/{listingId}`
- Express static route: `/storage/listings/{listingId}`

Risk:

- If the staging host uses ephemeral filesystem, marketplace inventory, drafts, and uploaded images can disappear on restart/redeploy.
- Multi-instance staging can split data across instances and break dealer inventory/image consistency.

Acceptable temporary staging options:

- Single VM/server with persistent disk and backups.
- Mounted persistent volume for `data/`.
- Local/internal staging machine for short rehearsal only.

Preferred production direction:

- Firestore for marketplace inventory and dealer drafts.
- Firebase Storage for listing, draft, and chat attachment images.

Step 2N does not migrate storage. Choose and document the staging host storage mode before real dealer testing.

## 6. Staging Smoke Test Plan

Run after env, Firebase users, seeded docs, and staging rules are ready:

1. Guest can view marketplace.
2. Guest cannot enter Dealer Portal.
3. Member can log in.
4. Member can open profile.
5. Member cannot enter Dealer Portal.
6. Dealer can log in.
7. Dealer can enter Dealer Portal.
8. Dealer can chat with Nong A.
9. Dealer can attach images in chat.
10. Dealer can save a listing draft.
11. Images from chat stay attached to the listing draft.
12. Dealer can edit listing draft.
13. Dealer can publish listing.
14. Published listing appears in marketplace.
15. Dealer can edit images after publish.
16. Delete listing has confirmation popup.
17. Chat history left sidebar can reopen old sessions.
18. Dealer A cannot see Dealer B inventory, drafts, images, or chat sessions.
19. Admin/superadmin can enter admin areas according to role.
20. Real mobile device testing follows after desktop staging pass.

Mobile follow-up checklist:

- Marketplace list and car details.
- Dealer Portal navigation.
- Chat sidebar, composer, attachments, and bottom buttons.
- Draft edit and image sections.
- Published listing image edit.
- Login/profile.

## Remaining Blockers Before Internal Staging

- Real staging env/secrets are not configured in this repo.
- Firestore/Storage rules still need emulator validation and staging deploy.
- Persistent storage mode for `data/` must be chosen if not migrating yet.
- Real Firebase test users must be created and seeded.

## Suggested Next Step

After this checklist is reviewed:

1. Configure staging secrets.
2. Create Firebase Auth test users.
3. Seed role/membership docs.
4. Emulator-test and deploy rules to staging.
5. Run the staging smoke checklist.

# Nong A v5.0 Step 2O Staging Secrets And Firebase Test Users

This runbook prepares real staging secrets and real Firebase test users for an internal staging rehearsal. It must not contain passwords, private keys, service account JSON, or real user secrets.

## 1. Staging Secrets Checklist

Set these in the staging host secret manager or environment configuration.

Frontend:

```bash
VITE_FIREBASE_API_KEY="<Firebase Web API key>"
VITE_FIREBASE_AUTH_DOMAIN="<project-id>.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="<project-id>"
VITE_FIREBASE_STORAGE_BUCKET="<project-id>.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="<sender-id>"
VITE_FIREBASE_APP_ID="<web-app-id>"
VITE_FIREBASE_MEASUREMENT_ID="<optional-measurement-id>"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
VITE_NONGA_PUBLIC_SIGNUP_ENABLED="false"
```

Backend, choose exactly one credential method:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="<store only in staging secret manager>"
```

or:

```bash
FIREBASE_PROJECT_ID="<project-id>"
FIREBASE_CLIENT_EMAIL="<service-account-email>"
FIREBASE_PRIVATE_KEY="<private-key-with-escaped-newlines>"
```

AI and app:

```bash
GEMINI_API_KEY="<staging Gemini key>"
APP_URL="https://<staging-domain>"
NODE_ENV="production"
```

Limited beta compatibility, only if staging still uses beta-token paths:

```bash
NONGA_BETA_DEALER_ID="<dealer-id>"
NONGA_DEALER_API_TOKEN="<strong-random-single-dealer-token-if-needed>"
NONGA_DEALER_TOKEN_MAP='{"thor-auto":"<strong-random-token>"}'
```

Do not set these in staging:

- `NONGA_DEV_FIREBASE_TOKEN_MAP`
- `NONGA_DEV_USER_PROFILE_MAP`
- `NONGA_DEV_DEALER_MEMBERSHIP_MAP`
- Default `nonga-v4-dev-dealer-token`
- Default `nonga-v4-dev-admin-token`

Hard rules:

- Do not commit real secrets to the repo.
- Do not put private keys in docs.
- Do not put Firebase service account JSON in docs.
- Do not store Firebase Auth test user passwords in the repo.
- Keep `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`.

## 2. Firebase Auth Test Users

Create these users in Firebase Console > Authentication > Users:

- Member test user.
- Dealer test user.
- Admin or superadmin test user.

Recommended process:

1. Enable the sign-in provider that staging will use, usually Email/Password first.
2. Create the three test users in Firebase Authentication.
3. Store their passwords only in the team's password manager.
4. Copy each `uid` from Firebase Console.
5. Do not commit emails if they identify real people; prefer staging-only addresses.

Suggested staging-only identities:

- `member.staging@example.test`
- `dealer.staging@example.test`
- `admin.staging@example.test`

## 3. Seed Firestore Users And Dealer Members

Set seed env in a secure local/admin shell after Firebase Auth users exist:

```bash
NONGA_TEST_MEMBER_UID="<member-auth-uid>"
NONGA_TEST_MEMBER_EMAIL="member.staging@example.test"
NONGA_TEST_MEMBER_DISPLAY_NAME="Nong A Staging Member"

NONGA_TEST_DEALER_UID="<dealer-auth-uid>"
NONGA_TEST_DEALER_EMAIL="dealer.staging@example.test"
NONGA_TEST_DEALER_DISPLAY_NAME="Nong A Staging Dealer"
NONGA_TEST_DEALER_ID="thor-auto"
NONGA_TEST_DEALER_NAME="Thor Auto Staging"

NONGA_TEST_ADMIN_UID="<admin-auth-uid>"
NONGA_TEST_ADMIN_EMAIL="admin.staging@example.test"
NONGA_TEST_ADMIN_DISPLAY_NAME="Nong A Staging Admin"
NONGA_TEST_ADMIN_ROLE="admin"
```

Dry-run first:

```bash
npm run seed:v50-firebase-role-test-users -- --dry-run --json
```

Verify dry-run output:

- `users/{memberUid}` has `role: "member"` and `status: "active"`.
- `users/{dealerUid}` has `role: "dealer"`, `status: "active"`, `dealerId`, and `dealerName`.
- `dealerMembers/{dealerUid_dealerId}` has `roleInDealer: "owner"` and `status: "active"`.
- `users/{adminUid}` has `role: "admin"` or `"superadmin"` and `status: "active"`.
- No passwords, private keys, or service account fields are present.
- Public signup remains disabled with `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`.

Write only after dry-run review:

```bash
npm run seed:v50-firebase-role-test-users -- --write
```

The `--write` command requires Firebase Admin credentials from the staging secret environment.

## 4. Verify Login Role Flow

After staging env, seeded docs, and rules are ready:

1. Guest can view marketplace.
2. Guest cannot enter Dealer Portal.
3. Member can log in.
4. Member can open profile.
5. Member cannot enter Dealer Portal.
6. Dealer can log in.
7. Dealer can enter Dealer Portal.
8. Dealer can use Chat to Draft.
9. Dealer can attach images in chat.
10. Dealer can save a listing draft.
11. Admin/superadmin can enter admin areas according to role.
12. Suspended test user, if created later, is blocked.

## 5. Storage Mode Decision Before Staging

Current storage:

- `data/marketplace-inventory.json`
- `data/dealer-draft-inventory.json`
- `data/listing-images/{listingId}`
- `/storage/listings/{listingId}`

Option A: use `data/` temporarily on staging.

- Recommended for the first internal staging rehearsal only if staging runs on a single host with persistent filesystem.
- Requires backup or a clear reset policy.
- Not acceptable for multi-instance or ephemeral/serverless hosts.
- Document that data can be lost if the host redeploys without persistent disk.

Option B: migrate listing/draft data and images to Firestore/Storage before staging.

- Safer and closer to production.
- Larger scope and should be a separate implementation step.
- Requires adapting server-side inventory/draft/image code paths and writing emulator tests.

Recommendation for the first staging rehearsal:

- Use Option A only on a single persistent-disk staging host for short internal testing.
- If the chosen host is ephemeral or serverless, do not start real dealer testing; make Firestore/Storage migration the next step before staging.

## 6. Rules Emulator And Staging Deploy Plan

Rules files:

- `firestore.rules.draft`
- `storage.rules.draft`

Prepare staging rule files:

```bash
copy firestore.rules.draft firestore.rules
copy storage.rules.draft storage.rules
```

Static repo validation:

```bash
npm run test:v50-security-rules
```

Firebase CLI checks:

```bash
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use --add <staging-project-id>
```

Emulator rehearsal:

```bash
npx -y firebase-tools@latest emulators:start --only firestore,storage
```

Manual emulator cases:

- Guest can read published listings only.
- Member cannot change own `role`, `status`, or `dealerId`.
- Dealer A can write dealer A listing/draft/chat metadata.
- Dealer A cannot write dealer B listing/draft/chat metadata.
- Dealer A cannot upload to Storage path for dealer B.
- Pending/disabled membership cannot write dealer scoped data.
- Admin/superadmin can manage according to role.

Deploy to staging only after emulator validation:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,storage --project <staging-project-id>
```

Do not deploy these rules to production in Step 2O.

## 7. Step 2O Exit Criteria

Before staging rehearsal begins:

- Staging env/secrets are configured outside the repo.
- Firebase Auth test users exist.
- `users/{uid}` and `dealerMembers/{uid_dealerId}` are seeded and reviewed.
- Public signup is still disabled.
- Rules are emulator-tested and deployed to the staging Firebase project.
- Staging storage mode is explicitly chosen.
- Staging smoke checklist from `docs/v5-staging-environment-setup.md` is ready to run.

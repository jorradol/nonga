# Nong A v5.0 Staging Rehearsal Step 1 Firebase And Test Users

Checkpoint:

- Tag: `v5.0-pre-staging-rc1`
- Commit: `abc1451`

This rehearsal prepares real staging Firebase configuration and closed test users. It does not deploy public staging, does not open Online Beta, does not run migration `--write`, and does not switch the app to Firestore/Firebase Storage backends.

## 1. Firebase Web Config

Copy these values from Firebase Console > Project settings > General > Web app SDK setup into the staging host or secret manager only:

```bash
VITE_FIREBASE_API_KEY="<staging-web-api-key>"
VITE_FIREBASE_AUTH_DOMAIN="<staging-project-id>.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="<staging-project-id>"
VITE_FIREBASE_STORAGE_BUCKET="<staging-project-id>.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="<sender-id>"
VITE_FIREBASE_APP_ID="<web-app-id>"
VITE_FIREBASE_MEASUREMENT_ID="<optional-measurement-id>"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
```

Rules:

- Do not commit real Firebase web config values to the repo.
- Do not place real values in `.env.example`.
- Keep these in the staging host environment or secret manager.

## 2. Firebase Admin Env

Choose exactly one Admin credential method for staging.

Option A:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="<service-account-json-from-secret-manager>"
FIREBASE_PROJECT_ID="<staging-project-id>"
```

Option B:

```bash
FIREBASE_PROJECT_ID="<staging-project-id>"
FIREBASE_CLIENT_EMAIL="<service-account-email>"
FIREBASE_PRIVATE_KEY="<private-key-with-escaped-newlines>"
```

Option C:

```bash
GOOGLE_APPLICATION_CREDENTIALS="<secure-path-on-staging-host>"
FIREBASE_PROJECT_ID="<staging-project-id>"
```

Rules:

- Do not commit service account JSON.
- Do not commit private keys.
- Do not paste service account contents into docs, issues, PRs, or chat logs.
- Use a staging-only service account with least privilege needed for Firestore seeding and staging rehearsal.

## 3. Other Required Env

Required:

```bash
GEMINI_API_KEY="<staging-gemini-key>"
APP_URL="https://<staging-domain>"
NODE_ENV="production"
VITE_NONGA_PUBLIC_SIGNUP_ENABLED="false"
```

Backend flags remain file for this rehearsal:

```bash
NONGA_DATA_BACKEND="file"
NONGA_IMAGE_BACKEND="file"
```

If beta-token compatibility is still needed for closed staging:

```bash
NONGA_BETA_DEALER_ID="<dealer-id>"
NONGA_DEALER_API_TOKEN="<strong-random-single-dealer-token>"
```

or:

```bash
NONGA_DEALER_TOKEN_MAP='{"thor-auto":"<strong-random-token>"}'
```

Prefer Firebase Auth for real staging role testing and reduce beta-token dependency once test users are seeded.

Do not set local-only dev maps in staging:

- `NONGA_DEV_FIREBASE_TOKEN_MAP`
- `NONGA_DEV_USER_PROFILE_MAP`
- `NONGA_DEV_DEALER_MEMBERSHIP_MAP`

## 4. Firebase Auth Test Users

Create these users manually in Firebase Console > Authentication > Users:

1. Member test user.
2. Dealer test user.
3. Admin or superadmin test user.

Keep passwords only in a password manager. Do not store passwords in repo files, env examples, docs, or test scripts.

After each user is created, copy the Firebase Auth UID and set these values in a secure local/admin shell for seeding:

Member:

```bash
NONGA_TEST_MEMBER_UID="<member-auth-uid>"
NONGA_TEST_MEMBER_EMAIL="<member-staging-email>"
NONGA_TEST_MEMBER_DISPLAY_NAME="Nong A Staging Member"
```

Dealer:

```bash
NONGA_TEST_DEALER_UID="<dealer-auth-uid>"
NONGA_TEST_DEALER_EMAIL="<dealer-staging-email>"
NONGA_TEST_DEALER_DISPLAY_NAME="Nong A Staging Dealer"
NONGA_TEST_DEALER_ID="thor-auto"
NONGA_TEST_DEALER_NAME="Thor Auto Staging"
```

Admin:

```bash
NONGA_TEST_ADMIN_UID="<admin-auth-uid>"
NONGA_TEST_ADMIN_EMAIL="<admin-staging-email>"
NONGA_TEST_ADMIN_DISPLAY_NAME="Nong A Staging Admin"
NONGA_TEST_ADMIN_ROLE="admin"
```

Use `NONGA_TEST_ADMIN_ROLE="superadmin"` only if the rehearsal explicitly needs superadmin coverage.

## 5. Seed Users And Dealer Memberships

Dry-run first:

```bash
npm run seed:v50-firebase-role-test-users -- --dry-run --json
```

Review expected output:

- `users/{memberUid}` has `role: "member"` and `status: "active"`.
- `users/{dealerUid}` has `role: "dealer"`, `status: "active"`, `dealerId`, and `dealerName`.
- `dealerMembers/{dealerUid_dealerId}` has `roleInDealer: "owner"` and `status: "active"`.
- `users/{adminUid}` has `role: "admin"` or `"superadmin"` and `status: "active"`.
- No passwords or private key material appear in output.

Write only after dry-run review:

```bash
npm run seed:v50-firebase-role-test-users -- --write
```

Expected write result:

- `users/{memberUid}`
- `users/{dealerUid}`
- `users/{adminUid}`
- `dealerMembers/{dealerUid_dealerId}`

## 6. Login Role Flow Checklist

Run after staging app env is configured, Firebase Auth users exist, and Firestore seed docs are written:

1. Guest can view marketplace.
2. Guest cannot enter Dealer Portal.
3. Member can log in.
4. Member can open profile.
5. Member cannot enter Dealer Portal.
6. Dealer can log in.
7. Dealer can enter Dealer Portal.
8. Dealer can use Chat to Draft.
9. Dealer can create a listing with an image.
10. Admin or superadmin can enter admin areas according to role.

## 7. Explicitly Out Of Scope

Do not do these in Step 1:

- Do not deploy public staging.
- Do not open Online Beta.
- Do not run `npm run migrate:v50-file-data -- --write`.
- Do not set `NONGA_DATA_BACKEND=firestore`.
- Do not set `NONGA_IMAGE_BACKEND=firebase-storage`.
- Do not enable public signup.
- Do not add features or large refactors.

## 8. Current Rehearsal Status Fields

Fill these during the actual staging setup:

```text
Firebase Web Config set in staging host: yes/no
Firebase Admin credential option chosen: A/B/C
Firebase Auth member user created: yes/no
Firebase Auth dealer user created: yes/no
Firebase Auth admin/superadmin user created: yes/no
Seed dry-run reviewed: yes/no
Seed write completed: yes/no
Public signup disabled: yes/no
Login role flow completed: yes/no
Missing secrets or blockers: <notes>
```

# Nong A v5.0 Step 2J Firebase Role Test Users

Step 2J prepares limited real Firebase Auth test accounts and Firestore role documents. It does not open public signup, move chat history, or deploy production.

## Safety Rules

- Do not commit passwords.
- Do not commit service account JSON or private keys.
- Create Firebase Auth users first, then use their UIDs for Firestore seed data.
- Public signup remains disabled by default with `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`.
- No user can sign up and become `dealer`, `admin`, or `superadmin` by themselves.

## Create Firebase Auth Test Users

In Firebase Console:

1. Open Authentication.
2. Enable only the providers needed for testing, such as Email/Password or Google.
3. Create test users:
   - member test user
   - dealer test user
   - admin or superadmin test user
4. Copy each Firebase Auth `uid`.
5. Do not store the account passwords in this repo.

## Seed Script

Script:

```bash
npm run seed:v50-firebase-role-test-users -- --dry-run
```

Useful modes:

- `--example --json`: prints safe example documents.
- `--dry-run --json`: prints documents from env without writing Firestore.
- `--write --json`: writes `users/{uid}` and `dealerMembers/{uid_dealerId}` using Firebase Admin env.

Required env:

```bash
NONGA_TEST_MEMBER_UID=""
NONGA_TEST_MEMBER_EMAIL=""
NONGA_TEST_MEMBER_DISPLAY_NAME="Nong A Test Member"

NONGA_TEST_DEALER_UID=""
NONGA_TEST_DEALER_EMAIL=""
NONGA_TEST_DEALER_DISPLAY_NAME="Nong A Test Dealer"
NONGA_TEST_DEALER_ID="thor-auto"
NONGA_TEST_DEALER_NAME="Thor Auto Demo"

NONGA_TEST_ADMIN_UID=""
NONGA_TEST_ADMIN_EMAIL=""
NONGA_TEST_ADMIN_DISPLAY_NAME="Nong A Test Admin"
NONGA_TEST_ADMIN_ROLE="admin"
```

For `--write`, configure one Firebase Admin credential path:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- or `GOOGLE_APPLICATION_CREDENTIALS`

## Documents Created

Member:

```json
{
  "uid": "<member uid>",
  "email": "<member email>",
  "displayName": "Nong A Test Member",
  "role": "member",
  "status": "active",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

Dealer user:

```json
{
  "uid": "<dealer uid>",
  "email": "<dealer email>",
  "displayName": "Nong A Test Dealer",
  "role": "dealer",
  "status": "active",
  "dealerId": "thor-auto",
  "dealerName": "Thor Auto Demo",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

Dealer membership:

```json
{
  "uid": "<dealer uid>",
  "dealerId": "thor-auto",
  "dealerName": "Thor Auto Demo",
  "roleInDealer": "owner",
  "status": "active",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

Admin or superadmin:

```json
{
  "uid": "<admin uid>",
  "email": "<admin email>",
  "displayName": "Nong A Test Admin",
  "role": "admin",
  "status": "active",
  "createdAt": "<ISO timestamp>",
  "updatedAt": "<ISO timestamp>"
}
```

## Real Login Checklist

Set client env:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`, if enabled

Set backend env:

- Firebase Admin credentials
- no default dev dealer/admin tokens in production
- `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`

Test flow:

1. Guest can view marketplace.
2. Guest cannot enter Dealer Portal.
3. Member can login and open profile.
4. Member cannot enter Dealer Portal.
5. Dealer can login and enter Dealer Portal.
6. Dealer can use Chat to Draft.
7. Dealer can save draft with images.
8. Dealer can edit, publish, and delete own listings.
9. Dealer with mismatched `X-Dealer-Id` is blocked by backend.
10. Admin/superadmin can enter admin area if seeded in `users/{uid}`.
11. Suspended user is blocked.

## Online Beta Checklist

- Firebase Web Config is real in staging.
- Firebase Admin verification works on backend.
- `users/{uid}` exists for every test account.
- `dealerMembers/{uid_dealerId}` exists for every dealer account.
- Public signup remains disabled unless deliberately opened.
- Dealer/admin roles are granted only through controlled seed/admin operations.
- Final smoke and v5 auth tests pass before inviting real dealers.

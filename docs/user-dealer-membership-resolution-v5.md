# Nong A v5.0 Step 2I User Profile And Dealer Membership Resolution

Step 2I defines the real user profile and dealer membership contract for limited Firebase login tests.

## `users/{uid}` Schema

Path: `users/{uid}`

Required fields:

- `uid`: Firebase Auth UID. Must equal document id.
- `email`: user email from Firebase Auth.
- `displayName`: display name shown in the app.
- `role`: `guest | member | premium | dealer | admin | superadmin`
- `status`: `active | pending | suspended`
- `createdAt`: server timestamp or ISO timestamp.
- `updatedAt`: server timestamp or ISO timestamp.

Optional fields:

- `dealerId`: primary dealer id for dealer/admin context, for example `thor-auto`.
- `dealerName`: readable dealer name.

Rules:

- Missing `users/{uid}` falls back to `role: "member"` and `status: "pending"`.
- `admin` and `superadmin` must come from this server-read profile only.
- Frontend headers or local UI role values must not grant backend admin/dealer privileges.
- `suspended` is blocked server-side.
- `pending` can sign in but cannot use dealer/admin-only APIs.

## `dealerMembers/{uid_dealerId}` Schema

Path: `dealerMembers/{uid_dealerId}`

Required fields:

- `uid`: Firebase Auth UID.
- `dealerId`: normalized dealer id.
- `dealerName`: readable dealer name.
- `roleInDealer`: `owner | staff`
- `status`: `active | pending | disabled`
- `createdAt`: server timestamp or ISO timestamp.
- `updatedAt`: server timestamp or ISO timestamp.

Rules:

- Only `status: "active"` creates usable dealer access.
- `pending` returns: `บัญชีดีลเลอร์นี้ยังรอการอนุมัติครับ`
- `disabled` behaves as no active dealer membership.
- Dealer users must have at least one active membership to use dealer APIs.

## Server Resolver Order

Implemented in `src/server/serverAuthContext.ts`:

1. Read `Authorization: Bearer <Firebase ID token>`.
2. Verify the Firebase ID token.
3. Read `users/{uid}`.
4. Normalize `role` and `status`.
5. Read `dealerMembers` rows where `uid == auth.uid`.
6. Keep all memberships in context, but derive `dealerId` only from active memberships.
7. Block suspended users with a user-friendly Thai message.
8. Authorize dealer scope by checking active membership and rejecting mismatched `X-Dealer-Id`.

`dealerApiAuth` and `adminApiAuth` never trust frontend `role` or `dealerId` by themselves.

## Role Behavior

- `member`: can use profile/member areas, cannot use dealer APIs.
- `premium`: buyer/premium member role, still cannot use dealer APIs without dealer membership.
- `dealer`: must have active `dealerMembers` row to use dealer APIs.
- `admin`: must come from `users/{uid}` and have `status: "active"`.
- `superadmin`: must come from `users/{uid}` and have `status: "active"`.
- `suspended`: blocked from protected server APIs.

Public signup remains closed by default in real Firebase mode. Dealer role and dealer membership should be granted only by admin/superadmin operations or manual seed data during limited beta.

## Limited Test Data

Member:

```json
{
  "uid": "firebase-member-uid",
  "email": "member@example.com",
  "displayName": "Test Member",
  "role": "member",
  "status": "active",
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

Dealer profile:

```json
{
  "uid": "firebase-dealer-uid",
  "email": "dealer@example.com",
  "displayName": "Test Dealer",
  "role": "dealer",
  "status": "active",
  "dealerId": "thor-auto",
  "dealerName": "Thor Auto Demo",
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

Dealer membership:

```json
{
  "uid": "firebase-dealer-uid",
  "dealerId": "thor-auto",
  "dealerName": "Thor Auto Demo",
  "roleInDealer": "owner",
  "status": "active",
  "createdAt": "2026-05-25T00:00:00.000Z",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

Admin/superadmin should be seeded in `users/{uid}` only. Do not allow users to self-assign those roles.

## Firestore Rules Draft

This draft is not deployed in Step 2I, but captures the intended direction:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function userProfile() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isActiveAdmin() {
      return signedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && userProfile().status == 'active'
        && userProfile().role in ['admin', 'superadmin'];
    }

    function isSuperAdmin() {
      return signedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && userProfile().status == 'active'
        && userProfile().role == 'superadmin';
    }

    function activeDealerMember(dealerId) {
      return signedIn()
        && exists(/databases/$(database)/documents/dealerMembers/$(request.auth.uid + '_' + dealerId))
        && get(/databases/$(database)/documents/dealerMembers/$(request.auth.uid + '_' + dealerId)).data.status == 'active';
    }

    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isActiveAdmin());
      allow create: if false;
      allow update: if isActiveAdmin() || (signedIn() && request.auth.uid == uid
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status', 'dealerId', 'dealerName']));
      allow delete: if isSuperAdmin();
    }

    match /dealerMembers/{membershipId} {
      allow read: if signedIn() && (resource.data.uid == request.auth.uid || isActiveAdmin());
      allow write: if isActiveAdmin();
    }

    match /dealerListings/{listingId} {
      allow read: if true;
      allow write: if isActiveAdmin() || activeDealerMember(request.resource.data.dealerId);
    }

    match /listingImages/{imageId} {
      allow read: if true;
      allow write: if isActiveAdmin() || activeDealerMember(request.resource.data.dealerId);
    }
  }
}
```

When chat history moves to Firestore, chat rules must also require `uid == request.auth.uid` and dealer membership matching `dealerId`.

## Step 2J Seed Helper

Real test users should be created in Firebase Auth first, then seeded into Firestore using UID-based docs.

See `docs/firebase-role-test-users-v5.md` and `scripts/seed-v50-firebase-role-test-users.mts` for the safe dry-run/write flow.

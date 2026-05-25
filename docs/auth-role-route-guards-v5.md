# Nong A v5.0 Auth Roles and Route Guards

Step 2A defines the central frontend auth/role model and route guard layer. It does not replace backend Firebase token verification yet.

## Roles

The source of truth is `src/utils/rbac.ts`.

- `guest`: public visitor. Can browse marketplace, car details, and search.
- `member`: signed-in user. Can access user profile and future buyer features.
- `premium`: signed-in buyer with premium features. Still cannot access dealer tools unless a real dealer membership/dealerId is attached.
- `dealer`: dealer account. Can access Dealer Portal, Chat to Draft, draft editing, image upload, publish, hide, and delete flows for its own dealer scope.
- `admin`: system operator. Can access admin dashboard and admin tools, but cannot manage superadmin/root roles.
- `superadmin`: highest system owner role. Can access admin features and role/user/dealer management.

## User Model

Central types are defined in `src/utils/rbac.ts`:

- `AuthRole`
- `UserStatus`
- `UserAuthProfile`
- `DealerMembership`

Recommended production user fields:

```ts
{
  uid: string;
  email: string;
  displayName: string;
  role: AuthRole;
  status: "active" | "pending" | "suspended";
  dealerId?: string;
  dealerName?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

Recommended dealer membership shape:

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

## Guarded Views

Implemented in `src/components/auth/RouteGuard.tsx` and applied in `src/App.tsx`.

- Public: `home`, `marketplace`, `car-details`, `search`, `dealers`, `dealer-showroom`
- Member+: `profile`, `my-listings`
- Dealer+: `chat`, `sell`, `dealer-dashboard`, `dealer-portal`
- Admin+: `admin-dashboard`, `inventory-import`, `dealer-draft-inventory`
- Superadmin: `RequireSuperAdmin` exists for role management screens when that view is added

## User-Facing Denial Messages

Route guards must show plain Thai messages, never backend/debug wording:

- Guest: `กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ`
- Member/premium without dealer access: `บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ`
- Non-admin accessing admin: `บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ`
- Suspended: `บัญชีนี้ถูกระงับการใช้งานครับ กรุณาติดต่อผู้ดูแลระบบ`

## DEV / Mock Boundary

DEV/mock mode still exists for testing:

- Firebase config is currently a fake placeholder.
- Mock session persists in `localStorage` under `nonga_auth_session`.
- Simulated users live in `nonga_simulated_users`.
- Thor Auto Demo role switching remains available only in DEV/mock through `UserProfileView` and `dealerDemoSession`.

Production must not expose sandbox role switching.

## Step 2B

The next phase should wire real backend auth:

- Replace stub dealer/admin tokens with Firebase ID token verification.
- Add Firebase Admin SDK on the server.
- Resolve `uid -> role -> dealer membership -> dealerId` server-side.
- Reject mismatched frontend `X-Dealer-Id`/`X-Owner-Id`.
- Deprecate legacy owner listing endpoints that trust frontend owner headers.
- Add Firestore/Storage rules for dealer membership and chat history.

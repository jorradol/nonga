# Nong A v5.0 Step 2D Legacy Owner Route Auth

Step 2D secures legacy owner listing endpoints that previously trusted `X-Owner-Id` or `ownerId` from the frontend.

## Inventory

Legacy endpoints checked:

- `POST /api/cars` in `server.ts`
- `GET /api/my/listings` in `src/server/ownerListingRoutes.ts`
- `POST /api/cars/:id/images` in `src/server/ownerListingRoutes.ts`
- `PATCH /api/cars/:id` in `src/server/ownerListingRoutes.ts`
- `PATCH /api/cars/:id/visibility` in `src/server/ownerListingRoutes.ts`
- `DELETE /api/cars/:id` in `src/server/ownerListingRoutes.ts`

Frontend call sites still using legacy routes:

- `src/components/cars/create/SellingFormContainer.tsx` calls `POST /api/cars`
- `src/components/MyListingsView.tsx` uses `src/services/listings/myListingsApi.ts`
- `src/services/listings/myListingsApi.ts` calls `/api/my/listings`, `/api/cars/:id/images`, `/api/cars/:id`, `/api/cars/:id/visibility`, and `/api/cars/:id`

Dealer Portal, Chat to Draft, dealer image upload, draft publish, and dealer inventory already use `/api/dealer/*`.

## What Is Secured

`src/server/ownerListingAccess.ts` now resolves legacy owner route scope from:

- Firebase server auth context when a Firebase bearer token is present
- beta dealer token binding from `NONGA_DEALER_TOKEN_MAP` or `NONGA_BETA_DEALER_ID`
- DEV stub dealer/admin token outside production
- DEV-only legacy `X-Owner-Id`/body `ownerId` fallback outside production

In production, raw `X-Owner-Id`, body `ownerId`, or body `dealerId` are not accepted by themselves.

## Ownership Rules

For read/edit/upload/hide/delete:

- admin/superadmin can manage listings
- dealer can manage listings whose resolved `dealerId` matches the server-derived dealer scope
- regular user can manage listings whose `ownerId` matches the verified Firebase `uid`
- mismatches return `403`
- missing listing returns `404`

For `POST /api/cars`:

- Firebase dealer creates with server-derived `dealerId` and `owner-${dealerId}`
- Firebase member creates with server-derived `uid` as `ownerId`
- admin can still provide a target owner/dealer
- DEV-only fallback keeps old local demo create flow working

## Deprecated / DEV-Only

These legacy routes are still present for compatibility, but dealer production should prefer `/api/dealer/*`:

- `POST /api/cars`
- `GET /api/my/listings`
- `POST /api/cars/:id/images`
- `PATCH /api/cars/:id`
- `PATCH /api/cars/:id/visibility`
- `DELETE /api/cars/:id`

The raw `X-Owner-Id` path is DEV-only and should not be used as production security.

## Frontend Migration

Recommended future frontend direction:

- Dealer listing management should stay on `/api/dealer/inventory` and `/api/dealer/drafts`.
- Dealer image upload should stay on `/api/dealer/inventory/:id/upload-images` or `/api/dealer/drafts/:id/upload-images`.
- `MyListingsView` should later send Firebase ID tokens and stop depending on `X-Owner-Id`.
- Public sell flow should either require signed-in member/dealer auth or route dealer creation through draft/dealer APIs.

## Step 2E

Recommended next step:

- wire frontend API headers to real Firebase ID tokens
- remove production fallback to default DEV tokens
- add Firestore rules for `users`, `dealerMembers`, listings, and images
- decide whether non-dealer members may continue using `POST /api/cars`
- keep chat history database migration separate

# Nong A v5.0 Step 2E Frontend Listing API Routes

Step 2E reduces direct frontend usage of legacy owner listing routes and moves dealer listing management toward dealer-scoped APIs.

## Migrated

`src/components/MyListingsView.tsx`

- Now builds a central `listingApiScope`.
- Dealer-capable users use `useDealerPortal()` and dealer auth headers.
- The view no longer directly references `/api/my/listings`.

`src/components/listings/EditListingModal.tsx`

- Receives `listingApiScope`.
- Image saves go through `resolveListingImagesForSave(scope, ...)`.

`src/services/listings/myListingsApi.ts`

- Central compatibility/service layer for "my listings".
- Dealer scope uses secure dealer APIs:
  - `GET /api/dealer/inventory`
  - `PATCH /api/dealer/inventory/:id`
  - `PATCH /api/dealer/inventory/:id/visibility`
  - `DELETE /api/dealer/inventory/:id`
  - `POST /api/dealer/inventory/:id/upload-images`
- Non-dealer compatibility path still uses legacy owner routes from one file only.

`src/components/cars/create/SellingFormContainer.tsx`

- No longer calls `fetch("/api/cars")` directly.
- Uses `createLegacyMarketplaceListing()` from `myListingsApi.ts`.

## Remaining Compatibility Paths

Legacy calls still exist only in `src/services/listings/myListingsApi.ts`:

- `POST /api/cars`
- `GET /api/my/listings`
- `POST /api/cars/:id/images`
- `PATCH /api/cars/:id`
- `PATCH /api/cars/:id/visibility`
- `DELETE /api/cars/:id`

These are kept for member/private listing compatibility and the older sell form. Backend Step 2D already protects them with server auth context and keeps raw `X-Owner-Id` as DEV-only fallback.

## X-Owner-Id Reduction

`X-Owner-Id` is no longer spread across views. It is isolated inside the compatibility branch of `src/services/listings/myListingsApi.ts`.

Dealer users should use `dealerAuthHeaders()` through dealer service helpers, not `X-Owner-Id`.

## Recommended Step 2F

- Make frontend API helpers send real Firebase ID tokens when Firebase config is real.
- Decide whether public/member `SellingFormContainer` remains supported or moves fully to Dealer Draft.
- Remove production access to default DEV stub tokens.
- Continue keeping chat history database migration separate.

# Nong A v5.0 Step 2C Dealer API Server Auth

Step 2C applies the Step 2B server auth context to dealer API scope decisions while keeping beta token and DEV stub compatibility.

## Dealer API Coverage

All `/api/dealer/*` routes are behind `dealerApiAuth` in `server.ts`.

`src/server/dealerPortalRoutes.ts` uses `scopeOr403()` on these dealer endpoints:

- `POST /api/dealer/drafts/new`
- `GET /api/dealer/dashboard`
- `GET /api/dealer/inventory`
- `PATCH /api/dealer/inventory/:id`
- `POST /api/dealer/inventory/:id/upload-images`
- `PATCH /api/dealer/inventory/:id/visibility`
- `DELETE /api/dealer/inventory/:id`
- `GET /api/dealer/drafts`
- `PATCH /api/dealer/drafts/:id`
- `DELETE /api/dealer/drafts/:id`
- `POST /api/dealer/drafts/:id/upload-images`
- `POST /api/dealer/drafts/:id/publish`
- `GET /api/dealer/profile`
- `PATCH /api/dealer/profile`
- `GET /api/dealer/duplicates`
- `POST /api/dealer/duplicates/review`
- `POST /api/dealer/duplicates/:id/rescan`
- `POST /api/dealer/import/commit`
- `POST /api/dealer/paste-import/image-probe`
- `GET /api/dealer/paste-import/preview-proxy`
- `POST /api/dealer/paste-import/import-selected-images`
- `POST /api/dealer/paste-import/upload-images`

For Firebase requests, `dealerApiAuth` resolves the Firebase identity into `req.apiAuth` before the route runs. `scopeOr403()` then uses the server-derived dealer scope.

## X-Dealer-Id Protection

`dealerApiAuth` now handles dealer scope in this order:

- beta token binding from `NONGA_DEALER_TOKEN_MAP` or `NONGA_BETA_DEALER_ID`
- Firebase auth context from `getServerAuthContext`
- DEV stub token fallback only outside production

If a Firebase dealer sends an `X-Dealer-Id` that does not match an active dealer membership, the request is rejected with `403`.

If a beta token is bound to `thor-auto` and the frontend sends another dealer ID, the request is rejected with `403`.

`parseDealerRequestScope()` no longer trusts raw `X-Dealer-Id` in production when `req.apiAuth` is missing. The old header fallback is kept only for DEV-only direct route compatibility.

## Listing Image Scope

Step 2C also tightens paste import image endpoints:

- `POST /api/dealer/paste-import/import-selected-images`
- `POST /api/dealer/paste-import/upload-images`

When a persisted `draft-*` or `car-*` listing ID is provided, the route verifies that the draft/listing belongs to the server-derived dealer before writing image files.

Temporary `draft-import-*` IDs remain allowed for the import staging flow.

## Compatibility

Still supported:

- existing beta token binding path
- existing DEV stub dealer/admin tokens
- Thor Auto Demo / sandbox flows in DEV/mock
- final smoke test dealer draft, image, publish, inventory edit, and delete flows

## Legacy Endpoints

Step 2D adds server-side guards for these legacy routes, but dealer production should still prefer `/api/dealer/*`:

- `POST /api/cars` is guarded by server-resolved owner/dealer scope.
- `GET /api/my/listings` is guarded by server-resolved owner/dealer scope.
- `POST /api/cars/:id/images` checks listing ownership before image upload.
- `PATCH /api/cars/:id` checks listing ownership before edit.
- `PATCH /api/cars/:id/visibility` checks listing ownership before hide/show.
- `DELETE /api/cars/:id` checks listing ownership before delete.

See `docs/legacy-owner-routes-auth-v5.md` for the Step 2D guard behavior. Raw `X-Owner-Id` is now DEV-only; production requires server auth context or a compatible beta/stub auth path.

## Step 2E

Recommended next step:

- make frontend send Firebase ID tokens for dealer/admin APIs
- migrate frontend legacy owner calls away from raw `X-Owner-Id`
- add Firestore-backed user/dealer membership rules
- remove production exposure to default DEV tokens
- keep chat history migration as a separate step when ready

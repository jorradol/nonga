# Nong A v5.0 Step 2Q Firestore Inventory And Draft Repository

Step 2Q adds a repository layer for marketplace listings and dealer drafts. It prepares Firestore as a future data backend while keeping the existing file backend as the default. This step does not migrate image files and does not force staging to use Firestore yet.

## Current Data Model

Marketplace inventory source:

- File: `data/marketplace-inventory.json`
- Current server type: `MarketplaceCarRecord`

Important fields:

- `id`
- `title`
- `brand`
- `model`
- `year`
- `price`
- `type`
- `condition`
- `mileage`
- `fuelType`
- `transmission`
- `color`
- `images`
- `description`
- `ownerId`
- `ownerName`
- `ownerPhone`
- `showroomName`
- `isSold`
- `dealerId`
- `listingStatus: "published" | "hidden"`
- `createdAt`
- `boosted`
- `featured`
- duplicate metadata: `duplicateStatus`, `duplicateScore`, `duplicateGroupId`, `duplicateCanonicalId`, `duplicateMatches`, `duplicateReviewedAt`, `duplicateReviewAction`
- optional identity fields: `vin`, `licensePlate`

Dealer draft source:

- File: `data/dealer-draft-inventory.json`
- Current server type: `DealerDraftRecord`

Important fields:

- `id`
- `dealerId`
- `dealerName`
- `ownerName`
- `phone`
- `showroomName`
- `rawRow`
- `normalizedData`
- `missingFields`
- `warnings`
- `confidenceScore`
- `status: "draft" | "needs_review"`
- `images`
- `sourceImageUrls`
- `imageMetadata`
- `title`
- `brand`
- `model`
- `year`
- `price`
- `mileage`
- `fuelType`
- `condition`
- `description`
- `createdAt`
- `updatedAt`
- duplicate metadata and optional `vin` / `licensePlate`

Image fields remain URL/path metadata in Step 2Q. Binary file migration is reserved for Step 2R.

## Repository Files

Repository interface and implementations:

- `src/server/repositories/inventoryRepository.ts`

Test:

- `scripts/test-v50-firestore-repository.mts`
- npm script: `npm run test:v50-firestore-repository`

## Interfaces

Main interfaces:

- `ListingRepository`
- `DraftRepository`
- `InventoryRepository`

Listing methods:

- `listPublished()`
- `listByDealer(dealerId)`
- `getById(id)`
- `createListing(dealerId, record)`
- `updateListing(dealerId, id, patch)`
- `updateVisibility(dealerId, id, visibility)`
- `deleteListing(dealerId, id)`

Draft methods:

- `listByDealer(dealerId)`
- `getById(dealerId, id)`
- `createDraft(dealerId, record)`
- `updateDraft(dealerId, id, patch)`
- `deleteDraft(dealerId, id)`

Inventory method:

- `publishDraft(dealerId, draftId)`

## Backends

File backend:

- `FileInventoryRepository`
- `FileListingRepository`
- `FileDraftRepository`
- Wraps existing `marketplaceInventory.ts` and `dealerDraftInventory.ts` functions.
- Keeps existing smoke tests and local flows unchanged.

Firestore backend:

- `FirestoreInventoryRepository`
- `FirestoreListingRepository`
- `FirestoreDraftRepository`
- Targets `dealerListings` and `dealerDrafts`.
- Uses Firebase Admin credentials only when selected.

Backend selector:

```bash
NONGA_DATA_BACKEND=file
NONGA_DATA_BACKEND=firestore
```

Default:

- Missing or unknown `NONGA_DATA_BACKEND` resolves to `file`.
- Local/dev and existing tests continue using file backend.

Factory:

- `createInventoryRepository()`
- `resolveInventoryDataBackend()`

## Firestore Collections

Prepared collection names:

- `dealerListings`
- `dealerDrafts`

These match the Step 2K/2P rules draft and staging emulator plan.

## Dealer Isolation

Repository methods that mutate dealer-owned data require a server-resolved `dealerId` argument:

- `updateListing(dealerId, id, patch)`
- `updateVisibility(dealerId, id, visibility)`
- `deleteListing(dealerId, id)`
- `createListing(dealerId, record)`
- `getById(dealerId, id)` for drafts
- `updateDraft(dealerId, id, patch)`
- `deleteDraft(dealerId, id)`
- `publishDraft(dealerId, draftId)`

The repository checks the stored record's `dealerId` before mutating. This is not a replacement for API auth. API routes must continue to pass dealer scope from server auth context, not raw frontend headers.

## Step 2Q Scope Limits

Done:

- Repository interface.
- File backend wrapper.
- Firestore-ready backend implementation.
- Backend env selector.
- Dry-run repository tests.

Not done:

- Existing route handlers are not broadly migrated to the repository in Step 2Q.
- Existing JSON files are not migrated to Firestore.
- Local listing image files are not migrated to Firebase Storage.
- Duplicate review/import services still call current file modules directly until a later migration step.

## Migration Plan

Step 2R:

- Add Firebase Storage image upload/migration paths for listing and draft images.

Step 2S:

- Add data migration script from `data/marketplace-inventory.json`, `data/dealer-draft-inventory.json`, and `data/listing-images`.

Step 2T:

- Add emulator/integration tests for Firestore/Storage-backed dealer flows.

After Step 2R-2T:

- Flip `NONGA_DATA_BACKEND=firestore` in staging.
- Migrate selected route handlers from direct file modules to `createInventoryRepository()`.
- Keep rollback to `NONGA_DATA_BACKEND=file` until staging rehearsal is stable.

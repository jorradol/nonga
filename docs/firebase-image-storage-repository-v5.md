# Nong A v5.0 Step 2R Firebase Storage Image Repository

Step 2R adds a Firebase Storage-ready repository layer for listing and draft images. It keeps the file backend as the default so current local development and smoke tests keep using `data/listing-images`.

This step does not migrate existing image files and does not require production or Online Beta deployment.

## Current Image Flow

Current file storage:

- Files: `data/listing-images/{listingId}`
- Public serving route: `/storage/listings/{listingId}/{fileName}`
- Express static mount: `server.ts`

Main upload and image paths:

- Chat Image Attachment to draft:
  - Frontend sends uploaded chat image files into the dealer draft upload flow.
  - Server route: `POST /api/dealer/drafts/:id/upload-images`
  - Server files: `src/server/dealerPortalRoutes.ts`, `src/server/pasteUploadedImageStorage.ts`
- Draft image upload:
  - Route: `POST /api/dealer/drafts/:id/upload-images`
  - Uses `persistPasteUploadedImages()`
- Published listing image upload:
  - Route: `POST /api/dealer/inventory/:id/upload-images`
  - Uses `persistPasteUploadedImages()`
- Edit listing image upload:
  - Route: `POST /api/cars/:id/images`
  - Files: `src/server/ownerListingRoutes.ts`, `src/server/listingImageUploadBody.ts`
- Paste import selected remote images:
  - Route: `POST /api/dealer/paste-import/import-selected-images`
  - Files: `src/server/pasteImageImportService.ts`, `src/server/listingImageStorage.ts`
- Paste import uploaded files:
  - Route: `POST /api/dealer/paste-import/upload-images`
  - Uses `persistPasteUploadedImages()`
- Bulk/import image URL download:
  - Files: `src/server/inventoryImportCommit.ts`, `src/server/listingImageStorage.ts`
  - Uses `downloadListingImagesForCar()`
- Publish draft image copy:
  - File: `src/server/publishDraftListing.ts`
  - Uses `migrateListingImagesToCarId()`

## Repository Files

Image storage repository:

- `src/server/repositories/imageStorageRepository.ts`

Implementations:

- `FileImageStorageRepository`
- `FirebaseStorageImageRepository`

Test:

- `scripts/test-v50-image-storage-repository.mts`
- npm script: `npm run test:v50-image-storage-repository`

## Interface

Primary interface:

- `ImageStorageRepository`

Methods:

- `uploadListingImage(dealerId, listingId, input)`
- `uploadListingImagePair(dealerId, listingId, input)`
- `listListingImages(dealerId, listingId, targetType)`
- `deleteListingImage(dealerId, listingId, imageId, targetType)`
- `getPublicImageUrl(storagePath)`

The pair upload is the optimized path for main image plus thumbnail after `sharp` processing.

## Backends

File backend:

- Writes to `data/listing-images/{listingId}`.
- Keeps legacy public URLs under `/storage/listings/{listingId}/{fileName}`.
- Wraps existing file helpers in `src/server/listingImageStorage.ts`.

Firebase Storage backend:

- Uses Firebase Admin Storage.
- Stores optimized image buffers and thumbnails.
- Generates Firebase media URLs with download tokens for future browser image rendering.

Backend selector:

```bash
NONGA_IMAGE_BACKEND=file
NONGA_IMAGE_BACKEND=firebase-storage
```

Default:

- Missing or unknown `NONGA_IMAGE_BACKEND` resolves to `file`.
- Local/dev and current smoke tests keep the file backend.

## Firebase Storage Paths

Prepared paths match `storage.rules.draft`:

```text
listing-images/{dealerId}/{listingId}/{fileName}
draft-images/{dealerId}/{draftId}/{fileName}
```

Examples:

```text
listing-images/thor-auto/car-123/1779700000-abcd1234.webp
listing-images/thor-auto/car-123/thumb-1779700000-abcd1234.webp
draft-images/thor-auto/draft-123/1779700000-abcd1234.webp
draft-images/thor-auto/draft-123/thumb-1779700000-abcd1234.webp
```

## Image Metadata

Repository metadata fields:

- `imageId`
- `dealerId`
- `listingId`
- `targetType: "listing" | "draft"`
- `fileName`
- `originalFileName`
- `mimeType`
- `size`
- `width`
- `height`
- `storagePath`
- `publicUrl`
- `downloadUrl`
- `imagePath`
- `imageUrl`
- `thumbnailPath`
- `thumbnailUrl`
- `createdAt`
- `sortOrder`

Existing draft metadata fields remain compatible:

- `imagePath`
- `imageUrl`
- `thumbnailPath`
- `thumbnailUrl`
- `mimeType`
- `width`
- `height`
- `size`
- `createdAt`
- `sortOrder`

## Optimization

Existing optimization is reused:

- File: `src/server/listingImageProcessor.ts`
- Main image max width: `1600`
- Thumbnail max width: `400`
- Main quality: `82`
- Thumbnail quality: `78`
- Preferred output: WebP, fallback JPG

The optimized path is currently used by paste, draft, and dealer upload flows through `persistPasteUploadedImages()`. The legacy edit listing upload route now goes through the repository, but still uses its existing decoded file path to avoid changing smoke-tested behavior too broadly in Step 2R.

## Dealer Isolation

Upload/delete methods require `dealerId` from server scope:

- Dealer routes pass `ctx.dealerId`.
- Legacy owner edit route resolves dealer scope from the stored listing after auth already validates ownership.
- Firebase Storage paths include `dealerId`.
- Delete builds the storage path from the server-provided `dealerId`, `listingId`, and `imageId`; Dealer A cannot delete Dealer B's Firebase path by submitting a raw path.

The repository does not trust raw frontend `dealerId`.

## Step 2R Scope Limits

Done:

- Image storage interface.
- File backend wrapper.
- Firebase Storage-ready backend.
- Backend env selector.
- Dealer-scoped Storage path builder.
- Repository tests for file backend and Firebase dry-run.

Not done:

- Bulk remote image download for CSV/inventory import now routes through `createImageStorageRepository()` (Step 2S/2T gap closed for import download path).
  - `NONGA_IMAGE_BACKEND=file` → local `/storage/listings/...` (not durable on Cloud Run).
  - `NONGA_IMAGE_BACKEND=firebase-storage` → durable Firebase Storage URLs for marketplace/detail/chat.
- Existing historical local files are still not auto-migrated; re-import or run the migration script for old `/storage/listings/` rows.
- Draft publish still copies local files with `migrateListingImagesToCarId()` while default backend is file.
- Existing `images`, `sourceImageUrls`, and `imageMetadata` fields remain as-is.

## Migration Plan

Step 2S:

- Migrate existing `data/listing-images`, `data/marketplace-inventory.json`, and `data/dealer-draft-inventory.json`.
- Preserve current `images`, `sourceImageUrls`, and thumbnail metadata while adding Firebase `storagePath`/URL metadata.

Step 2T:

- Add emulator/integration tests for Firebase Storage-backed upload, publish, edit, marketplace display, and delete flows.

After Step 2S/2T:

- Set `NONGA_IMAGE_BACKEND=firebase-storage` in staging.
- Run dealer upload and marketplace smoke tests against staging.
- Keep rollback to `NONGA_IMAGE_BACKEND=file` until staging rehearsal is stable.

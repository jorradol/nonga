# Nong A v5.0 Step 2S Data And Image Migration Plan

Step 2S adds migration tooling for moving the current file backend data toward Firestore and Firebase Storage. It is intentionally conservative: dry-run is the default, source files are never deleted, and the application backend defaults remain unchanged.

This step does not deploy production, does not open Online Beta, and does not flip `NONGA_DATA_BACKEND` or `NONGA_IMAGE_BACKEND`.

## Source And Target

Sources:

- Listings: `data/marketplace-inventory.json`
- Drafts: `data/dealer-draft-inventory.json`
- Images: `data/listing-images/{listingId}`
- Current public image URLs: `/storage/listings/{listingId}/{fileName}`

Targets:

- Firestore listings: `dealerListings`
- Firestore drafts: `dealerDrafts`
- Firebase Storage listing images: `listing-images/{dealerId}/{listingId}/{fileName}`
- Firebase Storage draft images: `draft-images/{dealerId}/{draftId}/{fileName}`

Script:

```bash
npm run migrate:v50-file-data -- --dry-run
```

Direct file:

```bash
tsx scripts/migrate-v50-file-data-to-firestore-storage.mts --dry-run
```

## Script Modes

Default is dry-run:

```bash
npm run migrate:v50-file-data
```

Dry-run reports:

- Count of marketplace listings found.
- Count of drafts found.
- Count of image folders and files found.
- Count of records with explicit `dealerId`.
- Count of records missing `dealerId`.
- Records planned for `dealerListings`.
- Records planned for `dealerDrafts`.
- Images planned for Firebase Storage.
- Existing/skipped records when an existing-state check is available.
- Warnings and errors.

Machine-readable output:

```bash
npm run migrate:v50-file-data -- --json
```

Limited rehearsal:

```bash
npm run migrate:v50-file-data -- --dealer-id thor-auto --limit 5 --json
```

Skip parts of the migration plan:

```bash
npm run migrate:v50-file-data -- --skip-images
npm run migrate:v50-file-data -- --skip-listings
npm run migrate:v50-file-data -- --skip-drafts
```

Write mode must be explicit:

```bash
npm run migrate:v50-file-data -- --write --confirm-staging --dealer-id thor-auto --limit 5
```

Overwrite is off by default. Do not use overwrite until a dry-run and backup have been reviewed:

```bash
npm run migrate:v50-file-data -- --write --confirm-staging --overwrite --dealer-id thor-auto
```

## Required Env For Write

Dry-run does not require Firebase secrets.

`--write` requires:

- `--confirm-staging`
- `FIREBASE_PROJECT_ID`
- One Admin credential source:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`, or
  - `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, or
  - `GOOGLE_APPLICATION_CREDENTIALS`
- For image migration:
  - `FIREBASE_STORAGE_BUCKET`

The script blocks project IDs that look production-like, such as containing `prod`, `production`, or `live`, unless the explicit `--allow-production-write` flag is present. Do not use `--allow-production-write` during staging rehearsal.

Do not change these defaults just to run the migration:

```bash
NONGA_DATA_BACKEND=file
NONGA_IMAGE_BACKEND=file
```

Those backend flags should remain `file` until Step 2T proves Firestore/Storage-backed flows in emulator or staging.

## Dealer ID Safety

Migration requires an explicit `dealerId` on each listing or draft record.

If a record has no explicit `dealerId`:

- Dry-run reports a warning.
- The record is skipped.
- Write mode does not guess from `ownerId`.

This avoids accidentally assigning old records to the wrong dealer. If a real legacy mapping is needed, add a reviewed mapping option in a later step rather than relying on inference.

## Image Migration

The image migration plan reads from:

```text
data/listing-images/{listingId}
```

It ignores thumbnail source files named `thumb-*` as primary uploads. For each primary image, the script plans a Firebase Storage path using the original image stem as a stable image ID:

```text
listing-images/{dealerId}/{listingId}/{imageId}.webp
draft-images/{dealerId}/{draftId}/{imageId}.webp
```

In write mode, images are processed through `src/server/listingImageProcessor.ts`:

- Main image max width: `1600`
- Thumbnail max width: `400`
- Preferred output: WebP
- Fallback output: JPG

The script uploads through `src/server/repositories/imageStorageRepository.ts`, then writes metadata back into the Firestore document.

Metadata fields:

- `imageId`
- `dealerId`
- `listingId`
- `targetType`
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

If an image upload fails, the script records the error and continues with the rest of the migration where possible.

## Existing Records And Idempotency

The script uses the existing source record IDs for Firestore document IDs.

Default behavior:

- If a target document exists, it is skipped.
- Existing documents are not overwritten.
- Source JSON files and local image files are never deleted.
- Re-running dry-run is safe.
- Re-running write mode is intended to skip already migrated documents unless `--overwrite` is used.

Use `--overwrite` only after reviewing a dry-run and confirming the target data can be replaced.

## Rollback Plan

Because Step 2S does not change app backend defaults, rollback is operationally simple:

- Keep `NONGA_DATA_BACKEND=file`.
- Keep `NONGA_IMAGE_BACKEND=file`.
- Continue serving local files from `/storage/listings`.
- Leave `data/marketplace-inventory.json`, `data/dealer-draft-inventory.json`, and `data/listing-images` untouched.

If a write migration needs to be undone in staging:

- Delete or archive the newly created Firestore docs in `dealerListings` and `dealerDrafts`.
- Delete or archive the newly uploaded Firebase Storage objects under the dealer-scoped paths.
- Re-run dry-run to verify local source files are still intact.

Do not delete local source files until production migration has been tested and signed off.

## Recommended Rehearsal

1. Run full dry-run:

```bash
npm run migrate:v50-file-data -- --json
```

2. Run dealer-limited dry-run:

```bash
npm run migrate:v50-file-data -- --dealer-id thor-auto --limit 10 --json
```

3. Run image-free write rehearsal in a staging project:

```bash
npm run migrate:v50-file-data -- --write --confirm-staging --dealer-id thor-auto --limit 5 --skip-images
```

4. Run image write rehearsal:

```bash
npm run migrate:v50-file-data -- --write --confirm-staging --dealer-id thor-auto --limit 5
```

5. Do not switch backend flags until Step 2T integration tests pass.

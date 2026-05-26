# Nong A v5.0 Step 2T Migration Integration And Backend Switch Plan

Step 2T validates the Step 2S migration tooling before any real staging write. It does not deploy production, does not open Online Beta, does not delete file backend data, and does not switch application backend defaults.

## Migration Emulator / Integration Test Plan

Required migration checks:

1. Dry-run against sample data.
2. Dry-run with `--json`.
3. Dry-run with `--limit`.
4. Dry-run with `--skip-images`.
5. Dry-run with `--skip-listings`.
6. Dry-run with `--skip-drafts`.
7. Missing `dealerId` reports warning and skips the record.
8. Existing target record is skipped and not overwritten by default.
9. Existing target record is planned only when `--overwrite` is explicitly provided.
10. Image paths match Storage rules:
   - `listing-images/{dealerId}/{listingId}/{fileName}`
   - `draft-images/{dealerId}/{draftId}/{fileName}`
11. Optional dealer ID mapping can map a reviewed source dealer to a staging dealer:
   - `--map-dealer-id source-dealer=nonga-dealer`
12. Readiness output reports orphan image folders, records pointing to missing local image files, and duplicate planned Storage path groups.

Automated coverage:

```bash
npm run test:v50-data-migration
npm run test:v50-migration-integration
```

## Emulator Write Test Plan

Automated Firebase Emulator write tests are not enabled yet in this repository because the Firebase emulator project/config and rules-unit-testing harness are not installed as a committed test dependency. Until that is added, Step 2T keeps write validation at the safety gate and local dry-run/mock integration level.

When emulator write tests are added, they must run only against emulator endpoints and must set:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
FIREBASE_PROJECT_ID=nonga-migration-emulator
FIREBASE_STORAGE_BUCKET=nonga-migration-emulator.appspot.com
```

Emulator write cases:

- `--write --confirm-staging --skip-images --limit 1` writes `dealerListings`.
- `--write --confirm-staging --skip-images --limit 1` writes `dealerDrafts`.
- Image-enabled write uploads to `listing-images/{dealerId}/{listingId}/{fileName}`.
- Image-enabled write uploads to `draft-images/{dealerId}/{draftId}/{fileName}`.
- Written docs preserve `dealerId`.
- Re-running without `--overwrite` reports existing docs and skips.
- Re-running with `--overwrite` updates only after explicit flag.
- No test may target a real Firebase project.

## Staging Dry-run Checklist

Before any staging write:

1. Confirm staging Firebase project ID.
2. Set Firebase Admin env for staging:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, or `GOOGLE_APPLICATION_CREDENTIALS`
3. Set `FIREBASE_STORAGE_BUCKET`.
4. Keep app backend defaults unchanged:
   - `NONGA_DATA_BACKEND=file`
   - `NONGA_IMAGE_BACKEND=file`
5. Run full dry-run:

```bash
npm run migrate:v50-file-data -- --dry-run --json
```

6. Check missing `dealerId` count.
7. Check listing, draft, image folder, and image file counts.
8. Check planned Storage paths for both listings and drafts.
9. Run limited dry-run:

```bash
npm run migrate:v50-file-data -- --dry-run --dealer-id thor-auto --limit 1 --json
```

10. If the source dealer ID must be rehearsed as the staging dealer, use a reviewed mapping in dry-run first:

```bash
npm run migrate:v50-file-data -- --dry-run --dealer-id nonga-dealer --map-dealer-id thor-auto=nonga-dealer --limit 1 --json
```

11. If dry-runs look correct, run a limited staging write only:

```bash
npm run migrate:v50-file-data -- --write --confirm-staging --dealer-id nonga-dealer --map-dealer-id thor-auto=nonga-dealer --limit 1 --skip-images
```

12. Then test image write with a very small limit:

```bash
npm run migrate:v50-file-data -- --write --confirm-staging --dealer-id nonga-dealer --map-dealer-id thor-auto=nonga-dealer --limit 1
```

Do not use `--overwrite` in the first staging rehearsal.

## Safety Gates

The migration script has write safety gates:

- `--write` requires `--confirm-staging`.
- `--write` requires a Firebase project ID.
- If images are included, `--write` requires `FIREBASE_STORAGE_BUCKET`.
- Project IDs that look production-like, such as containing `prod`, `production`, or `live`, are blocked unless `--allow-production-write` is explicitly provided.
- The human output logs Firebase project ID, target kind, and Storage bucket before write.
- Missing `dealerId` records are always skipped and reported.
- `--map-dealer-id` only rewrites a reviewed source dealer ID to a target dealer ID; it does not bypass `--write`, `--confirm-staging`, no-overwrite behavior, or production project guards.
- Source `data/*.json` and `data/listing-images/*` are never deleted.

Production guard policy:

- `--allow-production-write` is reserved for a future signed-off production migration.
- Do not use it for staging.
- Do not run production writes before Online Beta sign-off and a reviewed rollback plan.

## Backend Switch Test Plan

After staging migration succeeds, test backend switching in staging only. Do not switch production in Step 2T.

Set:

```bash
NONGA_DATA_BACKEND=firestore
NONGA_IMAGE_BACKEND=firebase-storage
```

Staging checklist:

1. Login as dealer test user.
2. Open dealer inventory.
3. Open draft list.
4. Open an existing draft.
5. Create a new draft/listing.
6. Attach an image.
7. Save draft.
8. Publish draft.
9. Verify marketplace listing renders.
10. Edit listing after publish.
11. Upload or replace image after publish.
12. Delete or hide listing.
13. Confirm dealer A cannot see/write dealer B records or images.
14. Confirm local file backend data is still present.
15. Roll back by restoring:

```bash
NONGA_DATA_BACKEND=file
NONGA_IMAGE_BACKEND=file
```

The file backend must not be deleted until Firestore/Storage-backed staging has passed all dealer flows and rollback has been rehearsed.

## Step 2T Exit Criteria

- `npm run test:v50-migration-integration` passes.
- `npm run test:v50-data-migration` still passes.
- Staging dry-run checklist is documented.
- Backend switch checklist is documented.
- No real Firebase write happens from automated tests.
- Existing Step 2A-2S smoke tests still pass.

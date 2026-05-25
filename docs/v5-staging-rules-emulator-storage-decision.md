# Nong A v5.0 Step 2P Staging Rules Emulator And Storage Decision

This plan prepares Firebase rules validation and the staging storage decision before any staging deployment. It does not deploy production rules, open Online Beta, or change application features.

## 1. Rules Emulator Test Plan

Rules drafts:

- `firestore.rules.draft`
- `storage.rules.draft`

Required emulator/manual cases:

1. Guest can read published listings.
2. Guest cannot write listing docs.
3. Member can read published listings.
4. Member cannot change own `role`, `status`, or `dealerId`.
5. Active dealer with active `dealerMembers/{uid_dealerId}` can write listing/draft docs for their own `dealerId`.
6. Dealer A cannot read or write Dealer B listings, drafts, images, or chat sessions.
7. Dealer A cannot upload to Storage path for Dealer B.
8. Pending or disabled dealer membership cannot write dealer scoped docs or Storage paths.
9. Suspended user is blocked from protected writes.
10. Admin/superadmin can manage according to role, with superadmin reserved for admin/superadmin management.
11. `chatSessions` read/write is limited to the current user scope or active dealer membership.
12. Legacy `chats` is read-only for migration/export; writes remain denied.

Recommended emulator seed personas:

- `guest`: no auth.
- `memberActive`: auth UID with `users/{uid}.role = "member"`, `status = "active"`.
- `dealerAActive`: auth UID with dealer A active membership.
- `dealerBActive`: auth UID with dealer B active membership.
- `dealerPending`: auth UID with pending membership.
- `dealerDisabled`: auth UID with disabled membership.
- `suspendedUser`: auth UID with `status = "suspended"`.
- `adminActive`: auth UID with `role = "admin"`, `status = "active"`.
- `superadminActive`: auth UID with `role = "superadmin"`, `status = "active"`.

Suggested data fixtures:

- Published listing: `dealerListings/listing-published-a`, `dealerId = "dealer-a"`, `listingStatus = "published"`.
- Hidden listing: `dealerListings/listing-hidden-a`, `dealerId = "dealer-a"`, `listingStatus = "hidden"`.
- Dealer B listing: `dealerListings/listing-b`, `dealerId = "dealer-b"`.
- Draft: `dealerDrafts/draft-a`, `dealerId = "dealer-a"`.
- Chat session: `chatSessions/chat-a`, `uid = dealerAUid`, `dealerId = "dealer-a"`, `scope = "dealer"`.
- Legacy chat: `chats/legacy-chat-a`, `uid = dealerAUid`, `dealerId = "dealer-a"`, `scope = "dealer"`.

Manual emulator checklist:

- Firestore:
  - Guest read published listing: allow.
  - Guest create listing: deny.
  - Member read published listing: allow.
  - Member update `users/{uid}.displayName`: allow.
  - Member update `users/{uid}.role`: deny.
  - Member update `users/{uid}.status`: deny.
  - Member update `users/{uid}.dealerId`: deny.
  - Dealer A create/update `dealerListings` where `dealerId = "dealer-a"`: allow.
  - Dealer A create/update `dealerListings` where `dealerId = "dealer-b"`: deny.
  - Dealer A create/update `dealerDrafts` where `dealerId = "dealer-a"`: allow.
  - Dealer A create/update `dealerDrafts` where `dealerId = "dealer-b"`: deny.
  - Pending/disabled dealer membership write dealer scoped doc: deny.
  - Suspended user write protected doc: deny.
  - Admin manage normal user/dealer data: allow.
  - Admin manage admin/superadmin profile: deny.
  - Superadmin manage admin/superadmin profile: allow.
  - Dealer A read/write `chatSessions` for dealer A: allow.
  - Dealer A read/write `chatSessions` for dealer B: deny.
  - Member read/write user-scoped `chatSessions` where `uid == request.auth.uid`: allow.
  - Member read/write another user's `chatSessions`: deny.
  - Legacy `chats` read matching scope: allow.
  - Legacy `chats` create/update/delete: deny.
- Storage:
  - Guest read published listing image path: allow when related listing is published.
  - Guest upload listing image: deny.
  - Dealer A upload `listing-images/dealer-a/{listingId}/{fileName}`: allow for image content type and size limit.
  - Dealer A upload `listing-images/dealer-b/{listingId}/{fileName}`: deny.
  - Dealer A upload non-image content type: deny.
  - Pending/disabled dealer upload dealer image: deny.
  - Admin/superadmin manage listing/draft/chat image paths: allow according to role.

Firebase CLI preparation:

```bash
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use --add <staging-project-id>
npm run test:v50-security-rules
```

Start emulator:

```bash
npx -y firebase-tools@latest emulators:start --only firestore,storage --project <staging-project-id>
```

If automated rules tests are added later, use `@firebase/rules-unit-testing` and keep this manual checklist as the acceptance matrix.

## 2. Staging Rules Deployment Plan

Prepare staging rules from drafts only after emulator validation passes:

PowerShell:

```powershell
Copy-Item firestore.rules.draft firestore.rules
Copy-Item storage.rules.draft storage.rules
```

Bash:

```bash
cp firestore.rules.draft firestore.rules
cp storage.rules.draft storage.rules
```

Confirm target project before deploy:

```bash
npx -y firebase-tools@latest projects:list
npx -y firebase-tools@latest use
```

Deploy only to staging:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,storage --project <staging-project-id>
```

Production safety guard:

- Always pass `--project <staging-project-id>`.
- Never rely on whatever Firebase project is currently active.
- Confirm the staging project ID verbally/in the release note before deploy.
- Keep production project ID out of local default aliases during staging rehearsal if possible.
- Do not use `firebase deploy` without `--project`.
- Do not deploy rules to production in Step 2P.
- Keep `firestore.rules` and `storage.rules` generated from drafts for staging only; do not treat them as final production rules until emulator tests are automated and signed off.

Post-deploy staging verification:

- Run guest/member/dealer/admin smoke tests against the deployed staging URL.
- Verify denied actions return friendly app messages, not raw Firebase/internal details.
- Verify write paths actually create expected staging Firestore docs and Storage objects.

## 3. Storage Mode Decision

No concrete staging hosting target is configured in this repository, so the decision depends on the selected host.

Recommendation for the first internal staging rehearsal:

- Use Option A only if the staging target is a single host with persistent filesystem and `data/` survives restart/redeploy.
- If the target is serverless, ephemeral, multi-instance, or redeploys by replacing the filesystem, do not use Option A for real dealer testing. Move to Option B first.

Option A: keep `data/` and `data/listing-images/` temporarily.

Use only when:

- Staging runs on one host.
- Filesystem is persistent.
- Restart does not clear `data/`.
- Deploy does not clear `data/`.
- Backups or reset policy are understood.

Risks:

- Not suitable for serverless hosting.
- Not suitable for multi-instance scaling.
- Image and inventory data can be lost if disk is ephemeral.
- Backup/restore is manual.

Option B: migrate listing/draft/image storage to Firebase.

Benefits:

- More production-ready.
- Aligns with auth and security rules work.
- Supports multiple users/dealers and future multi-instance deployment.

Costs:

- Larger implementation.
- Requires careful migration and test coverage.
- Touches publish, edit, image upload, marketplace, draft inventory, and delete flows.

If Option B is required, split into new steps:

- Step 2Q: Firestore inventory/draft repository layer behind existing APIs.
- Step 2R: Firebase Storage image upload/migration for listing and draft images.
- Step 2S: Data migration script from `data/marketplace-inventory.json`, `data/dealer-draft-inventory.json`, and `data/listing-images`.
- Step 2T: Emulator/integration tests for Firestore/Storage backed dealer flows.

Step 2Q repository plan:

- `docs/firestore-inventory-repository-v5.md`
- Backend selector: `NONGA_DATA_BACKEND=file|firestore`
- Default remains `file` until image and data migration steps are complete.

Step 2R image repository plan:

- `docs/firebase-image-storage-repository-v5.md`
- Backend selector: `NONGA_IMAGE_BACKEND=file|firebase-storage`
- Default remains `file` until image migration and Firebase Storage integration tests are complete.

Step 2S migration plan:

- `docs/v5-data-image-migration-plan.md`
- Script: `npm run migrate:v50-file-data`
- Default mode is dry-run; `--write` is required for Firestore/Storage writes.
- Source `data/` files and local images are never deleted by the migration.

Step 2T migration integration and backend switch plan:

- `docs/v5-migration-integration-and-backend-switch-plan.md`
- Integration test: `npm run test:v50-migration-integration`
- `--write` requires `--confirm-staging` and production-like project IDs are blocked by default.
- Backend switch to Firestore/Storage remains a staging checklist only.

## 4. Persistent Storage Probe For Option A

Manual probe before real staging rehearsal:

1. Shell into the staging host.
2. Create a probe file:

PowerShell:

```powershell
New-Item -ItemType Directory -Force data
Set-Content data/.staging-persistence-probe "created-at=$(Get-Date -Format o)"
Get-Content data/.staging-persistence-probe
```

Bash:

```bash
mkdir -p data
date -Iseconds > data/.staging-persistence-probe
cat data/.staging-persistence-probe
```

3. Restart the app server without redeploying.
4. Confirm `data/.staging-persistence-probe` still exists.
5. Upload an image through the app and record its `/storage/listings/{listingId}/{fileName}` URL.
6. Restart the app server again.
7. Confirm the uploaded image URL still loads.
8. Perform a staging redeploy.
9. Confirm both the probe file and uploaded image still exist.
10. If any check fails, do not use Option A for real dealer testing.

Expected Option A decision record:

```text
Storage mode: Option A temporary local data
Host: <host name>
Persistent disk: yes/no
Restart preserves data: yes/no
Redeploy preserves data: yes/no
Backup/reset policy: <summary>
Approved for internal staging only: yes/no
```

## 5. Step 2P Exit Criteria

Before staging deploy:

- Rules emulator/manual matrix is completed.
- Staging project ID is confirmed.
- Rules are deployed only to staging.
- Storage mode is explicitly recorded.
- If Option A is used, persistence probe passes.
- If Option B is required, migration steps are scheduled before real dealer testing.

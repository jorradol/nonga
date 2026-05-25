# Nong A v5.0 Step 2K Firestore And Storage Rules Plan

Step 2K adds production security rules drafts only. These files are not deployed in this step.

## Files

- Firestore draft: `firestore.rules.draft`
- Storage draft: `storage.rules.draft`
- Static checklist test: `scripts/test-v50-security-rules.mts`
- Chat history production storage plan: `docs/chat-history-production-storage-v5.md`

Do not deploy these drafts until the Firebase collections and Storage paths are finalized and validated with the Firebase Emulator Suite.

## Actual Collections And Paths Found

Current Firestore usage:

- `users/{uid}` from `AuthContext`, `authService`, and server auth resolution.
- `dealerMembers` queried by `uid` in `serverAuthContext`.
- `cars/{listingId}` in `src/services/cars/index.ts`.
- `chatSessions/{sessionId}` and `chatSessions/{sessionId}/messages/{messageId}` from Step 2L chat history storage.
- Legacy `chats/{chatId}` and `chats/{chatId}/messages/{messageId}` may exist from the pre-Step-2L client path and should be treated as migration/export only.
- `ai_preferences/{scopeKey}` in `chatStore`.

Current non-Firebase production-like data:

- `data/marketplace-inventory.json` is the current server-side marketplace inventory source.
- `data/dealer-draft-inventory.json` is the current server-side dealer draft source.
- `data/listing-images/{listingId}` is served by Express at `/storage/listings/{listingId}`.

Recommended future Firestore/Storage projection:

- `dealerListings/{listingId}` for server marketplace inventory.
- `dealerDrafts/{draftId}` for dealer draft inventory.
- `listingImages/{imageId}` for image metadata.
- `chatSessions/{sessionId}` for production chat session metadata.
- Storage: `listing-images/{dealerId}/{listingId}/{fileName}`.
- Storage: `draft-images/{dealerId}/{draftId}/{fileName}`.
- Storage: `chat-attachments/{dealerId}/{sessionId}/{fileName}`.

## Permission Summary

Guest:

- Can read published listings.
- Can read published listing images.
- Cannot write Firestore or Storage.

Member and premium:

- Can read public marketplace listings.
- Can read their own `users/{uid}`.
- Can update safe profile fields only, such as display name.
- Cannot change `role`, `status`, `dealerId`, or `dealerName`.
- Cannot write dealer listings, drafts, dealer memberships, or dealer image paths.

Dealer:

- Must have `users/{uid}.status == "active"`.
- Must have active `dealerMembers/{uid_dealerId}`.
- Can read/write only dealer-scoped listing/draft/image/chat records for their own `dealerId`.
- Cannot write `dealerId` to another dealer or change an existing listing's `dealerId`.

Admin:

- Must come from `users/{uid}` with `role: "admin"` and `status: "active"`.
- Can manage regular users, dealer memberships, listings, drafts, and images.
- Cannot manage `admin` or `superadmin` profiles in the draft; superadmin is required for those.

Superadmin:

- Must come from `users/{uid}` with `role: "superadmin"` and `status: "active"`.
- Can manage admin/superadmin profiles and delete privileged records.

Suspended/pending/disabled:

- `users/{uid}.status == "suspended"` blocks protected access.
- `users/{uid}.status == "pending"` cannot access dealer/admin-only paths.
- `dealerMembers.status == "pending"` or `"disabled"` cannot write dealer scoped data.

## How Dealer Isolation Works

Firestore draft:

- Uses `dealerMembers/{uid_dealerId}` as the source of dealer access.
- Checks `status == "active"`.
- Requires listing/draft/image docs to contain a `dealerId`.
- Allows dealer writes only when `request.auth.uid + "_" + dealerId` maps to active membership.
- Prevents changing `dealerId` during update with `sameDealerId()`.

Storage draft:

- Uses paths containing `dealerId`.
- Checks the same active membership document before read/write/delete.
- Allows public reads only when the related listing is published in `dealerListings` or `cars`.
- Requires uploaded files to be `image/*`.
- Limits uploads to 5 MB for listing, draft, and chat images, and 2 MB for avatars.

## How Role Self-Escalation Is Blocked

`users/{uid}` self-update:

- Users can read their own profile.
- Users can update only safe fields.
- Rules reject self-updates touching `role`, `status`, `dealerId`, `dealerName`, `createdAt`, or `uid`.
- Admin can manage normal users.
- Superadmin is required for admin/superadmin profile management and deletion.

Backend protection from earlier steps still applies: API routes resolve role and dealer scope from Firebase token plus server-read profile/membership, never frontend headers alone.

## Chat Rules Draft

Step 2L starts the production chat history storage shape while keeping local/mock mode on scoped localStorage.

Draft coverage:

- `chatSessions/{sessionId}` and `messages` support owner UID or dealer membership access.
- Chat records store explicit `uid`, `dealerId`, `scope`, `storageScopeKey`, and attachment metadata.
- Dealer chat access requires active membership for the chat `dealerId`.
- Admin/superadmin access follows active server profile role.
- Legacy `chats/{chatId}` is read-only in the draft so old data can be exported/migrated without accepting new writes.

Before deploying chat rules, export or migrate old `chats` records into `chatSessions` and verify indexes in the Firebase Emulator Suite.

## Emulator/Test Plan

Static test:

```bash
npm run test:v50-security-rules
```

Manual emulator plan before deploying:

1. Guest can read a published listing.
2. Guest cannot write any listing.
3. Member can read/update safe profile fields only.
4. Member cannot update `role`, `status`, `dealerId`, or `dealerName`.
5. Dealer A with active membership can write dealer A listing/draft/image metadata.
6. Dealer A cannot write dealer B listing/draft/image metadata.
7. Dealer A cannot upload to Storage path for dealer B.
8. Pending or disabled dealer membership cannot write dealer scoped data.
9. Admin can manage regular users and dealer memberships.
10. Only superadmin can manage admin/superadmin users.
11. Suspended user cannot access protected paths.
12. Dealer A cannot read or write `chatSessions` for dealer B.
13. Member can read only chat sessions where `uid == request.auth.uid`.
14. Message attachments persist metadata only; binary files remain in Storage.

## Before Deploying

- Decide final Firestore collection names for marketplace listings and dealer drafts.
- Migrate server file-backed inventory/drafts to Firestore or keep rules as future projection only.
- Export or migrate legacy `chats` into `chatSessions`.
- Move listing images from local `/storage/listings` to Firebase Storage paths with `dealerId`.
- Add Firebase Emulator Suite tests using `@firebase/rules-unit-testing`.
- Confirm indexes for `dealerMembers.uid`, listings by `dealerId`, and published listing filters.
- Keep `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false` until user onboarding is production-ready.

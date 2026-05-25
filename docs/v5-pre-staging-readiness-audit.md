# Nong A v5.0 Pre-Staging Production Readiness Audit

Audit date: 2026-05-25

Latest audited commit before this document: `8b625a6` (`feat: add dealer scoped chat history storage for v5`)

This audit does not deploy, tag, migrate production data, or add product features.

## Executive Verdict

Nong A v5.0 is ready for an internal staging rehearsal after the staging environment is configured, but it is not yet ready for public Online Beta with real dealers.

Blockers before staging with real Firebase users:

- Configure real Firebase Web Config and Firebase Admin credentials in staging. The committed `firebase-applet-config.json` still contains placeholder/fake values by design.
- Deploy Firestore/Storage rules only after emulator validation. The current rules files are drafts, not deployed production rules.
- Remove user-facing technical chat error details before inviting non-technical users. Resolved in Step 2N by replacing the chat fallback with a generic Thai message.
- Confirm persistent storage for server file data and local image files if staging is hosted outside a stable local/dev machine.

Recommended tag: do not tag `v5.0-pre-staging` yet. Use `v5.0-pre-staging-rc1` only after the blockers above are resolved and one successful staging smoke run is recorded.

## 1. Git And Version

Current branch:

- `feature/chat-image-attachment-v1`

Current status at audit start:

- Clean worktree.

Recent commits:

- `8b625a6` `feat: add dealer scoped chat history storage for v5`
- `2a5db12` `docs: add firestore and storage security rules plan for v5`
- `c4366c2` `chore: document and seed firebase role test users`
- `3466e8f` `feat: add real user profile and dealer membership resolution`
- `d3f3449` `feat: configure firebase web auth for v5`

Version/tag recommendation:

- Do not tag as final pre-staging yet.
- Tag after env and rules validation, not before: `v5.0-pre-staging-rc1`.

## 2. Environment Variables

Required before staging:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`, normally `(default)`
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY` if real AI responses are required
- `APP_URL` for the staging URL
- `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`

Beta compatibility env, only if staging keeps beta token flows:

- `NONGA_BETA_DEALER_ID`
- `NONGA_DEALER_TOKEN_MAP`
- Explicit `NONGA_DEALER_API_TOKEN` / `NONGA_ADMIN_API_TOKEN` only if needed; do not use dev defaults in production.
- Explicit `VITE_NONGA_DEALER_API_TOKEN` / `VITE_NONGA_ADMIN_API_TOKEN` only for a controlled beta-token staging mode.

Local/dev-only env, not for production staging:

- `NONGA_DEV_FIREBASE_TOKEN_MAP`
- `NONGA_DEV_USER_PROFILE_MAP`
- `NONGA_DEV_DEALER_MEMBERSHIP_MAP`
- `NONGA_TEST_*` seed values after the seed step is complete.

Current repo state:

- `.env.example` lists the required values.
- `firebase-applet-config.json` still has fake placeholder config. This is acceptable for local dev/mock mode only.
- Public signup is closed by default with `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`.

## 3. Firebase Readiness

Ready:

- Firebase Web Config can be overridden from `VITE_FIREBASE_*`.
- Backend Firebase token verification exists.
- `users/{uid}` and `dealerMembers/{uid_dealerId}` schemas are documented and seedable.
- Limited seed/test scripts exist for member/dealer/admin test users.
- Public signup remains disabled by default.

Not ready until completed:

- Real staging Firebase Web Config is not present in the repo, and should not be committed.
- Firebase Admin credentials must be supplied by staging secrets.
- Firestore/Storage rules are still drafts. They must be tested in emulator and deployed to the staging Firebase project before using real users.
- Create real Firebase Auth test users, then seed matching `users/{uid}` and `dealerMembers/{uid_dealerId}` docs.

Rules deployment checklist:

- Run emulator tests for `users`, `dealerMembers`, listings, images, and `chatSessions`.
- Confirm indexes for `dealerMembers.uid`, listing filters, and chat session queries.
- Migrate/export legacy `chats` if any exist.
- Deploy rules to staging only, not production.

## 4. Security

Ready:

- Production fake Firebase config is detected as invalid.
- Sandbox role switcher and Thor Auto Demo tools are gated by dev/mock mode.
- Default dev dealer/admin tokens are blocked in production helpers.
- Dealer APIs use server auth context and reject mismatched `X-Dealer-Id`.
- Legacy owner routes are guarded and no longer trust raw `X-Owner-Id` in production.
- Frontend legacy listing calls were centralized into secure dealer API/service paths.
- Firestore/Storage rules draft covers role self-escalation, dealer isolation, image paths, and chat sessions.

Remaining security work:

- Deploy tested rules to staging before real users.
- Continue moving remaining beta-token compatibility toward Firebase ID token headers where practical.
- Keep technical chat details out of user-visible messages; Step 2N replaced the known chat fallback with a generic Thai message.

## 5. Data Storage

Current data sources:

- Marketplace inventory: `data/marketplace-inventory.json`
- Dealer drafts: `data/dealer-draft-inventory.json`
- Listing images: `data/listing-images/{listingId}`, served at `/storage/listings/{listingId}`

Staging recommendation:

- Acceptable for internal single-instance staging only if the host has persistent disk and backups.
- Not safe for multi-instance, serverless ephemeral storage, or public Online Beta with real dealer uploads.

Before public Online Beta:

- Move marketplace inventory and dealer drafts to Firestore or a managed database.
- Move listing images to Firebase Storage or another persistent object store.
- Keep local file storage only as dev compatibility.

## 6. Chat History

Ready:

- Local/mock mode uses dealer/user scoped localStorage keys:
  - `nong-a-chat-sessions:{storageScopeKey}`
  - `nong-a-chat-messages:{storageScopeKey}`
  - `dealer:{dealerId}:{uid}` or `user:{uid}`
- Production schema is prepared:
  - `chatSessions/{sessionId}`
  - `chatSessions/{sessionId}/messages/{messageId}`
- Selecting a left-sidebar session validates scope, loads messages, updates `activeSessionId`, highlights the active row, and scrolls to the latest message.
- `savedDraftId` persists on message and session.
- Attachment metadata persists without browser-only `previewUrl` / `previewDataUrl`.
- Dealer A cannot load dealer B session in the storage service test.

Manual staging checks still needed:

- Browser close/reopen retains chat history with real Firebase Auth.
- Left sidebar switching works after real Firebase login.
- Old `chats` records, if present, can be exported/migrated to `chatSessions`.
- Image attachment thumbnails show correctly after reload when permanent image URLs exist.

## 7. UX / UI

Ready:

- RouteGuard and auth unavailable messages are Thai-friendly.
- Public signup disabled message is Thai-friendly.
- Dealer pending/suspended states have Thai messages.
- Chat to Draft, image attachments, draft save, edit, publish, marketplace, and delete flows pass final smoke.
- Saved draft button remains available in chat bubbles.
- Delete flow still has confirmation/popup coverage in final smoke.

Fixed in Step 2N:

- `useChat` now displays a Thai-friendly generic message when AI streaming fails and logs details only to console.

Dev-only UI note:

- `Draft ID` is guarded by `import.meta.env.DEV`, so it should not show in a production build. Verify this in staging.

## 8. Mobile And Responsive Checklist

Manual mobile checks after staging:

- Marketplace list and car detail pages.
- Dealer Portal dashboard navigation.
- Chat sidebar open/close, session switching, composer, attachments, and bottom buttons.
- Draft edit page and image sections.
- Published listing image edit flow.
- Bottom action buttons are not hidden behind mobile browser chrome.
- Login/register/profile screens.
- Admin guard and access-denied screens.

## 9. Build Warnings

Known warnings:

- Large frontend chunk over 500 kB.
- `import.meta` warning in the CommonJS server bundle for `marketplaceCarMapper`.
- Vite dynamic import warnings for modules also imported statically.

Assessment:

- These warnings do not block internal staging.
- Treat them as post-staging optimization unless runtime evidence shows a server issue.

Post-staging optimization:

- Split large frontend chunks.
- Review server bundle output format or isolate `import.meta` usage.
- Clean up dynamic/static import overlap.

## 10. Final Staging Smoke Plan

Run this on staging with real Firebase test users:

1. Guest can view marketplace and car detail.
2. Guest cannot enter Dealer Portal and sees Thai login/permission messaging.
3. Member logs in and can open profile.
4. Member cannot enter Dealer Portal.
5. Dealer logs in and enters Dealer Portal.
6. Dealer chats with Nong A.
7. Dealer attaches images in chat.
8. Dealer saves a draft from chat.
9. Dealer edits draft fields.
10. Dealer uploads/edits images.
11. Dealer publishes listing.
12. Listing appears in marketplace.
13. Dealer edits images after publish.
14. Dealer deletes listing with confirmation.
15. Chat history persists after reload and session switching.
16. Dealer A cannot access Dealer B inventory, drafts, images, or chat sessions.
17. Admin guard works for admin and blocks dealer/member.
18. Suspended user is blocked.

## Issue Classification

Blockers before staging with real users:

- Real staging Firebase Web/Admin env not configured yet.
- Firestore/Storage rules draft not emulator-tested/deployed to staging.
- User-visible technical chat error detail was fixed in Step 2N; verify during staging.
- Persistent storage plan required if staging host does not preserve `data/`.

Fix after staging rehearsal:

- Migrate file-backed inventory/drafts/images to Firestore/Storage.
- Convert remaining beta token compatibility to Firebase ID token-first fetches.
- Add automated Firebase rules emulator tests.

Optimization after production:

- Bundle/code splitting.
- Server CJS `import.meta` warning cleanup.
- Firebase indexes and query performance tuning after real data volume is known.

## Recommended Next Step

Run a small "Step 2N - Staging Environment Setup" pass:

- Configure staging env/secrets.
- Create Firebase Auth test users.
- Seed `users` and `dealerMembers`.
- Emulator-test and deploy rules to staging.
- Verify the fixed technical chat error message during staging.
- Run the staging smoke checklist above.

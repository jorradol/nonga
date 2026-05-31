# Nong A v5.4.4f — Security Step B: Firebase Rules Emulator Tests

Automated rules tests only. **Does not deploy** Firestore/Storage rules to staging or production.

## Commands

```bash
npm run test:v544f-firestore-rules
npm run test:v544f-storage-rules
npm run test:v544f-security-rules-emulator
```

Each script starts the Firebase Emulator Suite via `firebase emulators:exec`, loads `firestore.rules` / `storage.rules` from the repo root, seeds fixtures with rules disabled, then runs allow/deny cases with `@firebase/rules-unit-testing`.

**Project ID:** `demo-nonga-v544f` (demo project — not production/staging).

**Prerequisites:** JDK **21+** installed (Firestore emulator; firebase-tools no longer supports Java &lt; 21), Node 20+.

## Files

| Path | Role |
|------|------|
| `scripts/emulator-rules/v544f-personas.mts` | UIDs, dealer IDs, doc IDs |
| `scripts/emulator-rules/v544f-test-env.mts` | `initializeTestEnvironment`, assert helpers |
| `scripts/emulator-rules/v544f-firestore-seed.mts` | Admin seed for users, memberships, listings, chats |
| `scripts/test-v544f-firestore-rules.mts` | Firestore allow/deny matrix |
| `scripts/test-v544f-storage-rules.mts` | Storage allow/deny matrix |

## Manual emulator (optional)

```bash
npx firebase emulators:start --only firestore,storage --project demo-nonga-v544f
```

Then run inner scripts only if you export emulator env vars (prefer npm scripts above).

## Known rules gaps (v5.4.4f — addressed in v5.4.4g C1, not deployed)

1. ~~Suspended user self-profile update~~ — fixed: self-update requires `isActiveUser()`.
2. ~~Dealer membership vs user status~~ — fixed: `hasActiveDealerMembership()` requires `isActiveUser()`.
3. ~~`ai_preferences` broad rule~~ — fixed: scoped read/write helpers for `user:{uid}` and `dealer:{dealerId}:{uid}`.

## Not in scope (Step B / C1)

- Rules deploy to staging/production
- Changes to `firestore.rules` / `storage.rules` content
- Seller/buyer/dealer application logic changes

See `docs/v5-staging-rules-emulator-storage-decision.md` for the full manual acceptance matrix.

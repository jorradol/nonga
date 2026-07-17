# Isolated Staging Deploy Guard Spec

**Status:** SAFETY REVISION READY LOCALLY — OWNER REVIEW REQUIRED  
**Date:** 2026-07-17

## Purpose

ป้องกัน deploy/preflight ไปผิด environment ระหว่าง Production (`nonga-ce93c` / `a.nongbot.org`) กับ isolated staging (`nonga-staging-2026` / `*.web.app`)

## Files

| File | Role |
|------|------|
| [scripts/isolated-staging-guard-lib.mjs](../scripts/isolated-staging-guard-lib.mjs) | Shared project/URL/approval guards |
| [scripts/preflight-isolated-staging.mjs](../scripts/preflight-isolated-staging.mjs) | Read-only preflight for isolated URL |
| [scripts/preflight-isolated-staging-lib.mjs](../scripts/preflight-isolated-staging-lib.mjs) | Isolated staging constants |
| [scripts/deploy-guard-isolated-staging.mjs](../scripts/deploy-guard-isolated-staging.mjs) | Pre-deploy guard (requires approval phrase) |
| [firebase.isolated-staging.json](../firebase.isolated-staging.json) | Hosting config for staging project |
| [.firebaserc.isolated-staging.example](../.firebaserc.isolated-staging.example) | Example aliases (do not replace `.firebaserc` until Phase 1) |
| [scripts/provision-isolated-staging-phases.mts](../scripts/provision-isolated-staging-phases.mts) | Phase 1–10 dry-run orchestrator |
| [scripts/build-isolated-staging-hosting.mts](../scripts/build-isolated-staging-hosting.mts) | Vite build guard for isolated staging project |
| [scripts/seed-isolated-staging-fixtures.mts](../scripts/seed-isolated-staging-fixtures.mts) | Synthetic listing seed plan (dry-run default) |
| [docs/NONGA_ISOLATED_STAGING_OWNER_DECISION_PACKET.md](./NONGA_ISOLATED_STAGING_OWNER_DECISION_PACKET.md) | Owner approval sign-off packet |
| [docs/examples/staging-synthetic-fixture-manifest.json](./examples/staging-synthetic-fixture-manifest.json) | Synthetic fixture manifest |

## npm scripts

```bash
npm run test:isolated-staging-guard
npm run preflight:isolated-staging
npm run guard:deploy:staging -- --project <OWNER_APPROVED_ISOLATED_PROJECT_ID>
npm run plan:isolated-staging:provision
npm run build:isolated-staging:hosting
npm run seed:isolated-staging-fixtures -- --dry-run --json
```

## Guard rules

### Staging deploy

1. Project/site/service/region/URL/bucket/Firestore/Auth/API identities must all be explicit and resolved.
2. No runtime fallback to `.firebaserc`, default project, or proposed values.
3. Production identifiers are denied: `nonga-ce93c`, `a.nongbot.org`, Production site/buckets/Auth domains, and live service `nonga-staging`.
4. `firebase.isolated-staging.json` → explicit isolated Hosting site.
5. `/api/**` rewrite → `nonga-staging-api-2026` @ `asia-southeast1`.
6. Frontend/API/Auth/Firestore project IDs must be identical.
7. Cloud Run service must already exist in the explicit isolated project; otherwise deploy guard and preflight fail.
8. Gate E phrase is required but cannot override any target/isolation failure.
9. `/api/health` must identify the isolated project and explicitly report signup/lead capture OFF.

### No Production capability

The isolated-staging guard accepts no Production mode, contains no Production approval phrase,
and does not call a Production deployment script. Any future Production guard is a separate scope.

## Required target environment

- `NONGA_ISOLATED_STAGING_PROJECT_ID`
- `NONGA_ISOLATED_STAGING_HOSTING_SITE`
- `NONGA_ISOLATED_STAGING_CLOUD_RUN_SERVICE`
- `NONGA_ISOLATED_STAGING_REGION`
- `NONGA_ISOLATED_STAGING_URL`
- `NONGA_ISOLATED_STAGING_STORAGE_BUCKET`
- `NONGA_ISOLATED_STAGING_FIRESTORE_DATABASE_ID`
- `NONGA_ISOLATED_STAGING_FIRESTORE_PROJECT_ID`
- `NONGA_ISOLATED_STAGING_API_PROJECT_ID`
- `NONGA_ISOLATED_STAGING_AUTH_PROJECT_ID`
- `NONGA_ISOLATED_STAGING_AUTH_TENANT_ID`

## Legacy naming

- `npm run preflight:staging` — validates **Production** URL `a.nongbot.org` (historical name)
- `npm run preflight:isolated-staging` — validates **isolated** staging after provisioning

## Production protection

ห้ามแทนที่ `.firebaserc`, ใช้ default alias, หรือ deploy ไป Production จากชุดนี้ทุกกรณี

## Approval gates

- Gate A: keep planning/guard files
- Gate B: create empty isolated project
- Gate C: link Billing and enable isolated services
- Gate D: seed synthetic fixtures
- Gate E: deploy isolated API and Hosting

หนึ่ง Gate ไม่เปิดสิทธิ์ของ Gate อื่น และ exact mutation commands จะเสนอใหม่หลัง Gate ที่เกี่ยวข้องได้รับอนุมัติเท่านั้น

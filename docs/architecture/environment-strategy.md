# Nonga Environment Promotion Strategy

Status: Draft for Owner review (Production Foundation Phase A–B)
Scope: Read-only environment map + local Release Candidate hardening. No cloud
state was changed while producing this document.

> This document contains no secrets, tokens, UIDs, or personal data. It records
> only resource identifiers (project / service / site names) and policy.

## 1. Environment definitions

The system is defined as three tiers plus a local developer tier.

| Tier | Purpose | Data classification |
| --- | --- | --- |
| Fixture / Test | UI-only smoke and demo with synthetic data. No real backend, no Cloud Run, no external network. | Synthetic only |
| Canonical Staging | Release Candidate acceptance before Production. Real backend, controlled pilot flags. | Staging (non-public rollout data) |
| Production (future) | Separate environment for real end users. Does not exist yet. | Real user data |
| Local | Developer machine / mock mode. | Mock only |

## 2. Confirmed resource ownership (evidence-based)

Verified from repository configuration and read-only `gcloud run` inspection on
2026-07-19.

### 2.1 Fixture / Test
- Firebase Hosting site: `nonga-staging-2026` (config `firebase.hosting-only-fixture.json`).
- URL: `nonga-staging-2026.web.app`.
- Cloud Run: none (no `/api` rewrite; `**` -> `/index.html` only).
- Headers: `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`.
- Build: `VITE_NONGA_UI_FIXTURE=true` (synthetic cars, `installFixtureNetworkGuard`
  blocks external hosts including Firebase, Gemini, dicebear, unsplash).
- Data: synthetic only. Must never touch real Auth / Firestore / Storage.

### 2.2 Canonical Staging
- Firebase project: `nonga-ce93c`.
- Firebase Hosting site: `nonga-ce93c` (config `firebase.json`).
- Public URL: `https://a.nongbot.org` (canonical staging URL today).
- Backend Cloud Run service: `nonga-staging` (region `asia-southeast1`),
  currently serving revision `nonga-staging-00224-mpp` at 100% traffic.
- Hosting rewrites `/api/**` and `/storage/listings/**` -> Cloud Run `nonga-staging`.
- Auth / Firestore / Storage: project `nonga-ce93c` (`firestore.rules`, `storage.rules`).
- Runtime identity: the `nonga-staging` service sets an explicit `NONGA_DEPLOY_ENV`
  environment variable (value not inspected / redacted).

### 2.3 Production (future — not provisioned)
- No dedicated Production Firebase / GCP project exists yet.
- `firebase.production.json` currently still targets project/site `nonga-ce93c`
  and rewrites `/api` to the `nonga-staging` Cloud Run service. This is the same
  environment as Canonical Staging today (see Risk R1).
- Owner-approved future direction: create a fully separate Production environment
  (Firebase / GCP / Auth / Firestore / Storage / backend). Only then does
  `a.nongbot.org` move to Production and Canonical Staging move to a team-only URL.

### 2.4 `nonga-api` service (classification pending — see Section 6)
- Cloud Run service `nonga-api` in `nonga-ce93c` / `asia-southeast1`, revision
  `nonga-api-00003-fg4` at 100% traffic; URL on `*.run.app`.
- Env var names only (values redacted): `AUTO_SEED`, `DB_PATH`, `GEMINI_API_KEY`.
- Default compute service account. Last deployed 2026-05-17 (older than
  `nonga-staging`'s 2026-07-16 revision).
- Not referenced by any Firebase Hosting rewrite in the repository.

## 3. Promotion direction

```
Local  ->  Fixture/Test  ->  Canonical Staging  ->  Production (future)
                (UI only)        (RC acceptance)        (real users)
```

- Promotion always flows one direction. Artifacts are rebuilt for the target
  environment; a Fixture build is never promoted.
- A Release Candidate is accepted on Canonical Staging, then rebuilt/configured
  for Production once Production exists.

## 4. Data-isolation rules

- Fixture data (synthetic users, cars, dealers, admin illustrations) must never be
  merged into Staging or Production.
- Fixture configuration or build artifacts must never be promoted to Production.
- Production real user data must never flow back into Staging or Fixture.
- Cross-project resource use is prohibited: Fixture must not use Production or
  Staging Auth / Firestore / Storage.

## 5. Configuration ownership & environment identity

- Canonical explicit environment keys (existing in the codebase):
  `NONGA_RUNTIME_ENV` (primary) then `NONGA_DEPLOY_ENV` (fallback).
- Environment identity must be **explicit** and **fail-closed**. It must not be
  derived from `APP_URL`, Firebase project name, or domain substring matching.
- Missing / invalid / unknown environment value resolves to the strictest tier
  (Production-strict), which disables user-visible AI by default.
- Frontend checks are UX-only. Real authorization is enforced server-side.

## 6. `nonga-api` disposition analysis

- Role: appears to be an early/legacy prototype API (file/SQLite-style `DB_PATH`
  with `AUTO_SEED`), superseded by the full `nonga-staging` backend which carries
  Firebase Admin, lead-pilot, and AI-control configuration.
- Traffic/dependencies: no Firebase Hosting route points to `nonga-api`; the
  canonical hosting rewrites target `nonga-staging`. Direct `*.run.app` callers
  cannot be ruled out from repository evidence alone.
- Overlap: functionally overlaps `nonga-staging` (both expose an API + Gemini key)
  but `nonga-api` lacks the current backend's data/lead/AI wiring.
- Recommendation (future, non-binding — **no change made now**): treat as a
  retirement candidate. Before retiring, verify zero inbound traffic from Cloud Run
  request logs over a monitoring window and confirm no external client hardcodes its
  `*.run.app` URL. Until then, retain but do not extend.

## 7. Production safety defaults

- User-visible AI: OFF by default; Production requires an explicit server-side UID
  allowlist and is otherwise closed.
- Lead Capture, Public Signup, Dealer messaging: closed by default; opened only by
  explicit Owner-approved configuration.
- Emergency kill switch remains available and fails closed.
- Secrets are loaded server-side (Google Secret Manager); never bundled client-side.

## 8. Rollback principles

- Hosting: keep the previous release; roll back by re-releasing the prior artifact.
- Cloud Run: keep previous revision available; roll back by shifting traffic to the
  last-known-good revision (no data mutation).
- No rollback step may mutate or merge environment data across tiers.

## 9. What must never be promoted from Fixture

- Synthetic users / dealers / cars / comments / admin illustrations.
- `VITE_NONGA_UI_FIXTURE=true` builds and fixture-named assets.
- Fixture network-guard stubs and any `*.web.app` fixture host wiring.

## 10. Known risks / NEED REVIEW

- **R1 (High):** `firebase.production.json` and the `production` / `staging` aliases
  in `.firebaserc` all resolve to `nonga-ce93c`. "Production" is not yet a separate
  environment. Provisioning Production is out of scope for this phase and requires a
  separate Owner-approved plan.
- **R2 (Medium):** Environment identity must be verified on the live `nonga-staging`
  service (`NONGA_DEPLOY_ENV` should equal `staging`). This is a configuration
  dependency, not changed here.
- **R3 (Low):** `nonga-api` retains 100% traffic on its own URL with no repo-visible
  consumer; disposition pending traffic-log verification.

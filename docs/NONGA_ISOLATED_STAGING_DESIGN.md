# Nong A — Isolated Staging Design and Naming Standard Packet

**Document type:** Documentation-only design  
**Status:** READY FOR OWNER REVIEW (no resources created)  
**Official Production URL:** https://a.nongbot.org  
**Production project (current live):** `nonga-ce93c`  
**Packet date:** 2026-07-15  
**Related discovery:** Existing isolated staging was not found; what was called “staging” is Production.

> This document explains the plan in plain language.  
> It does **not** create Staging, rename files, change DNS, or deploy anything.

---

## 1) Executive summary

**Production** is the real system customers use today: https://a.nongbot.org  
If something breaks there, real buyers and dealers are affected.

**Staging** should be a separate practice area — like a rehearsal room — where we can test changes before customers see them.

**Today we do not have a safe separate Staging.**  
The project, database, login system, and website that older documents called “staging” (`nonga-ce93c`, Cloud Run service `nonga-staging`, and https://a.nongbot.org) are the live Production system.

**Why we need a new Staging**

- Testing and Production currently share the same place.
- A future test or config change can accidentally affect real customers.
- Lead Capture was turned OFF on the live system for safety, but that is not a substitute for a separate Staging.

**What this work does *not* do**

- Does not create a new Google/Firebase project
- Does not turn on billing for a new project
- Does not deploy, rename, move, or delete any existing files
- Does not change https://a.nongbot.org

---

## 2) Production boundary

| Item | Value |
|---|---|
| Official Production URL | https://a.nongbot.org |
| Production Firebase/GCP project | `nonga-ce93c` |
| Production Cloud Run service (current name) | `nonga-staging` *(misnamed — see §17)* |
| Production region | `asia-southeast1` |
| Production Hosting site | `nonga-ce93c` (https://nonga-ce93c.web.app), custom domain `a.nongbot.org` |

**Hard rules**

1. Production must not be modified by Staging-creation work.
2. Staging must not share with Production:
   - Project
   - Hosting site
   - Cloud Run service / traffic
   - Firestore database
   - Authentication users
   - Storage bucket
   - Lead queue / lead data
   - Secrets
   - Logs (use Staging project log sink only)
3. Forbidden reuse as Staging: `nonga-ce93c`, `nongbot-org`, `nongbot`, legacy `nonga-api`, and Hosting preview channels inside the Production project.
4. Do not use `nonga-car.com` in this plan. It is not a Nong A Production URL.

---

## 3) Proposed Staging names

| Role | Proposed name |
|---|---|
| Display name | **Nong A Staging** |
| Preferred project ID | **`nonga-staging-2026`** |
| Cloud Run service | **`nonga-staging`** *(inside the new project only)* |
| Region | **`asia-southeast1`** |
| Initial Hosting URL | **`https://nonga-staging-2026.web.app`** (pattern: `https://<staging-project-id>.web.app`) |

### Read-only project ID check (2026-07-15)

Checked only with list/describe. Nothing was created or reserved.

| Candidate ID | Visible in account project list? | Describe result |
|---|---|---|
| `nonga-staging-2026` | No (not among `nonga-ce93c`, `nongbot`, `nongbot-org`) | No access / may not exist (GCP opaque response) |
| `nonga-a-staging-2026` | No | Same |
| `nonga-staging-isolated` | No | Same |

**Alternatives (max 2) if preferred ID is taken at create time**

1. `nonga-a-staging-2026` — keeps brand “Nong A” and year marker  
2. `nonga-staging-isolated` — stresses isolation from Production  

**Disclaimer:** This check is **not** a reservation guarantee. Google project IDs are globally unique. Availability is proven only when the create action succeeds in a future Owner-approved Phase 1.

**Name clash note:** Production’s live Cloud Run service is already called `nonga-staging` inside project `nonga-ce93c`. The new Staging project may still use service name `nonga-staging` because services are scoped per project. Operators must always qualify commands with `--project=<id>`. Renaming the Production service is a separate high-risk job (see §17).

---

## 4) Staging components

| Component | Production today | Staging proposed | How we keep them separate | Proof after create |
|---|---|---|---|---|
| Firebase/GCP project | `nonga-ce93c` | `nonga-staging-2026` (or alt) | Different project ID; never point Staging tools at `nonga-ce93c` | `gcloud config` / Firebase `use` shows Staging ID only |
| Hosting | site `nonga-ce93c` + `a.nongbot.org` | new site on Staging project; URL `https://<staging-project-id>.web.app` | No custom domain shared with Production; no rewrite to Production Cloud Run | DNS of Staging URL ≠ `a.nongbot.org`; hosting rewrite target = Staging service |
| Cloud Run | service `nonga-staging` on `nonga-ce93c` | service `nonga-staging` on Staging project | Different project; no traffic sharing | `gcloud run services describe --project=<staging>` |
| Firestore | `(default)` on `nonga-ce93c` | new DB on Staging project | No Production project ID in Staging `FIREBASE_PROJECT_ID` | Health/`FIREBASE_PROJECT_ID` = Staging; sample read cannot see Production listing IDs unless intentionally seeded |
| Authentication | Firebase Auth on `nonga-ce93c` | Auth on Staging project | Separate user pool; no copy of Production users | Staging login users do not exist on Production Auth |
| Storage | `nonga-ce93c.firebasestorage.app` | Staging bucket | Image URLs use Staging bucket host only | Marketplace image hosts match Staging bucket |
| Secrets | Secret Manager on `nonga-ce93c` | Separate secrets on Staging project | Never bind Production secret names/projects into Staging | Secret parent project = Staging |
| AI provider | Gemini (Production secrets / allowlists) | Gemini via **Staging** secret only | Staging key ≠ Production key; allowlist only Owner/testers | Env points at Staging secret; Production secret unused |
| Lead system | Capture **OFF** on live | Capture **OFF** by default | Separate Firestore collections; kill switch OFF | `/api/health` → `leadCaptureEnabled=false` |
| Dealer Notification | Must stay OFF for Staging tests | **OFF** | No Production dealer contacts; notify flags OFF | No notification send evidence in Staging logs |
| Logs | Cloud Logging on `nonga-ce93c` | Cloud Logging on Staging project | Log explorer filtered by Staging project | No Staging request logs under Production project |
| Budget/cost controls | Existing Production spend | Staging budgets/alerts on Staging billing link | Separate project billing + alert | Budget alert configured before AI enable (Phase 7) |

---

## 5) Default safety settings

Staging must start with all of the following:

| Setting | Required default |
|---|---|
| Lead Capture | **OFF** (`NONGA_LEAD_CAPTURE_ENABLED` not `true`) |
| Public Signup | **OFF** |
| Dealer Notification | **OFF** |
| Production traffic | **Untouched** |
| Access | **Owner allowlist only** (+ approved testers) |
| Legacy public Gemini | **OFF** |
| AI emergency kill switch | Present and usable (`NONGA_AI_EMERGENCY_KILL_SWITCH`) |
| Real seller send | **Forbidden** |
| Real lead create | **Forbidden** |
| Real customer accounts | **Forbidden** |
| Production secrets | **Forbidden** |
| Calls to Production Firestore/Storage | **Forbidden** |

---

## 6) Test data design

**Do not copy from Production**

- Leads
- User accounts
- Personal data
- Full VIN
- Full license plates
- Phone numbers

**Allowed**

- Owner-approved synthetic / test vehicle data only
- Images with explicit permission to use in Staging
- Records clearly labeled as test data (e.g. title or description contains `TEST` / `ข้อมูลทดสอบ`)

### Minimum test fleet (proposal — not created in this packet)

Enough inventory to exercise marketplace + frozen conversational flows without Production data:

| Item | Purpose | Notes |
|---|---|---|
| Toyota Corolla 2020 (test) | Pilot-like compare / year fit | Synthetic ids; test dealer display label |
| Toyota Corolla 2021 (test) | Pair for Q4-style compare | Distinct from Production listing ids |
| Family / SUV style sample | Support Q2-style “family use” talk | One vehicle is enough if descriptions are clear |
| Budget / value sample | Support Q1/Q3 budget talk | Price set for test scenarios only |
| Optional 5th filler listing | Marketplace density | Only if Q/B flows need more variety |

**Suggested minimum count:** **4–5** test vehicles (not 15).  
Production currently shows 15 cars; Staging does not need to mirror that number.

Frozen flows **Q1–Q4** and **B1+B2** must keep current behavior contracts; this packet does not change those flows. Staging data should support testing them, not rewrite them.

**This packet does not copy or create any vehicle data.**

---

## 7) AI design for Staging

| Rule | Design |
|---|---|
| Secrets | Staging-only Gemini (or AI) secret in Staging Secret Manager |
| Audience | AI features only for Owner / allowlisted testers |
| Kill switch | `NONGA_AI_EMERGENCY_KILL_SWITCH` available; document ON/OFF drill |
| Cost control | Daily/monthly budget envs + GCP budget alert before broad AI use |
| Data scope | Inventory answers read **Staging Firestore/Storage only** |
| Production data | Hard ban — Staging config must never point `FIREBASE_PROJECT_ID` / bucket at `nonga-ce93c` |
| Fallback | Deterministic fallback paths remain available when AI is blocked |
| Frozen flows | Q1–Q4 and B1+B2 unchanged by Staging setup |
| Legacy public Gemini | Remains OFF |

---

## 8) Future promotion to Production

Simple promotion path (after Staging exists and is frozen):

1. Develop and test on Staging only.  
2. Owner verifies in a browser on the Staging URL.  
3. Record the passing commit SHA and the exact container image digest / hosting artifact.  
4. Promote **the same artifact** to Production (no “rebuild something different”).  
5. Smoke-test https://a.nongbot.org after Production deploy.  
6. Keep the previous Production Cloud Run revision ready for traffic rollback.  
7. One work package = one change objective (do not mix Staging creation, renames, and Production deploys).

---

## 9) Staging creation phases (micro-scopes)

Each phase is a separate Owner-approved job. **Production impact must be NONE** every time.

### Phase 1 — Create empty project

| | |
|---|---|
| Do | Create Firebase/GCP project with agreed ID; set display name **Nong A Staging** |
| Do not touch | Production project, DNS, Hosting, Cloud Run of `nonga-ce93c` |
| Evidence | Project ID, project number, console URL (no secrets) |
| Stop if | Preferred ID unavailable and Owner has not picked an alternative |
| Production impact | **NONE** |
| Cost? | Project create itself is usually free; billing link may be required before some APIs |
| Owner must approve | Exact project ID + which billing account to link (IDs not recorded here) |

### Phase 2 — Firestore, Auth, Storage

| | |
|---|---|
| Do | Enable Firestore, Auth, Storage **in Staging project only**; deploy Staging rules when ready |
| Do not touch | Production rules, indexes, or data |
| Evidence | Staging DB location; Auth providers list; bucket name |
| Stop if | Any console target shows `nonga-ce93c` |
| Production impact | **NONE** |
| Cost? | Small idle cost possible; usage grows with writes/reads |
| Owner must approve | Region choices if different from plan |

### Phase 3 — Secrets and safety defaults

| | |
|---|---|
| Do | Create Staging secrets (names only in docs); set Lead Capture OFF, Signup OFF, Notification OFF |
| Do not touch | Production secrets; do not read/print secret values in reports |
| Evidence | Secret **names** + env keys planned; health/default table |
| Stop if | Any secret is sourced from Production project |
| Production impact | **NONE** |
| Cost? | Secret Manager low cost |
| Owner must approve | Which AI keys are issued for Staging |

### Phase 4 — Create Cloud Run service

| | |
|---|---|
| Do | Deploy **Staging** service `nonga-staging` in Staging project, region `asia-southeast1` |
| Do not touch | Production service traffic / env / image |
| Evidence | Service URL, revision name, image digest, env kill-switch defaults |
| Stop if | Deploy command uses `--project=nonga-ce93c` |
| Production impact | **NONE** |
| Cost? | Cloud Run + Artifact Registry usage |
| Owner must approve | First image source (which commit/artifact) |

### Phase 5 — Hosting + rewrite to Staging Cloud Run

| | |
|---|---|
| Do | Create Staging Hosting site; rewrite `/api/**` to Staging Cloud Run |
| Do not touch | `a.nongbot.org`, Production Hosting live channel |
| Evidence | Staging URL 200; `/api/health` from Staging URL |
| Stop if | Rewrite points at Production service |
| Production impact | **NONE** |
| Cost? | Hosting generally low; bandwidth may apply |
| Owner must approve | Whether any test custom domain is later desired (**not** Production domain) |

### Phase 6 — Seed test vehicles

| | |
|---|---|
| Do | Insert approved synthetic test cars + permitted images |
| Do not touch | Production listings; do not copy leads/PII/VIN/plates/phones |
| Evidence | Staging marketplace count; test labels visible |
| Stop if | Any Production document IDs appear unexpectedly |
| Production impact | **NONE** |
| Cost? | Storage + Firestore writes |
| Owner must approve | Exact test dataset / image rights |

### Phase 7 — Enable AI for Owner (Staging only)

| | |
|---|---|
| Do | Wire Staging AI secret; allowlist Owner/testers; budgets/alerts on |
| Do not touch | Production AI env; legacy public Gemini |
| Evidence | Allowlist behavior; kill switch drill; budget alert exists |
| Stop if | AI can read Production data or public Gemini path opens |
| Production impact | **NONE** |
| Cost? | **Yes — model usage can grow quickly** |
| Owner must approve | Budget ceiling before enable |

### Phase 8 — Isolation & safety tests

| | |
|---|---|
| Do | Prove no shared data/auth/secrets; Lead/Signup/Notify OFF; no dealer send |
| Do not touch | Production config |
| Evidence | Checklist in §11 completed with screenshots/command outputs (no secrets/PII) |
| Stop if | Any cross-project call detected |
| Production impact | **NONE** |
| Cost? | Test traffic only |
| Owner must approve | Pass/fail gate |

### Phase 9 — Owner-browser acceptance

| | |
|---|---|
| Do | Owner opens Staging URL and walks critical buyer/dealer smoke (non-destructive) |
| Do not touch | Production |
| Evidence | Owner sign-off notes |
| Stop if | Owner finds Production bleed-through |
| Production impact | **NONE** |
| Cost? | Minimal |
| Owner must approve | Acceptance |

### Phase 10 — Freeze Staging baseline

| | |
|---|---|
| Do | Record Staging project ID, URLs, revision, digest, safety flags, test data inventory |
| Do not touch | Further changes until next approved packet |
| Evidence | Baseline report file (future docs-only job) |
| Stop if | Baseline facts disagree across checks |
| Production impact | **NONE** |
| Cost? | None for documentation |
| Owner must approve | Freeze declaration |

---

## 10) Cost and Owner approval

### Billing link (read-only knowledge, no account IDs)

- A new GCP/Firebase project usually must be **linked to a billing account** before Cloud Run, some Firebase paid features, and AI usage work reliably.
- Production project `nonga-ce93c` currently shows **billing enabled = true** (boolean only; no billing account ID disclosed).
- Owner must choose which billing account links to Staging **before** Phase 1/4/7 spend can occur.
- This packet does **not** link billing.

### What may cost money

| Service | Why cost appears |
|---|---|
| Cloud Run | Request time, memory, min instances (if set) |
| Artifact Registry / image storage | Storing container images |
| Firestore | Reads/writes/storage |
| Firebase Storage | Image storage + download bandwidth |
| Secret Manager | Secret versions / access |
| Gemini / AI API | Tokens per call — highest variable risk |
| Logging | Log ingestion volume |
| Hosting | Usually small; bandwidth if traffic grows |

### Budget / cost controls (required before Phase 7)

- GCP Budget alert on the Staging project (Owner sets threshold)
- App-level caps already used in Nong A (`NONGA_AI_BUDGET_*` style envs) on Staging only
- AI emergency kill switch ready
- Default: AI off until allowlist + budget approved

### Quotas to glance at before create (no changes in this packet)

- Cloud Run services / revisions per region  
- Firebase projects per account/org  
- Artifact Registry storage  
- Gemini API quota on the Staging-linked key  

Exact quota numbers are org-specific and should be checked in Phase 1 with Owner present.

### Steps that always need Owner confirmation first

1. Project ID final choice  
2. Billing link for Staging  
3. First Cloud Run deploy artifact  
4. AI secret issuance + budget ceiling  
5. Test data / image rights  
6. Any later Production rename of live `nonga-staging` service  

---

## 11) Staging acceptance checklist

Staging is ready when **all** are true:

- [ ] Staging URL opens (HTTP 200)
- [ ] No Production data connection (`FIREBASE_PROJECT_ID` / bucket / secrets ≠ Production)
- [ ] Lead Capture OFF
- [ ] Public Signup OFF
- [ ] Dealer Notification OFF
- [ ] Auth is Staging-only
- [ ] Firestore is Staging-only
- [ ] Storage is Staging-only
- [ ] Secrets are Staging-only
- [ ] Logs are in Staging project
- [ ] AI only for allowlisted people
- [ ] Test vehicles display correctly
- [ ] Frozen flows Q1–Q4 and B1+B2 show no regression on Staging
- [ ] Production https://a.nongbot.org unchanged (health, revision, marketplace)
- [ ] Owner browser acceptance complete

---

## 12) Rollback and cleanup (plan only — not executed here)

If Staging creation fails or misbehaves:

1. **Stop** further Staging deploys and disable costly services (AI first via kill switch / remove key binding).  
2. **Turn off** optional min instances / schedulers if any were added.  
3. **Delete or disable** failed Staging resources **inside the Staging project only**.  
4. **Re-check Production:** https://a.nongbot.org health, revision, marketplace count, Lead/Signup flags.  
5. **Keep evidence** (command outputs, revision names, timestamps) before cleanup.  

This packet forbids performing rollback/cleanup now.

---

# Part 2 — Naming standard review

## 13) Current naming confusion

Read-only findings (2026-07-15):

| Area | Current state | Why confusing |
|---|---|---|
| Firebase aliases (`.firebaserc`) | `default`, `production`, and `staging` all map to `nonga-ce93c` | “staging” alias is Production |
| `firebase.json` | Hosting site `nonga-ce93c`, rewrite to Cloud Run `nonga-staging` | Service name says staging; serves Production |
| Cloud Run service | `nonga-staging` on Production project | Name claims Staging; env has `NONGA_DEPLOY_ENV=production` |
| Artifact Registry | repository `nonga-staging` under Production | Same mislabel |
| `.env.staging.example` | Points Firebase fields at `nonga-ce93c` | “staging” env file = Production IDs |
| `scripts/preflight-staging*.mjs` | `EXPECTED_STAGING_URL = https://a.nongbot.org`, project `nonga-ce93c` | Preflight “staging” validates Production |
| `package.json` | Many `*:staging*` scripts (~126 lines mentioning staging) | Historically meant the live stack |
| Docs | Many docs (~60 matches) call `a.nongbot.org` “staging” | Owner now defines it as Production |
| Hosting URLs | `nonga-ce93c.web.app` documented as staging URL | Same Hosting as Production domain |
| “Production” docs | Several `docs/*production*` packets exist | Often planning/review — not always the live baseline people expect |

Scope limit: this review covers Production/Staging/Deployment naming only — not a full repository tidy-up.

---

## 14) Proposed naming standard

### Vocabulary

| Term | Meaning |
|---|---|
| **production** | Customer-facing live system (https://a.nongbot.org / `nonga-ce93c`) |
| **staging** | Isolated rehearsal system in a **separate** project |
| **local** | Developer machine / emulators |
| **archive** | Historical document — not current baseline |
| **baseline** | Verified, owner-accepted current state report |

### Standards

| Kind | Standard |
|---|---|
| File names | Prefer `NONGA_<TOPIC>_<ENV_OR_ROLE>.md` for living standards; keep versioned history docs as `vNN...` records |
| Documents | Title must say Production or Staging explicitly; never call `a.nongbot.org` “staging” in new docs |
| Firebase aliases | `production` → `nonga-ce93c`; future `staging` → new Staging project only; remove ambiguous dual mapping |
| Cloud Run | Production service ideally `nonga-production` (future); Staging service `nonga-staging` **in Staging project** |
| Deploy scripts | Name must include target env: `deploy:production:*` vs `deploy:staging:*` |
| Env config examples | `.env.production.example` / `.env.staging.example` must match the real env after isolation exists |
| Baseline reports | `NONGA_PRODUCTION_BASELINE_*.md` / `NONGA_STAGING_BASELINE_*.md` |

Rules for new names: clear English, environment explicit, no unnecessary acronyms, no duplicate files, rename only with reason, never change Production URL.

---

## 15) Proposed rename map

| Current name | Current purpose | Why confusing | Proposed name | Files/references affected | Risk | Classification | Recommended phase | Owner approval |
|---|---|---|---|---|---|---|---|---|
| `.firebaserc` alias `staging` → `nonga-ce93c` | Firebase project alias | Alias name ≠ reality | Keep `production` → `nonga-ce93c`; point future `staging` only after new project exists; optional remove/rename alias to `legacy-live` meanwhile | `.firebaserc`, deploy docs/scripts using `-P staging` | Medium | **RENAME RECOMMENDED** (alias value/target) | After Staging project exists (config job) | Yes |
| Cloud Run `nonga-staging` on `nonga-ce93c` | Serves Production | Name says Staging | Future: `nonga-production` | Hosting rewrites, gcloud scripts, Artifact image paths, docs, preflight constants, CI | **Critical** | **DO NOT RENAME — EXTERNAL DEPENDENCY** | Dedicated Production rename job only | Yes (separate) |
| Artifact Registry `nonga-staging` | Stores live images | Same mislabel | Future: `nonga-production` (or keep + document) | Cloud Build/deploy commands | High | **DO NOT RENAME — EXTERNAL DEPENDENCY** until service rename plan | With service rename job | Yes |
| `.env.staging.example` → Production IDs | Local hosting build sample | File says staging, values are Production | After isolation: real Staging IDs; meanwhile add comment banner “HISTORICALLY POINTED AT LIVE” or future `.env.production.example` | `.env.staging.example`, build scripts | Medium | **RENAME RECOMMENDED** / split examples | After Staging secrets/config known | Yes |
| `build:staging:hosting` | Builds Hosting bundle for live site historically | Name implies isolated Staging | Keep script name short-term; later add `build:production:hosting` and deprecate confusing alias | `package.json`, many docs/tests | Medium | **RENAME RECOMMENDED** | Docs+script job after Staging exists | Yes |
| `preflight:staging` + `EXPECTED_STAGING_URL=a.nongbot.org` | Read-only live checks | Validates Production under “staging” name | `preflight:production` + constants using Production vocabulary | `scripts/preflight-staging*.mjs`, `package.json`, tests | High | **RENAME RECOMMENDED** | Dedicated script rename job | Yes |
| Docs calling `a.nongbot.org` “staging” | Historical execution records | Contradicts Owner definition | Keep historical files; mark **archive** in indexes; new docs must say Production | Large `docs/v*` set | Low–Medium | **ARCHIVE RECOMMENDED** (label/index), not mass rewrite | Docs index job | Yes |
| `docs/v5-staging-deploy-topology-plan.md` etc. | Old plans treating `nonga-ce93c` as staging | Foundational confusion | Leave content; add archive banner in a future docs job **or** keep as historical | Individual docs | Low | **ARCHIVE RECOMMENDED** | Docs hygiene job | Yes |
| Multiple overlapping production readiness packets (`v6.5*`, `v15.0*`) | Planning history | Readers may think they are current baseline | Keep; publish one living `NONGA_PRODUCTION_BASELINE` pointer later | docs only | Medium | **MERGE REVIEW REQUIRED** | Docs governance job | Yes |
| This packet `NONGA_ISOLATED_STAGING_DESIGN.md` | Living design | Clear env wording | **KEEP** | — | Low | **KEEP** | — | N/A (created this job) |
| Future Staging project ID `nonga-staging-2026` | Not created yet | Preferred name | **KEEP** as proposal | Future Phase 1 | Low | **KEEP** (proposal) | Phase 1 | Yes to create |
| Hosting preview channel idea inside `nonga-ce93c` | Rejected candidate | Not isolation | Do not use | — | High if used | **KEEP** rejection | — | N/A |

**Rename count summary (this packet):**

| Classification | Count (rows above) |
|---|---:|
| KEEP | 3 |
| RENAME RECOMMENDED | 4 |
| ARCHIVE RECOMMENDED | 2 |
| MERGE REVIEW REQUIRED | 1 |
| DO NOT RENAME — EXTERNAL DEPENDENCY | 2 |
| UNKNOWN — NEEDS MORE PROOF | 0 |

No files were renamed in this job.

---

## 16) Dependency check (before any future rename)

### Production Cloud Run service name `nonga-staging` (highest risk)

Known dependency classes (read-only):

- `firebase.json` Hosting rewrites `serviceId: nonga-staging`
- Many `gcloud run services update nonga-staging --project=nonga-ce93c` snippets in docs/scripts
- Artifact Registry path `.../nonga-staging/nonga-staging:<tag>`
- `scripts/preflight-staging-lib.mjs` → `EXPECTED_CLOUD_RUN_SERVICE`
- Dozens of deploy records and package scripts
- No `.github/workflows` directory found in repo (no Actions rename surface today)

**Conclusion:** Renaming the live service is **not** a simple rename. It needs a dedicated Owner-approved Production change window, rewrite updates, and rollback plan.

### `.firebaserc` staging alias

Dependencies: any command using `-P staging` / `--project staging`. Must inventory scripts before changing.

### `preflight:staging` / `build:staging:hosting`

Dependencies: `package.json` script entries + validators that string-match script names + human runbooks.

---

## 17) Special handling — live service `nonga-staging`

**Naming debt (recorded):**  
Cloud Run service `nonga-staging` currently carries **100%** of Production traffic for https://a.nongbot.org (baseline revision at packet time: `nonga-staging-00222-vkm`).

| | |
|---|---|
| Why confusing | The word “staging” suggests a test system |
| Proposed future Production name | `nonga-production` |
| This packet | **No rename, no clone, no redirect, no traffic change, no new service** |
| Future requirement | Separate packet + Owner approval + rewrite/`firebase.json` + digest-preserving migration + rollback revision |

---

## 18) Safe rename plan (sequence only — do not execute here)

One related name group per job. One commit per job. Update references in the same job. Run tests. Smoke Production. Never combine rename with Staging resource creation. Never rename and Production-deploy in the same job. Always include rollback (revert commit / restore `firebase.json` serviceId).

| Order | Micro-scope (future) | Goal |
|---|---|---|
| R1 | Docs vocabulary banner / archive index | Stop calling `a.nongbot.org` “staging” in **new** material; mark old docs archive |
| R2 | Introduce `preflight:production` alias (keep old script temporarily) | Reduce operator mistakes without breaking history |
| R3 | Split env examples (`production` vs real `staging`) after Staging project exists | Align examples with reality |
| R4 | Firebase alias cleanup after Staging project exists | `staging` alias → new project only |
| R5 | Production Cloud Run rename `nonga-staging` → `nonga-production` | **Dedicated Production job only** |

**Do not run R5 during Staging creation phases 1–10.**

---

## Document control

| Field | Value |
|---|---|
| Allowlisted path | `docs/NONGA_ISOLATED_STAGING_DESIGN.md` |
| Creates cloud resources? | **No** |
| Renames files? | **No** |
| Next action | Owner reviews this packet, then may approve **Phase 1 only** (empty Staging project) as a separate job |

---

*End of packet.*

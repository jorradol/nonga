# Nong A v5.0 Closed Staging Smoke Test Results

Date tested: Tuesday May 26, 2026

This document records the first closed staging smoke test after Firebase Hosting was connected to Cloud Run staging. It intentionally does not include passwords, secret values, Firebase service account JSON, API keys, or private user identifiers.

## Target

- Hosting URL: `https://nonga-ce93c.web.app`
- Firebase project: `nonga-ce93c`
- Cloud Run service: `nonga-staging`
- Cloud Run region: `asia-southeast1`
- Current data backend: `file`
- Current image backend: `file`
- Public signup: disabled

## Health Result

`GET https://nonga-ce93c.web.app/api/health` returned:

```json
{
  "ok": true,
  "service": "nonga",
  "dataBackend": "file",
  "imageBackend": "file",
  "publicSignupEnabled": false
}
```

## Passed Checks

- Homepage loads from `https://nonga-ce93c.web.app`.
- Guest `GET /api/cars` works and returns marketplace listing data.
- Guest marketplace page opens.
- Guest listing/detail navigation opens.
- Guest access to `/dealer` is guarded and asks the user to log in first.
- Guest access to `/admin/inventory-import` is guarded and asks the user to log in first.
- Public signup remains closed.
- Register view shows the closed-signup message and disables public registration inputs.
- Hosting `/api/health` confirms `dataBackend=file`, `imageBackend=file`, and `publicSignupEnabled=false`.

## Failed Or Blocked Checks

- Console/network smoke found many `404` responses for `/storage/listings/**`.
- The first 52 marketplace image URLs checked under `/storage/listings/**` returned `404`.
- Real member/dealer/admin login smoke was blocked because this environment does not have Firebase test user credentials.
- Dealer Portal real-role smoke was blocked because it requires the dealer test user login.
- Chat-to-Draft/Gemini real-role smoke was blocked because it requires the dealer test user login.
- Image upload smoke with a new staging test listing was blocked because it requires the dealer test user login.
- Admin dashboard real-role smoke was blocked because it requires the admin test user login.

## Image Route Blocker

The current blocker is missing listing image files under `/storage/listings/**`.

Observed examples:

- `/storage/listings/car-1779753473263/02-7da526c05d.webp` returned `404`.
- `/storage/listings/car-1779738712833/02-7da526c05d.webp` returned `404`.
- `/storage/listings/car-import-1779516499908-p2/02-de4ad7572e.jpg` returned `404`.

The most likely cause is that Cloud Run is currently using `NONGA_IMAGE_BACKEND=file`, but the Cloud Run container does not have historical `data/listing-images` content. File storage on Cloud Run is ephemeral and instance-local, so historical local files are not available after deploy unless they were written on that running instance.

Do not fix this by baking historical images into the Docker image. That would make the image large, stale, and still would not solve user-uploaded image durability or multi-instance behavior.

## File Backend Scope

`NONGA_IMAGE_BACKEND=file` on Cloud Run is suitable only for disposable smoke testing. It can validate routing, basic write paths, and UI behavior for newly uploaded staging-only test data, but it must not be treated as durable staging storage.

Known limitations:

- Uploaded images can disappear after a restart or redeploy.
- Multiple Cloud Run instances can have different local files.
- Historical local image files are not available unless explicitly uploaded to the active instance.
- It is not appropriate for persistent dealer testing or production.

## Correct Next Paths For Images

Short term:

- Test images only on a new staging test listing uploaded after dealer login.
- Treat those uploaded files as disposable.
- Use the test only to verify `/storage/listings/**` routing through Firebase Hosting to Cloud Run.

Next staging step:

- Run a Firebase Storage migration/rehearsal after approval.
- Verify Storage rules and staging bucket access.
- Switch `NONGA_IMAGE_BACKEND=firebase-storage` only for staging after the migration/rehearsal is approved.
- Re-run image upload, image render, dealer scope, and admin smoke tests after the switch.

## Real Login Smoke Preparation

Do not paste test user passwords, API keys, service account JSON, or private keys into chat, docs, issues, PRs, or commits.

Option A: user-driven browser login

1. The user opens `https://nonga-ce93c.web.app`.
2. The user logs in manually as the member test user.
3. Verify member can log in, cannot access Dealer Portal, and cannot access Admin.
4. The user logs out.
5. The user logs in manually as the dealer test user.
6. Verify dealer can access Dealer Portal and the dealer scope is `nonga-dealer`.
7. Run Dealer Portal, Chat-to-Draft, and staging-only image upload checks.
8. The user logs out.
9. The user logs in manually as the admin test user.
10. Verify Admin Dashboard access.
11. Verify member/dealer non-admin users remain blocked from Admin.

Option B: secure local credential environment

1. Store test credentials only in a local `.env` file outside git, a secure shell session, or the team's password manager workflow.
2. Ensure `.env`, `.env.*`, and `.env.*.local` remain ignored by git.
3. A browser/script test may read those variables locally.
4. The script must report only role labels such as `member test user`, `dealer test user`, and `admin test user`.
5. The script must never print emails, passwords, tokens, Firebase ID tokens, refresh tokens, or secret values.
6. Remove or rotate any temporary credential material according to team policy after the test.

Suggested local variable names:

```text
NONGA_STAGING_MEMBER_EMAIL
NONGA_STAGING_MEMBER_PASSWORD
NONGA_STAGING_DEALER_EMAIL
NONGA_STAGING_DEALER_PASSWORD
NONGA_STAGING_ADMIN_EMAIL
NONGA_STAGING_ADMIN_PASSWORD
```

## Recommended Next Smoke Checklist

1. Recheck `https://nonga-ce93c.web.app/api/health`.
2. Confirm public signup remains closed.
3. Complete member login smoke.
4. Complete dealer login smoke.
5. Confirm Dealer Portal loads for the dealer test user.
6. Confirm dealer API rejects mismatched dealer scope.
7. Create or edit only a staging test listing.
8. Run Chat-to-Draft as the dealer test user and confirm Gemini responds through staging.
9. Upload an image only to the staging test listing.
10. Confirm the newly uploaded image renders through `/storage/listings/**`.
11. Confirm no placeholder or wrong-car image appears for that staging test listing.
12. Complete admin login smoke.
13. Confirm non-admin users remain blocked from admin routes.

## Explicitly Not Done

- No migration `--write` was run.
- `NONGA_DATA_BACKEND` was not changed to `firestore`.
- `NONGA_IMAGE_BACKEND` was not changed to `firebase-storage`.
- Public signup was not enabled.
- Production was not deployed.
- GitHub was not pushed.

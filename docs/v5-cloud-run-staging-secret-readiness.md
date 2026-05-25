# Nong A v5.0 Cloud Run Secret Readiness

This checklist reviews Cloud Run and Firebase Hosting deployment readiness for the closed staging app. It does not deploy Cloud Run, Firebase Hosting, Firestore, Storage, or migrations.

## Target

- Firebase project: `nonga-ce93c`
- Firebase Hosting URL: `https://nonga-ce93c.web.app`
- Cloud Run service: `nonga-staging`
- Cloud Run region: `asia-southeast1`
- Backend mode for this rehearsal: `file`
- Image mode for this rehearsal: `file`
- Public signup: closed

## Current Redacted Readiness Check

Local `.env` / process check was redacted and did not print any secret values.

Required runtime env status observed locally:

- `NODE_ENV`: missing locally; set it to `production` on Cloud Run.
- `APP_URL`: set locally but not matching `https://nonga-ce93c.web.app`; set the staging URL on Cloud Run.
- `VITE_NONGA_PUBLIC_SIGNUP_ENABLED`: set and matches `false`.
- `VITE_FIREBASE_API_KEY`: set.
- `VITE_FIREBASE_AUTH_DOMAIN`: set.
- `VITE_FIREBASE_PROJECT_ID`: set and matches `nonga-ce93c`.
- `VITE_FIREBASE_STORAGE_BUCKET`: set.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: set.
- `VITE_FIREBASE_APP_ID`: set.
- `VITE_FIREBASE_MEASUREMENT_ID`: set; optional.
- `NONGA_DATA_BACKEND`: missing locally; set it to `file` on Cloud Run for disposable smoke only.
- `NONGA_IMAGE_BACKEND`: missing locally; set it to `file` on Cloud Run for disposable smoke only.

Required secret status observed locally:

- `GEMINI_API_KEY`: set locally, value redacted.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: set locally, value redacted.
- `FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY`: not used locally.
- `GOOGLE_APPLICATION_CREDENTIALS`: not used locally.

Secret Manager status observed for project `nonga-ce93c`:

- `gemini-api-key`: missing or not accessible.
- `firebase-service-account-json`: missing or not accessible.

These Secret Manager entries are blockers before real Cloud Run deploy.

## Secret Manager Setup

Recommended Secret Manager names:

- `gemini-api-key`
- `firebase-service-account-json`

Create the secrets without putting values in shell history, Dockerfile, `firebase.json`, or the repo. Add secret versions from secure files outside the repository or from a trusted secret-handling workflow:

```bash
gcloud secrets create gemini-api-key \
  --project nonga-ce93c \
  --replication-policy=automatic

gcloud secrets versions add gemini-api-key \
  --project nonga-ce93c \
  --data-file=/secure/path/outside/repo/gemini-api-key.txt

gcloud secrets create firebase-service-account-json \
  --project nonga-ce93c \
  --replication-policy=automatic

gcloud secrets versions add firebase-service-account-json \
  --project nonga-ce93c \
  --data-file=/secure/path/outside/repo/firebase-service-account.json
```

Do not store `/secure/path/outside/repo/*` under this repository. Delete temporary secret files after uploading if they are not managed by a secure vault process.

Use an explicit Cloud Run service account and grant it read access to only the required secrets:

```bash
gcloud iam service-accounts create nonga-staging-runner \
  --project nonga-ce93c \
  --display-name="Nong A staging Cloud Run runner"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --project nonga-ce93c \
  --member="serviceAccount:nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding firebase-service-account-json \
  --project nonga-ce93c \
  --member="serviceAccount:nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Build-Time Firebase Web Config

The Vite frontend needs `VITE_*` values at image build time. This is not the same as Cloud Run runtime env. Because `.env` and `.env.*` are intentionally excluded by `.dockerignore`, the image build must receive public Firebase web config through an approved build-time path.

Before real deploy, choose one:

- Add reviewed Docker build arguments / Cloud Build config for the public `VITE_*` web config.
- Or build a reviewed image locally/CI with explicit `--build-arg` values and push it to Artifact Registry.

Do not put `GEMINI_API_KEY`, Firebase Admin JSON, private keys, or service account files in build args.

Current blocker: the deploy command examples below assume the Docker build consumes the listed public `VITE_*` build arguments. If the Dockerfile has not yet been updated to declare and export those build arguments before `npm run build`, do not run the image build command as-is.

## Recommended Cloud Run Deploy Command

Preferred strategy for this Dockerfile is to build and push a reviewed image, then deploy that image. This keeps runtime secrets in Secret Manager and avoids copying `.env` into the image.

Example image path:

```bash
asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v5.0-pre-staging-rc2
```

Create the Artifact Registry repository if it does not exist:

```bash
gcloud artifacts repositories create nonga-staging \
  --repository-format=docker \
  --location=asia-southeast1 \
  --project=nonga-ce93c
```

Build and push after the build-time `VITE_*` path is approved and the Dockerfile/Cloud Build path consumes these public build arguments:

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=<firebase-web-api-key> \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=nonga-ce93c.firebaseapp.com \
  --build-arg VITE_FIREBASE_PROJECT_ID=nonga-ce93c \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket> \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id> \
  --build-arg VITE_FIREBASE_APP_ID=<firebase-app-id> \
  --build-arg VITE_FIREBASE_MEASUREMENT_ID=<optional-measurement-id> \
  --build-arg VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false \
  -t asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v5.0-pre-staging-rc2 \
  .

docker push asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v5.0-pre-staging-rc2
```

Deploy Cloud Run only after the image and secrets are ready:

```bash
gcloud run deploy nonga-staging \
  --image asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v5.0-pre-staging-rc2 \
  --region asia-southeast1 \
  --project nonga-ce93c \
  --service-account nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,APP_URL=https://nonga-ce93c.web.app,VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false,VITE_FIREBASE_PROJECT_ID=nonga-ce93c,NONGA_DATA_BACKEND=file,NONGA_IMAGE_BACKEND=file \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_SERVICE_ACCOUNT_JSON=firebase-service-account-json:latest
```

`--allow-unauthenticated` is appropriate for this closed staging topology because Firebase Hosting must reach Cloud Run through the rewrite and the app/API still enforce public signup closure, Firebase Auth, dealer membership, and admin role checks. If a private Cloud Run invocation path is required later, review Hosting-to-Run IAM behavior separately before changing this.

## Firebase Hosting Rewrite

`firebase.json` currently keeps Firestore rules and adds Hosting rewrites:

- `/api/**` -> Cloud Run `nonga-staging` in `asia-southeast1`
- `/storage/listings/**` -> Cloud Run `nonga-staging` in `asia-southeast1`
- `**` -> `/index.html`

Deploy Hosting only after Cloud Run is healthy:

```bash
npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c
```

Never run an unqualified `firebase deploy` for this rehearsal.

## Safe Deploy Order

1. Create or confirm Secret Manager secrets.
2. Grant `nonga-staging-runner` access to only the required secrets.
3. Approve the build-time `VITE_*` path.
4. Build and push the reviewed container image.
5. Deploy Cloud Run `nonga-staging`.
6. Check Cloud Run health and basic `/api/*` routing.
7. Deploy Firebase Hosting with `--project nonga-ce93c`.
8. Open `https://nonga-ce93c.web.app`.
9. Run the closed staging smoke checklist.

## File Backend Scope

With `NONGA_DATA_BACKEND=file` and `NONGA_IMAGE_BACKEND=file`, Cloud Run is safe only for disposable smoke:

- login
- role flow
- API routing
- basic chat
- image upload routing
- dealer/admin access checks

Do not treat staging data, drafts, listings, or uploaded images as durable. Files can disappear on restart/redeploy, and multiple instances can diverge. Persistent staging requires an explicitly approved Firestore/Storage backend switch after migration dry-runs and rules review.

## No-Go Items

- Do not deploy Cloud Run until Secret Manager entries are confirmed.
- Do not deploy Hosting until Cloud Run is healthy.
- Do not run `migration --write`.
- Do not set `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=true`.
- Do not push GitHub unless explicitly requested.
- Do not set `NONGA_DATA_BACKEND=firestore`.
- Do not set `NONGA_IMAGE_BACKEND=firebase-storage`.
- Do not print or commit secret values.

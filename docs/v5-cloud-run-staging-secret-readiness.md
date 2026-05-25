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

Create the secrets without putting values in Dockerfile, `firebase.json`, `.env`, or the repo. The safest path is Google Cloud Console or `--data-file` from a temporary file outside this repository.

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

Console path:

1. Open Google Cloud Console for project `nonga-ce93c`.
2. Go to Secret Manager.
3. Create `gemini-api-key`.
4. Add a secret version with the Gemini API key.
5. Create `firebase-service-account-json`.
6. Add a secret version with the Firebase Admin service account JSON.

Pipe-from-stdin examples with placeholders only:

```bash
printf "PASTE_GEMINI_API_KEY_HERE" | gcloud secrets create gemini-api-key \
  --project nonga-ce93c \
  --replication-policy=automatic \
  --data-file=-

printf "PASTE_FIREBASE_SERVICE_ACCOUNT_JSON_HERE" | gcloud secrets create firebase-service-account-json \
  --project nonga-ce93c \
  --replication-policy=automatic \
  --data-file=-
```

Only use the `printf` form in a private terminal where shell history and screen capture are controlled. Do not paste either value into chat.

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

Required permission:

- `roles/secretmanager.secretAccessor` on `gemini-api-key`
- `roles/secretmanager.secretAccessor` on `firebase-service-account-json`

The Cloud Run service account is:

```text
nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com
```

## Build-Time Firebase Web Config

The Vite frontend needs `VITE_*` values at image build time. This is not the same as Cloud Run runtime env. Because `.env` and `.env.*` are intentionally excluded by `.dockerignore`, the image build must receive public Firebase web config through an approved build-time path.

The Dockerfile now declares build args and maps them to build-stage env only before `npm run build`:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false
```

The Dockerfile also fails the build if required Firebase web config is missing or if public signup is not explicitly `false`.

Do not put `GEMINI_API_KEY`, Firebase Admin JSON, private keys, or service account files in build args.

`VITE_*` values are client web config, so they are expected to be present in the frontend bundle. They are not backend secrets. Firebase Admin private keys, service account JSON, Gemini API keys, dealer/admin tokens, and any server-side credentials must never be build args.

## Build Strategy Options

Option A: local Docker build and push to Artifact Registry.

- Easiest first staging path.
- Uses the reviewed Dockerfile directly.
- Lets the operator provide public `VITE_*` build args locally.
- Keeps runtime secrets in Secret Manager and out of the image.

Option B: Cloud Build with substitutions or build args.

- Better once a reviewed `cloudbuild.yaml` exists.
- Requires careful substitution handling so only public `VITE_*` values are build args.
- Still uses Secret Manager only at Cloud Run runtime for backend secrets.

Option C: `gcloud run deploy --source .`.

- Convenient, but not recommended for this staging round until the build-time `VITE_*` injection path is explicit.
- It can obscure exactly how public Vite env reaches `npm run build`.

Recommended for the first closed staging deploy: Option A, local Docker build plus `docker push`, then `gcloud run deploy --image`.

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

Build and push after the public Firebase web config values are reviewed:

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

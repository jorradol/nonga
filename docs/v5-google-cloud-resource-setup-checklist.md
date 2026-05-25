# Nong A v5.0 Google Cloud Resource Setup Checklist

This checklist prepares Google Cloud resources for the closed staging deployment. It does not deploy Cloud Run, does not push a Docker image, does not deploy Firebase Hosting, does not run migrations, and does not change backend flags.

## Target

- Project: `nonga-ce93c`
- Region: `asia-southeast1`
- Firebase Hosting URL: `https://nonga-ce93c.web.app`
- Cloud Run service: `nonga-staging`
- Cloud Run runtime service account: `nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com`
- Artifact Registry repo: `nonga-staging`
- Image: `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v5.0-pre-staging-rc2`

## Read-Only Status Observed

The following checks were read-only and did not print any secret values.

Enabled APIs observed in `nonga-ce93c`:

- `run.googleapis.com`
- `artifactregistry.googleapis.com`
- `secretmanager.googleapis.com`
- `cloudbuild.googleapis.com`
- `iam.googleapis.com`
- `iamcredentials.googleapis.com`
- `serviceusage.googleapis.com`
- `cloudresourcemanager.googleapis.com`

Resources still missing or not accessible:

- `nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com`
- Artifact Registry repo `nonga-staging` in `asia-southeast1`
- Secret Manager secret `gemini-api-key`
- Secret Manager secret `firebase-service-account-json`

## Security Rules For This Checklist

- Do not paste secrets into chat.
- Do not commit secrets.
- Do not print secrets.
- Do not put secrets in `Dockerfile`.
- Do not put secrets in `firebase.json`.
- Do not put secrets in build args.
- Do not copy `.env` or service account JSON into the Docker image.
- Public Firebase web config values may be used as `VITE_*` build args because they are intended for the client bundle.
- Runtime secrets must be stored in Secret Manager and injected into Cloud Run with `--set-secrets`.

## Step 1: Enable Required APIs

These APIs are already observed as enabled, but this command is safe to keep as the setup checklist for another environment or if the project is reset:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project nonga-ce93c
```

Optional APIs:

- `cloudbuild.googleapis.com`: required if using Cloud Build or `gcloud run deploy --source`.
- `iamcredentials.googleapis.com`: required for service account impersonation/token flows; not required for the basic local Docker build path, but it is already enabled.

Optional enable command:

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com \
  --project nonga-ce93c
```

## Step 2: Create Runtime Service Account

Create the Cloud Run runtime service account if it does not exist:

```bash
gcloud iam service-accounts create nonga-staging-runner \
  --project nonga-ce93c \
  --display-name "NongA Staging Cloud Run Runner"
```

Verify:

```bash
gcloud iam service-accounts describe \
  nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com \
  --project nonga-ce93c
```

## Step 3: Create Secret Manager Secrets

Recommended path: create both secrets in Google Cloud Console, then add secret versions there. This avoids shell history and accidental terminal capture.

Console checklist:

1. Open Google Cloud Console for project `nonga-ce93c`.
2. Go to Secret Manager.
3. Create `gemini-api-key`.
4. Add a secret version containing the Gemini API key.
5. Create `firebase-service-account-json`.
6. Add a secret version containing the Firebase Admin service account JSON.

Command placeholders if using a private terminal:

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

If the secret already exists, add a new version instead:

```bash
printf "PASTE_GEMINI_API_KEY_HERE" | gcloud secrets versions add gemini-api-key \
  --project nonga-ce93c \
  --data-file=-

printf "PASTE_FIREBASE_SERVICE_ACCOUNT_JSON_HERE" | gcloud secrets versions add firebase-service-account-json \
  --project nonga-ce93c \
  --data-file=-
```

Only run the `printf` form in a private terminal where shell history and screen capture are controlled. Never paste real secret values into chat.

Verify without reading secret values:

```bash
gcloud secrets describe gemini-api-key --project nonga-ce93c
gcloud secrets describe firebase-service-account-json --project nonga-ce93c
```

## Step 4: Grant Secret Access To Runtime Service Account

Grant least privilege access only to the two required secrets:

```bash
gcloud secrets add-iam-policy-binding gemini-api-key \
  --project nonga-ce93c \
  --member "serviceAccount:nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding firebase-service-account-json \
  --project nonga-ce93c \
  --member "serviceAccount:nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"
```

No broader project-level secret access is needed for the current plan.

If the app later switches to Application Default Credentials instead of `FIREBASE_SERVICE_ACCOUNT_JSON`, review Firebase/Firestore/Storage roles separately before deploy. Do not add broad roles as a shortcut.

## Step 5: Create Artifact Registry Docker Repo

Create the Docker repo if it does not exist:

```bash
gcloud artifacts repositories create nonga-staging \
  --repository-format=docker \
  --location=asia-southeast1 \
  --project=nonga-ce93c
```

Verify:

```bash
gcloud artifacts repositories describe nonga-staging \
  --location=asia-southeast1 \
  --project=nonga-ce93c
```

Configure Docker auth for Artifact Registry:

```bash
gcloud auth configure-docker asia-southeast1-docker.pkg.dev
```

The deploy operator must have permission to push images to this repo, for example `roles/artifactregistry.writer` on the repo or equivalent existing project permissions.

## Step 6: Confirm Public Build Args

Uncle Den must confirm these public Firebase web config values from Firebase project `nonga-ce93c`. They are public client config values and are expected to be embedded in the frontend bundle:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID=nonga-ce93c`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` if present
- `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`

Do not use these build args for:

- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- dealer/admin API tokens
- any service account JSON file

## Step 7: Build Image Placeholder

Do not run this until the public Firebase web config values are confirmed.

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
```

## Step 8: Push Image Placeholder

Do not run this until the image build is reviewed and the Artifact Registry repo exists.

```bash
docker push asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v5.0-pre-staging-rc2
```

## Step 9: Deploy Cloud Run Placeholder

Do not run this until secrets, service account permissions, Artifact Registry, and image push are confirmed.

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

`--allow-unauthenticated` is used for this closed staging topology because Firebase Hosting must be able to reach Cloud Run through rewrites. App-level auth, role checks, dealer membership checks, and public signup closure still remain required.

Runtime env for the first disposable smoke:

- `NODE_ENV=production`
- `APP_URL=https://nonga-ce93c.web.app`
- `NONGA_DATA_BACKEND=file`
- `NONGA_IMAGE_BACKEND=file`
- `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`
- `VITE_FIREBASE_PROJECT_ID=nonga-ce93c`

Runtime secrets:

- `GEMINI_API_KEY=gemini-api-key:latest`
- `FIREBASE_SERVICE_ACCOUNT_JSON=firebase-service-account-json:latest`

## Step 10: Firebase Hosting Deploy Placeholder

Do not run this until Cloud Run is deployed and healthy.

```bash
npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c
```

Never run an unqualified `firebase deploy` for this rehearsal.

## What Uncle Den Must Do Manually

- Create or approve real secret values in Secret Manager.
- Confirm the public Firebase web config values used as Docker build args.
- Confirm the runtime service account exists before deploy.
- Confirm `secretAccessor` is granted on only the two required secrets.
- Confirm Artifact Registry repo exists.
- Confirm the image was built with `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`.
- Approve any actual `docker push`, `gcloud run deploy`, or Firebase Hosting deploy step.

## Disposable File Backend Scope

For this staging round, keep:

- `NONGA_DATA_BACKEND=file`
- `NONGA_IMAGE_BACKEND=file`

This is only enough for disposable smoke:

- login
- role flow
- API routing
- basic chat
- upload routing
- dealer/admin access checks

Do not treat staging drafts, listings, or images as durable. Cloud Run filesystem state can disappear on restart/redeploy, and multiple instances can diverge.

## Final No-Go List

- Do not deploy Cloud Run until Uncle Den confirms secrets and image readiness.
- Do not push Docker images until explicitly confirmed.
- Do not deploy Firebase Hosting until Cloud Run is healthy.
- Do not run `migration --write`.
- Do not set `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=true`.
- Do not switch `NONGA_DATA_BACKEND=firestore`.
- Do not switch `NONGA_IMAGE_BACKEND=firebase-storage`.
- Do not push GitHub unless explicitly requested.
- Do not print or commit secrets.

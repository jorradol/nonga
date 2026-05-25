# Nong A v5.0 Cloud Run Staging Deploy Prep

This runbook prepares the closed staging deployment path for `v5.0-pre-staging-rc2` and later. It does not deploy hosting, Cloud Run, Functions, Storage, or production. It does not run migration write, does not open public signup, and does not switch the data/image backends to Firestore or Storage.

## Target Topology

- Firebase Hosting site: `nonga-ce93c`
- First closed staging URL: `https://nonga-ce93c.web.app`
- Cloud Run service: `nonga-staging`
- Cloud Run region: `asia-southeast1`
- Runtime command: `npm run start`
- Runtime entrypoint: `node dist/server.cjs`

Firebase Hosting serves the Vite frontend from `dist` and rewrites server-backed routes to Cloud Run:

- `/api/**` -> Cloud Run `nonga-staging`
- `/storage/listings/**` -> Cloud Run `nonga-staging`
- all other routes -> `/index.html`

This keeps the frontend on the Firebase Hosting domain while preserving same-origin API and local file image URLs for the disposable closed staging smoke.

## Build Artifact

The existing build command is:

```bash
npm run build
```

It creates:

- frontend assets in `dist`
- bundled Express server at `dist/server.cjs`

The existing production command is:

```bash
npm run start
```

Cloud Run requires the server to listen on `process.env.PORT`. Local development still defaults to port `3000`.

## Docker Build

The Dockerfile uses `node:22-slim`, installs dependencies with `npm ci`, runs `npm run build`, prunes dev dependencies, and starts with `npm run start`.

Local image build example:

```bash
docker build -t nonga-staging:local .
```

Local container smoke example:

```bash
docker run --rm -p 8080:8080 -e PORT=8080 nonga-staging:local
```

Do not pass real secrets on the command line in shared logs. Use Secret Manager for real staging.

## Cloud Run Environment

Set these non-secret environment variables on the Cloud Run service:

```bash
NODE_ENV=production
APP_URL=https://nonga-ce93c.web.app
VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false
VITE_FIREBASE_PROJECT_ID=nonga-ce93c
NONGA_DATA_BACKEND=file
NONGA_IMAGE_BACKEND=file
```

The Vite web config values must be available at image build time:

```bash
VITE_FIREBASE_API_KEY=<from Firebase web config>
VITE_FIREBASE_AUTH_DOMAIN=nonga-ce93c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nonga-ce93c
VITE_FIREBASE_STORAGE_BUCKET=<from Firebase web config>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase web config>
VITE_FIREBASE_APP_ID=<from Firebase web config>
VITE_FIREBASE_MEASUREMENT_ID=<optional>
VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false
```

Use Secret Manager for:

```bash
GEMINI_API_KEY=<secret>
FIREBASE_SERVICE_ACCOUNT_JSON=<secret>
```

Alternative Firebase Admin credential path, if not using `FIREBASE_SERVICE_ACCOUNT_JSON`:

```bash
FIREBASE_PROJECT_ID=nonga-ce93c
FIREBASE_CLIENT_EMAIL=<secret or env>
FIREBASE_PRIVATE_KEY=<secret>
```

Use exactly one Firebase Admin credential path. Never commit real values and never bake them into the Docker image.

## File Backend Risk

The first closed staging deploy can keep:

```bash
NONGA_DATA_BACKEND=file
NONGA_IMAGE_BACKEND=file
```

This is acceptable only for disposable smoke testing. On Cloud Run, file writes are ephemeral:

- `data/marketplace-inventory.json` changes can disappear on restart or redeploy.
- `data/dealer-draft-inventory.json` changes can disappear on restart or redeploy.
- `data/listing-images/**` uploads can disappear on restart or redeploy.
- Multiple Cloud Run instances can diverge because each instance has its own filesystem.

If the closed staging goal includes persistent dealer draft/listing/image validation, run the Firestore/Storage backend step first with explicit approval:

1. Re-run migration dry-runs.
2. Review Firestore/Storage rules and indexes.
3. Run migration write only after approval.
4. Set `NONGA_DATA_BACKEND=firestore`.
5. Set `NONGA_IMAGE_BACKEND=firebase-storage`.
6. Re-run role flow, dealer save, image upload, and final smoke tests.

## Deployment Commands For Later

Do not run these until the Cloud Run service/env/secrets are reviewed.

Build and deploy Cloud Run using source:

```bash
gcloud run deploy nonga-staging \
  --source . \
  --region asia-southeast1 \
  --project nonga-ce93c \
  --allow-unauthenticated
```

Deploy Firebase Hosting only after Cloud Run is healthy:

```bash
npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c
```

Never run an unqualified `firebase deploy` for this rehearsal.

## Closed Staging Smoke Checklist

After deployment:

1. Open `https://nonga-ce93c.web.app`.
2. Confirm guest can view marketplace.
3. Confirm guest cannot enter Dealer Portal or Admin.
4. Confirm member can log in.
5. Confirm member cannot enter Dealer Portal or Admin.
6. Confirm dealer can log in.
7. Confirm dealer sees `nonga-dealer` / `NongA Dealer Demo`.
8. Confirm dealer can enter Dealer Portal.
9. Confirm dealer can enter Chat to Draft.
10. Confirm dealer can create a draft listing.
11. Confirm dealer can attach an image.
12. Confirm dealer can save a listing.
13. Confirm admin can log in.
14. Confirm admin can enter admin dashboard.
15. Confirm public signup remains closed.
16. Confirm UI does not show token, API, debug, private key, or raw error details.

## Rollback Plan

If the staging app deploy breaks:

1. Do not change Firestore/Storage backend flags as an emergency workaround.
2. Roll back the Cloud Run service to the previous healthy revision in Cloud Run.
3. If Hosting rewrite is the issue, revert the Hosting release in Firebase Hosting.
4. Keep Firestore rules from `v5.0-pre-staging-rc2` unless a rules-specific regression is proven.
5. Re-run:

```bash
npm run lint
npm run build
npm run test:v50-firebase-login-flow
npm run test:v50-real-login-role-flow
npm run test:v49-final-smoke
```

## Current No-Go Items

- Do not push GitHub until explicitly requested.
- Do not run `migration --write`.
- Do not deploy Storage rules in this step.
- Do not switch `NONGA_DATA_BACKEND` to `firestore` without a separate migration approval.
- Do not switch `NONGA_IMAGE_BACKEND` to `firebase-storage` without a separate migration approval.
- Do not set `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=true`.

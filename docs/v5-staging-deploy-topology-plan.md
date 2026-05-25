# Nong A v5.0 Closed Staging Deploy Topology Plan

This checkpoint decides the deployment shape for closed staging after `v5.0-pre-staging-rc2`. It does not deploy hosting, Cloud Run, Functions, Storage, or production. It does not enable Online Beta and does not change `NONGA_DATA_BACKEND` or `NONGA_IMAGE_BACKEND`.

## Current Constraints

- Staging Firebase project: `nonga-ce93c`
- First staging URL: `https://nonga-ce93c.web.app`
- Required staging app URL env: `APP_URL=https://nonga-ce93c.web.app`
- Public signup must remain disabled: `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false`
- First closed staging pass keeps backend selectors at file/default file:
  - `NONGA_DATA_BACKEND=file`
  - `NONGA_IMAGE_BACKEND=file`
- The app is not static-only. Local smoke tests depend on `/api/*`.
- `server.ts` owns Express APIs, Gemini calls, dealer/admin routes, uploads, and production static serving from `dist`.
- `npm run build` creates:
  - Vite frontend assets in `dist`
  - bundled server entry at `dist/server.cjs`
- `npm run start` runs `node dist/server.cjs`.

## Topology Decision

Recommended topology for Nong A closed staging:

**Firebase Hosting + Cloud Run backend rewrite**

Use Firebase Hosting for the public staging URL and route all traffic to the Cloud Run service that runs the bundled Express server. The Express server should serve built frontend assets and `/api/*` from the same container.

Why this is the best fit:

- The repo already has a full Express server with many API routes.
- Gemini API calls and dealer/admin APIs require server-side secrets and Firebase Admin credentials.
- Image upload and draft/listing APIs are server workflows, not static assets.
- Cloud Run is a natural fit for `node dist/server.cjs`, streaming responses, larger request bodies, `sharp`, and long-lived Express middleware.
- Firebase Hosting keeps the Firebase staging URL and can later add CDN/domain behavior without moving the backend.

## Options Considered

### 1. Firebase Hosting Static Only

Not recommended.

Static Hosting can serve `dist/index.html` and frontend assets, but the current app uses `/api/*` for cars, dealer drafts, Gemini, uploads, admin inventory, and smoke tests. Without a backend rewrite, those routes would return 404 or SPA HTML instead of JSON.

### 2. Firebase Hosting + Cloud Run

Recommended.

Hosting provides `https://nonga-ce93c.web.app`, while Cloud Run runs the Express server. Hosting rewrites all app traffic to Cloud Run. This preserves same-origin `/api/*` calls and lets the server serve the SPA fallback.

Important readiness fix before deploy:

- `server.ts` currently listens on a fixed port `3000`.
- Cloud Run requires the service to listen on `process.env.PORT`.
- Change required before Cloud Run deploy:

```ts
const PORT = Number(process.env.PORT ?? 3000);
```

### 3. Firebase App Hosting

Possible later, not recommended as the first closed staging path.

App Hosting is optimized for supported web framework backends. Nong A is currently a custom Express + Vite app with its own `server.ts`, file-backed local data, custom upload routes, and bundled `dist/server.cjs`. Cloud Run keeps the runtime contract explicit and easier to reason about for this rehearsal.

### 4. Firebase Hosting + Cloud Functions

Not recommended for this staging pass.

Functions would require wrapping or splitting the Express server, checking body limits, adapting streaming behavior, and managing cold starts around large image and AI flows. Cloud Run is a cleaner fit for the existing server.

## File Backend Risk On Cloud Run

Using `NONGA_DATA_BACKEND=file` and `NONGA_IMAGE_BACKEND=file` on Cloud Run is safe only for a disposable smoke test. It is not safe for persistent staging data.

Risks:

- Writes to `data/marketplace-inventory.json`, `data/dealer-draft-inventory.json`, and `data/listing-images/**` live on an ephemeral container filesystem.
- Data and uploaded images can disappear on container restart, scale-to-zero, redeploy, or replacement.
- Multiple Cloud Run instances can have different local file contents.
- Firebase Hosting may cache public assets, but it will not persist runtime file writes from the container.

Closed staging can briefly use file backend only if the scope is read/login/API smoke and everyone accepts that created drafts/listings/images are temporary. If dealer create/save/upload flows must be meaningful across restarts, switch to Firestore/Storage before deploy.

## Recommended Next Step Before Real Staging Deploy

For a closed staging app that tests dealer create/save/upload seriously, split the work into two steps:

1. **Cloud Run readiness**
   - Update `server.ts` to listen on `process.env.PORT`.
   - Add `Dockerfile` for `npm ci`, `npm run build`, and `npm run start`.
   - Add `firebase.json` Hosting rewrite to Cloud Run.
   - Keep `NONGA_DATA_BACKEND=file` and `NONGA_IMAGE_BACKEND=file` only for a disposable smoke deploy.

2. **Persistent staging data/image backend**
   - Run migration dry-runs again.
   - Review Firestore/Storage rules and indexes.
   - Run migration write only after explicit approval.
   - Set:
     - `NONGA_DATA_BACKEND=firestore`
     - `NONGA_IMAGE_BACKEND=firebase-storage`
   - Re-run login role flow, dealer draft save, image upload, and final smoke against staging.

## Files Needed For Hosting + Cloud Run

Minimum files/config for the next implementation step:

- `Dockerfile`
  - Build a production image.
  - Install dependencies.
  - Run `npm run build`.
  - Start with `npm run start`.
- `firebase.json`
  - Keep Firestore rules.
  - Add Hosting config for site `nonga-ce93c`.
  - Add rewrites to Cloud Run.

Example shape only, do not deploy until reviewed:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    "site": "nonga-ce93c",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "nonga-staging",
          "region": "asia-southeast1"
        }
      }
    ]
  }
}
```

If every request rewrites to Cloud Run, the `public` setting is mostly a Firebase Hosting requirement and fallback; the Express server remains the source of truth for static assets and APIs.

## Cloud Run Env And Secrets

Set these on the Cloud Run service. Do not commit real values.

Public/non-secret env:

```bash
NODE_ENV=production
APP_URL=https://nonga-ce93c.web.app
VITE_FIREBASE_AUTH_DOMAIN=nonga-ce93c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nonga-ce93c
VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false
NONGA_DATA_BACKEND=file
NONGA_IMAGE_BACKEND=file
```

Build-time Vite env must also be available during `npm run build`:

```bash
VITE_FIREBASE_API_KEY=<from Firebase web config>
VITE_FIREBASE_AUTH_DOMAIN=<from Firebase web config>
VITE_FIREBASE_PROJECT_ID=nonga-ce93c
VITE_FIREBASE_STORAGE_BUCKET=<from Firebase web config>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase web config>
VITE_FIREBASE_APP_ID=<from Firebase web config>
VITE_FIREBASE_MEASUREMENT_ID=<optional>
VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false
```

Secrets:

```bash
GEMINI_API_KEY=<Secret Manager>
FIREBASE_SERVICE_ACCOUNT_JSON=<Secret Manager>
```

Alternative Firebase Admin credential path:

```bash
FIREBASE_PROJECT_ID=nonga-ce93c
FIREBASE_CLIENT_EMAIL=<Secret Manager or secret env>
FIREBASE_PRIVATE_KEY=<Secret Manager>
```

Use exactly one Firebase Admin credential path.

## Safe Deploy Commands For Later

Do not run these until the Cloud Run readiness changes are implemented and reviewed.

Build and test:

```bash
npm run lint
npm run build
npm run test:v50-firebase-login-flow
npm run test:v50-real-login-role-flow
npm run test:v49-final-smoke
```

Deploy Hosting only after Cloud Run service exists and `firebase.json` rewrites are reviewed:

```bash
npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c
```

Never use an unqualified `firebase deploy` for this staging rehearsal.

## Closed Staging Smoke Checklist

After deploy, verify:

1. Open `https://nonga-ce93c.web.app`.
2. Guest can view marketplace.
3. Guest cannot enter Dealer Portal or Admin.
4. Member can log in.
5. Member cannot enter Dealer Portal or Admin.
6. Dealer can log in.
7. Dealer sees `nonga-dealer` / `NongA Dealer Demo`.
8. Dealer can enter Dealer Portal.
9. Dealer can enter Chat to Draft.
10. Dealer can create a draft listing.
11. Dealer can attach an image.
12. Dealer can save a listing.
13. Admin can log in.
14. Admin can enter admin dashboard.
15. Public signup remains closed.
16. UI does not show token, API, debug, or private error details.

## Current Blockers Before Deploy

- `server.ts` must use `process.env.PORT` before Cloud Run deployment.
- `Dockerfile` does not exist yet.
- `firebase.json` has no Hosting rewrite yet.
- Decide whether closed staging write flows can be disposable with file backend or must wait for Firestore/Storage backend.
- If persistent create/save/upload is required, run the Firestore/Storage migration step first with explicit approval.

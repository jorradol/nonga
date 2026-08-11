# AGENTS.md

## Cursor Cloud specific instructions

These notes capture non-obvious, durable context for running and developing this
codebase (project "Nong A", an AI-assisted used-car marketplace). Standard commands
live in `README.md` and `package.json` scripts — this section only records the caveats.

### Architecture (important)
- This is a **single Node process**, not separate frontend/backend services.
  `npm run dev` (`tsx server.ts`) starts one Express server that serves **both** the
  `/api/*` REST API **and** the Vite SPA frontend (via Vite middleware in dev) on
  **http://localhost:3000**. Static listing images are served from `/storage/listings`.
- The dev server binds `0.0.0.0:3000`. Startup log to look for:
  `Nong A Full-Stack server is actively listening on port 3000`.

### Local dev runs fully standalone (no external services)
- Defaults use the **file data backend** (`data/*.json`) and **local image storage**
  (`data/listing-images/`) — no database, Firebase, or Gemini key required.
- AI ("Sales Brain" / น้อง A) runs in **mock mode** when `GEMINI_API_KEY` is empty;
  it returns deterministic canned responses. This is expected locally.
- Auth runs in **mock mode** when `VITE_FIREBASE_*` are blank.
- Copy env before running: `cp .env.example .env`. Dev works with all keys left blank.
- Firebase / Firestore / Gemini are only needed for staging/production and are gated
  behind explicit env vars (`NONGA_DATA_BACKEND=firestore`, `VITE_FIREBASE_*`, etc.).

### Lint / test / build / run
- Lint: `npm run lint` (`tsc --noEmit`). NOTE: the committed tree currently has a
  pre-existing type error in `src/contexts/auth/AuthContext.tsx` (`dealerPostWritingStyle`
  not in `UserSession`). It is unrelated to environment setup; `tsc` itself runs fine.
- Test: `npm run test` runs a chain of `tsx scripts/test-*.mts` smoke tests against the
  file backend. They **write to (gitignored) `data/*.json` and `data/listing-images/`**,
  so a dirty `data/` after tests is normal.
- Build: `npm run build` is a **production** build (Vite + esbuild bundle of `server.ts`).
  It runs a Firebase production-config guard that **requires real `VITE_FIREBASE_*`
  secrets**. Locally, build with the documented escape hatch:
  `SKIP_FIREBASE_PRODUCTION_GUARD=true npm run build`. For day-to-day development use
  `npm run dev`, not the production build.
- Run (dev): `npm run dev`, then open http://localhost:3000.

# Nong A Auth / Dealer Access Beta Notes

## Current Login Level

Nong A currently supports two client-side auth modes:

- Mock/demo mode when `firebase-applet-config.json` uses the fake Firebase key. Sessions live in `localStorage` under `nonga_auth_session` and simulated profiles live under `nonga_simulated_users`.
- Firebase Auth-ready mode when real Firebase config is provided. The app listens to `onAuthStateChanged` and reads/writes user profile data in Firestore `users/{uid}`.

This is not yet a full production dealer auth system. The Online Beta path is a guarded stub intended for one or a small number of approved dealers.

## DealerId Resolution

Client-side dealer context is resolved from the active user profile:

- `user.dealerId` if present.
- Dealer role + `uid` starting with `dealer-`.
- Fallback to normalized `uid`.
- Final fallback: `thor-auto`.

Thor Auto Demo comes from `buildThorAutoDemoProfileUpdates()`, which writes `role: "dealer"` and `dealerId: "thor-auto"` to the simulated user session.

## Backend Dealer Guard

All `/api/dealer/*` routes are behind `dealerApiAuth`.

For Online Beta, configure server-side token binding so the backend derives the dealer from the token instead of trusting `X-Dealer-Id`:

```bash
NONGA_DEALER_TOKEN_MAP='{"thor-auto":"<strong-random-token>"}'
```

Or, for a single restricted beta dealer:

```bash
NONGA_BETA_DEALER_ID=thor-auto
NONGA_DEALER_API_TOKEN=<strong-random-token>
```

In this mode, `X-Dealer-Id` is only treated as a consistency check. If it does not match the dealer bound to the token, the request is rejected.

Development/mock mode still accepts the legacy dev token plus `X-Dealer-Id` to keep local smoke tests and demo workflows working.

## Endpoint Coverage

Guarded by `/api/dealer/*` and scoped to the authenticated dealer:

- Create draft: `POST /api/dealer/drafts/new`
- Edit draft: `PATCH /api/dealer/drafts/:id`
- Upload draft images: `POST /api/dealer/drafts/:id/upload-images`
- Publish draft: `POST /api/dealer/drafts/:id/publish`
- Delete draft: `DELETE /api/dealer/drafts/:id`
- Dealer inventory read/edit/image upload/hide/delete
- Dealer profile read/update
- Dealer import and duplicate review routes

Admin routes under `/api/admin/*` use a separate admin stub token. They are suitable for internal beta only until Firebase custom claims or a server-side admin session is wired.

## Not Ready For Multi-Dealer Production

Before opening to real multi-dealer production traffic:

- Replace stub dealer tokens with Firebase ID token verification on the backend.
- Store dealer memberships in a server-controlled collection, for example `dealerMembers/{uid}` or `dealers/{dealerId}/members/{uid}`.
- Derive `dealerId` from verified Firebase auth claims/profile on the server, never from frontend-provided values.
- Update Firestore chat rules so chat sessions and `messages` subcollections require ownership by `request.auth.uid` or a verified dealer membership. Current chat support is localStorage in mock mode and Firebase-ready, but not a complete dealer-scoped production chat backend.
- Do not expose default dev tokens in a deployed environment.

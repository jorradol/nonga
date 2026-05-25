import type { NextFunction, Request, Response } from "express";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  resolveFirebaseClientConfig,
} from "../src/lib/firebase/firebaseConfigGuard.ts";
import {
  getCurrentUserIdToken,
  getFirebaseAuthHeaders,
} from "../src/services/auth/firebaseAuthHeaders.ts";
import { isPublicSignupEnabled } from "../src/services/auth/authService.ts";
import { dealerApiAuth } from "../src/server/apiAuth.ts";
import { getServerAuthContext } from "../src/server/serverAuthContext.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function reqWith(headers: Request["headers"]): Request {
  return { headers, query: {}, body: {} } as Request;
}

function createMockRes() {
  const result = {
    statusCode: 200,
    body: undefined as unknown,
  };
  const res = {
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    json(body: unknown) {
      result.body = body;
      return res;
    },
  } as Response;
  return { res, result };
}

function runDealerGuard(req: Request) {
  const { res, result } = createMockRes();
  return new Promise<{ calledNext: boolean; statusCode: number; body: unknown }>(
    (resolve) => {
      const next: NextFunction = () => {
        resolve({ calledNext: true, statusCode: result.statusCode, body: result.body });
      };
      dealerApiAuth(req, res, next);
      setTimeout(() => {
        resolve({ calledNext: false, statusCode: result.statusCode, body: result.body });
      }, 1000);
    }
  );
}

console.log("=== Nong A v5.0 Firebase Login Flow Smoke ===");

const fakeProdReport = detectFirebaseClientConfig(firebaseConfig, {
  dev: false,
  prod: true,
  betaToken: false,
});
assert(
  fakeProdReport.mode === "invalid-production-config",
  "fake config must stay blocked in production"
);
console.log("PASS fake config remains blocked in production");

const resolvedRealConfig = resolveFirebaseClientConfig(firebaseConfig, {
  VITE_FIREBASE_API_KEY: "AIzaSyRealExampleKey",
  VITE_FIREBASE_AUTH_DOMAIN: "nonga-real.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "nonga-real",
  VITE_FIREBASE_STORAGE_BUCKET: "nonga-real.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  VITE_FIREBASE_APP_ID: "1:123456789:web:abcdef",
  VITE_FIREBASE_MEASUREMENT_ID: "G-EXAMPLE",
});
const realReport = detectFirebaseClientConfig(resolvedRealConfig, {
  dev: false,
  prod: true,
  betaToken: false,
});
assert(realReport.mode === "firebase-auth", "real env config must resolve firebase-auth");
assert(resolvedRealConfig.apiKey === "AIzaSyRealExampleKey", "env apiKey should override JSON");
console.log("PASS real Firebase web env resolves firebase-auth mode");

const token = await getCurrentUserIdToken();
assert(token === null, "fake local config should not return a fake Firebase ID token");
const headers = await getFirebaseAuthHeaders();
assert(!("Authorization" in headers), "auth headers must not include fake Authorization");
console.log("PASS auth header helper does not send fake token");

assert(
  !isPublicSignupEnabled(
    { DEV: false, VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "" },
    false
  ),
  "real Firebase mode should keep public signup closed by default"
);
assert(
  isPublicSignupEnabled(
    { DEV: false, VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "true" },
    false
  ),
  "public signup can be explicitly enabled"
);
console.log("PASS public signup is closed by default for real auth");

const DEALER_TOKEN = "dev-firebase-login-dealer";
const MEMBER_TOKEN = "dev-firebase-login-member";
const DEALER_UID = "firebase-login-dealer-uid";
const MEMBER_UID = "firebase-login-member-uid";
const DEALER_ID = "thor-auto";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [DEALER_TOKEN]: {
    uid: DEALER_UID,
    email: "dealer-login@example.test",
    displayName: "Firebase Login Dealer",
  },
  [MEMBER_TOKEN]: {
    uid: MEMBER_UID,
    email: "member-login@example.test",
    displayName: "Firebase Login Member",
  },
});
process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [DEALER_UID]: {
    uid: DEALER_UID,
    email: "dealer-login@example.test",
    displayName: "Firebase Login Dealer",
    role: "dealer",
    status: "active",
    dealerId: DEALER_ID,
    dealerName: "Thor Auto Demo",
  },
  [MEMBER_UID]: {
    uid: MEMBER_UID,
    email: "member-login@example.test",
    displayName: "Firebase Login Member",
    role: "member",
    status: "active",
  },
});
process.env.NONGA_DEV_DEALER_MEMBERSHIP_MAP = JSON.stringify({
  [DEALER_UID]: [
    {
      uid: DEALER_UID,
      dealerId: DEALER_ID,
      roleInDealer: "owner",
      status: "active",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    },
  ],
});

const dealerContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${DEALER_TOKEN}` })
);
assert(
  dealerContext.role === "dealer" &&
    dealerContext.status === "active" &&
    dealerContext.dealerId === DEALER_ID,
  "dev Firebase dealer token should resolve active dealer context"
);
console.log("PASS backend resolves active Firebase dealer membership");

const dealerReq = reqWith({
  authorization: `Bearer ${DEALER_TOKEN}`,
  "x-dealer-id": DEALER_ID,
});
const dealerGuard = await runDealerGuard(dealerReq);
assert(
  dealerGuard.calledNext && dealerReq.apiAuth?.provider === "firebase",
  "active dealer should pass dealer API guard"
);
console.log("PASS active dealer enters dealer API");

const memberReq = reqWith({
  authorization: `Bearer ${MEMBER_TOKEN}`,
  "x-dealer-id": DEALER_ID,
});
const memberGuard = await runDealerGuard(memberReq);
assert(
  !memberGuard.calledNext && memberGuard.statusCode === 403,
  "member must not pass dealer API guard"
);
console.log("PASS member is blocked from dealer API");

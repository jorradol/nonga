import type { NextFunction, Request, Response } from "express";
import {
  authorizeDealerScope,
  getServerAuthContext,
  ServerAuthError,
  verifyFirebaseIdToken,
} from "../src/server/serverAuthContext.ts";
import { dealerApiAuth } from "../src/server/apiAuth.ts";

const VALID_TOKEN = "dev-firebase-token-dealer";
const INVALID_TOKEN = "invalid-firebase-token";
const UID = "firebase-dealer-uid";
const DEALER_ID = "thor-auto";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [VALID_TOKEN]: {
    uid: UID,
    email: "dealer@example.test",
    displayName: "Firebase Dealer",
  },
});

process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UID]: {
    uid: UID,
    email: "dealer@example.test",
    displayName: "Firebase Dealer",
    role: "dealer",
    status: "active",
    dealerId: DEALER_ID,
    dealerName: "Thor Auto Demo",
  },
});

process.env.NONGA_DEV_DEALER_MEMBERSHIP_MAP = JSON.stringify({
  [UID]: [
    {
      uid: UID,
      dealerId: DEALER_ID,
      roleInDealer: "owner",
      status: "active",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    },
  ],
});

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

async function run() {
  console.log("=== Nong A v5.0 Server Auth Context Smoke ===");

  const identity = await verifyFirebaseIdToken(VALID_TOKEN);
  if (identity.uid !== UID || identity.verificationMode !== "dev-mock") {
    throw new Error("valid dev Firebase token did not verify");
  }
  console.log("PASS valid token verify");

  try {
    await verifyFirebaseIdToken(INVALID_TOKEN);
    throw new Error("invalid token unexpectedly passed");
  } catch (err) {
    if (!(err instanceof ServerAuthError) || err.status !== 401) {
      throw err;
    }
  }
  console.log("PASS invalid token returns 401");

  const context = await getServerAuthContext(
    reqWith({ authorization: `Bearer ${VALID_TOKEN}` })
  );
  if (
    context.uid !== UID ||
    context.role !== "dealer" ||
    context.status !== "active" ||
    context.dealerId !== DEALER_ID ||
    context.memberships[0]?.status !== "active"
  ) {
    throw new Error("server auth context did not resolve dealer profile");
  }
  console.log("PASS dealer auth context");

  const allowed = authorizeDealerScope(context, DEALER_ID);
  if (!allowed.ok || allowed.dealerId !== DEALER_ID) {
    throw new Error("active dealer membership was not allowed");
  }
  console.log("PASS dealer membership scope");

  const denied = authorizeDealerScope(context, "other-dealer");
  if (denied.ok === true || denied.status !== 403) {
    throw new Error("mismatched dealerId was not rejected");
  }
  console.log("PASS mismatched dealerId rejected");

  const firebaseGuardReq = reqWith({
    authorization: `Bearer ${VALID_TOKEN}`,
    "x-dealer-id": DEALER_ID,
  });
  const firebaseGuard = await runDealerGuard(firebaseGuardReq);
  if (!firebaseGuard.calledNext || firebaseGuardReq.apiAuth?.provider !== "firebase") {
    throw new Error("firebase dealerApiAuth did not pass");
  }
  console.log("PASS dealerApiAuth firebase path");

  const betaGuardReq = reqWith({
    authorization: "Bearer nonga-v4-dev-dealer-token",
    "x-dealer-id": DEALER_ID,
  });
  const betaGuard = await runDealerGuard(betaGuardReq);
  if (!betaGuard.calledNext || betaGuardReq.apiAuth?.provider !== "stub") {
    throw new Error("legacy beta/dev dealer token path broke");
  }
  console.log("PASS legacy beta/dev token path");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

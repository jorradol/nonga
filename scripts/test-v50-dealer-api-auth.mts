import type { NextFunction, Request, Response } from "express";
import { adminApiAuth, dealerApiAuth } from "../src/server/apiAuth.ts";
import {
  parseDealerRequestScope,
  requireDealerId,
} from "../src/server/dealerAccess.ts";

const TOKEN_DEALER_A = "dev-firebase-token-dealer-a";
const TOKEN_ADMIN = "dev-firebase-token-admin";
const BETA_TOKEN = "beta-thor-token-step-2c";

const UID_DEALER_A = "firebase-dealer-a";
const UID_ADMIN = "firebase-admin";
const DEALER_A = "dealer-a";
const DEALER_B = "dealer-b";
const THOR_AUTO = "thor-auto";

process.env.NONGA_DEALER_TOKEN_MAP = "";
process.env.NONGA_BETA_DEALER_ID = "";
process.env.NONGA_DEALER_API_TOKEN = "";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_DEALER_A]: {
    uid: UID_DEALER_A,
    email: "dealer-a@example.test",
    displayName: "Dealer A",
  },
  [TOKEN_ADMIN]: {
    uid: UID_ADMIN,
    email: "admin@example.test",
    displayName: "Admin",
  },
});

process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UID_DEALER_A]: {
    uid: UID_DEALER_A,
    email: "dealer-a@example.test",
    displayName: "Dealer A",
    role: "dealer",
    status: "active",
    dealerId: DEALER_A,
  },
  [UID_ADMIN]: {
    uid: UID_ADMIN,
    email: "admin@example.test",
    displayName: "Admin",
    role: "admin",
    status: "active",
  },
});

process.env.NONGA_DEV_DEALER_MEMBERSHIP_MAP = JSON.stringify({
  [UID_DEALER_A]: [
    {
      uid: UID_DEALER_A,
      dealerId: DEALER_A,
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

function runGuard(
  guard: (req: Request, res: Response, next: NextFunction) => void,
  req: Request
) {
  const { res, result } = createMockRes();
  return new Promise<{ calledNext: boolean; statusCode: number; body: unknown }>(
    (resolve) => {
      const next: NextFunction = () => {
        resolve({ calledNext: true, statusCode: result.statusCode, body: result.body });
      };
      guard(req, res, next);
      setTimeout(() => {
        resolve({ calledNext: false, statusCode: result.statusCode, body: result.body });
      }, 1000);
    }
  );
}

function assertDealerScope(req: Request, expectedDealerId: string) {
  const scope = parseDealerRequestScope(req);
  const auth = requireDealerId(scope);
  if (auth.ok === false || auth.dealerId !== expectedDealerId) {
    throw new Error(`expected dealer scope ${expectedDealerId}`);
  }
}

async function run() {
  console.log("=== Nong A v5.0 Dealer API Auth Smoke ===");

  const dealerAReq = reqWith({
    authorization: `Bearer ${TOKEN_DEALER_A}`,
    "x-dealer-id": DEALER_A,
  });
  const dealerA = await runGuard(dealerApiAuth, dealerAReq);
  if (
    !dealerA.calledNext ||
    dealerAReq.apiAuth?.provider !== "firebase" ||
    dealerAReq.apiAuth.dealerId !== DEALER_A
  ) {
    throw new Error("dealer A could not access dealer A");
  }
  assertDealerScope(dealerAReq, DEALER_A);
  console.log("PASS dealer A accesses dealer A");

  const dealerMismatchReq = reqWith({
    authorization: `Bearer ${TOKEN_DEALER_A}`,
    "x-dealer-id": DEALER_B,
  });
  const dealerMismatch = await runGuard(dealerApiAuth, dealerMismatchReq);
  if (dealerMismatch.calledNext || dealerMismatch.statusCode !== 403) {
    throw new Error("dealer A was allowed to spoof dealer B");
  }
  console.log("PASS dealer A spoofing dealer B rejected");

  process.env.NONGA_DEALER_TOKEN_MAP = JSON.stringify({
    [THOR_AUTO]: BETA_TOKEN,
  });

  const betaReq = reqWith({
    authorization: `Bearer ${BETA_TOKEN}`,
    "x-dealer-id": THOR_AUTO,
  });
  const betaOk = await runGuard(dealerApiAuth, betaReq);
  if (
    !betaOk.calledNext ||
    betaReq.apiAuth?.provider !== "stub" ||
    betaReq.apiAuth.dealerId !== THOR_AUTO
  ) {
    throw new Error("beta token binding did not allow thor-auto");
  }
  console.log("PASS beta token binding allows thor-auto");

  const betaMismatchReq = reqWith({
    authorization: `Bearer ${BETA_TOKEN}`,
    "x-dealer-id": DEALER_B,
  });
  const betaMismatch = await runGuard(dealerApiAuth, betaMismatchReq);
  if (betaMismatch.calledNext || betaMismatch.statusCode !== 403) {
    throw new Error("beta token binding allowed mismatched dealer");
  }
  console.log("PASS beta token binding rejects other dealer");

  process.env.NONGA_DEALER_TOKEN_MAP = "";
  const devStubReq = reqWith({
    authorization: "Bearer nonga-v4-dev-dealer-token",
    "x-dealer-id": THOR_AUTO,
  });
  const devStub = await runGuard(dealerApiAuth, devStubReq);
  if (
    !devStub.calledNext ||
    devStubReq.apiAuth?.provider !== "stub" ||
    devStubReq.apiAuth.dealerId !== THOR_AUTO
  ) {
    throw new Error("DEV stub dealer token path broke");
  }
  console.log("PASS DEV stub dealer path");

  const adminStubReq = reqWith({
    authorization: "Bearer nonga-v4-dev-admin-token",
    "x-user-role": "superadmin",
  });
  const adminStub = await runGuard(adminApiAuth, adminStubReq);
  if (
    !adminStub.calledNext ||
    adminStubReq.apiAuth?.provider !== "stub" ||
    adminStubReq.apiAuth.role !== "superadmin"
  ) {
    throw new Error("admin/superadmin stub path broke");
  }
  console.log("PASS admin/superadmin stub path");

  const adminFirebaseReq = reqWith({
    authorization: `Bearer ${TOKEN_ADMIN}`,
  });
  const adminFirebase = await runGuard(adminApiAuth, adminFirebaseReq);
  if (
    !adminFirebase.calledNext ||
    adminFirebaseReq.apiAuth?.provider !== "firebase" ||
    adminFirebaseReq.apiAuth.role !== "admin"
  ) {
    throw new Error("admin Firebase path broke");
  }
  console.log("PASS admin Firebase path");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

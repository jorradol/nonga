import { spawnSync } from "child_process";
import type { NextFunction, Request, Response } from "express";
import { adminApiAuth, dealerApiAuth } from "../src/server/apiAuth.ts";
import {
  authorizeDealerScope,
  getServerAuthContext,
  ServerAuthError,
} from "../src/server/serverAuthContext.ts";
import { isPublicSignupEnabled } from "../src/services/auth/authService.ts";

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

function runSeed(env: NodeJS.ProcessEnv) {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/tsx/dist/cli.mjs", "scripts/seed-v50-firebase-role-test-users.mts", "--dry-run", "--json"],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: "utf8",
    }
  );
  if (result.status !== 0) {
    throw new Error(`seed dry-run failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout) as {
    users: Record<string, Record<string, unknown>>;
    dealerMembers: Record<string, Record<string, unknown>>;
  };
}

console.log("=== Nong A v5.0 Real Login Role Flow Dry Run ===");

const seedEnv = {
  NONGA_TEST_MEMBER_UID: "real-role-member-uid",
  NONGA_TEST_MEMBER_EMAIL: "member.role@example.test",
  NONGA_TEST_MEMBER_DISPLAY_NAME: "Role Test Member",
  NONGA_TEST_DEALER_UID: "real-role-dealer-uid",
  NONGA_TEST_DEALER_EMAIL: "dealer.role@example.test",
  NONGA_TEST_DEALER_DISPLAY_NAME: "Role Test Dealer",
  NONGA_TEST_DEALER_ID: "thor-auto",
  NONGA_TEST_DEALER_NAME: "Thor Auto Demo",
  NONGA_TEST_ADMIN_UID: "real-role-admin-uid",
  NONGA_TEST_ADMIN_EMAIL: "admin.role@example.test",
  NONGA_TEST_ADMIN_DISPLAY_NAME: "Role Test Admin",
  NONGA_TEST_ADMIN_ROLE: "admin",
};

const plan = runSeed(seedEnv);
const userDocs = Object.values(plan.users);
const dealerMembershipDocs = Object.values(plan.dealerMembers);
assert(userDocs.length === 3, "seed plan should create member/dealer/admin users");
assert(dealerMembershipDocs.length === 1, "seed plan should create one dealer membership");
assert(
  userDocs.every((doc) => !("password" in doc) && !("secret" in doc)),
  "seed plan must not contain passwords or secrets"
);
assert(
  userDocs.some((doc) => doc.role === "member" && doc.status === "active") &&
    userDocs.some((doc) => doc.role === "dealer" && doc.status === "active") &&
    userDocs.some((doc) => doc.role === "admin" && doc.status === "active"),
  "seed plan should include active member/dealer/admin roles"
);
console.log("PASS seed dry-run builds safe member/dealer/admin docs");

const memberUid = String(seedEnv.NONGA_TEST_MEMBER_UID);
const dealerUid = String(seedEnv.NONGA_TEST_DEALER_UID);
const adminUid = String(seedEnv.NONGA_TEST_ADMIN_UID);
const dealerId = String(seedEnv.NONGA_TEST_DEALER_ID);
const memberToken = "real-login-member-token";
const dealerToken = "real-login-dealer-token";
const dealerNoMembershipToken = "real-login-dealer-no-membership-token";
const adminToken = "real-login-admin-token";
const suspendedToken = "real-login-suspended-token";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [memberToken]: {
    uid: memberUid,
    email: seedEnv.NONGA_TEST_MEMBER_EMAIL,
    displayName: seedEnv.NONGA_TEST_MEMBER_DISPLAY_NAME,
  },
  [dealerToken]: {
    uid: dealerUid,
    email: seedEnv.NONGA_TEST_DEALER_EMAIL,
    displayName: seedEnv.NONGA_TEST_DEALER_DISPLAY_NAME,
  },
  [dealerNoMembershipToken]: {
    uid: "real-role-dealer-no-membership-uid",
    email: "dealer-no-membership@example.test",
    displayName: "Dealer Without Membership",
  },
  [adminToken]: {
    uid: adminUid,
    email: seedEnv.NONGA_TEST_ADMIN_EMAIL,
    displayName: seedEnv.NONGA_TEST_ADMIN_DISPLAY_NAME,
  },
  [suspendedToken]: {
    uid: "real-role-suspended-uid",
    email: "suspended.role@example.test",
    displayName: "Suspended Role Test",
  },
});

process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  ...plan.users,
  "real-role-dealer-no-membership-uid": {
    uid: "real-role-dealer-no-membership-uid",
    email: "dealer-no-membership@example.test",
    displayName: "Dealer Without Membership",
    role: "dealer",
    status: "active",
    dealerId,
    dealerName: "Thor Auto Demo",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
  },
  "real-role-suspended-uid": {
    uid: "real-role-suspended-uid",
    email: "suspended.role@example.test",
    displayName: "Suspended Role Test",
    role: "dealer",
    status: "suspended",
    dealerId,
    dealerName: "Thor Auto Demo",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
  },
});

process.env.NONGA_DEV_DEALER_MEMBERSHIP_MAP = JSON.stringify({
  [dealerUid]: dealerMembershipDocs,
  "real-role-suspended-uid": [
    {
      uid: "real-role-suspended-uid",
      dealerId,
      dealerName: "Thor Auto Demo",
      roleInDealer: "owner",
      status: "active",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    },
  ],
});

assert(
  !isPublicSignupEnabled({ DEV: false, VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "" }, false),
  "public signup must be disabled by default in real auth mode"
);
console.log("PASS public signup remains disabled by default");

const memberContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${memberToken}` })
);
assert(memberContext.role === "member" && memberContext.status === "active", "member context failed");
const memberScope = authorizeDealerScope(memberContext, dealerId);
assert(memberScope.ok === false && memberScope.status === 403, "member should not enter dealer scope");
console.log("PASS active member cannot enter dealer scope");

const dealerContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${dealerToken}` })
);
assert(
  dealerContext.role === "dealer" &&
    dealerContext.dealerId === dealerId &&
    dealerContext.memberships[0]?.status === "active",
  "dealer context should include active membership"
);
const dealerGuardReq = reqWith({
  authorization: `Bearer ${dealerToken}`,
  "x-dealer-id": dealerId,
});
const dealerGuard = await runGuard(dealerApiAuth, dealerGuardReq);
assert(dealerGuard.calledNext, "active dealer should enter dealer API");
console.log("PASS active dealer with active membership enters dealer API");

const noMembershipContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${dealerNoMembershipToken}` })
);
const noMembershipScope = authorizeDealerScope(noMembershipContext, dealerId);
assert(
  noMembershipScope.ok === false && noMembershipScope.status === 403,
  "dealer role without active membership should be blocked"
);
console.log("PASS dealer role without membership is blocked");

const adminReq = reqWith({ authorization: `Bearer ${adminToken}` });
const adminGuard = await runGuard(adminApiAuth, adminReq);
assert(adminGuard.calledNext && adminReq.apiAuth?.role === "admin", "admin must come from server profile");
console.log("PASS admin role comes from server profile");

try {
  await getServerAuthContext(reqWith({ authorization: `Bearer ${suspendedToken}` }));
  throw new Error("suspended user unexpectedly passed");
} catch (err) {
  assert(err instanceof ServerAuthError && err.status === 403, "suspended user should be blocked");
}
console.log("PASS suspended user is blocked");

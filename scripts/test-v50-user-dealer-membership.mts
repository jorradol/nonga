import type { NextFunction, Request, Response } from "express";
import { adminApiAuth, dealerApiAuth } from "../src/server/apiAuth.ts";
import {
  authorizeDealerScope,
  getServerAuthContext,
  ServerAuthError,
} from "../src/server/serverAuthContext.ts";

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

console.log("=== Nong A v5.0 User Dealer Membership Smoke ===");

const TOKENS = {
  noProfile: "membership-no-profile",
  member: "membership-member-active",
  dealer: "membership-dealer-active",
  dealerDisabled: "membership-dealer-disabled",
  dealerPending: "membership-dealer-pending",
  admin: "membership-admin-active",
  superadmin: "membership-superadmin-active",
  suspended: "membership-suspended",
};

const UIDS = {
  noProfile: "uid-no-profile",
  member: "uid-member-active",
  dealer: "uid-dealer-active",
  dealerDisabled: "uid-dealer-disabled",
  dealerPending: "uid-dealer-pending",
  admin: "uid-admin-active",
  superadmin: "uid-superadmin-active",
  suspended: "uid-suspended",
};

const DEALER_ID = "thor-auto";
const OTHER_DEALER_ID = "other-dealer";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKENS.noProfile]: {
    uid: UIDS.noProfile,
    email: "missing-profile@example.test",
    displayName: "Missing Profile",
  },
  [TOKENS.member]: {
    uid: UIDS.member,
    email: "member@example.test",
    displayName: "Active Member",
  },
  [TOKENS.dealer]: {
    uid: UIDS.dealer,
    email: "dealer@example.test",
    displayName: "Active Dealer",
  },
  [TOKENS.dealerDisabled]: {
    uid: UIDS.dealerDisabled,
    email: "disabled-dealer@example.test",
    displayName: "Disabled Dealer",
  },
  [TOKENS.dealerPending]: {
    uid: UIDS.dealerPending,
    email: "pending-dealer@example.test",
    displayName: "Pending Dealer",
  },
  [TOKENS.admin]: {
    uid: UIDS.admin,
    email: "admin@example.test",
    displayName: "Active Admin",
  },
  [TOKENS.superadmin]: {
    uid: UIDS.superadmin,
    email: "superadmin@example.test",
    displayName: "Active Superadmin",
  },
  [TOKENS.suspended]: {
    uid: UIDS.suspended,
    email: "suspended@example.test",
    displayName: "Suspended User",
  },
});

process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UIDS.member]: {
    uid: UIDS.member,
    email: "member@example.test",
    displayName: "Active Member",
    role: "member",
    status: "active",
  },
  [UIDS.dealer]: {
    uid: UIDS.dealer,
    email: "dealer@example.test",
    displayName: "Active Dealer",
    role: "dealer",
    status: "active",
    dealerId: DEALER_ID,
    dealerName: "Thor Auto Demo",
  },
  [UIDS.dealerDisabled]: {
    uid: UIDS.dealerDisabled,
    email: "disabled-dealer@example.test",
    displayName: "Disabled Dealer",
    role: "dealer",
    status: "active",
    dealerId: DEALER_ID,
    dealerName: "Thor Auto Demo",
  },
  [UIDS.dealerPending]: {
    uid: UIDS.dealerPending,
    email: "pending-dealer@example.test",
    displayName: "Pending Dealer",
    role: "dealer",
    status: "active",
    dealerId: DEALER_ID,
    dealerName: "Thor Auto Demo",
  },
  [UIDS.admin]: {
    uid: UIDS.admin,
    email: "admin@example.test",
    displayName: "Active Admin",
    role: "admin",
    status: "active",
  },
  [UIDS.superadmin]: {
    uid: UIDS.superadmin,
    email: "superadmin@example.test",
    displayName: "Active Superadmin",
    role: "superadmin",
    status: "active",
  },
  [UIDS.suspended]: {
    uid: UIDS.suspended,
    email: "suspended@example.test",
    displayName: "Suspended User",
    role: "dealer",
    status: "suspended",
    dealerId: DEALER_ID,
  },
});

const membershipBase = {
  roleInDealer: "owner",
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
};

process.env.NONGA_DEV_DEALER_MEMBERSHIP_MAP = JSON.stringify({
  [UIDS.dealer]: [
    {
      ...membershipBase,
      uid: UIDS.dealer,
      dealerId: DEALER_ID,
      dealerName: "Thor Auto Demo",
      status: "active",
    },
  ],
  [UIDS.dealerDisabled]: [
    {
      ...membershipBase,
      uid: UIDS.dealerDisabled,
      dealerId: DEALER_ID,
      dealerName: "Thor Auto Demo",
      status: "disabled",
    },
  ],
  [UIDS.dealerPending]: [
    {
      ...membershipBase,
      uid: UIDS.dealerPending,
      dealerId: DEALER_ID,
      dealerName: "Thor Auto Demo",
      status: "pending",
    },
  ],
  [UIDS.suspended]: [
    {
      ...membershipBase,
      uid: UIDS.suspended,
      dealerId: DEALER_ID,
      dealerName: "Thor Auto Demo",
      status: "active",
    },
  ],
});

const noProfileContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${TOKENS.noProfile}` })
);
assert(
  noProfileContext.role === "member" && noProfileContext.status === "pending",
  "missing users/{uid} should fall back to member pending"
);
console.log("PASS missing profile falls back to member pending");

const memberContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${TOKENS.member}` })
);
assert(memberContext.role === "member" && memberContext.status === "active", "active member context failed");
const memberScope = authorizeDealerScope(memberContext, DEALER_ID);
assert(memberScope.ok === false && memberScope.status === 403, "member should not access dealer scope");
console.log("PASS active member is blocked from dealer scope");

const dealerContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${TOKENS.dealer}` })
);
assert(
  dealerContext.role === "dealer" &&
    dealerContext.dealerId === DEALER_ID &&
    dealerContext.dealerName === "Thor Auto Demo" &&
    dealerContext.memberships[0]?.status === "active",
  "active dealer membership did not resolve"
);
const dealerGuardReq = reqWith({
  authorization: `Bearer ${TOKENS.dealer}`,
  "x-dealer-id": DEALER_ID,
});
const dealerGuard = await runGuard(dealerApiAuth, dealerGuardReq);
assert(dealerGuard.calledNext, "active dealer should enter dealer API");
console.log("PASS active dealer membership enters dealer API");

const disabledContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${TOKENS.dealerDisabled}` })
);
const disabledScope = authorizeDealerScope(disabledContext, DEALER_ID);
assert(
  disabledScope.ok === false && disabledScope.status === 403,
  "disabled dealer membership should not enter dealer scope"
);
console.log("PASS disabled dealer membership is blocked");

const pendingContext = await getServerAuthContext(
  reqWith({ authorization: `Bearer ${TOKENS.dealerPending}` })
);
const pendingScope = authorizeDealerScope(pendingContext, DEALER_ID);
assert(
  pendingScope.ok === false &&
    pendingScope.message === "บัญชีดีลเลอร์นี้ยังรอการอนุมัติครับ",
  "pending dealer membership should return pending message"
);
console.log("PASS pending dealer membership is blocked with friendly message");

const spoofScope = authorizeDealerScope(dealerContext, OTHER_DEALER_ID);
assert(spoofScope.ok === false && spoofScope.status === 403, "mismatched dealerId should be rejected");
console.log("PASS mismatched X-Dealer-Id is rejected");

const memberAdminReq = reqWith({
  authorization: `Bearer ${TOKENS.member}`,
  "x-user-role": "admin",
});
const memberAdminGuard = await runGuard(adminApiAuth, memberAdminReq);
assert(
  !memberAdminGuard.calledNext && memberAdminGuard.statusCode === 403,
  "frontend x-user-role admin must not grant admin access"
);
console.log("PASS frontend role header cannot grant admin");

const adminReq = reqWith({ authorization: `Bearer ${TOKENS.admin}` });
const adminGuard = await runGuard(adminApiAuth, adminReq);
assert(adminGuard.calledNext && adminReq.apiAuth?.role === "admin", "admin profile should enter admin API");
const superReq = reqWith({ authorization: `Bearer ${TOKENS.superadmin}` });
const superGuard = await runGuard(adminApiAuth, superReq);
assert(
  superGuard.calledNext && superReq.apiAuth?.role === "superadmin",
  "superadmin profile should enter admin API"
);
console.log("PASS admin/superadmin come from server profile");

try {
  await getServerAuthContext(reqWith({ authorization: `Bearer ${TOKENS.suspended}` }));
  throw new Error("suspended user unexpectedly built context");
} catch (err) {
  assert(
    err instanceof ServerAuthError && err.status === 403,
    "suspended user should be blocked with 403"
  );
}
console.log("PASS suspended user is blocked");

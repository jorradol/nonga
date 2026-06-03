/**
 * v5.4.11 — closed pilot user provisioning (admin portal)
 * npm run test:v5411-closed-pilot-user-provisioning
 */
import fs from "node:fs";
import path from "node:path";
import {
  membershipDocId,
  validatePilotProvisionRequest,
  normalizePilotStatus,
  canSuspendSuperadmin,
} from "../src/services/admin/pilotUserProvisioningCore.ts";
import { isPublicSignupEnabled } from "../src/services/auth/authService.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("--- Core validation ---");
const memberOk = validatePilotProvisionRequest(
  { uid: "member-uid-1", role: "member", status: "active", email: "m@t.com" },
  "admin"
);
ok("admin-can-provision-member", memberOk.ok === true, "");

const dealerMissing = validatePilotProvisionRequest(
  { uid: "dealer-uid-1", role: "dealer", status: "active" },
  "admin"
);
ok("dealer-requires-dealer-id", dealerMissing.ok === false, "");

const dealerOk = validatePilotProvisionRequest(
  {
    uid: "dealer-uid-1",
    role: "dealer",
    status: "active",
    dealerId: "thor-auto",
  },
  "admin"
);
ok("admin-can-provision-dealer-with-id", dealerOk.ok === true, "");

const superCreate = validatePilotProvisionRequest(
  { uid: "x", role: "superadmin", status: "active" },
  "superadmin"
);
ok("cannot-create-superadmin", superCreate.ok === false, "");

const adminByAdmin = validatePilotProvisionRequest(
  { uid: "a", role: "admin", status: "active" },
  "admin"
);
ok("admin-cannot-create-admin", adminByAdmin.ok === false, "");

const adminBySuper = validatePilotProvisionRequest(
  { uid: "a", role: "admin", status: "active" },
  "superadmin"
);
ok("superadmin-can-create-admin", adminBySuper.ok === true, "");

ok(
  "membership-doc-id-format",
  membershipDocId("uid1", "thor-auto") === "uid1_thor-auto",
  ""
);

ok("inactive-maps-to-suspended", normalizePilotStatus("inactive") === "suspended", "");

const lastSuperadminBlock = canSuspendSuperadmin("superadmin", "suspended", 1);
ok("cannot-disable-last-superadmin", lastSuperadminBlock.ok === false, "");

console.log("\n--- Server routes & guards ---");
const serverTs = fs.readFileSync(path.resolve("server.ts"), "utf8");
const routesTs = fs.readFileSync(
  path.resolve("src/server/adminPilotUserRoutes.ts"),
  "utf8"
);
const routeGuard = fs.readFileSync(
  path.resolve("src/components/auth/RouteGuard.tsx"),
  "utf8"
);
const appTsx = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");

ok(
  "server-registers-pilot-user-routes",
  serverTs.includes("registerAdminPilotUserRoutes") &&
    routesTs.includes("/api/admin/pilot-users/provision"),
  ""
);
ok(
  "routes-block-superadmin-target",
  routesTs.includes("ไม่สามารถแก้ไข superadmin"),
  ""
);
ok(
  "routes-use-admin-sdk-firestore",
  routesTs.includes("getServerFirestore") &&
    routesTs.includes('collection("users")') &&
    routesTs.includes('collection("dealerMembers")'),
  ""
);
ok(
  "admin-pilot-users-require-admin-guard",
  appTsx.includes('case "admin-pilot-users"') &&
    appTsx.includes("RequireAdmin") &&
    appTsx.includes("AdminPilotUsersView"),
  ""
);
ok("route-guard-has-require-admin", routeGuard.includes("RequireAdmin"), "");

console.log("\n--- Public signup unchanged ---");
ok("public-signup-disabled", isPublicSignupEnabled() === false, "");

console.log("\n--- Client API uses firebase admin headers ---");
const apiHeaders = fs.readFileSync(
  path.resolve("src/utils/apiAuthHeaders.ts"),
  "utf8"
);
const pilotApi = fs.readFileSync(
  path.resolve("src/services/admin/pilotUserProvisioningApi.ts"),
  "utf8"
);
ok(
  "admin-auth-headers-async",
  apiHeaders.includes("adminAuthHeadersAsync"),
  ""
);
ok(
  "pilot-api-uses-async-headers",
  pilotApi.includes("adminAuthHeadersAsync"),
  ""
);

const pilotUi = fs.readFileSync(
  path.resolve("src/components/admin/AdminPilotUsersView.tsx"),
  "utf8"
);
const dealerIdentity = fs.readFileSync(
  path.resolve("src/utils/dealerIdentity.ts"),
  "utf8"
);

ok(
  "ui-no-password-field",
  !/type=["']password["']/i.test(pilotUi) &&
    !/name=["']password["']/i.test(pilotUi) &&
    !pilotUi.includes("passwordReset"),
  ""
);
ok(
  "ui-quick-member-dealer-buttons",
  pilotUi.includes("เปิดสิทธิ์สมาชิก") && pilotUi.includes("เปิดสิทธิ์ดีลเลอร์"),
  ""
);
ok(
  "dealer-scope-still-uses-membership",
  dealerIdentity.includes("resolveDealerInventoryScopeId"),
  ""
);

console.log("\nDone v5.4.11 closed pilot user provisioning tests.");

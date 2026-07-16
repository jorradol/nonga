/**
 * Dealer Portal canonical dealer scope fix — targeted regression tests
 * npm run test:dealer-canonical-scope-fix
 */
import fs from "node:fs";
import path from "node:path";
import {
  isOpaqueFirebaseUid,
  resolveCanonicalDealerId,
  resolveDealerInventoryScopeId,
} from "../src/utils/dealerIdentity.ts";

const DEALER1_UID = "IjExEQybqsMt6TBg0MxV980hCl23";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("--- dealerIdentity: no Firebase uid as dealer scope ---");
ok(
  "isOpaqueFirebaseUid(dealer1)",
  isOpaqueFirebaseUid(DEALER1_UID),
  ""
);
ok(
  "resolveCanonicalDealerId rejects firebase uid",
  resolveCanonicalDealerId(DEALER1_UID) === null,
  ""
);
ok(
  "resolveCanonicalDealerId accepts nonga-dealer",
  resolveCanonicalDealerId("nonga-dealer") === "nonga-dealer",
  ""
);
ok(
  "dealer without profile dealerId scope is null",
  resolveDealerInventoryScopeId(
    { uid: DEALER1_UID, role: "dealer" },
    "dealer"
  ) === null,
  ""
);
ok(
  "dealer with profile dealerId uses canonical id",
  resolveDealerInventoryScopeId(
    { uid: DEALER1_UID, role: "dealer", dealerId: "nonga-dealer" },
    "dealer"
  ) === "nonga-dealer",
  ""
);
ok(
  "admin without dealerId scope is null",
  resolveDealerInventoryScopeId({ uid: "admin1-uid", role: "admin" }, "admin") ===
    null,
  ""
);
ok(
  "legacy dealer- uid prefix still resolves",
  resolveDealerInventoryScopeId(
    { uid: "dealer-thor-auto", role: "dealer" },
    "dealer"
  ) === "thor-auto",
  ""
);

console.log("\n--- profile route returns authoritative dealer fields ---");
const userSelfRoutes = fs.readFileSync(
  path.resolve("src/server/userSelfRoutes.ts"),
  "utf8"
);
ok(
  "profile includes auth.dealerId",
  userSelfRoutes.includes("auth.dealerId") &&
    userSelfRoutes.includes("dealerName: auth.dealerName"),
  ""
);

console.log("\n--- userService maps dealerId/dealerName ---");
const userService = fs.readFileSync(
  path.resolve("src/services/user/userService.ts"),
  "utf8"
);
ok(
  "UserProfileData has dealerId",
  userService.includes("dealerId?: string") &&
    userService.includes("dealerName?: string"),
  ""
);
ok(
  "getUserProfile maps dealer fields",
  userService.includes("...(dealerId ? { dealerId } : {})"),
  ""
);

console.log("\n--- AuthContext maps dealer scope into session ---");
const authContext = fs.readFileSync(
  path.resolve("src/contexts/auth/AuthContext.tsx"),
  "utf8"
);
ok(
  "session receives profile.dealerId",
  authContext.includes("profile.dealerId ? { dealerId: profile.dealerId }"),
  ""
);

console.log("\nDone dealer canonical scope fix tests.");

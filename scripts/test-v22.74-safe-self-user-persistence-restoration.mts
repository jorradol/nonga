/**
 * v22.74 — SAFE SELF-USER PERSISTENCE RESTORATION
 *
 * Static regression guard for:
 * - API-mediation-first self-user settings/personality
 * - server-side safe lazy profile provisioning
 * - auth/profile readiness gating in client orchestration
 * - no direct client system_configs write path
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function read(relPath: string): string {
  return readFileSync(resolve(relPath), "utf8");
}

const serverAuthContext = read("src/server/serverAuthContext.ts");
const userSelfRoutes = read("src/server/userSelfRoutes.ts");
const userService = read("src/services/user/userService.ts");
const useSettings = read("src/hooks/settings/useSettings.ts");
const useChat = read("src/hooks/chat/useChat.ts");
const personalityConfig = read("src/services/ai/personality/personalityConfig.ts");
const authService = read("src/services/auth/authService.ts");
const authContext = read("src/contexts/auth/AuthContext.tsx");
const serverEntry = read("server.ts");

console.log("=== v22.74 safe self-user persistence restoration ===\n");

ok(
  "S1 server lazy profile provisioning is present",
  serverAuthContext.includes("ensureSafeUserProfileProvisioned") &&
    serverAuthContext.includes("tx.create(userRef, safeDefaults)")
);

ok(
  "S2 provisioning safe defaults are non-privileged",
  serverAuthContext.includes('role: "member"') &&
    serverAuthContext.includes('status: "pending"')
);

ok(
  "S3 self-user routes include profile readiness endpoint",
  userSelfRoutes.includes('app.get("/api/me/profile-ready"')
);

ok(
  "S4 settings route rejects unknown fields",
  userSelfRoutes.includes("SETTINGS_ALLOWED_KEYS") &&
    userSelfRoutes.includes("ไม่อนุญาตฟิลด์")
);

ok(
  "S5 personality global write is admin-gated",
  userSelfRoutes.includes('app.patch("/api/admin/personality-config/:presetId"') &&
    userSelfRoutes.includes('role !== "admin" && role !== "superadmin"')
);

ok(
  "S6 personality public DTO hides internal prompt field",
  userSelfRoutes.includes("projectPublicPersonality") &&
    !/projectPublicPersonality[\s\S]{0,300}customSystemInstruction/.test(userSelfRoutes)
);

ok(
  "S7 server registers user self routes",
  serverEntry.includes("registerUserSelfRoutes(app)")
);

ok(
  "C1 user service uses API mediation for settings",
  userService.includes('"/api/me/settings"') && !userService.includes('doc(db, "user_settings"')
);

ok(
  "C2 user service uses API mediation for profile",
  userService.includes('"/api/me/profile"') && userService.includes("ensureProfileReady")
);

ok(
  "C3 auth service no direct Firestore profile create",
  !authService.includes('doc(db, "users"') && !authService.includes("serverTimestamp()")
);

ok(
  "C4 auth context uses profile readiness mediation",
  authContext.includes("userService.ensureProfileReady(uid)") &&
    !authContext.includes("setDoc(userDocRef")
);

ok(
  "C5 settings hook gates on profile readiness",
  useSettings.includes("await userService.ensureProfileReady(user.uid)")
);

ok(
  "C6 chat hook gates loads on profile readiness",
  useChat.includes("await userService.ensureProfileReady(user.uid)") &&
    useChat.includes("updatePersonalPreset")
);

ok(
  "C7 personality config uses API mediation not system_configs direct",
  personalityConfig.includes('"/api/personality/public"') &&
    personalityConfig.includes("/api/admin/personality-config/") &&
    !personalityConfig.includes('doc(db, "system_configs"')
);

console.log(`\n=== v22.74 result: ${pass} passed, ${fail} failed ===`);
if (process.exitCode) process.exit(process.exitCode);

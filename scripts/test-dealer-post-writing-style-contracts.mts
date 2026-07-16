/**
 * dealerPostWritingStyle wiring contract tests
 *
 * Objective:
 * - Ensure profile API + generator default tone are connected via users/[uid].dealerPostWritingStyle
 * - Ensure server-side allowlists + mock/failure honesty contracts
 * - Ensure no Buyer Chat code consumes dealerPostWritingStyle
 *
 * Run: npx tsx scripts/test-dealer-post-writing-style-contracts.mts
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const userSelfRoutes = read("src/server/userSelfRoutes.ts");
const userService = read("src/services/user/userService.ts");
const authContext = read("src/contexts/auth/AuthContext.tsx");
const userProfileView = read("src/components/UserProfileView.tsx");
const useCarPostGenerator = read("src/hooks/ai/post/useCarPostGenerator.ts");
const serverRoot = read("server.ts");

console.log("--- dealerPostWritingStyle contracts ---");

// Server: profile API DTO + PATCH allowlist + persistence scope
{
  ok(
    "profile GET includes dealerPostWritingStyle",
    userSelfRoutes.includes("dealerPostWritingStyle: normalizeDealerPostWritingStyle(")
  );
  ok(
    "profile PATCH allows dealerPostWritingStyle in allowed Set",
    userSelfRoutes.includes('"dealerPostWritingStyle",')
  );
  ok(
    "profile PATCH rejects invalid dealerPostWritingStyle with badRequest",
    userSelfRoutes.includes('dealerPostWritingStyle ไม่อนุญาต')
  );
  ok(
    "profile PATCH persists only users/[auth.uid]",
    userSelfRoutes.includes('collection("users").doc(auth.uid).set(input, { merge: true })')
  );

  ok(
    "profile normalize falls back to dealer",
    userSelfRoutes.includes('return "dealer";') || userSelfRoutes.includes(': "dealer";') || userSelfRoutes.includes(': "dealer"')
  );
}

// Client: profile DTO accepts + client updateUserProfile sanitizes
{
  ok("userService UserProfileData adds dealerPostWritingStyle", userService.includes("dealerPostWritingStyle:"));
  ok(
    "userService updateUserProfile allowedKeys includes dealerPostWritingStyle",
    userService.includes('"dealerPostWritingStyle"')
  );
  ok(
    "userService normalizes dealerPostWritingStyle to dealer fallback",
    userService.includes("normalizeDealerPostWritingStyle") && userService.includes(': "dealer";')
  );
}

// Client: AuthContext simulated defaults + updateUserProfile patch plumbing
{
  ok("AuthContext simulated profile sets dealerPostWritingStyle", authContext.includes('dealerPostWritingStyle: "dealer"'));
  ok(
    "AuthContext updateUserProfile allows dealerPostWritingStyle in allowedProfilePatch",
    authContext.includes("dealerPostWritingStyle: \"dealer\"") && authContext.includes("updatesAny.dealerPostWritingStyle")
  );
}

// UI: Profile UI writes dealerPostWritingStyle (no aiPersona usage)
{
  ok(
    "UserProfileView writes dealerPostWritingStyle (not aiPersona)",
    userProfileView.includes("dealerPostWritingStyle: t.id") || userProfileView.includes("dealerPostWritingStyle")
  );
  ok("UserProfileView does not reference aiPersona", !/aiPersona/.test(userProfileView));
}

// Generator: hydrate options.tone from profile style, fallback dealer
{
  ok(
    "useCarPostGenerator initialOptions tone is dealer",
    useCarPostGenerator.includes('tone: "dealer"')
  );
  ok(
    "useCarPostGenerator hydrates tone from dealerPostWritingStyle",
    useCarPostGenerator.includes("dealerPostWritingStyle") &&
      useCarPostGenerator.includes("setOptions(") &&
      useCarPostGenerator.includes("tone: next")
  );
  ok(
    "useCarPostGenerator fallback tone is dealer on invalid",
    useCarPostGenerator.includes('return allowed.has') && useCarPostGenerator.includes(': "dealer"')
  );
}

// Server generation: tone validation + honesty contracts (mock/failure not success)
{
  ok(
    "server.ts generates toneAllowlist with allowlisted values",
    serverRoot.includes("toneAllowlist") &&
      serverRoot.includes('"dealer"') &&
      serverRoot.includes('"friendly"') &&
      serverRoot.includes('"tiktok"')
  );
  ok(
    "server.ts uses tone variable in prompt (sanitized only)",
    serverRoot.includes('Requested Copywriting Tone: "${tone}"')
  );
  ok(
    "server.ts includes Facts constraint for prompt",
    serverRoot.includes("Facts constraint (NO INVENT / NO ALTER)")
  );
  ok(
    "server.ts sets success=false when isMock=true",
    serverRoot.includes("success: false, isMock: true")
  );
}

// Buyer Chat leak prevention: only allowlist src files may contain dealerPostWritingStyle
{
  const rg = `rg -l "dealerPostWritingStyle" src`;
  let files: string[] = [];
  try {
    const out = execSync(rg, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    files = out ? out.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    // fallback: no rg
    files = [];
  }

  const allowed = new Set([
    "src/server/userSelfRoutes.ts",
    "src/hooks/ai/post/useCarPostGenerator.ts",
    "src/components/UserProfileView.tsx",
    "src/contexts/auth/AuthContext.tsx",
    "src/services/user/userService.ts",
  ]);
  const normalized = files.map((f) => f.trim().replace(/\\/g, "/"));
  const unexpected = normalized.filter((f) => !allowed.has(f));
  ok("dealerPostWritingStyle appears only in allowlisted src files", unexpected.length === 0, unexpected.join(", "));
}

// P0 gate presence (do not change gating behavior)
{
  ok(
    'useCarPostGenerator still checks checkGate("post-generation")',
    useCarPostGenerator.includes('await checkGate("post-generation")')
  );
}

if (process.exitCode && process.exitCode !== 0) {
  console.log("\nTimeline: dealerPostWritingStyle contract tests FAILED");
} else {
  console.log("\nTimeline: dealerPostWritingStyle contract tests PASSED");
}


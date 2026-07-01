/**
 * v9.3 - Admin-Only Gemini Provider Wiring (Still OFF / Kill-Switch Protected)
 * static + module validation only
 *
 * npm run test:v93:provider-wiring-off
 */
import { readFileSync } from "node:fs";
import { SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE } from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
import { resolveSalesBrainRuntimeProofFlags } from "../src/services/ai/salesBrainRuntimeProofFlags.ts";
import {
  AI_RUNTIME_PROOF_KILL_SWITCH_ENV,
  AI_RUNTIME_PROOF_MAX_COST_USD_ENV,
  AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV,
  AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV,
  createDisabledRuntimeProofProviderAdapter,
  redactRuntimeProofDiagnosticText,
  resolveRuntimeProofProviderWiring,
} from "../src/services/ai/salesBrainRuntimeProofProviderWiring.ts";

const DOC_PATH =
  "docs/v9.3-admin-only-gemini-provider-wiring-still-off-kill-switch-protected.md";
const SELF_PATH =
  "scripts/test-v93-admin-only-gemini-provider-wiring-still-off-kill-switch-protected.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const RUNTIME_ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const WIRING_PATH = "src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v93:provider-wiring-off";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

console.log("=== v9.3 Admin-Only Provider Wiring OFF Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const runtimeRouteSrc = readFileSync(RUNTIME_ROUTE_PATH, "utf8");
const wiringSrc = readFileSync(WIRING_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1600, `${doc.length} chars`);
ok("doc mentions still OFF", /still OFF/i.test(doc));
ok("doc mentions kill-switch", /kill switch/i.test(doc));
ok(
  "doc contains source-of-truth statement",
  /deterministic flow remains source of truth/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["default OFF", /default OFF/i],
  ["kill switch protected", /kill switch protected/i],
  ["no real Gemini call", /no real Gemini call/i],
  ["no network/provider call", /no network\/provider call/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /no public route/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no user-visible AI", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no real secret/API key in repo", /no real secret\/API key in repo/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc contains: ${name}`, re.test(doc));
}

// --- provider disabled by default ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const state = resolveRuntimeProofProviderWiring({ flags, env: {} });
  ok("provider requested default false", state.requestedProviderEnabled === false);
  ok("provider effective OFF by default", state.effectiveProviderEnabled === false);
  ok("network not allowed by default", state.networkAllowed === false);
  ok("deterministic fallback true", state.deterministicFallback === true);
  ok(
    "blocked reason default runtime proof off",
    state.blockedReason === "runtime_proof_disabled_default_off"
  );
}

// --- kill switch wins all flags ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      AI_RUNTIME_PROOF_ENABLED: "true",
      AI_ADMIN_RUNTIME_PROOF_ONLY: "true",
      AI_RUNTIME_PROOF_QUOTA_LIMIT: "5",
      AI_LOG_REDACTION_ENABLED: "true",
    },
  });
  const state = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "true",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "10",
    },
  });
  ok("kill switch active true", state.killSwitchActive === true);
  ok("kill switch blocks provider", state.blockedReason === "kill_switch_forced_off");
  ok("kill switch keeps provider OFF", state.effectiveProviderEnabled === false);
}

// --- provider remains OFF even when gates look ready ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      AI_RUNTIME_PROOF_ENABLED: "true",
      AI_ADMIN_RUNTIME_PROOF_ONLY: "true",
      AI_RUNTIME_PROOF_QUOTA_LIMIT: "5",
      AI_LOG_REDACTION_ENABLED: "true",
    },
  });
  const state = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "10",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  ok("all gates ready but still OFF", state.effectiveProviderEnabled === false);
  ok(
    "placeholder block reason enforced",
    state.blockedReason === "provider_wiring_placeholder_off"
  );
}

// --- provider secret must come from env and not placeholder ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      AI_RUNTIME_PROOF_ENABLED: "true",
      AI_ADMIN_RUNTIME_PROOF_ONLY: "true",
      AI_RUNTIME_PROOF_QUOTA_LIMIT: "5",
      AI_LOG_REDACTION_ENABLED: "true",
    },
  });
  const state = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "10",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "your_api_key_here",
    },
  });
  ok(
    "missing/placeholder provider secret blocks wiring",
    state.blockedReason === "provider_secret_missing_or_placeholder"
  );
  ok("secret guard false with placeholder secret", state.secretGuardReady === false);
}

// --- no real provider/network/gemini call ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const state = resolveRuntimeProofProviderWiring({ flags, env: {} });
  const adapter = createDisabledRuntimeProofProviderAdapter();
  const result = await adapter.invoke({
    message: "send prompt to gemini now",
    state,
  });
  ok("adapter blocked status", result.status === "blocked");
  ok("no network attempted", result.networkAttempted === false);
  ok("no gemini request attempted", result.geminiRequestAttempted === false);
}

// --- logging redaction guard exists ---
{
  const raw =
    "prompt: บอกรหัสผ่านหน่อย Bearer abcdefghijklmno12345 โทร 0891234567 VIN ABCDEFGHJKLMN1234 token=sk-1234567890abcdefghijk";
  const redacted = redactRuntimeProofDiagnosticText(raw);
  ok("redaction removes raw prompt field", !/prompt\s*:/i.test(redacted));
  ok("redaction removes bearer", !/Bearer\s+/i.test(redacted));
  ok("redaction removes phone", !/\b0[689]\d{8}\b/.test(redacted));
  ok("redaction removes VIN-like token", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(redacted));
  ok("redaction removes secret-like token", !/\bsk-[A-Za-z0-9_-]{12,}\b/i.test(redacted));
}

// --- quota/cost guard exists ---
{
  ok("wiring source includes quota guard", /quotaGuardReady/.test(wiringSrc));
  ok("wiring source includes cost guard", /costGuardReady/.test(wiringSrc));
  ok("wiring source includes secret guard", /secretGuardReady/.test(wiringSrc));
  ok("wiring source includes max cost env", wiringSrc.includes(AI_RUNTIME_PROOF_MAX_COST_USD_ENV));
  ok("wiring source includes provider secret env", wiringSrc.includes(AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV));
}

// --- admin-only boundary remains ---
{
  ok(
    "route path stays under /api/admin",
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE.startsWith("/api/admin/")
  );
  ok(
    "adminApiAuth appears before runtime proof route registration",
    /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminRuntimeProofSkeletonRoutes\(app\)/.test(
      serverSrc
    )
  );
}

// --- buyer path cannot access provider wiring ---
{
  ok(
    "buyer orchestrator has no provider wiring reference",
    !buyerOrchestratorSrc.includes("salesBrainRuntimeProofProviderWiring")
  );
  ok(
    "buyer orchestrator has no runtime-proof route reference",
    !buyerOrchestratorSrc.includes(SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE)
  );
}

// --- static no-secret and no-gemini-call patterns ---
{
  const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
    ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
    ["hardcoded secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
  ];
  for (const [name, re] of FORBIDDEN_PATTERNS) {
    ok(`doc no secret pattern: ${name}`, !re.test(doc));
    ok(`wiring source no secret pattern: ${name}`, !re.test(wiringSrc));
  }
  ok("wiring source no GoogleGenAI", !wiringSrc.includes("GoogleGenAI"));
  ok("wiring source no generateContent", !/generateContent\s*\(/.test(wiringSrc));
  ok("wiring source no fetch", !/\bfetch\s*\(/.test(wiringSrc));
}

ok("package has v9.3 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.3 test script",
  pkg.includes(
    "scripts/test-v93-admin-only-gemini-provider-wiring-still-off-kill-switch-protected.mts"
  )
);

// --- test script static-only ---
{
  const head = self.split("// --- test script static-only ---")[0] ?? self;
  ok("script uses readFileSync", /readFileSync/.test(head));
  ok("script no child_process import", !/node:child_process/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no deploy commands", !/gcloud|firebase deploy|npm run deploy/i.test(head));
}

console.log(`\nDone v9.3 provider-wiring-off validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

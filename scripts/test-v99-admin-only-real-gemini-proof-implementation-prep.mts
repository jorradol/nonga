/**
 * v9.9 - Admin-Only Real Gemini Proof Implementation Prep
 * static + module validation only
 *
 * npm run test:v99:implementation-prep
 */
import { readFileSync } from "node:fs";
import {
  AI_ADMIN_RUNTIME_PROOF_ONLY_ENV,
  AI_LOG_REDACTION_ENABLED_ENV,
  AI_RUNTIME_PROOF_ENABLED_ENV,
  AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV,
  resolveSalesBrainRuntimeProofFlags,
} from "../src/services/ai/salesBrainRuntimeProofFlags.ts";
import {
  AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV,
  AI_RUNTIME_PROOF_KILL_SWITCH_ENV,
  AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV,
  AI_RUNTIME_PROOF_MAX_COST_USD_ENV,
  AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV,
  AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV,
  AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV,
  AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV,
  AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV,
  createDisabledRuntimeProofProviderAdapter,
  createManualAdminGeminiRuntimeProofAdapter,
  redactRuntimeProofDiagnosticText,
  resolveRuntimeProofDryRunGate,
  resolveRuntimeProofProviderWiring,
  resolveRuntimeProofRealProviderGuard,
} from "../src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
import {
  SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
  buildAdminRuntimeProofSkeletonPayload,
} from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";

const DOC_PATH = "docs/v9.9-admin-only-real-gemini-proof-implementation-prep.md";
const SELF_PATH = "scripts/test-v99-admin-only-real-gemini-proof-implementation-prep.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const WIRING_PATH = "src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
const ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v99:implementation-prep";

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

console.log("=== v9.9 Admin-Only Real Gemini Proof Implementation Prep Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const wiringSrc = readFileSync(WIRING_PATH, "utf8");
const routeSrc = readFileSync(ROUTE_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2200, `${doc.length} chars`);
ok("doc contains v9.9 label", /v9\.9/i.test(doc));
ok("doc mentions implementation prep", /Implementation Prep/i.test(doc));
ok("doc includes source-of-truth phrase", /deterministic flow remains source of truth/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["default OFF", /default OFF/i],
  ["kill switch wins all flags", /kill switch wins all flags/i],
  ["admin-only boundary required", /admin-only boundary required/i],
  ["owner approval flag required", /owner approval flag required/i],
  ["manual proof mode required", /manual proof mode required/i],
  ["env-secret only", /env-secret only/i],
  ["quota guard cost guard", /quota guard \+ cost guard ready/i],
  ["dry-run gate passed", /dry-run gate passed/i],
  ["logging redaction", /logging redaction/i],
  ["deterministic fallback", /deterministic fallback/i],
  ["no real Gemini call in normal test", /no real Gemini call in normal test/i],
  ["no network/provider call in normal test", /no network\/provider call in normal test/i],
  ["no normal test depends on real secret", /no normal test depends on real secret/i],
  ["no public route", /no public route/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no user-visible AI", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

// --- default/normal path must stay OFF ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const wiring = resolveRuntimeProofProviderWiring({ flags, env: {} });
  const dryRun = resolveRuntimeProofDryRunGate({ flags, wiring, env: {} });
  const realGuard = resolveRuntimeProofRealProviderGuard({ flags, wiring, dryRunGate: dryRun, env: {} });
  const payload = buildAdminRuntimeProofSkeletonPayload(flags, wiring);
  const disabledAdapter = createDisabledRuntimeProofProviderAdapter();
  const disabledResult = await disabledAdapter.invoke({
    message: "please call gemini now",
    state: wiring,
  });

  ok("effectiveProviderEnabled false in default wiring", wiring.effectiveProviderEnabled === false);
  ok("dry-run gate disallows real provider in default path", dryRun.realProviderCallAllowed === false);
  ok("realProviderCallAllowed false in default path", realGuard.realProviderCallAllowed === false);
  ok("real guard effective provider false in default path", realGuard.effectiveProviderEnabled === false);
  ok("skeleton payload exposes real guard blocked", payload.realProviderGuard.realProviderCallAllowed === false);
  ok("disabled adapter no network call", disabledResult.networkAttempted === false);
  ok("disabled adapter no gemini request", disabledResult.geminiRequestAttempted === false);
}

// --- kill switch must win ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "5",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const wiring = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "true",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "5",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  const dryRun = resolveRuntimeProofDryRunGate({
    flags,
    wiring,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  const realGuard = resolveRuntimeProofRealProviderGuard({
    flags,
    wiring,
    dryRunGate: dryRun,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV]: "1",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  ok("kill switch active true", wiring.killSwitchActive === true);
  ok("kill switch blocks real guard", realGuard.blockedReasons.includes("kill_switch_forced_off"));
  ok("kill switch keeps realProviderCallAllowed false", realGuard.realProviderCallAllowed === false);
}

// --- secret placeholder, quota/cost, dry-run/manual-owner gates must fail-closed ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "5",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const wiringPlaceholderSecret = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "5",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "your_api_key_here",
    },
  });
  const dryRunNotReady = resolveRuntimeProofDryRunGate({
    flags,
    wiring: wiringPlaceholderSecret,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "false",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "false",
    },
  });
  const guardNotReady = resolveRuntimeProofRealProviderGuard({
    flags,
    wiring: wiringPlaceholderSecret,
    dryRunGate: dryRunNotReady,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "false",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "false",
    },
  });
  ok("placeholder secret blocked", guardNotReady.blockedReasons.includes("provider_secret_missing_or_placeholder"));
  ok("manual proof mode required", guardNotReady.blockedReasons.includes("manual_proof_mode_required"));
  ok("owner approval required", guardNotReady.blockedReasons.includes("owner_approval_flag_required"));
  ok("dry-run gate not ready blocked", guardNotReady.blockedReasons.includes("dry_run_gate_not_ready"));
  ok("real provider quota cap required", guardNotReady.blockedReasons.includes("real_provider_quota_cap_missing"));
  ok(
    "real provider activation required",
    guardNotReady.blockedReasons.includes("real_provider_activation_flag_required")
  );
  ok("guard fail-closed when gates incomplete", guardNotReady.realProviderCallAllowed === false);
}

// --- all gates green only in manual admin path ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "5",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const wiring = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "5",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  const dryRun = resolveRuntimeProofDryRunGate({
    flags,
    wiring,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  const realGuard = resolveRuntimeProofRealProviderGuard({
    flags,
    wiring,
    dryRunGate: dryRun,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV]: "1",
    },
  });
  const manualAdapter = createManualAdminGeminiRuntimeProofAdapter();
  const fallbackResult = await manualAdapter.invoke({
    message: "prompt: โทร 0891234567 VIN ABCDEFGHJKLMN1234",
    guard: realGuard,
  });
  ok("dry-run gate ready for future proof", dryRun.readyForFutureRealProof === true);
  ok("real guard can become true only with all gates", realGuard.realProviderCallAllowed === true);
  ok("manual adapter still deterministic fallback by default", fallbackResult.status === "fallback");
  ok("manual adapter no network by default", fallbackResult.networkAttempted === false);
  ok("manual adapter fallback remains source of truth", fallbackResult.deterministicFallbackUsed === true);
}

// --- redaction coverage ---
{
  const raw =
    "prompt: leak this Bearer abcdefghijklmno12345 phone 0891234567 VIN ABCDEFGHJKLMN1234 token=sk-1234567890abcdefghijk apiKey=AIzaSyExampleUnsafeNotReal123456789";
  const redacted = redactRuntimeProofDiagnosticText(raw);
  ok("redaction removes prompt field", !/prompt\s*:/i.test(redacted));
  ok("redaction removes phone", !/\b0[689]\d{8}\b/.test(redacted));
  ok("redaction removes VIN", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(redacted));
  ok("redaction removes bearer", !/Bearer\s+/i.test(redacted));
  ok("redaction removes token-like", !/\bsk-[A-Za-z0-9_-]{12,}\b/i.test(redacted));
  ok("redaction removes secret-like assignment", !/\b(?:api[_-]?key|secret|password|token)\b\s*[:=]/i.test(redacted));
}

// --- no buyer/public path exposure ---
{
  ok("runtime-proof route remains /api/admin only", SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE.startsWith("/api/admin/"));
  ok(
    "adminApiAuth appears before runtime-proof route register",
    /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminRuntimeProofSkeletonRoutes\(app\)/.test(
      serverSrc
    )
  );
  ok(
    "buyer orchestrator does not reference runtime-proof route",
    !buyerOrchestratorSrc.includes(SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE)
  );
  ok(
    "buyer orchestrator does not reference runtime-proof wiring",
    !buyerOrchestratorSrc.includes("salesBrainRuntimeProofProviderWiring")
  );
}

// --- no real secret/API key in repo scoped files ---
{
  const FILES_TO_SCAN = [doc, wiringSrc, routeSrc, serverSrc];
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
    ["hardcoded secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
  ];
  for (const [name, re] of SECRET_PATTERNS) {
    ok(`scoped files no secret pattern: ${name}`, FILES_TO_SCAN.every((text) => !re.test(text)));
  }
}

// --- no real gemini/network call in runtime-proof modules ---
{
  ok("wiring has no GoogleGenAI import", !wiringSrc.includes("GoogleGenAI"));
  ok("wiring has no fetch", !/\bfetch\s*\(/.test(wiringSrc));
  ok("wiring has no generateContent", !/generateContent\s*\(/.test(wiringSrc));
  ok("route has no fetch", !/\bfetch\s*\(/.test(routeSrc));
}

ok("package includes v9.9 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.9 validator script",
  pkg.includes("scripts/test-v99-admin-only-real-gemini-proof-implementation-prep.mts")
);

{
  const head = self.split('ok("package includes v9.9 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
}

console.log(`\nDone v9.9 implementation-prep validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


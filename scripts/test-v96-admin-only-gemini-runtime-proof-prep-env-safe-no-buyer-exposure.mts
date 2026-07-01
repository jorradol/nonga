/**
 * v9.6 - Admin-Only Gemini Runtime Proof Prep (Env-Safe / No Buyer Exposure)
 * static + module validation only
 *
 * npm run test:v96:runtime-proof-prep
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  AI_ADMIN_RUNTIME_PROOF_ONLY_ENV,
  AI_LOG_REDACTION_ENABLED_ENV,
  AI_RUNTIME_PROOF_ENABLED_ENV,
  AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV,
  resolveSalesBrainRuntimeProofFlags,
} from "../src/services/ai/salesBrainRuntimeProofFlags.ts";
import {
  AI_RUNTIME_PROOF_KILL_SWITCH_ENV,
  AI_RUNTIME_PROOF_MAX_COST_USD_ENV,
  AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV,
  AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV,
  createDisabledRuntimeProofProviderAdapter,
  redactRuntimeProofDiagnosticText,
  resolveRuntimeProofProviderWiring,
} from "../src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
import {
  SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
  buildAdminRuntimeProofSkeletonPayload,
} from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";

const DOC_PATH =
  "docs/v9.6-admin-only-gemini-runtime-proof-prep-env-safe-no-buyer-exposure.md";
const SELF_PATH =
  "scripts/test-v96-admin-only-gemini-runtime-proof-prep-env-safe-no-buyer-exposure.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const FLAGS_PATH = "src/services/ai/salesBrainRuntimeProofFlags.ts";
const WIRING_PATH = "src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
const ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v96:runtime-proof-prep";

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

function shellOut(command: string): string {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

console.log("=== v9.6 Admin-Only Runtime Proof Prep Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const flagsSrc = readFileSync(FLAGS_PATH, "utf8");
const wiringSrc = readFileSync(WIRING_PATH, "utf8");
const routeSrc = readFileSync(ROUTE_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1800, `${doc.length} chars`);
ok("doc contains v9.6 label", /v9\.6/i.test(doc));
ok("doc contains env-safe phrase", /Env-Safe/i.test(doc));
ok("doc contains no buyer exposure phrase", /No Buyer Exposure/i.test(doc));
ok("doc contains source-of-truth phrase", /deterministic flow remains source of truth/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["no real API key/secret in repo", /no real API key\/secret in repo/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /no public route/i],
  ["no buyer-facing ai", /no buyer-facing\/user-visible AI|no buyer-facing AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no uncontrolled real gemini call", /no uncontrolled real Gemini call/i],
  ["no normal test depends on real secret", /no normal test depends on real secret/i],
  ["kill switch wins", /kill switch wins/i],
  ["fallback deterministic", /fallback deterministic/i],
  ["redaction prompt phone vin token secret-like", /prompt\/phone\/VIN\/token\/secret-like/i],
  ["quota cost cap", /quota\/cost cap guard/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes phrase: ${name}`, re.test(doc));
}

// --- disabled by default + deterministic fallback ---
{
  const flagsDefault = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const stateDefault = resolveRuntimeProofProviderWiring({ flags: flagsDefault, env: {} });
  const payload = buildAdminRuntimeProofSkeletonPayload(flagsDefault, stateDefault);
  ok("runtime proof disabled by default", flagsDefault.runtimeProofEnabled === false);
  ok("default path blocked", flagsDefault.allowRuntimeProofPath === false);
  ok("deterministic fallback true", flagsDefault.deterministicFallback === true);
  ok("provider network remains false", flagsDefault.providerNetwork === false);
  ok("payload remains disabled", payload.status === "disabled");
  ok("payload deterministic source of truth", payload.deterministicSourceOfTruth === true);
}

// --- kill switch wins all flags ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "3",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const state = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "true",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "5",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  ok("kill switch active true", state.killSwitchActive === true);
  ok("kill switch blocked reason wins", state.blockedReason === "kill_switch_forced_off");
  ok("provider effective OFF with kill switch", state.effectiveProviderEnabled === false);
}

// --- env-safe secret guard ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "3",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const missingSecret = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "5",
    },
  });
  ok(
    "missing secret blocks runtime-proof wiring",
    missingSecret.blockedReason === "provider_secret_missing_or_placeholder"
  );
  ok("secret guard false when secret missing", missingSecret.secretGuardReady === false);

  const placeholderSecret = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "5",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "your_api_key_here",
    },
  });
  ok(
    "placeholder secret also blocked",
    placeholderSecret.blockedReason === "provider_secret_missing_or_placeholder"
  );
  ok("secret guard false with placeholder value", placeholderSecret.secretGuardReady === false);
}

// --- quota/cost guard must be ready ---
{
  const flagsNoQuota = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const noQuotaState = resolveRuntimeProofProviderWiring({
    flags: flagsNoQuota,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  ok("quota missing blocked", noQuotaState.blockedReason === "quota_guard_missing");

  const flagsWithQuota = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "3",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const noCostState = resolveRuntimeProofProviderWiring({
    flags: flagsWithQuota,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  ok("cost missing blocked", noCostState.blockedReason === "cost_guard_missing");
}

// --- admin-only boundary + no buyer/public access ---
{
  ok(
    "runtime-proof route path under /api/admin only",
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE.startsWith("/api/admin/")
  );
  ok(
    "server binds adminApiAuth before runtime-proof route",
    /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminRuntimeProofSkeletonRoutes\(app\)/.test(
      serverSrc
    )
  );
  ok(
    "buyer orchestrator does not reference runtime-proof route",
    !buyerOrchestratorSrc.includes(SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE)
  );
  ok(
    "buyer orchestrator does not reference runtime-proof provider wiring",
    !buyerOrchestratorSrc.includes("salesBrainRuntimeProofProviderWiring")
  );
}

// --- no real Gemini/network call in normal runtime-proof tests ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const state = resolveRuntimeProofProviderWiring({ flags, env: {} });
  const adapter = createDisabledRuntimeProofProviderAdapter();
  const result = await adapter.invoke({
    message: "ลองยิง provider จริง",
    state,
  });
  ok("adapter remains blocked", result.status === "blocked");
  ok("adapter no network call", result.networkAttempted === false);
  ok("adapter no gemini request", result.geminiRequestAttempted === false);

  ok("runtime-proof wiring has no GoogleGenAI import", !wiringSrc.includes("GoogleGenAI"));
  ok("runtime-proof wiring has no generateContent", !/generateContent\s*\(/.test(wiringSrc));
  ok("runtime-proof wiring has no fetch", !/\bfetch\s*\(/.test(wiringSrc));
  ok("runtime-proof route has no fetch", !/\bfetch\s*\(/.test(routeSrc));
}

// --- log redaction must cover prompt/phone/VIN/token/secret-like ---
{
  const raw =
    "prompt: นี่คือ prompt ดิบ Bearer abcdefghijklmno12345 โทร 0891234567 VIN ABCDEFGHJKLMN1234 token=sk-1234567890abcdefghijk apiKey=AIzaSyExampleUnsafeNotReal123456789";
  const redacted = redactRuntimeProofDiagnosticText(raw);
  ok("redacts raw prompt field", !/prompt\s*:/i.test(redacted));
  ok("redacts phone", !/\b0[689]\d{8}\b/.test(redacted));
  ok("redacts VIN", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(redacted));
  ok("redacts bearer token", !/Bearer\s+/i.test(redacted));
  ok("redacts sk-like token", !/\bsk-[A-Za-z0-9_-]{12,}\b/i.test(redacted));
  ok("redacts secret-like assignment", !/\b(?:api[_-]?key|secret|password|token)\b\s*[:=]/i.test(redacted));
}

// --- secret pattern safety check in runtime-proof surfaces ---
{
  const FILES_TO_SCAN = [doc, flagsSrc, wiringSrc, routeSrc, serverSrc];
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
    ["generic secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
  ];
  for (const [name, re] of SECRET_PATTERNS) {
    ok(`no real secret pattern in scoped files: ${name}`, FILES_TO_SCAN.every((text) => !re.test(text)));
  }
}

ok("package includes v9.6 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.6 validator",
  pkg.includes("scripts/test-v96-admin-only-gemini-runtime-proof-prep-env-safe-no-buyer-exposure.mts")
);

// --- validator self-guard ---
{
  const head = self.split("// --- validator self-guard ---")[0] ?? self;
  ok("validator uses static file reads", /readFileSync/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not require process.env", !/process\.env/.test(head));
}

// --- no accidental public/runtime routing change in working tree ---
{
  const allowed = new Set([
    "docs/v9.6-admin-only-gemini-runtime-proof-prep-env-safe-no-buyer-exposure.md",
    "docs/v9.7-admin-only-gemini-runtime-proof-dry-run-gate.md",
    "docs/v9.8-admin-only-real-gemini-proof-authorization-packet.md",
    "scripts/test-v96-admin-only-gemini-runtime-proof-prep-env-safe-no-buyer-exposure.mts",
    "scripts/test-v97-admin-only-gemini-runtime-proof-dry-run-gate.mts",
    "scripts/test-v98-admin-only-real-gemini-proof-authorization-packet.mts",
    "docs/v9.9-admin-only-real-gemini-proof-implementation-prep.md",
    "scripts/test-v99-admin-only-real-gemini-proof-implementation-prep.mts",
    "scripts/test-v93-admin-only-gemini-provider-wiring-still-off-kill-switch-protected.mts",
    "scripts/test-v94-admin-only-runtime-proof-smoke-harness-no-real-gemini-yet.mts",
    "scripts/test-v95-owner-review-admin-only-runtime-proof-readiness-gate.mts",
    "src/services/ai/salesBrainRuntimeProofProviderWiring.ts",
    "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts",
    "docs/v10.0-admin-only-real-gemini-smoke-path-prep-env-secret-manual-proof-only.md",
    "scripts/test-v100-admin-only-real-gemini-smoke-path-prep-env-secret-manual-proof-only.mts",
    "package.json",
  ]);
  const trackedChanged = shellOut("git diff --name-only")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const untrackedChanged = shellOut("git ls-files --others --exclude-standard")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const unexpected = [...trackedChanged, ...untrackedChanged].filter((p) => !allowed.has(p));
  ok("working diff contains expected scoped files only", unexpected.length === 0, unexpected.join(", "));
}

console.log(`\nDone v9.6 runtime-proof prep validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


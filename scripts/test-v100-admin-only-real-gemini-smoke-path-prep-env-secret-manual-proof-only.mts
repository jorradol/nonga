/**
 * v10.0 - Admin-Only Real Gemini Smoke Path Prep (Env Secret / Manual Proof Only)
 * static + module validation only
 *
 * npm run test:v100:manual-smoke-prep
 */
import { readdirSync, readFileSync } from "node:fs";
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
  AI_RUNTIME_PROOF_MANUAL_SMOKE_EXECUTION_ENV,
  AI_RUNTIME_PROOF_MAX_COST_USD_ENV,
  AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV,
  AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV,
  AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV,
  AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV,
  AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV,
  AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV,
  createDisabledRuntimeProofProviderAdapter,
  createManualAdminGeminiRuntimeProofSmokeAdapter,
  redactRuntimeProofDiagnosticText,
  resolveRuntimeProofDryRunGate,
  resolveRuntimeProofManualSmokeReadiness,
  resolveRuntimeProofProviderWiring,
} from "../src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
import {
  SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
  buildAdminRuntimeProofSkeletonPayload,
} from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";

const DOC_PATH =
  "docs/v10.0-admin-only-real-gemini-smoke-path-prep-env-secret-manual-proof-only.md";
const SELF_PATH =
  "scripts/test-v100-admin-only-real-gemini-smoke-path-prep-env-secret-manual-proof-only.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const WIRING_PATH = "src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
const ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v100:manual-smoke-prep";

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

console.log("=== v10.0 Admin-Only Real Gemini Smoke Path Prep Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const wiringSrc = readFileSync(WIRING_PATH, "utf8");
const routeSrc = readFileSync(ROUTE_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2000, `${doc.length} chars`);
ok("doc contains v10.0 label", /v10\.0/i.test(doc));
ok("doc mentions manual proof only", /manual proof only/i.test(doc));
ok("doc mentions env secret", /env secret/i.test(doc));
ok("doc contains source-of-truth phrase", /source of truth/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["NOT GO for production", /NOT GO for production/i],
  ["NOT GO for deploy", /NOT GO for deploy/i],
  ["NOT GO for public route", /NOT GO for public route/i],
  ["NOT GO for buyer-facing", /NOT GO for buyer-facing/i],
  ["NOT GO for real lead sending", /NOT GO for real lead sending/i],
  ["default OFF remains", /default OFF remains|default OFF/i],
  ["manual smoke execution flag required", /manual smoke execution flag/i],
  ["placeholder secret blocked", /placeholder secret is blocked|placeholder blocked/i],
  ["kill switch", /kill switch/i],
  ["quota cost cap", /quota\/cost cap/i],
  ["log redaction", /log redaction/i],
  ["deterministic fallback", /deterministic fallback/i],
  ["no normal test depends on real secret", /normal tests do not depend on real secret/i],
  ["no network provider call in normal path", /no network\/provider call/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

// --- default/normal path must remain blocked and no provider network ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const wiring = resolveRuntimeProofProviderWiring({ flags, env: {} });
  const dryRun = resolveRuntimeProofDryRunGate({ flags, wiring, env: {} });
  const readiness = resolveRuntimeProofManualSmokeReadiness({
    flags,
    wiring,
    dryRunGate: dryRun,
    env: {},
  });
  const payload = buildAdminRuntimeProofSkeletonPayload(flags, wiring);
  const disabledAdapter = createDisabledRuntimeProofProviderAdapter();
  const disabledResult = await disabledAdapter.invoke({
    message: "call real gemini now",
    state: wiring,
  });

  ok("runtime proof disabled by default", flags.runtimeProofEnabled === false);
  ok("provider effective off by default", wiring.effectiveProviderEnabled === false);
  ok("manual smoke readiness false by default", readiness.manualSmokeReady === false);
  ok("manual smoke execution always disallowed in default path", readiness.realProviderExecutionAllowed === false);
  ok("manual smoke readiness payload is present", !!payload.manualSmokeReadiness);
  ok("manual smoke payload execution disallowed", payload.manualSmokeReadiness.realProviderExecutionAllowed === false);
  ok("manual smoke payload network disallowed", payload.manualSmokeReadiness.networkAllowed === false);
  ok("disabled adapter no network call", disabledResult.networkAttempted === false);
  ok("disabled adapter no gemini call", disabledResult.geminiRequestAttempted === false);
}

// --- all readiness gates green still stays process-disabled by default ---
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
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
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
  const readiness = resolveRuntimeProofManualSmokeReadiness({
    flags,
    wiring,
    dryRunGate: dryRun,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV]: "1",
      [AI_RUNTIME_PROOF_MANUAL_SMOKE_EXECUTION_ENV]: "true",
    },
  });
  const adapter = createManualAdminGeminiRuntimeProofSmokeAdapter({
    invokeGemini: async () => "provider-output-should-not-contain-raw-secret",
  });
  const result = await adapter.invoke({
    message: "prompt: VIN ABCDEFGHJKLMN1234 phone 0891234567",
    readiness,
  });

  ok("manual smoke readiness can become true", readiness.manualSmokeReady === true);
  ok("execution still disallowed by default process flag", readiness.realProviderExecutionAllowed === false);
  ok("smoke adapter stays fallback without process enable", result.status === "fallback");
  ok("smoke adapter no network by default", result.networkAttempted === false);
  ok("smoke adapter no gemini request by default", result.geminiRequestAttempted === false);
  ok("fallback remains deterministic source", result.deterministicFallbackUsed === true);
}

// --- fail-closed guards: kill switch / placeholder / missing quota-cost ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "5",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const wiringKillSwitch = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "true",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  const dryRunKillSwitch = resolveRuntimeProofDryRunGate({
    flags,
    wiring: wiringKillSwitch,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  const readinessKillSwitch = resolveRuntimeProofManualSmokeReadiness({
    flags,
    wiring: wiringKillSwitch,
    dryRunGate: dryRunKillSwitch,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV]: "1",
      [AI_RUNTIME_PROOF_MANUAL_SMOKE_EXECUTION_ENV]: "true",
    },
  });
  ok(
    "kill switch blocks readiness",
    readinessKillSwitch.blockedReasons.includes("kill_switch_forced_off")
  );

  const wiringPlaceholder = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "your_api_key_here",
    },
  });
  const dryRunPlaceholder = resolveRuntimeProofDryRunGate({
    flags,
    wiring: wiringPlaceholder,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  const readinessPlaceholder = resolveRuntimeProofManualSmokeReadiness({
    flags,
    wiring: wiringPlaceholder,
    dryRunGate: dryRunPlaceholder,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV]: "1",
      [AI_RUNTIME_PROOF_MANUAL_SMOKE_EXECUTION_ENV]: "true",
    },
  });
  ok(
    "placeholder secret is blocked",
    readinessPlaceholder.blockedReasons.includes("provider_secret_missing_or_placeholder")
  );

  const flagsNoQuota = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const wiringNoQuotaCost = resolveRuntimeProofProviderWiring({
    flags: flagsNoQuota,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  const dryRunNoQuotaCost = resolveRuntimeProofDryRunGate({
    flags: flagsNoQuota,
    wiring: wiringNoQuotaCost,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  const readinessNoQuotaCost = resolveRuntimeProofManualSmokeReadiness({
    flags: flagsNoQuota,
    wiring: wiringNoQuotaCost,
    dryRunGate: dryRunNoQuotaCost,
    env: {
      [AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV]: "true",
      [AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV]: "1",
      [AI_RUNTIME_PROOF_MANUAL_SMOKE_EXECUTION_ENV]: "true",
    },
  });
  ok("missing quota guard blocked", readinessNoQuotaCost.blockedReasons.includes("quota_guard_missing"));
  ok("missing cost guard blocked", readinessNoQuotaCost.blockedReasons.includes("cost_guard_missing"));
}

// --- redaction and env-secret non-exposure ---
{
  const raw =
    "prompt: leak me Bearer abcdefghijklmno12345 phone 0891234567 VIN ABCDEFGHJKLMN1234 token=sk-1234567890abcdefghijk";
  const redacted = redactRuntimeProofDiagnosticText(raw);
  ok("redaction removes prompt", !/prompt\s*:/i.test(redacted));
  ok("redaction removes phone", !/\b0[689]\d{8}\b/.test(redacted));
  ok("redaction removes VIN", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(redacted));
  ok("redaction removes bearer", !/Bearer\s+/i.test(redacted));
  ok("redaction removes token-like value", !/\bsk-[A-Za-z0-9_-]{12,}\b/i.test(redacted));
  ok("redaction removes secret-like assignment", !/\b(?:api[_-]?key|secret|password|token)\b\s*[:=]/i.test(redacted));
}

// --- admin-only boundary, no public route, no buyer flow entry ---
{
  ok(
    "runtime-proof route remains admin-only",
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE.startsWith("/api/admin/")
  );
  ok(
    "server binds adminApiAuth before runtime-proof registration",
    /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminRuntimeProofSkeletonRoutes\(app\)/.test(
      serverSrc
    )
  );
  ok(
    "buyer orchestrator has no runtime-proof route reference",
    !buyerOrchestratorSrc.includes(SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE)
  );
  ok(
    "buyer orchestrator has no runtime-proof provider wiring reference",
    !buyerOrchestratorSrc.includes("salesBrainRuntimeProofProviderWiring")
  );
}

// --- no hardcoded secrets and no accidental provider networking in runtime-proof modules ---
{
  const FILES_TO_SCAN = [doc, wiringSrc, routeSrc, serverSrc];
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
    ["hardcoded secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
  ];
  for (const [name, re] of SECRET_PATTERNS) {
    ok(`scoped files have no secret pattern: ${name}`, FILES_TO_SCAN.every((text) => !re.test(text)));
  }

  ok("runtime-proof wiring has no fetch call", !/\bfetch\s*\(/.test(wiringSrc));
  ok("runtime-proof wiring has no GoogleGenAI import", !wiringSrc.includes("GoogleGenAI"));
  ok("runtime-proof route has no fetch call", !/\bfetch\s*\(/.test(routeSrc));
}

// --- normal tests stay independent from real secrets ---
{
  const v9v10TestFiles = readdirSync("scripts")
    .filter((name) => /^test-v(9\d|100).*\.mts$/i.test(name))
    .map((name) => readFileSync(`scripts/${name}`, "utf8"));
  ok(
    "v9-v10 tests do not depend on process.env GEMINI_API_KEY",
    v9v10TestFiles.every((text) => !/process\.env\.GEMINI_API_KEY/.test(text))
  );
}

ok("package includes v10.0 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v10.0 script file",
  pkg.includes("scripts/test-v100-admin-only-real-gemini-smoke-path-prep-env-secret-manual-proof-only.mts")
);

{
  const head = self.split('ok("package includes v10.0 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator has no child_process usage", !/node:child_process/.test(head));
  ok("validator has no fetch call", !/\bfetch\s*\(/.test(head));
}

console.log(`\nDone v10.0 manual-smoke-prep validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


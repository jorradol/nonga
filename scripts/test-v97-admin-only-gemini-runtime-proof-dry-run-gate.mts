/**
 * v9.7 - Admin-Only Gemini Runtime Proof Dry-Run Gate
 * static + module validation only
 *
 * npm run test:v97:dry-run-gate
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
  AI_RUNTIME_PROOF_MAX_COST_USD_ENV,
  AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV,
  AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV,
  AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV,
  createDisabledRuntimeProofProviderAdapter,
  redactRuntimeProofDiagnosticText,
  resolveRuntimeProofDryRunGate,
  resolveRuntimeProofProviderWiring,
} from "../src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
import {
  SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
  buildAdminRuntimeProofSkeletonPayload,
} from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";

const DOC_PATH = "docs/v9.7-admin-only-gemini-runtime-proof-dry-run-gate.md";
const SELF_PATH = "scripts/test-v97-admin-only-gemini-runtime-proof-dry-run-gate.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const WIRING_PATH = "src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
const ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v97:dry-run-gate";

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

console.log("=== v9.7 Admin-Only Runtime Proof Dry-Run Gate Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const wiringSrc = readFileSync(WIRING_PATH, "utf8");
const routeSrc = readFileSync(ROUTE_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1700, `${doc.length} chars`);
ok("doc contains v9.7 label", /v9\.7/i.test(doc));
ok("doc mentions dry-run gate", /dry-run gate/i.test(doc));
ok("doc mentions admin-only", /admin-only/i.test(doc));
ok(
  "doc contains source-of-truth phrase",
  /deterministic flow remains source of truth/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["dry-run only", /dry-run only/i],
  ["default OFF", /default OFF/i],
  ["kill switch wins", /kill switch wins/i],
  ["admin-only boundary", /admin-only boundary/i],
  ["no buyer/public access", /no buyer\/public access/i],
  ["no real Gemini call", /no real Gemini call/i],
  ["no network/provider call", /no network\/provider call/i],
  ["no real API key/secret in repo", /no real API key\/secret in repo/i],
  ["no normal test depends on real secret", /no normal test depends on real secret/i],
  ["env secret must not be logged/exposed", /env secret must not be logged\/exposed/i],
  ["effectiveProviderEnabled remains false", /effectiveProviderEnabled remains false/i],
  ["adapter remains disabled/blocked", /adapter remains disabled\/blocked/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /no public route/i],
  ["no buyer-facing ai", /no buyer-facing\/user-visible AI|no buyer-facing AI/i],
  ["no real lead sending", /no real lead sending/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes phrase: ${name}`, re.test(doc));
}

// --- default OFF + dry-run guard enforced ---
{
  const flagsDefault = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const stateDefault = resolveRuntimeProofProviderWiring({ flags: flagsDefault, env: {} });
  const dryRunDefault = resolveRuntimeProofDryRunGate({
    flags: flagsDefault,
    wiring: stateDefault,
    env: {},
  });

  ok("runtime proof disabled by default", flagsDefault.runtimeProofEnabled === false);
  ok("default path blocked", flagsDefault.allowRuntimeProofPath === false);
  ok("deterministic fallback true", flagsDefault.deterministicFallback === true);
  ok("provider effective OFF by default", stateDefault.effectiveProviderEnabled === false);
  ok("dry-run guard always enforced", dryRunDefault.dryRunOnlyEnforced === true);
  ok("dry-run requested true by default", dryRunDefault.requestedDryRunOnly === true);
  ok("owner approved mode default false", dryRunDefault.ownerApprovedMode === false);
  ok("readyForFutureRealProof false in default path", dryRunDefault.readyForFutureRealProof === false);
  ok("real provider call remains disallowed", dryRunDefault.realProviderCallAllowed === false);
  ok("dry-run blocked reason includes guard", dryRunDefault.blockedReasons.includes("dry_run_only_guard_active"));
}

// --- kill switch wins ---
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
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  const dryRun = resolveRuntimeProofDryRunGate({
    flags,
    wiring: state,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });

  ok("kill switch active true", state.killSwitchActive === true);
  ok("kill switch blocked reason wins", state.blockedReason === "kill_switch_forced_off");
  ok("dry-run gate includes kill switch block", dryRun.blockedReasons.includes("kill_switch_forced_off"));
  ok("kill switch still disallows real provider", dryRun.realProviderCallAllowed === false);
}

// --- admin-only boundary + no buyer/public access ---
{
  ok(
    "runtime-proof route stays under /api/admin only",
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

// --- no real Gemini/network/provider call + adapter stays blocked ---
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
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: "env-only-safe-key-12345678901234567890",
    },
  });
  const dryRun = resolveRuntimeProofDryRunGate({
    flags,
    wiring: state,
    env: {
      [AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV]: "true",
    },
  });
  const adapter = createDisabledRuntimeProofProviderAdapter();
  const result = await adapter.invoke({
    message: "please call gemini now",
    state,
  });

  ok("future readiness can be true for owner-approved mode", dryRun.readyForFutureRealProof === true);
  ok("real provider call still disallowed in dry-run", dryRun.realProviderCallAllowed === false);
  ok("effectiveProviderEnabled remains false", state.effectiveProviderEnabled === false);
  ok("adapter stays blocked", result.status === "blocked");
  ok("adapter no network/provider call", result.networkAttempted === false);
  ok("adapter no real Gemini request", result.geminiRequestAttempted === false);
  ok("wiring source has no GoogleGenAI", !wiringSrc.includes("GoogleGenAI"));
  ok("wiring source has no generateContent", !/generateContent\s*\(/.test(wiringSrc));
  ok("wiring source has no fetch", !/\bfetch\s*\(/.test(wiringSrc));
  ok("route source has no fetch", !/\bfetch\s*\(/.test(routeSrc));
}

// --- env secret-safe + no log/exposure ---
{
  const fakeSecret = "env-only-safe-key-12345678901234567890";
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
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
      [AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV]: fakeSecret,
    },
  });
  const payload = buildAdminRuntimeProofSkeletonPayload(flags, state);
  const payloadText = JSON.stringify(payload);
  const rawDiagnostic = `prompt: ขอ secret Bearer abcdefghijk01234567890 token=${fakeSecret} phone 0891234567`;
  const redacted = redactRuntimeProofDiagnosticText(rawDiagnostic);

  ok("payload does not expose env secret", !payloadText.includes(fakeSecret));
  ok("redaction removes bearer token", !/Bearer\s+/i.test(redacted));
  ok("redaction removes secret-like assignment", !/\b(?:api[_-]?key|secret|password|token)\b\s*[:=]/i.test(redacted));
  ok("redaction removes phone", !/\b0[689]\d{8}\b/.test(redacted));
}

// --- no real secret/API key patterns in scoped files ---
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
}

// --- no normal test depends on real secret ---
{
  const v9TestFiles = readdirSync("scripts")
    .filter((name) => /^test-v9[0-7].*\.mts$/i.test(name))
    .map((name) => readFileSync(`scripts/${name}`, "utf8"));
  ok(
    "v9.x tests do not depend on process.env GEMINI_API_KEY",
    v9TestFiles.every((text) => !/process\.env\.GEMINI_API_KEY/.test(text))
  );
  ok(
    "v9.x tests do not call real network fetch",
    v9TestFiles.every((text) => !/\bfetch\s*\(/.test(text))
  );
}

ok("package includes v9.7 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.7 script",
  pkg.includes("scripts/test-v97-admin-only-gemini-runtime-proof-dry-run-gate.mts")
);

// --- validator self-guard ---
{
  const head = self.split("// --- validator self-guard ---")[0] ?? self;
  ok("validator uses static file reads", /readFileSync/.test(head));
  ok("validator does not call child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
}

console.log(`\nDone v9.7 dry-run gate validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


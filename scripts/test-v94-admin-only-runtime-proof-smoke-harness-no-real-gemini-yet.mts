/**
 * v9.4 - Admin-Only Runtime Proof Smoke Harness (No Real Gemini Yet)
 * static + module smoke validation only
 *
 * npm run test:v94:runtime-proof-smoke
 */
import type { Request, Response } from "express";
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
  createDisabledRuntimeProofProviderAdapter,
  redactRuntimeProofDiagnosticText,
  resolveRuntimeProofProviderWiring,
} from "../src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
import {
  SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
  buildAdminRuntimeProofSkeletonPayload,
  handleAdminRuntimeProofSkeletonPost,
} from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";

const DOC_PATH =
  "docs/v9.4-admin-only-runtime-proof-smoke-harness-no-real-gemini-yet.md";
const SELF_PATH =
  "scripts/test-v94-admin-only-runtime-proof-smoke-harness-no-real-gemini-yet.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const FLAGS_PATH = "src/services/ai/salesBrainRuntimeProofFlags.ts";
const WIRING_PATH = "src/services/ai/salesBrainRuntimeProofProviderWiring.ts";
const ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v94:runtime-proof-smoke";

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

function mockRes() {
  const out = { statusCode: 200, body: undefined as unknown };
  const res = {
    status(code: number) {
      out.statusCode = code;
      return res;
    },
    json(body: unknown) {
      out.body = body;
      return res;
    },
  } as Response;
  return { res, out };
}

console.log("=== v9.4 Admin-Only Runtime Proof Smoke Harness Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const flagsSrc = readFileSync(FLAGS_PATH, "utf8");
const wiringSrc = readFileSync(WIRING_PATH, "utf8");
const routeSrc = readFileSync(ROUTE_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1300, `${doc.length} chars`);
ok("doc mentions smoke harness", /smoke harness/i.test(doc));
ok("doc mentions no real gemini", /No Real Gemini Yet|no real Gemini/i.test(doc));
ok(
  "doc contains source-of-truth statement",
  /deterministic flow remains source of truth/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["default OFF", /default OFF/i],
  ["kill switch protected", /kill switch protected/i],
  ["provider wiring placeholder-only", /placeholder-only/i],
  ["no real Gemini call", /no real Gemini call/i],
  ["no network/provider call", /no network\/provider call/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /no public route/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no user-visible AI", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc contains: ${name}`, re.test(doc));
}

// --- admin-only boundary remains ---
{
  ok(
    "route path under /api/admin only",
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE.startsWith("/api/admin/")
  );
  ok(
    "server keeps adminApiAuth before runtime proof route",
    /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminRuntimeProofSkeletonRoutes\(app\)/.test(
      serverSrc
    )
  );
}

// --- default OFF and deterministic fallback ---
{
  const flagsDefault = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const wiringDefault = resolveRuntimeProofProviderWiring({ flags: flagsDefault, env: {} });
  const payloadDefault = buildAdminRuntimeProofSkeletonPayload(flagsDefault, wiringDefault);

  ok("runtime proof disabled by default", flagsDefault.runtimeProofEnabled === false);
  ok("default fallback deterministic true", flagsDefault.deterministicFallback === true);
  ok("provider effective OFF default", wiringDefault.effectiveProviderEnabled === false);
  ok("payload fallback mode deterministic", payloadDefault.fallbackMode === "deterministic");
  ok(
    "payload deterministic source-of-truth true",
    payloadDefault.deterministicSourceOfTruth === true
  );
}

// --- kill switch wins all ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV]: "10",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const wiring = resolveRuntimeProofProviderWiring({
    flags,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "true",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "2",
    },
  });
  ok("kill switch active", wiring.killSwitchActive === true);
  ok("kill switch blocked reason wins", wiring.blockedReason === "kill_switch_forced_off");
  ok("effective provider still OFF", wiring.effectiveProviderEnabled === false);
}

// --- provider placeholder-only and no real calls ---
{
  const flags = resolveSalesBrainRuntimeProofFlags({ env: {} });
  const wiring = resolveRuntimeProofProviderWiring({ flags, env: {} });
  const adapter = createDisabledRuntimeProofProviderAdapter();
  const result = await adapter.invoke({
    message: "ลองเรียก gemini จริงให้หน่อย",
    state: wiring,
  });
  ok("provider name placeholder", wiring.providerName === "gemini-placeholder");
  ok("adapter result blocked", result.status === "blocked");
  ok("adapter no network attempted", result.networkAttempted === false);
  ok("adapter no gemini request attempted", result.geminiRequestAttempted === false);
}

// --- runtime route handler smoke (no HTTP server, no network) ---
{
  const { res, out } = mockRes();
  const req = { body: { message: "Bearer abcdefghijk012345678 phone 0891234567" } } as Request;
  await handleAdminRuntimeProofSkeletonPost(req, res);
  const body = out.body as {
    success?: boolean;
    route?: string;
    providerCall?: { networkAttempted?: boolean; geminiRequestAttempted?: boolean };
    data?: { providerWiring?: { effectiveProviderEnabled?: boolean } };
  };
  ok("handler success true", body.success === true);
  ok("handler route admin-only path", body.route === SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE);
  ok("handler provider no network", body.providerCall?.networkAttempted === false);
  ok("handler provider no gemini request", body.providerCall?.geminiRequestAttempted === false);
  ok(
    "handler payload effectiveProviderEnabled false",
    body.data?.providerWiring?.effectiveProviderEnabled === false
  );
}

// --- logging redaction guard ---
{
  const raw = "Bearer abcd123456789 token, phone 0891234567, VIN ABCDEFGHJKLMN1234";
  const redacted = redactRuntimeProofDiagnosticText(raw);
  ok("redaction removes bearer token", !/Bearer\s+/i.test(redacted));
  ok("redaction removes phone", !/\b0[689]\d{8}\b/.test(redacted));
  ok("redaction removes VIN-like value", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(redacted));
}

// --- quota/cost guard presence and unsafe blocking ---
{
  ok("wiring defines quotaGuardReady", /quotaGuardReady/.test(wiringSrc));
  ok("wiring defines costGuardReady", /costGuardReady/.test(wiringSrc));
  ok("wiring defines max cost env", wiringSrc.includes(AI_RUNTIME_PROOF_MAX_COST_USD_ENV));

  const flagsMissingQuota = resolveSalesBrainRuntimeProofFlags({
    env: {
      [AI_RUNTIME_PROOF_ENABLED_ENV]: "true",
      [AI_ADMIN_RUNTIME_PROOF_ONLY_ENV]: "true",
      [AI_LOG_REDACTION_ENABLED_ENV]: "true",
    },
  });
  const stateMissingQuota = resolveRuntimeProofProviderWiring({
    flags: flagsMissingQuota,
    env: {
      [AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV]: "true",
      [AI_RUNTIME_PROOF_KILL_SWITCH_ENV]: "false",
      [AI_RUNTIME_PROOF_MAX_COST_USD_ENV]: "10",
    },
  });
  ok(
    "quota missing blocks unsafe state",
    stateMissingQuota.blockedReason === "quota_guard_missing"
  );
}

// --- buyer path isolation ---
{
  ok(
    "buyer orchestrator has no runtime-proof route reference",
    !buyerOrchestratorSrc.includes(SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE)
  );
  ok(
    "buyer orchestrator has no provider-wiring module reference",
    !buyerOrchestratorSrc.includes("salesBrainRuntimeProofProviderWiring")
  );
}

// --- static guards no real Gemini/network/secret patterns ---
{
  const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
    ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
    ["hardcoded secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
  ];
  for (const [name, re] of FORBIDDEN_PATTERNS) {
    ok(`doc no secret pattern: ${name}`, !re.test(doc));
    ok(`wiring no secret pattern: ${name}`, !re.test(wiringSrc));
    ok(`route no secret pattern: ${name}`, !re.test(routeSrc));
  }
  ok("wiring no GoogleGenAI", !wiringSrc.includes("GoogleGenAI"));
  ok("wiring no generateContent", !/generateContent\s*\(/.test(wiringSrc));
  ok("wiring no fetch", !/\bfetch\s*\(/.test(wiringSrc));
}

ok("package has v9.4 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.4 script file",
  pkg.includes("scripts/test-v94-admin-only-runtime-proof-smoke-harness-no-real-gemini-yet.mts")
);

// --- test script static-only ---
{
  const head = self.split("// --- test script static-only ---")[0] ?? self;
  ok("script uses readFileSync", /readFileSync/.test(head));
  ok("script no child_process import", !/node:child_process/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no deploy commands", !/gcloud|firebase deploy|npm run deploy/i.test(head));
}

console.log(`\nDone v9.4 runtime-proof smoke harness validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

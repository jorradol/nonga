/**
 * v9.2 - Disabled Admin-Only Runtime Proof Skeleton
 * static + module validation only
 *
 * npm run test:v92:runtime-proof-skeleton
 */
import { readFileSync } from "node:fs";
import {
  buildAdminRuntimeProofSkeletonPayload,
  SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
} from "../src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
import {
  AI_ADMIN_RUNTIME_PROOF_ONLY_ENV,
  AI_LOG_REDACTION_ENABLED_ENV,
  AI_RUNTIME_PROOF_ENABLED_ENV,
  AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV,
  resolveSalesBrainRuntimeProofFlags,
} from "../src/services/ai/salesBrainRuntimeProofFlags.ts";

const DOC_PATH = "docs/v9.2-disabled-admin-only-runtime-proof-skeleton.md";
const SELF_PATH = "scripts/test-v92-disabled-admin-only-runtime-proof-skeleton.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const RUNTIME_FLAGS_PATH = "src/services/ai/salesBrainRuntimeProofFlags.ts";
const RUNTIME_ROUTE_PATH = "src/services/ai/salesBrainServerRuntimeProofSkeleton.ts";
const BUYER_ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";
const NPM_SCRIPT_KEY = "test:v92:runtime-proof-skeleton";

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

console.log("=== v9.2 Disabled Admin-Only Runtime Proof Skeleton Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");
const runtimeFlagsSrc = readFileSync(RUNTIME_FLAGS_PATH, "utf8");
const runtimeRouteSrc = readFileSync(RUNTIME_ROUTE_PATH, "utf8");
const buyerOrchestratorSrc = readFileSync(BUYER_ORCHESTRATOR_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1500, `${doc.length} chars`);
ok("doc contains disabled skeleton title", /Disabled Admin-Only Runtime Proof Skeleton/i.test(doc));
ok("doc contains admin-only", /admin-only/i.test(doc));
ok(
  "doc contains source-of-truth statement",
  /deterministic flow remains source of truth/i.test(doc),
);

const DOC_REQUIRED_PHRASES: Array<[string, RegExp]> = [
  ["default OFF", /default OFF/i],
  ["no provider call", /no provider call/i],
  ["no Gemini request", /no Gemini request/i],
  ["no Gemini activation", /no Gemini activation/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /no public route/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no user-visible AI", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no real secret/API key in repo", /no real secret\/API key in repo/i],
];
for (const [name, re] of DOC_REQUIRED_PHRASES) {
  ok(`doc contains: ${name}`, re.test(doc));
}

// --- default OFF + no provider/gemini activation ---
{
  const flagsDefault = resolveSalesBrainRuntimeProofFlags({ env: {} });
  ok("runtime proof disabled by default", flagsDefault.runtimeProofEnabled === false);
  ok("default blocks runtime proof path", flagsDefault.allowRuntimeProofPath === false);
  ok("default providerNetwork false", flagsDefault.providerNetwork === false);
  ok("default deterministic fallback true", flagsDefault.deterministicFallback === true);

  const payload = buildAdminRuntimeProofSkeletonPayload(flagsDefault);
  ok("payload status disabled", payload.status === "disabled");
  ok("payload read-only true", payload.readOnly === true);
  ok("payload admin-only true", payload.adminOnly === true);
  ok("payload provider network disabled", payload.providerNetwork === false);
  ok("payload gemini not activated", payload.geminiActivated === false);
  ok("payload deterministic source of truth", payload.deterministicSourceOfTruth === true);
}

// --- env placeholder names present ---
{
  ok(
    "exports AI_RUNTIME_PROOF_ENABLED env name",
    runtimeFlagsSrc.includes(`"${AI_RUNTIME_PROOF_ENABLED_ENV}"`)
  );
  ok(
    "exports AI_ADMIN_RUNTIME_PROOF_ONLY env name",
    runtimeFlagsSrc.includes(`"${AI_ADMIN_RUNTIME_PROOF_ONLY_ENV}"`)
  );
  ok(
    "exports AI_RUNTIME_PROOF_QUOTA_LIMIT env name",
    runtimeFlagsSrc.includes(`"${AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV}"`)
  );
  ok(
    "exports AI_LOG_REDACTION_ENABLED env name",
    runtimeFlagsSrc.includes(`"${AI_LOG_REDACTION_ENABLED_ENV}"`)
  );
}

// --- admin-only route boundary ---
{
  ok(
    "route path is /api/admin/* only",
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE.startsWith("/api/admin/")
  );
  ok("server imports runtime proof skeleton route register", serverSrc.includes("registerSalesBrainAdminRuntimeProofSkeletonRoutes"));
  ok(
    "server registers runtime proof route",
    serverSrc.includes("registerSalesBrainAdminRuntimeProofSkeletonRoutes(app)")
  );
  ok(
    "adminApiAuth appears before runtime proof route registration",
    /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminRuntimeProofSkeletonRoutes\(app\)/.test(
      serverSrc
    )
  );
}

// --- buyer path must not access runtime proof path ---
{
  ok(
    "buyer orchestrator has no runtime proof route reference",
    !buyerOrchestratorSrc.includes(SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE)
  );
  ok(
    "runtime route source has no buyer/user-visible markers",
    !/buyer-facing|user-visible/i.test(runtimeRouteSrc)
  );
}

// --- no provider call / no Gemini request ---
{
  ok("runtime route no GoogleGenAI import", !runtimeRouteSrc.includes("GoogleGenAI"));
  ok("runtime route no generateContent call", !/generateContent\s*\(/.test(runtimeRouteSrc));
  ok("runtime route no fetch call", !/\bfetch\s*\(/.test(runtimeRouteSrc));
  ok(
    "runtime route no real provider invoke",
    !/invokeAdminShadowRealProvider|salesBrainUserVisibleRealProvider|salesBrainAdminShadowRealProvider/.test(
      runtimeRouteSrc
    )
  );
}

// --- no secret / API key patterns ---
{
  const NO_SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
    ["hardcoded secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
  ];
  for (const [name, re] of NO_SECRET_PATTERNS) {
    ok(`doc no secret pattern: ${name}`, !re.test(doc));
    ok(`runtime flags no secret pattern: ${name}`, !re.test(runtimeFlagsSrc));
    ok(`runtime route no secret pattern: ${name}`, !re.test(runtimeRouteSrc));
  }
}

// --- package wiring ---
ok("package has v9.2 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.2 test script",
  pkg.includes("scripts/test-v92-disabled-admin-only-runtime-proof-skeleton.mts")
);

// --- test script itself static-only ---
{
  const head = self.split("// --- package wiring ---")[0] ?? self;
  ok("script uses readFileSync", /readFileSync/.test(head));
  ok("script no child_process import", !/node:child_process/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no deploy commands", !/gcloud|firebase deploy|npm run deploy/i.test(head));
}

console.log(`\nDone v9.2 runtime-proof skeleton validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

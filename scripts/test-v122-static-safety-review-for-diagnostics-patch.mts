/**
 * v12.2 Static Safety Review for Diagnostics Patch validator
 * Docs/static-source only. No endpoint call. No Gemini execution.
 *
 * npm run test:v122:static-safety-review-for-diagnostics-patch
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.2-static-safety-review-for-diagnostics-patch.md";
const SELF_PATH = "scripts/test-v122-static-safety-review-for-diagnostics-patch.mts";
const PKG_PATH = "package.json";
const API_PATH = "src/services/ai/adminShadowSmokeApi.ts";
const DIAG_PATH = "src/services/ai/salesBrainAdminShadowDiagnostics.ts";
const SERVER_PATH = "src/services/ai/salesBrainServerShadowSmoke.ts";
const FETCH_PATH = "src/utils/safeApiFetch.ts";
const V121_PATH = "scripts/test-v121-no-gemini-runtime-diagnostics-capture-patch.mts";

const SCRIPT_KEY = "test:v122:static-safety-review-for-diagnostics-patch";

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

console.log("=== v12.2 Static Safety Review for Diagnostics Patch Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const api = readFileSync(API_PATH, "utf8");
const diag = readFileSync(DIAG_PATH, "utf8");
const server = readFileSync(SERVER_PATH, "utf8");
const safeFetch = readFileSync(FETCH_PATH, "utf8");
const v121 = readFileSync(V121_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3400, `${doc.length} chars`);
ok(
  "doc has title",
  /v12\.2 Static Safety Review for Diagnostics Patch — No Gemini Execution/i.test(doc)
);
ok("doc has review passed status", /REVIEW PASSED — no Gemini execution, no retry/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["baseline commit", /Baseline commit:\s*23fee85f32f90e1f6cffed9dcb45ed0156712b4e/i],
  ["Public / Buyer / Lead Isolation", /Public \/ Buyer \/ Lead Isolation/],
  ["safeApiFetch Impact", /safeApiFetch`? Impact|safeApiFetch Impact/],
  ["Diagnostics Sanitization", /Diagnostics Sanitization/],
  ["No Retry / No Execution", /No Retry \/ No Execution/],
  ["Diagnostics Reliability", /Diagnostics Reliability/],
  ["no public buyer behavior change", /no public\/buyer behavior change found/i],
  ["no lead behavior change", /no lead behavior change found/i],
  ["no automatic retry found", /no automatic retry found/i],
  ["no raw secret output", /no raw secret\/token\/API key output found/i],
  ["no raw provider output", /no raw provider output capture found/i],
  ["no pii output", /no PII\/customer data output found/i],
  ["real gemini not proven", /real Gemini success not proven/i],
  ["provider completion not proven", /provider response completion not proven/i],
  ["root cause not proven", /root cause of prior stall not proven/i],
  ["no gemini execution during review", /no Gemini execution during v12\.2 review/i],
  ["no smoke endpoint call during review", /no smoke endpoint call during v12\.2 review/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no runtime behavior change", /\bno runtime behavior change\b/i],
  ["recommendation line", /READY TO PREPARE NEW AUTHORIZED ONE-RUN PLAN/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("api has no retry loop", !/\bretry\b\s*\(/i.test(api) && !/for\s*\(.*retry/i.test(api));
ok("api keeps admin shadow route only", /ADMIN_SHADOW_SMOKE_ROUTE/.test(api));
ok("diag has runtimeObservedStages", /runtimeObservedStages/.test(diag));
ok("diag has codePathAvailableStages", /codePathAvailableStages/.test(diag));
ok("diag has missingOrUnknownStages", /missingOrUnknownStages/.test(diag));
ok(
  "diag snapshot has sanitized true",
  /sanitized:\s*true/.test(diag)
);
ok(
  "server returns runtime diagnostic snapshot",
  /adminShadowRuntimeDiagnosticSnapshot/.test(server)
);
ok("safeApiFetch has optional onResponseMeta", /onResponseMeta\?:/.test(safeFetch));
ok("v121 validator is static style", /No endpoint calls, no Gemini execution/i.test(v121));

ok("package includes v122 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v122 validator",
  pkg.includes("scripts/test-v122-static-safety-review-for-diagnostics-patch.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok(
    "validator no smoke endpoint call",
    !/\/api\/admin\/sales-brain-shadow-smoke/.test(selfExecutionBody)
  );
  ok("validator no /api/gemini call", !/\/api\/gemini\//.test(selfExecutionBody));
}

const BAD_DOC_PHRASES = [
  /\bGemini executed\b/i,
  /\bsmoke PASS\b/i,
  /\bretry succeeded\b/i,
];
for (const re of BAD_DOC_PHRASES) {
  ok(`doc excludes phrase: ${re.source}`, !re.test(doc));
}

console.log(`\nDone v12.2 static safety review validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

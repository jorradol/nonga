/**
 * v12.1 No-Gemini Runtime Diagnostics Capture Patch static validator
 * No endpoint calls, no Gemini execution, docs/source contract checks only.
 *
 * npm run test:v121:no-gemini-runtime-diagnostics-capture-patch
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.1-no-gemini-runtime-diagnostics-capture-patch.md";
const SELF_PATH = "scripts/test-v121-no-gemini-runtime-diagnostics-capture-patch.mts";
const PKG_PATH = "package.json";
const API_PATH = "src/services/ai/adminShadowSmokeApi.ts";
const DIAG_PATH = "src/services/ai/salesBrainAdminShadowDiagnostics.ts";
const SERVER_PATH = "src/services/ai/salesBrainServerShadowSmoke.ts";
const FETCH_PATH = "src/utils/safeApiFetch.ts";
const V61H_PATH = "scripts/test-v61h-real-gemini-shadow-call-admin-only-staging-smoke.mts";

const SCRIPT_KEY = "test:v121:no-gemini-runtime-diagnostics-capture-patch";

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

console.log("=== v12.1 No-Gemini Runtime Diagnostics Capture Patch Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const api = readFileSync(API_PATH, "utf8");
const diag = readFileSync(DIAG_PATH, "utf8");
const server = readFileSync(SERVER_PATH, "utf8");
const safeFetch = readFileSync(FETCH_PATH, "utf8");
const v61h = readFileSync(V61H_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3200, `${doc.length} chars`);
ok("doc has title", /v12\.1 No-Gemini Runtime Diagnostics Capture Patch/i.test(doc));
ok("doc has patched status", /PATCHED — no Gemini execution, no retry/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["baseline exact", /Baseline commit:\s*2c177cea7aba5251c2764b653be3517500b06d1b/i],
  ["v12.0 finding none captured", /runtime-observed stages none captured/i],
  ["runtimeObservedStages", /runtimeObservedStages/],
  ["codePathAvailableStages", /codePathAvailableStages/],
  ["missingOrUnknownStages", /missingOrUnknownStages/],
  ["callerStatus", /callerStatus/],
  ["handlerStatus", /handlerStatus/],
  ["providerStatus", /providerStatus/],
  ["no retry", /\bno retry\b/i],
  ["no gemini execution during patch", /no Gemini execution during v12\.1 patch/i],
  ["no smoke endpoint call during validation", /no smoke endpoint call during v12\.1 validation/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no pii customer data", /\bno PII\/customer data\b/i],
  ["no secret token api exposure", /no secret\/token\/API key exposure/i],
  ["no raw provider output", /\bno raw provider output\b/i],
  ["no automatic retry", /\bno automatic retry\b/i],
  ["no public behavior change", /\bno public behavior change\b/i],
  [
    "recommendation ready for static review",
    /READY FOR STATIC REVIEW \/ OWNER DECISION ON WHETHER TO PREPARE A NEW AUTHORIZED ONE-RUN PLAN/i,
  ],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("diagnostics has code path stage list", /ADMIN_SHADOW_CODE_PATH_AVAILABLE_STAGES/.test(diag));
ok("diagnostics has runtime snapshot builder", /buildAdminShadowRuntimeDiagnosticSnapshot/.test(diag));
ok("diagnostics has runtime snapshot logger", /logAdminShadowRuntimeDiagnosticSnapshot/.test(diag));
ok("diagnostics supports runtimeObservedStages field", /runtimeObservedStages/.test(diag));
ok("diagnostics supports missingOrUnknownStages field", /missingOrUnknownStages/.test(diag));

ok("api captures request dispatched", /requestDispatched\s*=\s*true/.test(api));
ok("api captures response status meta", /onResponseMeta/.test(api));
ok("api preserves snapshot on throw", /attachSnapshotToError/.test(api));
ok("api emits snapshot callback", /onDiagnosticSnapshot/.test(api));
ok("api includes runtimeObservedStages contract", /runtimeObservedStages/.test(api));
ok("api has no automatic retry loop", !/\bretry\b\s*\(/i.test(api) && !/for\s*\(.*retry/i.test(api));

ok("server wires onStageObserved", /onStageObserved/.test(server));
ok("server builds runtime snapshot", /buildAdminShadowRuntimeDiagnosticSnapshot/.test(server));
ok("server includes snapshot in response", /adminShadowRuntimeDiagnosticSnapshot/.test(server));

ok("safeApiFetch supports response meta callback", /onResponseMeta/.test(safeFetch));
ok("v61h checks v12.1 snapshot", /diagnosticSnapshotVersion.*v12\.1/i.test(v61h));

ok("package includes v12.1 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v12.1 validator",
  pkg.includes("scripts/test-v121-no-gemini-runtime-diagnostics-capture-patch.mts")
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

console.log(`\nDone v12.1 diagnostics capture validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

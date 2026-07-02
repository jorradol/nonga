/**
 * v12.3 New Authorized One-Run Plan prepare-only validator
 * Docs/static checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v123:new-authorized-one-run-plan-prepare-only
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.3-new-authorized-one-run-plan-prepare-only.md";
const SELF_PATH = "scripts/test-v123-new-authorized-one-run-plan-prepare-only.mts";
const PKG_PATH = "package.json";

const SCRIPT_KEY = "test:v123:new-authorized-one-run-plan-prepare-only";

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

console.log("=== v12.3 New Authorized One-Run Plan Prepare-Only Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 7000, `${doc.length} chars`);
ok(
  "doc has title",
  /v12\.3 New Authorized One-Run Plan — Prepare Only/i.test(doc)
);
ok(
  "doc has prepared status line",
  /PREPARED — no Gemini execution, no smoke endpoint call/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["baseline commit", /Baseline commit:\s*75554b80c906eeda037a0f4ad9ae510378bef6ba/i],
  ["FINAL EXECUTION AUTHORIZE", /FINAL EXECUTION AUTHORIZE:/],
  [
    "aborted missing authorization",
    /ABORTED — missing fresh FINAL EXECUTION AUTHORIZE/i,
  ],
  ["runtimeObservedStages", /\bruntimeObservedStages\b/],
  ["codePathAvailableStages", /\bcodePathAvailableStages\b/],
  ["missingOrUnknownStages", /\bmissingOrUnknownStages\b/],
  ["callerStatus", /\bcallerStatus\b/],
  ["handlerStatus", /\bhandlerStatus\b/],
  ["providerStatus", /\bproviderStatus\b/],
  ["requestDispatched", /\brequestDispatched\b/],
  ["responseCaptured", /\bresponseCaptured\b/],
  ["diagnosticSnapshotVersion", /\bdiagnosticSnapshotVersion\b/],
  ["sanitized true", /\bsanitized:\s*true\b/],
  ["one run only", /\bone run only\b/i],
  ["no retry", /\bno retry\b/i],
  ["no gemini during v12.3", /no Gemini execution during v12\.3/i],
  ["no smoke endpoint during v12.3", /no smoke endpoint call during v12\.3/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no authorization consumed during v12.3", /no authorization consumed during v12\.3/i],
  [
    "final recommendation line",
    /READY FOR OWNER DECISION ON FRESH FINAL EXECUTION AUTHORIZE FOR v12\.4 ONE-RUN/i,
  ],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const REQUIRED_TEMPLATE_PHRASES: Array<[string, RegExp]> = [
  ["v12.4 report template heading", /# v12\.4 Fresh Authorized One-Run Admin SS-01 Smoke Report/i],
  ["template runtimeObservedStages", /runtimeObservedStages/],
  ["template codePathAvailableStages", /codePathAvailableStages/],
  ["template missingOrUnknownStages", /missingOrUnknownStages/],
  ["template do not guess", /do not guess/i],
];
for (const [name, re] of REQUIRED_TEMPLATE_PHRASES) {
  ok(`doc template includes: ${name}`, re.test(doc));
}

ok("package includes v123 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v123 validator",
  pkg.includes("scripts/test-v123-new-authorized-one-run-plan-prepare-only.mts")
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

console.log(`\nDone v12.3 prepare-only validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v14.3W owner-local exactly-one-run after approval fix validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3W
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3W-owner-local-exactly-one-run-after-approval-fix-record.md";
const FIXTURE_PATH =
  "docs/examples/v14.3W-owner-local-exactly-one-run-after-approval-fix.synthetic.json";
const PACKAGE_PATH = "package.json";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";
const V143V_DOC_PATH = "docs/v14.3V-approval-phrase-mismatch-fix-no-retry-record.md";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v14.3W Owner-Local Exactly-One-Run After Approval Fix Validation ===\n");

ok("v14.3W doc exists", existsSync(DOC_PATH));
ok("v14.3W fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("v14.3V doc exists", existsSync(V143V_DOC_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const wrapper = read(WRAPPER_PATH);
const v143vDoc = read(V143V_DOC_PATH);

ok(
  "doc records v14.3V phrase-fix baseline and starting head",
  /v14\.3V phrase fix/i.test(doc) &&
    /local HEAD:\s*`385e3a83d4b840819f72dbd0b2b6f2669ccc509a`/.test(doc)
);
ok(
  "doc includes same-CMD policy and exact required phrase",
  /same-CMD/.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(doc)
);
ok(
  "doc acknowledges approval file normalization",
  /BOM strip \+ CRLF normalize \+ trim/i.test(doc)
);
ok(
  "doc keeps one-run status not started and no retry no second run",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);
ok(
  "doc confirms no runtime/provider/gemini and not_run path",
  /Gemini\/provider\/runtime: no/.test(doc) &&
    /runtime execution:\s*`not_run`/.test(doc) &&
    /providerNetwork:\s*`not_run`/.test(doc) &&
    /one-run command executed by agent: no/.test(doc)
);
ok(
  "doc includes command verification exact identified command",
  /npm run owner-local-one-run:v14\.3U -- --execute-approved --approval-file v14\.3U-local-approval\.txt/.test(
    doc
  ) &&
    /command matches identified command: yes/.test(doc)
);
ok(
  "doc keeps boundary prohibitions including pii and endpoint guess",
  /no real customer data \/ PII:\s*`yes`/.test(doc) &&
    /no phone \/ plate \/ VIN:\s*`yes`/.test(doc) &&
    /no alternate endpoint \/ manual endpoint guess:\s*`yes`/.test(doc)
);

const allowedFinalDecisions = [
  "PASS — v14.3W OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN COMPLETED",
  "NEED REVIEW — v14.3W ONE-RUN RESULT INCONCLUSIVE",
  "HOLD — REPO STATE NOT READY",
  "HOLD — OWNER-LOCAL AUTH SESSION NOT READY",
  "HOLD — FRESH OWNER APPROVAL MISSING OR MISMATCHED",
  "HOLD — OWNER-LOCAL ONE-RUN COMMAND MISMATCH",
  "HOLD — EXECUTION FAILED BEFORE PROVIDER CALL",
  "HOLD — AUTH FAILED",
  "HOLD — PROVIDER/GEMINI CALL FAILED",
  "HOLD — RETRY OR SECOND-RUN RISK DETECTED",
  "HOLD — TOKEN/SECRET EXPOSURE RISK DETECTED",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of allowedFinalDecisions) {
  ok(`doc includes allowed final decision ${value}`, doc.includes(value));
}
ok(
  "doc final decision reflects gate1 hold",
  /Final decision in this round:[\s\S]*HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(doc)
);

ok(
  "wrapper phrase is exact and parsing normalization exists",
  /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(wrapper) &&
    /\.replace\(\s*\/\^\\uFEFF\/,\s*""\s*\)/.test(wrapper) &&
    /\.replace\(\s*\/\\r\\n\/g,\s*"\\n"\s*\)/.test(wrapper) &&
    /\.trim\(\)/.test(wrapper)
);
ok(
  "wrapper keeps token masked-only and no network call",
  /token: \*\*\*MASKED\*\*\*/.test(wrapper) &&
    !/console\.log\(\s*.*NONGA_ADMIN_API_TOKEN/.test(wrapper) &&
    !/fetch\s*\(/.test(wrapper) &&
    !/https?:\/\//.test(wrapper)
);
ok(
  "cross-doc continuity references v14.3V ready decision",
  /READY FOR v14\.3W FRESH OWNER APPROVAL \+ SAME-CMD EXACTLY-ONE-RUN/.test(v143vDoc)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3W", root.version === "v14.3W");
  ok("fixture starting head recorded", root.startingHead === "385e3a83d4b840819f72dbd0b2b6f2669ccc509a");

  const prev = root.previousStatusFromV143V as Record<string, unknown>;
  ok(
    "fixture keeps v14.3V mismatch-fix baseline",
    prev?.finalDecision === "READY FOR v14.3W FRESH OWNER APPROVAL + SAME-CMD EXACTLY-ONE-RUN" &&
      prev?.phraseFixApplied === true &&
      prev?.phrase === "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN"
  );

  const gate1 = (root.gates as Record<string, unknown>)?.gate1SameCmdTokenSession as Record<
    string,
    unknown
  >;
  ok(
    "fixture gate1 hold status recorded",
    gate1?.sameCmdTokenCheckPassed === false &&
      (gate1?.checkerResult as Record<string, unknown>)?.token === "***MASKED***" &&
      gate1?.decision === "HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY"
  );

  const gate2 = (root.gates as Record<string, unknown>)?.gate2FreshApproval as Record<string, unknown>;
  ok(
    "fixture gate2 phrase exact and not run due gate1",
    gate2?.requiredPhrase === "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN" &&
      gate2?.freshApprovalReceived === false &&
      gate2?.approvalTextMatched === false &&
      gate2?.approvalFileUsed === "none"
  );

  const execution = root.executionEvidence as Record<string, unknown>;
  ok(
    "fixture execution evidence is no-run hold",
    execution?.executionDecision === "HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY" &&
      execution?.oneRunStarted === false &&
      execution?.oneRunConsumed === false &&
      execution?.retryUsed === false &&
      execution?.secondRunUsed === false &&
      execution?.geminiProviderRuntime === false &&
      execution?.oneRunRealExecutionPath === "not_run"
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  for (const value of allowedFinalDecisions) {
    ok(`fixture includes allowed final decision ${value}`, finalEnum.includes(value));
  }
  ok(
    "fixture final decision is hold owner-local auth session not ready",
    root.finalDecision === "HOLD — OWNER-LOCAL AUTH SESSION NOT READY"
  );
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}
if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok(
    "package has test:v14.3W script",
    scripts["test:v14.3W"] ===
      "tsx scripts/test-v143W-owner-local-exactly-one-run-after-approval-fix.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.3W after-approval-fix validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

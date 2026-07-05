/**
 * v14.3X owner-local run handoff validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3X
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3X-owner-local-run-handoff-after-token-session-hold.md";
const FIXTURE_PATH = "docs/examples/v14.3X-owner-local-run-handoff.synthetic.json";
const PACKAGE_PATH = "package.json";
const V143W_DOC_PATH = "docs/v14.3W-owner-local-exactly-one-run-after-approval-fix-record.md";

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

console.log("=== v14.3X Owner-Local Run Handoff Validation ===\n");

ok("v14.3X doc exists", existsSync(DOC_PATH));
ok("v14.3X fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("v14.3W doc exists", existsSync(V143W_DOC_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const v143wDoc = read(V143W_DOC_PATH);

ok(
  "doc includes v14.3W hold context with no-run state",
  /HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(doc) &&
    /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc) &&
    /Gemini\/provider\/runtime=not_run/.test(doc)
);
ok(
  "doc records starting head and clean baseline",
  /local HEAD:\s*`bc08d68f999de46ae6538827aeef05fd3f9d9b1b`/.test(doc) &&
    /origin HEAD:\s*`bc08d68f999de46ae6538827aeef05fd3f9d9b1b`/.test(doc) &&
    /working tree clean:\s*`yes`/.test(doc)
);
ok(
  "doc includes required owner-local command handoff block",
  /cd \/d D:\\nonga/.test(doc) &&
    /set NONGA_ADMIN_API_TOKEN=<paste-token-here>/.test(doc) &&
    /npm run check:admin-token-session-env/.test(doc) &&
    /echo FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN> v14\.3U-local-approval\.txt/.test(
      doc
    ) &&
    /npm run owner-local-one-run:v14\.3U -- --execute-approved --approval-file v14\.3U-local-approval\.txt/.test(
      doc
    )
);
ok(
  "doc includes expected checker output masked-only",
  /NONGA_ADMIN_API_TOKEN: present/.test(doc) &&
    /length: nonzero/.test(doc) &&
    /format: valid/.test(doc) &&
    /token: \*\*\*MASKED\*\*\*/.test(doc) &&
    /READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK — token present in session env/.test(doc)
);
ok(
  "doc includes stop rules no retry no second run",
  /STOP -> `HOLD — OWNER-LOCAL AUTH SESSION NOT READY`/.test(doc) &&
    /STOP -> `HOLD — FRESH OWNER APPROVAL MISSING OR MISMATCHED`/.test(doc) &&
    /NEED REVIEW/.test(doc) &&
    /do not retry, do not second run/.test(doc)
);
ok(
  "doc confirms agent no-run and runtime/provider no",
  /one-run execution by agent: no/.test(doc) &&
    /retry by agent: no/.test(doc) &&
    /second run by agent: no/.test(doc) &&
    /Gemini\/provider\/runtime execution by agent: no/.test(doc) &&
    /provider network call by agent: no/.test(doc)
);

const allowedFinalDecisions = [
  "READY FOR OWNER-LOCAL MANUAL SAME-CMD EXACTLY-ONE-RUN",
  "HOLD — REPO STATE NOT READY",
  "HOLD — TEST FAILURE",
  "HOLD — TOKEN/SECRET EXPOSURE RISK DETECTED",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD/PII RISK DETECTED",
  "NEED REVIEW — HANDOFF AMBIGUOUS",
];
for (const value of allowedFinalDecisions) {
  ok(`doc includes allowed final decision ${value}`, doc.includes(value));
}
ok(
  "doc final decision is readiness handoff",
  /Final decision in this round:[\s\S]*READY FOR OWNER-LOCAL MANUAL SAME-CMD EXACTLY-ONE-RUN/.test(doc)
);

ok(
  "cross-doc continuity references v14.3W hold",
  /HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(v143wDoc)
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
  ok("fixture version is v14.3X", root.version === "v14.3X");

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches expected starting point",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "bc08d68f999de46ae6538827aeef05fd3f9d9b1b" &&
      baseline?.originHead === "bc08d68f999de46ae6538827aeef05fd3f9d9b1b" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const previous = root.previousStatusFromV143W as Record<string, unknown>;
  ok(
    "fixture records v14.3W hold no-run context",
    previous?.finalDecision === "HOLD — OWNER-LOCAL AUTH SESSION NOT READY" &&
      previous?.oneRunStarted === false &&
      previous?.oneRunConsumed === false &&
      previous?.retryUsed === false &&
      previous?.secondRunUsed === false &&
      previous?.geminiProviderRuntime === "not_run" &&
      previous?.providerNetwork === "not_run"
  );

  const handoff = root.ownerLocalHandoffPolicy as Record<string, unknown>;
  ok(
    "fixture handoff policy includes same-cmd and exact phrase",
    handoff?.sameCmdRequired === true &&
      handoff?.checkerCommand === "npm run check:admin-token-session-env" &&
      handoff?.approvalPhraseExact ===
        "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN" &&
      handoff?.identifiedOneRunCommand ===
        "npm run owner-local-one-run:v14.3U -- --execute-approved --approval-file v14.3U-local-approval.txt" &&
      handoff?.agentMustNotExecuteOneRun === true
  );

  const status = root.executionStatusNow as Record<string, unknown>;
  ok(
    "fixture confirms current no-run no-retry no-second-run",
    status?.oneRunStarted === false &&
      status?.oneRunConsumed === false &&
      status?.retryUsed === false &&
      status?.secondRunUsed === false &&
      status?.geminiProviderRuntime === "no" &&
      status?.oneRunRealExecutionPath === "not_run" &&
      status?.providerNetworkCall === "no"
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  for (const value of allowedFinalDecisions) {
    ok(`fixture includes allowed final decision ${value}`, finalEnum.includes(value));
  }
  ok(
    "fixture final decision is readiness handoff",
    root.finalDecision === "READY FOR OWNER-LOCAL MANUAL SAME-CMD EXACTLY-ONE-RUN"
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
    "package has test:v14.3X script",
    scripts["test:v14.3X"] === "tsx scripts/test-v143X-owner-local-run-handoff.mts"
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

console.log(`\nDone v14.3X owner-local handoff validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

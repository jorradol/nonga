/**
 * v14.3U owner-local exactly-one-run record validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3U
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3U-owner-local-exactly-one-run-record.md";
const FIXTURE_PATH = "docs/examples/v14.3U-owner-local-exactly-one-run.synthetic.json";
const PACKAGE_PATH = "package.json";
const SELF_PATH = "scripts/test-v143U-owner-local-exactly-one-run-record.mts";
const V143T_DOC_PATH = "docs/v14.3T-owner-local-one-run-command-disambiguation-no-gemini.md";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";

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

console.log("=== v14.3U Owner-Local Exactly-One-Run Record Validation ===\n");

ok("v14.3U doc exists", existsSync(DOC_PATH));
ok("v14.3U fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("self exists", existsSync(SELF_PATH));
ok("v14.3T doc exists", existsSync(V143T_DOC_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const self = read(SELF_PATH);
const v143tDoc = read(V143T_DOC_PATH);
const wrapper = read(WRAPPER_PATH);

ok("validator states static checks only", /Static checks only/i.test(self));
ok("doc names v14.3U", /v14\.3U/i.test(doc));
ok(
  "doc contains baseline section",
  /Branch \/ HEAD \/ origin \/ working tree before work/i.test(doc) &&
    /branch:\s*`feature\/chat-image-attachment-v1`/.test(doc) &&
    /local HEAD:\s*`753c59e902b71e1ee4b5eaf6f987db0e88c0ca85`/.test(doc) &&
    /origin HEAD:\s*`753c59e902b71e1ee4b5eaf6f987db0e88c0ca85`/.test(doc) &&
    /local equals origin:\s*`yes`/.test(doc) &&
    /working tree clean:\s*`yes`/.test(doc)
);

ok(
  "doc keeps hard boundaries locked",
  /no production:\s*`yes`/i.test(doc) &&
    /no public route activation:\s*`yes`/i.test(doc) &&
    /no buyer-facing AI release:\s*`yes`/i.test(doc) &&
    /no real lead sending:\s*`yes`/i.test(doc) &&
    /no real customer data \/ PII:\s*`yes`/i.test(doc) &&
    /no phone \/ plate \/ VIN:\s*`yes`/i.test(doc) &&
    /no secret \/ token \/ API key exposure:\s*`yes`/i.test(doc)
);

ok(
  "doc includes Gate 1 hold result with masked checker output",
  /Gate 1 same-CMD token\/session result/i.test(doc) &&
    /NONGA_ADMIN_API_TOKEN: present/.test(doc) &&
    /length: nonzero/.test(doc) &&
    /format: valid/.test(doc) &&
    /token: \*\*\*MASKED\*\*\*/.test(doc) &&
    /READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK/.test(doc) &&
    /sameCmdTokenCheckPassed=true/.test(doc)
);

ok(
  "doc includes Gate 2 v14.3U-only approval phrase and blocked carryover",
  /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(doc) &&
    /freshApprovalReceived=true/.test(doc) &&
    /approvalTextMatched=false/.test(doc) &&
    /approvalFileUsed=`v14\.3U-local-approval\.txt`/.test(doc) &&
    /HOLD — fresh owner approval text mismatch/.test(doc) &&
    /approval carryover from v14\.3S or earlier: forbidden/i.test(doc)
);

ok(
  "doc verifies Gate 3 command matches v14.3T identified command",
  /command matches v14\.3T identified command:\s*yes/i.test(doc) &&
    /same-CMD token required:\s*yes/i.test(doc) &&
    /fresh approval required:\s*yes/i.test(doc) &&
    /exactly-one-run control active:\s*yes/i.test(doc) &&
    /retry blocked:\s*yes/i.test(doc) &&
    /second run blocked:\s*yes/i.test(doc) &&
    /token printing blocked:\s*yes/i.test(doc) &&
    /production\/public\/real lead\/PII blocked:\s*yes/i.test(doc)
);

ok(
  "doc records no run started/consumed and no runtime",
  /executionDecision=`HOLD_FRESH_OWNER_APPROVAL_MISSING_OR_MISMATCHED`/.test(doc) &&
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc) &&
    /Gemini\/provider\/runtime: no/.test(doc)
);

const allowedFinalDecisions = [
  "PASS — v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN COMPLETED",
  "NEED REVIEW — v14.3U ONE-RUN RESULT INCONCLUSIVE",
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
  "doc final decision is hold fresh approval missing or mismatched",
  /Final decision in this round:[\s\S]*HOLD — FRESH OWNER APPROVAL MISSING OR MISMATCHED/.test(doc)
);

ok(
  "cross-doc continuity keeps v14.3T identified command reference",
  /owner-local-one-run:v14\.3U/.test(v143tDoc) &&
    /READY FOR v14\.3U FRESH OWNER APPROVAL \+ IDENTIFIED SAME-CMD OWNER-LOCAL ONE-RUN/.test(
      v143tDoc
    )
);

ok(
  "wrapper remains token-masked and no direct provider endpoint call",
  /token: \*\*\*MASKED\*\*\*/.test(wrapper) &&
    !/chat-user-visible-orchestrate/.test(wrapper) &&
    !/fetch\s*\(/.test(wrapper) &&
    !/https?:\/\//.test(wrapper)
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
  ok("fixture version is v14.3U", root.version === "v14.3U");

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches expected",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "753c59e902b71e1ee4b5eaf6f987db0e88c0ca85" &&
      baseline?.originHead === "753c59e902b71e1ee4b5eaf6f987db0e88c0ca85" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const gate1 = (root.gates as Record<string, unknown>)?.gate1SameCmdTokenSession as Record<
    string,
    unknown
  >;
  ok(
    "fixture gate1 marks same-cmd token check pass",
    gate1?.sameCmdTokenCheckPassed === true &&
      (gate1?.checkerResult as Record<string, unknown>)?.tokenPresence === "present" &&
      (gate1?.checkerResult as Record<string, unknown>)?.length === "nonzero" &&
      (gate1?.checkerResult as Record<string, unknown>)?.format === "valid" &&
      (gate1?.checkerResult as Record<string, unknown>)?.token === "***MASKED***" &&
      gate1?.decision === "PASS"
  );

  const gate2 = (root.gates as Record<string, unknown>)?.gate2FreshApprovalV143UOnly as Record<
    string,
    unknown
  >;
  ok(
    "fixture gate2 enforces v14.3U phrase and carryover block",
    gate2?.requiredPhrase ===
      "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN" &&
      gate2?.freshApprovalReceived === true &&
      gate2?.approvalTextMatched === false &&
      gate2?.approvalFileUsed === "v14.3U-local-approval.txt" &&
      gate2?.approvalCarryoverBlocked === true
  );

  const gate3 = (root.gates as Record<string, unknown>)?.gate3CommandVerification as Record<
    string,
    unknown
  >;
  ok(
    "fixture gate3 keeps command verification pass",
    gate3?.commandMatchesV143TIdentifiedCommand === true &&
      gate3?.sameCmdTokenRequired === true &&
      gate3?.freshApprovalRequired === true &&
      gate3?.exactlyOneRunControlActive === true &&
      gate3?.retryBlocked === true &&
      gate3?.secondRunBlocked === true &&
      gate3?.tokenPrintingBlocked === true &&
      gate3?.productionPublicRealLeadPIIBlocked === true
  );

  const evidence = root.executionEvidence as Record<string, unknown>;
  ok(
    "fixture evidence records no run and no retry",
    evidence?.executionDecision === "HOLD_FRESH_OWNER_APPROVAL_MISSING_OR_MISMATCHED" &&
      evidence?.sameCmdTokenCheckPassed === true &&
      evidence?.freshApprovalReceived === true &&
      evidence?.approvalTextMatched === false &&
      evidence?.approvalFileUsed === "v14.3U-local-approval.txt" &&
      evidence?.oneRunStarted === false &&
      evidence?.oneRunConsumed === false &&
      evidence?.retryUsed === false &&
      evidence?.secondRunUsed === false &&
      evidence?.gateReason === "HOLD_FRESH_OWNER_APPROVAL_MISSING_OR_MISMATCHED"
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  for (const value of allowedFinalDecisions) {
    ok(`fixture includes allowed final decision ${value}`, finalEnum.includes(value));
  }
  ok(
    "fixture final decision is hold fresh approval missing or mismatched",
    root.finalDecision === "HOLD — FRESH OWNER APPROVAL MISSING OR MISMATCHED"
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
    "package has test:v14.3U script",
    scripts["test:v14.3U"] === "tsx scripts/test-v143U-owner-local-exactly-one-run-record.mts"
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

console.log(`\nDone v14.3U exactly-one-run record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

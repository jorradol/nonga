/**
 * v14.3V approval phrase mismatch fix validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3V
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3V-approval-phrase-mismatch-fix-no-retry-record.md";
const FIXTURE_PATH = "docs/examples/v14.3V-approval-phrase-mismatch-fix.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";
const V143U_DOC_PATH = "docs/v14.3U-owner-local-exactly-one-run-record.md";
const V143T_DOC_PATH = "docs/v14.3T-owner-local-one-run-command-disambiguation-no-gemini.md";
const V143T_VALIDATOR_PATH = "scripts/test-v143T-owner-local-one-run-command-disambiguation-no-gemini.mts";
const V143U_VALIDATOR_PATH = "scripts/test-v143U-owner-local-exactly-one-run-record.mts";
const PACKAGE_PATH = "package.json";
const GITIGNORE_PATH = ".gitignore";

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

console.log("=== v14.3V Approval Phrase Mismatch Fix Validation ===\n");

ok("v14.3V doc exists", existsSync(DOC_PATH));
ok("v14.3V fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("v14.3U doc exists", existsSync(V143U_DOC_PATH));
ok("v14.3T doc exists", existsSync(V143T_DOC_PATH));
ok("v14.3T validator exists", existsSync(V143T_VALIDATOR_PATH));
ok("v14.3U validator exists", existsSync(V143U_VALIDATOR_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("gitignore exists", existsSync(GITIGNORE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const v143uDoc = read(V143U_DOC_PATH);
const v143tDoc = read(V143T_DOC_PATH);
const v143tValidator = read(V143T_VALIDATOR_PATH);
const v143uValidator = read(V143U_VALIDATOR_PATH);
const packageRaw = read(PACKAGE_PATH);
const gitignore = read(GITIGNORE_PATH);

ok("doc includes mismatch context and root cause", /HOLD — fresh owner approval text mismatch/.test(doc) && /docs\/spec mismatch with wrapper/i.test(doc));
ok(
  "doc confirms no retry no second run and no runtime",
  /retry execution in this round:\s*no/i.test(doc) &&
    /second run in this round:\s*no/i.test(doc) &&
    /Gemini\/provider\/runtime execution:\s*no/i.test(doc) &&
    /oneRun real execution path:\s*not_run/i.test(doc)
);
ok(
  "doc includes wrapper before and after approval constant",
  /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL ONE-RUN/.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(doc)
);
ok(
  "doc confirms normalization requirements",
  /strip BOM/i.test(doc) &&
    /normalize CRLF to LF/i.test(doc) &&
    /trim trailing\/leading whitespace\/newline/i.test(doc)
);
ok(
  "doc confirms local approval file is not committed and gitignored",
  /v14\.3U-local-approval\.txt/.test(doc) &&
    /not committed/i.test(doc) &&
    /gitignore/i.test(doc)
);

ok(
  "wrapper required approval text exactly matches v14.3U phrase",
  /const REQUIRED_APPROVAL_TEXT =\s*\n?\s*"FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN";/.test(
    wrapper
  )
);
ok(
  "wrapper approval file parsing normalizes BOM CRLF and trim",
  /\.replace\(\s*\/\^\\uFEFF\/,\s*""\s*\)/.test(wrapper) &&
    /\.replace\(\s*\/\\r\\n\/g,\s*"\\n"\s*\)/.test(wrapper) &&
    /\.trim\(\)/.test(wrapper)
);
ok(
  "wrapper remains fail-closed and token masked-only",
  /hold\("fresh owner approval text mismatch"\)/.test(wrapper) &&
    /token: \*\*\*MASKED\*\*\*/.test(wrapper) &&
    !/console\.log\(\s*.*NONGA_ADMIN_API_TOKEN/.test(wrapper) &&
    !/fetch\s*\(/.test(wrapper) &&
    !/https?:\/\//.test(wrapper)
);

ok(
  "docs/validators all reference exact v14.3U phrase",
  /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(v143tDoc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(v143uDoc) &&
    /v14\\\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(v143tValidator) &&
    /v14\\\.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(v143uValidator)
);

ok(
  "gitignore protects local approval artifact",
  /^v14\.3U-local-approval\.txt$/m.test(gitignore) && /^v14\.\*-local-approval\.txt$/m.test(gitignore)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

const allowedFinalDecisions = [
  "READY FOR v14.3W FRESH OWNER APPROVAL + SAME-CMD EXACTLY-ONE-RUN",
  "HOLD — APPROVAL PHRASE MISMATCH FIX INCOMPLETE",
  "HOLD — LOCAL APPROVAL FILE COMMIT RISK",
  "HOLD — TOKEN/SECRET EXPOSURE RISK DETECTED",
  "HOLD — RETRY OR SECOND-RUN RISK DETECTED",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
  "HOLD — REPO STATE NOT READY",
];

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3V", root.version === "v14.3V");

  const rootCause = root.rootCause as Record<string, unknown>;
  ok(
    "fixture root cause confirms mismatch and exact alignment after fix",
    rootCause?.confirmed === true &&
      rootCause?.type === "docs_spec_mismatch_with_wrapper_constant" &&
      rootCause?.afterRequiredApprovalText ===
        "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN" &&
      rootCause?.allMatchExactly === true
  );

  const parsing = root.approvalFileParsing as Record<string, unknown>;
  ok(
    "fixture parsing confirms BOM/CRLF/trim normalization",
    parsing?.stripBom === true &&
      parsing?.normalizeCrLfToLf === true &&
      parsing?.trimWhitespace === true &&
      parsing?.windowsEchoTrailingNewlineSafe === true
  );

  const handling = root.localApprovalFileHandling as Record<string, unknown>;
  ok(
    "fixture local approval file is not committed and gitignore rule added",
    handling?.localApprovalFilePath === "v14.3U-local-approval.txt" &&
      handling?.committed === false &&
      handling?.gitignoreRuleAdded === true
  );

  const boundary = root.boundaryStatus as Record<string, unknown>;
  ok(
    "fixture boundary confirms no retry/no second run/no runtime",
    boundary?.noRetryExecution === true &&
      boundary?.noSecondRun === true &&
      boundary?.geminiProviderRuntime === false &&
      boundary?.oneRunRealExecutionPath === "not_run" &&
      boundary?.noProviderNetworkTriggerEndpointCallInV143V === true &&
      boundary?.noTokenSecretExposure === true
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  for (const value of allowedFinalDecisions) {
    ok(`fixture includes allowed final decision ${value}`, finalEnum.includes(value));
  }
  ok(
    "fixture final decision ready for v14.3W",
    root.finalDecision === "READY FOR v14.3W FRESH OWNER APPROVAL + SAME-CMD EXACTLY-ONE-RUN"
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
    "package has test:v14.3V script",
    scripts["test:v14.3V"] === "tsx scripts/test-v143V-approval-phrase-mismatch-fix-no-retry.mts"
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

console.log(`\nDone v14.3V approval phrase mismatch fix validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

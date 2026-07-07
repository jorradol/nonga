import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.4A-limited-private-tester-browser-check.md";
const FIXTURE_PATH =
  "docs/examples/v20.4A-limited-private-tester-browser-check.example.json";

const REQUIRED_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v20.4A LIMITED PRIVATE TESTER BROWSER CHECK / OWNER-APPROVED TESTERS ONLY / STAGING ONLY / PRIVATE ALLOWLIST ONLY / EXACTLY ONE SAFE CHAT MESSAGE PER TESTER / NO TOKEN HEADER COOKIE SECRET SHARING / NO RETRY / NO SECOND-RUN / NO RE-ARM / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN";

let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log("PASS", name, detail);
    return;
  }
  failures += 1;
  console.log("FAIL", name, detail);
}

function readText(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v20.4A limited private tester browser check validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
let fixture;
try {
  fixture = JSON.parse(readText(FIXTURE_PATH));
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
}

if (!fixture || typeof fixture !== "object") {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

const allowedStatus = new Set(["completed", "started", "not_started"]);
const allowedTesterResultStatus = new Set([
  "not_provided",
  "provided_safe_completed",
  "provided_with_blocker",
]);

check("version is v20.4A", fixture.version === "v20.4A");
check(
  "executionType matches",
  fixture.executionType === "LIMITED_PRIVATE_TESTER_BROWSER_CHECK_OWNER_APPROVED"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 2865957", fixture.expectedHead === "2865957");
check("baselineV204Pass true", fixture.baselineV204Pass === true);
check("approvalPhrasePresent true", fixture.approvalPhrasePresent === true);

check(
  "step1Status fail-closed and completed",
  allowedStatus.has(fixture.step1Status) && fixture.step1Status === "completed",
  String(fixture.step1Status)
);
check(
  "step2StatusBefore fail-closed and started",
  allowedStatus.has(fixture.step2StatusBefore) && fixture.step2StatusBefore === "started",
  String(fixture.step2StatusBefore)
);
check("step2Completed false", fixture.step2Completed === false);
check(
  "step3Status fail-closed and not_started",
  allowedStatus.has(fixture.step3Status) && fixture.step3Status === "not_started",
  String(fixture.step3Status)
);
check(
  "step4Status fail-closed and not_started",
  allowedStatus.has(fixture.step4Status) && fixture.step4Status === "not_started",
  String(fixture.step4Status)
);
check(
  "step5Status fail-closed and not_started",
  allowedStatus.has(fixture.step5Status) && fixture.step5Status === "not_started",
  String(fixture.step5Status)
);

check(
  "ownerApprovedPrivateTesterScope true",
  fixture.ownerApprovedPrivateTesterScope === true
);
check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("agentSyntheticSend false", fixture.agentSyntheticSend === false);
check("testerTokenHandlingRequired false", fixture.testerTokenHandlingRequired === false);
check("ownerTokenHandlingRequired false", fixture.ownerTokenHandlingRequired === false);
check(
  "envVarRequiredForOwnerOrTester false",
  fixture.envVarRequiredForOwnerOrTester === false
);
check("secretExposure false", fixture.secretExposure === false);
check("headerCookieExposure false", fixture.headerCookieExposure === false);
check("retry false", fixture.retry === false);
check("secondRun false", fixture.secondRun === false);
check("reArm false", fixture.reArm === false);
check("deploy false", fixture.deploy === false);
check("public false", fixture.public === false);
check("production false", fixture.production === false);
check("realDealerAction false", fixture.realDealerAction === false);
check("realLead false", fixture.realLead === false);
check("realCustomerData false", fixture.realCustomerData === false);
check("piiPhonePlateVin false", fixture.piiPhonePlateVin === false);
check("inventoryMatchingQualityProven false", fixture.inventoryMatchingQualityProven === false);
check("serverDiagnosticsClaimed false", fixture.serverDiagnosticsClaimed === false);
check("providerGeminiClaimed false", fixture.providerGeminiClaimed === false);

const testerResultStatus = String(fixture.testerResultStatus ?? "");
check(
  "testerResultStatus is allowed",
  allowedTesterResultStatus.has(testerResultStatus),
  testerResultStatus
);

const step2After = String(fixture.step2StatusAfter ?? "");
check(
  "step2StatusAfter fail-closed and started",
  allowedStatus.has(step2After) && step2After === "started",
  step2After
);

if (testerResultStatus === "not_provided") {
  check(
    "not_provided => limitedPrivateTesterEvidenceExpanded false",
    fixture.limitedPrivateTesterEvidenceExpanded === false
  );
  check("not_provided => step2StatusAfter started", step2After === "started");
}

if (testerResultStatus === "provided_safe_completed") {
  check(
    "provided_safe_completed => limitedPrivateTesterEvidenceExpanded true",
    fixture.limitedPrivateTesterEvidenceExpanded === true
  );
  check("provided_safe_completed => step2StatusAfter started", step2After === "started");
  check("provided_safe_completed => step2Completed false", fixture.step2Completed === false);
}

if (testerResultStatus === "provided_with_blocker") {
  check("provided_with_blocker => step2StatusAfter started", step2After === "started");
  check(
    "provided_with_blocker => doc has HOLD guidance",
    /HOLD — <exact reason>/i.test(doc)
  );
}

const next = String(fixture.nextRecommendedStep ?? "");
check("nextRecommendedStep does not mention Step 3", !/step\s*3/i.test(next));

check("doc includes required approval phrase", doc.includes(REQUIRED_APPROVAL_PHRASE));
check(
  "doc includes approval phrase present statement",
  /approval phrase is present/i.test(doc)
);
check(
  "doc includes result status states",
  doc.includes("not_provided") &&
    doc.includes("provided_safe_completed") &&
    doc.includes("provided_with_blocker")
);
check(
  "doc includes inventory limitation note",
  doc.includes("does not prove full inventory matching quality")
);
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);
check("doc states no move to Step 3", /does not move to Step 3/i.test(doc));

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

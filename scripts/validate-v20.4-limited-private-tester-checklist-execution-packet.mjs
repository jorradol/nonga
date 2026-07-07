import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.4-limited-private-tester-checklist-execution-packet.md";
const FIXTURE_PATH =
  "docs/examples/v20.4-limited-private-tester-checklist-execution-packet.example.json";

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

console.log("=== v20.4 limited private tester checklist execution packet validator ===\n");

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

check("version is v20.4", fixture.version === "v20.4");
check(
  "executionType matches",
  fixture.executionType === "PRIVATE_TESTER_CHECKLIST_EXECUTION_PACKET_PREPARATION_ONLY"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is c46ca01", fixture.expectedHead === "c46ca01");
check("baselineV203Pass true", fixture.baselineV203Pass === true);

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

check("futureApprovalPhrasePrepared true", fixture.futureApprovalPhrasePrepared === true);
check(
  "futureApprovalPhrase exact match",
  fixture.futureApprovalPhrase === REQUIRED_APPROVAL_PHRASE
);
check(
  "privateTesterEligibilityRulesPrepared true",
  fixture.privateTesterEligibilityRulesPrepared === true
);
check(
  "ownerFriendlyTesterInstructionsPrepared true",
  fixture.ownerFriendlyTesterInstructionsPrepared === true
);
check("safePromptSetPrepared true", fixture.safePromptSetPrepared === true);
check("testerStopConditionsPrepared true", fixture.testerStopConditionsPrepared === true);
check("testerFeedbackChecklistPrepared true", fixture.testerFeedbackChecklistPrepared === true);
check("ownerReviewChecklistPrepared true", fixture.ownerReviewChecklistPrepared === true);

check("privateTesterRunRequested false", fixture.privateTesterRunRequested === false);
check("privateTesterRunExecuted false", fixture.privateTesterRunExecuted === false);
check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("ownerRunRequested false", fixture.ownerRunRequested === false);
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

const next = String(fixture.nextRecommendedStep ?? "");
check("nextRecommendedStep mentions v20.4A", /v20\.4a/i.test(next));
check("nextRecommendedStep does not mention Step 3", !/step\s*3/i.test(next));

check(
  "doc includes required approval phrase",
  doc.includes(REQUIRED_APPROVAL_PHRASE)
);
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);
check(
  "doc includes inventory limitation note",
  doc.includes("does not prove full inventory matching quality")
);
check(
  "doc states no run in v20.4",
  /no private tester run.*v20\.4/i.test(doc)
);
check("doc states no move to Step 3", /does not move to Step 3/i.test(doc));

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

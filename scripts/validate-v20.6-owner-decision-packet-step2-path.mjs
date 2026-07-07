import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.6-owner-decision-packet-step2-path.md";
const FIXTURE_PATH = "docs/examples/v20.6-owner-decision-packet-step2-path.example.json";

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

console.log("=== v20.6 owner decision packet step2 path validator ===\n");

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

check("version is v20.6", fixture.version === "v20.6");
check("executionType matches", fixture.executionType === "OWNER_DECISION_PACKET_ONLY");
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is fbce716", fixture.expectedHead === "fbce716");
check("baselineV205Pass true", fixture.baselineV205Pass === true);

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
check("step2EvidenceExpanded true", fixture.step2EvidenceExpanded === true);
check("step2CompletedBefore false", fixture.step2CompletedBefore === false);
check("step2CompletedAfter false", fixture.step2CompletedAfter === false);
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

check("ownerBrowserEvidenceRecorded true", fixture.ownerBrowserEvidenceRecorded === true);
check("privateTesterEvidenceRecorded true", fixture.privateTesterEvidenceRecorded === true);
check("ownerVisibleSafeResult true", fixture.ownerVisibleSafeResult === true);
check("privateTesterSafeResult true", fixture.privateTesterSafeResult === true);
check("thaiUxPositive true", fixture.thaiUxPositive === true);
check("realLeadCreated false", fixture.realLeadCreated === false);
check("phoneRequested false", fixture.phoneRequested === false);
check("riskyDataAppeared false", fixture.riskyDataAppeared === false);
check(
  "tokenHeaderCookieSecretAppeared false",
  fixture.tokenHeaderCookieSecretAppeared === false
);
check("phonePlateVinAppeared false", fixture.phonePlateVinAppeared === false);
check("errorOrBlankScreen false", fixture.errorOrBlankScreen === false);
check("step2CompletionCriteriaPrepared true", fixture.step2CompletionCriteriaPrepared === true);
check("step2HoldCriteriaPrepared true", fixture.step2HoldCriteriaPrepared === true);
check("step3PrerequisitesPrepared true", fixture.step3PrerequisitesPrepared === true);
check("ownerDecisionOptionsPrepared true", fixture.ownerDecisionOptionsPrepared === true);
check(
  "optionAOneMorePrivateTesterPrepared true",
  fixture.optionAOneMorePrivateTesterPrepared === true
);
check(
  "optionBStep2ClosureLaterPrepared true",
  fixture.optionBStep2ClosureLaterPrepared === true
);
check(
  "futureV206AApprovalPhrasePrepared true",
  fixture.futureV206AApprovalPhrasePrepared === true
);
check("futureV207ApprovalPhrasePrepared true", fixture.futureV207ApprovalPhrasePrepared === true);
check("ownerDecisionMadeInThisTask false", fixture.ownerDecisionMadeInThisTask === false);
check("optionAExecuted false", fixture.optionAExecuted === false);
check("optionBExecuted false", fixture.optionBExecuted === false);
check("step3Proposed false", fixture.step3Proposed === false);

check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("newOwnerRunRequested false", fixture.newOwnerRunRequested === false);
check("newPrivateTesterRunRequested false", fixture.newPrivateTesterRunRequested === false);
check("tokenHandlingRequired false", fixture.tokenHandlingRequired === false);
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
check("nextRecommendedStep mentions Option A", /option a/i.test(next));
check("nextRecommendedStep mentions Option B", /option b/i.test(next));
check("nextRecommendedStep does not mention Step 3", !/step\s*3/i.test(next));

check("doc includes Option A section", /Option A - One more private tester check later/i.test(doc));
check("doc includes Option B section", /Option B - Prepare Step 2 closure later/i.test(doc));
check("doc includes future v20.6A phrase", /FINAL AUTHORIZE v20\.6A ONE MORE LIMITED PRIVATE TESTER BROWSER CHECK/i.test(doc));
check("doc includes future v20.7 phrase", /FINAL AUTHORIZE v20\.7 STEP 2 CLOSURE READINESS PACKET/i.test(doc));
check("doc states no Step 2 completion", /does not close Step 2/i.test(doc));
check("doc states no Step 3 movement", /does not move to Step 3/i.test(doc));
check(
  "doc includes inventory limitation note",
  doc.includes("does not prove full inventory matching quality")
);
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

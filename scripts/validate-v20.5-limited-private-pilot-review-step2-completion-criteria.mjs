import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.5-limited-private-pilot-review-step2-completion-criteria.md";
const FIXTURE_PATH =
  "docs/examples/v20.5-limited-private-pilot-review-step2-completion-criteria.example.json";

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

console.log("=== v20.5 limited private pilot review and step2 completion criteria validator ===\n");

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

check("version is v20.5", fixture.version === "v20.5");
check(
  "executionType matches",
  fixture.executionType === "LIMITED_PRIVATE_PILOT_REVIEW_AND_STEP2_COMPLETION_CRITERIA_ONLY"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is ed93fbe", fixture.expectedHead === "ed93fbe");
check("baselineV204BPass true", fixture.baselineV204BPass === true);

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
check("step2CompletedAfter false", fixture.step2CompletedAfter === false);

const next = String(fixture.nextRecommendedStep ?? "");
check("nextRecommendedStep mentions v20.6", /v20\.6/i.test(next));
check("nextRecommendedStep does not mention Step 3", !/step\s*3/i.test(next));

check(
  "doc includes no execute statement",
  /does not execute anything/i.test(doc)
);
check(
  "doc includes step2 completion criteria section",
  /Step 2 completion criteria/i.test(doc)
);
check(
  "doc includes hold criteria section",
  /HOLD criteria/i.test(doc)
);
check(
  "doc includes step3 prerequisites section",
  /Step 3 prerequisites/i.test(doc)
);
check(
  "doc includes inventory limitation note",
  doc.includes("does not prove full inventory matching quality")
);
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);
check("doc states no Step 2 completion in v20.5", /v20\.5 does not mark Step 2 completed/i.test(doc));
check("doc states no step3 proposal", /does not propose Step 3/i.test(doc));

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

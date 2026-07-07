import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.4B-limited-private-tester-result-record.md";
const FIXTURE_PATH = "docs/examples/v20.4B-limited-private-tester-result-record.example.json";

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

console.log("=== v20.4B limited private tester result record validator ===\n");

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

check("version is v20.4B", fixture.version === "v20.4B");
check(
  "executionType matches",
  fixture.executionType === "PRIVATE_TESTER_RESULT_RECORD_ONLY"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is d71ecd1", fixture.expectedHead === "d71ecd1");
check("baselineV204APass true", fixture.baselineV204APass === true);

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

check("testerResultStatusBefore not_provided", fixture.testerResultStatusBefore === "not_provided");
check(
  "testerResultStatusAfter provided_safe_completed",
  fixture.testerResultStatusAfter === "provided_safe_completed"
);
check("privateTesterEvidenceExpanded true", fixture.privateTesterEvidenceExpanded === true);
check("stagingOpened true", fixture.stagingOpened === true);
check("loginWorked true", fixture.loginWorked === true);
check("chatOrHomeOpened true", fixture.chatOrHomeOpened === true);
check("oneSafeSampleMessageSent true", fixture.oneSafeSampleMessageSent === true);
check("systemResponded true", fixture.systemResponded === true);
check("thaiUnderstandable true", fixture.thaiUnderstandable === true);
check("answerSafe true", fixture.answerSafe === true);
check("answerNatural true", fixture.answerNatural === true);
check("realLeadCreated false", fixture.realLeadCreated === false);
check("phoneRequested false", fixture.phoneRequested === false);
check("riskyDataAppeared false", fixture.riskyDataAppeared === false);
check(
  "tokenHeaderCookieSecretAppeared false",
  fixture.tokenHeaderCookieSecretAppeared === false
);
check("phonePlateVinAppeared false", fixture.phonePlateVinAppeared === false);
check("errorOrBlankScreen false", fixture.errorOrBlankScreen === false);

check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("newOwnerRunRequested false", fixture.newOwnerRunRequested === false);
check(
  "newPrivateTesterRunRequested false",
  fixture.newPrivateTesterRunRequested === false
);
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

check(
  "step2StatusAfter fail-closed and started",
  allowedStatus.has(fixture.step2StatusAfter) && fixture.step2StatusAfter === "started",
  String(fixture.step2StatusAfter)
);

const next = String(fixture.nextRecommendedStep ?? "");
check("nextRecommendedStep mentions v20.5", /v20\.5/i.test(next));
check("nextRecommendedStep does not mention Step 3", !/step\s*3/i.test(next));

check(
  "doc records provided checklist summary",
  doc.includes("ปลอดภัยดี ตอบได้ดีและถูกใจแล้ว") && doc.includes("ให้คำแนะนำได้ดีเป็นธรรมชาติ")
);
check(
  "doc includes no new run statement",
  /without creating any new run/i.test(doc)
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

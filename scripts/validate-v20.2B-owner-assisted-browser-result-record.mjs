import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.2B-owner-assisted-browser-result-record.md";
const FIXTURE_PATH = "docs/examples/v20.2B-owner-assisted-browser-result-record.example.json";

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

console.log("=== v20.2B owner-assisted browser result record validator ===\n");

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

const allowedQuality = new Set(["good", "unknown"]);
const allowedStatuses = new Set(["completed", "not_started", "started"]);

check("version is v20.2B", fixture.version === "v20.2B");
check(
  "executionType matches",
  fixture.executionType === "OWNER_REPORTED_BROWSER_RESULT_RECORD_ONLY"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 748c7f6", fixture.expectedHead === "748c7f6");

check("ownerResultPhrasePresent true", fixture.ownerResultPhrasePresent === true);
check("ownerVisibleBrowserCheckCompleted true", fixture.ownerVisibleBrowserCheckCompleted === true);
check(
  "ownerVisibleResponseQuality known",
  allowedQuality.has(fixture.ownerVisibleResponseQuality),
  String(fixture.ownerVisibleResponseQuality)
);
check(
  "ownerVisibleSensitiveLeakReported false",
  fixture.ownerVisibleSensitiveLeakReported === false
);
check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("newOwnerRunRequested false", fixture.newOwnerRunRequested === false);
check("tokenHandlingRequired false", fixture.tokenHandlingRequired === false);
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
  "step1Status known and completed",
  allowedStatuses.has(fixture.step1Status) && fixture.step1Status === "completed",
  String(fixture.step1Status)
);
check("step2StatusBefore not_started", fixture.step2StatusBefore === "not_started");
check("step2StatusAfter started", fixture.step2StatusAfter === "started");
check("step2Completed false", fixture.step2Completed === false);
check("step3Status not_started", fixture.step3Status === "not_started");
check("step4Status not_started", fixture.step4Status === "not_started");
check("step5Status not_started", fixture.step5Status === "not_started");

check(
  "doc includes owner phrase",
  doc.includes("ทดลองถามแล้วตอบได้ดีมากไม่มีอะไรหลุดมา ปลอดภัยครับ")
);
check(
  "doc includes step2 started and not completed",
  doc.includes("Step 2 after: `started`") && doc.includes("Step 2 completed: `false`")
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

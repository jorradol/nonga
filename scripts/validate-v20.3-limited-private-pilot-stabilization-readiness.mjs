import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.3-limited-private-pilot-stabilization-readiness.md";
const FIXTURE_PATH = "docs/examples/v20.3-limited-private-pilot-stabilization-readiness.example.json";

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

console.log("=== v20.3 limited private pilot stabilization readiness validator ===\n");

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

check("version is v20.3", fixture.version === "v20.3");
check(
  "executionType matches",
  fixture.executionType === "LIMITED_PRIVATE_PILOT_STABILIZATION_READINESS_ONLY"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 2520edb", fixture.expectedHead === "2520edb");
check("baselineV202BPass true", fixture.baselineV202BPass === true);

check(
  "step1Status completed",
  allowedStatus.has(fixture.step1Status) && fixture.step1Status === "completed",
  String(fixture.step1Status)
);
check("step2StatusBefore started", fixture.step2StatusBefore === "started");
check("step2Completed false", fixture.step2Completed === false);
check("step3Status not_started", fixture.step3Status === "not_started");
check("step4Status not_started", fixture.step4Status === "not_started");
check("step5Status not_started", fixture.step5Status === "not_started");

check("privatePilotScopePrepared true", fixture.privatePilotScopePrepared === true);
check(
  "ownerFriendlyTesterInstructionsPrepared true",
  fixture.ownerFriendlyTesterInstructionsPrepared === true
);
check("testerTokenHandlingRequired false", fixture.testerTokenHandlingRequired === false);
check("ownerTokenHandlingRequired false", fixture.ownerTokenHandlingRequired === false);
check(
  "envVarRequiredForOwnerOrTester false",
  fixture.envVarRequiredForOwnerOrTester === false
);
check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("ownerRunRequested false", fixture.ownerRunRequested === false);
check("privateTesterRunRequested false", fixture.privateTesterRunRequested === false);
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
check("nextRecommendedStep mentions v20.4", next.toLowerCase().includes("v20.4"));
check("nextRecommendedStep does not mention Step 3", !/step\s*3/i.test(next));

check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);
check(
  "doc includes inventory limitation note",
  doc.includes("does not prove full inventory matching quality")
);
check(
  "doc states no move to Step 3",
  doc.includes("does not move to Step 3")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

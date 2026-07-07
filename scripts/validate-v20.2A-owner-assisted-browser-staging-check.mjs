import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.2A-owner-assisted-browser-staging-check.md";
const FIXTURE_PATH = "docs/examples/v20.2A-owner-assisted-browser-staging-check.example.json";

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

console.log("=== v20.2A owner-assisted browser staging check validator ===\n");

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

check("version is v20.2A", fixture.version === "v20.2A");
check(
  "executionType matches",
  fixture.executionType === "OWNER_ASSISTED_BROWSER_CHECKLIST_PREPARATION_ONLY"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is a5c9247", fixture.expectedHead === "a5c9247");

check("approval phrase present", fixture.approvalPhrasePresent === true);
check("agent browser execution false", fixture.agentBrowserExecution === false);
check("owner token handling required false", fixture.ownerTokenHandlingRequired === false);
check("secret exposure false", fixture.secretExposure === false);
check("header/cookie exposure false", fixture.headerCookieExposure === false);
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
check("ownerChecklistPrepared true", fixture.ownerChecklistPrepared === true);

const status = fixture.ownerResultStatus;
const allowedStatuses = new Set(["not_provided", "provided_safe_completed", "provided_with_blocker"]);
check("ownerResultStatus is known", allowedStatuses.has(status), String(status));

if (status === "not_provided") {
  check("step2Status remains not_started", fixture.step2Status === "not_started");
} else if (status === "provided_safe_completed") {
  check("step2Status may be started", fixture.step2Status === "started");
} else if (status === "provided_with_blocker") {
  check("step2Status remains not_started on blocker", fixture.step2Status === "not_started");
}

check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);
check("doc includes inventory interpretation note", doc.includes("does not prove full inventory matching quality"));
check(
  "doc includes need owner action decision",
  doc.includes("NEED OWNER ACTION — owner-assisted browser checklist prepared, no run evidence yet")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

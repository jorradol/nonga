/**
 * v19.14 future lock re-arm approval packet validator
 * Static checks only. Future approval packet only.
 *
 * npm run test:v19.14
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.14-future-lock-rearm-approval-packet.md";
const FIXTURE_PATH = "docs/examples/v19.14-future-lock-rearm-approval-packet.synthetic.json";
const PACKAGE_PATH = "package.json";

const REQUIRED_BOUNDARY_PHRASE =
  "ยังไม่ GO, ยังไม่ execution, ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง";
const REQUIRED_FINAL_DECISION =
  "V19.14 FUTURE LOCK RE-ARM APPROVAL PACKET CLOSED — READY FOR FRESH OWNER BOUNDARY-CHANGING APPROVAL ONLY / NO LOCK MUTATION / NO EXECUTION";
const V1913_FINAL_DECISION =
  "V19.13 LOCK RE-ARM DECISION REQUEST PACKET CLOSED — READY FOR OWNER LOCK RE-ARM DECISION ONLY / NO EXECUTION";

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

function hasEveryLine(source: string, required: string[]): boolean {
  return required.every((token) => source.includes(token));
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

console.log("=== v19.14 Future Lock Re-Arm Approval Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.14 future approval packet only",
  doc.includes("# v19.14 - Future Lock Re-Arm Approval Packet") &&
    fixtureRaw.includes("\"milestone\": \"v19.14\"") &&
    fixtureRaw.includes("\"executionType\": \"future-lock-rearm-approval-packet-only\"") &&
    fixtureRaw.includes("\"futureApprovalPacketOnly\": true")
);

ok("required boundary phrase exists", combined.includes(REQUIRED_BOUNDARY_PHRASE));
ok("required final decision exact exists", combined.includes(REQUIRED_FINAL_DECISION));
ok("v19.13 carry-forward final decision exists", combined.includes(V1913_FINAL_DECISION));

ok(
  "required consumed lock carry-forward statements exist",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "\"consumed\": true",
    "HOLD — RETRY OR SECOND-RUN RISK DETECTED"
  ])
);

ok(
  "required no-authorization lines exist",
  hasEveryLine(doc, [
    "no command execution is authorized",
    "no lock reset/deletion/mutation/re-arm action is authorized",
    "no public/production/real lead/real dealer action is authorized",
    "no runtime/provider/gemini call is authorized",
    "no live endpoint/manual endpoint guess/deploy action is authorized"
  ])
);

ok(
  "prior approval does not cover lock reset re-arm mutation",
  hasEveryLine(doc, [
    "prior owner approval does not authorize lock reset.",
    "prior owner approval does not authorize lock re-arm.",
    "prior owner approval does not authorize lock mutation."
  ])
);

ok(
  "future approval requires fresh explicit boundary-changing owner approval",
  hasEveryLine(doc, [
    "future owner approval must be fresh, explicit, and boundary-changing.",
    "future owner approval must explicitly state one lock re-arm only.",
    "future owner approval must explicitly state one controlled owner-only one-run only."
  ])
);

ok(
  "unsafe vague approval wording is rejected",
  hasEveryLine(doc, [
    "the following wording is unsafe and must not be accepted:",
    "`ทำต่อได้เลย`",
    "`GO`",
    "`อนุมัติ`",
    "`รันได้`",
    "any vague approval that does not explicitly mention both lock re-arm and one controlled owner-only one-run."
  ])
);

ok("safe default hold statement exists", combined.includes("HOLD — OWNER APPROVAL WORDING INSUFFICIENT"));

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

const scripts =
  packageParsed && typeof packageParsed === "object"
    ? ((packageParsed as { scripts?: Record<string, string> }).scripts ?? {})
    : {};
ok(
  "package has test:v19.14 script",
  scripts["test:v19.14"] === "tsx scripts/test-v1914-future-lock-rearm-approval-packet.mts"
);

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  const requiredTrueBooleans = [
    "priorApprovalDoesNotCoverLockRearm",
    "futureApprovalPacketOnly",
    "noExecution",
    "noOneRun",
    "noRetry",
    "noSecondRun",
    "noLockReset",
    "noLockDeletion",
    "noLockMutation",
    "noLockRearm",
    "noRuntimeProviderGeminiCall",
    "noLiveEndpointCall",
    "noDeploy",
    "noPublic",
    "noProduction",
    "noRealDealerAction",
    "noRealLead",
    "noRealCustomerData"
  ];
  ok(
    "required top-level future boundary booleans are true",
    requiredTrueBooleans.every((k) => root[k] === true)
  );

  ok("required milestone and executionType match", root.milestone === "v19.14" && root.executionType === "future-lock-rearm-approval-packet-only");

  const v1913CarryForward = asRecord(root.v1913CarryForward);
  ok(
    "v1913 carry-forward object complete",
    v1913CarryForward.v1913FinalDecision === V1913_FINAL_DECISION &&
      v1913CarryForward.carryForwardConfirmed === true
  );

  const consumed = asRecord(root.consumedLockCarryForward);
  ok(
    "consumed lock carry-forward object complete",
    consumed.lockFilePath === ".nonga-owner-local-one-run-v143u.lock.json" &&
      consumed.observedConsumedState === true &&
      consumed.observedConsumedLiteral === "\"consumed\": true" &&
      consumed.holdReason === "HOLD — RETRY OR SECOND-RUN RISK DETECTED"
  );

  const tokenGuard = asRecord(root.tokenSecretCredentialGuard);
  const piiGuard = asRecord(root.piiPhonePlateVinGuard);
  ok("token and pii guards enabled", tokenGuard.enabled === true && piiGuard.enabled === true);

  const unsafeGuard = asRecord(root.unsafeApprovalWordingGuard);
  ok(
    "unsafe approval wording guard complete",
    unsafeGuard.enabled === true &&
      Array.isArray(unsafeGuard.rejectedExamples) &&
      unsafeGuard.rejectedExamples.includes("ทำต่อได้เลย") &&
      unsafeGuard.rejectedExamples.includes("GO") &&
      unsafeGuard.rejectedExamples.includes("อนุมัติ") &&
      unsafeGuard.rejectedExamples.includes("รันได้")
  );

  const requiredFields = asRecord(root.futureApprovalRequiredFields);
  ok(
    "future approval required fields complete",
    requiredFields.oneLockRearmOnly === true &&
      requiredFields.oneControlledOwnerOnlyOneRunOnly === true &&
      requiredFields.noRetry === true &&
      requiredFields.noSecondRun === true &&
      requiredFields.stagingOwnerOnlyBoundary === true &&
      requiredFields.noPublic === true &&
      requiredFields.noProduction === true &&
      requiredFields.noRealDealerAction === true &&
      requiredFields.noRealLead === true &&
      requiredFields.noRealCustomerData === true &&
      requiredFields.noTokenSecretCredentialPiiExposure === true &&
      requiredFields.freshExplicitBoundaryChangingOwnerApprovalRequired === true
  );

  ok("safe default hold exact in fixture", root.safeDefaultHold === "HOLD — OWNER APPROVAL WORDING INSUFFICIENT");
  ok("required boundary phrase exact in fixture", root.requiredBoundaryPhrase === REQUIRED_BOUNDARY_PHRASE);
  ok("required final decision exact in fixture", root.finalDecision === REQUIRED_FINAL_DECISION);
}

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["quoted secret assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenAuthorizationPatterns: Array<[string, RegExp]> = [
  ["owner approval granted phrase", /\bOWNER APPROVAL GRANTED\b/i],
  ["go granted phrase", /\bGO GRANTED\b/i],
  ["execution approved phrase", /\bEXECUTION APPROVED\b/i],
  ["run now phrase", /\bRUN NOW\b/i],
  ["lock mutation approved phrase", /\bLOCK MUTATION APPROVED\b/i],
  ["lock rearm approved phrase", /\bLOCK RE-ARM APPROVED\b/i]
];
for (const [name, re] of forbiddenAuthorizationPatterns) {
  ok(`no forbidden authorization pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v19.14 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

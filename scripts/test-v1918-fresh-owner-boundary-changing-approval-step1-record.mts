/**
 * v19.18 fresh owner boundary-changing approval record validator
 * Static checks only. No execution/runtime/provider/deploy path.
 *
 * npm run test:v19.18
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md";
const EXAMPLE_PATH = "docs/examples/v19.18-fresh-owner-boundary-changing-approval-step1-record.example.md";
const PACKAGE_PATH = "package.json";

const REQUIRED_PREVIOUS_DECISION = "HOLD — OWNER APPROVAL WORDING INSUFFICIENT FOR EXECUTION";
const REQUIRED_FINAL = "PASS — v19.18 fresh owner boundary-changing approval recorded for Step 1 scope only";
const REQUIRED_BOUNDARY_PHRASE =
  "ยังไม่ GO, ยังไม่ execution, ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง";

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

console.log("=== v19.18 Fresh Owner Boundary-Changing Approval Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.18 packet",
  doc.includes("# v19.18 - Fresh Owner Boundary-Changing Approval Record for Step 1") &&
    example.includes("milestone: v19.18") &&
    example.includes("packet_type: fresh_owner_boundary_changing_approval_record_for_step1")
);

ok("previous hold decision linked", combined.includes(REQUIRED_PREVIOUS_DECISION));
ok("required boundary phrase exists", combined.includes(REQUIRED_BOUNDARY_PHRASE));
ok("required final decision exists", combined.includes(REQUIRED_FINAL));

ok(
  "exact owner approval heading and sentence exist",
  hasEveryLine(doc, [
    "FRESH OWNER BOUNDARY-CHANGING APPROVAL FOR STEP 1 ONLY",
    "I, owner, explicitly approve exactly one lock re-arm and exactly one controlled owner-only staging one-run for Step 1 Owner-only staging trial."
  ])
);

ok(
  "full approved scope lines exist",
  hasEveryLine(combined, [
    "exactly one lock re-arm",
    "exactly one controlled owner-only one-run",
    "no retry",
    "no second-run",
    "owner-only",
    "staging-only",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
    "no real customer data",
    "no Thor real import",
    "no dealer real inventory import",
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure"
  ])
);

ok(
  "non-execution in this task is explicit",
  hasEveryLine(doc, [
    "this v19.18 task does not execute Step 1.",
    "no lock reset/re-arm/mutation executed in this task.",
    "no one-run executed in this task.",
    "no retry or second-run executed in this task.",
    "no endpoint/provider/runtime/Gemini call executed in this task.",
    "no deploy/public/production/real dealer/real lead action executed in this task."
  ])
);

ok(
  "position before step1 execution remains explicit",
  hasEveryLine(combined, [
    "still before Step 1 Owner-only staging trial execution.",
    "Step 1 not executed yet.",
    "remaining_main_steps_before_public_production: 5",
    "1) Owner-only staging trial",
    "2) Limited private pilot",
    "3) Real dealer dry-run",
    "4) Real lead pilot แบบจำกัดมาก",
    "5) Public / Production"
  ])
);

ok(
  "approval applies only to latest approved packet line exists",
  combined.includes(
    "This approval applies only to the latest approved packet and does not authorize any additional run, retry, production action, public release, real dealer action, or real lead action."
  )
);

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
  "package has test:v19.18 script",
  scripts["test:v19.18"] === "tsx scripts/test-v1918-fresh-owner-boundary-changing-approval-step1-record.mts"
);

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

console.log(`\nDone v19.18 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

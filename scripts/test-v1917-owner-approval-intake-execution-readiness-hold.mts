/**
 * v19.17 owner approval intake + execution-readiness HOLD validator
 * Static checks only. No execution/runtime/provider/deploy path.
 *
 * npm run test:v19.17
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.17-owner-approval-intake-execution-readiness-hold.md";
const EXAMPLE_PATH = "docs/examples/v19.17-owner-approval-intake-execution-readiness-hold.example.md";
const PACKAGE_PATH = "package.json";

const REQUIRED_BOUNDARY_PHRASE =
  "ยังไม่ GO, ยังไม่ execution, ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง";
const REQUIRED_BASELINE = "PASS — v19.16 owner approval wording review closed";
const REQUIRED_OWNER_INTENT = "ไปสู่การทำงานจริง ... เริ่มงานต่อให้เสร็จ";
const REQUIRED_HOLD = "HOLD — OWNER APPROVAL WORDING INSUFFICIENT FOR EXECUTION";

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

console.log("=== v19.17 Owner Approval Intake + Execution-Readiness HOLD Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.17 hold packet",
  doc.includes("# v19.17 - Owner Approval Intake + Execution-Readiness HOLD Packet") &&
    example.includes("milestone: v19.17") &&
    example.includes("execution_type: static-local-docs-fixtures-validator-only-owner-approval-intake-only-no-execution")
);

ok("latest baseline v19.16 closed exists", combined.includes(REQUIRED_BASELINE));
ok("owner latest thai intent wording exists", combined.includes(REQUIRED_OWNER_INTENT));
ok("required boundary phrase exists", combined.includes(REQUIRED_BOUNDARY_PHRASE));

ok(
  "explicit before-step1 and not-started statements exist",
  hasEveryLine(combined, [
    "before Step 1 Owner-only staging trial",
    "Step 1 execution has not started.",
    "Step 1 not executed.",
    "remaining_main_steps_before_public_production: 5"
  ])
);

ok(
  "five-step sequence exists",
  hasEveryLine(doc, [
    "1) Owner-only staging trial",
    "2) Limited private pilot",
    "3) Real dealer dry-run",
    "4) Real lead pilot แบบจำกัดมาก",
    "5) Public / Production"
  ])
);

ok(
  "hard non-execution boundaries exist",
  hasEveryLine(combined, [
    "no execution",
    "no lock reset",
    "no lock deletion",
    "no lock mutation",
    "no lock re-arm",
    "no one-run",
    "no retry",
    "no second-run",
    "no endpoint call",
    "no provider/runtime/Gemini call",
    "no deploy",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
    "no real customer data",
    "no Thor real import",
    "no dealer real inventory import"
  ])
);

ok(
  "sensitive-data boundary exists",
  hasEveryLine(combined, [
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure"
  ])
);

ok(
  "insufficiency reason exists",
  hasEveryLine(combined, [
    "it is not sufficient as fresh boundary-changing owner approval.",
    "missing explicit exactly one lock re-arm",
    "missing explicit exactly one controlled owner-only staging one-run"
  ])
);

ok(
  "exact required future approval wording exists",
  hasEveryLine(combined, [
    "FRESH OWNER BOUNDARY-CHANGING APPROVAL FOR STEP 1 ONLY",
    "exactly one lock re-arm",
    "exactly one controlled owner-only one-run",
    "owner-only",
    "staging-only",
    "no retry",
    "no second-run",
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

ok("required hold decision exists", combined.includes(REQUIRED_HOLD));

ok(
  "explicit no action executed statements exist",
  hasEveryLine(doc, [
    "no action was executed.",
    "no lock was changed.",
    "no provider/runtime/Gemini call happened.",
    "no deploy happened.",
    "no public/production/real dealer/real lead action happened."
  ])
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
  "package has test:v19.17 script",
  scripts["test:v19.17"] === "tsx scripts/test-v1917-owner-approval-intake-execution-readiness-hold.mts"
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

console.log(`\nDone v19.17 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

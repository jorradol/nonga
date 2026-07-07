/**
 * v19.40 step2 limited private pilot readiness packet validator
 *
 * npm run test:v19.40
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.40-step2-limited-private-pilot-readiness-packet.md";
const EXAMPLE_PATH =
  "docs/examples/v19.40-step2-limited-private-pilot-readiness-packet.example.md";
const PACKAGE_PATH = "package.json";

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

console.log("=== v19.40 Step2 Limited Private Pilot Readiness Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.40 readiness packet",
  doc.includes("# v19.40 - Step 2 Limited Private Pilot Readiness Packet") &&
    example.includes("milestone: v19.40") &&
    example.includes("record_type: step2_limited_private_pilot_readiness_packet")
);

ok(
  "includes execution type and no-execution boundary",
  hasEveryLine(combined, [
    "STEP 2 LIMITED PRIVATE PILOT READINESS PACKET ONLY / NO EXECUTION / NO DEPLOY / NO ONE-RUN",
    "v19.40 prepares readiness packet only",
    "v19.40 does not execute Step 2",
    "v19.40 does not deploy",
    "v19.40 does not run one-run",
  ])
);

ok(
  "includes start state and v19.39 continuity",
  hasEveryLine(combined, [
    "path: D:\\nonga",
    "remote: https://github.com/jorradol/nonga.git",
    "branch: feature/chat-image-attachment-v1",
    "head_before_work: 6cdbff2",
    "latest_commit_before_work: docs(ai): add v19.39 controlled owner-only staging trial evidence",
    "working_tree_clean_before_work: true",
    "PASS — controlled owner-only staging trial completed, Step 1 completed",
    "Step 1 completed",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
  ])
);

ok(
  "includes step2 scope and blocked actions",
  hasEveryLine(combined, [
    "staging only",
    "private only",
    "allowlist only",
    "owner-controlled testers only",
    "no public signup",
    "no production",
    "no real dealer action",
    "no real lead",
    "no real customer data",
    "no PII/phone/plate/VIN",
    "no uncontrolled provider call",
    "retry/second-run/re-arm",
    "any deployment",
  ])
);

ok(
  "includes route candidates and recommended path",
  hasEveryLine(combined, [
    "POST /api/ai/chat-user-visible-orchestrate",
    "POST /api/gemini/chat",
    "POST /api/gemini/chat-stream",
    "POST /api/admin/inventory-import/commit",
    "recommended path: `POST /api/ai/chat-user-visible-orchestrate`",
  ])
);

ok(
  "includes provider involvement expectation and guardrails",
  hasEveryLine(combined, [
    "maybeApplyUserVisibleRealProvider",
    "allowlist_empty",
    "uid_not_allowlisted",
    "guest_uid_missing",
    "production default-off",
    "emergency kill-switch",
    "masked diagnostics",
  ])
);

ok(
  "includes evidence checklist and rollback criteria",
  hasEveryLine(combined, [
    "Evidence checklist required before future Step 2 execution",
    "Rollback / stop criteria",
    "stop immediately on any route mismatch",
    "stop immediately on auth/allowlist mismatch",
    "stop immediately on missing required diagnostics",
  ])
);

ok(
  "includes required future owner approval draft phrase",
  combined.includes(
    "FINAL AUTHORIZE v19.41 LIMITED PRIVATE PILOT CONTROLLED STAGING RUN / PRIVATE ALLOWLIST ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN VALUE IN CHAT OR REPO / EXACTLY ONE RUN / NO RETRY / NO SECOND-RUN / NO RE-ARM"
  )
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token literal", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["raw generic token assignment", /\btoken\s*[:=]\s*["'][^"']{8,}["']/i],
  ["raw generic secret assignment", /\bsecret\s*[:=]\s*["'][^"']{8,}["']/i],
  ["raw api key assignment", /\bapi[_-]?key\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
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
  "package has test:v19.40 script",
  scripts["test:v19.40"] ===
    "tsx scripts/test-v1940-step2-limited-private-pilot-readiness-packet.mts"
);

console.log(`\nDone v19.40 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

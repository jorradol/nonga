/**
 * v19.39 controlled owner-only staging trial evidence validator
 *
 * npm run test:v19.39
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.39-controlled-owner-only-staging-trial-evidence.md";
const EXAMPLE_PATH =
  "docs/examples/v19.39-controlled-owner-only-staging-trial-evidence.example.md";
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

console.log("=== v19.39 Controlled Owner-Only Staging Trial Evidence Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.39 evidence",
  doc.includes("# v19.39 - Controlled Owner-Only Staging Trial Evidence") &&
    example.includes("milestone: v19.39") &&
    example.includes("record_type: controlled_owner_only_staging_trial_execution_evidence")
);

ok(
  "includes exact owner approval phrase",
  combined.includes(
    "FINAL AUTHORIZE v19.39 CONTROLLED OWNER-ONLY STAGING TRIAL EXACTLY ONE-RUN / STAGING ONLY / CLOUD RUN NONGA-STAGING ONLY / USE SERVER-SIDE SECRET MANAGER BINDING / NO RETRY / NO SECOND-RUN / NO RE-ARM / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO TOKEN VALUE IN CHAT OR REPO"
  )
);

ok(
  "includes start state and expected head",
  hasEveryLine(combined, [
    "path: `D:\\nonga`",
    "remote: `https://github.com/jorradol/nonga.git`",
    "branch: `feature/chat-image-attachment-v1`",
    "HEAD before work: `34680ea`",
    "working tree before work: clean",
  ])
);

ok(
  "includes v19.38B continuity checks",
  hasEveryLine(combined, [
    "literal env token risk: no",
    "secret manager binding: confirmed",
    "Step 1 status before this run: not completed",
    "Step 2-5 status before this run: not started",
  ])
);

ok(
  "includes lock read-only state",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "`consumed=false`",
    "`rearmAttemptCount=1`",
    "lock mutation performed in v19.39: no",
  ])
);

ok(
  "includes one-run exactly once and no retry/second/rearm",
  hasEveryLine(combined, [
    "one-run command count for v19.39: 1",
    "retry performed: no",
    "second-run performed: no",
    "re-arm performed: no",
  ])
);

ok(
  "includes target and secret manager binding",
  hasEveryLine(combined, [
    "Cloud Run service: `nonga-staging`",
    "region: `asia-southeast1`",
    "NONGA_ADMIN_API_TOKEN",
    "Secret Manager-backed `secretKeyRef`",
    "staging only",
  ])
);

ok(
  "includes safe trial evidence fields",
  hasEveryLine(combined, [
    "HTTP status: `400`",
    "response content type",
    "response body length",
    "auth result: passed",
    "runtime path reached: yes",
    "provider/Gemini runtime path: not applicable",
    "fallback/legacy path: not used",
    "token/secret exposure status: `masked-only / none`",
  ])
);

ok(
  "includes safety outcomes and final pass",
  hasEveryLine(combined, [
    "no real dealer action",
    "real lead creation: none",
    "real customer data usage: none",
    "deploy performed: no",
    "PASS — controlled owner-only staging trial completed, Step 1 completed",
    "Step 1 completed",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
  ])
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
  "package has test:v19.39 script",
  scripts["test:v19.39"] ===
    "tsx scripts/test-v1939-controlled-owner-only-staging-trial-evidence.mts"
);

console.log(`\nDone v19.39 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

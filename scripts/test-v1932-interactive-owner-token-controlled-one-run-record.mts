/**
 * v19.32 interactive owner token controlled one-run record validator
 * Static checks only for docs/examples/package/script metadata.
 *
 * npm run test:v19.32
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.32-interactive-owner-token-controlled-one-run-record.md";
const EXAMPLE_PATH = "docs/examples/v19.32-interactive-owner-token-controlled-one-run-record.example.md";
const WRAPPER_PATH = "scripts/owner-local-step1-one-run-v19-interactive-token.mts";
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

console.log("=== v19.32 Interactive Owner Token Controlled One-Run Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const wrapper = read(WRAPPER_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}\n${wrapper}`;

ok(
  "doc/example identify v19.32 record",
  doc.includes("# v19.32 - Interactive Owner Token Prompt Wrapper + Controlled One-Run Record") &&
    example.includes("milestone: v19.32") &&
    example.includes("record_type: interactive_owner_token_prompt_wrapper_controlled_step1_one_run_record")
);

ok(
  "baseline and step-status confirmations exist",
  hasEveryLine(combined, [
    "v19.29 confirmed HOLD",
    "v19.30 confirmed PASS",
    "v19.31 confirmed HOLD",
    "Step 1 remains not completed",
    "Step 2-5 remain not started",
  ])
);

ok(
  "lock state and no additional rearm confirmations exist",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "consumed=false",
    "rearmAttemptCount=1",
    "rearmedAtUtc=present",
    "no additional lock re-arm",
  ])
);

ok(
  "interactive wrapper keeps token gate and masked output",
  hasEveryLine(wrapper, [
    "Paste NONGA_ADMIN_API_TOKEN for this one-run only:",
    "NONGA_ADMIN_API_TOKEN:",
    "token: ***MASKED***",
    "process.env.NONGA_ADMIN_API_TOKEN",
    "checkToken(",
    "printTokenCheck(",
  ])
);

ok(
  "interactive wrapper delegates to v19 wrapper",
  hasEveryLine(wrapper, [
    "scripts/owner-local-step1-one-run-v19.mts",
    "--execute-approved-v19-step1",
    "--allow-live-execution",
  ])
);

ok(
  "no persistent token write pattern appears",
  !/writeFileSync\([^)]*NONGA_ADMIN_API_TOKEN/i.test(wrapper) &&
    !/Set-Content[^\\n]*NONGA_ADMIN_API_TOKEN/i.test(combined)
);

ok(
  "no lock rearm/retry/second-run/public-production-real-path regression in record",
  hasEveryLine(combined, [
    "no additional lock re-arm",
    "no retry",
    "no second-run",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
  ])
);

ok(
  "future real-use platform-secret note exists",
  hasEveryLine(combined, [
    "public/production phases",
    "platform-managed runtime secrets",
    "Secret Manager",
  ])
);

ok(
  "post-record checks list includes v19.30-v19.32",
  hasEveryLine(combined, [
    "npm run test:v19.30",
    "npm run test:v19.31",
    "npm run test:v19.32",
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
  "package has owner-local-one-run:v19.32:interactive-token",
  scripts["owner-local-one-run:v19.32:interactive-token"] ===
    "tsx scripts/owner-local-step1-one-run-v19-interactive-token.mts"
);
ok(
  "package has test:v19.32 script",
  scripts["test:v19.32"] === "tsx scripts/test-v1932-interactive-owner-token-controlled-one-run-record.mts"
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["quoted secret assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v19.32 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v19.33 owner-run powershell token launcher record validator
 * Static checks only for docs/examples/package/script metadata.
 *
 * npm run test:v19.33
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.33-owner-run-powershell-token-launcher-record.md";
const EXAMPLE_PATH = "docs/examples/v19.33-owner-run-powershell-token-launcher-record.example.md";
const LAUNCHER_PATH = "scripts/run-v19-step1-owner-token.ps1";
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

console.log("=== v19.33 Owner-Run PowerShell Token Launcher Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("launcher exists", existsSync(LAUNCHER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const launcher = read(LAUNCHER_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}\n${launcher}`;

ok(
  "doc/example identify v19.33 record",
  doc.includes("# v19.33 - Owner-Run PowerShell Token Launcher Record") &&
    example.includes("milestone: v19.33") &&
    example.includes("record_type: owner_run_powershell_token_launcher_fast_fix_record")
);

ok(
  "baseline and step status confirmations exist",
  hasEveryLine(combined, [
    "v19.29: HOLD",
    "v19.30: PASS",
    "v19.31: HOLD",
    "v19.32: HOLD",
    "Step 1 remains not completed",
    "Step 2-5 remain not started",
  ])
);

ok(
  "lock state expected and no additional rearm recorded",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "consumed=false",
    "rearmAttemptCount=1",
    "rearmedAtUtc=present",
    "no additional lock re-arm",
  ])
);

ok(
  "launcher uses secure prompt and masked checker flow",
  hasEveryLine(launcher, [
    "Read-Host -AsSecureString",
    "npm run check:admin-token-session-env",
    "$env:NONGA_ADMIN_API_TOKEN",
    "token: ***MASKED***",
    "npx tsx scripts/owner-local-step1-one-run-v19.mts --execute-approved-v19-step1 --allow-live-execution --approval-file",
  ])
);

ok(
  "launcher clears env best effort",
  launcher.includes("$env:NONGA_ADMIN_API_TOKEN = $null")
);

ok(
  "no token persistence pattern in launcher",
  !/Set-Content[^\n]*NONGA_ADMIN_API_TOKEN/i.test(launcher) &&
    !/Out-File[^\n]*NONGA_ADMIN_API_TOKEN/i.test(launcher) &&
    !/Add-Content[^\n]*NONGA_ADMIN_API_TOKEN/i.test(launcher)
);

ok(
  "no rearm retry second-run public production real-path regressions in record",
  hasEveryLine(combined, [
    "no retry",
    "no second-run",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
    "no real customer data",
  ])
);

ok(
  "future production platform-secret note exists",
  hasEveryLine(combined, [
    "platform-managed server-side secret/env or Secret Manager",
    "not manual owner terminal token entry",
  ])
);

ok(
  "budget/time fast-fix note exists",
  hasEveryLine(combined, [
    "fastest owner-only staging fix",
    "do not start another token-loop diagnosis cycle unless this owner-run launcher flow fails",
  ])
);

ok(
  "post-record checks include v19.31-v19.33",
  hasEveryLine(combined, [
    "npm run test:v19.31",
    "npm run test:v19.32",
    "npm run test:v19.33",
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
  "package has test:v19.33 script",
  scripts["test:v19.33"] === "tsx scripts/test-v1933-owner-run-powershell-token-launcher-record.mts"
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

console.log(`\nDone v19.33 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

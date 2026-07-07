/**
 * v19.38B secret manager binding remediation evidence validator
 *
 * npm run test:v19.38B
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.38B-secret-manager-binding-remediation-evidence.md";
const EXAMPLE_PATH =
  "docs/examples/v19.38B-secret-manager-binding-remediation-evidence.example.md";
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

console.log(
  "=== v19.38B Secret Manager Binding Remediation Evidence Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.38B remediation evidence",
  doc.includes("# v19.38B - Secret Manager Binding Remediation Evidence") &&
    example.includes("milestone: v19.38B") &&
    example.includes("record_type: secret_manager_binding_remediation_execution_evidence")
);

ok(
  "includes exact owner approval phrase",
  combined.includes(
    "FINAL AUTHORIZE v19.38B SECRET MANAGER BINDING REMEDIATION FOR NONGA_ADMIN_API_TOKEN ONLY / STAGING ONLY / CLOUD RUN NONGA-STAGING ONLY / NO ONE-RUN / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO TOKEN VALUE IN CHAT OR REPO"
  )
);

ok(
  "includes target details and staging-only",
  hasEveryLine(combined, [
    "Cloud Run service: `nonga-staging`",
    "region: `asia-southeast1`",
    "NONGA_ADMIN_API_TOKEN",
    "staging-only confirmation: true",
  ])
);

ok(
  "includes mutation and secretKeyRef confirmation",
  hasEveryLine(combined, [
    "mutation performed: yes",
    "Secret Manager-backed `secretKeyRef` style",
    "secret manager binding: confirmed",
    "literal env token risk: no",
  ])
);

ok(
  "includes masked checks and masked token only",
  hasEveryLine(combined, [
    "NONGA_ADMIN_API_TOKEN: present",
    "length: nonzero",
    "format: valid",
    "leading/trailing whitespace: no",
    "contains newline: no",
    "quoted value risk: no",
    "starts with Bearer prefix: no",
    "token: ***MASKED***",
  ])
);

ok(
  "includes no one-run/retry/second-run/re-arm and no real dealer/lead",
  hasEveryLine(combined, [
    "one-run performed: no",
    "retry/second-run/re-arm occurred: no",
    "no real dealer",
    "no real lead",
    "no real customer data",
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
  "package has test:v19.38B script",
  scripts["test:v19.38B"] ===
    "tsx scripts/test-v1938B-secret-manager-binding-remediation-evidence.mts"
);

console.log(`\nDone v19.38B validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v19.38A secret manager binding remediation packet validator
 *
 * npm run test:v19.38A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.38A-secret-manager-binding-remediation-packet.md";
const EXAMPLE_PATH =
  "docs/examples/v19.38A-secret-manager-binding-remediation-packet.example.md";
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
  "=== v19.38A Secret Manager Binding Remediation Packet Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.38A remediation packet",
  doc.includes("# v19.38A - Secret Manager Binding Remediation Packet") &&
    example.includes("milestone: v19.38A") &&
    example.includes("record_type: secret_manager_binding_remediation_preparation_packet")
);

ok(
  "includes v19.38 hold reason",
  hasEveryLine(combined, [
    "literal env token risk: yes",
    "one-run is blocked",
  ])
);

ok(
  "includes exact owner approval phrase requirement",
  combined.includes(
    "FINAL AUTHORIZE v19.38A SECRET MANAGER BINDING REMEDIATION FOR NONGA_ADMIN_API_TOKEN ONLY / STAGING ONLY / CLOUD RUN NONGA-STAGING ONLY / NO ONE-RUN / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO TOKEN VALUE IN CHAT OR REPO"
  )
);

ok(
  "includes target and binding style",
  hasEveryLine(combined, [
    "Cloud Run service: `nonga-staging`",
    "region: `asia-southeast1`",
    "NONGA_ADMIN_API_TOKEN",
    "Secret Manager-backed / `secretKeyRef` style",
  ])
);

ok(
  "includes no runtime mutation decision when approval absent",
  hasEveryLine(combined, [
    "runtime/platform mutation in v19.38A: not performed (approval absent)",
    "NEED OWNER APPROVAL — Secret Manager binding remediation ready, no runtime mutation",
  ])
);

ok(
  "includes masked-only post-remediation verification plan",
  hasEveryLine(combined, [
    "NONGA_ADMIN_API_TOKEN: present",
    "length: nonzero",
    "format: valid",
    "leading/trailing whitespace: no",
    "contains newline: no",
    "quoted value risk: no",
    "literal env token risk: no",
    "secret manager binding: confirmed",
    "starts with Bearer prefix: no",
    "***MASKED***",
  ])
);

ok(
  "includes no one-run/no retry/no second-run/no re-arm/no public/no production/no real dealer/no real lead",
  hasEveryLine(combined, [
    "no one-run",
    "no retry",
    "no second-run",
    "no re-arm",
    "no public",
    "no production",
    "no real dealer",
    "no real lead",
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
  "package has test:v19.38A script",
  scripts["test:v19.38A"] ===
    "tsx scripts/test-v1938A-secret-manager-binding-remediation-packet.mts"
);

console.log(`\nDone v19.38A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

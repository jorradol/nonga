/**
 * v19.36 server-side staging secret setup packet validator
 *
 * npm run test:v19.36
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.36-server-side-staging-secret-setup-packet.md";
const EXAMPLE_PATH =
  "docs/examples/v19.36-server-side-staging-secret-setup-packet.example.md";
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
  "=== v19.36 Server-Side Staging Secret Setup Packet Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.36 packet",
  doc.includes("# v19.36 - Server-Side Staging Secret Setup Packet") &&
    example.includes("milestone: v19.36") &&
    example.includes("record_type: server_side_staging_secret_setup_preparation_only")
);

ok("includes NONGA_ADMIN_API_TOKEN", combined.includes("NONGA_ADMIN_API_TOKEN"));
ok("includes staging-only", /staging[- ]only/i.test(combined));
ok(
  "includes no token in chat/repo",
  hasEveryLine(combined, [
    "no token in chat/repo/docs/report",
    "NO TOKEN VALUE IN CHAT OR REPO",
  ])
);

ok(
  "includes exact fresh owner approval wording",
  combined.includes(
    "FINAL AUTHORIZE v19.36 SERVER-SIDE STAGING SECRET SETUP FOR NONGA_ADMIN_API_TOKEN ONLY / STAGING ONLY / NO DEPLOY / NO ONE-RUN / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO TOKEN VALUE IN CHAT OR REPO"
  )
);

ok(
  "includes Secret Manager/platform env note",
  hasEveryLine(combined, [
    "Secret Manager",
    "platform secret/env",
  ])
);

ok(
  "includes budget/time constraint",
  hasEveryLine(combined, [
    "owner budget/time constraint",
    "owner_has_limited_budget_and_time_stop_owner_local_token_loop_server_side_single_source_of_truth: true",
  ])
);

ok(
  "includes current 5-step status",
  hasEveryLine(combined, [
    "Step 1 still not completed",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
  ])
);

ok(
  "includes no deploy/no one-run/no retry/no second-run/no re-arm/no public/no production/no real dealer/no real lead",
  hasEveryLine(combined, [
    "no deploy",
    "no one-run",
    "no retry",
    "no second-run",
    "no additional re-arm",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
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

const tokenAssignments = [...combined.matchAll(/\bNONGA_ADMIN_API_TOKEN\s*[:=]\s*([^\s]+)/gi)];
const allowedTokenAssignmentValues = new Set([
  "<SECRET_VALUE_ENTERED_OUTSIDE_CHAT>",
  "<masked>",
  "masked",
  "\"<masked>\"",
  "'<masked>'",
  "NONGA_ADMIN_API_TOKEN:<SECRET_VERSION>",
]);
const hasDisallowedTokenAssignment = tokenAssignments.some((match) => {
  const value = (match[1] ?? "").trim().replace(/^[\"']|[\"']$/g, "");
  return !allowedTokenAssignmentValues.has(value);
});
ok(
  "no forbidden sensitive pattern raw NONGA_ADMIN_API_TOKEN assignment",
  !hasDisallowedTokenAssignment
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
  "package has test:v19.36 script",
  scripts["test:v19.36"] ===
    "tsx scripts/test-v1936-server-side-staging-secret-setup-packet.mts"
);

console.log(`\nDone v19.36 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v19.35 server-side staging secret readiness packet validator
 *
 * npm run test:v19.35
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.35-server-side-staging-secret-readiness-packet.md";
const EXAMPLE_PATH =
  "docs/examples/v19.35-server-side-staging-secret-readiness-packet.example.md";
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
  "=== v19.35 Server-Side Staging Secret Readiness Packet Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.35 packet",
  doc.includes("# v19.35 - Server-Side Staging Secret Readiness Packet") &&
    example.includes("milestone: v19.35") &&
    example.includes("record_type: server_side_staging_secret_readiness_packet_only")
);

ok(
  "required secret variable named",
  combined.includes("NONGA_ADMIN_API_TOKEN")
);

ok(
  "server-side staging env/secret recommendation included",
  hasEveryLine(combined, [
    "server-side staging env/secret",
    "source_of_truth: server_side_staging_env_secret_only",
  ])
);

ok(
  "Secret Manager and platform env note included",
  hasEveryLine(combined, [
    "Secret Manager",
    "platform secret/env",
  ])
);

ok(
  "owner budget/time constraint included",
  hasEveryLine(combined, [
    "owner budget/time constraint",
    "owner_has_limited_budget_and_time_stop_owner_local_token_loop_use_server_side_runtime_path: true",
  ])
);

ok(
  "current 5-step status included",
  hasEveryLine(combined, [
    "Step 1 still not completed",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
  ])
);

ok(
  "fresh owner approval requirement included",
  hasEveryLine(combined, [
    "any real secret setting/execution requires fresh owner approval",
    "any_real_secret_setting_requires_fresh_owner_approval_outside_repo_artifacts: true",
    "next execution packet requires fresh owner approval",
  ])
);

ok(
  "boundary no one-run/retry/second-run/re-arm/deploy/public/production/real dealer/real lead",
  hasEveryLine(combined, [
    "no one-run",
    "no retry",
    "no second-run",
    "no additional re-arm",
    "no deploy",
    "not public",
    "not production",
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
  [
    "raw NONGA_ADMIN_API_TOKEN value assignment",
    /\bNONGA_ADMIN_API_TOKEN\s*[:=]\s*(?!<masked>|masked|"\<masked\>"|'\<masked\>')[^\s]+/i,
  ],
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
  "package has test:v19.35 script",
  scripts["test:v19.35"] ===
    "tsx scripts/test-v1935-server-side-staging-secret-readiness-packet.mts"
);

console.log(`\nDone v19.35 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

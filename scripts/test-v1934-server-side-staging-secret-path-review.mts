/**
 * v19.34 server-side staging secret path review validator
 *
 * npm run test:v19.34
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.34-server-side-staging-secret-path-review.md";
const EXAMPLE_PATH = "docs/examples/v19.34-server-side-staging-secret-path-review.example.md";
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

console.log("=== v19.34 Server-Side Staging Secret Path Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.34 review",
  doc.includes("# v19.34 - Server-Side Staging Secret Path Review") &&
    example.includes("milestone: v19.34") &&
    example.includes("record_type: server_side_staging_secret_path_review_only")
);

ok(
  "no execution boundary statements exist",
  hasEveryLine(combined, [
    "no one-run",
    "no retry",
    "no second-run",
    "no additional re-arm",
    "no deploy",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
  ])
);

ok(
  "server-side secret recommendation exists",
  hasEveryLine(combined, [
    "move token ownership to server-side staging env/secret only",
    "owner-local manual token flow should be deprecated",
    "production/public must use platform-managed secret/env or Secret Manager",
  ])
);

ok(
  "budget/time constraint note exists",
  hasEveryLine(combined, [
    "fastest cost-saving path",
    "no additional token-loop diagnosis should be started unless this server-side staging secret path fails",
  ])
);

ok(
  "five-step status still bounded",
  hasEveryLine(combined, [
    "Step 1 still not completed",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
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
  "package has test:v19.34 script",
  scripts["test:v19.34"] === "tsx scripts/test-v1934-server-side-staging-secret-path-review.mts"
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

console.log(`\nDone v19.34 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

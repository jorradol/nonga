/**
 * v12.5 Client Command URL Construction Review validator
 * Static docs validation only. No endpoint call. No Gemini execution.
 *
 * npm run test:v125:client-command-url-construction-review
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.5-client-command-url-construction-review.md";
const SELF_PATH = "scripts/test-v125-client-command-url-construction-review.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v125:client-command-url-construction-review";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

console.log("=== v12.5 Client Command URL Construction Review Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok(
  "doc has title",
  /v12\.5 Client Command URL Construction Review\s*[—-]\s*No Retry/i.test(doc)
);
ok(
  "doc has review only status",
  /Status:\s*REVIEW ONLY\s*[—-]\s*no retry,\s*no Gemini execution/i.test(doc)
);

const REQUIRED_PHRASES: Array<[string, RegExp]> = [
  ["curl exit code 3", /curl exit code:\s*`?3`?/i],
  [
    "url rejected port error",
    /URL rejected:\s*Port number was not a decimal number between 0 and 65535/i,
  ],
  ["request dispatch unknown", /request dispatch could not be confirmed/i],
  ["provider call unknown", /confirmed real provider call:\s*`?unknown`?/i],
  ["provider output no", /provider output captured:\s*`?no`?/i],
  ["authorization consumed", /\bauthorization consumed\b/i],
  ["no retry", /\bno retry\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  [
    "recommendation line",
    /(READY FOR CLIENT COMMAND TEMPLATE PATCH\s*[—-]\s*no Gemini execution|HOLD\s*[—-]\s*fix client command construction before any new authorized one-run|HOLD\s*[—-]\s*command failure root cause unclear)/i,
  ],
];

for (const [name, re] of REQUIRED_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v12.5 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v12.5 validator",
  pkg.includes("scripts/test-v125-client-command-url-construction-review.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok(
    "validator no smoke endpoint call",
    !/\/api\/admin\/sales-brain-shadow-smoke/.test(selfExecutionBody)
  );
  ok("validator no /api/gemini call", !/\/api\/gemini\//.test(selfExecutionBody));
}

console.log(`\nDone v12.5 client command URL construction review validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

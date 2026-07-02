/**
 * v11.19A Final Pre-Execution Readiness + Health Recovery Record static validator
 * Docs-only / no Gemini execution / no endpoint call.
 *
 * npm run test:v1119a:final-pre-execution-readiness-health-recovery-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v11.19A-final-pre-execution-readiness-health-recovery-record.md";
const SELF_PATH =
  "scripts/test-v1119a-final-pre-execution-readiness-health-recovery-record.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY =
  "test:v1119a:final-pre-execution-readiness-health-recovery-record";

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

console.log("=== v11.19A Final Pre-Execution Readiness + Health Recovery Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2200, `${doc.length} chars`);
ok(
  "doc has title",
  /v11\.19A Final Pre-Execution Readiness \+ Health Recovery Record/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["baseline commit", /Baseline commit:\s*dc53d5187dbdeac76b34e1e651200565f9fe7d8d/i],
  ["v11.19 aborted summary", /ABORTED\s*[—-]\s*missing fresh FINAL EXECUTION AUTHORIZE/i],
  ["authorization not consumed", /authorization not consumed/i],
  ["run count remains 0/1", /Run count remains 0\/1/i],
  ["original probe exit code", /exit_code=4294967295/i],
  ["follow-up health status", /health_status=200/i],
  ["recovered pass", /RECOVERED\s*\/\s*PASS/i],
  ["no smoke run occurred", /No smoke run occurred/i],
  ["new authorization required", /A new owner authorization is still required/i],
  ["no retry", /\bno retry\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no api gemini wildcard", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no pii customer data", /\bno PII\/customer data\b/i],
  ["no secret exposure", /no secret\/token\/API key exposure/i],
  ["no runtime behavior change", /\bno runtime behavior change\b/i],
  [
    "recommendation line",
    /READY FOR FRESH FINAL EXECUTION AUTHORIZE\s*[—-]\s*owner may authorize one-run admin-only SS-01 smoke when ready\./i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
  [
    "generic secret assignment",
    /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9._\-\/+=]{16,}["']/i,
  ],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no secret-looking pattern: ${name}`, !re.test(doc));
}

ok("package includes v11.19A script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v11.19A validator script",
  pkg.includes("scripts/test-v1119a-final-pre-execution-readiness-health-recovery-record.mts")
);

{
  const head = self.split('ok("package includes v11.19A script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator has no smoke endpoint literal", !/\/api\/admin\/sales-brain-shadow-smoke/.test(head));
  ok("validator has no /api/gemini route call", !/\/api\/gemini\//.test(head));
}

console.log(`\nDone v11.19A readiness/health record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

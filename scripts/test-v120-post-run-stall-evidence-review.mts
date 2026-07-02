/**
 * v12.0 Post-Run Stall Evidence Review static validator
 * Docs-only / no retry / no Gemini execution.
 *
 * npm run test:v120:post-run-stall-evidence-review
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.0-post-run-stall-evidence-review.md";
const SELF_PATH = "scripts/test-v120-post-run-stall-evidence-review.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v120:post-run-stall-evidence-review";

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

console.log("=== v12.0 Post-Run Stall Evidence Review Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2800, `${doc.length} chars`);
ok("doc has title", /v12\.0 Post-Run Stall Evidence Review — No Retry/i.test(doc));
ok(
  "doc has required status line",
  /NEED REVIEW — one-run SS-01 admin smoke stalled; authorization consumed/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["exit code", /exit_code=4294967295/i],
  ["post run health", /post_run_health_status=200/i],
  ["authorization consumed", /authorization consumed/i],
  ["fresh authorization required", /retry ต้องใช้ fresh FINAL EXECUTION AUTHORIZE/i],
  ["real gemini not proven", /real Gemini success not proven/i],
  ["provider completion not proven", /provider response completion not proven/i],
  ["provider output not proven", /provider output capture not proven/i],
  ["production readiness not proven", /production readiness not proven/i],
  ["buyer-facing readiness not proven", /buyer-facing AI readiness not proven/i],
  ["no retry", /\bno retry\b/i],
  ["no gemini execution during review", /no Gemini execution during v12\.0 review/i],
  ["no smoke endpoint call during review", /no smoke endpoint call during v12\.0 review/i],
  ["no api gemini wildcard", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no pii customer data", /\bno PII\/customer data\b/i],
  ["no secret exposure", /no secret\/token\/API key exposure/i],
  ["no runtime behavior change", /\bno runtime behavior change\b/i],
  ["recommendation starts with hold", /^HOLD\s*[—-]/im],
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

ok("package includes v12.0 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v12.0 validator script",
  pkg.includes("scripts/test-v120-post-run-stall-evidence-review.mts")
);

{
  const head = self.split('ok("package includes v12.0 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator has no smoke endpoint literal", !/\/api\/admin\/sales-brain-shadow-smoke/.test(head));
  ok("validator has no /api/gemini route call", !/\/api\/gemini\//.test(head));
}

console.log(`\nDone v12.0 post-run stall evidence validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

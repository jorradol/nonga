/**
 * v12.9 Admin Auth / Runtime Env Gate Review validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v129:admin-auth-runtime-env-gate-review-no-retry
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.9-admin-auth-runtime-env-gate-review-no-retry.md";
const SELF_PATH = "scripts/test-v129-admin-auth-runtime-env-gate-review-no-retry.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v129:admin-auth-runtime-env-gate-review-no-retry";

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

console.log("=== v12.9 Admin Auth / Runtime Env Gate Review Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.9 Admin Auth \/ Runtime Env Gate Review\s*[—-]\s*No Retry/i.test(doc)
);
ok("doc has REVIEW ONLY", /\bREVIEW ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["no retry", /\bno retry\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["v12.8", /\bv12\.8\b/i],
  ["env gate fail", /env gate:\s*FAIL/i],
  ["admin auth gate fail", /admin auth non-Gemini gate:\s*FAIL/i],
  ["401", /`?401`?/],
  ["authorization consumed no", /authorization consumed:\s*no/i],
  ["run count 0/1", /run count:\s*`?0\/1`?/i],
  ["endpoint called no", /endpoint called:\s*no/i],
  ["Authorization", /\bAuthorization\b/],
  ["Bearer", /\bBearer\b/],
  ["token", /\btoken\b/i],
  ["env", /\benv\b/i],
  ["header", /\bheader\b/i],
  [
    "recommendation line",
    /(READY FOR ADMIN AUTH \/ ENV PATCH\s*[—-]\s*no Gemini execution|READY FOR FRESH AUTHORIZED ONE-RUN RETRY\s*[—-]\s*only if auth\/env gate is proven fixed without code change|HOLD\s*[—-]\s*admin auth \/ env gate mismatch unresolved)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v129 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v129 validator",
  pkg.includes("scripts/test-v129-admin-auth-runtime-env-gate-review-no-retry.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok(
    "validator no smoke endpoint call",
    !/\/api\/admin\/sales-brain-shadow-smoke/.test(selfExecutionBody)
  );
  ok("validator no /api/gemini call", !/\/api\/gemini\//.test(selfExecutionBody));
}

console.log(`\nDone v12.9 review-only validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

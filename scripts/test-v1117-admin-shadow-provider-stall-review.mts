/**
 * v11.17 Admin Shadow Provider Stall Review static validator
 * No endpoint call, no Gemini execution.
 *
 * npm run test:v1117:admin-shadow-provider-stall-review
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v11.17-admin-shadow-provider-stall-review.md";
const SELF_PATH = "scripts/test-v1117-admin-shadow-provider-stall-review.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v1117:admin-shadow-provider-stall-review";

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

console.log("=== v11.17 Admin Shadow Provider Stall Review Static Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok("doc has v11.17 label", /v11\.17/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["review only header", /REVIEW ONLY\s*[—-]\s*no retry,\s*no Gemini execution/i],
  ["aborted authorization consumed", /ABORTED\s*[—-]\s*authorization consumed/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no api gemini wildcard", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no pii customer data", /\bno PII\/customer data\b/i],
  ["no secret token api key exposure", /no secret\/token\/API key exposure/i],
  ["no runtime behavior change", /\bno runtime behavior change\b/i],
  ["provider timeout boundary", /Provider timeout boundary/i],
  ["abortcontroller", /AbortController/i],
  ["fallback path", /Fallback path/i],
  ["route handler", /Route handler/i],
  ["manual smoke caller", /Manual smoke caller/i],
  ["no accidental retry loop", /no accidental retry loop/i],
  ["things explicitly not proven", /Things explicitly not proven/i],
  [
    "recommendation line",
    /(READY FOR NO-GEMINI INSTRUMENTATION PATCH|READY FOR OWNER DECISION ON FRESH ONE-RUN RETRY|HOLD\s*[—-]\s*review found unresolved stall risk)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai style key", /\bsk-[A-Za-z0-9]{20,}\b/],
  [
    "generic long token assignment",
    /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9._\-\/+=]{16,}["']/i,
  ],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["github token", /\bghp_[A-Za-z0-9]{20,}\b/],
];

for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no secret-looking pattern: ${name}`, !re.test(doc));
}

const head = self.split("const SECRET_PATTERNS")[0] ?? self;
ok("validator uses readFileSync", /readFileSync/.test(head));
ok("validator does not use child_process", !/node:child_process/.test(head));
ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
ok("validator does not read process.env", !/process\.env\./.test(head));
ok("validator has no provider import", !/from\s+['\"]@google\/genai['\"]/.test(head));
ok("validator has no provider client usage", !/\bGoogleGenAI\b/.test(head));
ok("validator has no endpoint literal", !/\/api\/admin\/sales-brain-shadow-smoke/.test(head));

ok("package includes v11.17 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v11.17 validator script",
  pkg.includes("scripts/test-v1117-admin-shadow-provider-stall-review.mts")
);

console.log(`\nDone v11.17 provider stall review validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

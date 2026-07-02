/**
 * v11.16 Admin Shadow SS-01 Provider Stall Abort Record
 * Static documentation validation only (no runtime/provider call).
 *
 * npm run test:v1116:admin-shadow-ss01-provider-stall-abort-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v11.16-admin-shadow-ss01-provider-stall-abort-record.md";
const SELF_PATH = "scripts/test-v1116-admin-shadow-ss01-provider-stall-abort-record.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v1116:admin-shadow-ss01-provider-stall-abort-record";

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

console.log("=== v11.16 Provider Stall Abort Record Static Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1200, `${doc.length} chars`);
ok("doc has v11.16 label", /v11\.16/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["status aborted authorization consumed", /ABORTED\s*[—-]\s*authorization consumed/i],
  ["source exit code", /exit_code=4294967295/i],
  ["one-shot request stalled", /one-shot request stalled/i],
  ["no retry without fresh final authorization", /No retry is allowed without a fresh FINAL EXECUTION AUTHORIZE/i],
  ["provider response unknown", /confirmed real provider response:\s*unknown/i],
  ["provider completion unknown", /confirmed real provider completion:\s*unknown/i],
  ["provider output captured no", /confirmed provider output captured:\s*no/i],
  ["no retry policy", /\bno retry\b/i],
  ["no deploy policy", /\bno deploy\b/i],
  ["no production policy", /\bno production\b/i],
  ["no public route activation policy", /\bno public route activation\b/i],
  ["no buyer-facing ai policy", /\bno buyer-facing AI\b/i],
  ["no real lead policy", /\bno real lead\b/i],
  ["no api gemini wildcard policy", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no pii policy", /\bno PII\b/i],
  ["no secret token api key exposed policy", /no secret\/token\/API key exposed/i],
  ["no runtime behavior change policy", /no runtime behavior change/i],
  ["no endpoint call impact", /\bno endpoint call\b/i],
  ["recommendation hold", /\bHOLD\b/i],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai style key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["generic long token assignment", /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9._\-\/+=]{16,}["']/i],
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

ok("package includes v11.16 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v11.16 validator script",
  pkg.includes("scripts/test-v1116-admin-shadow-ss01-provider-stall-abort-record.mts")
);

console.log(`\nDone v11.16 provider stall abort record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

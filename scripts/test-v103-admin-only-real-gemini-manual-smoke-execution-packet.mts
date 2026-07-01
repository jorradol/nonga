/**
 * v10.3 - Admin-Only Real Gemini Manual Smoke Execution Packet
 * docs-only / static validation / script-only
 *
 * npm run test:v103:manual-smoke-execution-packet
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v10.3-admin-only-real-gemini-manual-smoke-execution-packet.md";
const SELF_PATH = "scripts/test-v103-admin-only-real-gemini-manual-smoke-execution-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v103:manual-smoke-execution-packet";

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

console.log("=== v10.3 Admin-Only Manual Smoke Execution Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok("doc contains v10.3 label", /v10\.3/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["admin-only", /admin-only/i],
  ["manual smoke", /manual smoke/i],
  ["no production", /no production/i],
  ["no deploy", /no deploy/i],
  ["no public route", /no public route/i],
  ["no buyer-facing", /no buyer-facing/i],
  ["no real lead", /no real lead/i],
  ["no secret in repo", /no secret in repo/i],
  ["GEMINI_API_KEY", /GEMINI_API_KEY/],
  ["synthetic", /synthetic/i],
  ["deterministic fallback", /deterministic fallback/i],
  ["kill switch", /kill switch/i],
  ["quota", /quota/i],
  ["cost", /cost/i],
  ["redaction", /redaction/i],
  ["abort", /abort/i],
  ["owner approval", /owner approval/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["generic long key assignment", /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9._\-\/+=]{16,}["']/i],
  ["hex token", /\b[a-f0-9]{32,}\b/i],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no secret-looking pattern: ${name}`, !re.test(doc));
}

ok(
  "template warning exists for future command boundary",
  /DO NOT RUN unless owner explicitly approves real admin-only Gemini smoke\./i.test(doc)
);
ok(
  "template command placeholder exists",
  /npm run <future-admin-only-gemini-smoke-command>/i.test(doc)
);

const hasUnwarnedRealGeminiCommand =
  /(?:^|\n)\s*npm run\s+(?!<future-admin-only-gemini-smoke-command>)[^\n]*gemini[^\n]*/i.test(doc) ||
  /(?:^|\n)\s*(?:node|tsx|pnpm|yarn)\s+[^\n]*gemini[^\n]*/i.test(doc);
ok("doc has no runnable real Gemini command without warning", !hasUnwarnedRealGeminiCommand);

ok("package includes v10.3 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v10.3 validator script",
  pkg.includes("scripts/test-v103-admin-only-real-gemini-manual-smoke-execution-packet.mts")
);

{
  const head = self.split('ok("package includes v10.3 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not read process.env", !/process\.env\./.test(head));
}

console.log(`\nDone v10.3 execution-packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

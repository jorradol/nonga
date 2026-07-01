/**
 * v10.8 - Admin-Only Real Gemini Manual Smoke Final Authorization Record
 * docs-only / static validation / script-only
 *
 * npm run test:v108:manual-smoke-final-authorization-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v10.8-admin-only-real-gemini-manual-smoke-final-authorization-record.md";
const SELF_PATH = "scripts/test-v108-admin-only-real-gemini-manual-smoke-final-authorization-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v108:manual-smoke-final-authorization-record";

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

console.log("=== v10.8 Admin-Only Real Gemini Manual Smoke Final Authorization Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 5000, `${doc.length} chars`);
ok("doc contains v10.8 label", /v10\.8/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["final authorization record", /final authorization record/i],
  ["admin-only", /admin-only/i],
  ["real Gemini", /real Gemini/i],
  ["manual smoke", /manual smoke/i],
  ["FINAL AUTHORIZE", /FINAL AUTHORIZE/i],
  ["FINAL HOLD", /FINAL HOLD/i],
  ["FINAL REJECT", /FINAL REJECT/i],
  ["separate execution step", /separate execution step/i],
  ["one admin-only real Gemini manual smoke run", /one admin-only real Gemini manual smoke run/i],
  ["synthetic data only", /synthetic data only/i],
  ["no production", /no production/i],
  ["no deploy", /no deploy/i],
  ["no public route", /no public route/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no real customer data", /no real customer data/i],
  ["PII", /\bPII\b/],
  ["no secret", /no secret/i],
  ["API key", /API key/i],
  ["abort", /abort/i],
  ["fail-closed", /fail-closed/i],
  ["deterministic/mock/fallback remains source of truth", /deterministic\/mock\/fallback remains source of truth/i],
  ["DO NOT RUN", /DO NOT RUN/i],
  ["Placeholder only", /Placeholder only/i],
  ["GEMINI_API_KEY", /GEMINI_API_KEY/],
  ["v10.5", /v10\.5/i],
  ["v10.6", /v10\.6/i],
  ["v10.7", /v10\.7/i],
  ["v10.9 Admin-Only Real Gemini Manual Smoke Execution Gate", /v10\.9 Admin-Only Real Gemini Manual Smoke Execution Gate/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["generic long token assignment", /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9._\-\/+=]{16,}["']/i],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["github token", /\bghp_[A-Za-z0-9]{20,}\b/],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no secret-looking pattern: ${name}`, !re.test(doc));
}

const lines = doc.split(/\r?\n/);
const DENIAL_MARKERS = ["no ", "not ", "do not", "does not", "ห้าม", "ไม่อนุญาต", "ไม่"];
function hasPositivePermissionClaim(scopeTerm: RegExp): string | null {
  for (const line of lines) {
    if (!scopeTerm.test(line)) continue;
    if (!/(allow|allowed|authorize|authorized|approved|อนุมัติ(?:ให้)?)/i.test(line)) continue;
    const lower = line.toLowerCase();
    const hasDenial = DENIAL_MARKERS.some((marker) => lower.includes(marker));
    if (!hasDenial) return line.trim();
  }
  return null;
}

const FORBIDDEN_ALLOW_SCOPES: Array<[string, RegExp]> = [
  ["deploy", /\bdeploy(?:ment)?\b/i],
  ["production", /\bproduction\b/i],
  ["buyer-facing AI", /\bbuyer-facing AI\b/i],
  ["public route", /\bpublic route\b/i],
  ["real lead", /\breal lead\b/i],
];
for (const [name, scopeRe] of FORBIDDEN_ALLOW_SCOPES) {
  const violatingLine = hasPositivePermissionClaim(scopeRe);
  ok(`doc has no forbidden permission claim: ${name}`, !violatingLine, violatingLine ?? "");
}

const hasRunnableGeminiCommand =
  /(?:^|\n)\s*(?:npm|pnpm|yarn)\s+run\s+(?!<future-separate-owner-authorized-admin-only-real-gemini-manual-smoke-command>)[^\n]*gemini[^\n]*/i.test(doc) ||
  /(?:^|\n)\s*(?:node|tsx|ts-node|python|bash|sh)\s+[^\n]*gemini[^\n]*/i.test(doc) ||
  /(?:^|\n)\s*curl\s+[^\n]*gemini[^\n]*/i.test(doc);
ok("doc has no runnable Gemini command", !hasRunnableGeminiCommand);
ok(
  "doc has required placeholder command only",
  /npm run <future-separate-owner-authorized-admin-only-real-gemini-manual-smoke-command>/i.test(doc)
);

ok("package includes v10.8 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v10.8 validator script",
  pkg.includes("scripts/test-v108-admin-only-real-gemini-manual-smoke-final-authorization-record.mts")
);

{
  const head = self.split('ok("package includes v10.8 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not read process.env", !/process\.env\./.test(head));
  ok("validator has no provider import", !/from\s+["']@google\/genai["']/.test(head));
  ok("validator has no provider client usage", !/\bGoogleGenAI\b/.test(head));
  ok("validator has no provider call usage", !/\.generateContent\s*\(/.test(head));
}

console.log(`\nDone v10.8 manual-smoke-final-authorization validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

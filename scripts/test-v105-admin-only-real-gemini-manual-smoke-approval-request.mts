/**
 * v10.5 - Admin-Only Real Gemini Manual Smoke Approval Request
 * docs-only / static validation / script-only
 *
 * npm run test:v105:manual-smoke-approval-request
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v10.5-admin-only-real-gemini-manual-smoke-approval-request.md";
const SELF_PATH = "scripts/test-v105-admin-only-real-gemini-manual-smoke-approval-request.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v105:manual-smoke-approval-request";

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

console.log("=== v10.5 Admin-Only Real Gemini Manual Smoke Approval Request Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok("doc contains v10.5 label", /v10\.5/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["approval request", /approval request/i],
  ["admin-only", /admin-only/i],
  ["real Gemini", /real Gemini/i],
  ["manual smoke", /manual smoke/i],
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
  ["kill switch", /kill switch/i],
  ["deterministic fallback", /deterministic fallback/i],
  ["redaction", /redaction/i],
  ["quota", /quota/i],
  ["cost", /cost/i],
  ["HOLD", /\bHOLD\b/],
  ["REJECT", /\bREJECT\b/],
  ["Option A", /Option A/i],
  ["Option B", /Option B/i],
  ["Option C", /Option C/i],
  ["v10.6 Admin-Only Real Gemini Manual Smoke Pre-Run Gate", /v10\.6 Admin-Only Real Gemini Manual Smoke Pre-Run Gate/i],
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
    if (!/(allow|allowed|authorize|approved|อนุมัติ(?:ให้)?)/i.test(line)) continue;
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
  /(?:^|\n)\s*(?:npm|pnpm|yarn)\s+run\s+[^\n]*gemini[^\n]*/i.test(doc) ||
  /(?:^|\n)\s*(?:node|tsx|ts-node|python|bash|sh)\s+[^\n]*gemini[^\n]*/i.test(doc) ||
  /(?:^|\n)\s*curl\s+[^\n]*gemini[^\n]*/i.test(doc);
ok("doc has no runnable Gemini command", !hasRunnableGeminiCommand);

ok("package includes v10.5 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v10.5 validator script",
  pkg.includes("scripts/test-v105-admin-only-real-gemini-manual-smoke-approval-request.mts")
);

{
  const head = self.split('ok("package includes v10.5 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not read process.env", !/process\.env\./.test(head));
}

console.log(`\nDone v10.5 manual-smoke-approval-request validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v10.4 - Admin-Only Real Gemini Gated Execution Planning Packet
 * docs-only / static validation / script-only
 *
 * npm run test:v104:gated-execution-planning
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v10.4-admin-only-real-gemini-gated-execution-planning-packet.md";
const SELF_PATH = "scripts/test-v104-admin-only-real-gemini-gated-execution-planning-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v104:gated-execution-planning";

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

console.log("=== v10.4 Admin-Only Real Gemini Gated Execution Planning Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3000, `${doc.length} chars`);
ok("doc contains v10.4 label", /v10\.4/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["gated execution", /gated execution/i],
  ["admin-only", /admin-only/i],
  ["real Gemini", /real Gemini/i],
  ["manual smoke", /manual smoke/i],
  ["no production", /no production/i],
  ["no deploy", /no deploy/i],
  ["no public route", /no public route/i],
  ["no buyer-facing", /no buyer-facing/i],
  ["no real lead", /no real lead/i],
  ["no secret in repo", /no secret in repo/i],
  ["synthetic", /synthetic/i],
  ["deterministic fallback", /deterministic fallback/i],
  ["kill switch", /kill switch/i],
  ["quota", /quota/i],
  ["cost", /cost/i],
  ["redaction", /redaction/i],
  ["abort", /abort/i],
  ["owner approval", /owner approval/i],
  ["GEMINI_API_KEY", /GEMINI_API_KEY/],
  ["DO NOT RUN", /DO NOT RUN/i],
  ["Placeholder only", /Placeholder only/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["generic long key assignment", /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9._\-\/+=]{16,}["']/i],
  ["github token", /\bghp_[A-Za-z0-9]{20,}\b/],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no secret-looking pattern: ${name}`, !re.test(doc));
}

const hasUnsafeRealGeminiCommand =
  /(?:^|\n)\s*npm run\s+(?!<future-admin-only-real-gemini-manual-smoke-command>)[^\n]*gemini[^\n]*/i.test(doc) ||
  /(?:^|\n)\s*(?:node|tsx|pnpm|yarn)\s+[^\n]*gemini[^\n]*/i.test(doc);
ok("doc has no runnable real Gemini command without warning", !hasUnsafeRealGeminiCommand);

const DENIAL_MARKERS = ["does not allow", "not allow", "no ", "ไม่ครอบคลุม", "ห้าม"];
const lines = doc.split(/\r?\n/);
function hasPositivePermissionClaim(scopeTerm: RegExp): string | null {
  for (const line of lines) {
    if (!scopeTerm.test(line)) continue;
    if (!/(allow|allowed|อนุมัติ(?:ให้)?)/i.test(line)) continue;
    const lower = line.toLowerCase();
    const hasDenial = DENIAL_MARKERS.some((marker) => lower.includes(marker));
    if (!hasDenial) return line.trim();
  }
  return null;
}

const FORBIDDEN_ALLOW_SCOPES: Array<[string, RegExp]> = [
  ["allow production", /\bproduction\b/i],
  ["allow deploy", /\bdeploy\b/i],
  ["allow buyer-facing", /\bbuyer-facing\b/i],
  ["allow real lead", /\breal lead\b/i],
];
for (const [name, scopeRe] of FORBIDDEN_ALLOW_SCOPES) {
  const violatingLine = hasPositivePermissionClaim(scopeRe);
  ok(`doc has no forbidden permission claim: ${name}`, !violatingLine, violatingLine ?? "");
}

ok(
  "template future command placeholder exists",
  /npm run <future-admin-only-real-gemini-manual-smoke-command>/i.test(doc)
);

ok("package includes v10.4 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v10.4 validator script",
  pkg.includes("scripts/test-v104-admin-only-real-gemini-gated-execution-planning-packet.mts")
);

{
  const head = self.split('ok("package includes v10.4 script key"')[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator does not use child_process", !/node:child_process/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not read process.env", !/process\.env\./.test(head));
}

console.log(`\nDone v10.4 gated-execution-planning validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v9.5 - Owner Review / Admin-Only Runtime Proof Readiness Gate
 * docs-only / static validation / script-only
 *
 * npm run test:v95:owner-readiness-gate
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v9.5-owner-review-admin-only-runtime-proof-readiness-gate.md";
const SELF_PATH = "scripts/test-v95-owner-review-admin-only-runtime-proof-readiness-gate.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v95:owner-readiness-gate";

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

function shellOut(command: string): string {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

console.log("=== v9.5 Owner Review Readiness Gate Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2600, `${doc.length} chars`);
ok("contains v9.5 label", /v9\.5/i.test(doc));
ok("contains owner review phrase", /Owner Review/i.test(doc));
ok("contains readiness gate phrase", /Readiness Gate/i.test(doc));
ok("contains admin-only phrase", /admin-only/i.test(doc));
ok("contains source-of-truth statement", /deterministic flow remains source of truth/i.test(doc));

const REQUIRED_STATUS_SUMMARY: Array<[string, RegExp]> = [
  ["v9.2 skeleton ready default off", /v9\.2 skeleton .*default OFF/i],
  ["v9.3 placeholder + kill switch", /v9\.3 provider wiring .*placeholder-only.*kill switch/i],
  ["v9.4 smoke harness pass", /v9\.4 smoke harness PASS/i],
  ["no real gemini call", /ยังไม่มี real Gemini call|no real Gemini call/i],
  ["no secret in repo", /ยังไม่มี secret\/API key จริงใน repo|no real secret\/API key in repo/i],
  ["no deploy", /ยังไม่มี deploy|\bno deploy\b/i],
  ["no buyer-facing ai", /ยังไม่มี buyer-facing AI|no buyer-facing AI/i],
  ["no real lead sending", /ยังไม่มี real lead sending|no real lead sending/i],
];
for (const [name, re] of REQUIRED_STATUS_SUMMARY) {
  ok(`status summary includes: ${name}`, re.test(doc));
}

const REQUIRED_CHECKLIST_ITEMS: Array<[string, RegExp]> = [
  ["admin-only boundary remains", /admin-only boundary/i],
  ["kill switch wins all flags", /kill switch .*ชนะทุก flag|kill switch .*wins all flags/i],
  ["fallback deterministic ready", /fallback deterministic/i],
  ["log redaction prevents pii prompt secret", /log redaction.*PII.*prompt.*secret/i],
  ["quota cost cap", /quota\/cost cap/i],
  ["env secret environment only", /env secret .*environment/i],
  ["no buyer public exposure", /no buyer\/public exposure/i],
  ["rollback plan clear", /rollback plan/i],
  ["owner approval required", /owner approval/i],
];
for (const [name, re] of REQUIRED_CHECKLIST_ITEMS) {
  ok(`checklist includes: ${name}`, re.test(doc));
}

const REQUIRED_DECISIONS: Array<[string, RegExp]> = [
  ["not go production", /NOT GO.*production/i],
  ["not go buyer-facing ai", /NOT GO.*buyer-facing AI/i],
  ["not go real lead sending", /NOT GO.*real lead sending/i],
  ["not go public route", /NOT GO.*public route/i],
  ["conditional ready v9.6 prep", /CONDITIONAL READY.*v9\.6.*admin-only Gemini proof/i],
];
for (const [name, re] of REQUIRED_DECISIONS) {
  ok(`decision gate includes: ${name}`, re.test(doc));
}

const REQUIRED_SAFETY_PHRASES: Array<[string, RegExp]> = [
  ["no real gemini call", /no real Gemini call/i],
  ["no network provider call", /no network\/provider call/i],
  ["no runtime activation", /no runtime activation/i],
  ["no gemini activation", /no Gemini activation/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /no public route/i],
  ["no buyer-facing ai", /no buyer-facing AI/i],
  ["no user-visible ai", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no secret api key in repo", /no real secret\/API key in repo/i],
  ["no src changes phrase", /no src changes/i],
  ["kill switch phrase", /kill switch/i],
  ["fallback phrase", /fallback deterministic/i],
  ["redaction phrase", /redaction/i],
  ["quota phrase", /quota/i],
];
for (const [name, re] of REQUIRED_SAFETY_PHRASES) {
  ok(`contains required safety phrase: ${name}`, re.test(doc));
}

const FORBIDDEN_GO_CLAIMS: Array<[string, RegExp]> = [
  [
    "production go approved",
    /\b(?:production\s*GO\s*(?:approved|granted|signed|อนุมัติแล้ว)|production\s*(?:is\s*)?(?:ready|live|พร้อมแล้ว|พร้อมใช้งานแล้ว))\b/i,
  ],
  [
    "buyer-facing ai go approved",
    /\b(?:buyer-facing AI\s*GO\s*(?:approved|granted|signed|อนุมัติแล้ว)|buyer-facing AI\s*(?:is\s*)?(?:enabled|live|พร้อมแล้ว))\b/i,
  ],
  [
    "real lead go approved",
    /\b(?:real lead(?:\s+sending)?\s*GO\s*(?:approved|granted|signed|อนุมัติแล้ว)|real lead sending\s*(?:is\s*)?(?:enabled|live|พร้อมแล้ว))\b/i,
  ],
  [
    "public route go approved",
    /\b(?:public route\s*GO\s*(?:approved|granted|signed|อนุมัติแล้ว)|public route\s*(?:is\s*)?(?:enabled|live|พร้อมแล้ว))\b/i,
  ],
];
for (const [name, re] of FORBIDDEN_GO_CLAIMS) {
  ok(`no forbidden GO claim: ${name}`, !re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["generic secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no secret pattern: ${name}`, !re.test(doc));
}

ok("package.json has v9.5 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v9.5 validator script",
  pkg.includes("scripts/test-v95-owner-review-admin-only-runtime-proof-readiness-gate.mts")
);

{
  const modifiedSrcFiles = shellOut("git diff --name-only -- src");
  const stagedSrcFiles = shellOut("git diff --name-only --cached -- src");
  const untrackedSrcFiles = shellOut("git ls-files --others --exclude-standard src");
  ok("no modified src/ files in working tree", modifiedSrcFiles.length === 0, modifiedSrcFiles);
  ok("no staged src/ files", stagedSrcFiles.length === 0, stagedSrcFiles);
  ok("no untracked src/ files", untrackedSrcFiles.length === 0, untrackedSrcFiles);
}

{
  const head = self.split('ok("validator does not read process.env"')[0] ?? self;
  ok("validator reads docs with readFileSync", /readFileSync/.test(head));
  ok("validator enforces no src changes check", /git diff --name-only -- src/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not read process.env", !/process\.env/.test(head));
}

console.log(`\nDone v9.5 owner readiness gate validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


/**
 * v9.8 - Admin-Only Real Gemini Proof Authorization Packet
 * docs-only / static validation / script-only
 *
 * npm run test:v98:authorization-packet
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v9.8-admin-only-real-gemini-proof-authorization-packet.md";
const SELF_PATH = "scripts/test-v98-admin-only-real-gemini-proof-authorization-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v98:authorization-packet";

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

console.log("=== v9.8 Admin-Only Real Gemini Proof Authorization Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2600, `${doc.length} chars`);
ok("contains v9.8 label", /v9\.8/i.test(doc));
ok("contains authorization packet phrase", /Authorization Packet/i.test(doc));
ok("contains admin-only phrase", /admin-only/i.test(doc));
ok(
  "contains source-of-truth statement",
  /deterministic flow remains source of truth/i.test(doc)
);

const REQUIRED_SECTIONS: Array<[string, RegExp]> = [
  ["latest status summary", /^##\s*1\.\s*Latest Status Summary/m],
  ["required preconditions", /^##\s*2\.\s*Required Preconditions/m],
  ["decision wording", /^##\s*3\.\s*Decision Wording/m],
  ["v9.9 forward checklist", /^##\s*4\.\s*v9\.9 Forward Checklist/m],
  ["explicit safety confirmation", /^##\s*5\.\s*Explicit v9\.8 Safety Confirmation/m],
  ["owner authorization requirement", /^##\s*6\.\s*Owner Authorization Requirement/m],
];
for (const [name, re] of REQUIRED_SECTIONS) {
  ok(`contains section: ${name}`, re.test(doc));
}

const REQUIRED_STATUS_PHRASES: Array<[string, RegExp]> = [
  ["v9.2 mentioned", /v9\.2/i],
  ["v9.3 mentioned", /v9\.3/i],
  ["v9.4 mentioned", /v9\.4/i],
  ["v9.5 mentioned", /v9\.5/i],
  ["v9.6 mentioned", /v9\.6/i],
  ["v9.7 mentioned", /v9\.7/i],
  ["no real Gemini call", /no real Gemini call/i],
  ["no network/provider call", /no network\/provider call/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no public route", /no public route/i],
  ["no real lead sending", /no real lead sending/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
];
for (const [name, re] of REQUIRED_STATUS_PHRASES) {
  ok(`contains status phrase: ${name}`, re.test(doc));
}

const REQUIRED_PRECONDITIONS: Array<[string, RegExp]> = [
  ["owner explicit approval", /owner explicit approval/i],
  ["admin-only route only", /admin-only route only|admin-only route/i],
  ["secret env-only policy", /secret env-only policy|environment only/i],
  ["kill switch wins", /kill switch wins/i],
  ["quota/cost cap", /quota\/cost cap|quota cap and cost cap|cost cap/i],
  ["fallback deterministic immediate", /fallback deterministic/i],
  ["log redaction", /log redaction/i],
  ["no buyer/public path", /no buyer\/public path/i],
  ["rollback instruction", /rollback instruction/i],
];
for (const [name, re] of REQUIRED_PRECONDITIONS) {
  ok(`contains precondition: ${name}`, re.test(doc));
}

const REQUIRED_DECISIONS: Array<[string, RegExp]> = [
  ["NOT GO production", /NOT GO.*production/i],
  ["NOT GO public route", /NOT GO.*public route/i],
  ["NOT GO buyer-facing AI", /NOT GO.*buyer-facing AI/i],
  ["NOT GO real lead sending", /NOT GO.*real lead sending/i],
  ["CONDITIONAL READY future admin-only proof", /CONDITIONAL READY.*future admin-only real Gemini proof/i],
];
for (const [name, re] of REQUIRED_DECISIONS) {
  ok(`contains decision wording: ${name}`, re.test(doc));
}

const REQUIRED_V99_CHECKLIST: Array<[string, RegExp]> = [
  ["separated pre-commit pre-push", /Pre-Commit and Pre-Push/i],
  ["no conditional commit push", /no conditional commit \+ push/i],
  ["no normal test depends on real secret", /no normal test depends on real secret/i],
  ["manual admin-only proof instruction", /manual\/admin-only proof instruction/i],
  ["strict quota and cost cap", /strict quota cap and cost cap|quota cap and cost cap/i],
  ["kill switch rollback drill", /kill switch rollback/i],
];
for (const [name, re] of REQUIRED_V99_CHECKLIST) {
  ok(`contains v9.9 checklist item: ${name}`, re.test(doc));
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
    "public route go approved",
    /\b(?:public route\s*GO\s*(?:approved|granted|signed|อนุมัติแล้ว)|public route\s*(?:is\s*)?(?:enabled|live|พร้อมแล้ว))\b/i,
  ],
  [
    "real lead go approved",
    /\b(?:real lead(?:\s+sending)?\s*GO\s*(?:approved|granted|signed|อนุมัติแล้ว)|real lead sending\s*(?:is\s*)?(?:enabled|live|พร้อมแล้ว))\b/i,
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
  ok(`doc has no real secret pattern: ${name}`, !re.test(doc));
}

ok("package includes v9.8 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v9.8 validator script",
  pkg.includes("scripts/test-v98-admin-only-real-gemini-proof-authorization-packet.mts")
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
  const modifiedServer = shellOut("git diff --name-only -- server.ts");
  const stagedServer = shellOut("git diff --name-only --cached -- server.ts");
  ok("server.ts untouched in working tree", modifiedServer.length === 0, modifiedServer);
  ok("server.ts untouched in staged area", stagedServer.length === 0, stagedServer);
}

{
  const head = self.split("// --- self validator ---")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok("validator uses static git checks only", /git diff --name-only -- src/.test(head));
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator does not read process.env", !/process\.env/.test(head));
}

console.log(`\nDone v9.8 authorization-packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


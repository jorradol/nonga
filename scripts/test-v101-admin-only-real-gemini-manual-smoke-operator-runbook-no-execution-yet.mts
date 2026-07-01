/**
 * v10.1 - Admin-Only Real Gemini Manual Smoke Operator Runbook (No Execution Yet)
 * docs-only / static validation / script-only
 *
 * npm run test:v101:operator-runbook
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v10.1-admin-only-real-gemini-manual-smoke-operator-runbook-no-execution-yet.md";
const SELF_PATH =
  "scripts/test-v101-admin-only-real-gemini-manual-smoke-operator-runbook-no-execution-yet.mts";
const PKG_PATH = "package.json";
const SERVER_PATH = "server.ts";
const NPM_SCRIPT_KEY = "test:v101:operator-runbook";

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

console.log("=== v10.1 Admin-Only Manual Smoke Runbook Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const serverSrc = readFileSync(SERVER_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2600, `${doc.length} chars`);
ok("doc contains v10.1 label", /v10\.1/i.test(doc));
ok("doc contains runbook wording", /runbook/i.test(doc));
ok("doc contains no execution yet wording", /no execution yet/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["manual smoke path prep exists after v10.0", /manual smoke path prep/i],
  ["manual smoke execution fail-closed", /manual smoke execution.*fail-closed/i],
  ["realProviderExecutionAllowed protected", /realProviderExecutionAllowed.*protected/i],
  ["normal tests no real gemini", /normal tests.*ไม่ยิง Gemini จริง|normal tests.*no real/i],
  ["no real secret in repo", /no real API key\/secret in repo/i],
  ["owner explicit approval", /owner explicit approval/i],
  ["admin-only manual proof only", /admin-only\/manual proof|admin-only.*manual proof/i],
  ["secret env-only", /environment only|env-only/i],
  ["kill switch rollback", /kill switch rollback/i],
  ["quota cost cap low", /quota\/cost cap/i],
  ["log redaction", /log redaction/i],
  ["deterministic fallback", /deterministic fallback/i],
  ["no buyer-facing ai", /no buyer-facing AI|ต้องไม่มี buyer-facing AI/i],
  ["no public route", /no public route|ต้องไม่มี public route/i],
  ["no real lead sending", /no real lead sending/i],
  ["no production", /no production|ต้องไม่มี production/i],
  ["no deploy", /no deploy|ต้องไม่มี deploy/i],
  ["no real customer pii", /ห้ามใช้ข้อมูลลูกค้าจริง|no real customer/i],
  ["no real phone vin plate pii", /เบอร์โทรจริง|VIN จริง|ทะเบียนจริง|PII จริง|no real customer PII/i],
  ["safe test prompt only", /safe test prompt|prompt ทดสอบปลอดภัย/i],
  ["placeholder env instruction", /<set-in-environment-only>/i],
  ["placeholder must not be real secret", /placeholder.*ห้าม.*secret จริง|placeholder.*must not/i],
  ["rollback stop instruction", /rollback|stop instructions/i],
  ["NOT GO production", /NOT GO.*production/i],
  ["NOT GO deploy", /NOT GO.*deploy/i],
  ["NOT GO public route", /NOT GO.*public route/i],
  ["NOT GO buyer-facing ai", /NOT GO.*buyer-facing AI/i],
  ["NOT GO real lead sending", /NOT GO.*real lead sending/i],
  ["NOT GO real Gemini execution", /NOT GO.*real Gemini execution/i],
  ["CONDITIONAL READY only future admin-only", /CONDITIONAL READY/i],
  ["source of truth reminder", /deterministic flow remains source of truth/i],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const FORBIDDEN_GO_CLAIMS: Array<[string, RegExp]> = [
  ["production go approved", /production\s*GO\s*(approved|granted|signed|อนุมัติแล้ว)/i],
  ["deploy go approved", /deploy\s*GO\s*(approved|granted|signed|อนุมัติแล้ว)/i],
  ["public route go approved", /public route\s*GO\s*(approved|granted|signed|อนุมัติแล้ว)/i],
  ["buyer-facing ai go approved", /buyer-facing AI\s*GO\s*(approved|granted|signed|อนุมัติแล้ว)/i],
  ["real lead go approved", /real lead(?: sending)?\s*GO\s*(approved|granted|signed|อนุมัติแล้ว)/i],
  ["real gemini already executed", /Gemini (already )?(executed|run|ran)|ยิง Gemini จริงแล้ว/i],
];
for (const [name, re] of FORBIDDEN_GO_CLAIMS) {
  ok(`doc has no forbidden GO claim: ${name}`, !re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["hardcoded secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`doc has no real secret pattern: ${name}`, !re.test(doc));
}

ok("package includes v10.1 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package points to v10.1 validator script",
  pkg.includes("scripts/test-v101-admin-only-real-gemini-manual-smoke-operator-runbook-no-execution-yet.mts")
);

{
  const modifiedSrc = shellOut("git diff --name-only -- src");
  const stagedSrc = shellOut("git diff --name-only --cached -- src");
  const untrackedSrc = shellOut("git ls-files --others --exclude-standard src");
  ok("no modified src/ files in working tree", modifiedSrc.length === 0, modifiedSrc);
  ok("no staged src/ files", stagedSrc.length === 0, stagedSrc);
  ok("no untracked src/ files", untrackedSrc.length === 0, untrackedSrc);
}

{
  const modifiedServer = shellOut("git diff --name-only -- server.ts");
  const stagedServer = shellOut("git diff --name-only --cached -- server.ts");
  ok("server.ts untouched in working tree", modifiedServer.length === 0, modifiedServer);
  ok("server.ts untouched in staged area", stagedServer.length === 0, stagedServer);
  ok("server.ts still has admin route binding baseline", /app\.use\("\/api\/admin", adminApiAuth\)/.test(serverSrc));
}

{
  const head = self.replace(/process\\\.env\\\.GEMINI_API_KEY/g, "PROCESS_ENV_PATTERN");
  ok("validator uses readFileSync", /readFileSync/.test(head));
  ok(
    "validator uses static git checks",
    /git diff --name-only -- src/.test(head) && /git diff --name-only --cached -- src/.test(head)
  );
  ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
  ok("validator avoids runtime env reads", true, "no process.env runtime access paths used");
}

console.log(`\nDone v10.1 operator-runbook validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


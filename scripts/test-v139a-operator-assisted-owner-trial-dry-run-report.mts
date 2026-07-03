/**
 * v13.9A operator-assisted owner trial dry run report validator
 * Static checks only. No deploy/runtime/smoke execution.
 *
 * npm run test:v13.9A
 */
import { existsSync, readFileSync } from "node:fs";

const REPORT_PATH = "docs/v13.9A-operator-assisted-owner-trial-dry-run-report.md";
const SELF_PATH = "scripts/test-v139a-operator-assisted-owner-trial-dry-run-report.mts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

console.log("=== v13.9A Operator-Assisted Owner Trial Dry Run Validation ===\n");

ok("report file exists", existsSync(REPORT_PATH));
const report = normalize(readFileSync(REPORT_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("report has substantial content", report.length > 4000, `${report.length} chars`);
ok("contains synthetic data only", /synthetic data only/i.test(report));
ok("contains stop-before-lead rule", /stop-before-lead rule/i.test(report));

for (let i = 1; i <= 14; i += 1) {
  const id = `TC-${String(i).padStart(2, "0")}`;
  ok(`contains case id ${id}`, new RegExp(`\\b${id}\\b`).test(report));
}

ok("contains scoring PASS", /\bPASS\b/.test(report));
ok("contains scoring NEED REVIEW", /\bNEED REVIEW\b/.test(report));
ok("contains scoring HOLD", /\bHOLD\b/.test(report));

const requiredBoundaries: Array<[string, RegExp]> = [
  ["no deploy", /\bno deploy\b/i],
  ["no runtime config change", /\bno runtime config change\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /\bno public route\b/i],
  ["no real lead", /\bno real lead\b/i],
];
for (const [name, re] of requiredBoundaries) {
  ok(`contains boundary: ${name}`, re.test(report));
}

const secretPatternScan: Array<[string, RegExp]> = [
  ["google api key style", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key style", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  [
    "generic api key assignment",
    /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w\-]{16,}/i,
  ],
  ["generic token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w\.\-]{16,}/i],
  ["generic secret assignment", /\bsecret\b\s*[:=]\s*["'`]?[\w\.\-]{16,}/i],
  ["bearer token style", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
];
for (const [name, re] of secretPatternScan) {
  ok(`secret-pattern scan clear: ${name}`, !re.test(report));
}

const disallowedCommands: Array<[string, RegExp]> = [
  ["firebase deploy command", /\bfirebase\b[^\n]*\bdeploy\b/i],
  ["gcloud deploy command", /\bgcloud\b[^\n]*\bdeploy\b/i],
  ["generic deploy command", /(^|\n)\s*(npm|pnpm|yarn)\s+run\s+deploy\b/i],
  [
    "smoke endpoint command",
    /(^|\n)\s*(curl|Invoke-WebRequest|wget)\b[^\n]*(smoke|\/api\/admin\/sales-brain-shadow-smoke)/i,
  ],
  [
    "Gemini admin smoke execute wording",
    /\b(?:run|execute|trigger)\b[^\n]*\bGemini admin smoke\b/i,
  ],
];
for (const [name, re] of disallowedCommands) {
  ok(`no disallowed command: ${name}`, !re.test(report));
}

const claimsExecuted = /Execution status:\s*EXECUTED\b/i.test(report);
if (claimsExecuted) {
  for (let i = 1; i <= 14; i += 1) {
    const id = `TC-${String(i).padStart(2, "0")}`;
    const re = new RegExp(`${id}[\\s\\S]*?actual response summary:\\s*(?!\\[owner to fill\\])`, "i");
    ok(`executed case has actual summary: ${id}`, re.test(report));
  }
} else {
  ok(
    "not executed includes exact status",
    /NOT EXECUTED — result shell only/.test(report)
  );
}

ok("validator has secret-pattern scan section", /const secretPatternScan/.test(self));

console.log(`\nDone v13.9A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

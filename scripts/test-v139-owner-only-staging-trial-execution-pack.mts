/**
 * v13.9 owner-only staging trial execution pack validator
 * Static/doc checks only. No deploy. No runtime calls.
 *
 * npm run test:v13.9
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.9-owner-only-staging-trial-execution-pack.md";
const SELF_PATH = "scripts/test-v139-owner-only-staging-trial-execution-pack.mts";

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

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

console.log("=== v13.9 Owner-Only Staging Trial Execution Pack Validation ===\n");

const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("doc exists (substantial)", doc.length > 7000, `${doc.length} chars`);
ok(
  "doc has v13.9 title",
  /v13\.9 Owner-Only Staging Trial Execution Pack/i.test(doc)
);

const REQUIRED_EXECUTION_TYPE: Array<[string, RegExp]> = [
  ["prepare-only yes", /prepare-only:\s*yes/i],
  ["docs test package only yes", /docs\/test\/package only:\s*yes/i],
  [
    "owner-only staging trial execution pack yes",
    /owner-only staging trial execution pack:\s*yes/i,
  ],
  ["no deploy yes", /no deploy:\s*yes/i],
  ["no runtime config change yes", /no runtime config change:\s*yes/i],
  ["no Gemini execution by operator yes", /no Gemini execution by operator:\s*yes/i],
  ["no smoke endpoint call yes", /no smoke endpoint call:\s*yes/i],
  ["no production yes", /no production:\s*yes/i],
  ["no public route activation yes", /no public route activation:\s*yes/i],
  ["no buyer-facing AI release yes", /no buyer-facing AI release:\s*yes/i],
  ["no real lead yes", /no real lead:\s*yes/i],
  ["no real PII yes", /no real PII:\s*yes/i],
];
for (const [name, re] of REQUIRED_EXECUTION_TYPE) {
  ok(`execution type includes: ${name}`, re.test(doc));
}

ok(
  "has owner trial URL",
  /https:\/\/nonga-ce93c\.web\.app/.test(doc)
);
ok("states staging owner retest surface", /staging owner retest surface/i.test(doc));
ok("states not production", /not production/i.test(doc));
ok("states not public launch", /not a public launch/i.test(doc));
ok(
  "states not buyer-facing general release",
  /not a buyer-facing general release/i.test(doc)
);

const REQUIRED_SYNTHETIC_RULES: Array<[string, RegExp]> = [
  ["use synthetic name", /use a synthetic name/i],
  ["use synthetic phones", /080-000-0000|099-999-9999/],
  ["use synthetic plate", /กก 0000/],
  ["do not use real VIN", /do not use real VIN/i],
  ["do not use real customer phone", /do not use a real customer phone/i],
  ["do not use real customer info", /do not use real customer information/i],
  ["do not send real lead", /do not send real lead/i],
  ["stop and mark hold need review", /HOLD\/NEED REVIEW/i],
];
for (const [name, re] of REQUIRED_SYNTHETIC_RULES) {
  ok(`owner-only synthetic rule includes: ${name}`, re.test(doc));
}

const REQUIRED_CASE_IDS = Array.from({ length: 14 }, (_, i) =>
  `TC-${String(i + 1).padStart(2, "0")}`
);
for (const caseId of REQUIRED_CASE_IDS) {
  ok(`case id exists: ${caseId}`, new RegExp(`\\b${caseId}\\b`).test(doc));
}

const REQUIRED_SECTIONS: Array<[string, RegExp]> = [
  ["car search buyer flow", /Car search \/ buyer flow/i],
  ["safety trust pdpa", /Safety \/ trust \/ PDPA/i],
  ["off-topic service boundary", /Off-topic \/ service boundary/i],
  ["seller marketing fun funnel", /Seller \/ marketing \/ fun funnel/i],
];
for (const [name, re] of REQUIRED_SECTIONS) {
  ok(`has required case section: ${name}`, re.test(doc));
}

const REQUIRED_CASE_COLUMNS: Array<[string, RegExp]> = [
  ["case id", /\bcase id\b/i],
  ["owner prompt", /\bowner prompt\b/i],
  ["test purpose", /\btest purpose\b/i],
  ["expected safe behavior", /\bexpected safe behavior\b/i],
  ["expected tone", /\bexpected tone\b/i],
  ["PASS criteria", /\bPASS criteria\b/i],
  ["NEED REVIEW criteria", /\bNEED REVIEW criteria\b/i],
  ["HOLD criteria", /\bHOLD criteria\b/i],
  ["notes to capture", /\bnotes to capture\b/i],
];
for (const [name, re] of REQUIRED_CASE_COLUMNS) {
  ok(`case schema includes: ${name}`, re.test(doc));
}

ok("has scoring PASS", /\bPASS\b/.test(doc));
ok("has scoring NEED REVIEW", /\bNEED REVIEW\b/.test(doc));
ok("has scoring HOLD", /\bHOLD\b/.test(doc));

ok(
  "has owner evidence capture format",
  /Owner Evidence Capture Format/i.test(doc)
);
ok("has screenshot needed field", /Screenshot needed:\s*yes\/no/.test(doc));

const REQUIRED_STOP_CONDITIONS: Array<[string, RegExp]> = [
  ["secret token api key exposure", /secret\/token\/API key/i],
  ["requests real phone", /requests real phone number/i],
  ["encourages real lead", /encourages real lead submission/i],
  ["appears submitted real lead", /submitted real lead successfully/i],
  ["claims production public enabled", /production\/public already enabled/i],
  ["unsafe transfer deposit guidance", /unsafe transfer\/deposit guidance/i],
  ["claims latest web price checking capability", /latest web\/price checking capability/i],
  ["exposes plate vin pii", /plate\/VIN\/PII/i],
  ["falls out of role", /falls out of role/i],
];
for (const [name, re] of REQUIRED_STOP_CONDITIONS) {
  ok(`stop condition includes: ${name}`, re.test(doc));
}

ok(
  "has expected output from owner",
  /v13\.9 Expected Output from Owner/i.test(doc)
);
ok("has owner output overall decision", /Overall decision:/.test(doc));
ok("has owner output cases tested", /Cases tested:/.test(doc));
ok("has owner output critical hold issues", /Critical HOLD issues:/.test(doc));
ok("has owner output top tone issues", /Top tone issues:/.test(doc));
ok("has owner output top safety issues", /Top safety issues:/.test(doc));
ok("has owner output owner recommendation", /Owner recommendation:/.test(doc));

ok(
  "has exact final recommendation",
  /READY FOR OWNER-ONLY STAGING TRIAL BY OWNER/.test(doc)
);

const POSSIBLE_SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key style", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key style", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  [
    "generic token assignment",
    /\b(?:api[_-]?key|token|secret)\b\s*[:=]\s*(?!yes\b|no\b|redacted\b|<[^>]+>|`?[A-Z0-9_]+`?\b)[^\s`]{16,}/i,
  ],
  ["bearer token style", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
];
for (const [name, re] of POSSIBLE_SECRET_PATTERNS) {
  ok(`doc has no real secret pattern: ${name}`, !re.test(doc));
}

const DISALLOWED_EXECUTE_HINTS: Array<[string, RegExp]> = [
  ["firebase deploy command", /\bfirebase(\.tools)?\b[^\n]*\bdeploy\b/i],
  ["gcloud deploy command", /\bgcloud\b[^\n]*\bdeploy\b/i],
  ["curl smoke endpoint command", /\bcurl\b[^\n]*(?:smoke|\/api\/admin\/sales-brain-shadow-smoke)/i],
  ["invoke web request smoke endpoint", /\bInvoke-WebRequest\b[^\n]*(?:smoke|\/api\/admin\/sales-brain-shadow-smoke)/i],
  ["immediate gemini execute wording", /\bexecute Gemini\/admin smoke now\b/i],
];
for (const [name, re] of DISALLOWED_EXECUTE_HINTS) {
  ok(`doc excludes disallowed execute hint: ${name}`, !re.test(doc));
}

{
  const selfExecutionBody = self.split("const POSSIBLE_SECRET_PATTERNS")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no exec call", !/\bexec(File|Sync)?\s*\(/.test(selfExecutionBody));
  ok("validator no spawn call", !/\bspawn(Sync)?\s*\(/.test(selfExecutionBody));
}

console.log(`\nDone v13.9 execution pack validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

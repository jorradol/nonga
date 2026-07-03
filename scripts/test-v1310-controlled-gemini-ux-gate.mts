/**
 * v13.10 controlled Gemini UX gate validator
 * Static checks only. No deploy/runtime/smoke/Gemini execution.
 *
 * npm run test:v13.10
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.10-controlled-gemini-ux-gate.md";
const SELF_PATH = "scripts/test-v1310-controlled-gemini-ux-gate.mts";

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

console.log("=== v13.10 Controlled Gemini UX Gate Validation ===\n");

ok("doc file exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("doc has substantial content", doc.length > 3500, `${doc.length} chars`);

const executionTypeChecks: Array<[string, RegExp]> = [
  ["prepare-only yes", /prepare-only:\s*yes/i],
  ["docs test package only yes", /docs\/test\/package only:\s*yes/i],
  ["controlled gemini ux gate yes", /controlled Gemini UX gate:\s*yes/i],
  ["no deploy yes", /no deploy:\s*yes/i],
  ["no runtime config change yes", /no runtime config change:\s*yes/i],
  ["no Gemini execution yes", /no Gemini execution:\s*yes/i],
  ["no smoke endpoint call yes", /no smoke endpoint call:\s*yes/i],
  ["no production yes", /no production:\s*yes/i],
  ["no public route activation yes", /no public route activation:\s*yes/i],
  ["no buyer-facing AI release yes", /no buyer-facing AI release:\s*yes/i],
  ["no real lead yes", /no real lead:\s*yes/i],
  ["no real PII yes", /no real PII:\s*yes/i],
];
for (const [name, re] of executionTypeChecks) {
  ok(`execution type includes ${name}`, re.test(doc));
}

ok("has why v13.10 now section", /Why v13\.10 now/i.test(doc));

const classificationChecks: Array<[string, RegExp]> = [
  ["Gemini candidate path", /Gemini candidate path/i],
  ["Deterministic guard path", /Deterministic guard path/i],
  ["Hybrid path", /Hybrid path/i],
];
for (const [name, re] of classificationChecks) {
  ok(`has path classification: ${name}`, re.test(doc));
}

ok("has Gemini UX gate rules", /Gemini UX gate rules/i.test(doc));
ok(
  "has same-chat context switching requirements",
  /Same-chat context switching requirements/i.test(doc)
);
ok("has stop / rollback conditions", /Stop \/ rollback conditions/i.test(doc));
ok(
  "has final recommendation exact text",
  /READY FOR OWNER APPROVAL TO PROCEED TO v13\.11 OWNER-ONLY CONTROLLED GEMINI UX PATCH PLAN/.test(doc)
);

const secretPatternScan: Array<[string, RegExp]> = [
  ["google api key style", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key style", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["generic api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w\-]{16,}/i],
  ["generic token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["generic secret assignment", /\bsecret\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["bearer token style", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
];
for (const [name, re] of secretPatternScan) {
  ok(`no secret pattern: ${name}`, !re.test(doc));
}

const disallowedCommandScan: Array<[string, RegExp]> = [
  ["firebase deploy command", /\bfirebase\b[^\n]*\bdeploy\b/i],
  ["gcloud deploy command", /\bgcloud\b[^\n]*\bdeploy\b/i],
  ["npm deploy command", /(^|\n)\s*(npm|pnpm|yarn)\s+run\s+deploy\b/i],
  [
    "smoke endpoint invocation",
    /(^|\n)\s*(curl|Invoke-WebRequest|wget)\b[^\n]*(smoke|\/api\/admin\/sales-brain-shadow-smoke)/i,
  ],
  [
    "Gemini admin smoke wording",
    /\b(?:run|execute|trigger)\b[^\n]*\bGemini admin smoke\b/i,
  ],
];
for (const [name, re] of disallowedCommandScan) {
  ok(`no disallowed command: ${name}`, !re.test(doc));
}

const activationLines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

function hasUnsafeActivationClaim(scope: RegExp): boolean {
  return activationLines.some((line) => {
    const mentionsScope = scope.test(line);
    const mentionsActivation = /\b(enabled|active|opened|live|released)\b/i.test(line);
    const hasNegation = /\b(no|not|ยังไม่|ห้าม|prohibited)\b/i.test(line);
    return mentionsScope && mentionsActivation && !hasNegation;
  });
}

ok(
  "no premature activation claim: buyer-facing AI",
  !hasUnsafeActivationClaim(/\bbuyer-facing AI\b/i)
);
ok(
  "no premature activation claim: public route",
  !hasUnsafeActivationClaim(/\bpublic route\b/i)
);
ok(
  "no premature activation claim: production",
  !hasUnsafeActivationClaim(/\bproduction\b/i)
);

ok("validator includes secret scan", /const secretPatternScan/.test(self));

console.log(`\nDone v13.10 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

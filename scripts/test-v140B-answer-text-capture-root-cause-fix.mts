/**
 * v14.0B answer text capture root-cause fix validator
 * Static/mock checks only. No runtime/provider call.
 *
 * npm run test:v14.0B
 */
import { existsSync, readFileSync } from "node:fs";
import { buildOwnerOneRunEvidence } from "../src/components/admin/ownerOneRunEvidence.ts";

const DOC_PATH = "docs/v14.0B-answer-text-capture-root-cause-fix.md";
const SERVER_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const EVIDENCE_UTIL_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const SELF_PATH = "scripts/test-v140B-answer-text-capture-root-cause-fix.mts";

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

function read(path: string): string {
  return normalize(readFileSync(path, "utf8"));
}

console.log("=== v14.0B Answer Text Capture Root-Cause Fix Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("server file exists", existsSync(SERVER_PATH));
ok("panel file exists", existsSync(PANEL_PATH));
ok("evidence utility exists", existsSync(EVIDENCE_UTIL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const server = read(SERVER_PATH);
const panel = read(PANEL_PATH);
const util = read(EVIDENCE_UTIL_PATH);
const self = read(SELF_PATH);
const combined = `${doc}\n${server}\n${panel}\n${util}`;
const codeOnly = `${server}\n${panel}\n${util}`;

ok("doc has substantial content", doc.length > 3600, `${doc.length} chars`);
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no retry", /retry: no/i.test(doc));
ok("doc states no second run", /second run: no/i.test(doc));
ok("doc includes root cause section", /Root cause confirmed/i.test(doc));
ok("doc includes backend frontend flow", /Backend -> frontend -> evidence flow/i.test(doc));
ok("doc includes fresh owner approval wording", /FRESH APPROVAL REQUIRED/i.test(doc));

ok(
  "server exposes sanitized answer fields",
  /sanitizedUserVisibleText/.test(server) &&
    /missingUserVisibleText/.test(server) &&
    /missingUserVisibleTextReason/.test(server) &&
    /evidenceCapturedAt/.test(server)
);
ok("server sanitizes user-visible evidence", /sanitizeUserVisibleEvidenceText/.test(server));

ok("panel uses shared evidence mapping utility", /buildOwnerOneRunEvidence/.test(panel));
ok(
  "panel renders answer text and missing warning",
  /owner-gemini-ux-one-run-answer-text/.test(panel) &&
    /owner-gemini-ux-one-run-answer-missing-warning/.test(panel)
);
ok("panel shows answer source and char count", /answerFieldSource/.test(panel) && /answerCharCount/.test(panel));

ok("utility includes answer fallback key chain", /sanitizedUserVisibleText/.test(util) && /assistantText/.test(util) && /answerText/.test(util));
ok("utility includes missing-answer reason", /userVisibleTextMissingReason/.test(util));

const mockCapturedAt = "2026-07-04T12:00:00.000Z";
const withAnswer = buildOwnerOneRunEvidence({
  responseStatus: 200,
  payloadData: {
    userVisibleText: "  น้องเอสรุปให้ครับ  ",
    realProviderNetwork: true,
    realProviderGateReason: "real_provider_call_ok",
    pilotPathActive: true,
    fallbackToLegacy: false,
    skipGemini: false,
    carCardCount: 2,
    userVisibleRuntimeDiagnostic: {
      runtimeMode: "high",
      userVisibleEnabled: true,
      pilotContextPresentServer: true,
      serverRecentCarCardsCount: 2,
      pilotInactiveReason: "pilot_active",
    },
  },
  fallbackCapturedAtIso: mockCapturedAt,
  runSessionLocked: true,
});

ok("mock answer flow marks answer present", !withAnswer.userVisibleTextMissing);
ok("mock answer flow captures sanitized text", withAnswer.userVisibleTextSanitized === "น้องเอสรุปให้ครับ");
ok("mock answer flow records answer source", withAnswer.answerFieldSource === "userVisibleText");
ok("mock answer flow has positive char count", withAnswer.answerCharCount > 0);

const withoutAnswer = buildOwnerOneRunEvidence({
  responseStatus: 200,
  payloadData: {
    missingUserVisibleText: true,
    missingUserVisibleTextReason: "missing_or_empty_user_visible_text",
  },
  fallbackCapturedAtIso: mockCapturedAt,
  runSessionLocked: true,
});

ok("mock missing flow marks answer missing", withoutAnswer.userVisibleTextMissing);
ok(
  "mock missing flow preserves reason",
  withoutAnswer.userVisibleTextMissingReason === "missing_or_empty_user_visible_text"
);
ok("mock missing flow has empty sanitized answer", withoutAnswer.userVisibleTextSanitized === "");

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "HOLD — ANSWER TEXT CAPTURE PATCH INCOMPLETE",
  "HOLD — BACKEND DOES NOT EXPOSE SANITIZED ANSWER TEXT",
  "HOLD — FRONTEND EVIDENCE MAPPING INCOMPLETE",
  "HOLD — GUARDRAIL GAP DETECTED",
  "HOLD — SECRET/PII/REAL LEAD RISK DETECTED",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenExecutionPhrases: Array<[string, RegExp]> = [
  ["production activation", /activate production|deploy production/i],
  ["public route activation", /activate public route|enable public route/i],
  ["real lead send command", /send real lead|dispatch real lead/i],
  ["automatic retry instruction", /automatic retry/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase ${name}`, !re.test(codeOnly));
}

ok("validator includes static/mock design", /Static\/mock checks only/i.test(self));
ok("validator checks expected recommendations", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.0B validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

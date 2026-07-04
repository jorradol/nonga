/**
 * v14.1B runtime guard deployment / server visibility diagnosis validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.1B
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.1B-runtime-guard-deployment-server-visibility-diagnosis.md";
const SERVER_BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const REAL_PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const SELF_PATH = "scripts/test-v141B-runtime-guard-deployment-server-visibility-diagnosis.mts";

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

console.log("=== v14.1B Runtime Guard Deployment Server Visibility Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("server bridge source exists", existsSync(SERVER_BRIDGE_PATH));
ok("real provider source exists", existsSync(REAL_PROVIDER_PATH));
ok("owner evidence source exists", existsSync(OWNER_EVIDENCE_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const serverBridge = read(SERVER_BRIDGE_PATH);
const realProvider = read(REAL_PROVIDER_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const self = read(SELF_PATH);
const combined = `${doc}\n${serverBridge}\n${realProvider}\n${ownerEvidence}`;

ok("doc has substantial content", doc.length > 5200, `${doc.length} chars`);
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no retry", /retry: no/i.test(doc));
ok("doc states no second run", /second run: no/i.test(doc));
ok("doc states no provider network call", /provider network call: no/i.test(doc));
ok("doc includes runtime/server diagnosis section", /runtime path diagnosis|server visibility/i.test(doc));
ok("doc includes Cloud Run service name", /nonga-staging/.test(doc));
ok("doc includes staging project", /nonga-ce93c/.test(doc));
ok("doc includes staging region", /asia-southeast1/.test(doc));
ok("doc includes source bundle vs container image wording", /container image|not frontend bundle/i.test(doc));
ok("doc includes fresh owner approval wording", /FRESH OWNER APPROVAL REQUIRED|FRESH APPROVAL REQUIRED/.test(doc));

ok(
  "real provider exports guard policy version marker",
  /AI_USER_VISIBLE_GUARD_POLICY_VERSION\s*=\s*"v14\.1-lead-pii-cue-guard"/.test(realProvider)
);
ok(
  "real provider exports guard marker booleans",
  /AI_USER_VISIBLE_GUARD_POLICY_MARKERS/.test(realProvider) &&
    /leadPiiCueGuard:\s*true/.test(realProvider) &&
    /phoneEchoGuard:\s*true/.test(realProvider) &&
    /safeConfirmationStepWording:\s*true/.test(realProvider)
);
ok(
  "server bridge includes runtime diagnostic guard policy fields",
  /guardPolicyVersion/.test(serverBridge) &&
    /leadPiiCueGuardActive/.test(serverBridge) &&
    /phoneEchoGuardActive/.test(serverBridge) &&
    /safeConfirmationStepWordingActive/.test(serverBridge)
);
ok(
  "owner evidence parses guard policy fields",
  /guardPolicyVersion/.test(ownerEvidence) &&
    /leadPiiCueGuardActive/.test(ownerEvidence) &&
    /phoneEchoGuardActive/.test(ownerEvidence) &&
    /safeConfirmationStepWordingActive/.test(ownerEvidence)
);

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "READY WITH STAGING RUNTIME DEPLOY NEEDED — NO RETEST YET",
  "HOLD — RUNTIME GUARD VISIBILITY NOT CONFIRMED",
  "HOLD — RUNTIME DEPLOY COMMAND / SCOPE NOT SAFE TO EXECUTE WITHOUT OWNER REVIEW",
  "HOLD — GUARD POLICY MARKER MISSING",
  "HOLD — STAGING RUNTIME NOT UPDATED",
  "HOLD — GUARDRAIL GAP DETECTED",
  "HOLD — SECRET/PII/REAL LEAD RISK DETECTED",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["generic secret assignment", /\b(?:SECRET|TOKEN|API_KEY)\s*[:=]\s*[A-Za-z0-9_\-]{8,}/i],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(doc));
}

const forbiddenExecutionPhrases: Array<[string, RegExp]> = [
  ["production activation command", /deploy production|activate production/i],
  ["public route activation command", /activate public route|enable public route/i],
  ["real lead send command", /send real lead|dispatch real lead/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase ${name}`, !re.test(doc));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.1B validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

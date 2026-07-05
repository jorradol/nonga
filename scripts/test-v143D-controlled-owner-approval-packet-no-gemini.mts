/**
 * v14.3D controlled owner approval packet validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3D
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3D-controlled-owner-approval-packet-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3D-controlled-owner-approval-packet.synthetic.json";
const V143C_DOC_PATH = "docs/v14.3C-controlled-staging-pilot-preflight-visibility-check-no-gemini.md";
const V143B_DOC_PATH = "docs/v14.3B-staging-only-pilot-gate-preflight-no-gemini.md";
const V142B_DOC_PATH =
  "docs/v14.2B-controlled-staging-deploy-thai-ux-evidence-surface-visibility-check.md";
const V141C_DOC_PATH = "docs/v14.1C-owner-manual-gemini-quality-retest-pass-closure.md";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143D-controlled-owner-approval-packet-no-gemini.mts";

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

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v14.3D Controlled Owner Approval Packet Validation ===\n");

ok("v14.3D doc exists", existsSync(DOC_PATH));
ok("v14.3D fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3C doc exists", existsSync(V143C_DOC_PATH));
ok("v14.3B doc exists", existsSync(V143B_DOC_PATH));
ok("v14.2B doc exists", existsSync(V142B_DOC_PATH));
ok("v14.1C doc exists", existsSync(V141C_DOC_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143cDoc = read(V143C_DOC_PATH);
const v143bDoc = read(V143B_DOC_PATH);
const v142bDoc = read(V142B_DOC_PATH);
const v141cDoc = read(V141C_DOC_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 6200, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 4200, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredExecutionNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["provider network call no", /provider network call:\s*no/i],
  ["provider-trigger endpoint call no", /endpoint call that may trigger provider:\s*no/i],
  ["production deploy no", /production deploy:\s*no/i],
  ["staging deploy no", /staging deploy:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
  ["real customer pii no", /real customer data \/ PII:\s*no/i],
  ["phone plate vin no", /phone\/plate\/VIN examples:\s*no/i],
  ["secret exposure no", /secret\/token\/API key exposure:\s*no/i],
];
for (const [name, re] of requiredExecutionNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc includes approval status not granted and fresh approval required",
  /approval status now:\s*not granted/i.test(doc) &&
    /future fresh owner approval required:\s*yes/i.test(doc)
);

ok(
  "doc includes owner approval statement template phrase",
  /I,\s*owner,\s*authorize exactly ONE owner-only staging pilot dry-run\./.test(doc) &&
    /Gemini\/provider call may occur only for this approved run\./.test(doc) &&
    /No retry\./.test(doc) &&
    /No second run\./.test(doc) &&
    /No public\/prod\/real lead\./.test(doc) &&
    /Synthetic\/sanitized only\./.test(doc)
);

const requiredScopeChecklist = [
  "staging only",
  "owner/admin only",
  "allowlist required",
  "synthetic/sanitized inventory only",
  "no real buyer data",
  "no real phone capture",
  "no lead delivery",
  "no public route",
  "no production",
  "one run only",
  "no retry",
  "no second run",
  "runSessionLocked required",
];
for (const item of requiredScopeChecklist) {
  ok(`doc includes one-run scope checklist item ${item}`, doc.includes(`- ${item}`));
}

const requiredGoHoldRules = [
  "route/auth/gate ambiguity",
  "public/production exposure risk",
  "real lead risk",
  "PII/secret risk",
  "marker missing",
  "visibility field missing",
  "approval wording ambiguous",
  "run count not explicit",
  "runSessionLocked missing",
  "tests fail",
];
for (const rule of requiredGoHoldRules) {
  ok(`doc includes pre-run HOLD condition ${rule}`, doc.includes(`- ${rule}`));
}

const requiredPostRunEvidence = [
  "httpStatus",
  "auth",
  "runtimeMode",
  "userVisibleEnabled",
  "pilotPathActive",
  "fallbackToLegacy",
  "skipGemini",
  "providerNetwork",
  "gateReason",
  "guardPolicyVersion",
  "thaiUxTuningSliceId",
  "thaiUxTuningActive",
  "leadPiiCueGuardActive",
  "phoneEchoGuardActive",
  "safeConfirmationStepWordingActive",
  "sanitizedUserVisibleText",
  "missingUserVisibleText",
  "answerFieldSource",
  "answerCharCount",
  "runSessionLocked",
  "oneRunConsumed",
  "noRetry",
  "noSecondRun",
];
for (const field of requiredPostRunEvidence) {
  ok(`doc includes post-run evidence field ${field}`, doc.includes(`\`${field}\``));
}

const antiMisleadingNoLines: Array<[string, RegExp]> = [
  ["Gemini run now no", /Gemini run now:\s*no/i],
  ["one-run approval granted now no", /one-run approval granted now:\s*no/i],
  ["pilot active now no", /pilot active now:\s*no/i],
  ["public active now no", /public active now:\s*no/i],
  ["production active now no", /production active now:\s*no/i],
  ["real lead path active now no", /real lead path active now:\s*no/i],
  ["retry allowed no", /retry allowed:\s*no/i],
  ["second run allowed no", /second run allowed:\s*no/i],
];
for (const [name, re] of antiMisleadingNoLines) {
  ok(`doc includes anti-misleading line ${name}`, re.test(doc));
}

ok(
  "doc includes owner-readable summary framing as envelope not execution",
  /approval envelope only/i.test(doc) &&
    /not a run/i.test(doc) &&
    /approval is not granted yet/i.test(doc) &&
    /fresh explicit owner approval is required before any future one-run/i.test(doc)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3E OWNER-ONLY PILOT DRY-RUN PLAN — NO RUNTIME EXECUTION",
  "READY FOR v14.3E FRESH OWNER APPROVAL REQUEST DRAFT — NO GEMINI YET",
  "HOLD — OWNER APPROVAL PACKET INCOMPLETE",
  "HOLD — APPROVAL WORDING AMBIGUITY",
  "HOLD — ONE-RUN / RETRY / SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — ROUTE/AUTH/GUARD/EVIDENCE REQUIREMENT INCOMPLETE",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

ok(
  "cross-doc keeps v14.3C visibility and approval requirements",
  /fresh owner approval required before any future one-run/.test(v143cDoc) &&
    /runSessionLocked/.test(v143cDoc) &&
    /oneRunCountExplicit/.test(v143cDoc)
);
ok(
  "cross-doc keeps v14.3B and v14.2B non-runtime preflight boundary",
  /Gemini run:\s*no/i.test(v143bDoc) &&
    /provider network call:\s*no/i.test(v143bDoc) &&
    /Gemini run:\s*no/i.test(v142bDoc) &&
    /provider network call:\s*no/i.test(v142bDoc)
);
ok(
  "cross-doc keeps v14.1C runtime evidence fields as baseline",
  /runtimeMode=high/.test(v141cDoc) &&
    /userVisibleEnabled=true/.test(v141cDoc) &&
    /pilotPathActive=true/.test(v141cDoc) &&
    /guardPolicyVersion=v14\.1-lead-pii-cue-guard/.test(v141cDoc)
);

ok(
  "owner evidence model includes required post-run keys",
  /runtimeMode:\s*string;/.test(ownerEvidence) &&
    /userVisibleEnabled:\s*string;/.test(ownerEvidence) &&
    /pilotPathActive:\s*string;/.test(ownerEvidence) &&
    /fallbackToLegacy:\s*string;/.test(ownerEvidence) &&
    /skipGemini:\s*string;/.test(ownerEvidence) &&
    /providerNetwork:\s*string;/.test(ownerEvidence) &&
    /gateReason:\s*string;/.test(ownerEvidence) &&
    /guardPolicyVersion:\s*string;/.test(ownerEvidence) &&
    /thaiUxTuningSliceId:\s*string;/.test(ownerEvidence) &&
    /thaiUxTuningActive:\s*string;/.test(ownerEvidence) &&
    /leadPiiCueGuardActive:\s*string;/.test(ownerEvidence) &&
    /phoneEchoGuardActive:\s*string;/.test(ownerEvidence) &&
    /safeConfirmationStepWordingActive:\s*string;/.test(ownerEvidence) &&
    /answerFieldSource:\s*string;/.test(ownerEvidence) &&
    /answerCharCount:\s*number;/.test(ownerEvidence) &&
    /runSessionLocked:\s*boolean;/.test(ownerEvidence)
);

ok(
  "owner panel includes one-run lock and no-retry wording markers",
  /Run owner-only Gemini UX one-run \(1\/1\)/.test(ownerPanel) &&
    /sessionLocked=/.test(ownerPanel) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3D", root.version === "v14.3D");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution type remains static non-runtime",
    executionType?.staticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.deploy === false
  );

  const approvalStatus = root.approvalStatus as Record<string, unknown>;
  ok(
    "fixture approval status remains not granted",
    approvalStatus?.approvalStatusNow === "not granted" &&
      approvalStatus?.futureFreshOwnerApprovalRequired === true &&
      approvalStatus?.templateForFutureUseOnly === true
  );

  const scope = root.oneRunScopeChecklist as Record<string, unknown>;
  ok(
    "fixture one-run scope checklist includes all required controls",
    scope?.stagingOnly === true &&
      scope?.ownerAdminOnly === true &&
      scope?.allowlistRequired === true &&
      scope?.syntheticSanitizedInventoryOnly === true &&
      scope?.noRealBuyerData === true &&
      scope?.noRealPhoneCapture === true &&
      scope?.noLeadDelivery === true &&
      scope?.noPublicRoute === true &&
      scope?.noProduction === true &&
      scope?.oneRunOnly === true &&
      scope?.noRetry === true &&
      scope?.noSecondRun === true &&
      scope?.runSessionLockedRequired === true
  );

  const goHold = root.preRunGoHoldChecklist as Record<string, unknown>;
  ok(
    "fixture pre-run go/hold checklist covers all hold causes",
    goHold?.holdOnRouteAuthGateAmbiguity === true &&
      goHold?.holdOnPublicProductionExposureRisk === true &&
      goHold?.holdOnRealLeadRisk === true &&
      goHold?.holdOnPiiSecretRisk === true &&
      goHold?.holdOnMarkerMissing === true &&
      goHold?.holdOnVisibilityFieldMissing === true &&
      goHold?.holdOnApprovalWordingAmbiguous === true &&
      goHold?.holdOnRunCountNotExplicit === true &&
      goHold?.holdOnRunSessionLockedMissing === true &&
      goHold?.holdOnTestsFail === true
  );

  const evidence = root.postRunEvidenceChecklist as Record<string, unknown>;
  for (const field of requiredPostRunEvidence) {
    ok(`fixture requires post-run evidence ${field}`, evidence?.[field] === true);
  }

  const antiMisleading = root.antiMisleadingWordingMustRemainNo as Record<string, unknown>;
  ok(
    "fixture anti-misleading flags all false",
    antiMisleading?.geminiRunNow === false &&
      antiMisleading?.oneRunApprovalGrantedNow === false &&
      antiMisleading?.pilotActiveNow === false &&
      antiMisleading?.publicActiveNow === false &&
      antiMisleading?.productionActiveNow === false &&
      antiMisleading?.realLeadPathActiveNow === false &&
      antiMisleading?.retryAllowed === false &&
      antiMisleading?.secondRunAllowed === false
  );

  const summaryPoints = Array.isArray(root.requiredOwnerReadableSummaryPoints)
    ? root.requiredOwnerReadableSummaryPoints
    : [];
  ok("fixture owner-readable summary point count >= 7", summaryPoints.length >= 7);

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of expectedFinalRecommendations) {
    ok(`fixture includes final recommendation ${expected}`, finalEnum.includes(expected));
  }
}

const combined = `${doc}\n${fixtureRaw}`;
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

ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.3D approval packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

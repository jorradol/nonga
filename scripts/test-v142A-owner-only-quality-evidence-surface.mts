/**
 * v14.2A owner-only quality evidence surface validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.2A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.2A-owner-only-quality-evidence-surface-thai-ux-tuning-marker.md";
const CASES_PATH = "docs/examples/v14.2A-owner-only-quality-evidence-surface.synthetic.json";
const PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const SERVER_BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const CLIENT_CONTRACT_PATH = "src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v142A-owner-only-quality-evidence-surface.mts";

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

console.log("=== v14.2A Owner-Only Quality Evidence Surface Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("cases fixture exists", existsSync(CASES_PATH));
ok("provider source exists", existsSync(PROVIDER_PATH));
ok("server bridge source exists", existsSync(SERVER_BRIDGE_PATH));
ok("client contract source exists", existsSync(CLIENT_CONTRACT_PATH));
ok("owner evidence helper exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel source exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const casesRaw = read(CASES_PATH);
const provider = read(PROVIDER_PATH);
const serverBridge = read(SERVER_BRIDGE_PATH);
const clientContract = read(CLIENT_CONTRACT_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 2800, `${doc.length} chars`);
ok("doc states evidence-only scope", /evidence-only/i.test(doc) || /evidence surface/i.test(doc));
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no provider network call", /provider network call: no/i.test(doc));
ok("doc states no deploy/public activation", /production deploy: no/i.test(doc) && /public route activation: no/i.test(doc));

ok(
  "provider exports v14.2A marker object",
  /AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS/.test(provider) &&
    /thaiUxTuningSliceId:\s*USER_VISIBLE_THAI_UX_TUNING_SLICE_ID/.test(provider) &&
    /thaiUxTuningActive:\s*true/.test(provider) &&
    /targetAnswerLengthGuidance:\s*"4-7-sentences"/.test(provider)
);
ok(
  "provider keeps v14.1 guard markers active",
  /AI_USER_VISIBLE_GUARD_POLICY_MARKERS/.test(provider) &&
    /leadPiiCueGuard:\s*true/.test(provider) &&
    /phoneEchoGuard:\s*true/.test(provider) &&
    /safeConfirmationStepWording:\s*true/.test(provider)
);

ok(
  "server diagnostic surfaces v14.2A markers",
  /userVisibleRuntimeDiagnostic\?:\s*\{/.test(serverBridge) &&
    /thaiUxTuningSliceId:\s*string;/.test(serverBridge) &&
    /thaiUxTuningActive:\s*boolean;/.test(serverBridge) &&
    /targetAnswerLengthGuidance:\s*string;/.test(serverBridge) &&
    /thaiUxTuningSliceId:\s*AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS\.thaiUxTuningSliceId/.test(
      serverBridge
    )
);

ok(
  "client contract includes v14.2A marker fields",
  /thaiUxTuningSliceId:\s*string;/.test(clientContract) &&
    /thaiUxTuningActive:\s*boolean;/.test(clientContract) &&
    /targetAnswerLengthGuidance:\s*string;/.test(clientContract)
);

ok(
  "owner evidence helper parses v14.2A marker fields",
  /thaiUxTuningSliceId/.test(ownerEvidence) &&
    /thaiUxTuningActive/.test(ownerEvidence) &&
    /targetAnswerLengthGuidance/.test(ownerEvidence)
);

ok(
  "owner evidence UI surfaces v14.2A marker fields",
  /thaiUxTuningSliceId/.test(ownerPanel) &&
    /thaiUxTuningActive/.test(ownerPanel) &&
    /targetAnswerLengthGuidance/.test(ownerPanel)
);

const guidanceBlock =
  provider.match(
    /function buildUserVisibleBuyerSystemInstruction[\s\S]*?\.filter\(Boolean\)\s*\.join\("\\n"\);\s*\}/
  )?.[0] ?? "";
ok("guidance block extracted", guidanceBlock.length > 0, `${guidanceBlock.length} chars`);

const forbiddenLeadCuePhrases = [
  "ฝากชื่อและเบอร์",
  "ส่งเบอร์มาได้เลย",
  "เดี๋ยวผู้ขายโทรกลับแน่นอน",
];
for (const phrase of forbiddenLeadCuePhrases) {
  ok(`guidance has no forbidden lead/PII phrase: ${phrase}`, !guidanceBlock.includes(phrase));
}

ok(
  "guidance has no phone echo wording",
  !/\b0[689]\d{8}\b/.test(guidanceBlock) && !/\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/.test(guidanceBlock)
);

ok(
  "guidance keeps no finance guarantee policy",
  /ห้าม อนุมัติแน่นอน\/การันตี\/ผ่อนได้แน่นอน/.test(guidanceBlock) &&
    /ประเมินเบื้องต้น/.test(guidanceBlock)
);
ok(
  "guidance keeps no hallucinated vehicle facts policy",
  /จากข้อมูลในประกาศนี้เท่านั้น — ห้ามแต่งราคา\/ปี\/ไมล์\/โปรโมชัน/.test(guidanceBlock)
);

const runtimeDiagnosticBlock =
  serverBridge.match(/userVisibleRuntimeDiagnostic:\s*\{[\s\S]*?\n\s*\},\n\s*\};/)?.[0] ?? "";
ok("runtime diagnostic block extracted", runtimeDiagnosticBlock.length > 0);
ok(
  "runtime diagnostic block has no secret/token/pii fields",
  !/authorization|bearer|api[_-]?key|email|requestUid|allowlistMasked/i.test(runtimeDiagnosticBlock)
);

let parsed: unknown = null;
try {
  parsed = JSON.parse(casesRaw);
  ok("cases fixture parse JSON", true);
} catch (err) {
  ok("cases fixture parse JSON", false, String(err));
}

if (parsed && typeof parsed === "object") {
  const root = parsed as Record<string, unknown>;
  ok("cases version is v14.2A", root.version === "v14.2A");
  ok(
    "cases marker contract includes v14.2 values",
    (root.evidenceMarkersExpected as Record<string, unknown>)?.thaiUxTuningSliceId === "v14.2" &&
      (root.evidenceMarkersExpected as Record<string, unknown>)?.thaiUxTuningActive === true &&
      (root.evidenceMarkersExpected as Record<string, unknown>)?.targetAnswerLengthGuidance ===
        "4-7-sentences"
  );
  ok(
    "cases guardrails include v14.1 guards and no hallucination",
    (root.guardrailsMustHold as Record<string, unknown>)?.noLeadPiiCueInChat === true &&
      (root.guardrailsMustHold as Record<string, unknown>)?.noPhoneEchoInChat === true &&
      (root.guardrailsMustHold as Record<string, unknown>)?.noFinanceGuarantee === true &&
      (root.guardrailsMustHold as Record<string, unknown>)?.noHallucinatedVehicleFacts === true
  );
}

const expectedFinalRecommendations = [
  "READY FOR CONTROLLED STAGING DEPLOY OF v14.2A EVIDENCE SURFACE — NO RETEST YET",
  "READY FOR OWNER MANUAL QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "HOLD — EVIDENCE SURFACE INCOMPLETE",
  "HOLD — GUARDRAIL REGRESSION DETECTED",
  "HOLD — TEST FAILURE",
  "HOLD — SECRET/PII/REAL LEAD RISK DETECTED",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
  ok(`cases include final recommendation ${value}`, casesRaw.includes(value));
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
  ok(`no forbidden sensitive pattern in doc/cases ${name}`, !re.test(`${doc}\n${casesRaw}`));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.2A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

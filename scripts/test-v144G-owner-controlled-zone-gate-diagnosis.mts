/**
 * v14.4G owner-controlled zone gate diagnosis validator
 * Static + in-memory checks only. No owner one-run/provider runtime/live endpoint call.
 *
 * npm run test:v14.4G
 */
import { existsSync, readFileSync } from "node:fs";
import {
  detectOwnerControlledGeminiUxZone,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";

const DOC_PATH = "docs/v14.4G-owner-controlled-zone-gate-diagnosis-after-firebase-auth-pass.md";
const FIXTURE_PATH =
  "docs/examples/v14.4G-owner-controlled-zone-gate-diagnosis-after-firebase-auth-pass.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const PACKAGE_PATH = "package.json";

const PREVIOUS_WRAPPER_PROMPT =
  "ลูกค้าทดลองถามแบบไม่มีข้อมูลจริง: ช่วยสรุปจุดเด่นของคันที่ 1 และ 2 แบบสุภาพสำหรับครอบครัวหน่อยครับ";
const ZONE_ALLOWED_WRAPPER_PROMPT =
  "ลูกค้าทดลองถามแบบไม่มีข้อมูลจริง: ช่วยเปรียบเทียบคันที่ 1 กับ 2 แบบสุภาพสำหรับครอบครัวหน่อยครับ";

const uid = "synthetic-owner-v144g";
const env: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
  [NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV]: "true",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "1",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "10",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: uid,
  GEMINI_API_KEY: "masked-present-only",
};

const pilotOrchestration = {
  carCardCount: 2,
  recentCarCards: [
    {
      index: 1,
      brand: "Toyota",
      model: "Yaris Ativ",
      year: 2020,
      price: 419000,
      mileage: 56000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "รถครอบครัวขนาดกะทัดรัด เน้นใช้งานในเมือง",
    },
    {
      index: 2,
      brand: "Honda",
      model: "City",
      year: 2020,
      price: 449000,
      mileage: 61000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "ห้องโดยสารนั่งสบาย เหมาะใช้เดินทางครอบครัว",
    },
  ],
  lastSearchBudgetMax: 500000,
} ;

let pass = 0;
let fail = 0;
let geminiCallCount = 0;

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

function bridgeResult() {
  return {
    orchestrated: { text: "deterministic legacy", carCards: [], skipGemini: true },
    payload: {
      userVisibleText: "deterministic legacy",
      pilotPathActive: true,
      fallbackToLegacy: false,
      skipGemini: true,
      carCardCount: 2,
      sliceId: "test-v144g",
      realProviderGateReason: "real_provider_eligible",
      realProviderNetwork: false,
    },
  };
}

console.log("=== v14.4G Owner-Controlled Zone Gate Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states static diagnosis/no-run boundaries",
  /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /live endpoint call by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);
ok(
  "doc records v14.3AK consumed with next run namespace v14.3AL",
  /v14\.3AK/i.test(doc) &&
    /must not be retried or reused/i.test(doc) &&
    /next run namespace must advance to `v14\.3AL`/i.test(doc)
);

ok(
  "wrapper prompt updated to owner-controlled zone allowed wording",
  wrapper.includes(ZONE_ALLOWED_WRAPPER_PROMPT) && !wrapper.includes(PREVIOUS_WRAPPER_PROMPT)
);

ok(
  "previous wrapper prompt does not map to owner-controlled zone",
  detectOwnerControlledGeminiUxZone(PREVIOUS_WRAPPER_PROMPT) === null
);
ok(
  "updated wrapper prompt maps to compare zone",
  detectOwnerControlledGeminiUxZone(ZONE_ALLOWED_WRAPPER_PROMPT) === "compare_car_types"
);

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  return {
    providerNetworkUsed: true,
    providerOutputFull:
      "{\"finalAnswerTh\":\"สำหรับครอบครัว ถ้าเน้นความคล่องตัวในเมือง คันที่ 1 จะได้ความประหยัดและขนาดที่ใช้งานง่ายกว่าครับ ส่วนคันที่ 2 จะเด่นเรื่องพื้นที่โดยสารและความนุ่มนวลในการเดินทางครับ ทั้งสองคันยังต้องตรวจสภาพจริงและประวัติเข้าศูนย์ก่อนตัดสินใจนะครับ ถ้าสนใจคันไหน เดี๋ยวน้องเอพาไปขั้นตอนยืนยันความสนใจอย่างปลอดภัยก่อนนะครับ\"}",
    redactedProviderOutput:
      "{\"finalAnswerTh\":\"สำหรับครอบครัว ถ้าเน้นความคล่องตัวในเมือง คันที่ 1 จะได้ความประหยัดและขนาดที่ใช้งานง่ายกว่าครับ ส่วนคันที่ 2 จะเด่นเรื่องพื้นที่โดยสารและความนุ่มนวลในการเดินทางครับ ทั้งสองคันยังต้องตรวจสภาพจริงและประวัติเข้าศูนย์ก่อนตัดสินใจนะครับ ถ้าสนใจคันไหน เดี๋ยวน้องเอพาไปขั้นตอนยืนยันความสนใจอย่างปลอดภัยก่อนนะครับ\"}",
    requestIdHash: "test-v144g",
    modelId: "gemini-3.5-flash",
  };
});

try {
  const blocked = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: PREVIOUS_WRAPPER_PROMPT,
    firebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
    readEnv: (key) => env[key],
    pilotOrchestration,
  });
  ok(
    "previous wrapper prompt is blocked at owner controlled zone gate",
    blocked.payload.realProviderGateReason === "owner_controlled_zone_not_allowed"
  );
  ok("blocked path keeps provider network false", blocked.payload.realProviderNetwork === false);
  ok("blocked path preserves skipGemini true", blocked.payload.skipGemini === true);
  ok("blocked path does not invoke gemini caller", geminiCallCount === 0);

  const allowed = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: ZONE_ALLOWED_WRAPPER_PROMPT,
    firebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
    readEnv: (key) => env[key],
    pilotOrchestration,
  });
  ok("updated wrapper prompt reaches real provider call path", geminiCallCount === 1);
  ok(
    "updated wrapper prompt clears owner controlled zone gate block",
    allowed.payload.realProviderGateReason !== "owner_controlled_zone_not_allowed"
  );
} finally {
  resetUserVisibleGeminiCallerForTests();
}

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.4G", root.version === "v14.4G");
  const diagnosis = root.ownerControlledZoneDiagnosis as Record<string, unknown>;
  ok(
    "fixture captures prompt-driven zone mismatch root cause",
    diagnosis?.previousWrapperPromptZone === "not_allowed" &&
      diagnosis?.updatedWrapperPromptZone === "compare_car_types" &&
      diagnosis?.expectedBlockedGateReason === "owner_controlled_zone_not_allowed"
  );
  const nextRunPolicy = root.nextOwnerRunPolicy as Record<string, unknown>;
  ok(
    "fixture locks next run namespace to v14.3AL without retrying v14.3AK",
    nextRunPolicy?.retryV143akAllowed === false &&
      nextRunPolicy?.nextRunIdIfAuthorizedLater === "v14.3AL"
  );
  ok(
    "fixture final decision maps to wrapper context review",
    root.finalDecision === "NEED REVIEW — OWNER CONTROLLED ZONE CONTEXT MISSING FROM WRAPPER"
  );
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok(
    "package has test:v14.4G script",
    scripts["test:v14.4G"] ===
      "tsx scripts/test-v144G-owner-controlled-zone-gate-diagnosis.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.4G owner-controlled zone diagnosis - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

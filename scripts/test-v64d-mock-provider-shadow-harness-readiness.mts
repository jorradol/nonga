/**
 * v6.4D — Mock Provider / Shadow Harness Readiness (static + offline runtime validation)
 * npm run test:v64d-mock-provider-shadow-harness-readiness
 */
import { readFileSync } from "node:fs";
import { DEFAULT_AI_PROVIDER_STATUS } from "../src/config/aiControl/aiControlDefaults.ts";
import {
  AI_SHADOW_HARNESS_SCENARIOS,
  runAiShadowHarnessFullMatrix,
  runAiShadowHarnessScenario,
} from "../src/services/ai/aiShadowHarness.ts";
import {
  applyMockOutputGuardChain,
  deterministicMockHash,
  detectForbiddenPromptFields,
  runMockAiProvider,
} from "../src/services/ai/mockAiProvider.ts";

const DOC_PATH = "docs/v6.4D-mock-provider-shadow-harness-readiness.md";
const V64B_DOC = "docs/v6.4B-ai-control-model-types-static-readiness.md";
const MOCK_PATH = "src/services/ai/mockAiProvider.ts";
const HARNESS_PATH = "src/services/ai/aiShadowHarness.ts";
const PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const APP_PATH = "src/App.tsx";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_DATA_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis|Revo|Vigo)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V|Accord)\b/i,
];

const HEAD_SHA = "7eba721538861811a8f4d7708f10931164ae81cb";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4D Mock Provider / Shadow Harness Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const mockSrc = readFileSync(MOCK_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const panelSrc = readFileSync(PANEL_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const v64bDoc = readFileSync(V64B_DOC, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64d-mock-provider-shadow-harness-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const combinedSrc = mockSrc + harnessSrc + selfSrc;

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc ---
{
  ok("readiness doc exists", doc.length > 3000);
  ok("doc v6.4D label", doc.includes("v6.4D"));
  ok(
    "doc mock provider shadow harness",
    /mock provider.*shadow harness/i.test(doc)
  );
  ok("doc HEAD 7eba721", doc.includes(HEAD_SHA) || doc.includes("7eba721"));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc mock shadow only", /mock\/shadow|mock shadow/i.test(doc));
  ok("doc real gemini forbidden", /real Gemini.*forbidden|not enabled/i.test(doc));
  ok("doc module map mockAiProvider", doc.includes("mockAiProvider.ts"));
  ok("doc module map aiShadowHarness", doc.includes("aiShadowHarness.ts"));
}

// --- source static guards ---
{
  ok("mock module exists", mockSrc.length > 1000);
  ok("harness module exists", harnessSrc.length > 800);
  ok("mock no generateContent", !/generateContent\s*\(/.test(mockSrc));
  ok("harness no generateContent", !/generateContent\s*\(/.test(harnessSrc));
  ok("mock no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(mockSrc));
  ok("harness no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(harnessSrc));
  ok("mock no gemini import", !/from\s+['"]@google\/generative-ai['"]/.test(mockSrc));
  ok("mock no firestore", !/\b(setDoc|getDocs|writeBatch)\b/.test(mockSrc));
  ok("harness no firestore", !/\b(setDoc|getDocs|writeBatch)\b/.test(harnessSrc));
  ok("mock no localStorage persist", !/\blocalStorage\b/.test(mockSrc));
  ok("mock uses v64b defaults", mockSrc.includes("aiControlDefaults.ts"));
  ok("mock uses output guard", mockSrc.includes("passesOutputGuard"));
  ok("mock realGeminiEnabled false type", /realGeminiEnabled:\s*false/.test(mockSrc));
  ok("mock network false", /network:\s*false/.test(mockSrc));
  ok("mock persistence false", /persistence:\s*false/.test(mockSrc));
  ok("mock not wired comment", /Not wired to production chat/i.test(mockSrc));
  ok("harness synthetic fixtures", /ยี่ห้อตัวอย่าง/.test(harnessSrc));
  ok("harness scenario matrix", harnessSrc.includes("AI_SHADOW_HARNESS_SCENARIOS"));
}

// --- integration boundary ---
{
  ok("app no mockAiProvider import", !appSrc.includes("mockAiProvider"));
  ok("app no aiShadowHarness import", !appSrc.includes("aiShadowHarness"));
  ok("panel still read-only", panelSrc.includes('data-readonly="true"'));
  ok("panel no button", !/<button\b/.test(panelSrc));
  ok("panel provider off", /AI provider is OFF/i.test(panelSrc));
}

// --- runtime mock provider ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");

  const blocked = detectForbiddenPromptFields({
    brand: "ยี่ห้อตัวอย่าง",
    phone: "0812345678",
    fullUid: "abcdefghijklmnopqrstuvwxyz12",
  });
  ok("forbidden phone blocked", blocked.includes("phone"));
  ok("forbidden fullUid blocked", blocked.includes("fullUid"));

  const offPath = runMockAiProvider(
    {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: {
        brand: "ยี่ห้อตัวอย่าง",
        model: "รุ่นตัวอย่าง",
        sanitizedPublicDescription: "SUV ไฮบริด เบาะหนัง Cruise Control",
      },
      sessionSeed: "runtime-off",
    },
    { shadowSimulation: false }
  );
  ok("off path providerKind disabled", offPath.metadata.providerKind === "disabled");
  ok("off path mock false", offPath.metadata.mock === false);
  ok("off path real gemini false", offPath.metadata.realGeminiEnabled === false);

  const mockPath = runMockAiProvider(
    {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: {
        brand: "ยี่ห้อตัวอย่าง",
        model: "รุ่นตัวอย่าง",
        sanitizedPublicDescription: "SUV ไฮบริด เบาะหนัง Cruise Control",
      },
      sessionSeed: "runtime-mock",
    },
    { shadowSimulation: true }
  );
  ok("shadow path providerKind mock", mockPath.metadata.providerKind === "mock");
  ok("shadow path mock true", mockPath.metadata.mock === true);
  ok("shadow path shadow true", mockPath.metadata.shadow === true);
  ok("shadow path text non-empty", mockPath.text.trim().length > 0);

  const hashA = deterministicMockHash({
    surfaceId: "sellerListingCopy",
    fields: { brand: "ยี่ห้อตัวอย่าง", model: "รุ่นตัวอย่าง" },
    sessionSeed: "repeat",
  });
  const hashB = deterministicMockHash({
    surfaceId: "sellerListingCopy",
    fields: { brand: "ยี่ห้อตัวอย่าง", model: "รุ่นตัวอย่าง" },
    sessionSeed: "repeat",
  });
  ok("deterministic hash stable", hashA === hashB);

  const repeatOne = runMockAiProvider(
    {
      surfaceId: "sellerListingCopy",
      fields: {
        brand: "ยี่ห้อตัวอย่าง",
        model: "รุ่นตัวอย่าง",
        sanitizedPublicDescription: "SUV ไฮบริด เบาะหนัง Cruise Control",
      },
      sessionSeed: "repeat-run",
    },
    { shadowSimulation: true }
  );
  const repeatTwo = runMockAiProvider(
    {
      surfaceId: "sellerListingCopy",
      fields: {
        brand: "ยี่ห้อตัวอย่าง",
        model: "รุ่นตัวอย่าง",
        sanitizedPublicDescription: "SUV ไฮบริด เบาะหนัง Cruise Control",
      },
      sessionSeed: "repeat-run",
    },
    { shadowSimulation: true }
  );
  ok(
    "mock provider deterministic text",
    repeatOne.text === repeatTwo.text &&
      repeatOne.metadata.deterministicHash === repeatTwo.metadata.deterministicHash
  );

  const guardChain = applyMockOutputGuardChain(
    "รถไม่เคยชนจริง 100% ประหยัดสุดๆ ล้านเปอร์เซ็นต์"
  );
  ok("guard chain fails bad text", !guardChain.guardPass);
  ok("guard chain uses fallback", guardChain.fallbackUsed);
  ok("guard chain fallback text safe", guardChain.text.length > 0);
}

// --- shadow harness matrix ---
{
  ok("scenario count 6", AI_SHADOW_HARNESS_SCENARIOS.length === 6);
  const matrix = runAiShadowHarnessFullMatrix();
  ok("matrix length 6", matrix.length === 6);
  for (const row of matrix) {
    ok(`harness ${row.scenarioId}`, row.pass, row.failures.join("; "));
  }
  const sh02 = runAiShadowHarnessScenario("SH-02-golden-seller-weave-mock");
  ok("SH-02 pass", sh02.pass);
  ok(
    "SH-02 golden hook or weave",
    /จุดที่น่าดู|จุดที่น่าสนใจ|mock-shadow/i.test(sh02.result.text)
  );
}

// --- cross-ref v64b ---
{
  ok("v64b doc exists", v64bDoc.includes("v6.4B"));
  ok("v64b rollout v64d", /v6\.4D|mock provider/i.test(v64bDoc));
}

// --- no PII in doc ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production nongbot.org url", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate data ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("combined no generateContent call", !/generateContent\s*\(/.test(combinedSrc));
}

// --- package.json ---
{
  ok(
    "package v64d script",
    pkg.includes("test:v64d-mock-provider-shadow-harness-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v64d-mock-provider-shadow-harness-readiness.mts")
  );
}

console.log("\nDone v6.4D Mock Provider / Shadow Harness Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);

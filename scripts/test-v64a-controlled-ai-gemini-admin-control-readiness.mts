/**
 * v6.4A — Controlled AI/Gemini Admin Control Readiness (static validation only)
 * npm run test:v64a-controlled-ai-gemini-admin-control-readiness
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.4A-controlled-ai-gemini-admin-control-readiness.md";
const V60B_DOC = "docs/v6.0B-ai-first-control-flags-mock-runtime-plan.md";
const V60H_DOC =
  "docs/v6.0H-real-ai-provider-readiness-staging-enablement-plan.md";
const V63A_DOC = "docs/v6.3A-buyer-friendly-listing-copy-readiness.md";

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
  /\bFord\s+Everest\b/i,
  /\bMitsubishi\s+Pajero\b/i,
  /\bIsuzu\s+(?:D-Max|Mu-X)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "225c99d2cc83e06563af363ee886f9441796f953";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4A Controlled AI/Gemini Admin Control Readiness ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v64a-controlled-ai-gemini-admin-control-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v60bDoc = readFileSync(V60B_DOC, "utf8");
const v60hDoc = readFileSync(V60H_DOC, "utf8");
const v63aDoc = readFileSync(V63A_DOC, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden fields[\s\S]*?### Sanitization pipeline/,
  "### Sanitization pipeline"
);

// --- doc exists + v6.4A ---
{
  ok("readiness doc exists", doc.length > 8000);
  ok("doc v6.4A label", doc.includes("v6.4A"));
  ok(
    "doc controlled ai gemini admin control readiness",
    /controlled ai.*gemini.*admin control readiness/i.test(doc)
  );
  ok(
    "doc docs tests package only",
    /docs\/tests\/package only/i.test(docLower)
  );
  ok("doc HEAD 225c99d", doc.includes(HEAD_SHA) || doc.includes("225c99d"));
  ok("doc planning not runtime", /planning only|not in v6\.4A/i.test(docLower));
  ok("doc no real gemini", /no real Gemini|real Gemini.*forbidden|❌.*real Gemini/i.test(docLower));
}

// --- control plane: default OFF ---
{
  ok("control plane section", /AI\/Gemini Control Plane/i.test(doc));
  ok("provider state OFF", /\bOFF\b/.test(doc));
  ok("provider state MOCK", /\bMOCK\b/.test(doc));
  ok("provider state STAGING_REAL", /STAGING_REAL/.test(doc));
  ok("provider state DISABLED", /\bDISABLED\b/.test(doc));
  ok("default OFF", /default.*OFF|default OFF/i.test(doc));
  ok("staging only real provider", /staging-only|staging only/i.test(docLower));
  ok("kill switch", /kill switch/i.test(docLower));
  ok("fallback deterministic", /fallback deterministic|deterministic fallback/i.test(docLower));
  ok(
    "shadow flag false only",
    /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc)
  );
}

// --- role model: superadmin vs admin ---
{
  ok("role model section", /Role Model.*Superadmin vs Admin/i.test(doc));
  ok("permission matrix", /Permission matrix/i.test(doc));
  ok("superadmin real provider", /Superadmin.*real AI provider|เปิด\/ปิด real AI provider/i.test(doc));
  ok("admin no real provider enable", /Admin.*❌|ไม่มีสิทธิ์เปิด real provider/i.test(doc));
  ok("superadmin allowlist", /allowlist tester/i.test(docLower));
  ok("superadmin cost guard", /cost guard|daily cap/i.test(docLower));
  ok("superadmin kill switch", /kill switch.*Superadmin|Superadmin.*kill switch/i.test(doc));
  ok("admin view status", /ดูสถานะ AI|OFF.*MOCK.*STAGING_REAL/i.test(doc));
  ok("admin view usage summary", /usage summary/i.test(docLower));
  ok("admin view guard fail fallback", /guard fail.*fallback|fallback count/i.test(docLower));
  ok("no secrets for admin", /ไม่เห็น secrets|❌ never.*secret/i.test(docLower));
  ok("no full UID", /no full UID|full UID.*❌|masked only/i.test(docLower));
  ok("no raw prompt PII", /no raw prompt|raw prompt.*PII|ห้าม log prompt/i.test(docLower));
}

// --- surface control ---
{
  ok("surface control section", /Surface Control/i.test(doc));
  ok("surface buyer-friendly preview", /buyer-friendly detail preview/i.test(doc));
  ok("surface in-chat featureWeave", /in-chat featureWeave|featureWeave/i.test(doc));
  ok("surface seller listing copy", /seller listing copy/i.test(doc));
  ok("surface buyer chat answer", /buyer chat answer/i.test(doc));
  ok("surface recommendation ranking", /recommendation.*ranking|ranking explanation/i.test(doc));
  ok("pilot S-01 S-03 staging allowlist", /S-01.*S-03|buyer-friendly.*golden seller/i.test(doc));
}

// --- cost control ---
{
  ok("cost control section", /Cost Control/i.test(doc));
  ok("daily request cap", /daily request cap/i.test(docLower));
  ok("per-surface cap", /per-surface cap/i.test(docLower));
  ok("per-user session cap", /per-user.*session cap|per-user\/session/i.test(docLower));
  ok("cost guard usd", /cost guard/i.test(docLower));
  ok("per-listing cache", /per-listing cache/i.test(docLower));
  ok("no repeat generation", /no repeat generation/i.test(docLower));
  ok("fallback when cap reached", /fallback when cap|cap exceeded/i.test(docLower));
  ok("usage summary no sensitive", /usage summary.*no sensitive|no sensitive data/i.test(docLower));
}

// --- prompt/data boundary ---
{
  ok("prompt data boundary section", /Prompt\/Data Boundary/i.test(doc));
  ok("public-safe brand model year", /brand.*model.*year|PS-01/i.test(doc));
  ok("public-safe body fuel price mileage", /body type|fuel type|mileage/i.test(doc));
  ok("public description sanitize", /public description.*sanitiz/i.test(docLower));
  ok("forbidden licensePlate", /licensePlate|ป้ายทะเบียน/i.test(doc));
  ok("forbidden phone", /phone|เบอร์โทร/i.test(docLower));
  ok("forbidden LINE", /LINE/i.test(doc));
  ok("forbidden full UID", /full UID|Firebase UID/i.test(doc));
  ok("forbidden wholesale", /wholesale/i.test(docLower));
  ok("forbidden secret env", /secret.*env|env values/i.test(docLower));
  ok("forbidden raw image URL", /raw image URL/i.test(doc));
  ok("forbidden admin notes", /admin notes/i.test(docLower));
  ok("forbidden raw prompt dump", /raw prompt dump/i.test(docLower));
}

// --- output guard ---
{
  ok("output guard section", /Output Guard/i.test(doc));
  ok("guard no forbidden claims", /no forbidden claims|ไม่เคยชน/i.test(doc));
  ok("guard no hype", /no hype|ประหยัดแน่นอน/i.test(doc));
  ok("guard no PII", /no PII/i.test(doc));
  ok("guard no price finance claim", /price\/finance claim|ฟรีดาวน์/i.test(doc));
  ok("guard no km/l without data", /km\/l unless real data/i.test(docLower));
  ok("guard no accident ownership", /accident.*condition|ownership claims/i.test(docLower));
  ok("guard no secret raw URL", /secret\/raw URL/i.test(doc));
  ok("guard no mixed corrupted tokens", /mixed Thai\/Latin corrupted/i.test(doc));
  ok("guard fail fallback", /guard fail.*fallback|IF any fail.*fallback/i.test(docLower));
}

// --- audit log redaction ---
{
  ok("audit log section", /Audit Log Readiness/i.test(doc));
  ok("audit masked actor", /masked.*actor|actor_id.*masked/i.test(docLower));
  ok("audit previous new status", /previous_status|previous status.*new status/i.test(docLower));
  ok("audit reason field", /reason/i.test(docLower));
  ok("audit no full UID", /no full UID/i.test(docLower));
  ok("audit no secret", /no secret/i.test(docLower));
  ok("audit no raw prompt", /no raw prompt/i.test(docLower));
  ok("audit surface field", /surface/i.test(docLower));
}

// --- admin UI readiness (future cards) ---
{
  ok("admin UI readiness section", /Admin UI Readiness/i.test(doc));
  ok("ui card provider status", /AI Provider Status/i.test(doc));
  ok("ui card surface controls", /Surface Controls/i.test(doc));
  ok("ui card usage cost guard", /Usage.*Cost Guard/i.test(doc));
  ok("ui card guard fail fallback monitor", /Guard Fail.*Fallback Monitor/i.test(doc));
  ok("ui card kill switch", /Kill Switch/i.test(doc));
  ok("ui card audit trail", /Audit Trail/i.test(doc));
  ok("ui card staging warning", /Staging-only Warning/i.test(doc));
  ok("ui card role permission matrix", /Role Permission Matrix/i.test(doc));
  ok("no real admin UI in v64a", /ยังไม่สร้างหน้า UI จริง|not in v6\.4A/i.test(doc));
}

// --- rollout phases ---
{
  ok("rollout phases section", /Rollout Phases/i.test(doc));
  ok("phase v64a docs tests only", /v6\.4A.*docs\/tests\/package only/i.test(doc));
  ok("phase v64b control model types", /v6\.4B.*control model/i.test(doc));
  ok("phase v64c admin read-only panel", /v6\.4C.*admin read-only/i.test(doc));
  ok("phase v64d mock shadow harness", /v6\.4D.*mock provider/i.test(doc));
  ok("phase v64e staging real gemini pilot", /v6\.4E.*staging real Gemini/i.test(doc));
  ok("phase v64e allowlist cap approval", /allowlist.*cap.*approval/i.test(docLower));
}

// --- forbidden / guardrails ---
{
  ok("forbidden actions section", /Forbidden Actions.*v6\.4A/i.test(doc));
  ok("forbidden no production", /production/i.test(docLower));
  ok("forbidden no real gemini api", /real Gemini|Gemini API/i.test(doc));
  ok(
    "forbidden shadow flag true",
    /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true.*forbidden|ห้ามตั้ง.*true/i.test(doc)
  );
  ok("forbidden no gcloud secrets", /gcloud secrets/i.test(docLower));
  ok("forbidden no env update", /env update/i.test(docLower));
  ok("forbidden no firestore rules deploy", /Firestore rules deploy/i.test(doc));
  ok("forbidden no cloud run deploy", /Cloud Run deploy/i.test(doc));
  ok("forbidden no db persist", /DB persist/i.test(doc));
  ok("forbidden no lead payment reveal", /lead.*payment.*reveal|payment.*reveal.*outcome/i.test(docLower));
  ok("forbidden no import cleanup", /import.*cleanup/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no public prompt route", /public prompt route/i.test(docLower));
  ok("forbidden no public debug endpoint", /public debug endpoint/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.4A/i.test(doc));
}

// --- no PII/secrets/real car data in doc ---
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
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car data ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of FIREBASE_UID_PATTERNS) {
    ok(`doc no firebase uid ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- cross-ref v60b / v60h / v63a ---
{
  ok("v60b kill switch", /NONGA_AI_EMERGENCY_KILL_SWITCH|kill switch/i.test(v60bDoc));
  ok("v60b production default off", /production.*default.*off/i.test(v60bDoc.toLowerCase()));
  ok("v60h staging only real", /staging.*closed pilot|staging-only/i.test(v60hDoc.toLowerCase()));
  ok("v60h budget guard", /budget.*cost guard|Budget.*Cost Guard/i.test(v60hDoc));
  ok("v63a prompt boundary", /licensePlate|wholesale|raw image URL/i.test(v63aDoc));
  ok("v63a fallback deterministic", /fallback.*deterministic|deterministic/i.test(v63aDoc.toLowerCase()));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v64a script",
    pkg.includes("test:v64a-controlled-ai-gemini-admin-control-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64a-controlled-ai-gemini-admin-control-readiness.mts"
    )
  );
}

console.log(
  "\nDone v6.4A Controlled AI/Gemini Admin Control Readiness tests."
);
if (process.exitCode) process.exit(process.exitCode);

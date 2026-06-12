/**
 * v6.4H — Real Pilot Dry-Run Gate Plan (static validation only)
 * npm run test:v64h-real-pilot-dry-run-gate-plan
 */
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";

const DOC_PATH = "docs/v6.4H-real-pilot-dry-run-gate-plan.md";
const V64G_DOC = "docs/v6.4G-ai-control-contract-safety-evidence-readiness.md";
const V64F_DOC =
  "docs/v6.4F-real-provider-adapter-skeleton-disabled-by-default.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const APP_PATH = "src/App.tsx";

const V64H_TOUCHED = [DOC_PATH, "scripts/test-v64h-real-pilot-dry-run-gate-plan.mts"];

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

const GEMINI_ACTIVATION_CLAIM_PATTERNS = [
  /gemini\s+is\s+live/i,
  /gemini\s+is\s+active/i,
  /gemini\s+activated/i,
  /real\s+gemini\s+enabled\s+now/i,
  /pilot\s+is\s+active/i,
  /connected\s+to\s+real\s+gemini\s+successfully/i,
];

const HEAD_SHA = "114e6d069cef81c14b40ee9c538d32f5fb78be16";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4H Real Pilot Dry-Run Gate Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64gDoc = readFileSync(V64G_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64h-real-pilot-dry-run-gate-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const combinedTouched = V64H_TOUCHED.map((p) => readFileSync(p, "utf8")).join(
  "\n"
);
/** Test-script source without assertion lines (avoids self-match on guard labels) */
const selfCodeOnly = selfSrc
  .split("\n")
  .filter((line) => {
    const t = line.trimStart();
    if (t.startsWith("ok(") || t.startsWith('ok("')) return false;
    if (t.startsWith('"') && t.endsWith(",")) return false;
    if (/^\!\/.*\/\.test/.test(t)) return false;
    return true;
  })
  .join("\n");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- 1–3. docs and adapter exist ---
{
  ok("v6.4H doc exists", doc.length > 6000);
  ok("doc v6.4H label", doc.includes("v6.4H"));
  ok("v6.4G doc exists", existsSync(V64G_DOC) && v64gDoc.includes("v6.4G"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
  ok("v6.4F doc exists", existsSync(V64F_DOC));
}

// --- 4–8. docs safety positioning ---
{
  ok("doc HEAD 114e6d0", doc.includes(HEAD_SHA) || doc.includes("114e6d0"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no gemini activation",
    /does not activate Gemini|ไม่ใช่การเปิด pilot|plan only/i.test(doc)
  );
  ok(
    "doc no secret env read",
    /does not add secrets|no secret|no env/i.test(docLower)
  );
  ok(
    "doc no cost-bearing path",
    /does not create a cost-bearing|no real AI cost|no AI cost/i.test(doc)
  );
  ok("doc dry-run gate plan", /dry-run gate plan/i.test(doc));
  ok("doc purpose section", /Purpose/i.test(doc));
}

// --- 9–18. gate checklist ---
{
  ok("doc owner approval gate", /Owner approval gate/i.test(doc));
  ok("doc staging-only gate", /Staging-only scope gate/i.test(doc));
  ok("doc allowlist gate", /Allowlist gate/i.test(doc));
  ok("doc cost cap gate", /Cost cap gate/i.test(doc));
  ok("doc kill switch gate", /Kill switch gate/i.test(doc));
  ok(
    "doc secret manager path gate",
    /Secret Manager path approval gate/i.test(doc)
  );
  ok(
    "doc no raw prompt PII gate",
    /No raw prompt.*PII logging gate|raw prompt.*PII/i.test(doc)
  );
  ok("doc redaction gate", /Redaction verification gate/i.test(doc));
  ok("doc fallback gate", /Fallback behavior gate/i.test(doc));
  ok("doc rollback gate", /Rollback gate/i.test(doc));
  ok(
    "doc separate deploy approval gate",
    /Separate deploy approval gate/i.test(doc)
  );
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc dry-run sequence", /Pilot Dry-Run Sequence/i.test(doc));
  ok("doc mock-vs-real gate", /Mock-vs-real comparison gate/i.test(doc));
  ok("doc monitoring gate", /Monitoring gate/i.test(doc));
  ok("doc post-pilot review gate", /Post-pilot review gate/i.test(doc));
}

// --- 19–20. not done / future boundary ---
{
  ok("doc not done yet", /Not Done Yet/i.test(doc));
  ok("doc no gemini sdk not done", /Gemini SDK.*not added|no Gemini SDK/i.test(doc));
  ok("doc v6.4I boundary", /v6\.4I/i.test(doc));
  ok("doc v6.4H not implementation", /forbidden in v6\.4H|not in v6\.4H/i.test(doc));
}

// --- 21–25. static guards ---
{
  ok("adapter no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc));
  ok("self no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(selfSrc));
  ok("combined no generateContent", !/generateContent\s*\(/.test(combinedTouched + adapterSrc));
  ok("combined no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(combinedTouched + adapterSrc));
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud access",
    !/gcloud\s+secrets/.test(selfCodeOnly + adapterSrc)
  );
  ok(
    "self no execSync gcloud",
    !/execSync\s*\(\s*[`'"]gcloud/.test(selfCodeOnly + adapterSrc)
  );
}

// --- 26–29. integration / no mutation ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
}

// --- runtime contract unchanged ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("admin cannot enable", adminCanEnableRealProvider() === false);
  ok("adapter default disabled", REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false);
  ok(
    "production forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  const result = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("adapter invoke blocked", result.blocked === true);
  ok("adapter realGeminiEnabled false", result.metadata.realGeminiEnabled === false);
  ok("adapter networkCallMade false", result.metadata.networkCallMade === false);
}

// --- v6.4G evidence reference ---
{
  ok("doc references v6.4G", doc.includes("v6.4G"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
  ok("doc references v6.4E", doc.includes("v6.4E"));
  ok("v64g contract evidence test exists", existsSync(V64G_DOC));
}

// --- no activation claims ---
{
  for (const pat of GEMINI_ACTIVATION_CLAIM_PATTERNS) {
    ok(`doc no activation claim ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
}

// --- no PII in new files ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no secret ${pat.source.slice(0, 12)}`, !pat.test(selfSrc));
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

// --- 30. package script ---
{
  ok(
    "package v64h script",
    pkg.includes("test:v64h-real-pilot-dry-run-gate-plan")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v64h-real-pilot-dry-run-gate-plan.mts")
  );
}

console.log("\nDone v6.4H Real Pilot Dry-Run Gate Plan tests.");
if (process.exitCode) process.exit(process.exitCode);

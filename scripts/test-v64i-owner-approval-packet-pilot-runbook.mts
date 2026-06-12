/**
 * v6.4I — Owner Approval Packet / Pilot Runbook (static validation only)
 * npm run test:v64i-owner-approval-packet-pilot-runbook
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

const DOC_PATH = "docs/v6.4I-owner-approval-packet-pilot-runbook.md";
const V64H_DOC = "docs/v6.4H-real-pilot-dry-run-gate-plan.md";
const V64G_DOC = "docs/v6.4G-ai-control-contract-safety-evidence-readiness.md";
const V64F_DOC =
  "docs/v6.4F-real-provider-adapter-skeleton-disabled-by-default.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const V64H_TEST = "scripts/test-v64h-real-pilot-dry-run-gate-plan.mts";
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

const AUTO_AUTH_CLAIM_PATTERNS = [
  /automatically\s+authoriz(e|es)\s+deploy/i,
  /this\s+document\s+is\s+approval\s+to\s+deploy/i,
  /packet\s+approves\s+deploy/i,
  /signing\s+this\s+packet\s+activates\s+gemini/i,
];

const HEAD_SHA = "0f0e4c1404e75455848c4e58cf235af86d627aa8";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4I Owner Approval Packet / Pilot Runbook ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64hDoc = readFileSync(V64H_DOC, "utf8");
const v64gDoc = readFileSync(V64G_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const v64hTestSrc = readFileSync(V64H_TEST, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64i-owner-approval-packet-pilot-runbook.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

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

// --- 1–4. docs and adapter exist ---
{
  ok("v6.4I doc exists", doc.length > 8000);
  ok("doc v6.4I label", doc.includes("v6.4I"));
  ok("v6.4H doc exists", existsSync(V64H_DOC) && v64hDoc.includes("v6.4H"));
  ok("v6.4G doc exists", existsSync(V64G_DOC) && v64gDoc.includes("v6.4G"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
  ok("v6.4F doc exists", existsSync(V64F_DOC));
}

// --- 5–12. docs safety positioning ---
{
  ok("doc HEAD 0f0e4c1", doc.includes(HEAD_SHA) || doc.includes("0f0e4c1"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no gemini activation",
    /does not activate real Gemini|ไม่ใช่การเปิด pilot/i.test(doc)
  );
  ok("doc no secrets add", /does not add API key|does not add secrets/i.test(doc));
  ok("doc no env read", /does not read env/i.test(doc));
  ok("doc no runtime wiring", /does not wire real provider/i.test(doc));
  ok(
    "doc no cost-bearing path",
    /does not create a cost-bearing|AI cost.*zero/i.test(doc)
  );
  ok(
    "doc no automatic future authorization",
    /does not authorize any future deploy automatically/i.test(doc)
  );
}

// --- 13–24. packet / runbook content ---
{
  ok("doc owner decision summary", /Owner Decision Summary/i.test(doc));
  ok("doc approval packet checklist", /Approval Packet Checklist/i.test(doc));
  ok("doc pilot runbook plan only", /Pilot Runbook.*Plan Only/i.test(doc));
  ok("doc runbook not execute v64i", /does not execute in v6\.4I/i.test(doc));
  ok("doc GO NO-GO HOLD template", /GO.*NO-GO.*HOLD|NO-GO.*HOLD/i.test(doc));
  ok(
    "doc default NO-GO",
    /default decision remains NO-GO|default remains NO-GO/i.test(doc)
  );
  ok("doc success criteria", /Success Criteria/i.test(doc));
  ok("doc failure stop criteria", /Failure.*Stop Criteria/i.test(doc));
  ok("doc rollback plan", /Rollback Plan/i.test(doc));
  ok(
    "doc non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to deploy/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok(
    "doc separate deploy approval",
    /Separate deploy approval|separate deploy approval/i.test(doc)
  );
  ok(
    "doc separate activation approval",
    /Explicit real provider activation approval|separate explicit real provider activation/i.test(
      doc
    )
  );
  ok("doc AP-01 pilot scope", /AP-01.*Pilot scope/i.test(doc));
  ok("doc AP-15 deploy ack", /AP-15.*deploy approval/i.test(doc));
}

// --- 25–29. static guards ---
{
  ok("adapter no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc));
  ok("self no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(selfCodeOnly));
  ok("v64h test no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(v64hTestSrc));
  ok(
    "combined no generateContent",
    !/generateContent\s*\(/.test(selfCodeOnly + adapterSrc + v64hTestSrc)
  );
  ok(
    "combined no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(selfCodeOnly + adapterSrc)
  );
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud access",
    !/gcloud\s+secrets/.test(selfCodeOnly + adapterSrc)
  );
}

// --- 30–33. integration boundary ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
}

// --- runtime contract ---
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

// --- non-auto-authorization ---
{
  for (const pat of AUTO_AUTH_CLAIM_PATTERNS) {
    ok(`doc no auto auth claim ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- v6.4H alignment ---
{
  ok("doc references v6.4H", doc.includes("v6.4H"));
  ok("doc references v6.4G", doc.includes("v6.4G"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
  ok("v64h test script exists", existsSync(V64H_TEST));
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

// --- 34. package script ---
{
  ok(
    "package v64i script",
    pkg.includes("test:v64i-owner-approval-packet-pilot-runbook")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v64i-owner-approval-packet-pilot-runbook.mts")
  );
}

console.log("\nDone v6.4I Owner Approval Packet / Pilot Runbook tests.");
if (process.exitCode) process.exit(process.exitCode);

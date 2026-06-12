/**
 * v6.4V — Limited Staging Pilot Review Approval Packet (static validation only)
 * npm run test:v64v-limited-staging-pilot-review-approval-packet
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
import {
  SYNTHETIC_REDACTION_FIXTURES,
  assertNoForbiddenSensitiveContent,
} from "../src/services/ai/redactionTestFixtures.ts";

const DOC_PATH = "docs/v6.4V-limited-staging-pilot-review-approval-packet.md";
const V64U_DOC =
  "docs/v6.4U-pilot-monitoring-kill-switch-verification-approval-packet.md";
const V64T_DOC =
  "docs/v6.4T-staging-real-provider-pilot-smoke-final-go-no-go-approval-packet.md";
const V64S_DOC =
  "docs/v6.4S-runtime-redaction-integration-final-go-no-go-approval-packet.md";
const V64R_DOC =
  "docs/v6.4R-synthetic-invocation-final-go-no-go-approval-packet.md";
const V64Q_DOC =
  "docs/v6.4Q-staging-secret-wiring-final-go-no-go-approval-packet.md";
const V64K_DOC = "docs/v6.4K-redaction-logging-contract-readiness.md";
const V64M_FIXTURE = "src/services/ai/redactionTestFixtures.ts";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const APP_PATH = "src/App.tsx";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
];

const SECRET_LOOKING_PLACEHOLDER_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{10,}/,
  /\bsk-[a-zA-Z0-9]{16,}\b/,
  /your[_-]?gemini[_-]?api[_-]?key/i,
];

const REAL_PROJECT_ID_PATTERNS = [
  /\bnonga-ce93c\b/i,
  /projects\/nonga-[a-z0-9]+\/secrets\//i,
];

const REAL_PHONE_PATTERNS = [/\b0[689]\d{8}\b/];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
];

const REAL_LISTING_SAMPLE_PATTERNS = [
  /รถมือสอง\s+ราคา\s+\d{5,}/,
  /เจ้าของขายเอง\s+โทร/i,
];

const AUTO_PILOT_AUTH_PATTERNS = [
  /this\s+packet\s+is\s+approval\s+to\s+start\s+a\s+limited\s+staging\s+pilot/i,
  /v6\.4V\s+approves\s+limited\s+pilot\s+automatically/i,
  /packet\s+authorizes\s+post-pilot\s+review\s+execution\s+automatically/i,
];

const HEAD_SHA = "e58636a3ad182b8d8296bb90fe226f5794caeb92";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4V Limited Staging Pilot Review Approval Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64uDoc = readFileSync(V64U_DOC, "utf8");
const v64tDoc = readFileSync(V64T_DOC, "utf8");
const v64sDoc = readFileSync(V64S_DOC, "utf8");
const v64rDoc = readFileSync(V64R_DOC, "utf8");
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64v-limited-staging-pilot-review-approval-packet.mts",
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

// --- 1–9. docs and modules exist ---
{
  ok("v6.4V doc exists", doc.length > 6000);
  ok("doc v6.4V label", doc.includes("v6.4V"));
  ok("v6.4U doc exists", existsSync(V64U_DOC) && v64uDoc.includes("v6.4U"));
  ok("v6.4T doc exists", existsSync(V64T_DOC) && v64tDoc.includes("v6.4T"));
  ok("v6.4S doc exists", existsSync(V64S_DOC) && v64sDoc.includes("v6.4S"));
  ok("v6.4R doc exists", existsSync(V64R_DOC) && v64rDoc.includes("v6.4R"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 10–20. docs safety positioning ---
{
  ok("doc HEAD e58636a", doc.includes(HEAD_SHA) || doc.includes("e58636a"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no limited pilot start",
    /does not start a limited staging pilot/i.test(doc)
  );
  ok(
    "doc no post-pilot review execution",
    /does not execute post-pilot review/i.test(doc)
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok(
    "doc no network execution",
    /does not execute network calls/i.test(doc)
  );
  ok(
    "doc no runtime monitoring logging",
    /does not add runtime monitoring\/logging/i.test(doc)
  );
  ok("doc no AI log persistence", /does not persist AI logs/i.test(doc));
  ok(
    "doc no analytics event creation",
    /does not create analytics events/i.test(doc)
  );
  ok(
    "doc no automatic future authorization",
    /does not authorize future limited pilot automatically/i.test(doc)
  );
}

// --- 21–30. decision template ---
{
  ok(
    "doc limited pilot review decision template",
    /Limited Pilot Review Decision Template/i.test(doc)
  );
  ok("doc default decision is NO-GO", /Default.*NO-GO|Default:\s*NO-GO/i.test(doc));
  ok(
    "doc GO NO-GO HOLD ROLLBACK",
    /GO\s*\/\s*NO-GO\s*\/\s*HOLD\s*\/\s*ROLLBACK/i.test(doc)
  );
  ok("doc owner sign-off", /Owner sign-off/i.test(doc));
  ok("doc technical sign-off", /Technical sign-off/i.test(doc));
  ok(
    "doc explicit limited pilot start approval",
    /Explicit limited pilot start approval/i.test(doc)
  );
  ok(
    "doc explicit post-pilot review execution approval",
    /Explicit post-pilot review execution approval/i.test(doc)
  );
  ok(
    "doc explicit provider activation approval",
    /Explicit provider activation approval/i.test(doc)
  );
  ok("doc explicit deploy approval", /Explicit deploy approval/i.test(doc));
  ok(
    "doc explicit production promotion approval",
    /Explicit production promotion approval/i.test(doc)
  );
}

// --- 31–36. review evidence + criteria ---
{
  ok("doc review evidence contract", /Review Evidence Contract/i.test(doc));
  ok("doc allowed review evidence list", /Allowed review evidence/i.test(doc));
  ok(
    "doc forbidden review evidence list",
    /Forbidden review evidence/i.test(doc)
  );
  ok(
    "doc no reconstructable metadata",
    /no reconstructable metadata/i.test(doc)
  );
  ok("doc success criteria", /Success Criteria/i.test(doc));
  ok(
    "doc failure rollback criteria",
    /Failure \/ Rollback Criteria/i.test(doc)
  );
}

// --- 37–52. evidence checklist ---
{
  ok(
    "doc final review evidence checklist",
    /Final Review Evidence Checklist/i.test(doc)
  );
  ok(
    "doc v6.4T pilot smoke review",
    /RC-01.*v6\.4T pilot smoke Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4U monitoring kill switch review",
    /RC-02.*v6\.4U monitoring\/kill switch approval packet reviewed/i.test(doc)
  );
  ok(
    "doc v6.4S runtime redaction review",
    /RC-03.*v6\.4S runtime redaction Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4R synthetic invocation review",
    /RC-04.*v6\.4R synthetic invocation Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4Q secret wiring review",
    /RC-05.*v6\.4Q secret wiring Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4K redaction logging contract",
    /RC-06.*v6\.4K redaction\/logging contract reviewed/i.test(doc)
  );
  ok(
    "doc v6.4M fixture verification",
    /RC-07.*v6\.4M synthetic fixture verification passed/i.test(doc)
  );
  ok(
    "doc staging-only target",
    /RC-09.*Staging-only target confirmed/i.test(doc)
  );
  ok(
    "doc monitoring metadata schema",
    /RC-11.*Monitoring metadata schema approved/i.test(doc)
  );
  ok(
    "doc kill switch ownership",
    /RC-12.*Kill switch ownership approved/i.test(doc)
  );
  ok("doc cost cap", /RC-13.*Cost cap reviewed/i.test(doc));
  ok(
    "doc rate limit quota",
    /RC-14.*Rate limit\/quota reviewed/i.test(doc)
  );
  ok(
    "doc allowlist boundary",
    /RC-15.*Allowlist boundary reviewed/i.test(doc)
  );
  ok(
    "doc fallback behavior",
    /RC-16.*Fallback behavior reviewed/i.test(doc)
  );
  ok(
    "doc production promotion explicitly blocked",
    /RC-25.*Production promotion explicitly blocked/i.test(doc)
  );
}

// --- 53–62. sequence / result / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc future limited pilot review sequence plan only",
    /Future Limited Pilot Review Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4V/i.test(doc)
  );
  ok(
    "doc expected future review result contract",
    /Expected Future Review Result Contract/i.test(doc)
  );
  ok(
    "doc realGeminiEnabled remains false",
    /realGeminiEnabled.*Must remain `false`|remains false in v6\.4V/i.test(doc)
  );
  ok(
    "doc networkCallMade remains false",
    /networkCallMade.*Must remain `false` in v6\.4V|remains false in v6\.4V/i.test(
      doc
    )
  );
  ok(
    "doc no pilot result",
    /Pilot result.*None.*no pilot in v6\.4V/i.test(doc)
  );
  ok(
    "doc no review result",
    /Review result.*None.*no review in v6\.4V/i.test(doc)
  );
  ok("doc final stop conditions", /Final Stop Conditions/i.test(doc));
  ok("doc rollback removal plan", /Rollback \/ Removal Plan/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to start a limited staging pilot/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4V.EXEC boundary", /v6\.4V\.EXEC|v6\.4V\.1/i.test(doc));
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 63–74. static guards ---
{
  ok("adapter no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc));
  ok("self no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(selfCodeOnly));
  ok(
    "combined no generateContent call",
    !/generateContent\s*\(/.test(fixtureSrc + adapterSrc + selfCodeOnly)
  );
  ok(
    "combined no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(fixtureSrc + adapterSrc + selfCodeOnly)
  );
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud command execution",
    !/execSync\s*\(/.test(selfCodeOnly) &&
      !/spawnSync\s*\(/.test(selfCodeOnly) &&
      !/child_process/.test(selfCodeOnly)
  );
  ok("self no dotenv file write", !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly));
  ok("app no redactionTestFixtures import", !appSrc.includes("redactionTestFixtures"));
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok("fixture no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(fixtureSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
  ok(
    "self no runtime logging implementation",
    !/createLogger|winston|pino\b/.test(selfCodeOnly)
  );
  ok(
    "self no AI log persistence",
    !/analytics\.track|logEvent|persistAiLog/.test(selfCodeOnly)
  );
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
  ok(
    "v64m fixture realGeminiEnabled false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.realGeminiEnabled === false
  );
  ok(
    "v64m fixture networkCallMade false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.networkCallMade === false
  );
  ok(
    "v64m fixture serialized clean",
    assertNoForbiddenSensitiveContent(
      JSON.stringify(SYNTHETIC_REDACTION_FIXTURES.metadata)
    ).pass
  );
}

// --- no secrets / PII ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret value ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no secret value ${pat.source.slice(0, 12)}`, !pat.test(selfCodeOnly));
  }
  for (const pat of SECRET_LOOKING_PLACEHOLDER_PATTERNS) {
    ok(`doc no secret-like ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of AUTO_PILOT_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to invoke Gemini",
    /not approval to invoke Gemini/i.test(doc)
  );
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_LISTING_SAMPLE_PATTERNS) {
    ok(`doc no real listing ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no real listing ${pat.source.slice(0, 12)}`, !pat.test(selfCodeOnly));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref ---
{
  ok("doc references v6.4U", doc.includes("v6.4U"));
  ok("doc references v6.4T", doc.includes("v6.4T"));
  ok("doc references v6.4S", doc.includes("v6.4S"));
  ok("doc references v6.4R", doc.includes("v6.4R"));
  ok("doc references v6.4Q", doc.includes("v6.4Q"));
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
}

// --- package script ---
{
  ok(
    "package v64v script",
    pkg.includes("test:v64v-limited-staging-pilot-review-approval-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64v-limited-staging-pilot-review-approval-packet.mts"
    )
  );
}

console.log("\nDone v6.4V Limited Staging Pilot Review Approval Packet tests.");
if (process.exitCode) process.exit(process.exitCode);

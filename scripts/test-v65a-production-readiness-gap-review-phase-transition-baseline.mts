/**
 * v6.5A — Production Readiness Gap Review / Phase Transition Baseline (static validation only)
 * npm run test:v65a-production-readiness-gap-review-phase-transition-baseline
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

const DOC_PATH =
  "docs/v6.5A-production-readiness-gap-review-phase-transition-baseline.md";
const V64V_DOC =
  "docs/v6.4V-limited-staging-pilot-review-approval-packet.md";
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

const AUTO_EXEC_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+deploy/i,
  /v6\.5A\s+approves\s+production\s+automatically/i,
  /v6\.5A\s+authorizes\s+deploy\s+automatically/i,
  /baseline\s+authorizes\s+production\s+promotion\s+automatically/i,
];

const HEAD_SHA = "39d3877038f6c9a2ec22c65e99d4b1b08f4a314e";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.5A Production Readiness Gap Review Phase Transition Baseline ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64vDoc = readFileSync(V64V_DOC, "utf8");
const v64uDoc = readFileSync(V64U_DOC, "utf8");
const v64tDoc = readFileSync(V64T_DOC, "utf8");
const v64sDoc = readFileSync(V64S_DOC, "utf8");
const v64rDoc = readFileSync(V64R_DOC, "utf8");
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65a-production-readiness-gap-review-phase-transition-baseline.mts",
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

// --- 1–8. docs and modules exist ---
{
  ok("v6.5A doc exists", doc.length > 6000);
  ok("doc v6.5A label", doc.includes("v6.5A"));
  ok("v6.4V doc exists", existsSync(V64V_DOC) && v64vDoc.includes("v6.4V"));
  ok("v6.4U doc exists", existsSync(V64U_DOC) && v64uDoc.includes("v6.4U"));
  ok("v6.4T doc exists", existsSync(V64T_DOC) && v64tDoc.includes("v6.4T"));
  ok("v6.4S doc exists", existsSync(V64S_DOC) && v64sDoc.includes("v6.4S"));
  ok("v6.4R doc exists", existsSync(V64R_DOC) && v64rDoc.includes("v6.4R"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 9–24. phase transition and safety positioning ---
{
  ok(
    "doc v6.4 readiness phase closed",
    /v6\.4 readiness phase closed|closes the v6\.4 readiness phase/i.test(doc)
  );
  ok(
    "doc v6.5 planning review phase started",
    /starts the v6\.5 planning\/review phase|v6\.5 planning\/review phase started/i.test(
      doc
    )
  );
  ok("doc HEAD 39d3877", doc.includes(HEAD_SHA) || doc.includes("39d3877"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|does not deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no secret wiring",
    /no secret wiring|does not wire secrets|no real wiring/i.test(doc)
  );
  ok(
    "doc no Cloud Run env update",
    /does not update Cloud Run env|no Cloud Run env update/i.test(doc)
  );
  ok(
    "doc no gcloud execution",
    /does not execute gcloud|no gcloud command execution/i.test(doc)
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok(
    "doc no runtime invocation code",
    /does not add runtime invocation code|no runtime invocation code/i.test(doc)
  );
  ok(
    "doc no runtime monitoring logging",
    /does not add runtime monitoring\/logging|no runtime monitoring\/logging implementation/i.test(
      doc
    )
  );
  ok(
    "doc no AI log persistence analytics",
    /does not persist AI logs|no AI log persistence|analytics events/i.test(doc)
  );
  ok(
    "doc no pilot start",
    /does not start a limited staging pilot|no pilot start/i.test(doc)
  );
  ok(
    "doc no post-pilot review execution",
    /does not execute post-pilot review|no post-pilot review execution/i.test(doc)
  );
  ok(
    "doc no production promotion",
    /does not promote to production|no production promotion/i.test(doc)
  );
  ok(
    "doc no automatic future authorization",
    /does not authorize future execution automatically/i.test(doc)
  );
}

// --- 25–32. required sections ---
{
  ok("doc v6.4 closure summary", /v6\.4 Closure Summary/i.test(doc));
  ok(
    "doc readiness status matrix",
    /Current Readiness Status Matrix/i.test(doc)
  );
  ok("doc production readiness gaps", /Production Readiness Gaps/i.test(doc));
  ok("doc recommended v6.5 roadmap", /Recommended v6\.5 Roadmap/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to deploy/i.test(doc)
  );
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc rollback removal plan", /Rollback \/ Removal Plan/i.test(doc));
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
}

// --- matrix content ---
{
  ok("matrix admin control", /Admin control/i.test(doc));
  ok("matrix real adapter skeleton", /Real adapter skeleton/i.test(doc));
  ok("matrix production readiness gap", /Production readiness/i.test(doc));
  ok("gap no secret wiring", /No real Secret Manager wiring executed/i.test(doc));
  ok("gap no production privacy review", /No production privacy review/i.test(doc));
  ok("roadmap v6.5B", /v6\.5B/i.test(doc));
  ok("roadmap v6.5F", /v6\.5F/i.test(doc));
  ok(
    "roadmap v6.5G execution boundary",
    /v6\.5G\+|separate explicit approval/i.test(doc)
  );
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 33–44. static guards ---
{
  ok(
    "adapter no gemini sdk",
    !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc)
  );
  ok(
    "self no gemini sdk",
    !/from\s+['"]@google\/generative-ai['"]/.test(selfCodeOnly)
  );
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
  ok(
    "self no dotenv file write",
    !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly)
  );
  ok(
    "app no redactionTestFixtures import",
    !appSrc.includes("redactionTestFixtures")
  );
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok(
    "adapter no firestore write",
    !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc)
  );
  ok(
    "fixture no firestore write",
    !/\b(setDoc|getDocs|writeBatch)\b/.test(fixtureSrc)
  );
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
  ok(
    "adapter default disabled",
    REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false
  );
  ok(
    "production forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  const result = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("adapter invoke blocked", result.blocked === true);
  ok(
    "adapter realGeminiEnabled false",
    result.metadata.realGeminiEnabled === false
  );
  ok(
    "adapter networkCallMade false",
    result.metadata.networkCallMade === false
  );
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
    ok(
      `self no secret value ${pat.source.slice(0, 12)}`,
      !pat.test(selfCodeOnly)
    );
  }
  for (const pat of SECRET_LOOKING_PLACEHOLDER_PATTERNS) {
    ok(`doc no secret-like ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of AUTO_EXEC_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to invoke provider",
    /not approval to invoke a provider/i.test(doc)
  );
  ok(
    "doc v6.5A not approval to execute deploy activate production",
    /not approval to execute\/deploy\/activate\/production|is not approval to execute/i.test(
      doc
    )
  );
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_LISTING_SAMPLE_PATTERNS) {
    ok(`doc no real listing ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(
      `self no real listing ${pat.source.slice(0, 12)}`,
      !pat.test(selfCodeOnly)
    );
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref ---
{
  ok("doc references v6.4V", doc.includes("v6.4V"));
  ok("doc references v6.4U", doc.includes("v6.4U"));
  ok("doc references v6.4T", doc.includes("v6.4T"));
  ok("doc references v6.4S", doc.includes("v6.4S"));
  ok("doc references v6.4R", doc.includes("v6.4R"));
  ok("doc references v6.4Q", doc.includes("v6.4Q"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
}

// --- package script ---
{
  ok(
    "package v65a script",
    pkg.includes(
      "test:v65a-production-readiness-gap-review-phase-transition-baseline"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65a-production-readiness-gap-review-phase-transition-baseline.mts"
    )
  );
}

console.log(
  "\nDone v6.5A Production Readiness Gap Review Phase Transition Baseline tests."
);
if (process.exitCode) process.exit(process.exitCode);

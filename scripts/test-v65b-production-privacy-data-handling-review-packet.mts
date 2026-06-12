/**
 * v6.5B — Production Privacy & Data Handling Review Packet (static validation only)
 * npm run test:v65b-production-privacy-data-handling-review-packet
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

const DOC_PATH = "docs/v6.5B-production-privacy-data-handling-review-packet.md";
const V65A_DOC =
  "docs/v6.5A-production-readiness-gap-review-phase-transition-baseline.md";
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

const AUTO_EXEC_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+deploy/i,
  /v6\.5B\s+approves\s+production\s+automatically/i,
  /v6\.5B\s+authorizes\s+deploy\s+automatically/i,
  /packet\s+authorizes\s+production\s+promotion\s+automatically/i,
];

const HEAD_SHA = "9bfb84e541ab783f2bb97195c77033aec20b7dd1";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.5B Production Privacy & Data Handling Review Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65aDoc = readFileSync(V65A_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65b-production-privacy-data-handling-review-packet.mts",
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

// --- 1–5. docs and modules exist ---
{
  ok("v6.5B doc exists", doc.length > 8000);
  ok("doc v6.5B label", doc.includes("v6.5B"));
  ok("v6.5A doc exists", existsSync(V65A_DOC) && v65aDoc.includes("v6.5A"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 6–18. safety positioning ---
{
  ok("doc HEAD 9bfb84e", doc.includes(HEAD_SHA) || doc.includes("9bfb84e"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no secret wiring",
    /does not wire secrets|no secret wiring|does not create\/read\/bind secrets/i.test(
      doc
    )
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
    /no runtime invocation code/i.test(doc)
  );
  ok(
    "doc no runtime logging monitoring",
    /does not add runtime logging\/monitoring|no runtime monitoring\/logging implementation/i.test(
      doc
    )
  );
  ok(
    "doc no AI log persistence analytics",
    /does not persist AI logs|no AI log persistence|analytics events/i.test(doc)
  );
  ok("doc no pilot start", /does not start any pilot|no pilot start/i.test(doc));
  ok(
    "doc no production promotion",
    /does not promote to production|no production promotion/i.test(doc)
  );
  ok(
    "doc privacy review packet only",
    /privacy\/data-handling review packet only|privacy & data handling review packet/i.test(
      doc
    )
  );
}

// --- 19–44. required sections ---
{
  ok("doc data classification matrix", /Data Classification Matrix/i.test(doc));
  ok(
    "doc synthetic scenario IDs",
    /Synthetic scenario IDs|syntheticScenarioId/i.test(doc)
  );
  ok(
    "doc metadata-only review fields",
    /Metadata-only review fields|metadata-only review fields/i.test(doc)
  );
  ok(
    "doc non-reversible correlation ID",
    /Non-reversible correlation ID|nonReversibleCorrelationId/i.test(doc)
  );
  ok("doc raw user prompt forbidden", /Raw user prompt/i.test(doc) && /forbidden/i.test(doc));
  ok(
    "doc full chat transcript forbidden",
    /Full chat transcript/i.test(doc) && /forbidden/i.test(doc)
  );
  ok("doc full UID forbidden", /Full UID/i.test(doc) && /forbidden/i.test(doc));
  ok(
    "doc contact PII forbidden",
    /Name \/ email \/ phone \/ contact|PII \/ contact/i.test(doc)
  );
  ok(
    "doc Thai national ID forbidden",
    /Thai national ID \/ government ID/i.test(doc)
  );
  ok(
    "doc license plate VIN chassis forbidden",
    /License plate \/ VIN \/ chassis/i.test(doc)
  );
  ok(
    "doc real dealer listing forbidden",
    /Real dealer listing/i.test(doc) && /forbidden/i.test(doc)
  );
  ok(
    "doc real car image URL forbidden",
    /Real car image URL \/ storage path/i.test(doc)
  );
  ok(
    "doc secret API key token forbidden",
    /Secret \/ API key \/ token/i.test(doc)
  );
  ok("doc env dump forbidden", /Env dump/i.test(doc) && /forbidden/i.test(doc));
  ok(
    "doc provider request response forbidden",
    /Provider request\/response body/i.test(doc)
  );
  ok(
    "doc reconstructable metadata forbidden",
    /Reconstructable metadata/i.test(doc)
  );
  ok("doc provider payload boundary", /Provider Payload Boundary/i.test(doc));
  ok(
    "doc no provider payload in v65b",
    /no provider payload exists/i.test(doc)
  );
  ok(
    "doc logging monitoring boundary",
    /Logging \/ Monitoring Boundary/i.test(doc)
  );
  ok(
    "doc redaction minimization rules",
    /Redaction \/ Minimization Rules/i.test(doc)
  );
  ok(
    "doc retention access review boundary",
    /Retention \/ Access \/ Review Boundary/i.test(doc)
  );
  ok("doc privacy stop conditions", /Privacy Stop Conditions/i.test(doc));
  ok(
    "doc production privacy readiness gaps",
    /Production Privacy Readiness Gaps/i.test(doc)
  );
  ok("doc recommended next steps", /Recommended Next Steps/i.test(doc));
  ok("doc roadmap v6.5C", /v6\.5C/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to deploy/i.test(doc)
  );
  ok("doc rollback removal plan", /Rollback \/ Removal Plan/i.test(doc));
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok(
    "doc redactionApplied true required",
    /redactionApplied: true.*required|redactionApplied.*required before reviewable/i.test(
      doc
    )
  );
  ok(
    "doc redactionApplied false blocks",
    /redactionApplied: false.*blocks|redactionApplied.*false.*blocks/i.test(doc)
  );
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 45–56. static guards ---
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
    "doc has not approval to persist AI logs",
    /not approval to persist AI logs/i.test(doc)
  );
  ok(
    "doc v6.5B not approval to execute deploy activate production",
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
  ok("doc references v6.5A", doc.includes("v6.5A"));
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
  ok("doc references v6.4U", doc.includes("v6.4U"));
}

// --- package script ---
{
  ok(
    "package v65b script",
    pkg.includes("test:v65b-production-privacy-data-handling-review-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65b-production-privacy-data-handling-review-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.5B Production Privacy & Data Handling Review Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v6.4M — Redaction Test Fixture Implementation Candidate (static validation only)
 * npm run test:v64m-redaction-test-fixture-implementation-candidate
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
  ALLOWED_REDACTED_METADATA_FIELDS,
  FORBIDDEN_LOG_FIELDS,
  SYNTHETIC_REDACTION_FIXTURES,
  assertNoForbiddenSensitiveContent,
  assertNoReconstructableRawContent,
  assertSyntheticMetadataInvariants,
  buildSyntheticRedactedMetadataFixture,
} from "../src/services/ai/redactionTestFixtures.ts";

const DOC_PATH =
  "docs/v6.4M-redaction-test-fixture-implementation-candidate.md";
const FIXTURE_PATH = "src/services/ai/redactionTestFixtures.ts";
const V64L_DOC =
  "docs/v6.4L-synthetic-real-provider-invocation-plan-docs-only.md";
const V64K_DOC = "docs/v6.4K-redaction-logging-contract-readiness.md";
const V64J_DOC = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
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

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
];

const AUTO_AUTH_PATTERNS = [
  /this\s+document\s+and\s+fixture\s+are\s+approval\s+to\s+log\s+real\s+data/i,
  /v6\.4M\s+approves\s+logging\s+automatically/i,
  /fixture\s+authorizes\s+runtime\s+logging\s+automatically/i,
];

const HEAD_SHA = "26cd37c241c7f6a5e34f9665226154d178fbd729";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4M Redaction Test Fixture Implementation Candidate ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const fixtureSrc = readFileSync(FIXTURE_PATH, "utf8");
const v64lDoc = readFileSync(V64L_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const v64jDoc = readFileSync(V64J_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64m-redaction-test-fixture-implementation-candidate.mts",
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

// --- 1–6. docs and modules exist ---
{
  ok("v6.4M doc exists", doc.length > 5000);
  ok("doc v6.4M label", doc.includes("v6.4M"));
  ok("v6.4M fixture exists", existsSync(FIXTURE_PATH));
  ok("v6.4L doc exists", existsSync(V64L_DOC) && v64lDoc.includes("v6.4L"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4J doc exists", existsSync(V64J_DOC) && v64jDoc.includes("v6.4J"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 7–13. docs safety positioning ---
{
  ok("doc HEAD 26cd37c", doc.includes(HEAD_SHA) || doc.includes("26cd37c"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no runtime logging implementation",
    /does not add runtime logging/i.test(doc)
  );
  ok("doc no AI log persistence", /does not persist AI logs/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts to any provider/i.test(doc)
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no automatic future authorization",
    /does not authorize future execution automatically/i.test(doc)
  );
}

// --- 14–20. doc contract sections ---
{
  ok("doc synthetic-only fixture contract", /Fixture Contract/i.test(doc));
  ok("doc helper contract", /Helper Contract/i.test(doc));
  ok("doc scope boundary", /Scope Boundary/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc rollback plan", /Rollback Plan/i.test(doc));
  ok(
    "doc non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to log real data/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4N boundary", /v6\.4N/i.test(doc));
  ok("doc v6.4P boundary", /v6\.4P/i.test(doc));
}

// --- 21–35. fixture exports and invariants ---
{
  ok("fixture exports SYNTHETIC_REDACTION_FIXTURES", fixtureSrc.includes("SYNTHETIC_REDACTION_FIXTURES"));
  ok("fixture exports FORBIDDEN_LOG_FIELDS", fixtureSrc.includes("FORBIDDEN_LOG_FIELDS"));
  ok(
    "fixture exports ALLOWED_REDACTED_METADATA_FIELDS",
    fixtureSrc.includes("ALLOWED_REDACTED_METADATA_FIELDS")
  );
  ok(
    "fixture exports assertNoForbiddenSensitiveContent",
    fixtureSrc.includes("assertNoForbiddenSensitiveContent")
  );
  ok(
    "fixture exports buildSyntheticRedactedMetadataFixture",
    fixtureSrc.includes("buildSyntheticRedactedMetadataFixture")
  );
  ok(
    "fixture realGeminiEnabled false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.realGeminiEnabled === false
  );
  ok(
    "fixture networkCallMade false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.networkCallMade === false
  );
  ok(
    "fixture redactionApplied true",
    SYNTHETIC_REDACTION_FIXTURES.metadata.redactionApplied === true
  );
  ok(
    "fixture synthetic scenario id only",
    SYNTHETIC_REDACTION_FIXTURES.scenarioId.startsWith("SYNTH_")
  );
  ok(
    "fixture no production label",
    ["staging", "local"].includes(
      SYNTHETIC_REDACTION_FIXTURES.metadata.environmentLabel
    )
  );
  ok(
    "fixture no user visible answer",
    SYNTHETIC_REDACTION_FIXTURES.markers.userVisibleAnswer === false
  );
  ok("fixture no DB write marker", SYNTHETIC_REDACTION_FIXTURES.markers.dbWrite === false);
  ok(
    "fixture no mutation marker",
    SYNTHETIC_REDACTION_FIXTURES.markers.mutationMarker === false
  );
  ok(
    "fixture no analytics event",
    SYNTHETIC_REDACTION_FIXTURES.markers.analyticsEvent === false
  );
}

// --- 36–38. helper runtime checks ---
{
  const clean = assertNoForbiddenSensitiveContent(
    JSON.stringify(SYNTHETIC_REDACTION_FIXTURES.metadata)
  );
  ok("helper checks forbidden sensitive content", clean.pass);

  const invariants = assertSyntheticMetadataInvariants(
    SYNTHETIC_REDACTION_FIXTURES.metadata
  );
  ok("helper checks allowed metadata fields", invariants.pass);

  const noReconstruct = assertNoReconstructableRawContent(
    SYNTHETIC_REDACTION_FIXTURES.metadata
  );
  ok("helper enforces no reconstructable raw content", noReconstruct.pass);

  const built = buildSyntheticRedactedMetadataFixture();
  ok("built fixture realGeminiEnabled false", built.realGeminiEnabled === false);
  ok("built fixture networkCallMade false", built.networkCallMade === false);
  ok("built fixture redactionApplied true", built.redactionApplied === true);

  ok("FORBIDDEN_LOG_FIELDS non-empty", FORBIDDEN_LOG_FIELDS.length >= 17);
  ok(
    "ALLOWED_REDACTED_METADATA_FIELDS non-empty",
    ALLOWED_REDACTED_METADATA_FIELDS.length >= 19
  );

  const bearerProbe = `${"Bearer"} ${"a".repeat(26)}`;
  const badCheck = assertNoForbiddenSensitiveContent(bearerProbe);
  ok("helper detects forbidden bearer pattern", !badCheck.pass);
}

// --- 39–47. static guards ---
{
  ok("fixture no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(fixtureSrc));
  ok("self no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(selfCodeOnly));
  ok(
    "combined no generateContent call",
    !/generateContent\s*\(/.test(fixtureSrc + adapterSrc + selfCodeOnly)
  );
  ok(
    "combined no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(fixtureSrc + adapterSrc + selfCodeOnly)
  );
  ok("fixture no proc env read", !/\bprocess\.env\b/.test(fixtureSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud access",
    !/gcloud\s+secrets/.test(selfCodeOnly) &&
      !/execSync\s*\(\s*[`'"]gcloud/.test(selfCodeOnly)
  );
  ok("self no dotenv file write", !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly));
  ok("app no redactionTestFixtures import", !appSrc.includes("redactionTestFixtures"));
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("fixture no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(fixtureSrc));
  ok(
    "fixture no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(fixtureSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
}

// --- runtime adapter contract ---
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

// --- no secrets / PII in doc and fixture ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret value ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`fixture no secret value ${pat.source.slice(0, 12)}`, !pat.test(fixtureSrc));
    ok(`self no secret value ${pat.source.slice(0, 12)}`, !pat.test(selfCodeOnly));
  }
  for (const pat of SECRET_LOOKING_PLACEHOLDER_PATTERNS) {
    ok(`doc no secret-like ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`fixture no secret-like ${pat.source.slice(0, 12)}`, !pat.test(fixtureSrc));
  }
  for (const pat of AUTO_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`fixture no phone ${pat.source.slice(0, 12)}`, !pat.test(fixtureSrc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no image url ${pat.source.slice(0, 15)}`, !pat.test(doc));
    ok(`fixture no image url ${pat.source.slice(0, 15)}`, !pat.test(fixtureSrc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`fixture no real car ${pat.source.slice(0, 12)}`, !pat.test(fixtureSrc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
  ok(
    "fixture serialized no forbidden",
    assertNoForbiddenSensitiveContent(JSON.stringify(SYNTHETIC_REDACTION_FIXTURES)).pass
  );
}

// --- cross-ref ---
{
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4L", doc.includes("v6.4L"));
  ok("doc references redactionTestFixtures", doc.includes("redactionTestFixtures"));
}

// --- package script ---
{
  ok(
    "package v64m script",
    pkg.includes("test:v64m-redaction-test-fixture-implementation-candidate")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64m-redaction-test-fixture-implementation-candidate.mts"
    )
  );
}

console.log(
  "\nDone v6.4M Redaction Test Fixture Implementation Candidate tests."
);
if (process.exitCode) process.exit(process.exitCode);

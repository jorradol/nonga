/**
 * v6.5E — User-Visible AI Behavior Policy Review Packet (static validation only)
 * npm run test:v65e-user-visible-ai-behavior-policy-review-packet
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
  "docs/v6.5E-user-visible-ai-behavior-policy-review-packet.md";
const V65D_DOC =
  "docs/v6.5D-production-incident-rollback-playbook-packet.md";
const V65C_DOC =
  "docs/v6.5C-production-cost-guard-quota-review-packet.md";
const V65B_DOC =
  "docs/v6.5B-production-privacy-data-handling-review-packet.md";
const V65A_DOC =
  "docs/v6.5A-production-readiness-gap-review-phase-transition-baseline.md";
const V64C2_DOC =
  "docs/v6.4C.2-legacy-ai-control-center-disclosure-ui-remediation.md";
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

const REAL_CONTACT_PATTERNS = [
  /\b0[689]\d{8}\b/,
  /@[a-z0-9.-]+\.(com|org|net)\b/i,
  /line\.me\/ti\//i,
];

const REAL_PROJECT_ID_PATTERNS = [
  /\bnonga-ce93c\b/i,
  /projects\/nonga-[a-z0-9]+\/secrets\//i,
];

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
  /v6\.5E\s+approves\s+runtime\s+ui\s+change\s+automatically/i,
  /policy\s+authorizes\s+gemini\s+activation\s+automatically/i,
  /packet\s+authorizes\s+production\s+promotion\s+automatically/i,
  /v6\.5E\s+authorizes\s+user-visible\s+ai\s+answer\s+automatically/i,
];

const HEAD_SHA = "93c960dc71805bf2ad78adbec75cf8401dae2d78";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.5E User-Visible AI Behavior Policy Review Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65dDoc = readFileSync(V65D_DOC, "utf8");
const v65cDoc = readFileSync(V65C_DOC, "utf8");
const v65bDoc = readFileSync(V65B_DOC, "utf8");
const v65aDoc = readFileSync(V65A_DOC, "utf8");
const v64c2Doc = existsSync(V64C2_DOC)
  ? readFileSync(V64C2_DOC, "utf8")
  : "";
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65e-user-visible-ai-behavior-policy-review-packet.mts",
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

// --- docs and modules exist ---
{
  ok("v6.5E doc exists", doc.length > 8000);
  ok("doc v6.5E label", doc.includes("v6.5E"));
  ok("v6.5D doc exists", existsSync(V65D_DOC) && v65dDoc.includes("v6.5D"));
  ok("v6.5C doc exists", existsSync(V65C_DOC) && v65cDoc.includes("v6.5C"));
  ok("v6.5B doc exists", existsSync(V65B_DOC) && v65bDoc.includes("v6.5B"));
  ok("v6.5A doc exists", existsSync(V65A_DOC) && v65aDoc.includes("v6.5A"));
  ok(
    "v6.4C.2 disclosure doc exists",
    existsSync(V64C2_DOC) && v64c2Doc.includes("v6.4C.2")
  );
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD 93c960d", doc.includes(HEAD_SHA) || doc.includes("93c960d"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no runtime UI change",
    /does not change runtime UI|no runtime UI change/i.test(doc)
  );
  ok(
    "doc no user-visible behavior change",
    /does not change user-visible behavior|no user-visible behavior change/i.test(
      doc
    )
  );
  ok(
    "doc no user-visible AI answer execution",
    /does not execute user-visible AI answers|no user-visible AI answer execution/i.test(
      doc
    )
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok(
    "doc no network execution",
    /does not execute network calls|no network execution/i.test(doc)
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
  ok("doc no pilot start", /does not start any pilot|no pilot start/i.test(doc));
  ok(
    "doc no production promotion",
    /does not promote to production|no production promotion/i.test(doc)
  );
  ok(
    "doc policy review packet only",
    /user-visible AI behavior policy review packet only|behavior policy review packet/i.test(
      doc
    )
  );
}

// --- required policy sections ---
{
  ok(
    "doc user-visible AI behavior policy",
    /User-Visible AI Behavior Policy/i.test(doc)
  );
  ok(
    "doc disclosure wording policy",
    /Disclosure Wording Policy/i.test(doc)
  );
  ok(
    "doc mock demo not connected wording",
    /Mock \/ Demo \/ Not Connected Wording Policy/i.test(doc)
  );
  ok(
    "doc future real provider wording boundary",
    /Real Provider Wording Policy.*Future Approved State/i.test(doc)
  );
  ok("doc forbidden claims", /Forbidden Claims/i.test(doc));
  ok(
    "doc fallback behavior policy",
    /Fallback Behavior Policy/i.test(doc)
  );
  ok(
    "doc no-user-confusion policy",
    /No-User-Confusion Policy/i.test(doc)
  );
  ok(
    "doc admin public-facing boundary",
    /Admin-Facing vs Public-Facing Wording Boundary/i.test(doc)
  );
  ok(
    "doc user-visible answer stop conditions",
    /User-Visible Answer Stop Conditions/i.test(doc)
  );
  ok(
    "doc future approval gates",
    /Future Approval Gates Before Any User-Visible AI Answer/i.test(doc)
  );
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to deploy/i.test(doc)
  );
  ok(
    "doc rollback removal plan for v65e",
    /Rollback \/ Removal Plan for v6\.5E/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc recommended next steps v6.5F", /v6\.5F/i.test(doc));
  ok("doc recommended next steps v6.5G", /v6\.5G/i.test(doc));
  ok("doc recommended next steps v6.5H", /v6\.5H/i.test(doc));
}

// --- policy content specifics ---
{
  ok("doc Demo / Not connected", /Demo \/ Not connected|Demo.*Not connected/i.test(doc));
  ok("doc mock analytics wording", /Mock analytics|mock\/placeholder/i.test(doc));
  ok("doc LIVE SYNC forbidden", /LIVE SYNC/i.test(doc));
  ok("doc deterministic fallback", /Deterministic safe message|deterministic fallback/i.test(doc));
  ok("doc no impersonation", /No impersonation|must not claim to be human/i.test(doc));
  ok("doc no guaranteed outcomes", /No guaranteed outcomes|must not guarantee/i.test(doc));
  ok("doc kill switch visibility", /Kill switch visibility|killSwitchState/i.test(doc));
  ok("doc providerMode metadata", /providerMode/i.test(doc));
  ok("doc realGeminiEnabled false", /realGeminiEnabled.*false|Must remain `false`/i.test(doc));
  ok("doc networkCallMade false", /networkCallMade.*false|Must remain `false`/i.test(doc));
  ok("doc references v6.5D", doc.includes("v6.5D"));
  ok("doc references v6.5B", doc.includes("v6.5B"));
  ok("doc references v6.4C.2", doc.includes("v6.4C.2"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- static guards ---
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
    !/generateContent\s*\(/.test(adapterSrc + selfCodeOnly)
  );
  ok(
    "combined no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(adapterSrc + selfCodeOnly)
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

// --- no secrets / PII / sensitive samples ---
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
    "doc has not approval to deploy in clause",
    /not approval to deploy/i.test(doc)
  );
  ok(
    "doc v6.5E not approval execute deploy activate production runtime",
    /not approval to execute\/deploy\/activate\/production\/runtime UI change|is not approval to deploy/i.test(
      doc
    )
  );
  for (const pat of REAL_CONTACT_PATTERNS) {
    ok(`doc no real contact ${pat.source.slice(0, 12)}`, !pat.test(doc));
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
  ok(
    "doc no raw prompt sample",
    !/here is my full prompt:/i.test(doc) &&
      !/system prompt content:/i.test(doc)
  );
}

// --- package script ---
{
  ok(
    "package v65e script",
    pkg.includes("test:v65e-user-visible-ai-behavior-policy-review-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65e-user-visible-ai-behavior-policy-review-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.5E User-Visible AI Behavior Policy Review Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

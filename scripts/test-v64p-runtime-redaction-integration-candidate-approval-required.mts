/**
 * v6.4P — Runtime Redaction Integration Candidate, Approval Required (static validation only)
 * npm run test:v64p-runtime-redaction-integration-candidate-approval-required
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
  "docs/v6.4P-runtime-redaction-integration-candidate-approval-required.md";
const V64O_DOC =
  "docs/v6.4O-synthetic-invocation-execution-candidate-approval-required.md";
const V64N_DOC =
  "docs/v6.4N-staging-secret-wiring-execution-candidate-approval-required.md";
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

const REAL_PHONE_PATTERNS = [/\b0[689]\d{8}\b/];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
];

const REAL_LISTING_SAMPLE_PATTERNS = [
  /รถมือสอง\s+ราคา\s+\d{5,}/,
  /เจ้าของขายเอง\s+โทร/i,
];

const AUTO_INTEGRATION_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+integrate\s+redaction\s+into\s+runtime/i,
  /v6\.4P\s+approves\s+runtime\s+integration\s+automatically/i,
  /candidate\s+authorizes\s+runtime\s+integration\s+automatically/i,
];

const HEAD_SHA = "cd3e1bf316df99809cd45319ee5371ceed175c76";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4P Runtime Redaction Integration Candidate, Approval Required ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64oDoc = readFileSync(V64O_DOC, "utf8");
const v64nDoc = readFileSync(V64N_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64p-runtime-redaction-integration-candidate-approval-required.mts",
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
  ok("v6.4P doc exists", doc.length > 6000);
  ok("doc v6.4P label", doc.includes("v6.4P"));
  ok("v6.4O doc exists", existsSync(V64O_DOC) && v64oDoc.includes("v6.4O"));
  ok("v6.4N doc exists", existsSync(V64N_DOC) && v64nDoc.includes("v6.4N"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 7–16. docs safety positioning ---
{
  ok("doc HEAD cd3e1bf", doc.includes(HEAD_SHA) || doc.includes("cd3e1bf"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no runtime redaction integration",
    /does not integrate redaction into runtime/i.test(doc)
  );
  ok(
    "doc no App user chat live runtime import",
    /does not import redaction fixtures\/helpers into App or user\/chat\/live runtime/i.test(
      doc
    )
  );
  ok("doc no runtime logging", /does not add runtime logging/i.test(doc));
  ok(
    "doc no AI log persistence",
    /does not persist AI logs/i.test(doc)
  );
  ok(
    "doc no analytics event creation",
    /does not create analytics events/i.test(doc)
  );
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no automatic future authorization",
    /does not authorize future runtime integration automatically/i.test(doc)
  );
}

// --- 17–19. future boundary / integration points ---
{
  ok(
    "doc future runtime integration boundary",
    /Future Runtime Integration Boundary/i.test(doc)
  );
  ok(
    "doc forbidden future raw prompt PII secret logging",
    /Raw prompt logging|Full UID logging|PII logging|Secret\/env logging/i.test(doc)
  );
  ok(
    "doc proposed future integration points plan only",
    /Proposed Future Integration Points.*Plan Only/i.test(doc) &&
      /Pre-log redaction guard|Pre-provider-payload redaction guard/i.test(doc)
  );
}

// --- 20–33. pre-integration gates ---
{
  ok("doc pre-integration gates", /Pre-Integration Gates/i.test(doc));
  ok("doc owner approval", /PI-01.*Owner approval/i.test(doc));
  ok(
    "doc runtime integration approval",
    /PI-02.*Runtime integration approval/i.test(doc)
  );
  ok(
    "doc staging-only approval",
    /PI-03.*Staging-only approval/i.test(doc)
  );
  ok(
    "doc redaction logging contract approval",
    /PI-04.*Redaction\/logging contract approval/i.test(doc)
  );
  ok(
    "doc synthetic fixture test approval",
    /PI-05.*Synthetic fixture test approval/i.test(doc)
  );
  ok(
    "doc metadata allowlist approval",
    /PI-06.*Metadata allowlist approval/i.test(doc)
  );
  ok(
    "doc logging sink approval",
    /PI-07.*Logging sink approval/i.test(doc)
  );
  ok(
    "doc retention policy approval",
    /PI-08.*Retention policy approval/i.test(doc)
  );
  ok(
    "doc access control approval",
    /PI-09.*Access control approval/i.test(doc)
  );
  ok(
    "doc failure fallback approval",
    /PI-10.*Failure fallback approval/i.test(doc)
  );
  ok("doc kill switch approval", /PI-11.*Kill switch approval/i.test(doc));
  ok("doc cost cap approval", /PI-12.*Cost cap approval/i.test(doc));
  ok("doc allowlist approval", /PI-13.*Allowlist approval/i.test(doc));
  ok(
    "doc no user-visible answer approval",
    /PI-14.*No user-visible answer approval/i.test(doc)
  );
  ok(
    "doc no DB business mutation approval",
    /PI-15.*No DB\/business mutation approval/i.test(doc)
  );
  ok(
    "doc separate deploy approval",
    /PI-16.*Separate deploy approval/i.test(doc)
  );
  ok(
    "doc separate provider activation approval",
    /PI-17.*Separate provider activation approval/i.test(doc)
  );
}

// --- 34–40. sequence / result / static / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc future integration sequence plan only",
    /Future Integration Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4P/i.test(doc)
  );
  ok(
    "doc expected future integration result contract",
    /Expected Future Integration Result Contract/i.test(doc)
  );
  ok("doc static verification rules", /Static Verification Rules/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc rollback removal plan", /Rollback.*Removal Plan/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to integrate redaction into runtime/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4Q boundary", /v6\.4Q/i.test(doc));
  ok("doc v6.4S boundary", /v6\.4S/i.test(doc));
}

// --- v6.4P invariants in doc ---
{
  ok(
    "doc realGeminiEnabled remains false in v64p",
    /realGeminiEnabled.*Must remain `false`|remains false in v6\.4P/i.test(doc)
  );
  ok(
    "doc networkCallMade remains false in v64p",
    /networkCallMade.*Must remain `false` in v6\.4P|remains false in v6\.4P/i.test(
      doc
    )
  );
  ok(
    "doc no runtime logging implementation",
    /No runtime logging implementation|no runtime logging/i.test(doc)
  );
}

// --- 41–54. static guards ---
{
  ok("app no redactionTestFixtures import", !appSrc.includes("redactionTestFixtures"));
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok(
    "no user chat live runtime import of redaction helper",
    !/from\s+['"].*redactionTestFixtures/.test(appSrc)
  );
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
    "self no gcloud secret execution",
    !/execSync\s*\(/.test(selfCodeOnly) &&
      !/spawnSync\s*\(/.test(selfCodeOnly) &&
      !/child_process/.test(selfCodeOnly)
  );
  ok("self no dotenv file write", !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly));
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok("fixture no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(fixtureSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
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
  for (const pat of AUTO_INTEGRATION_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to persist AI logs",
    /not approval to persist AI logs/i.test(doc)
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
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
  ok("doc references v6.4O", doc.includes("v6.4O"));
}

// --- package script ---
{
  ok(
    "package v64p script",
    pkg.includes(
      "test:v64p-runtime-redaction-integration-candidate-approval-required"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64p-runtime-redaction-integration-candidate-approval-required.mts"
    )
  );
}

console.log(
  "\nDone v6.4P Runtime Redaction Integration Candidate, Approval Required tests."
);
if (process.exitCode) process.exit(process.exitCode);

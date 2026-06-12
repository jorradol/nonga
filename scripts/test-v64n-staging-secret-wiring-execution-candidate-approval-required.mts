/**
 * v6.4N — Staging Secret Wiring Execution Candidate, Approval Required (static validation only)
 * npm run test:v64n-staging-secret-wiring-execution-candidate-approval-required
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
  "docs/v6.4N-staging-secret-wiring-execution-candidate-approval-required.md";
const V64J_DOC = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
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

const AUTO_SECRET_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+create/i,
  /this\s+document\s+is\s+approval\s+to\s+bind/i,
  /v6\.4N\s+approves\s+secret\s+wiring\s+automatically/i,
  /candidate\s+authorizes\s+secret\s+execution\s+automatically/i,
];

const SAFE_RESOURCE_PLACEHOLDER =
  "projects/<approved-staging-project>/secrets/<approved-gemini-staging-secret>";

const HEAD_SHA = "aaa79da9120eb5d63ed5eb6dc8555967827d51f9";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4N Staging Secret Wiring Execution Candidate, Approval Required ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64jDoc = readFileSync(V64J_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64n-staging-secret-wiring-execution-candidate-approval-required.mts",
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
  ok("v6.4N doc exists", doc.length > 6000);
  ok("doc v6.4N label", doc.includes("v6.4N"));
  ok("v6.4J doc exists", existsSync(V64J_DOC) && v64jDoc.includes("v6.4J"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 6–13. docs safety positioning ---
{
  ok("doc HEAD aaa79da", doc.includes(HEAD_SHA) || doc.includes("aaa79da"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc no secret creation", /does not create secrets/i.test(doc));
  ok("doc no secret read", /does not read secrets/i.test(doc));
  ok("doc no secret binding", /does not bind secrets/i.test(doc));
  ok("doc no env update", /does not update env vars/i.test(doc));
  ok(
    "doc no gcloud command execution",
    /does not execute gcloud commands/i.test(doc)
  );
  ok(
    "doc no automatic future authorization",
    /does not authorize future execution automatically/i.test(doc)
  );
}

// --- 14–17. future inputs and command plan ---
{
  ok("doc future inputs required", /Future Execution Inputs Required/i.test(doc));
  ok(
    "doc non-secret placeholders only",
    /non-secret placeholder only/i.test(doc)
  );
  ok("doc safe resource placeholder", doc.includes(SAFE_RESOURCE_PLACEHOLDER));
  ok(
    "doc future command plan",
    /Future Command Plan.*Non-Executable Template/i.test(doc)
  );
  ok("doc DO NOT RUN IN v64n", /DO NOT RUN IN v6\.4N/i.test(doc));
}

// --- 18–31. approval gates ---
{
  ok("doc approval gates", /Approval Gates Before Future Execution/i.test(doc));
  ok("doc owner approval gate", /SE-01.*Owner approval/i.test(doc));
  ok("doc infra approval gate", /SE-02.*Infra approval/i.test(doc));
  ok("doc staging-only target", /SE-03.*Staging-only target/i.test(doc));
  ok(
    "doc Secret Manager resource path approval",
    /SE-04.*Secret Manager resource path/i.test(doc)
  );
  ok("doc IAM least privilege", /SE-05.*IAM least privilege/i.test(doc));
  ok(
    "doc Cloud Run service region approval",
    /SE-06.*Cloud Run service/i.test(doc)
  );
  ok("doc env var binding approval", /SE-07.*Env var binding/i.test(doc));
  ok(
    "doc no env secret dump policy",
    /SE-09.*No secret\/env dump policy/i.test(doc)
  );
  ok(
    "doc redaction logging contract approval",
    /SE-10.*Redaction\/logging contract/i.test(doc)
  );
  ok(
    "doc synthetic fixture verification",
    /SE-11.*Synthetic fixture verification/i.test(doc)
  );
  ok(
    "doc separate Cloud Run env update approval",
    /SE-17.*Separate Cloud Run env update/i.test(doc)
  );
  ok("doc separate deploy approval", /SE-18.*Separate deploy approval/i.test(doc));
  ok(
    "doc separate real provider activation approval",
    /SE-19.*Separate real provider activation/i.test(doc)
  );
}

// --- 32–37. sequence / verify / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc future execution sequence plan only",
    /Future Execution Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4N/i.test(doc)
  );
  ok(
    "doc metadata-only verification rules",
    /Metadata-Only Verification Rules/i.test(doc)
  );
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc rollback removal plan", /Rollback.*Removal Plan/i.test(doc));
  ok(
    "doc non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to create, read, bind, or use secrets/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4O boundary", /v6\.4O/i.test(doc));
  ok("doc v6.4Q boundary", /v6\.4Q/i.test(doc));
}

// --- 38–46. static guards ---
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
    "v64m fixture not wired app",
    !appSrc.includes("redactionTestFixtures")
  );
  ok(
    "v64m fixture serialized clean",
    assertNoForbiddenSensitiveContent(
      JSON.stringify(SYNTHETIC_REDACTION_FIXTURES.metadata)
    ).pass
  );
}

// --- integration boundary ---
{
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok("fixture no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(fixtureSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
}

// --- no secrets / PII / real ids ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret value ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no secret value ${pat.source.slice(0, 12)}`, !pat.test(selfCodeOnly));
  }
  for (const pat of SECRET_LOOKING_PLACEHOLDER_PATTERNS) {
    ok(`doc no secret-like ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no real project id ${pat.source.slice(0, 12)}`, !pat.test(selfCodeOnly));
  }
  for (const pat of AUTO_SECRET_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to bind phrase",
    /not approval to create, read, bind, or use secrets/i.test(doc)
  );
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref ---
{
  ok("doc references v6.4J", doc.includes("v6.4J"));
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
  ok("doc references redactionTestFixtures", doc.includes("redactionTestFixtures"));
}

// --- package script ---
{
  ok(
    "package v64n script",
    pkg.includes(
      "test:v64n-staging-secret-wiring-execution-candidate-approval-required"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64n-staging-secret-wiring-execution-candidate-approval-required.mts"
    )
  );
}

console.log(
  "\nDone v6.4N Staging Secret Wiring Execution Candidate, Approval Required tests."
);
if (process.exitCode) process.exit(process.exitCode);

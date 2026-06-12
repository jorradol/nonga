/**
 * v6.4Q — Staging Secret Wiring Final Go/No-Go Approval Packet (static validation only)
 * npm run test:v64q-staging-secret-wiring-final-go-no-go-approval-packet
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
  "docs/v6.4Q-staging-secret-wiring-final-go-no-go-approval-packet.md";
const V64P_DOC =
  "docs/v6.4P-runtime-redaction-integration-candidate-approval-required.md";
const V64N_DOC =
  "docs/v6.4N-staging-secret-wiring-execution-candidate-approval-required.md";
const V64J_DOC = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
const V64I_DOC = "docs/v6.4I-owner-approval-packet-pilot-runbook.md";
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

const AUTO_SECRET_AUTH_PATTERNS = [
  /this\s+packet\s+is\s+approval\s+to\s+create/i,
  /this\s+packet\s+is\s+approval\s+to\s+bind/i,
  /v6\.4Q\s+approves\s+secret\s+wiring\s+automatically/i,
  /packet\s+authorizes\s+secret\s+execution\s+automatically/i,
];

const SAFE_RESOURCE_PLACEHOLDER =
  "projects/<approved-staging-project>/secrets/<approved-gemini-staging-secret>";

const HEAD_SHA = "f5cfd77c0d9963fc5fb132db49b14fb212c8b6ff";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4Q Staging Secret Wiring Final Go/No-Go Approval Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64pDoc = readFileSync(V64P_DOC, "utf8");
const v64nDoc = readFileSync(V64N_DOC, "utf8");
const v64jDoc = readFileSync(V64J_DOC, "utf8");
const v64iDoc = readFileSync(V64I_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64q-staging-secret-wiring-final-go-no-go-approval-packet.mts",
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
  ok("v6.4Q doc exists", doc.length > 6000);
  ok("doc v6.4Q label", doc.includes("v6.4Q"));
  ok("v6.4P doc exists", existsSync(V64P_DOC) && v64pDoc.includes("v6.4P"));
  ok("v6.4N doc exists", existsSync(V64N_DOC) && v64nDoc.includes("v6.4N"));
  ok("v6.4J doc exists", existsSync(V64J_DOC) && v64jDoc.includes("v6.4J"));
  ok("v6.4I doc exists", existsSync(V64I_DOC) && v64iDoc.includes("v6.4I"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 9–17. docs safety positioning ---
{
  ok("doc HEAD f5cfd77", doc.includes(HEAD_SHA) || doc.includes("f5cfd77"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc no secret creation", /does not create secrets/i.test(doc));
  ok("doc no secret read", /does not read secrets/i.test(doc));
  ok("doc no secret binding", /does not bind secrets/i.test(doc));
  ok(
    "doc no Cloud Run env update",
    /does not update Cloud Run env/i.test(doc)
  );
  ok(
    "doc no gcloud command execution",
    /does not execute gcloud commands/i.test(doc)
  );
  ok("doc no Gemini activation", /does not activate Gemini/i.test(doc));
  ok(
    "doc no automatic future authorization",
    /does not authorize future execution automatically/i.test(doc)
  );
}

// --- 18–25. go/no-go template ---
{
  ok(
    "doc final GO NO-GO HOLD template",
    /GO\s*\/\s*NO-GO\s*\/\s*HOLD/i.test(doc)
  );
  ok("doc default decision is NO-GO", /Default.*NO-GO|Default:\s*NO-GO/i.test(doc));
  ok("doc owner sign-off", /Owner sign-off/i.test(doc));
  ok("doc infra sign-off", /Infra sign-off/i.test(doc));
  ok(
    "doc explicit Cloud Run env update approval",
    /Explicit Cloud Run env update approval/i.test(doc)
  );
  ok("doc explicit deploy approval", /Explicit deploy approval/i.test(doc));
  ok(
    "doc explicit provider activation approval",
    /Explicit real provider activation approval/i.test(doc)
  );
  ok(
    "doc explicit Gemini invocation approval",
    /Explicit Gemini invocation approval/i.test(doc)
  );
}

// --- 26–37. evidence checklist ---
{
  ok("doc final evidence checklist", /Final Evidence Checklist/i.test(doc));
  ok("doc v6.4J review", /EC-01.*v6\.4J secret wiring plan reviewed/i.test(doc));
  ok("doc v6.4N review", /EC-02.*v6\.4N execution candidate reviewed/i.test(doc));
  ok(
    "doc v6.4K review",
    /EC-04.*v6\.4K redaction\/logging contract reviewed/i.test(doc)
  );
  ok(
    "doc v6.4M fixture verification",
    /EC-05.*v6\.4M synthetic fixture verification passed/i.test(doc)
  );
  ok(
    "doc v6.4P runtime candidate review",
    /EC-06.*v6\.4P runtime integration candidate reviewed/i.test(doc)
  );
  ok("doc IAM least privilege", /EC-10.*IAM least privilege reviewed/i.test(doc));
  ok(
    "doc no env secret dump policy",
    /EC-11.*No env\/secret dump policy approved/i.test(doc)
  );
  ok("doc cost cap", /EC-13.*Cost cap reviewed/i.test(doc));
  ok("doc kill switch", /EC-14.*Kill switch reviewed/i.test(doc));
  ok("doc allowlist", /EC-15.*Allowlist reviewed/i.test(doc));
  ok(
    "doc metadata-only verification",
    /EC-18.*Metadata-only verification plan reviewed/i.test(doc)
  );
}

// --- 38–43. preflight / sequence / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc final preflight static verification",
    /Final Preflight Static Verification/i.test(doc)
  );
  ok(
    "doc future execution sequence plan only",
    /Final Future Execution Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4Q/i.test(doc)
  );
  ok("doc final stop conditions", /Final Stop Conditions/i.test(doc));
  ok(
    "doc final rollback removal plan",
    /Final Rollback.*Removal Plan/i.test(doc)
  );
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to create, read, bind, or use secrets/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4R boundary", /v6\.4R/i.test(doc));
  ok("doc v6.4Q.EXEC boundary", /v6\.4Q\.EXEC|v6\.4Q\.1/i.test(doc));
}

// --- safe placeholder in doc ---
{
  ok("doc uses safe resource placeholder", doc.includes(SAFE_RESOURCE_PLACEHOLDER));
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 44–54. static guards ---
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
  for (const pat of AUTO_SECRET_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to execute gcloud",
    /not approval to execute gcloud commands/i.test(doc)
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
  ok("doc references v6.4J", doc.includes("v6.4J"));
  ok("doc references v6.4N", doc.includes("v6.4N"));
  ok("doc references v6.4I", doc.includes("v6.4I"));
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
  ok("doc references v6.4P", doc.includes("v6.4P"));
}

// --- package script ---
{
  ok(
    "package v64q script",
    pkg.includes(
      "test:v64q-staging-secret-wiring-final-go-no-go-approval-packet"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64q-staging-secret-wiring-final-go-no-go-approval-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.4Q Staging Secret Wiring Final Go/No-Go Approval Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

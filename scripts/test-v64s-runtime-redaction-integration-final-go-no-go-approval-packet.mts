/**
 * v6.4S — Runtime Redaction Integration Final Go/No-Go Approval Packet (static validation only)
 * npm run test:v64s-runtime-redaction-integration-final-go-no-go-approval-packet
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
  "docs/v6.4S-runtime-redaction-integration-final-go-no-go-approval-packet.md";
const V64R_DOC =
  "docs/v6.4R-synthetic-invocation-final-go-no-go-approval-packet.md";
const V64Q_DOC =
  "docs/v6.4Q-staging-secret-wiring-final-go-no-go-approval-packet.md";
const V64P_DOC =
  "docs/v6.4P-runtime-redaction-integration-candidate-approval-required.md";
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
  /this\s+packet\s+is\s+approval\s+to\s+integrate\s+redaction\s+into\s+runtime/i,
  /v6\.4S\s+approves\s+runtime\s+integration\s+automatically/i,
  /packet\s+authorizes\s+runtime\s+integration\s+execution\s+automatically/i,
];

const HEAD_SHA = "05b3617ba8c54303afa2fb5e12552f1af9286544";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4S Runtime Redaction Integration Final Go/No-Go Approval Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64rDoc = readFileSync(V64R_DOC, "utf8");
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const v64pDoc = readFileSync(V64P_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64s-runtime-redaction-integration-final-go-no-go-approval-packet.mts",
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

// --- 1–7. docs and modules exist ---
{
  ok("v6.4S doc exists", doc.length > 6000);
  ok("doc v6.4S label", doc.includes("v6.4S"));
  ok("v6.4R doc exists", existsSync(V64R_DOC) && v64rDoc.includes("v6.4R"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4P doc exists", existsSync(V64P_DOC) && v64pDoc.includes("v6.4P"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 8–17. docs safety positioning ---
{
  ok("doc HEAD 05b3617", doc.includes(HEAD_SHA) || doc.includes("05b3617"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no runtime redaction integration",
    /does not integrate redaction into runtime/i.test(doc)
  );
  ok(
    "doc no App user chat live runtime import",
    /does not import helpers into App or user\/chat\/live runtime/i.test(doc)
  );
  ok("doc no runtime logging", /does not add runtime logging/i.test(doc));
  ok("doc no AI log persistence", /does not persist AI logs/i.test(doc));
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
    /does not authorize future integration automatically/i.test(doc)
  );
}

// --- 18–26. go/no-go template ---
{
  ok(
    "doc final GO NO-GO HOLD template",
    /GO\s*\/\s*NO-GO\s*\/\s*HOLD/i.test(doc)
  );
  ok("doc default decision is NO-GO", /Default.*NO-GO|Default:\s*NO-GO/i.test(doc));
  ok("doc owner sign-off", /Owner sign-off/i.test(doc));
  ok("doc technical sign-off", /Technical sign-off/i.test(doc));
  ok(
    "doc explicit runtime integration approval",
    /Explicit runtime integration approval/i.test(doc)
  );
  ok("doc explicit deploy approval", /Explicit deploy approval/i.test(doc));
  ok(
    "doc explicit provider activation approval",
    /Explicit real provider activation approval/i.test(doc)
  );
  ok(
    "doc explicit user-visible answer approval",
    /Explicit user-visible answer approval/i.test(doc)
  );
  ok(
    "doc explicit DB business mutation approval",
    /Explicit DB\/business mutation approval/i.test(doc)
  );
}

// --- 27–42. evidence checklist ---
{
  ok(
    "doc final runtime integration evidence checklist",
    /Final Runtime Integration Evidence Checklist/i.test(doc)
  );
  ok(
    "doc v6.4P review",
    /EC-01.*v6\.4P runtime integration candidate reviewed/i.test(doc)
  );
  ok(
    "doc v6.4K redaction logging contract",
    /EC-02.*v6\.4K redaction\/logging contract reviewed/i.test(doc)
  );
  ok(
    "doc v6.4M fixture verification",
    /EC-03.*v6\.4M synthetic fixture verification passed/i.test(doc)
  );
  ok(
    "doc v6.4R synthetic invocation Go/No-Go review",
    /EC-04.*v6\.4R synthetic invocation Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4Q secret wiring Go/No-Go review if needed",
    /EC-05.*v6\.4Q secret wiring Go\/No-Go reviewed if needed/i.test(doc)
  );
  ok(
    "doc staging-only target",
    /EC-07.*Staging-only target confirmed/i.test(doc)
  );
  ok(
    "doc proposed runtime paths",
    /EC-08.*Proposed runtime paths identified/i.test(doc)
  );
  ok(
    "doc no App user chat live import without approval",
    /EC-09.*No App\/user\/chat\/live import without approval/i.test(doc)
  );
  ok(
    "doc metadata allowlist",
    /EC-10.*Metadata allowlist approved/i.test(doc)
  );
  ok(
    "doc forbidden-to-log contract",
    /EC-11.*Forbidden-to-log contract approved/i.test(doc)
  );
  ok(
    "doc failure fallback",
    /EC-12.*Failure fallback approved/i.test(doc)
  );
  ok(
    "doc kill switch cost cap allowlist behavior",
    /EC-13.*Kill switch behavior approved/i.test(doc) &&
      /EC-14.*Cost cap behavior approved/i.test(doc) &&
      /EC-15.*Allowlist behavior approved/i.test(doc)
  );
  ok(
    "doc logging sink retention access control approval",
    /EC-16.*Logging sink behavior approved/i.test(doc) &&
      /EC-17.*Retention\/access control approved/i.test(doc)
  );
  ok(
    "doc no user-visible answer guarantee",
    /EC-18.*No user-visible answer guarantee approved/i.test(doc)
  );
  ok(
    "doc no DB business mutation guarantee",
    /EC-19.*No DB\/business mutation guarantee approved/i.test(doc)
  );
}

// --- 43–51. preflight / sequence / result / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc final preflight static verification",
    /Final Preflight Static Verification/i.test(doc)
  );
  ok(
    "doc future runtime integration sequence plan only",
    /Final Future Runtime Integration Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4S/i.test(doc)
  );
  ok(
    "doc final expected runtime integration result contract",
    /Final Expected Runtime Integration Result Contract/i.test(doc)
  );
  ok(
    "doc realGeminiEnabled remains false",
    /realGeminiEnabled.*Must remain `false`|remains false in v6\.4S/i.test(doc)
  );
  ok(
    "doc networkCallMade remains false",
    /networkCallMade.*Must remain `false` in v6\.4S|remains false in v6\.4S/i.test(
      doc
    )
  );
  ok("doc final stop conditions", /Final Stop Conditions/i.test(doc));
  ok(
    "doc final rollback removal plan",
    /Final Rollback.*Removal Plan/i.test(doc)
  );
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to integrate redaction into runtime/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4S.EXEC boundary", /v6\.4S\.EXEC|v6\.4S\.1/i.test(doc));
}

// --- 52–64. static guards ---
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
    "self no gcloud command execution",
    !/execSync\s*\(/.test(selfCodeOnly) &&
      !/spawnSync\s*\(/.test(selfCodeOnly) &&
      !/child_process/.test(selfCodeOnly)
  );
  ok("self no dotenv file write", !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly));
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
  for (const pat of AUTO_INTEGRATION_AUTH_PATTERNS) {
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
  ok("doc references v6.4P", doc.includes("v6.4P"));
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
  ok("doc references v6.4R", doc.includes("v6.4R"));
  ok("doc references v6.4Q", doc.includes("v6.4Q"));
}

// --- package script ---
{
  ok(
    "package v64s script",
    pkg.includes(
      "test:v64s-runtime-redaction-integration-final-go-no-go-approval-packet"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64s-runtime-redaction-integration-final-go-no-go-approval-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.4S Runtime Redaction Integration Final Go/No-Go Approval Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

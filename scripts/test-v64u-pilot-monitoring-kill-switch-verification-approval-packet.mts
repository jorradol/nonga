/**
 * v6.4U — Pilot Monitoring / Kill Switch Verification Approval Packet (static validation only)
 * npm run test:v64u-pilot-monitoring-kill-switch-verification-approval-packet
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

const AUTO_VERIFY_AUTH_PATTERNS = [
  /this\s+packet\s+is\s+approval\s+to\s+verify\s+monitoring\s+at\s+runtime/i,
  /v6\.4U\s+approves\s+kill\s+switch\s+verification\s+automatically/i,
  /packet\s+authorizes\s+monitoring\s+verification\s+automatically/i,
];

const HEAD_SHA = "7185a6bcc67df1cc38c5129cf519f1e87cf6dd8f";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4U Pilot Monitoring / Kill Switch Verification Approval Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64tDoc = readFileSync(V64T_DOC, "utf8");
const v64sDoc = readFileSync(V64S_DOC, "utf8");
const v64rDoc = readFileSync(V64R_DOC, "utf8");
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64u-pilot-monitoring-kill-switch-verification-approval-packet.mts",
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
  ok("v6.4U doc exists", doc.length > 6000);
  ok("doc v6.4U label", doc.includes("v6.4U"));
  ok("v6.4T doc exists", existsSync(V64T_DOC) && v64tDoc.includes("v6.4T"));
  ok("v6.4S doc exists", existsSync(V64S_DOC) && v64sDoc.includes("v6.4S"));
  ok("v6.4R doc exists", existsSync(V64R_DOC) && v64rDoc.includes("v6.4R"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 9–20. docs safety positioning ---
{
  ok("doc HEAD 7185a6b", doc.includes(HEAD_SHA) || doc.includes("7185a6b"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no monitoring runtime verification",
    /does not verify monitoring at runtime/i.test(doc)
  );
  ok(
    "doc no kill switch execution",
    /does not execute kill switch verification/i.test(doc)
  );
  ok(
    "doc no runtime monitoring implementation",
    /does not add runtime monitoring/i.test(doc)
  );
  ok("doc no runtime logging", /does not add runtime logging/i.test(doc));
  ok("doc no AI log persistence", /does not persist AI logs/i.test(doc));
  ok(
    "doc no analytics event creation",
    /does not create analytics events/i.test(doc)
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
    "doc no automatic future authorization",
    /does not authorize future monitoring\/kill-switch verification automatically/i.test(
      doc
    )
  );
}

// --- 21–30. decision template ---
{
  ok(
    "doc monitoring kill switch decision template",
    /Monitoring \/ Kill Switch Decision Template/i.test(doc)
  );
  ok(
    "doc GO NO-GO HOLD template",
    /GO\s*\/\s*NO-GO\s*\/\s*HOLD/i.test(doc)
  );
  ok("doc default decision is NO-GO", /Default.*NO-GO|Default:\s*NO-GO/i.test(doc));
  ok("doc owner sign-off", /Owner sign-off/i.test(doc));
  ok("doc technical sign-off", /Technical sign-off/i.test(doc));
  ok(
    "doc explicit monitoring verification approval",
    /Explicit monitoring verification approval/i.test(doc)
  );
  ok(
    "doc explicit kill switch verification approval",
    /Explicit kill switch verification approval/i.test(doc)
  );
  ok(
    "doc explicit provider activation approval",
    /Explicit provider activation approval/i.test(doc)
  );
  ok("doc explicit deploy approval", /Explicit deploy approval/i.test(doc));
  ok(
    "doc explicit user-visible answer approval",
    /Explicit user-visible answer approval/i.test(doc)
  );
  ok(
    "doc explicit DB business mutation approval",
    /Explicit DB\/business mutation approval/i.test(doc)
  );
}

// --- 31–38. metadata + kill switch contracts ---
{
  ok(
    "doc monitoring metadata contract",
    /Monitoring Metadata Contract/i.test(doc)
  );
  ok("doc allowed metadata list", /Allowed metadata/i.test(doc));
  ok(
    "doc forbidden monitoring logging list",
    /Forbidden monitoring\/logging/i.test(doc)
  );
  ok(
    "doc no reconstructable metadata",
    /no reconstructable metadata/i.test(doc)
  );
  ok(
    "doc kill switch verification contract",
    /Kill Switch Verification Contract/i.test(doc)
  );
  ok(
    "doc kill switch blocks before network",
    /kill switch can block next provider request before network/i.test(doc)
  );
  ok(
    "doc deterministic fallback",
    /kill switch can force deterministic fallback/i.test(doc)
  );
  ok(
    "doc fail closed if kill switch state unknown",
    /if kill switch state is unknown, system must fail closed/i.test(doc)
  );
}

// --- 39–51. evidence checklist ---
{
  ok(
    "doc final verification evidence checklist",
    /Final Verification Evidence Checklist/i.test(doc)
  );
  ok(
    "doc v6.4T pilot smoke Go/No-Go review",
    /VC-01.*v6\.4T pilot smoke Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4S runtime redaction Go/No-Go review",
    /VC-02.*v6\.4S runtime redaction Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4R synthetic invocation Go/No-Go review",
    /VC-03.*v6\.4R synthetic invocation Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4Q secret wiring Go/No-Go review",
    /VC-04.*v6\.4Q secret wiring Go\/No-Go reviewed/i.test(doc)
  );
  ok(
    "doc v6.4K redaction logging contract",
    /VC-05.*v6\.4K redaction\/logging contract reviewed/i.test(doc)
  );
  ok(
    "doc v6.4M fixture verification",
    /VC-06.*v6\.4M synthetic fixture verification passed/i.test(doc)
  );
  ok(
    "doc staging-only target",
    /VC-08.*Staging-only target confirmed/i.test(doc)
  );
  ok(
    "doc monitoring sink access retention",
    /VC-10.*Monitoring sink\/access\/retention approved/i.test(doc)
  );
  ok("doc kill switch owner", /VC-12.*Kill switch owner approved/i.test(doc));
  ok(
    "doc cost cap rate limit quota thresholds",
    /VC-14.*Cost cap alert threshold approved/i.test(doc) &&
      /VC-15.*Rate limit\/quota threshold approved/i.test(doc)
  );
  ok(
    "doc allowlist boundary",
    /VC-16.*Allowlist boundary approved/i.test(doc)
  );
  ok(
    "doc fallback behavior",
    /VC-17.*Fallback behavior approved/i.test(doc)
  );
}

// --- 52–61. sequence / result / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc future monitoring kill switch sequence plan only",
    /Future Monitoring \/ Kill Switch Verification Sequence.*Plan Only/i.test(
      doc
    ) && /does not execute in v6\.4U/i.test(doc)
  );
  ok(
    "doc expected future verification result contract",
    /Expected Future Verification Result Contract/i.test(doc)
  );
  ok(
    "doc realGeminiEnabled remains false",
    /realGeminiEnabled.*Must remain `false`|remains false in v6\.4U/i.test(doc)
  );
  ok(
    "doc networkCallMade remains false",
    /networkCallMade.*Must remain `false` in v6\.4U|remains false in v6\.4U/i.test(
      doc
    )
  );
  ok(
    "doc no user-visible answer",
    /No user-visible answer|no user-visible answer/i.test(doc)
  );
  ok(
    "doc no DB business mutation",
    /No lead\/payment\/reveal\/outcome mutation|no DB\/business mutation/i.test(
      doc
    )
  );
  ok("doc final stop conditions", /Final Stop Conditions/i.test(doc));
  ok("doc rollback removal plan", /Rollback \/ Removal Plan/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to verify monitoring at runtime/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4U.EXEC boundary", /v6\.4U\.EXEC|v6\.4U\.1/i.test(doc));
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 62–73. static guards ---
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
  for (const pat of AUTO_VERIFY_AUTH_PATTERNS) {
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
    "package v64u script",
    pkg.includes(
      "test:v64u-pilot-monitoring-kill-switch-verification-approval-packet"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64u-pilot-monitoring-kill-switch-verification-approval-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.4U Pilot Monitoring / Kill Switch Verification Approval Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

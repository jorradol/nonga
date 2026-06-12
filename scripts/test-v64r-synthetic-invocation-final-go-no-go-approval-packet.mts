/**
 * v6.4R — Synthetic Invocation Final Go/No-Go Approval Packet (static validation only)
 * npm run test:v64r-synthetic-invocation-final-go-no-go-approval-packet
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
  "docs/v6.4R-synthetic-invocation-final-go-no-go-approval-packet.md";
const V64Q_DOC =
  "docs/v6.4Q-staging-secret-wiring-final-go-no-go-approval-packet.md";
const V64P_DOC =
  "docs/v6.4P-runtime-redaction-integration-candidate-approval-required.md";
const V64O_DOC =
  "docs/v6.4O-synthetic-invocation-execution-candidate-approval-required.md";
const V64L_DOC =
  "docs/v6.4L-synthetic-real-provider-invocation-plan-docs-only.md";
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

const AUTO_INVOCATION_AUTH_PATTERNS = [
  /this\s+packet\s+is\s+approval\s+to\s+invoke\s+gemini/i,
  /v6\.4R\s+approves\s+synthetic\s+invocation\s+automatically/i,
  /packet\s+authorizes\s+invocation\s+execution\s+automatically/i,
];

const HEAD_SHA = "7c2e956149d772dfe11e8500870f1dbf7cdb274b";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4R Synthetic Invocation Final Go/No-Go Approval Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const v64pDoc = readFileSync(V64P_DOC, "utf8");
const v64oDoc = readFileSync(V64O_DOC, "utf8");
const v64lDoc = readFileSync(V64L_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const fixtureSrc = readFileSync(V64M_FIXTURE, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64r-synthetic-invocation-final-go-no-go-approval-packet.mts",
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
  ok("v6.4R doc exists", doc.length > 6000);
  ok("doc v6.4R label", doc.includes("v6.4R"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4P doc exists", existsSync(V64P_DOC) && v64pDoc.includes("v6.4P"));
  ok("v6.4O doc exists", existsSync(V64O_DOC) && v64oDoc.includes("v6.4O"));
  ok("v6.4L doc exists", existsSync(V64L_DOC) && v64lDoc.includes("v6.4L"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4M fixture exists", existsSync(V64M_FIXTURE));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 9–16. docs safety positioning ---
{
  ok("doc HEAD 7c2e956", doc.includes(HEAD_SHA) || doc.includes("7c2e956"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok("doc no prompt sending", /does not send prompts/i.test(doc));
  ok(
    "doc no provider payload sending",
    /does not send provider payloads/i.test(doc)
  );
  ok(
    "doc no network execution",
    /does not execute network calls/i.test(doc)
  );
  ok(
    "doc no runtime invocation code",
    /does not add runtime invocation code/i.test(doc)
  );
  ok(
    "doc no automatic future authorization",
    /does not authorize future execution automatically/i.test(doc)
  );
}

// --- 17–25. go/no-go template ---
{
  ok(
    "doc final GO NO-GO HOLD template",
    /GO\s*\/\s*NO-GO\s*\/\s*HOLD/i.test(doc)
  );
  ok("doc default decision is NO-GO", /Default.*NO-GO|Default:\s*NO-GO/i.test(doc));
  ok("doc owner sign-off", /Owner sign-off/i.test(doc));
  ok("doc technical sign-off", /Technical sign-off/i.test(doc));
  ok("doc explicit deploy approval", /Explicit deploy approval/i.test(doc));
  ok(
    "doc explicit provider activation approval",
    /Explicit real provider activation approval/i.test(doc)
  );
  ok(
    "doc explicit synthetic invocation approval",
    /Explicit synthetic invocation execution approval/i.test(doc)
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

// --- 26–40. evidence checklist ---
{
  ok(
    "doc final synthetic payload evidence checklist",
    /Final Synthetic Payload Evidence Checklist/i.test(doc)
  );
  ok(
    "doc v6.4L review",
    /EC-01.*v6\.4L synthetic invocation plan reviewed/i.test(doc)
  );
  ok(
    "doc v6.4O review",
    /EC-02.*v6\.4O synthetic execution candidate reviewed/i.test(doc)
  );
  ok(
    "doc v6.4M fixture verification",
    /EC-03.*v6\.4M synthetic fixture verification passed/i.test(doc)
  );
  ok(
    "doc v6.4K redaction logging contract",
    /EC-04.*v6\.4K redaction\/logging contract reviewed/i.test(doc)
  );
  ok(
    "doc v6.4P runtime candidate review",
    /EC-05.*v6\.4P runtime redaction candidate reviewed/i.test(doc)
  );
  ok(
    "doc v6.4Q secret wiring review if needed",
    /EC-06.*v6\.4Q secret wiring Go\/No-Go reviewed if secret wiring is needed/i.test(
      doc
    )
  );
  ok(
    "doc staging-only target",
    /EC-08.*Staging-only target confirmed/i.test(doc)
  );
  ok(
    "doc no real user dealer car data guarantee",
    /EC-10.*No real user\/dealer\/car data guarantee approved/i.test(doc)
  );
  ok(
    "doc metadata-only monitoring",
    /EC-12.*Metadata-only monitoring reviewed/i.test(doc)
  );
  ok("doc cost cap", /EC-13.*Cost cap reviewed/i.test(doc));
  ok("doc rate limit quota", /EC-14.*Rate limit\/quota reviewed/i.test(doc));
  ok("doc kill switch", /EC-15.*Kill switch reviewed/i.test(doc));
  ok("doc allowlist", /EC-16.*Allowlist reviewed/i.test(doc));
  ok(
    "doc fallback behavior",
    /EC-17.*Fallback behavior reviewed/i.test(doc)
  );
}

// --- 41–51. preflight / sequence / result / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc final preflight static verification",
    /Final Preflight Static Verification/i.test(doc)
  );
  ok(
    "doc future invocation sequence plan only",
    /Final Future Synthetic Invocation Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4R/i.test(doc)
  );
  ok(
    "doc final expected synthetic invocation result contract",
    /Final Expected Synthetic Invocation Result Contract/i.test(doc)
  );
  ok(
    "doc realGeminiEnabled remains false",
    /realGeminiEnabled.*Must remain `false`|remains false in v6\.4R/i.test(doc)
  );
  ok(
    "doc networkCallMade remains false",
    /networkCallMade.*Must remain `false` in v6\.4R|remains false in v6\.4R/i.test(
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
  ok(
    "doc final rollback removal plan",
    /Final Rollback.*Removal Plan/i.test(doc)
  );
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to invoke Gemini/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4R.EXEC boundary", /v6\.4R\.EXEC|v6\.4R\.1/i.test(doc));
}

// --- 52–63. static guards ---
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
  for (const pat of AUTO_INVOCATION_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to send provider payloads",
    /not approval to send provider payloads/i.test(doc)
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
  ok("doc references v6.4L", doc.includes("v6.4L"));
  ok("doc references v6.4O", doc.includes("v6.4O"));
  ok("doc references v6.4M", doc.includes("v6.4M"));
  ok("doc references v6.4K", doc.includes("v6.4K"));
  ok("doc references v6.4P", doc.includes("v6.4P"));
  ok("doc references v6.4Q", doc.includes("v6.4Q"));
}

// --- package script ---
{
  ok(
    "package v64r script",
    pkg.includes("test:v64r-synthetic-invocation-final-go-no-go-approval-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64r-synthetic-invocation-final-go-no-go-approval-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.4R Synthetic Invocation Final Go/No-Go Approval Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

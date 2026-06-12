/**
 * v6.5D — Production Incident / Rollback Playbook Packet (static validation only)
 * npm run test:v65d-production-incident-rollback-playbook-packet
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

const DOC_PATH = "docs/v6.5D-production-incident-rollback-playbook-packet.md";
const V65C_DOC =
  "docs/v6.5C-production-cost-guard-quota-review-packet.md";
const V65B_DOC =
  "docs/v6.5B-production-privacy-data-handling-review-packet.md";
const V65A_DOC =
  "docs/v6.5A-production-readiness-gap-review-phase-transition-baseline.md";
const V64U_DOC =
  "docs/v6.4U-pilot-monitoring-kill-switch-verification-approval-packet.md";
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

const BILLING_INCIDENT_PATTERNS = [
  /\bbilling[_-]?account[_-]?id\s*[=:]\s*['"][^'"]{6,}['"]/i,
  /\binvoice[_-]?(?:number|id)\s*[=:]\s*['"][^'"]{6,}['"]/i,
  /payment[_-]?method\s*[=:]\s*['"][^'"]{6,}['"]/i,
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
  /this\s+document\s+is\s+approval\s+to\s+execute\s+rollback/i,
  /v6\.5D\s+approves\s+incident\s+response\s+automatically/i,
  /playbook\s+authorizes\s+rollback\s+automatically/i,
  /packet\s+authorizes\s+production\s+promotion\s+automatically/i,
];

const HEAD_SHA = "e7bec841b0101a9a2c62eefce2717236c0a5d64a";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.5D Production Incident / Rollback Playbook Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65cDoc = readFileSync(V65C_DOC, "utf8");
const v65bDoc = readFileSync(V65B_DOC, "utf8");
const v65aDoc = readFileSync(V65A_DOC, "utf8");
const v64uDoc = readFileSync(V64U_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65d-production-incident-rollback-playbook-packet.mts",
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
  ok("v6.5D doc exists", doc.length > 9000);
  ok("doc v6.5D label", doc.includes("v6.5D"));
  ok("v6.5C doc exists", existsSync(V65C_DOC) && v65cDoc.includes("v6.5C"));
  ok("v6.5B doc exists", existsSync(V65B_DOC) && v65bDoc.includes("v6.5B"));
  ok("v6.5A doc exists", existsSync(V65A_DOC) && v65aDoc.includes("v6.5A"));
  ok("v6.4U doc exists", existsSync(V64U_DOC) && v64uDoc.includes("v6.4U"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 7–22. safety positioning ---
{
  ok("doc HEAD e7bec84", doc.includes(HEAD_SHA) || doc.includes("e7bec84"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no incident execution",
    /does not execute incident response|no incident execution/i.test(doc)
  );
  ok(
    "doc no rollback execution",
    /does not execute rollback|no rollback execution/i.test(doc)
  );
  ok(
    "doc no Cloud Run env update",
    /does not update Cloud Run|no Cloud Run env update/i.test(doc)
  );
  ok("doc no Firestore write", /does not write Firestore|no Firestore write/i.test(doc));
  ok(
    "doc no secret env change",
    /does not create\/read\/bind secrets|no secret.*change/i.test(doc)
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
    "doc no runtime invocation code",
    /no runtime invocation code/i.test(doc)
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
    "doc incident rollback playbook only",
    /incident \/ rollback playbook packet only|incident\/rollback playbook packet/i.test(
      doc
    )
  );
}

// --- 23–61. required sections ---
{
  ok(
    "doc incident classification matrix",
    /Incident Classification Matrix/i.test(doc)
  );
  ok(
    "doc AI provider accidentally activated",
    /AI provider accidentally activated/i.test(doc)
  );
  ok("doc unexpected network call", /Unexpected network call/i.test(doc));
  ok(
    "doc privacy PII exposure risk",
    /Privacy\/PII exposure risk/i.test(doc)
  );
  ok("doc raw prompt logged", /Raw prompt logged/i.test(doc));
  ok(
    "doc provider body persisted",
    /Provider request\/response body persisted/i.test(doc)
  );
  ok("doc secret env leak", /Secret\/env leak/i.test(doc));
  ok(
    "doc cost spike quota runaway",
    /Cost spike.*quota runaway|Cost spike \/ quota runaway/i.test(doc)
  );
  ok(
    "doc retry loop provider error storm",
    /Retry loop.*provider error storm|Retry loop \/ provider error storm/i.test(
      doc
    )
  );
  ok("doc kill switch unavailable", /Kill switch unavailable/i.test(doc));
  ok("doc fallback failure", /Fallback failure/i.test(doc));
  ok(
    "doc user-visible AI answer without approval",
    /User-visible AI answer appears without approval/i.test(doc)
  );
  ok(
    "doc business mutation without approval",
    /Business mutation appears without approval/i.test(doc)
  );
  ok("doc production traffic detected", /Production traffic detected/i.test(doc));
  ok(
    "doc deploy happened without approval",
    /Deploy happened without approval/i.test(doc)
  );
  ok("doc monitoring blind spot", /Monitoring blind spot/i.test(doc));
  ok("doc staging bundle mismatch", /Staging bundle mismatch/i.test(doc));
  ok(
    "doc immediate stop containment actions",
    /Immediate Stop \/ Containment Actions/i.test(doc)
  );
  ok(
    "doc containment Real Gemini OFF",
    /Set\/keep.*Real Gemini OFF|keep \*\*Real Gemini OFF\*\*/i.test(doc)
  );
  ok("doc containment kill switch ON", /Turn \*\*kill switch ON\*\*|kill switch ON/i.test(doc));
  ok(
    "doc stop provider before network",
    /Stop further provider requests before network/i.test(doc)
  );
  ok(
    "doc stop user-visible AI answer path",
    /Stop user-visible AI answer path/i.test(doc)
  );
  ok(
    "doc stop DB business mutation path",
    /Stop DB\/business mutation path/i.test(doc)
  );
  ok("doc rollback playbook", /Rollback Playbook/i.test(doc));
  ok(
    "doc restore previous staging bundle",
    /Restore previous staging bundle|index-CHVc8agp\.js/i.test(doc)
  );
  ok(
    "doc remove Cloud Run env binding",
    /Remove future Cloud Run env binding/i.test(doc)
  );
  ok(
    "doc rotate revoke exposed secret",
    /Rotate\/revoke exposed secret/i.test(doc)
  );
  ok(
    "doc evidence preservation boundary",
    /Evidence Preservation Boundary/i.test(doc)
  );
  ok("doc allowed evidence list", /Allowed evidence/i.test(doc));
  ok("doc forbidden evidence list", /Forbidden evidence/i.test(doc));
  ok(
    "doc notification escalation plan",
    /Notification \/ Escalation Plan/i.test(doc)
  );
  ok(
    "doc no email phone real contacts",
    /no email\/phone real contacts|no email\/phone/i.test(doc)
  );
  ok(
    "doc post-incident review checklist",
    /Post-Incident Review Checklist/i.test(doc)
  );
  ok("doc incident stop conditions", /Incident Stop Conditions/i.test(doc));
  ok(
    "doc production incident readiness gaps",
    /Production Incident Readiness Gaps/i.test(doc)
  );
  ok("doc recommended next steps", /Recommended Next Steps/i.test(doc));
  ok("doc roadmap v6.5E", /v6\.5E/i.test(doc));
  ok("doc roadmap v6.5H", /v6\.5H/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to execute incident response/i.test(doc)
  );
  ok(
    "doc rollback removal plan for v65d",
    /Rollback \/ Removal Plan for v6\.5D/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 62–73. static guards ---
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

// --- no secrets / PII / incident evidence ---
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
  for (const pat of BILLING_INCIDENT_PATTERNS) {
    ok(`doc no billing incident ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(
      `self no billing incident ${pat.source.slice(0, 12)}`,
      !pat.test(selfCodeOnly)
    );
  }
  for (const pat of AUTO_EXEC_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to execute rollback in clause",
    /not approval to execute rollback/i.test(doc)
  );
  ok(
    "doc v6.5D not approval incident rollback deploy activate production",
    /not approval to incident\/rollback\/deploy\/activate\/production|is not approval to execute/i.test(
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
}

// --- cross-ref ---
{
  ok("doc references v6.5C", doc.includes("v6.5C"));
  ok("doc references v6.5B", doc.includes("v6.5B"));
  ok("doc references v6.5A", doc.includes("v6.5A"));
  ok("doc references v6.4U", doc.includes("v6.4U"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
}

// --- package script ---
{
  ok(
    "package v65d script",
    pkg.includes("test:v65d-production-incident-rollback-playbook-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65d-production-incident-rollback-playbook-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.5D Production Incident / Rollback Playbook Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);

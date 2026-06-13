/**
 * v6.5U.EXEC — Gate C Runtime Redaction Integration Minimal Candidate (static + unit validation)
 * npm run test:v65u-exec-gate-c-runtime-redaction-integration-minimal-candidate
 */
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  REAL_PROVIDER_ADAPTER_VERSION,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";
import {
  REAL_PROVIDER_REDACTION_GUARD_VERSION,
  validateAdapterPayloadRedaction,
} from "../src/services/ai/realProviderRedactionGuard.ts";
import {
  SYNTHETIC_REDACTION_FIXTURES,
  assertNoForbiddenSensitiveContent,
} from "../src/services/ai/redactionTestFixtures.ts";

const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const GUARD_PATH = "src/services/ai/realProviderRedactionGuard.ts";
const HARNESS_PATH = "scripts/gate-b-synthetic-invocation-exec.mts";
const APP_PATH = "src/App.tsx";
const USE_CHAT_PATH = "src/hooks/chat/useChat.ts";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const SYNTHETIC_CLEAN_PAYLOAD =
  "[SYNTHETIC] scenario=SYNTH_REDACTION_SCENARIO_001 intent=SYNTH_INTENT_BUDGET_SEARCH";

const FORBIDDEN_PAYLOAD = 'prompt: "user phone 0812345678 wants Toyota Camry listing"';

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.5U.EXEC Gate C Runtime Redaction Integration Minimal Candidate ===\n"
);

const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const guardSrc = readFileSync(GUARD_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const useChatSrc = readFileSync(USE_CHAT_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65u-exec-gate-c-runtime-redaction-integration-minimal-candidate.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

const selfCodeOnly = selfSrc
  .split("\n")
  .filter((line) => {
    const t = line.trimStart();
    if (t.startsWith("ok(") || t.startsWith('ok("')) return false;
    if (t.startsWith('"') && t.endsWith(",")) return false;
    return true;
  })
  .join("\n");

const combinedAdapterGuard = adapterSrc + guardSrc + selfCodeOnly;

// --- modules exist ---
{
  ok("adapter file exists", existsSync(ADAPTER_PATH));
  ok("guard file exists", existsSync(GUARD_PATH));
  ok("adapter imports redaction guard", adapterSrc.includes("realProviderRedactionGuard"));
  ok("guard imports assertNoForbiddenSensitiveContent", guardSrc.includes("assertNoForbiddenSensitiveContent"));
}

// --- disabled-by-default ---
{
  ok("adapter default enabled false", REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false);
  ok(
    "adapter version gate c minimal",
    REAL_PROVIDER_ADAPTER_VERSION === "v6.5U.EXEC-gate-c-minimal"
  );
  ok(
    "guard version gate c minimal",
    REAL_PROVIDER_REDACTION_GUARD_VERSION === "v6.5U.EXEC-gate-c-minimal"
  );
  ok(
    "adapter constant default enabled false",
    /REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED\s*=\s*false/.test(adapterSrc)
  );
}

// --- no network / gemini / fetch / env ---
{
  ok(
    "adapter guard no generateContent",
    !/generateContent\s*\(/.test(combinedAdapterGuard)
  );
  ok(
    "adapter guard no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(combinedAdapterGuard)
  );
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("guard no proc env read", !/\bprocess\.env\b/.test(guardSrc));
  ok(
    "harness still only generateContent site",
    /generateContent\s*\(/.test(harnessSrc)
  );
}

// --- runtime isolation ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("app no redactionTestFixtures import", !appSrc.includes("redactionTestFixtures"));
  ok("app no redaction guard import", !appSrc.includes("realProviderRedactionGuard"));
  ok("useChat no realProviderAdapter import", !useChatSrc.includes("realProviderAdapter"));
  ok("useChat no redaction guard import", !useChatSrc.includes("realProviderRedactionGuard"));
  ok(
    "adapter no firestore write",
    !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc)
  );
  ok(
    "adapter no analytics persist",
    !/analytics\.track|logEvent|persistAiLog/.test(adapterSrc)
  );
}

// --- redaction guard unit ---
{
  const clean = validateAdapterPayloadRedaction(SYNTHETIC_CLEAN_PAYLOAD);
  ok("clean synthetic payload passes", clean.pass === true);

  const forbidden = validateAdapterPayloadRedaction(FORBIDDEN_PAYLOAD);
  ok("forbidden payload fails", forbidden.pass === false);
  ok(
    "forbidden payload reason",
    forbidden.stopReason === "forbidden_content_in_payload"
  );

  const empty = validateAdapterPayloadRedaction(undefined);
  ok("undefined payload passes", empty.pass === true);
}

// --- adapter invoke with redaction hook ---
{
  const defaultInvoke = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("default invoke blocked", defaultInvoke.blocked === true);
  ok("default invoke no network", defaultInvoke.metadata.networkCallMade === false);
  ok("default invoke redaction applied", defaultInvoke.metadata.redactionApplied === true);
  ok(
    "default invoke reason adapter not enabled",
    defaultInvoke.reasonCode === "adapter_not_enabled"
  );

  const forbiddenInvoke = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
    payloadCandidate: FORBIDDEN_PAYLOAD,
  });
  ok("forbidden invoke blocked", forbiddenInvoke.blocked === true);
  ok(
    "forbidden invoke reason",
    forbiddenInvoke.reasonCode === "forbidden_content_in_payload"
  );
  ok(
    "forbidden invoke redaction not applied",
    forbiddenInvoke.metadata.redactionApplied === false
  );

  const cleanInvoke = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
    payloadCandidate: SYNTHETIC_CLEAN_PAYLOAD,
  });
  ok("clean payload invoke still blocked", cleanInvoke.blocked === true);
  ok("clean payload invoke redaction applied", cleanInvoke.metadata.redactionApplied === true);
  ok(
    "clean payload still adapter not enabled",
    cleanInvoke.reasonCode === "adapter_not_enabled"
  );

  const metaSerialized = JSON.stringify(defaultInvoke.metadata);
  ok(
    "metadata serialization clean",
    assertNoForbiddenSensitiveContent(metaSerialized).pass
  );
}

// --- runtime contract ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("admin cannot enable", adminCanEnableRealProvider() === false);
  ok(
    "production forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  ok(
    "v64m fixture networkCallMade false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.networkCallMade === false
  );
}

// --- no secrets in sources ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`adapter no secret ${pat.source.slice(0, 12)}`, !pat.test(adapterSrc));
    ok(`guard no secret ${pat.source.slice(0, 12)}`, !pat.test(guardSrc));
  }
}

// --- package script ---
{
  ok(
    "package v65u exec script",
    pkg.includes(
      "test:v65u-exec-gate-c-runtime-redaction-integration-minimal-candidate"
    )
  );
}

console.log(
  "\nDone v6.5U.EXEC Gate C Runtime Redaction Integration Minimal Candidate tests."
);
if (process.exitCode) process.exit(process.exitCode);

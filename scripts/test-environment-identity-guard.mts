/**
 * Explicit environment identity + fail-closed guard (Production Foundation B1).
 * npm run test:environment-identity-guard
 *
 * Verifies that authorization-relevant environment classification is EXPLICIT and
 * fail-closed, and can no longer be spoofed by APP_URL / domain / project name.
 */
import {
  resolveNongaEnvironmentIdentity,
  isExplicitEnvironmentIdentity,
} from "../src/config/environmentIdentity.ts";
import { resolveSalesBrainRuntimeEnvironmentFromProcess } from "../src/services/ai/salesBrainShadowChatPath.ts";
import { evaluateAiFirstAllowlist } from "../src/config/ai-first-allowlist.ts";
import {
  evaluateUserVisibleGate,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
} from "../src/services/ai/salesBrainUserVisibleGate.ts";

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`PASS ${label}`);
  } else {
    fail++;
    console.error(`FAIL ${label}`);
  }
}

const reader = (env: Record<string, string | undefined>) => (k: string) => env[k];

// --- explicit identities ---
ok(
  "explicit production",
  resolveNongaEnvironmentIdentity(reader({ NONGA_RUNTIME_ENV: "production" })) === "production"
);
ok(
  "explicit staging",
  resolveNongaEnvironmentIdentity(reader({ NONGA_RUNTIME_ENV: "staging" })) === "staging"
);
ok(
  "explicit fixture",
  resolveNongaEnvironmentIdentity(reader({ NONGA_RUNTIME_ENV: "fixture" })) === "fixture"
);
ok(
  "explicit local",
  resolveNongaEnvironmentIdentity(reader({ NONGA_DEPLOY_ENV: "local" })) === "local"
);
ok(
  "primary key wins over fallback",
  resolveNongaEnvironmentIdentity(
    reader({ NONGA_RUNTIME_ENV: "staging", NONGA_DEPLOY_ENV: "production" })
  ) === "staging"
);

// --- fail-closed: missing / invalid / unknown -> production ---
ok("missing value fails closed to production", resolveNongaEnvironmentIdentity(reader({})) === "production");
ok(
  "empty value fails closed to production",
  resolveNongaEnvironmentIdentity(reader({ NONGA_RUNTIME_ENV: "   " })) === "production"
);
ok(
  "invalid value fails closed to production",
  resolveNongaEnvironmentIdentity(reader({ NONGA_RUNTIME_ENV: "prd-typo" })) === "production"
);
ok("missing value not explicit", !isExplicitEnvironmentIdentity(reader({})));
ok("valid value is explicit", isExplicitEnvironmentIdentity(reader({ NONGA_DEPLOY_ENV: "staging" })));

// --- domain / project-name spoofing must NOT unlock staging ---
const spoofEnvCe93c = reader({
  APP_URL: "https://nonga-ce93c.web.app",
  NODE_ENV: "production",
});
ok(
  "APP_URL nonga-ce93c does NOT classify as staging",
  resolveSalesBrainRuntimeEnvironmentFromProcess(spoofEnvCe93c) === "production"
);
const spoofEnvPublicDomain = reader({
  APP_URL: "https://a.nongbot.org",
  NODE_ENV: "production",
});
ok(
  "public domain APP_URL does NOT classify as staging",
  resolveSalesBrainRuntimeEnvironmentFromProcess(spoofEnvPublicDomain) === "production"
);
const spoofEnvStagingSubstring = reader({ APP_URL: "https://staging.example.com" });
ok(
  "APP_URL staging substring does NOT classify as staging",
  resolveSalesBrainRuntimeEnvironmentFromProcess(spoofEnvStagingSubstring) === "production"
);
ok(
  "explicit staging still classifies as staging despite public APP_URL",
  resolveSalesBrainRuntimeEnvironmentFromProcess(
    reader({ APP_URL: "https://a.nongbot.org", NONGA_RUNTIME_ENV: "staging" })
  ) === "staging"
);

// --- end-to-end security outcome: unknown authenticated UID on public domain ---
const UNKNOWN_UID = "authenticated-uid-not-in-allowlist";
const publicSpoofEnv = reader({
  APP_URL: "https://a.nongbot.org",
  NODE_ENV: "production",
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "owner-allowlisted-uid",
});
const spoofEnvironment = resolveSalesBrainRuntimeEnvironmentFromProcess(publicSpoofEnv);
const spoofEval = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  environment: spoofEnvironment,
  readEnv: publicSpoofEnv,
});
ok("spoofed public domain -> production env", spoofEnvironment === "production");
ok("unknown UID on public domain is BLOCKED (no staging_authenticated)", spoofEval.gateCheck === "FAILED");
ok("unknown UID block reason is allowlist-based", spoofEval.blockedReason === "uid_not_allowlisted");

const gateSpoof = evaluateUserVisibleGate({
  firebaseUid: UNKNOWN_UID,
  environment: spoofEnvironment,
  readEnv: publicSpoofEnv,
});
ok("user-visible gate blocked on spoofed public domain", gateSpoof.effectiveUserVisibleAllowed === false);
ok("production default off enforced", gateSpoof.blockedReason === "production_default_off");

// --- explicit staging retains expanded behavior (unchanged) ---
const stagingEnv = reader({ K_SERVICE: "nonga-staging" });
const stagingEval = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  environment: "staging",
  readEnv: stagingEnv,
});
ok("explicit staging still allows authenticated UID", stagingEval.authPath === "staging_authenticated");

// --- production-strict: provider unavailable / disabled fails closed ---
const prodEnvNoAllowlist = reader({ [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: "" });
const prodEmpty = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  environment: "production",
  readEnv: prodEnvNoAllowlist,
});
ok("production empty allowlist fails closed", prodEmpty.gateCheck === "FAILED");
ok("production empty allowlist reason", prodEmpty.blockedReason === "allowlist_empty");

console.log(`\n=== environment-identity-guard: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);

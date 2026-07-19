/**
 * AI-first staging allowlist expansion (production stays strict)
 * npm run test:ai-first-allowlist
 */
import {
  evaluateAiFirstAllowlist,
  INTERNAL_TESTER_UIDS,
} from "../src/config/ai-first-allowlist.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";

const OWNER_UID = "owner-allowlisted-uid";
const UNKNOWN_UID = "unknown-uid-not-in-any-list";

const STAGING_ENV: Record<string, string> = {
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: OWNER_UID,
};

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

const ownerStaging = evaluateAiFirstAllowlist({
  firebaseUid: OWNER_UID,
  environment: "staging",
  readEnv: (k) => STAGING_ENV[k],
});
ok("staging owner env allowlist PASSED", ownerStaging.gateCheck === "PASSED");
ok("staging owner auth path", ownerStaging.authPath === "env_allowlist");

const internalStaging = evaluateAiFirstAllowlist({
  firebaseUid: "server-configured-tester",
  environment: "staging",
  readEnv: (k) => ({ NONGA_INTERNAL_TESTER_UIDS: "server-configured-tester" }[k]),
});
ok("staging internal tester PASSED", internalStaging.gateCheck === "PASSED");
ok("staging internal tester path", internalStaging.authPath === "internal_tester");

const committedSyntheticStaging = evaluateAiFirstAllowlist({
  firebaseUid: INTERNAL_TESTER_UIDS[0],
  environment: "staging",
  readEnv: () => undefined,
});
ok("staging committed synthetic UID DENIED", committedSyntheticStaging.gateCheck === "FAILED");

const localSynthetic = evaluateAiFirstAllowlist({
  firebaseUid: INTERNAL_TESTER_UIDS[0],
  environment: "local",
  readEnv: () => undefined,
});
ok("explicit local synthetic UID PASSED", localSynthetic.gateCheck === "PASSED");

const devUserStaging = evaluateAiFirstAllowlist({
  firebaseUid: "dev-user-staging-smoke",
  environment: "staging",
  readEnv: () => undefined,
});
ok("staging dev-user prefix DENIED", devUserStaging.gateCheck === "FAILED");

const anyAuthStaging = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  environment: "staging",
  readEnv: () => undefined,
});
ok("staging any authenticated DENIED", anyAuthStaging.gateCheck === "FAILED");
ok("staging empty allowlist fails closed", anyAuthStaging.blockedReason === "allowlist_empty");

const missingEnvironment = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  readEnv: () => undefined,
});
ok("missing environment defaults production-strict", missingEnvironment.gateCheck === "FAILED");

const prodDeny = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  environment: "production",
  readEnv: (k) => STAGING_ENV[k],
});
ok("production unknown uid FAILED", prodDeny.gateCheck === "FAILED");
ok("production blocks non-allowlisted", prodDeny.blockedReason === "uid_not_allowlisted");

const prodOwner = evaluateAiFirstAllowlist({
  firebaseUid: OWNER_UID,
  environment: "production",
  readEnv: (k) => STAGING_ENV[k],
});
ok("production env allowlist still works", prodOwner.gateCheck === "PASSED");

console.log(`\n=== ai-first-allowlist: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);

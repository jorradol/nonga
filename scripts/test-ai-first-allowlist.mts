/**
 * AI-first staging allowlist expansion (production stays strict)
 * npm run test:ai-first-allowlist
 */
import {
  evaluateAiFirstAllowlist,
  isDevUserStagingUid,
  INTERNAL_TESTER_UIDS,
} from "../src/config/ai-first-allowlist.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";

const OWNER_UID = "owner-allowlisted-uid";
const UNKNOWN_UID = "unknown-uid-not-in-any-list";

const STAGING_ENV: Record<string, string> = {
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: OWNER_UID,
  K_SERVICE: "nonga-staging",
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

ok("dev-user prefix", isDevUserStagingUid("dev-user-smoke-1"));
ok("not dev-user prefix", !isDevUserStagingUid("h0xjXUfEXBTMWzdPn0TQjK0WvSC3"));

const ownerStaging = evaluateAiFirstAllowlist({
  firebaseUid: OWNER_UID,
  environment: "staging",
  readEnv: (k) => STAGING_ENV[k],
});
ok("staging owner env allowlist PASSED", ownerStaging.gateCheck === "PASSED");
ok("staging owner auth path", ownerStaging.authPath === "env_allowlist");

const internalStaging = evaluateAiFirstAllowlist({
  firebaseUid: INTERNAL_TESTER_UIDS[0],
  environment: "staging",
  readEnv: (k) => ({ K_SERVICE: "nonga-staging" }[k]),
});
ok("staging internal tester PASSED", internalStaging.gateCheck === "PASSED");
ok("staging internal tester path", internalStaging.authPath === "internal_tester");

const devUserStaging = evaluateAiFirstAllowlist({
  firebaseUid: "dev-user-staging-smoke",
  environment: "staging",
  readEnv: (k) => ({ K_SERVICE: "nonga-staging" }[k]),
});
ok("staging dev-user PASSED", devUserStaging.gateCheck === "PASSED");
ok("staging dev-user path", devUserStaging.authPath === "dev_user_staging");

const anyAuthStaging = evaluateAiFirstAllowlist({
  firebaseUid: UNKNOWN_UID,
  environment: "staging",
  readEnv: (k) => ({ K_SERVICE: "nonga-staging" }[k]),
});
ok("staging any authenticated PASSED", anyAuthStaging.gateCheck === "PASSED");
ok("staging any authenticated path", anyAuthStaging.authPath === "staging_authenticated");

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

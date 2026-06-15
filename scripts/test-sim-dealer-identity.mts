/**
 * v6.6L — Simulated Thor dealerId identity tests
 * Run: npm run test:sim-dealer-identity
 */
import {
  normalizeDealerId,
  resolveParentDealerGroup,
  isSimulatedThorDealerId,
  THOR_AUTO_DEALER_ID,
  THOR_AUTO_PARENT_DEALER_GROUP,
} from "../src/utils/dealerIdentity.ts";

function assertEq(label: string, actual: string | null, expected: string | null) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${label}`);
}

function main() {
  console.log("=== Sim Dealer Identity Tests (v6.6L) ===\n");

  assertEq("normalizeDealerId('sim-1thor')", normalizeDealerId("sim-1thor"), "sim-1thor");
  assertEq("normalizeDealerId('sim-2thor')", normalizeDealerId("sim-2thor"), "sim-2thor");
  assertEq("normalizeDealerId('sim-3thor')", normalizeDealerId("sim-3thor"), "sim-3thor");
  assertEq(
    "normalizeDealerId('thor-auto')",
    normalizeDealerId(THOR_AUTO_DEALER_ID),
    THOR_AUTO_DEALER_ID
  );

  assertEq(
    "resolveParentDealerGroup('sim-1thor')",
    resolveParentDealerGroup("sim-1thor"),
    THOR_AUTO_PARENT_DEALER_GROUP
  );
  assertEq(
    "resolveParentDealerGroup('sim-2thor')",
    resolveParentDealerGroup("sim-2thor"),
    THOR_AUTO_PARENT_DEALER_GROUP
  );
  assertEq(
    "resolveParentDealerGroup('sim-3thor')",
    resolveParentDealerGroup("sim-3thor"),
    THOR_AUTO_PARENT_DEALER_GROUP
  );
  assertEq(
    "resolveParentDealerGroup('thor-auto')",
    resolveParentDealerGroup(THOR_AUTO_DEALER_ID),
    THOR_AUTO_PARENT_DEALER_GROUP
  );

  assertEq(
    "normalizeDealerId('dealer-sim-1thor') alias",
    normalizeDealerId("dealer-sim-1thor"),
    "sim-1thor"
  );
  assertEq(
    "normalizeDealerId('owner-sim-2thor') alias",
    normalizeDealerId("owner-sim-2thor"),
    "sim-2thor"
  );

  assertEq(
    "normalizeDealerId('dealer-thor-auto') unchanged collapse",
    normalizeDealerId("dealer-thor-auto"),
    THOR_AUTO_DEALER_ID
  );

  const simChecks = ["sim-1thor", "sim-2thor", "sim-3thor"] as const;
  for (const id of simChecks) {
    if (!isSimulatedThorDealerId(id)) {
      console.error(`FAIL isSimulatedThorDealerId('${id}') should be true`);
      process.exitCode = 1;
    } else {
      console.log(`PASS isSimulatedThorDealerId('${id}')`);
    }
  }

  if (!isSimulatedThorDealerId(THOR_AUTO_DEALER_ID)) {
    console.log("PASS isSimulatedThorDealerId('thor-auto') is false");
  } else {
    console.error("FAIL isSimulatedThorDealerId('thor-auto') should be false");
    process.exitCode = 1;
  }

  assertEq(
    "resolveParentDealerGroup('other-dealer')",
    resolveParentDealerGroup("other-dealer"),
    null
  );

  console.log("\n===", process.exitCode ? "FAIL" : "PASS", "===");
  if (process.exitCode) process.exit(process.exitCode);
}

main();

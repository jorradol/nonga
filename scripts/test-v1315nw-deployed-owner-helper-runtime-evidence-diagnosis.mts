/**
 * v13.15N-W deployed owner helper runtime evidence diagnosis guard
 * Static/in-memory checks only. No one-run. No provider execution.
 *
 * npm run test:v13.15N-W
 */
import { readFileSync } from "node:fs";

const HELPER_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

console.log("=== v13.15N-W Deployed Owner Helper Runtime Evidence Diagnosis Guard ===\n");

const helperCode = readFileSync(HELPER_PATH, "utf8");
const bridgeCode = readFileSync(BRIDGE_PATH, "utf8");

ok(
  "server payload includes status-only runtime diagnostic object",
  /userVisibleRuntimeDiagnostic\?:\s*\{/.test(bridgeCode) &&
    /runtimeMode:\s*string;/.test(bridgeCode) &&
    /userVisibleEnabled:\s*boolean;/.test(bridgeCode) &&
    /pilotContextPresentServer:\s*boolean;/.test(bridgeCode) &&
    /serverRecentCarCardsCount:\s*number;/.test(bridgeCode) &&
    /pilotInactiveReason:\s*string;/.test(bridgeCode)
);

ok(
  "server computes runtime diagnostic from parsed context and flags",
  /withSafeUserVisibleRuntimeDiagnostic/.test(bridgeCode) &&
    /resolveSalesBrainRuntimeFlags/.test(bridgeCode) &&
    /pilotSessionContext\?\.recentCarCards\?\.length/.test(bridgeCode) &&
    /isPilotBuyerFollowUpMessage/.test(bridgeCode)
);

ok(
  "server response includes runtime diagnostic in data payload",
  /const payloadWithRuntimeDiagnostic = withSafeUserVisibleRuntimeDiagnostic/.test(bridgeCode) &&
    /\.\.\.payloadWithRuntimeDiagnostic/.test(bridgeCode)
);

ok(
  "helper parses runtime diagnostic and surfaces status-only fields",
  /nested\?\.userVisibleRuntimeDiagnostic/.test(helperCode) &&
    /runtimeMode=\$\{runtimeMode\}/.test(helperCode) &&
    /userVisibleEnabled=\$\{userVisibleEnabled\}/.test(helperCode) &&
    /pilotContextPresent=\$\{pilotContextPresent\}/.test(helperCode) &&
    /serverRecentCarCardsCount=\$\{serverRecentCarCardsCount\}/.test(helperCode) &&
    /pilotInactiveReason=\$\{pilotInactiveReason\}/.test(helperCode)
);

ok(
  "no secret/token/header/api-key/full-email interpolation in runtime summary",
  !/\$\{[^}]*token[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*authorization[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*bearer[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*api[_-]?key[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*email[^}]*\}/i.test(helperCode)
);

ok(
  "owner helper still uses synthetic context and no retry loop",
  /SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT/.test(helperCode) &&
    /pilotSessionContext:\s*SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT/.test(helperCode) &&
    /isOneRunConsumedInSession\(\)/.test(helperCode) &&
    !/setInterval|while\s*\(|for\s*\(/.test(helperCode)
);

console.log(`\nDone v13.15N-W guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

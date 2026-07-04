/**
 * v13.15N-O safe UID allowlist diagnostic guard
 * Prepare-only static checks. No provider execution.
 *
 * npm run test:v13.15N-O
 */
import { readFileSync } from "node:fs";

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

console.log("=== v13.15N-O Safe UID Allowlist Diagnostic Guard Validation ===\n");

const bridgeCode = readFileSync(BRIDGE_PATH, "utf8");

const diagnosticShapeMatch = bridgeCode.match(
  /userVisibleGateDiagnostic:\s*\{[\s\S]*?allowlistCount:\s*allowlist\.length,[\s\S]*?\}/
);
const diagnosticShapeCode = diagnosticShapeMatch?.[0] ?? "";

const responsePayloadMatch = bridgeCode.match(
  /const payloadWithMaskedGate = withMaskedUserVisibleGateDiagnostic\([\s\S]*?\);\s*const payloadWithRuntimeDiagnostic = withSafeUserVisibleRuntimeDiagnostic\([\s\S]*?\);\s*[\s\S]*?res\.json\([\s\S]*?\);/
);
const responsePayloadCode = responsePayloadMatch?.[0] ?? "";

ok(
  "diagnostic payload includes required masked/status-only fields",
  /requestUidMasked:\s*maskUid\(input\.firebaseUid\)/.test(diagnosticShapeCode) &&
    /allowlistMasked:\s*allowlist\.map\(\(uid\)\s*=>\s*maskUid\(uid\)\)/.test(diagnosticShapeCode) &&
    /allowlistMatch:\s*gate\.redactedDiagnostics\.uidAllowlisted/.test(diagnosticShapeCode) &&
    /allowlistCount:\s*allowlist\.length/.test(diagnosticShapeCode)
);

ok(
  "mask function never emits full uid",
  /function maskUid\([\s\S]*?if \(!value\) return "\*\*\*";[\s\S]*?if \(value\.length <= 6\) return "\*\*\*";[\s\S]*?return `\$\{value\.slice\(0, 3\)\}\.\.\.\$\{value\.slice\(-3\)\}`;[\s\S]*?\}/.test(
    bridgeCode
  )
);

ok(
  "response uses masked diagnostic helper path",
  /const payloadWithMaskedGate = withMaskedUserVisibleGateDiagnostic\(/.test(bridgeCode) &&
    /\.\.\.payloadWithRuntimeDiagnostic/.test(responsePayloadCode)
);

ok(
  "diagnostic block does not include token header api key email full uid fields",
  !/(authorization|bearer|api[_-]?key|id[_-]?token|jwt|email|fullUid|rawUid)/i.test(diagnosticShapeCode)
);

ok(
  "bridge logging remains status-only and no secret printing",
  !/console\.(log|info|warn|debug)\([^)]*(token|authorization|bearer|api[_-]?key|email|uid)/i.test(
    bridgeCode
  )
);

ok(
  "no provider execution added in diagnostic helper",
  !/fetch\(|https?:\/\/|googleapis|gemini|provider/i.test(
    bridgeCode.match(/function withMaskedUserVisibleGateDiagnostic[\s\S]*?\n\}/)?.[0] ?? ""
  )
);

console.log(`\nDone v13.15N-O guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

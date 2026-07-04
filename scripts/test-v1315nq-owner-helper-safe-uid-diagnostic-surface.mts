/**
 * v13.15N-Q owner helper safe UID diagnostic surface guard
 * Static checks only. No one-run execution. No provider execution.
 *
 * npm run test:v13.15N-Q
 */
import { readFileSync } from "node:fs";

const HELPER_COMPONENT_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";

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

console.log("=== v13.15N-Q Owner Helper Safe UID Diagnostic Surface Validation ===\n");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const oneRunHandlerCode =
  helperCode.match(/const handleRunOwnerGeminiOneRun = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ??
  "";

ok(
  "owner helper parses userVisibleGateDiagnostic object",
  /nested\?\.userVisibleGateDiagnostic/.test(oneRunHandlerCode) &&
    /gateDiagnostic/.test(oneRunHandlerCode)
);

ok(
  "one-run summary includes masked diagnostic fields copy-ready",
  /requestUidMasked=\$\{requestUidMasked\}/.test(helperCode) &&
    /allowlistMasked=\$\{allowlistMasked\}/.test(helperCode) &&
    /allowlistMatch=\$\{allowlistMatch\}/.test(helperCode) &&
    /allowlistCount=\$\{allowlistCount\}/.test(helperCode)
);

ok(
  "diagnostic values are sanitized via mask/count/boolean helpers",
  /function maskUidForDisplay/.test(helperCode) &&
    /function formatMaskedAllowlistForDisplay/.test(helperCode) &&
    /function readBooleanField/.test(helperCode) &&
    /function readCountField/.test(helperCode)
);

ok(
  "gate reason uses safe blockedReason fallback",
  /const blockedReason/.test(oneRunHandlerCode) &&
    /const gateReason/.test(oneRunHandlerCode) &&
    /realProviderGateReason !== "unknown" \? realProviderGateReason : blockedReason/.test(
      oneRunHandlerCode
    )
);

ok(
  "no token authorization api key full email interpolation in one-run status",
  !/\$\{[^}]*token[^}]*\}/i.test(oneRunHandlerCode) &&
    !/\$\{[^}]*authorization[^}]*\}/i.test(oneRunHandlerCode) &&
    !/\$\{[^}]*bearer[^}]*\}/i.test(oneRunHandlerCode) &&
    !/\$\{[^}]*api[_-]?key[^}]*\}/i.test(oneRunHandlerCode) &&
    !/\$\{[^}]*email[^}]*\}/i.test(oneRunHandlerCode)
);

ok(
  "no one-run retry loop or automatic second-run path introduced",
  /isOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    /markOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    !/useEffect\(/.test(helperCode) &&
    !/setInterval|while\s*\(|for\s*\(/.test(oneRunHandlerCode)
);

ok(
  "no provider/gemini execution path added beyond existing manual route",
  /OWNER_GEMINI_ONE_RUN_ROUTE = "\/api\/ai\/chat-user-visible-orchestrate"/.test(helperCode) &&
    !/\/api\/gemini\//i.test(oneRunHandlerCode)
);

console.log(`\nDone v13.15N-Q guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

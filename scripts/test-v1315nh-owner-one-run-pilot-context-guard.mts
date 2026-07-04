/**
 * v13.15N-H owner one-run pilot-context payload guard
 * Prepare-only static checks. No provider execution.
 *
 * npm run test:v13.15N-H
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

function hasPhonePlateVin(text: string): boolean {
  const phone = /\b0[689]\d{8}\b/;
  const plate = /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/;
  const vin = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  return phone.test(text) || plate.test(text) || vin.test(text);
}

console.log("=== v13.15N-H Owner One-run Pilot Context Guard Validation ===\n");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const oneRunHandlerMatch = helperCode.match(
  /const handleRunOwnerGeminiOneRun = async \(\) => \{[\s\S]*?\n  \};/
);
const oneRunHandlerCode = oneRunHandlerMatch?.[0] ?? "";

ok(
  "one-run helper sends synthetic pilot session context",
  /SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT/.test(helperCode) &&
    /pilotSessionContext:\s*SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT/.test(oneRunHandlerCode)
);
ok(
  "one-run helper uses follow-up style synthetic prompt",
  /SYNTHETIC_ONE_RUN_PROMPT/.test(helperCode) &&
    /สรุปจุดเด่น|คันที่ 1 และ 2|follow-up/i.test(helperCode)
);
ok(
  "one-run helper route unchanged and manual-click only",
  /OWNER_GEMINI_ONE_RUN_ROUTE = "\/api\/ai\/chat-user-visible-orchestrate"/.test(
    helperCode
  ) && /onClick=\{handleRunOwnerGeminiOneRun\}/.test(helperCode)
);
ok(
  "one-run helper keeps single-run session lock",
  /OWNER_GEMINI_ONE_RUN_SESSION_KEY/.test(helperCode) &&
    /isOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    /markOneRunConsumedInSession\(\)/.test(oneRunHandlerCode)
);
ok(
  "one-run helper status exposes sanitized gate diagnostics only",
  /providerNetwork=\$\{realProviderNetwork\}/.test(helperCode) &&
    /gateReason=\$\{gateReason\}/.test(helperCode) &&
    /requestUidMasked=\$\{requestUidMasked\}/.test(helperCode) &&
    /allowlistMasked=\$\{allowlistMasked\}/.test(helperCode) &&
    /allowlistMatch=\$\{allowlistMatch\}/.test(helperCode) &&
    /allowlistCount=\$\{allowlistCount\}/.test(helperCode) &&
    !/\$\{[^}]*token[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*authorization[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*api[_-]?key[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*email[^}]*\}/i.test(helperCode)
);
ok(
  "no auto-run retry loop or second-run automation",
  !/useEffect\(/.test(helperCode) &&
    !/setInterval|while\s*\(|for\s*\(/.test(oneRunHandlerCode)
);
ok("no phone plate vin in synthetic context", !hasPhonePlateVin(helperCode));
ok("no lead creation path", !/createLead|lead/i.test(oneRunHandlerCode));

console.log(`\nDone v13.15N-H guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

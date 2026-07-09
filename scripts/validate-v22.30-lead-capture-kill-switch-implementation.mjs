import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.30-lead-capture-kill-switch-implementation.md";
const FIXTURE_PATH =
  "docs/examples/v22.30-lead-capture-kill-switch-implementation.example.json";

const EXPECTED_RECOMMENDATION =
  "NEED REVIEW — dedicated lead capture kill switch is implemented, defaults OFF, blocks authenticated lead creation (service + route), preserves unauth 401, no lead/dealer/public/production enablement occurred; owner may review UI wording before any later controlled ON approval.";

let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log("PASS", name, detail);
    return;
  }
  failures += 1;
  console.log("FAIL", name, detail);
}

function readText(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v22.30 lead capture kill switch validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));
check("flags module exists", existsSync("src/services/leads/leadCaptureFlags.ts"));

const doc = readText(DOC_PATH);
const flags = readText("src/services/leads/leadCaptureFlags.ts");
const routes = readText("src/server/buyerLeadRoutes.ts");
const service = readText("src/services/leads/buyerLeadService.ts");
const health = readText("server.ts");
let fixture;
try {
  fixture = JSON.parse(readText(FIXTURE_PATH));
  check("fixture parses", true);
} catch (e) {
  check("fixture parses", false, String(e));
  process.exit(1);
}

check("execution type", /KILL SWITCH IMPLEMENTATION/i.test(doc));
check("env name documented", /NONGA_LEAD_CAPTURE_ENABLED/.test(doc));
check("default OFF", /Default when unset[\s\S]*false|defaults OFF/i.test(doc));
check("403 when OFF", /403/.test(doc));
check("preserves 401", /401/.test(doc));
check("not enabled this step", /not.*turn capture ON|Capture turned ON \| \*\*no\*\*/i.test(doc));
check("expected recommendation", doc.includes(EXPECTED_RECOMMENDATION));

check(
  "flags default false",
  /=== "true"/.test(flags) && /BUYER_LEAD_CAPTURE_DISABLED_MESSAGE/.test(flags)
);
check(
  "routes auth then kill switch",
  /getServerAuthContext[\s\S]*isLeadCaptureEnabled[\s\S]*403/.test(routes)
);
check(
  "service blocks create",
  /isLeadCaptureEnabled[\s\S]*status:\s*403/.test(service)
);
check(
  "health exposes boolean",
  /leadCaptureEnabled:\s*isLeadCaptureEnabled\(\)/.test(health)
);

check("fixture version", fixture.version === "v22.30");
check("fixture default false", fixture.default_when_unset === false);
check("fixture not enabled", fixture.enabled_this_step === false);
check("fixture no real lead", fixture.checks.real_lead_created === false);
check("fixture recommendation", fixture.final_recommendation === EXPECTED_RECOMMENDATION);
check("fixture no approval", fixture.approval_requested_this_step === false);

if (failures > 0) {
  console.log(`\nFAIL v22.30 validator (${failures})`);
  process.exit(1);
}
console.log("\nPASS test:v22.30 validator");

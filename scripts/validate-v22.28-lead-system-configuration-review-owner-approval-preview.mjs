import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.28-lead-system-configuration-review-owner-approval-preview.md";
const FIXTURE_PATH =
  "docs/examples/v22.28-lead-system-configuration-review-owner-approval-preview.example.json";

const EXPECTED_RECOMMENDATION =
  "NEED REVIEW — lead system configuration review completed; design, consent wording, and safety locks are documented for owner review. Real lead creation, dealer-facing push, public, and production remain locked. Do not treat this packet as authorization to enable real lead capture.";

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

function parseJson(path) {
  return JSON.parse(readText(path));
}

console.log(
  "=== v22.28 lead system configuration review / owner approval preview validator ===\n"
);

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
let fixture;
try {
  fixture = parseJson(FIXTURE_PATH);
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
  process.exit(1);
}

check(
  "execution type recorded",
  /LEAD SYSTEM CONFIGURATION REVIEW/i.test(doc) &&
    /OWNER APPROVAL PREVIEW ONLY/i.test(doc)
);
check("cloud run revision recorded", /nonga-staging-00188-tm7/.test(doc));
check("hosting asset recorded", /assets\/index-DqPChjiO\.js/.test(doc));
check("publicSignupEnabled false", /publicSignupEnabled[\s\S]*?false/i.test(doc));
check("buyer-lead 401", /401/.test(doc) && /buyer-lead/i.test(doc));
check("marketplace count 13", /Marketplace count[\s\S]*?\*\*13\*\*|count.*13/i.test(doc));
check("consent version documented", /v5\.6C-1/.test(doc));
check(
  "consent primary wording present",
  /น้องเอจะส่งข้อมูลนี้ให้ผู้ขายรถคันนี้เพื่อให้ติดต่อกลับเรื่องการซื้อขายเท่านั้น/.test(doc)
);
check("memory default documented", /memory/i.test(doc) && /NONGA_LEAD_DATA_BACKEND/.test(doc));
check(
  "no automatic dealer push",
  /No automatic|ไม่.*automatic|not implemented/i.test(doc) &&
    /reveal|Reveal/i.test(doc)
);
check(
  "no dedicated kill switch noted",
  /Dedicated.*kill switch|kill switch/i.test(doc) && /not present/i.test(doc)
);
check("no real lead this step", /No real lead created this step[\s\S]*?\*\*PASS\*\*|real lead created this step \| \*\*no\*\*/i.test(doc));
check("no dealer-facing send this step", /No dealer-facing send[\s\S]*?\*\*PASS\*\*|Dealer-facing send this step \| \*\*no\*\*/i.test(doc));
check("no simulated artifact", /Not created|none created|Cleanup required \| \*\*None\*\*/i.test(doc));
check("no production deploy", /Production \| untouched|production untouched|Production untouched/i.test(doc));
check("owner checklist present", /Future controlled staging lead capture/i.test(doc));
check("does not request approval this step", /not.*requesting approval|approval_requested_this_step/i.test(doc) || /Checklist only/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));
check(
  "does not authorize enablement",
  /Not approval to create real leads/i.test(doc) &&
    /Not approval to send to Thor Auto/i.test(doc)
);

check("fixture version v22.28", fixture.version === "v22.28");
check(
  "fixture cloud run",
  fixture.current_revisions?.cloud_run_revision === "nonga-staging-00188-tm7"
);
check(
  "fixture hosting asset",
  fixture.current_revisions?.hosting_asset === "assets/index-DqPChjiO.js"
);
check(
  "fixture inspection PASS",
  fixture.checks.lead_config_inspection_completed === "PASS"
);
check("fixture unauth 401 PASS", fixture.checks.buyer_lead_unauth_401 === "PASS");
check(
  "fixture signup false PASS",
  fixture.checks.public_signup_enabled_false === "PASS"
);
check("fixture marketplace PASS", fixture.checks.marketplace_count_13 === "PASS");
check("fixture no real lead", fixture.real_lead_created === false);
check(
  "fixture no dealer-facing send",
  fixture.dealer_facing_send_performed === false
);
check("fixture no production", fixture.production_deploy_performed === false);
check("fixture no public", fixture.public_enable_performed === false);
check("fixture no owner token", fixture.owner_token_requested === false);
check("fixture no approval request", fixture.approval_requested_this_step === false);
check("fixture no simulated artifact", fixture.checks.simulated_lead_artifact_created === false);
check(
  "fixture no auto dealer push",
  fixture.dealer_facing_send_automatic === false
);
check(
  "fixture kill switch absent noted",
  fixture.dedicated_authenticated_lead_kill_switch === false
);
check("fixture recommendation matches", fixture.final_recommendation === EXPECTED_RECOMMENDATION);

if (failures > 0) {
  console.log(`\nFAIL v22.28 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.28 validator");

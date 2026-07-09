import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.29-lead-recipient-ownership-binding-and-kill-switch-review.md";
const FIXTURE_PATH =
  "docs/examples/v22.29-lead-recipient-ownership-binding-and-kill-switch-review.example.json";

const EXPECTED_RECOMMENDATION =
  "HOLD — ownership binding and queue isolation look directionally correct for listing-scoped routing (including Thor Auto dealerId: thor-auto), and unbound empty-owner creates are blocked, but lead capture cannot be reliably turned off for authenticated users because no dedicated kill switch exists. Do not approve controlled staging lead capture until a default-OFF kill switch is implemented and proven, and owner confirms recipient binding.";

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

console.log(
  "=== v22.29 lead recipient ownership binding + kill switch review validator ===\n"
);

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
let fixture;
try {
  fixture = JSON.parse(readText(FIXTURE_PATH));
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
  process.exit(1);
}

check(
  "execution type recorded",
  /OWNERSHIP BINDING/i.test(doc) && /KILL SWITCH/i.test(doc)
);
check("marketplace 13", /Marketplace count[\s\S]*?\*\*13\*\*|count \| \*\*13\*\*/i.test(doc));
check("thor dealerId thor-auto", /dealerId:\s*`?thor-auto`?/i.test(doc) || /dealerId.*thor-auto/i.test(doc));
check("empty owner blocked", /400/i.test(doc) && /ไม่พบผู้ขาย|empty.*owner/i.test(doc));
check("no buyer override", /cannot.*choose|no.*override|ไม่สามารถ/i.test(doc));
check("recipient from listing owner", /listing\.ownerId|resolveListingSellerId/i.test(doc));
check("queue ACL documented", /canManageListingWithScope/i.test(doc));
check("phone locked", /locked/i.test(doc) && /[Rr]eveal/i.test(doc));
check("no auto dealer push", /not implemented|No automatic/i.test(doc));
check("kill switch missing", /Dedicated.*kill switch[\s\S]*?\*\*No\*\*|no dedicated kill switch/i.test(doc));
check("kill switch design only", /DO NOT IMPLEMENT|Design-only|not implemented/i.test(doc));
check("buyer-lead 401", /401/.test(doc) && /buyer-lead/i.test(doc));
check("publicSignup false", /publicSignupEnabled[\s\S]*?false/i.test(doc));
check("no real lead", /Real lead created this step \| \*\*no\*\*/i.test(doc));
check("expected recommendation", doc.includes(EXPECTED_RECOMMENDATION));
check("HOLD recommendation", /\*\*HOLD\*\*|HOLD —/.test(doc));

check("fixture version", fixture.version === "v22.29");
check(
  "fixture kill switch absent",
  fixture.checks.dedicated_lead_capture_kill_switch_exists === false
);
check(
  "fixture capture not reliably blocked",
  fixture.lead_capture_reliably_blocked_for_authenticated_users === false
);
check("fixture no real lead", fixture.checks.real_lead_created === false);
check(
  "fixture no dealer send",
  fixture.checks.dealer_facing_send_performed === false
);
check("fixture marketplace PASS", fixture.checks.marketplace_count_13 === "PASS");
check("fixture thor dealer PASS", fixture.checks.thor_three_listings_dealer_id_thor_auto === "PASS");
check("fixture recommendation", fixture.final_recommendation === EXPECTED_RECOMMENDATION);
check("fixture no approval request", fixture.approval_requested_this_step === false);
check("fixture no owner token", fixture.owner_token_requested === false);

if (failures > 0) {
  console.log(`\nFAIL v22.29 validator (${failures} checks)`);
  process.exit(1);
}
console.log("\nPASS test:v22.29 validator");

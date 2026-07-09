/**
 * Validates v22.19A cleanup execution record + owner verification prep docs.
 * Does not call production, create leads, or request owner tokens.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const record = fs.readFileSync(
  path.join(root, "docs/v22.19A-staging-thor-duplicate-cleanup-execution-record.md"),
  "utf8"
);
const plan = fs.readFileSync(
  path.join(root, "docs/v22.19-staging-thor-duplicate-cleanup-plan.md"),
  "utf8"
);
const script = fs.readFileSync(
  path.join(root, "scripts/run-v22.19-staging-thor-duplicate-cleanup.mts"),
  "utf8"
);

function ok(name) {
  console.log("PASS", name);
}

assert.match(record, /marketplace count \| \*\*13\*\*/i);
ok("execution record states marketplace count 13");

assert.match(record, /Kept \(canonical\)/i);
assert.match(record, /car-import-1783556891631-p0/);
assert.match(record, /car-import-1783565788477-p0/);
ok("execution record lists kept/hidden pair ids");

assert.match(record, /owner-browser final Confirm Import/i);
assert.match(record, /does not increase/i);
ok("owner-browser verification instructions present");

assert.match(record, /no production/i);
assert.match(record, /publicSignupEnabled:false/i);
ok("boundaries recorded");

assert.match(plan, /marketplace count \*\*13\*\*/i);
assert.match(plan, /Ran `scripts\/run-v22\.19-staging-thor-duplicate-cleanup\.mts`/i);
ok("cleanup plan audit log filled with execution");

assert.match(script, /NONGA_STAGING_CLEANUP_ACCESS_TOKEN/);
assert.match(script, /firestore\.googleapis\.com/);
ok("cleanup script uses REST + env token path");

assert.match(record, /NEED REVIEW — duplicate cleanup is complete/i);
assert.match(record, /PASS remains blocked/i);
ok("recommendation remains NEED REVIEW until owner re-import verification");

console.log("\nAll v22.19A cleanup record checks passed.");

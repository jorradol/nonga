/**
 * v14.4C one-run consumption guard diagnosis validator
 * Static checks only. No owner one-run/provider/runtime execution.
 *
 * npm run test:v14.4C
 */
import { existsSync, readFileSync } from "node:fs";
import {
  parseDispatchApprovalRunIdOrHold,
  resolveDispatchLockPathForApprovalTextOrHold,
} from "./owner-local-user-visible-one-run-gate-v143ac.mts";

const DOC_PATH = "docs/v14.4C-one-run-consumption-guard-diagnosis.md";
const FIXTURE_PATH = "docs/examples/v14.4C-one-run-consumption-guard-diagnosis.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const PACKAGE_PATH = "package.json";
const GITIGNORE_PATH = ".gitignore";

const APPROVAL_V143AG =
  "FINAL EXECUTION AUTHORIZE v14.3AG USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN";
const APPROVAL_V143AJ =
  "FINAL EXECUTION AUTHORIZE v14.3AJ USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN";

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

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v14.4C One-Run Consumption Guard Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("gitignore exists", existsSync(GITIGNORE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const packageRaw = read(PACKAGE_PATH);
const gitignore = read(GITIGNORE_PATH);

const runIdAg = parseDispatchApprovalRunIdOrHold(APPROVAL_V143AG);
const runIdAj = parseDispatchApprovalRunIdOrHold(APPROVAL_V143AJ);
const lockPathAg = resolveDispatchLockPathForApprovalTextOrHold(APPROVAL_V143AG);
const lockPathAj = resolveDispatchLockPathForApprovalTextOrHold(APPROVAL_V143AJ);
const lockPathAjAgain = resolveDispatchLockPathForApprovalTextOrHold(APPROVAL_V143AJ);

ok("dispatch run id parser normalizes AG", runIdAg === "v143ag");
ok("dispatch run id parser normalizes AJ", runIdAj === "v143aj");

ok(
  "v14.3AJ marker namespace differs from v14.3AG marker",
  lockPathAg !== lockPathAj &&
    /\.nonga-owner-local-one-run-v143ag-user-visible-dispatch\.lock\.json$/i.test(lockPathAg) &&
    /\.nonga-owner-local-one-run-v143aj-user-visible-dispatch\.lock\.json$/i.test(lockPathAj)
);

ok(
  "same v14.3AJ approval phrase maps to same marker path",
  lockPathAj === lockPathAjAgain
);

let invalidNamespaceThrows = false;
try {
  parseDispatchApprovalRunIdOrHold(
    "FINAL EXECUTION AUTHORIZE v14.3AJ USER-VISIBLE FIREBASE DISPATCH SAME-CMD"
  );
} catch {
  invalidNamespaceThrows = true;
}
ok("invalid dispatch approval format fails closed", invalidNamespaceThrows);

ok(
  "wrapper still blocks approval phrase mismatch",
  /if \(approvalText !== requiredApprovalText\)\s*\{\s*hold\("fresh owner approval text mismatch"\)/m.test(
    wrapper
  )
);

ok(
  "wrapper still blocks retry/second-run for consumed marker",
  /if \(lock\.consumed\) hold\("one-run already consumed \(retry\/second-run blocked\)"\)/.test(wrapper)
);

ok(
  "wrapper keeps fail-closed marker handling",
  /catch\s*\{\s*return \{ consumed: true \};\s*\}/m.test(wrapper) &&
    /hold\("cannot persist one-run lock"\)/.test(wrapper)
);

ok(
  "doc states no-run diagnosis boundary",
  /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);

ok(
  "gitignore covers namespaced dispatch lock artifacts",
  /\.nonga-owner-local-one-run-v\*-user-visible-dispatch\.lock\.json/.test(gitignore)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.4C", root.version === "v14.4C");
  ok(
    "fixture records namespace split diagnosis",
    (root.markerNamespaceDiagnosis as Record<string, unknown>)?.v143agBlocksV143aj === false
  );
  ok(
    "fixture records guard safety retained",
    (root.guardSafety as Record<string, unknown>)?.retrySecondRunBlocked === true &&
      (root.guardSafety as Record<string, unknown>)?.consumptionFailureFailClosed === true
  );
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok(
    "package has test:v14.4C script",
    scripts["test:v14.4C"] === "tsx scripts/test-v144C-one-run-consumption-guard-diagnosis.mts"
  );
}

console.log(`\nDone v14.4C guard diagnosis validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

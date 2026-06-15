/**
 * v6.6O — Gate test for thor local-only import rehearsal script
 * Validates script guards without executing import.
 * Run: npm run test:thor-local-only-import-rehearsal-gate
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SCRIPT = "scripts/run-thor-local-only-import-rehearsal.mts";
const READINESS_REPORT = path.resolve(
  process.cwd(),
  ".private/thor-auto-manual-prep/activation-batch-v1/local-only-rehearsal-readiness.json"
);

let failed = false;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) failed = true;
}

function runScript(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, ["./node_modules/tsx/dist/cli.mjs", SCRIPT, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

console.log("=== Thor Local-Only Import Rehearsal Gate (v6.6O) ===\n");

ok("rehearsal script exists", fs.existsSync(SCRIPT));

const validateRun = runScript([]);
ok("validate-only exits 0", validateRun.status === 0, validateRun.stderr?.slice(0, 200));
ok(
  "validate-only reports VALIDATE-ONLY PASS",
  /VALIDATE-ONLY PASS/.test(validateRun.stdout ?? "")
);
ok(
  "validate-only does not execute import",
  !/LOCAL-ONLY EXECUTE PASS/.test(validateRun.stdout ?? "")
);

if (fs.existsSync(READINESS_REPORT)) {
  const report = JSON.parse(fs.readFileSync(READINESS_REPORT, "utf8")) as {
    mode?: string;
    importExecuted?: boolean;
    readyForLocalOnlyExecution?: boolean;
    totalRows?: number;
  };
  ok("readiness report mode validate-only", report.mode === "validate-only");
  ok("readiness report importExecuted false", report.importExecuted === false);
  ok("readiness report ready true", report.readyForLocalOnlyExecution === true);
  ok("readiness report totalRows 10", report.totalRows === 10);
} else {
  ok("readiness report written", false, READINESS_REPORT);
}

const firestoreRun = runScript([], { NONGA_DATA_BACKEND: "firestore" });
ok(
  "rejects NONGA_DATA_BACKEND=firestore",
  firestoreRun.status !== 0,
  firestoreRun.stdout?.slice(0, 120)
);

const publishRun = runScript(["--publish"]);
ok("rejects --publish flag", publishRun.status !== 0);

const accountRun = runScript(["--create-account"]);
ok("rejects --create-account flag", accountRun.status !== 0);

const pkg = fs.readFileSync("package.json", "utf8");
ok(
  "package.json has run:thor-local-only-import-rehearsal",
  /"run:thor-local-only-import-rehearsal"/.test(pkg)
);
ok(
  "package.json has test:thor-local-only-import-rehearsal-gate",
  /"test:thor-local-only-import-rehearsal-gate"/.test(pkg)
);

const gateDoc = "docs/v6.6O-local-only-runtime-import-gate.md";
ok("v6.6O gate doc exists", fs.existsSync(gateDoc));

if (failed) {
  console.log("\n=== FAIL ===");
  process.exit(1);
}
console.log("\n=== PASS ===");

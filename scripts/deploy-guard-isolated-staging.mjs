import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  assertIsolatedTarget,
  assertStagingHostingRewrite,
  requireOwnerApprovalPhrase,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";

function usage() {
  console.log(`Usage:
  node scripts/deploy-guard-isolated-staging.mjs --config firebase.isolated-staging.json --project <explicit-isolated-project>

Environment:
  All NONGA_ISOLATED_STAGING_* target identity variables are required.
  OWNER_APPROVAL_PHRASE must be the exact Gate E phrase.

This guard has no Production mode and never reads .firebaserc defaults.`);
}

function readRequiredFlag(name) {
  const flagIndex = process.argv.indexOf(name);
  if (flagIndex < 0 || !process.argv[flagIndex + 1]) {
    throw new Error(`${name} must be explicitly provided`);
  }
  return String(process.argv[flagIndex + 1]).trim();
}

function describeCloudRunService(target) {
  const raw = execFileSync(
    "gcloud",
    [
      "run",
      "services",
      "describe",
      target.cloudRunService,
      `--project=${target.projectId}`,
      `--region=${target.region}`,
      "--format=json",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  const service = JSON.parse(raw);
  const name = String(service?.metadata?.name ?? "");
  if (name !== target.cloudRunService) {
    throw new Error("Cloud Run describe returned an unexpected service");
  }
}

function readConfigPath() {
  const flagIndex = process.argv.indexOf("--config");
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) {
    return process.argv[flagIndex + 1];
  }
  throw new Error("--config must be explicitly provided");
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }

  const configPath = readConfigPath();
  if (configPath !== "firebase.isolated-staging.json") {
    throw new Error("only firebase.isolated-staging.json is permitted");
  }
  const explicitProject = readRequiredFlag("--project");
  const target = resolveExplicitIsolatedTarget(process.env, "hosting deploy guard");
  assertIsolatedTarget(target, "hosting deploy guard");
  if (explicitProject !== target.projectId) {
    throw new Error("--project must match the explicit isolated target project");
  }
  const firebaseJson = JSON.parse(readFileSync(configPath, "utf8"));
  assertStagingHostingRewrite(firebaseJson, target, configPath);
  requireOwnerApprovalPhrase(
    process.env.OWNER_APPROVAL_PHRASE,
    "gateEDeployIsolated",
    "isolated staging deploy"
  );
  describeCloudRunService(target);
  console.log("PASS isolated staging deploy guard", {
    projectId: target.projectId,
    configPath,
    hostingSite: target.hostingSite,
    cloudRunService: target.cloudRunService,
    region: target.region,
  });
}

try {
  main();
} catch (error) {
  console.error(
    "FAIL deploy-guard",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
}

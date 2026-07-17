import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  APPROVAL_PHRASES,
  PRODUCTION_CLOUD_RUN_SERVICE,
  PRODUCTION_PROJECT_ID,
  PROPOSED_ISOLATED_CLOUD_RUN_REGION,
  PROPOSED_ISOLATED_CLOUD_RUN_SERVICE,
  assertIsolatedTarget,
  assertNoProductionIdentifiers,
  assertStagingHostingRewrite,
  isProductionPublicUrl,
  requireOwnerApprovalPhrase,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const explicitEnv = {
  NONGA_ISOLATED_STAGING_PROJECT_ID: "nonga-staging-2026",
  NONGA_ISOLATED_STAGING_HOSTING_SITE: "nonga-staging-2026",
  NONGA_ISOLATED_STAGING_CLOUD_RUN_SERVICE: "nonga-staging-api-2026",
  NONGA_ISOLATED_STAGING_REGION: "asia-southeast1",
  NONGA_ISOLATED_STAGING_URL: "https://nonga-staging-2026.web.app",
  NONGA_ISOLATED_STAGING_STORAGE_BUCKET: "nonga-staging-2026.firebasestorage.app",
  NONGA_ISOLATED_STAGING_FIRESTORE_DATABASE_ID: "(default)",
  NONGA_ISOLATED_STAGING_FIRESTORE_PROJECT_ID: "nonga-staging-2026",
  NONGA_ISOLATED_STAGING_API_PROJECT_ID: "nonga-staging-2026",
  NONGA_ISOLATED_STAGING_AUTH_PROJECT_ID: "nonga-staging-2026",
  NONGA_ISOLATED_STAGING_AUTH_TENANT_ID: "(default-isolated-tenant)",
};

const target = resolveExplicitIsolatedTarget(explicitEnv, "test");
const isolatedConfig = JSON.parse(readFileSync("firebase.isolated-staging.json", "utf8"));

console.log("=== test:isolated-staging-guard ===");

ok("positive: explicit isolated target passes", !throws(() => assertIsolatedTarget(target, "test")));
ok(
  "positive: isolated hosting rewrite passes",
  !throws(() => assertStagingHostingRewrite(isolatedConfig, target, "test"))
);
ok(
  "positive: five distinct approval gates",
  new Set(Object.values(APPROVAL_PHRASES)).size === 5
);
ok(
  "positive: Gate E exact phrase passes",
  !throws(() =>
    requireOwnerApprovalPhrase(
      APPROVAL_PHRASES.gateEDeployIsolated,
      "gateEDeployIsolated",
      "test"
    )
  )
);
ok(
  "positive: isolated service name and region are revised",
  target.cloudRunService === PROPOSED_ISOLATED_CLOUD_RUN_SERVICE &&
    target.region === PROPOSED_ISOLATED_CLOUD_RUN_REGION
);

ok(
  "negative: production project rejected",
  throws(() => assertIsolatedTarget({ ...target, projectId: PRODUCTION_PROJECT_ID }, "test"))
);
ok(
  "negative: empty project rejected",
  throws(() => resolveExplicitIsolatedTarget({ ...explicitEnv, NONGA_ISOLATED_STAGING_PROJECT_ID: "" }, "test"))
);
ok(
  "negative: production hosting site rejected",
  throws(() => assertIsolatedTarget({ ...target, hostingSite: "nonga-ce93c" }, "test"))
);
ok("negative: production URL recognized", isProductionPublicUrl("https://a.nongbot.org"));
ok(
  "negative: production URL rejected as target",
  throws(() => assertIsolatedTarget({ ...target, stagingUrl: "https://a.nongbot.org" }, "test"))
);
ok(
  "negative: live Cloud Run service rejected",
  throws(() =>
    assertIsolatedTarget({ ...target, cloudRunService: PRODUCTION_CLOUD_RUN_SERVICE }, "test")
  )
);
ok(
  "negative: empty region rejected",
  throws(() => assertIsolatedTarget({ ...target, region: "" }, "test"))
);
ok(
  "negative: wrong region rejected",
  throws(() => assertIsolatedTarget({ ...target, region: "us-central1" }, "test"))
);

const productionRewrite = structuredClone(isolatedConfig);
productionRewrite.hosting.rewrites[0].run.serviceId = "nonga-staging";
ok(
  "negative: production API rewrite rejected",
  throws(() => assertStagingHostingRewrite(productionRewrite, target, "test"))
);

const mixedApiTarget = { ...target, apiProjectId: "nonga-ce93c" };
ok(
  "negative: staging frontend plus production API rejected",
  throws(() => assertIsolatedTarget(mixedApiTarget, "test"))
);
ok(
  "negative: correct Gate E phrase cannot override Production target",
  throws(() => {
    assertIsolatedTarget(mixedApiTarget, "test");
    requireOwnerApprovalPhrase(
      APPROVAL_PHRASES.gateEDeployIsolated,
      "gateEDeployIsolated",
      "test"
    );
  })
);
ok(
  "negative: Gate A phrase cannot open Gate E",
  throws(() =>
    requireOwnerApprovalPhrase(
      APPROVAL_PHRASES.gateAPlanningFiles,
      "gateEDeployIsolated",
      "test"
    )
  )
);
ok(
  "negative: unresolved target variable rejected",
  throws(() =>
    resolveExplicitIsolatedTarget(
      { ...explicitEnv, NONGA_ISOLATED_STAGING_URL: "${STAGING_URL}" },
      "test"
    )
  )
);
ok(
  "negative: production Storage bucket rejected",
  throws(() =>
    assertIsolatedTarget(
      { ...target, storageBucket: "nonga-ce93c.firebasestorage.app" },
      "test"
    )
  )
);
ok(
  "negative: production Auth project rejected",
  throws(() => assertIsolatedTarget({ ...target, authProjectId: "nonga-ce93c" }, "test"))
);
ok(
  "negative: Production Firebase API identifiers rejected",
  throws(() =>
    assertNoProductionIdentifiers(
      {
        authDomain: "nonga-ce93c.firebaseapp.com",
        storageBucket: "nonga-ce93c.firebasestorage.app",
      },
      "test"
    )
  )
);

const guardWithoutProject = spawnSync(
  process.execPath,
  ["scripts/deploy-guard-isolated-staging.mjs", "--config", "firebase.isolated-staging.json"],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      ...explicitEnv,
      OWNER_APPROVAL_PHRASE: APPROVAL_PHRASES.gateEDeployIsolated,
    },
  }
);
ok(
  "negative: .firebaserc/default cannot replace explicit --project",
  guardWithoutProject.status !== 0 &&
    `${guardWithoutProject.stdout}${guardWithoutProject.stderr}`.includes("--project")
);

const fixtureWriteWithoutCredentials = spawnSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/seed-isolated-staging-fixtures.mts", "--write"],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      ...explicitEnv,
      OWNER_APPROVAL_PHRASE: APPROVAL_PHRASES.gateDSeedFixtures,
      FIREBASE_SERVICE_ACCOUNT_JSON: "",
      GOOGLE_APPLICATION_CREDENTIALS: "",
    },
  }
);
ok(
  "negative: fixture write requires verified isolated credentials",
  fixtureWriteWithoutCredentials.status !== 0 &&
    `${fixtureWriteWithoutCredentials.stdout}${fixtureWriteWithoutCredentials.stderr}`.includes(
      "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
);

const fixtureDryRun = spawnSync(
  process.execPath,
  [
    "node_modules/tsx/dist/cli.mjs",
    "scripts/seed-isolated-staging-fixtures.mts",
    "--dry-run",
    "--json",
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      ...explicitEnv,
      FIREBASE_SERVICE_ACCOUNT_JSON: "",
    },
  }
);
ok(
  "positive: fixture dry-run needs no credentials and performs no write",
  fixtureDryRun.status === 0 &&
    fixtureDryRun.stdout.includes('"mode": "dry-run"') &&
    !fixtureDryRun.stdout.includes("PASS wrote")
);

const packageJson = readFileSync("package.json", "utf8");
ok(
  "negative: no Production deploy npm capability",
  !packageJson.includes("guard:deploy:production")
);
ok(
  "negative: no Production approval phrase",
  !Object.values(APPROVAL_PHRASES).some((phrase) => phrase.includes("PRODUCTION"))
);

const deployGuardSource = readFileSync(
  "scripts/deploy-guard-isolated-staging.mjs",
  "utf8"
);
ok(
  "negative: isolated deploy guard has no Production mode",
  !deployGuardSource.includes('target === "production"') &&
    !deployGuardSource.includes("firebase.production.json")
);

const planSource = readFileSync(
  "scripts/provision-isolated-staging-phases.mts",
  "utf8"
);
ok(
  "positive: approved instructions mode cannot invoke infrastructure",
  planSource.includes("--show-approved-instructions") &&
    !planSource.includes('from "node:child_process"')
);

const fixtureText = readFileSync(
  "docs/examples/staging-synthetic-fixture-manifest.json",
  "utf8"
);
ok(
  "positive: fixtures use fictional identities and generated placeholders",
  fixtureText.includes("STAGING FICTIONAL") &&
    fixtureText.includes("generated Staging-only placeholders")
);
ok(
  "negative: fixture manifest has no legacy dealer identities or plate value",
  !fixtureText.includes("thor-auto") &&
    !fixtureText.includes("nonga-dealer") &&
    !fixtureText.includes("กท ****")
);

console.log(`\nSummary: ${pass} passed, ${fail} failed`);

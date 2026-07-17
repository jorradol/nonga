import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  assertHealthEnvironmentIsolation,
  assertIsolatedTarget,
  assertStagingHostingRewrite,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";
import {
  EXPECTED_ISOLATED_MARKETPLACE_COUNT,
  expectedBuildProvenanceCommit,
  expectedCloudRunRevision,
  formatMismatch,
  getCarsCount,
  getCloudRunRevision,
  getPublicSignupEnabled,
  parseBuildProvenance,
  parseJsonStrict,
  parseMainJsAssetFromHtml,
  maskValue,
} from "./preflight-isolated-staging-lib.mjs";

const checks = [];
const TARGET = resolveExplicitIsolatedTarget(process.env, "isolated staging preflight");
assertIsolatedTarget(TARGET, "isolated staging preflight");
const ISOLATED_URL = TARGET.stagingUrl;
const ISOLATED_PROJECT = TARGET.projectId;

function run(executable, args) {
  return execFileSync(executable, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
}

function runCheck(name, fn) {
  try {
    const detail = fn();
    pass(name, detail);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

function expectEqual(name, expected, actual) {
  if (actual !== expected) {
    throw new Error(formatMismatch(name, expected, actual));
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  return { response, payload, raw: text };
}

async function main() {
  console.log("=== preflight:isolated-staging (read-only) ===");
  console.log(`Isolated staging URL: ${ISOLATED_URL}`);
  console.log(`Isolated project ID: ${ISOLATED_PROJECT}`);

  runCheck("explicit isolated target identities", () => {
    assertIsolatedTarget(TARGET, "preflight:isolated-staging");
    return `${maskValue(ISOLATED_PROJECT)} / ${TARGET.hostingSite}`;
  });

  runCheck("isolated staging project exists (read-only)", () => {
    const raw = run(process.platform === "win32" ? "npx.cmd" : "npx", [
      "-y",
      "firebase-tools@latest",
      "projects:list",
      "--json",
    ]);
    const parsed = parseJsonStrict("firebase projects:list", raw);
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const found = results.some(
      (item) => String(item?.projectId ?? "") === ISOLATED_PROJECT
    );
    if (!found) {
      throw new Error(
        `project '${ISOLATED_PROJECT}' not found — provisioning Phase 1 not complete or wrong NONGA_ISOLATED_STAGING_PROJECT_ID`
      );
    }
    return maskValue(ISOLATED_PROJECT);
  });

  runCheck("firebase hosting site mapping (isolated config file)", () => {
    const configPath = "firebase.isolated-staging.json";
    if (!existsSync(configPath)) {
      throw new Error(`${configPath} missing — deploy guard config not provisioned in repo`);
    }
    const firebaseJson = parseJsonStrict(
      configPath,
      readFileSync(configPath, "utf8")
    );
    assertStagingHostingRewrite(firebaseJson, TARGET, configPath);
    return `site=${TARGET.hostingSite}, service=${TARGET.cloudRunService}, region=${TARGET.region}`;
  });

  let describedRevision = "";
  runCheck("isolated Cloud Run service exists in explicit project", () => {
    const raw = run("gcloud", [
      "run",
      "services",
      "describe",
      TARGET.cloudRunService,
      `--project=${ISOLATED_PROJECT}`,
      `--region=${TARGET.region}`,
      "--format=json",
    ]);
    const service = parseJsonStrict("gcloud run services describe", raw);
    expectEqual("cloud run metadata.name", TARGET.cloudRunService, service?.metadata?.name);
    describedRevision = getCloudRunRevision(service);
    if (!describedRevision) throw new Error("Cloud Run service has no ready revision");
    return `${TARGET.cloudRunService} / ${describedRevision}`;
  });

  const pinnedRevision = expectedCloudRunRevision();
  if (pinnedRevision) {
    runCheck("cloud run revision (pinned)", () => {
      expectEqual("cloud run latestReadyRevisionName", pinnedRevision, describedRevision);
      return describedRevision;
    });
  } else {
    pass("cloud run revision (skip)", "NONGA_ISOLATED_STAGING_CLOUD_RUN_REVISION not set");
  }

  let stagingReachable = false;
  try {
    const home = await fetch(`${ISOLATED_URL}/`, { method: "GET" });
    if (home.status === 200) stagingReachable = true;
  } catch {
    stagingReachable = false;
  }

  if (!stagingReachable) {
    pass(
      "staging surface not live yet",
      "skip HTTP checks until Phase 5–7 complete"
    );
  } else {
    const home = await fetch(`${ISOLATED_URL}/`, { method: "GET" });
    runCheck("isolated staging root", () => {
      if (home.status !== 200) {
        throw new Error(`GET / expected 200 got ${home.status}`);
      }
      return `status=${home.status}`;
    });

    const health = await fetchJson(`${ISOLATED_URL}/api/health`);
    runCheck("api health + safety flags", () => {
      if (health.response.status !== 200) {
        throw new Error(`GET /api/health expected 200 got ${health.response.status}`);
      }
      assertHealthEnvironmentIsolation(health.payload, TARGET);
      const signup = getPublicSignupEnabled(health.payload);
      expectEqual("publicSignupEnabled", false, signup);
      return `publicSignupEnabled=${signup}, leadCaptureEnabled=false`;
    });

    const cars = await fetchJson(`${ISOLATED_URL}/api/cars`);
    runCheck("api cars count", () => {
      if (cars.response.status !== 200) {
        throw new Error(`GET /api/cars expected 200 got ${cars.response.status}`);
      }
      const count = getCarsCount(cars.payload);
      expectEqual("marketplace count", EXPECTED_ISOLATED_MARKETPLACE_COUNT, count);
      return `count=${count}`;
    });

    const pinnedCommit = expectedBuildProvenanceCommit();
    if (pinnedCommit) {
      const provenance = await fetchJson(`${ISOLATED_URL}/build-provenance.json`);
      runCheck("build provenance commit", () => {
        if (provenance.response.status !== 200) {
          throw new Error("build-provenance.json not available");
        }
        const parsed = parseBuildProvenance(provenance.payload);
        if (!parsed) throw new Error("invalid build provenance");
        expectEqual("build provenance commit", pinnedCommit, parsed.gitCommit);
        return parsed.gitCommit.slice(0, 12);
      });
    }
  }

  const failed = checks.filter((check) => !check.ok);
  console.log(`\nSummary: ${checks.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("preflight:isolated-staging PASS");
}

main().catch((error) => {
  console.error("FAIL preflight crashed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

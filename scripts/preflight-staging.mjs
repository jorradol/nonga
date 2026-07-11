import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  EXPECTED_BRANCH,
  EXPECTED_CLOUD_RUN_REGION,
  EXPECTED_CLOUD_RUN_REVISION,
  EXPECTED_CLOUD_RUN_SERVICE,
  EXPECTED_HOSTING_SITE,
  EXPECTED_MARKETPLACE_COUNT,
  EXPECTED_PROJECT_ID,
  EXPECTED_STAGING_URL,
  formatMismatch,
  getCarsCount,
  getCloudRunRevision,
  getPublicSignupEnabled,
  isExpectedStagingUrl,
  isProductionLikeProject,
  maskValue,
  parseMainJsAssetFromHtml,
  parseJsonStrict,
} from "./preflight-staging-lib.mjs";

const checks = [];

function run(command) {
  return execSync(command, {
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

function ensureHttp200(label, response) {
  if (!response || response.status !== 200) {
    throw new Error(`${label} expected HTTP 200 got ${response?.status ?? "unknown"}`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { "accept": "application/json" },
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
  console.log("=== preflight:staging (read-only) ===");
  console.log(`Staging URL: ${EXPECTED_STAGING_URL}`);

  runCheck("target is staging only", () => {
    if (!isExpectedStagingUrl(EXPECTED_STAGING_URL)) {
      throw new Error(`unexpected target URL '${EXPECTED_STAGING_URL}'`);
    }
    return EXPECTED_STAGING_URL;
  });

  runCheck("branch", () => {
    const branch = run("git branch --show-current");
    expectEqual("branch", EXPECTED_BRANCH, branch);
    return branch;
  });

  runCheck("local HEAD equals origin", () => {
    const head = run("git rev-parse HEAD");
    const originHead = run(`git rev-parse origin/${EXPECTED_BRANCH}`);
    expectEqual("HEAD parity", originHead, head);
    return head;
  });

  runCheck("working tree snapshot", () => {
    const status = run("git status --short");
    const lines = status ? status.split(/\r?\n/).filter(Boolean) : [];
    const untracked = lines.filter((line) => line.startsWith("?? ")).length;
    return `entries=${lines.length}, untracked=${untracked}`;
  });

  runCheck("firebase active project", () => {
    const raw = run("firebase use --json");
    const parsed = parseJsonStrict("firebase use --json", raw);
    if (parsed.status !== "success") {
      throw new Error(`firebase use --json status=${parsed.status ?? "unknown"}`);
    }
    const activeProject = String(parsed.result ?? "");
    expectEqual("firebase active project", EXPECTED_PROJECT_ID, activeProject);
    if (isProductionLikeProject(activeProject)) {
      throw new Error(`refusing production-like project '${activeProject}'`);
    }
    return maskValue(activeProject);
  });

  runCheck("hosting site mapping", () => {
    const firebaseJsonRaw = readFileSync("firebase.json", "utf8");
    const firebaseJson = parseJsonStrict("firebase.json", firebaseJsonRaw);
    const site = firebaseJson?.hosting?.site;
    expectEqual("firebase hosting.site", EXPECTED_HOSTING_SITE, site);
    const serviceId = firebaseJson?.hosting?.rewrites?.find?.(
      (item) => item?.source === "/api/**"
    )?.run?.serviceId;
    const region = firebaseJson?.hosting?.rewrites?.find?.(
      (item) => item?.source === "/api/**"
    )?.run?.region;
    expectEqual("api rewrite serviceId", EXPECTED_CLOUD_RUN_SERVICE, serviceId);
    expectEqual("api rewrite region", EXPECTED_CLOUD_RUN_REGION, region);
    return `site=${site}, service=${serviceId}, region=${region}`;
  });

  runCheck("cloud run revision", () => {
    const raw = run(
      `gcloud run services describe ${EXPECTED_CLOUD_RUN_SERVICE} --project=${EXPECTED_PROJECT_ID} --region=${EXPECTED_CLOUD_RUN_REGION} --format=json`
    );
    const service = parseJsonStrict("gcloud run services describe", raw);
    const revision = getCloudRunRevision(service);
    expectEqual("cloud run latestReadyRevisionName", EXPECTED_CLOUD_RUN_REVISION, revision);
    return revision;
  });

  const home = await fetch(`${EXPECTED_STAGING_URL}/`, { method: "GET" });
  runCheck("staging root", () => {
    ensureHttp200("GET /", home);
    return `status=${home.status}`;
  });

  const stagingIndexHtml = await home.text();
  const stagingMainAsset = parseMainJsAssetFromHtml(stagingIndexHtml);
  runCheck("staging main JS asset present", () => {
    if (!stagingMainAsset) {
      throw new Error("staging index.html missing /assets/index-*.js module asset");
    }
    return stagingMainAsset;
  });

  if (stagingMainAsset) {
    const assetUrl = `${EXPECTED_STAGING_URL}/${stagingMainAsset.replace(/^\//, "")}`;
    const assetResponse = await fetch(assetUrl, { method: "GET" });
    runCheck("staging main JS asset fetch", () => {
      ensureHttp200(`GET ${stagingMainAsset}`, assetResponse);
      return `status=${assetResponse.status}`;
    });
  }

  runCheck("local dist main asset parity (best-effort)", () => {
    if (!existsSync("dist/index.html")) {
      return "skip: dist/index.html not found";
    }
    if (!stagingMainAsset) {
      return "skip: staging asset unavailable";
    }
    const localIndexHtml = readFileSync("dist/index.html", "utf8");
    const localMainAsset = parseMainJsAssetFromHtml(localIndexHtml);
    if (!localMainAsset) {
      return "skip: local dist main asset not detectable";
    }
    expectEqual("local/staging main asset", stagingMainAsset, localMainAsset);
    return localMainAsset;
  });

  const health = await fetchJson(`${EXPECTED_STAGING_URL}/api/health`);
  runCheck("api health", () => {
    ensureHttp200("GET /api/health", health.response);
    const publicSignup = getPublicSignupEnabled(health.payload);
    expectEqual("publicSignupEnabled", false, publicSignup);
    return `publicSignupEnabled=${publicSignup}`;
  });

  const cars = await fetchJson(`${EXPECTED_STAGING_URL}/api/cars`);
  runCheck("api cars", () => {
    ensureHttp200("GET /api/cars", cars.response);
    const count = getCarsCount(cars.payload);
    expectEqual("marketplace count", EXPECTED_MARKETPLACE_COUNT, count);
    return `count=${count}`;
  });

  const failed = checks.filter((check) => !check.ok);
  console.log(`\nSummary: ${checks.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("preflight:staging PASS");
}

main().catch((error) => {
  console.error("FAIL preflight crashed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

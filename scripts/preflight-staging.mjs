import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  EXPECTED_BRANCH,
  EXPECTED_CLOUD_RUN_REGION,
  EXPECTED_CLOUD_RUN_REVISION,
  EXPECTED_CLOUD_RUN_SERVICE,
  EXPECTED_HOSTING_ASSET,
  EXPECTED_HOSTING_SITE,
  EXPECTED_MARKETPLACE_COUNT,
  EXPECTED_PROJECT_ID,
  EXPECTED_STAGING_URL,
  formatMismatch,
  getCarsCount,
  getCloudRunRevision,
  getPublicSignupEnabled,
  isProductionLikeProject,
  maskValue,
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

  runCheck("hosting asset baseline", () => {
    const indexHtml = readFileSync("dist/index.html", "utf8");
    if (!indexHtml.includes(EXPECTED_HOSTING_ASSET)) {
      throw new Error(`dist/index.html missing ${EXPECTED_HOSTING_ASSET}`);
    }
    return EXPECTED_HOSTING_ASSET;
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

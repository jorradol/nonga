import { readFileSync } from "node:fs";
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
  parseBuildProvenance,
  isProductionLikeProject,
  parseMainJsAssetFromHtml,
  parseJsonStrict,
} from "./preflight-staging-lib.mjs";

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

console.log("=== test-preflight-staging ===");

ok("expected branch", EXPECTED_BRANCH === "feature/chat-image-attachment-v1");
ok("expected project", EXPECTED_PROJECT_ID === "nonga-ce93c");
ok("expected hosting site", EXPECTED_HOSTING_SITE === "nonga-ce93c");
ok("expected cloud run service", EXPECTED_CLOUD_RUN_SERVICE === "nonga-staging");
ok("expected cloud run region", EXPECTED_CLOUD_RUN_REGION === "asia-southeast1");
ok("expected cloud run revision", EXPECTED_CLOUD_RUN_REVISION === "nonga-staging-00223-vqr");
ok("expected marketplace count", EXPECTED_MARKETPLACE_COUNT === 15);
ok("expected staging url", EXPECTED_STAGING_URL === "https://a.nongbot.org");
ok("staging url guard accepts expected URL", isExpectedStagingUrl(EXPECTED_STAGING_URL));
ok(
  "staging url guard rejects non-staging URL",
  !isExpectedStagingUrl("https://example.com")
);

const valid = parseJsonStrict("json", "{\"status\":\"success\",\"result\":\"nonga-ce93c\"}") as {
  status: string;
  result: string;
};
ok("parseJsonStrict parses valid json", valid.result === "nonga-ce93c");

let parseError = false;
try {
  parseJsonStrict("broken", "{");
} catch {
  parseError = true;
}
ok("parseJsonStrict throws on invalid json", parseError);

ok(
  "getCloudRunRevision reads latestReadyRevisionName",
  getCloudRunRevision({
    status: { latestReadyRevisionName: "nonga-staging-00223-vqr" },
  }) === "nonga-staging-00223-vqr"
);
ok("getCloudRunRevision handles missing status", getCloudRunRevision({}) === "");

ok("getCarsCount converts numeric field", getCarsCount({ count: 15 }) === 15);
ok("getCarsCount returns NaN on invalid payload", Number.isNaN(getCarsCount(null)));

ok("getPublicSignupEnabled reads field", getPublicSignupEnabled({ publicSignupEnabled: false }) === false);
ok("getPublicSignupEnabled undefined when missing", getPublicSignupEnabled({}) === undefined);

ok("isProductionLikeProject detects production", isProductionLikeProject("nonga-production"));
ok("isProductionLikeProject allows staging", !isProductionLikeProject("nonga-ce93c"));

ok(
  "formatMismatch produces readable message",
  formatMismatch("branch", "a", "b") === "branch mismatch: expected 'a' got 'b'"
);

ok(
  "parseMainJsAssetFromHtml reads hashed main asset",
  parseMainJsAssetFromHtml(
    '<!doctype html><script type="module" src="/assets/index-B1Px7Hch.js"></script>'
  ) === "assets/index-B1Px7Hch.js"
);
ok(
  "parseMainJsAssetFromHtml rejects non-index asset",
  parseMainJsAssetFromHtml(
    '<!doctype html><script type="module" src="/assets/vendor.js"></script>'
  ) === null
);
ok(
  "parseBuildProvenance validates required payload",
  Boolean(
    parseBuildProvenance({
      gitCommit: "922c1ed7016b6a9763bd6130e19bc148e10e95f2",
      builtAt: "2026-07-11T16:00:00.000Z",
      mainAsset: "assets/index-B1Px7Hch.js",
    })
  )
);
ok(
  "parseBuildProvenance rejects malformed payload",
  parseBuildProvenance({
    gitCommit: "not-a-commit",
    builtAt: "",
    mainAsset: "assets/vendor.js",
  }) === null
);

const preflightScript = readFileSync("scripts/preflight-staging.mjs", "utf8");
ok("preflight checks firebase use --json", preflightScript.includes("firebase use --json"));
ok("preflight checks gcloud run services describe", preflightScript.includes("gcloud run services describe"));
ok(
  "preflight checks staging URL",
  preflightScript.includes("EXPECTED_STAGING_URL") &&
    preflightScript.includes("fetchJson(`${EXPECTED_STAGING_URL}/api/health`")
);
ok(
  "preflight checks staging main asset dynamically",
  preflightScript.includes("parseMainJsAssetFromHtml(stagingIndexHtml)")
);
ok(
  "preflight validates asset fetch 200",
  preflightScript.includes("staging main JS asset fetch")
);
ok(
  "preflight validates build provenance payload",
  preflightScript.includes("staging build provenance payload")
);
ok(
  "preflight enforces provenance commit parity",
  preflightScript.includes("staging build provenance commit matches expected")
);
ok(
  "preflight enforces provenance asset parity",
  preflightScript.includes("staging build provenance main asset matches index")
);
ok(
  "preflight no hard-coded historical asset hash",
  !preflightScript.includes("EXPECTED_HOSTING_ASSET")
);
ok("preflight does not auto-switch firebase project", !/firebase use nonga-ce93c/.test(preflightScript));
ok("preflight does not deploy", !/firebase deploy|gcloud run deploy|services update/.test(preflightScript));

console.log(`Done test-preflight-staging: ${pass} passed, ${fail} failed`);
if (process.exitCode) process.exit(process.exitCode);

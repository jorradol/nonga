import {
  PROPOSED_ISOLATED_CLOUD_RUN_REGION,
  PROPOSED_ISOLATED_CLOUD_RUN_SERVICE,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";

export {
  PROPOSED_ISOLATED_CLOUD_RUN_REGION,
  PROPOSED_ISOLATED_CLOUD_RUN_SERVICE,
  resolveExplicitIsolatedTarget,
};

/** Minimum synthetic listings for Option B with preflight compatibility. */
export const EXPECTED_ISOLATED_MARKETPLACE_COUNT = 15;

/** Set via env after first staging deploy, or leave empty for existence-only checks. */
export function expectedCloudRunRevision(env = process.env) {
  return String(env.NONGA_ISOLATED_STAGING_CLOUD_RUN_REVISION ?? "").trim();
}

export function expectedBuildProvenanceCommit(env = process.env) {
  return String(env.NONGA_ISOLATED_STAGING_BUILD_COMMIT ?? "").trim();
}

export {
  parseJsonStrict,
  getCloudRunRevision,
  getCarsCount,
  getPublicSignupEnabled,
  parseMainJsAssetFromHtml,
  parseBuildProvenance,
  maskValue,
  formatMismatch,
} from "./preflight-staging-lib.mjs";

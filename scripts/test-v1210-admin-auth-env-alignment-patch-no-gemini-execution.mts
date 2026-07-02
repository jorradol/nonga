/**
 * v12.10 Admin Auth / Env Alignment patch validator
 * Static/unit/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v1210:admin-auth-env-alignment-patch-no-gemini-execution
 */
import { readFileSync } from "node:fs";
import {
  buildSanitizedAdminAuthHeaderPreview,
  resolveAdminApiTokenForServer,
  validateAdminTokenCandidate,
} from "../src/utils/apiAuthHeaders";

const DOC_PATH = "docs/v12.10-admin-auth-env-alignment-patch-no-gemini-execution.md";
const SELF_PATH = "scripts/test-v1210-admin-auth-env-alignment-patch-no-gemini-execution.mts";
const PKG_PATH = "package.json";
const ADMIN_HEADER_HELPER_PATH = "src/utils/apiAuthHeaders.ts";
const ADMIN_SMOKE_API_PATH = "src/services/ai/adminShadowSmokeApi.ts";
const SCRIPT_KEY = "test:v1210:admin-auth-env-alignment-patch-no-gemini-execution";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

console.log("=== v12.10 Admin Auth / Env Alignment Patch Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const authHelper = readFileSync(ADMIN_HEADER_HELPER_PATH, "utf8");
const smokeApi = readFileSync(ADMIN_SMOKE_API_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.10 Admin Auth \/ Env Alignment Patch\s*[—-]\s*No Gemini Execution/i.test(doc)
);
ok("doc has PATCH ONLY", /\bPATCH ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["no retry", /\bno retry\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["VITE_NONGA_ADMIN_API_TOKEN", /\bVITE_NONGA_ADMIN_API_TOKEN\b/],
  ["Authorization", /\bAuthorization\b/],
  ["Bearer", /\bBearer\b/],
  ["x-api-token", /\bx-api-token\b/i],
  ["Firebase ID token", /\bFirebase ID token\b/i],
  ["401", /`?401`?/],
  ["authorization consumed: no", /authorization consumed:\s*no/i],
  ["run count: 0/1", /run count:\s*`?0\/1`?/i],
  [
    "recommendation line",
    /(READY FOR ADMIN AUTH NON-GEMINI GATE RECHECK PLAN\s*[—-]\s*no Gemini execution|HOLD\s*[—-]\s*admin auth\/env alignment still unresolved|HOLD\s*[—-]\s*runtime config\/deploy env update required before recheck)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v1210 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v1210 validator",
  pkg.includes("scripts/test-v1210-admin-auth-env-alignment-patch-no-gemini-execution.mts")
);

ok(
  "helper has primary admin env token",
  /NONGA_ADMIN_API_TOKEN/.test(authHelper) && /resolveAdminApiTokenForServer/.test(authHelper)
);
ok(
  "admin smoke api uses explicit admin_api_token mode",
  /mode:\s*"admin_api_token"/.test(smokeApi)
);

{
  const resolvedPrimary = resolveAdminApiTokenForServer({
    env: { NONGA_ADMIN_API_TOKEN: "admin_token_primary_ok" },
  });
  ok("primary env resolves from NONGA_ADMIN_API_TOKEN", resolvedPrimary.token === "admin_token_primary_ok");
  ok(
    "primary source label is NONGA_ADMIN_API_TOKEN",
    resolvedPrimary.source === "NONGA_ADMIN_API_TOKEN"
  );
}

{
  let fallbackDenied = false;
  try {
    resolveAdminApiTokenForServer({
      env: { VITE_NONGA_ADMIN_API_TOKEN: "fallback_token_ok" },
      allowViteAdminTokenFallback: false,
    });
  } catch {
    fallbackDenied = true;
  }
  ok("fallback does not apply silently", fallbackDenied);
}

{
  const resolvedFallback = resolveAdminApiTokenForServer({
    env: { VITE_NONGA_ADMIN_API_TOKEN: "fallback_token_ok" },
    allowViteAdminTokenFallback: true,
  });
  ok("explicit fallback resolves when intended", resolvedFallback.token === "fallback_token_ok");
  ok(
    "fallback source label is VITE_NONGA_ADMIN_API_TOKEN",
    resolvedFallback.source === "VITE_NONGA_ADMIN_API_TOKEN"
  );
}

{
  const valid = validateAdminTokenCandidate("token_ok");
  ok("valid token passes validation", valid.ok === true && valid.normalized === "token_ok");
}

{
  const empty = validateAdminTokenCandidate("");
  ok("empty token fails", empty.ok === false && empty.issue === "empty");

  const whitespace = validateAdminTokenCandidate("  token ");
  ok(
    "whitespace token fails",
    whitespace.ok === false && whitespace.issue === "surrounding_whitespace"
  );

  const newline = validateAdminTokenCandidate("token\nnext");
  ok("newline token fails", newline.ok === false && newline.issue === "contains_newline");

  const quoted = validateAdminTokenCandidate('"quoted_token"');
  ok("quoted token fails", quoted.ok === false && quoted.issue === "quoted_literal");

  const literal = validateAdminTokenCandidate("$NONGA_ADMIN_API_TOKEN");
  ok("literal env token fails", literal.ok === false && literal.issue === "literal_env_reference");

  const duplicatedBearer = validateAdminTokenCandidate("Bearer duplicate");
  ok(
    "duplicated Bearer fails",
    duplicatedBearer.ok === false && duplicatedBearer.issue === "contains_bearer_prefix"
  );
}

{
  const authorizationPreview = buildSanitizedAdminAuthHeaderPreview("admin_api_token");
  ok(
    "sanitized authorization preview masked",
    authorizationPreview === "Authorization: Bearer ***MASKED***"
  );
  ok("sanitized preview never includes raw token", !/admin_token_primary_ok|fallback_token_ok/.test(authorizationPreview));

  const legacyPreview = buildSanitizedAdminAuthHeaderPreview("legacy_x_api_token");
  ok("legacy sanitized preview masked", legacyPreview === "x-api-token: ***MASKED***");
}

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok(
    "validator no smoke endpoint call",
    !/\/api\/admin\/sales-brain-shadow-smoke/.test(selfExecutionBody)
  );
  ok("validator no /api/gemini call", !/\/api\/gemini\//.test(selfExecutionBody));
}

console.log(`\nDone v12.10 patch validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

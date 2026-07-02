/**
 * v12.6 Client Command Template Patch validator
 * Static/unit checks only. No endpoint calls. No Gemini execution.
 *
 * npm run test:v126:client-command-template-patch-no-gemini-execution
 */
import { readFileSync } from "node:fs";
import {
  buildSanitizedCurlCommandTemplate,
  classifyCurlStatusCapture,
  validateAdminShadowSmokeUrl,
} from "./v126-client-command-template-helper.mts";

const DOC_PATH = "docs/v12.6-client-command-template-patch-no-gemini-execution.md";
const SELF_PATH = "scripts/test-v126-client-command-template-patch-no-gemini-execution.mts";
const HELPER_PATH = "scripts/v126-client-command-template-helper.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v126:client-command-template-patch-no-gemini-execution";

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

console.log("=== v12.6 Client Command Template Patch Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const helper = readFileSync(HELPER_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2800, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.6 Client Command Template Patch\s*[—-]\s*No Gemini Execution/i.test(doc)
);
ok("doc has PATCH ONLY", /PATCH ONLY/i.test(doc));

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
  [
    "url rejected error phrase",
    /URL rejected:\s*Port number was not a decimal number between 0 and 65535/i,
  ],
  ["curl exit code 3", /curl exit code:\s*`?3`?/i],
  ["authorization consumed", /\bauthorization consumed\b/i],
  ["fresh FINAL EXECUTION AUTHORIZE", /fresh FINAL EXECUTION AUTHORIZE/i],
  [
    "recommendation line",
    /(READY FOR FRESH AUTHORIZED ONE-RUN PLAN\s*[—-]\s*after owner approval only|HOLD\s*[—-]\s*client command template still unsafe|HOLD\s*[—-]\s*additional root cause review required)/i,
  ],
];
for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

// --- helper unit checks ---
{
  const validHttps = validateAdminShadowSmokeUrl({
    baseUrl: "https://nonga-ce93c.web.app",
  });
  ok("valid https URL passes", validHttps.ok, JSON.stringify(validHttps.errors));

  const validLocalhost = validateAdminShadowSmokeUrl({
    baseUrl: "http://localhost:3000",
  });
  ok("valid localhost decimal port passes", validLocalhost.ok, JSON.stringify(validLocalhost.errors));

  const emptyPort = validateAdminShadowSmokeUrl({
    baseUrl: "http://localhost:",
  });
  ok("empty port fails", !emptyPort.ok);

  const nonDecimalPort = validateAdminShadowSmokeUrl({
    baseUrl: "http://localhost:abc",
  });
  ok("non-decimal port fails", !nonDecimalPort.ok);

  const outOfRangePort = validateAdminShadowSmokeUrl({
    baseUrl: "http://localhost:65536",
  });
  ok("out-of-range port fails", !outOfRangePort.ok);

  const malformed = validateAdminShadowSmokeUrl({
    baseUrl: "http://",
  });
  ok("malformed URL fails", !malformed.ok);
}

{
  const preview = buildSanitizedCurlCommandTemplate({
    baseUrl: "https://nonga-ce93c.web.app",
    caseId: "SS-01",
  });
  ok("sanitized preview builds", preview.ok && !!preview.sanitizedCommandPreview);
  ok(
    "sanitized preview masks token",
    (preview.sanitizedCommandPreview ?? "").includes("Bearer ***MASKED***")
  );
  ok(
    "sanitized preview contains no raw secret-like token",
    !/Bearer\s+[A-Za-z0-9._-]{16,}/.test(preview.sanitizedCommandPreview ?? "")
  );
  ok("helper has no retry token", !/\bretry\b/i.test(helper));
}

{
  const clientErr = classifyCurlStatusCapture({
    curlExitCode: 3,
    reportedHttpCode: "400000",
  });
  ok("client error maps to non-http status", clientErr.http_status === "not_available_client_error");
  ok("client error keeps curl exit code", clientErr.curl_exit_code === 3);
  ok("client error dispatch no_or_unknown", clientErr.request_dispatched === "no_or_unknown");

  const okHttp = classifyCurlStatusCapture({
    curlExitCode: 0,
    reportedHttpCode: "200",
  });
  ok("http success keeps numeric status", okHttp.http_status === 200);
  ok("http success dispatch yes", okHttp.request_dispatched === "yes");
}

ok("package includes v12.6 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v12.6 validator",
  pkg.includes("scripts/test-v126-client-command-template-patch-no-gemini-execution.mts")
);

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

console.log(`\nDone v12.6 client command template patch validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);


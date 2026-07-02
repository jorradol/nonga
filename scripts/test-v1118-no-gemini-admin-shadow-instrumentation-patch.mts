/**
 * v11.18 No-Gemini Admin Shadow Instrumentation Patch static validator
 * No endpoint call, no Gemini execution.
 *
 * npm run test:v1118:no-gemini-admin-shadow-instrumentation-patch
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v11.18-no-gemini-admin-shadow-instrumentation-patch.md";
const SELF_PATH = "scripts/test-v1118-no-gemini-admin-shadow-instrumentation-patch.mts";
const PKG_PATH = "package.json";
const API_PATH = "src/services/ai/adminShadowSmokeApi.ts";
const SERVER_PATH = "src/services/ai/salesBrainServerShadowSmoke.ts";
const DIAG_PATH = "src/services/ai/salesBrainAdminShadowDiagnostics.ts";
const PROVIDER_PATH = "src/services/ai/salesBrainAdminShadowRealProvider.ts";
const SCRIPT_KEY = "test:v1118:no-gemini-admin-shadow-instrumentation-patch";

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

console.log("=== v11.18 No-Gemini Admin Shadow Instrumentation Patch Static Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");
const api = readFileSync(API_PATH, "utf8");
const server = readFileSync(SERVER_PATH, "utf8");
const diag = readFileSync(DIAG_PATH, "utf8");
const provider = readFileSync(PROVIDER_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1800, `${doc.length} chars`);
ok("doc has v11.18 label", /v11\.18/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["status patched no execution", /PATCHED\s*[—-]\s*no Gemini execution,\s*no retry/i],
  ["baseline commit exact", /be7400613a83383cd5a5f949e72fa507554ae993/i],
  ["v11.17 hold finding", /v11\.17 finding:\s*HOLD/i],
  ["manual caller timeout risk", /manual caller had no independent timeout/i],
  ["lifecycle completion risk", /did not prove full request lifecycle completion/i],
  ["diagnostic boundary clarity", /caller\/server boundary clarity/i],
  ["no retry", /\bno retry\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no api gemini wildcard", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing ai", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["no pii customer data", /\bno PII\/customer data\b/i],
  ["no secret token api key exposure", /no secret\/token\/API key exposure/i],
  ["no automatic retry", /\bno automatic retry\b/i],
  ["no public behavior change", /\bno public behavior change\b/i],
  ["not prove real gemini success", /does not prove real Gemini success/i],
  ["not prove provider response completion", /does not prove provider response completion/i],
  ["not prove transport socket cleanup", /does not prove transport\/socket cleanup of Gemini SDK/i],
  ["not authorize retry", /does not authorize retry/i],
  ["recommendation present", /READY FOR STATIC REVIEW \/ OWNER DECISION/i],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

const REQUIRED_STAGES = [
  "admin_shadow_request_handler_start",
  "admin_shadow_request_handler_return",
  "admin_shadow_manual_caller_start",
  "admin_shadow_manual_caller_timeout",
  "admin_shadow_manual_caller_completed",
  "admin_shadow_manual_caller_aborted",
] as const;

for (const stage of REQUIRED_STAGES) {
  ok(`stage in doc: ${stage}`, doc.includes(stage));
  ok(`stage in source: ${stage}`, `${api}\n${server}\n${diag}`.includes(stage));
}

ok("manual caller has timeout boundary config", /timeoutMs/.test(api));
ok("manual caller uses AbortController", /new AbortController\(/.test(api));
ok("provider path uses AbortController", /new AbortController\(/.test(provider));
ok("provider caller receives signal", /signal:\s*AbortSignal/.test(provider));
ok("provider invocation propagates signal", /signal:\s*timeoutController\.signal/.test(provider));

const adminPathCode = `${api}\n${provider}\n${server}\n${diag}`;
ok("admin path has no automatic retry keyword", !/\bretry\b/i.test(adminPathCode));
ok("admin path has no looped retry pattern", !/for\s*\(.*attempt|while\s*\(.*attempt/i.test(adminPathCode));

const disallowedExecutionPhrases = [
  /\bGemini executed\b/i,
  /\bretry succeeded\b/i,
];
for (const re of disallowedExecutionPhrases) {
  ok(`doc excludes execution phrase: ${re.source}`, !re.test(doc));
}

const head = self.split("const disallowedExecutionPhrases")[0] ?? self;
ok("validator uses readFileSync", /readFileSync/.test(head));
ok("validator does not use child_process", !/node:child_process/.test(head));
ok("validator does not call fetch", !/\bfetch\s*\(/.test(head));
ok("validator has no endpoint literal", !/\/api\/admin\/sales-brain-shadow-smoke/.test(head));

ok("package includes v11.18 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v11.18 validator script",
  pkg.includes("scripts/test-v1118-no-gemini-admin-shadow-instrumentation-patch.mts")
);

console.log(`\nDone v11.18 instrumentation patch validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

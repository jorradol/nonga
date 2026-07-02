/**
 * v13.6 controlled staging Gemini shadow runtime config setup record validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v136:controlled-staging-gemini-shadow-runtime-config-setup-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.6-controlled-staging-gemini-shadow-runtime-config-setup-record.md";
const SELF_PATH =
  "scripts/test-v136-controlled-staging-gemini-shadow-runtime-config-setup-record.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v136:controlled-staging-gemini-shadow-runtime-config-setup-record";

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

console.log("=== v13.6 Controlled Staging Runtime Config Setup Record Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3200, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.6 Controlled Staging Gemini Shadow Runtime Config Setup Record/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  [
    "v13.6 Controlled Staging Gemini Shadow Runtime Config Setup Record",
    /v13\.6 Controlled Staging Gemini Shadow Runtime Config Setup Record/i,
  ],
  ["Staging Runtime Config Setup", /\bStaging Runtime Config Setup\b/i],
  ["GEMINI_API_KEY", /\bGEMINI_API_KEY\b/],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["NONGA_AI_PROVIDER", /\bNONGA_AI_PROVIDER\b/],
  ["NONGA_AI_MODE", /\bNONGA_AI_MODE\b/],
  ["NONGA_AI_FIRST_ENABLED=false", /NONGA_AI_FIRST_ENABLED=false/i],
  ["NONGA_AI_SHADOW_MODE_ENABLED=true", /NONGA_AI_SHADOW_MODE_ENABLED=true/i],
  [
    "NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED=true",
    /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED=true/i,
  ],
  [
    "NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED=true",
    /NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED=true/i,
  ],
  [
    "NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID=SS-01",
    /NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID=SS-01/i,
  ],
  ["secret value exposed: no", /secret value exposed:\s*no/i],
  ["Gemini execution: no", /Gemini execution:\s*no/i],
  ["smoke endpoint call: no", /smoke endpoint call:\s*no/i],
  [
    "POST /api/admin/sales-brain-shadow-smoke called: no",
    /POST \/api\/admin\/sales-brain-shadow-smoke called:\s*no/i,
  ],
  ["/api/gemini/* called: no", /\/api\/gemini\/\*`?\s*called:\s*no/i],
  ["buyer-facing AI enabled: no", /buyer-facing AI enabled:\s*no/i],
  ["public route activated: no", /public route activated:\s*no/i],
  ["production touched: no", /production touched:\s*no/i],
  ["real lead sent: no", /real lead sent:\s*no/i],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok(
  "recommendation is one allowed value",
  /READY FOR v13\.7 ONE-RUN ADMIN-ONLY REAL GEMINI PROOF APPROVAL|HOLD\s*[—-]\s*Gemini shadow runtime config setup incomplete|HOLD\s*[—-]\s*provider\/runtime secret source unavailable or unclear/i.test(
    doc
  )
);

ok("package includes v136 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v136 validator",
  pkg.includes("scripts/test-v136-controlled-staging-gemini-shadow-runtime-config-setup-record.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.6 runtime-config record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

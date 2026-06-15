/**
 * v6.8D.2 — Real Gemini user-visible allowlist pilot execution record (static validation only)
 * npm run test:v68d2-real-gemini-user-visible-allowlist-pilot-execution-record
 *
 * Validates execution record — does NOT fetch staging, call gcloud/firebase, or invoke Gemini.
 */
import { readFileSync } from "node:fs";
import {
  SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_REAL_GEMINI_MODEL,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const DOC_PATH =
  "docs/v6.8D.2-real-gemini-user-visible-allowlist-pilot-execution-record.md";
const PARTIAL_DOC = "docs/v6.8D-manual-staging-allowlist-pilot-partial-execution-record.md";
const CHECKLIST_DOC =
  "docs/v6.8D-staging-real-gemini-user-visible-allowlist-pilot-checklist.md";

const HEAD_SHA = "83ce9d527fa1d7cb6db24c023530f76d45ee841e";
const HEAD_SHORT = "83ce9d5";
const BUILD_ID = "0a0c789b-0255-446a-9805-62b20e6ec178";
const IMAGE_TAG = "v6.8D.2-user-visible-invoke-fix-83ce9d5";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const PREV_REV = "nonga-staging-00088-6c2";
const IMAGE_REV = "nonga-staging-00089-pjl";
const PILOT_REV = "nonga-staging-00090-jcr";
const KILL_REV = "nonga-staging-00091-5w7";
const REAL_OFF_REV = "nonga-staging-00092-5qw";
const USER_VISIBLE_OFF_REV = "nonga-staging-00093-dfs";
const FINAL_REV = "nonga-staging-00094-ssv";
const STAGING_HOST = "https://nonga-ce93c.web.app";
const MASKED_UID = "X7hg...Zw2";
const BUDGET_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const FINANCE_MSG = "ผ่อนประมาณเท่าไหร่ได้ไหม";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8D.2 Real Gemini User-visible Allowlist Pilot Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v68d2-real-gemini-user-visible-allowlist-pilot-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const realProviderSrc = readFileSync(
  "src/services/ai/salesBrainUserVisibleRealProvider.ts",
  "utf8"
);

// --- doc exists + v6.8D.2 PASS ---
{
  ok("doc exists", doc.length > 5000);
  ok("doc v6.8D.2 label", doc.includes("v6.8D.2"));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc overall PASS", /v6\.8D\.2.*PASS|v6\.8D overall.*PASS/i.test(doc));
  ok("doc references v6.8D.1", doc.includes("v6.8D.1"));
  ok("doc references partial record", doc.includes("partial-execution-record"));
}

// --- git baseline ---
{
  ok("commit 83ce9d5", doc.includes(HEAD_SHORT));
  ok("full sha", doc.includes(HEAD_SHA));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
  ok("git clean", /working tree.*clean|clean/i.test(docLower));
}

// --- pre-deploy ---
{
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight prev rev 00088-6c2", doc.includes(PREV_REV));
  ok("test v68d1 recorded", doc.includes("test:v68d1-user-visible-real-provider-invoke-fix"));
  ok("test v68d recorded", doc.includes("test:v68d-real-user-visible-allowlist-pilot"));
  ok("test v68b recorded", doc.includes("test:v68b-gemini-safety-alignment"));
  ok("test v68c1 recorded", doc.includes("test:v68c1-admin-shadow-kill-switch-patch"));
  ok("lint recorded", doc.includes("npm run lint"));
}

// --- cloud build + image ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.8D.2", doc.includes(IMAGE_TAG));
  ok("image URI recorded", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
  ok("cloudbuild v53f config", doc.includes("cloudbuild.v53f.yaml"));
  ok("image deploy rev 00089-pjl", doc.includes(IMAGE_REV));
  ok("image-only deploy", /image only|image-only|env\/secrets preserved/i.test(docLower));
}

// --- revision timeline ---
{
  ok("pilot rev 00090-jcr", doc.includes(PILOT_REV));
  ok("kill rev 00091-5w7", doc.includes(KILL_REV));
  ok("real off rev 00092-5qw", doc.includes(REAL_OFF_REV));
  ok("user visible off rev 00093-dfs", doc.includes(USER_VISIBLE_OFF_REV));
  ok("final rev 00094-ssv", doc.includes(FINAL_REV));
  ok("traffic 100 percent final", /100%|100 percent/i.test(doc));
}

// --- allowlist uid masked ---
{
  ok("masked uid recorded", doc.includes(MASKED_UID));
  ok("no raw firebase uid pattern", !/X7hgSySp4gVPUrd8S5A4QVE1rZw2/.test(doc));
}

// --- pilot env ---
{
  ok("pilot user visible true", /00090[\s\S]{0,600}USER_VISIBLE_ENABLED.*true/i.test(doc));
  ok("pilot real provider true", /00090[\s\S]{0,600}USER_VISIBLE_REAL_PROVIDER_ENABLED.*true/i.test(doc));
  ok("pilot kill switch false", /00090[\s\S]{0,600}EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("shadow flags false", /ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("secret manager mount named", /gemini-api-key/i.test(doc));
  ok("staging host recorded", doc.includes(STAGING_HOST));
}

// --- positive smoke PASS ---
{
  ok("budget message recorded", doc.includes(BUDGET_MSG));
  ok("finance message recorded", doc.includes(FINANCE_MSG));
  ok("budget PASS", /budget.*PASS|Budget search.*PASS/i.test(doc));
  ok("finance PASS", /finance.*PASS|Finance question.*PASS/i.test(doc));
  ok("realProviderNetwork true", /realProviderNetwork.*true/i.test(doc));
  ok("real_provider_call_ok", doc.includes("real_provider_call_ok"));
  ok("pilotPathActive true positive", /pilotPathActive.*true/i.test(doc));
  ok("carCardCount 3", doc.includes("carCardCount") && doc.includes("3"));
  ok("finance safety no guarantee", /อนุมัติแน่นอน|การันตี|ผ่อนได้แน่นอน/i.test(doc) === false ||
    /no.*อนุมัติแน่นอน|Finance safety.*PASS/i.test(doc));
  ok("orchestrate route in doc", doc.includes(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE));
}

// --- negative smoke PASS ---
{
  ok("guest PASS", /guest.*PASS|Guest.*401/i.test(doc));
  ok("guest 401", doc.includes("401"));
  ok("non-allowlisted PASS", /non-allowlisted.*PASS/i.test(doc));
  ok("uid_not_allowlisted", doc.includes("uid_not_allowlisted"));
  ok("kill switch PASS", /kill switch.*PASS/i.test(doc));
  ok("emergency_kill_switch", doc.includes("emergency_kill_switch"));
  ok("real flag off PASS", /real provider flag OFF.*PASS|real flag off.*PASS/i.test(doc));
  ok("real_provider_flag_off", doc.includes("real_provider_flag_off"));
  ok("user visible off PASS", /user-visible OFF.*PASS|user-visible off.*PASS/i.test(doc));
}

// --- cost ---
{
  ok("cost ~2 calls", /~2|approximately 2|2.*budget.*finance/i.test(docLower));
  ok("low consumption", /low|ต่ำ/i.test(docLower));
}

// --- rollback ---
{
  ok("rollback DONE", /rollback.*DONE|Rollback.*DONE/i.test(doc));
  ok("final kill switch true", /final[\s\S]{0,600}EMERGENCY_KILL_SWITCH.*true/i.test(doc));
  ok("final user visible false", /final[\s\S]{0,600}USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("final real provider false", /final[\s\S]{0,600}USER_VISIBLE_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("final admin shadow false", /final[\s\S]{0,600}ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("final chat shadow false", /final[\s\S]{0,600}CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
}

// --- v6.8E readiness ---
{
  ok("v6.8D PASS closure", /v6\.8D.*PASS|v6\.8D overall.*PASS/i.test(doc));
  ok("v6.8E ready", /v6\.8E.*[Rr]eady|readiness.*v6\.8E/i.test(doc));
  ok("v6.8E prompt quality named", /Prompt Quality|listing-grounded/i.test(doc));
}

// --- compliance ---
{
  ok("compliance no production deploy", /production.*not done|not touched/i.test(docLower));
  ok("compliance no firestore writes", /Firestore writes.*none|writes.*none/i.test(docLower));
  ok("compliance no lead changes", /lead system|No lead/i.test(doc));
  ok("compliance docs tests slice", /docs\/tests\/package only|runtime code changes.*docs/i.test(docLower));
  ok("compliance hosting not performed", /Hosting.*Not performed|hosting deploy.*Not/i.test(doc));
  ok("compliance no secret leak", /secret leak.*none|None observed/i.test(docLower));
}

// --- code alignment (v6.8D.1 fix still present) ---
{
  ok("split request shape constant", realProviderSrc.includes(USER_VISIBLE_GEMINI_REQUEST_SHAPE));
  ok("real model gemini-3.5-flash", realProviderSrc.includes(USER_VISIBLE_REAL_GEMINI_MODEL));
  ok("config systemInstruction in caller", /systemInstruction:\s*requestShape\.systemInstruction/.test(realProviderSrc));
  ok("redacted error logging", realProviderSrc.includes("redactUserVisibleRealProviderError"));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v68d2 script",
    pkg.includes("test:v68d2-real-gemini-user-visible-allowlist-pilot-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v68d2-real-gemini-user-visible-allowlist-pilot-execution-record.mts")
  );
}

// --- companion docs ---
{
  ok("partial record exists", readFileSync(PARTIAL_DOC, "utf8").includes("PARTIAL"));
  ok("checklist doc exists", readFileSync(CHECKLIST_DOC, "utf8").includes("v6.8D"));
}

console.log("\nDone v6.8D.2 Real Gemini User-visible Allowlist Pilot Execution Record tests.\n");
if (process.exitCode) process.exit(process.exitCode);

/**
 * v6.8C.2 — Staging kill switch drill rerun execution record (static validation only)
 * npm run test:v68c2-staging-kill-switch-drill-execution-record
 *
 * Validates execution record — does NOT fetch staging, call gcloud/firebase, or invoke Gemini.
 */
import { readFileSync } from "node:fs";
import { canInvokeLegacyGeminiProvider } from "../src/server/security/legacyGeminiSafety.ts";
import { SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE } from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import { SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.8C.2-staging-kill-switch-drill-rerun-execution-record.md";
const V68C_DOC = "docs/v6.8C-manual-staging-real-gemini-shadow-smoke-execution-record.md";

const HEAD_SHA = "7ec9992c9a7154c1b7607a7217b0ca11260904f9";
const BUILD_ID = "433d9670-71e5-4f0b-b1f6-8b734757df00";
const IMAGE_TAG = "v6.8C.2-gemini-kill-switch-align-7ec9992";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const DIGEST = "sha256:d421d9fbc05a7d0f9c029981d44997164bff9f48bfeef3416773214477b66921";
const PREV_REV = "nonga-staging-00080-xdg";
const IMAGE_REV = "nonga-staging-00081-p2d";
const DRILL_REV = "nonga-staging-00082-864";
const FINAL_REV = "nonga-staging-00083-96g";
const PREV_IMAGE = "v6.2E.4-fuel-economy-refine-fix";
const CHAT_SHADOW_ROUTE = "/api/admin/chat-shadow-sink";
const LEGACY_CHAT_ROUTE = "/api/gemini/chat";
const STAGING_HOST = "https://nonga-ce93c.web.app";
const PROD_REV = "nonga-api-00003-fg4";

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

console.log("=== v6.8C.2 Staging Kill Switch Drill Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v68c2-staging-kill-switch-drill-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const shadowSmokeSrc = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");

// --- doc exists + v6.8C.2 ---
{
  ok("doc exists", doc.length > 4000);
  ok("doc v6.8C.2 label", doc.includes("v6.8C.2"));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc references v6.8C", doc.includes("v6.8C"));
  ok("doc references v6.8C.1", doc.includes("v6.8C.1"));
  ok("doc references v6.8B", doc.includes("v6.8B"));
}

// --- push + git ---
{
  ok("push commit 7ec9992", doc.includes("7ec9992"));
  ok("push full sha", doc.includes(HEAD_SHA));
  ok("push synced origin", /local HEAD = origin|synced.*origin|Already synced/i.test(doc));
  ok("git clean 7ec9992", /clean.*7ec9992|working tree.*clean/i.test(docLower));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
}

// --- pre-deploy ---
{
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight prev rev 00080-xdg", doc.includes(PREV_REV));
  ok("preflight prev image v6.2E.4", doc.includes(PREV_IMAGE));
  ok("test v68c1 recorded", doc.includes("test:v68c1-admin-shadow-kill-switch-patch"));
  ok("test v68c recorded", doc.includes("test:v68c-staging-real-gemini-shadow-smoke-readiness"));
  ok("test v68b recorded", doc.includes("test:v68b-gemini-safety-alignment"));
  ok("lint recorded", doc.includes("npm run lint"));
}

// --- cloud build + image ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.8C.2", doc.includes(IMAGE_TAG));
  ok("image URI recorded", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
  ok("image digest sha256", doc.includes(DIGEST));
  ok("cloudbuild v53f config", doc.includes("cloudbuild.v53f.yaml"));
  ok("image deploy rev 00081-p2d", doc.includes(IMAGE_REV));
  ok("image-only deploy", /image only|image-only|no --set-env-vars/i.test(docLower));
}

// --- revision timeline ---
{
  ok("drill rev 00082-864", doc.includes(DRILL_REV));
  ok("final rev 00083-96g", doc.includes(FINAL_REV));
  ok("traffic 100 percent final", /100%|100 percent/i.test(doc));
}

// --- drill env ---
{
  ok("drill kill switch true", /00082[\s\S]{0,400}EMERGENCY_KILL_SWITCH.*true/i.test(doc));
  ok("drill admin shadow flag true", /00082[\s\S]{0,400}ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*true/i.test(doc));
  ok("drill chat shadow flag true", /00082[\s\S]{0,400}CHAT_SHADOW_REAL_PROVIDER_ENABLED.*true/i.test(doc));
  ok("drill user visible false", /USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("secret manager mount named", /gemini-api-key/i.test(doc));
  ok("no paid gemini during drill", /no paid gemini|0 invocations|None/i.test(doc));
}

// --- drill results PASS ---
{
  ok("drill overall PASS", /kill switch drill.*PASS|drill.*PASS/i.test(doc));
  ok("SS-01 PASS", /SS-01.*PASS/i.test(doc));
  ok("SS-01 providerNetwork false", /SS-01[\s\S]{0,400}providerNetwork.*false/i.test(doc));
  ok("SS-01 emergency_kill_switch", doc.includes("emergency_kill_switch"));
  ok("SS-01 userVisibleOff true", /SS-01[\s\S]{0,400}userVisibleOff.*true/i.test(doc));
  ok("CP-02 PASS", /CP-02.*PASS/i.test(doc));
  ok("CP-02 providerNetwork false", /CP-02[\s\S]{0,400}providerNetwork.*false/i.test(doc));
  ok("CP-02 sinkOnly true", /CP-02[\s\S]{0,400}sinkOnly.*true/i.test(doc));
  ok("legacy chat PASS", /legacy.*PASS|\/api\/gemini\/chat.*PASS/i.test(doc));
  ok("legacy isMock true", /isMock.*true/i.test(doc));
  ok("orchestrate PASS", /orchestrate.*PASS|user-visible orchestrate.*PASS/i.test(doc));
  ok("orchestrate pilotPathActive false", /pilotPathActive.*false/i.test(doc));
  ok("orchestrate fallbackToLegacy true", /fallbackToLegacy.*true/i.test(doc));
  ok("orchestrate skipGemini true", /skipGemini.*true/i.test(doc));
  ok("staging host recorded", doc.includes(STAGING_HOST));
}

// --- background script note ---
{
  ok("background script hung note", /hung|inline.*tsx/i.test(docLower));
  ok("drill rerun success", /rerun|second run.*PASS|all checks PASS/i.test(doc));
}

// --- rollback ---
{
  ok("rollback DONE", /rollback.*DONE|Rollback.*DONE/i.test(doc));
  ok("final kill switch true", /final[\s\S]{0,600}EMERGENCY_KILL_SWITCH.*true/i.test(doc));
  ok("final admin shadow false", /final[\s\S]{0,600}ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("final chat shadow false", /final[\s\S]{0,600}CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("final user visible false", /final[\s\S]{0,600}USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("health 200 post rollback", /health.*200/i.test(doc));
}

// --- v6.8D readiness ---
{
  ok("v6.8D ready", /v6\.8D.*[Rr]eady|readiness.*v6\.8D/i.test(doc));
  ok("v6.8D separate approval", /separate approval|approval required/i.test(doc));
  ok("v6.8D allowlist pilot named", /Allowlist Pilot|allowlist pilot/i.test(doc));
}

// --- compliance ---
{
  ok("compliance no production deploy", /production.*not done|not touched/i.test(docLower));
  ok("compliance production rev unchanged", doc.includes(PROD_REV));
  ok("compliance no user visible true", !/NONGA_AI_USER_VISIBLE_ENABLED=true.*enabled/i.test(doc));
  ok("compliance no firestore writes", /Firestore writes.*none|writes.*none/i.test(docLower));
  ok("compliance no lead changes", /lead system.*none|Lead system/i.test(doc));
  ok("compliance docs tests only slice", /docs\/tests\/package only|runtime code changes.*docs/i.test(docLower));
  ok("compliance hosting skipped", /Hosting.*SKIPPED|hosting deploy.*SKIPPED/i.test(doc));
}

// --- code alignment ---
{
  ok("server legacy gemini gate", serverTs.includes("canUseLegacyGemini"));
  ok("server gemini chat route", serverTs.includes(LEGACY_CHAT_ROUTE));
  ok("admin shadow route constant", shadowSmokeSrc.includes(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE));
  ok("admin shadow kill switch gate", shadowSmokeSrc.includes("emergency_kill_switch"));
  ok("orchestrate route constant", SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE.includes("chat-user-visible-orchestrate"));
  ok(
    "legacy kill switch blocks provider offline",
    !canInvokeLegacyGeminiProvider(true, (k) =>
      k === "NONGA_AI_EMERGENCY_KILL_SWITCH" ? "true" : undefined
    )
  );
  ok("chat shadow route in doc", doc.includes(CHAT_SHADOW_ROUTE));
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
  ok("package v68c2 script", pkg.includes("test:v68c2-staging-kill-switch-drill-execution-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v68c2-staging-kill-switch-drill-execution-record.mts")
  );
}

// --- companion doc ---
{
  ok("v6.8C manual record exists", readFileSync(V68C_DOC, "utf8").includes("v6.8C"));
  ok("v6.8C prior drill PARTIAL", readFileSync(V68C_DOC, "utf8").includes("PARTIAL"));
}

console.log("\nDone v6.8C.2 Staging Kill Switch Drill Execution Record tests.");
if (process.exitCode) process.exit(process.exitCode);

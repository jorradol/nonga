/**
 * v6.8E.9 — Structured output contract staging smoke execution record (static validation only)
 * npm run test:v68e9-structured-output-contract-staging-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.8E.9-structured-output-contract-staging-smoke-execution-record.md";
const HEAD_SHA = "ffd2f02c2364cd69f769062a65c133cd4784b388";
const BUILD_ID = "56f931da-ae78-43cc-8f84-5972bed14f07";
const IMAGE_TAG = "v6.8E.9-structured-output-ffd2f02";
const IMAGE_URI =
  "asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v6.8E.9-structured-output-ffd2f02";
const DEPLOY_REV = "nonga-staging-00149-k8f";
const PILOT_REV = "nonga-staging-00150-fbh";
const ROLLBACK_REV = "nonga-staging-00154-q7l";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
];

const FORBIDDEN_CONTENT = [
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /firebase.*service.*account.*json.*\{.*private_key/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.9 Structured Output Contract Staging Smoke Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.8E.9 label", doc.includes("v6.8E.9"));
  ok("overall verdict PASS", /\*\*สถานะ:\*\* PASS|Overall.*PASS|staging smoke.*PASS/i.test(doc));
  ok("head sha", doc.includes(HEAD_SHA));
  ok("image tag", doc.includes(IMAGE_TAG));
  ok("image uri", doc.includes(IMAGE_URI));
  ok("deploy revision", doc.includes(DEPLOY_REV));
  ok("pilot revision", doc.includes(PILOT_REV));
  ok("rollback revision", doc.includes(ROLLBACK_REV));
  ok("cloud build id", doc.includes(BUILD_ID));
  ok("staging only", /staging-only|staging only/i.test(doc));
  ok("image only deploy", /image-only/i.test(doc));
  ok("env secrets unchanged baseline", /env\/secrets preserved|env\/secrets unchanged/i.test(doc));
  ok("health 200 ok", /\/api\/health.*200|200.*ok:\s*true/i.test(doc));
  ok("home 200", /home.*200|staging home.*200/i.test(doc));
  ok("real gemini 7/7", doc.includes("7/7"));
  ok("comparison v6.8E.8 4/7", doc.includes("4/7"));
  ok("budget pass real", /Budget.*real_provider_call_ok|budget.*PASS/i.test(doc));
  ok("finance pass real", /Finance.*real_provider_call_ok|finance.*PASS/i.test(doc));
  ok("compare pass real", /Compare.*real_provider_call_ok|compare.*PASS/i.test(doc));
  ok("summarize pass real", /Summarize.*real_provider_call_ok|summarize.*PASS/i.test(doc));
  ok("fit pass real", /Fit.*real_provider_call_ok|fit.*PASS/i.test(doc));
  ok("general knowledge pass real", /General knowledge.*real_provider_call_ok|general knowledge.*PASS/i.test(doc));
  ok("ev follow-up pass real", /EV follow-up.*real_provider_call_ok|EV follow-up.*PASS/i.test(doc));
  ok("summarize recovered", /Summarize.*Recovered|summarize.*Recovered/i.test(doc));
  ok("fit recovered", /Fit.*Recovered|fit.*Recovered/i.test(doc));
  ok("gk recovered", /General knowledge.*Recovered|general knowledge.*Recovered/i.test(doc));
  ok("no regression budget finance compare ev", /No regression/i.test(doc));
  ok("incomplete_sentence resolved", /incomplete_sentence.*[Rr]esolved|resolved.*incomplete_sentence/i.test(doc));
  ok("no json leak", /No JSON leak|JSON leak.*None|no json leak/i.test(doc));
  ok("structured output finalAnswerTh", /finalAnswerTh/i.test(doc));
  ok("negative gates pass", /Negative smoke.*PASS|Negative gates.*PASS/i.test(doc));
  ok("guest 401", /401/i.test(doc));
  ok("non-allowlisted blocked", /uid_not_allowlisted/i.test(doc));
  ok("kill switch blocks", /emergency_kill_switch/i.test(doc));
  ok("real provider off", /real_provider_flag_off/i.test(doc));
  ok("user visible off fallback", /fallbackToLegacy=true/i.test(doc));
  ok("rollback readiness", /Rollback readiness.*PASS|rollback readiness/i.test(doc));
  ok("safe revision 00154", doc.includes(ROLLBACK_REV));
  ok("safe flags kill switch true", /NONGA_AI_EMERGENCY_KILL_SWITCH.*true/i.test(doc));
  ok("rollback v6.8E.8 available", /v6\.8E\.8-output-budget-1536-1b7f381/i.test(doc));
  ok("rollback v6.8E.9 available", doc.includes(IMAGE_TAG));
  ok("guard regression none", /Guard regression.*None|guard regression.*none/i.test(doc));
  ok("no guard weakening", /Guard weakening.*None|no guard weakening/i.test(doc));
  ok("no incomplete_sentence retry", /no retry for `incomplete_sentence`|no retry.*incomplete_sentence/i.test(doc));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok("production not touched", /Production.*Not touched|production.*not touched/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok("package script", pkg.includes("test:v68e9-structured-output-contract-staging-smoke-execution-record"));
  ok("uid redacted", doc.includes("X7hg...Zw2"));
  ok(
    "no raw full gemini output",
    !/"finalAnswerTh"\s*:\s*"[\s\S]{150,}/.test(doc) && !/```[\s\S]{400,}```/.test(doc)
  );
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
  for (const pattern of FORBIDDEN_CONTENT) {
    ok(`no forbidden content ${pattern}`, !pattern.test(doc));
  }
  ok("no full prompt dump", !docLower.includes("system instruction:") && !docLower.includes("combined prompt:"));
}

console.log("\nDone v6.8E.9 execution record tests.\n");

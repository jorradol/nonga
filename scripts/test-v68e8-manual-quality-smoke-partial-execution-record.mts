/**
 * v6.8E.8 — Staging smoke partial execution record (static validation only)
 * npm run test:v68e8-manual-quality-smoke-partial-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.8E.8-manual-quality-smoke-partial-execution-record.md";
const HEAD_SHA = "1b7f381229d33ec7db0b53e042476e3d8307dbfd";
const BUILD_ID = "03d58c2b-57bc-4956-b6f5-8892e9ef3d23";
const IMAGE_TAG = "v6.8E.8-output-budget-1536-1b7f381";
const DEPLOY_REV = "nonga-staging-00143-m8h";
const PILOT_REV = "nonga-staging-00144-vhf";
const ROLLBACK_REV = "nonga-staging-00148-9sz";

const SECRET_PATTERNS = [/AIza[Sy][a-zA-Z0-9_-]{20,}/, /Bearer\s+[A-Za-z0-9._-]{20,}/i];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.8 Staging Smoke Partial Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.8E.8 label", doc.includes("v6.8E.8"));
  ok("partial status", /PARTIAL/i.test(doc));
  ok("head sha", doc.includes(HEAD_SHA));
  ok("image tag", doc.includes(IMAGE_TAG));
  ok("deploy revision", doc.includes(DEPLOY_REV));
  ok("pilot revision", doc.includes(PILOT_REV));
  ok("rollback revision", doc.includes(ROLLBACK_REV));
  ok("cloud build id", doc.includes(BUILD_ID));
  ok("finance fallback pass", /finance.*PASS|Finance.*PASS/i.test(doc));
  ok("gk fallback pass", /general knowledge.*PASS|GK.*PASS/i.test(doc));
  ok("ev follow-up pass", /EV.*PASS/i.test(doc));
  ok("summarize fit fallback pass", /summarize.*PASS|Summarize.*PASS/i.test(doc) && /fit.*PASS|Fit.*PASS/i.test(doc));
  ok("no regression", /no regression/i.test(doc));
  ok("real gemini 4/7", doc.includes("4/7"));
  ok("real path budget finance compare ev", /Budget.*real_provider_call_ok|budget.*real_provider_call_ok/i.test(doc) || /real_provider_call_ok.*Budget/i.test(doc));
  ok("max output tokens 1536", doc.includes("1536"));
  ok("thinking minimal retained", /thinkingLevel.*MINIMAL|MINIMAL.*retained/i.test(doc));
  ok("quality slice v6.8E.8", doc.includes("v6.8E.8"));
  ok("thoughts absent", /thoughtsTokenCount.*absent|absent from logs/i.test(doc));
  ok("gk fixed max tokens to stop", /MAX_TOKENS.*764|764.*MAX_TOKENS/i.test(doc) && /STOP.*470|470.*STOP/i.test(doc));
  ok("incomplete sentence blocker", doc.includes("incomplete_sentence"));
  ok("output length 1193", doc.includes("1193"));
  ok("negative gates pass", /Negative smoke.*PASS|Negative gates.*PASS/i.test(doc));
  ok("phase c recommendation", /Phase C|finalAnswerTh|structured output/i.test(doc));
  ok("do not patch runtime", /do not patch runtime/i.test(doc));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok("production not touched", /Production.*Not touched|production.*not touched/i.test(doc));
  ok("package script", pkg.includes("test:v68e8-manual-quality-smoke-partial-execution-record"));
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log("\nDone v6.8E.8 execution record tests.\n");

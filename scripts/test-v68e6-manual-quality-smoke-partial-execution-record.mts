/**
 * v6.8E.6 — Manual quality smoke partial execution record (static validation only)
 * npm run test:v68e6-manual-quality-smoke-partial-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.8E.6-manual-quality-smoke-partial-execution-record.md";
const HEAD_SHA = "dff54eef6c58c79d2adf02961519f6f18d071f67";
const BUILD_ID = "681d12b5-5b18-476d-b007-9403093bdb7d";
const IMAGE_TAG = "v6.8E.6-system-instruction-dff54ee";
const DEPLOY_REV = "nonga-staging-00131-h8t";
const PILOT_REV = "nonga-staging-00132-psq";
const ROLLBACK_REV = "nonga-staging-00136-dkg";

const SECRET_PATTERNS = [/AIza[Sy][a-zA-Z0-9_-]{20,}/, /Bearer\s+[A-Za-z0-9._-]{20,}/i];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.6 Manual Quality Smoke Partial Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.8E.6 label", doc.includes("v6.8E.6"));
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
  ok("no regression", /no regression/i.test(doc));
  ok("real gemini 0/7", doc.includes("0/7"));
  ok("unsafe reasons", /missing_final_answer_marker/.test(doc) && /too_short/.test(doc));
  ok("diagnostics max tokens", /MAX_TOKENS/i.test(doc));
  ok("diagnostics thoughts tokens", /733|734|735|736|733–736/.test(doc));
  ok("diagnostics output tokens", /28|29|30|31|28–31/.test(doc));
  ok("negative gates pass", /Negative smoke.*PASS|Negative gates.*PASS/i.test(doc));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok("next v6.8E.7", /v6\.8E\.7|thinking.*budget|output budget/i.test(doc));
  ok("package script", pkg.includes("test:v68e6-manual-quality-smoke-partial-execution-record"));
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log("\nDone v6.8E.6 execution record tests.\n");

/**
 * v6.8E.5 — Manual quality smoke partial execution record (static validation only)
 * npm run test:v68e5-manual-quality-smoke-partial-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.8E.5-manual-quality-smoke-partial-execution-record.md";
const HEAD_SHA = "4deb2f9c700d587ed4103722a19233bda090a56f";
const BUILD_ID = "ef54e621-904a-46dc-a54e-1d56087169d8";
const IMAGE_TAG = "v6.8E.5-fallback-routing-ev-4deb2f9";
const DEPLOY_REV = "nonga-staging-00125-l6w";
const ROLLBACK_REV = "nonga-staging-00130-2gt";

const SECRET_PATTERNS = [/AIza[Sy][a-zA-Z0-9_-]{20,}/, /Bearer\s+[A-Za-z0-9._-]{20,}/i];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.5 Manual Quality Smoke Partial Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.8E.5 label", doc.includes("v6.8E.5"));
  ok("partial status", /PARTIAL/i.test(doc));
  ok("head sha", doc.includes(HEAD_SHA));
  ok("image tag", doc.includes(IMAGE_TAG));
  ok("deploy revision", doc.includes(DEPLOY_REV));
  ok("rollback revision", doc.includes(ROLLBACK_REV));
  ok("cloud build id", doc.includes(BUILD_ID));
  ok("finance fallback pass", /finance.*PASS|Finance fallback.*PASS/i.test(doc));
  ok("gk fallback pass", /general knowledge.*PASS|General knowledge.*PASS/i.test(doc));
  ok("ev follow-up pass", /EV follow-up.*PASS|EV.*PASS/i.test(doc));
  ok("real gemini 0/7", doc.includes("0/7"));
  ok("unsafe reasons", /missing_final_answer_marker/.test(doc) && /too_short/.test(doc));
  ok("negative gates pass", /Negative smoke.*PASS|Negative gates.*PASS/i.test(doc));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok("next v6.8E.6 or alternative", /v6\.8E\.6|real Gemini output strategy/i.test(doc));
  ok("package script", pkg.includes("test:v68e5-manual-quality-smoke-partial-execution-record"));
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log("\nDone v6.8E.5 execution record tests.\n");

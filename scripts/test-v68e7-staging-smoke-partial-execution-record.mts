/**
 * v6.8E.7 — Staging smoke partial execution record (static validation only)
 * npm run test:v68e7-staging-smoke-partial-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.8E.7-staging-smoke-partial-execution-record.md";
const HEAD_SHA = "6737cfdb0f540bec72a8045c51c693315b9df10a";
const BUILD_ID = "53815edb-c25d-4d8a-b588-20535f7c58e1";
const IMAGE_TAG = "v6.8E.7-thinking-minimal-6737cfd";
const DEPLOY_REV = "nonga-staging-00137-cvl";
const PILOT_REV = "nonga-staging-00138-74p";
const ROLLBACK_REV = "nonga-staging-00142-5g9";

const SECRET_PATTERNS = [/AIza[Sy][a-zA-Z0-9_-]{20,}/, /Bearer\s+[A-Za-z0-9._-]{20,}/i];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.7 Staging Smoke Partial Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.8E.7 label", doc.includes("v6.8E.7"));
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
  ok("thinking fix effective", /thinking budget fix.*effective|Thinking budget fix.*effective/i.test(doc));
  ok("thoughts absent from logs", /absent from logs|absent/i.test(doc) && /733|734|735|736|733–736/.test(doc));
  ok("output tokens increased", /453|614|562|563|639|764|453–764/.test(doc));
  ok("finish reason stop 6/7", /STOP.*6\/7|6\/7.*STOP/i.test(doc));
  ok("gk still max tokens", /general knowledge.*MAX_TOKENS|General knowledge.*MAX_TOKENS/i.test(doc));
  ok("incomplete sentence blocker", doc.includes("incomplete_sentence"));
  ok("negative gates pass", /Negative smoke.*PASS|Negative gates.*PASS/i.test(doc));
  ok("phase b recommendation", /maxOutputTokens.*1536|1536/.test(doc) && /MINIMAL/i.test(doc));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok("package script", pkg.includes("test:v68e7-staging-smoke-partial-execution-record"));
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log("\nDone v6.8E.7 execution record tests.\n");

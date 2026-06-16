/**
 * v6.9A Phase 1.5 — Dark variant alignment staging visual smoke execution record
 * (static validation only)
 * npm run test:v69a-phase15-dark-variant-alignment-staging-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9A-phase15-dark-variant-alignment-staging-smoke-execution-record.md";
const HEAD_SHA = "c43bc4244c265057e1d3e1c018072b4098dfe568";
const SHORT_HASH = "c43bc42";
const LIVE_CSS = "index-ButDouqC.css";
const LIVE_JS = "index-Ddq10mfa.js";
const OLD_CSS = "index-8qfUkJSm.css";
const OLD_JS = "index-B4N4UwpO.js";
const CLOUD_RUN_REV = "nonga-staging-00154-q7l";
const STAGING_URL = "https://nonga-ce93c.web.app";
const STAGING_PROJECT = "nonga-ce93c";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.9A Phase 1.5 Dark Variant Alignment Staging Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9A Phase 1.5 label", /v6\.9A Phase 1\.5/i.test(doc));
  ok("overall verdict PASS", /\*\*สถานะ:\*\*.*PASS|Overall.*PASS/i.test(doc));
  ok("visual smoke 4/4 PASS", doc.includes("4/4 PASS"));
  ok("critical app light os dark PASS", /App light \+ OS dark.*PASS/i.test(doc));
  ok("head sha", doc.includes(HEAD_SHA));
  ok("short hash", doc.includes(SHORT_HASH));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
  ok("commit message align dark variant", doc.includes("align dark variant with app theme toggle"));
  ok("staging url", doc.includes(STAGING_URL));
  ok("staging project", doc.includes(STAGING_PROJECT));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("browser loaded new css", /browser loaded new css|Browser loaded new CSS/i.test(doc));
  ok("browser loaded new js", /browser loaded new js|Browser loaded new JS/i.test(doc));
  ok("old assets not loaded", /Old assets loaded.*NO|old assets.*not loaded/i.test(doc));
  ok("old css hash referenced as stale", doc.includes(OLD_CSS));
  ok("old js hash referenced as stale", doc.includes(OLD_JS));
  ok(
    "stale cache invalidated prior s2 fail",
    /Prior S2 FAIL.*Invalid|stale browser session/i.test(doc)
  );
  ok("no redeploy during rerun", /Redeploy during visual smoke rerun.*NO|no redeploy/i.test(doc));
  ok("no code change during rerun", /Code change during visual smoke rerun.*NO|no code change during/i.test(doc));
  ok("s1 app light os light pass", /S1.*PASS|App light \+ OS light.*PASS/i.test(doc));
  ok("s2 app light os dark pass", /S2.*PASS|App light \+ OS dark.*PASS/i.test(doc));
  ok("s3 app dark os light pass", /S3.*PASS|App dark \+ OS light.*PASS/i.test(doc));
  ok("s4 app dark os dark pass", /S4.*PASS|App dark \+ OS dark.*PASS/i.test(doc));
  ok("dark text white not on light shell", /dark:text-white.*NO|darkWhiteAppliesWhenLight=false/i.test(doc));
  ok("footer brand not white on white", /Footer brand white-on-white.*NO|white-on-white.*NO/i.test(doc));
  ok("drawer brand not white on white", /drawer brand white-on-white.*NO|Mobile drawer brand white-on-white.*NO/i.test(doc));
  ok("dark class controls variant", /\.dark.*controls|class-only.*dark variant/i.test(doc));
  ok(
    "os preference no longer overrides app light",
    /OS.*prefers-color-scheme.*NO|OS preference.*no longer overrides/i.test(doc)
  );
  ok("dark mode regression none", /Dark mode regression.*None|regression observed.*None/i.test(doc));
  ok("toggle light dark works", /Toggle light.*dark.*Works|toggle light/i.test(doc));
  ok("home route pass", /\/home.*PASS|`\/home`/i.test(doc));
  ok("chat route pass", /\/chat.*PASS|`\/chat`/i.test(doc));
  ok("onboarding blocked pre-existing", /\/onboarding.*BLOCKED|Pre-existing.*onboarding/i.test(doc));
  ok(
    "viral-captions blocked pre-existing",
    /\/viral-captions.*BLOCKED|viral-captions.*Pre-existing/i.test(doc)
  );
  ok("trust panel backlog", /trust panel.*2\.47|Trust panel contrast/i.test(doc));
  ok("routing backlog", /routing.*onboarding|\/onboarding.*routing/i.test(doc));
  ok("broader contrast sweep backlog", /Broader light-mode contrast|dealer dashboard cluster/i.test(doc));
  ok("production pilot gates pending", /pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc));
  ok("cloud run unchanged", doc.includes(CLOUD_RUN_REV));
  ok("cloud run deploy no", /Cloud Run deploy.*NO|Cloud Run.*Unchanged/i.test(doc));
  ok("hosting only deploy", /Hosting only|hosting-only|Firebase Hosting only/i.test(doc));
  ok("production not touched", /Production.*Not touched|production.*not touched/i.test(doc));
  ok("ai runtime not touched", /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc));
  ok("guard fallback not touched", /Guard.*Not touched|fallback logic.*Not touched/i.test(doc));
  ok("env secrets not touched", /env.*secrets.*Not touched|Deploy config.*Not touched/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok("leads not touched", /Lead system.*Not touched|DealerLeads.*Not touched/i.test(doc));
  ok("payment not touched", /Payment.*Not touched|payment.*not touched/i.test(doc));
  ok("rollback hosting only", /Rollback scope.*Firebase Hosting|hosting-only rollback/i.test(doc));
  ok("cloud run no rollback needed", /Cloud Run.*no rollback needed|no rollback needed/i.test(doc));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok(
    "package script registered",
    pkg.includes(
      "test:v69a-phase15-dark-variant-alignment-staging-smoke-execution-record"
    )
  );
  ok(
    "no raw full gemini output",
    !/"finalAnswerTh"\s*:\s*"[\s\S]{150,}/.test(doc) &&
      !/```[\s\S]{400,}```/.test(doc)
  );
  ok(
    "no full prompt dump",
    !docLower.includes("system instruction:") &&
      !docLower.includes("combined prompt:")
  );
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
  for (const pattern of PII_PATTERNS) {
    ok(`no pii pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log("\nDone v6.9A Phase 1.5 execution record tests.\n");

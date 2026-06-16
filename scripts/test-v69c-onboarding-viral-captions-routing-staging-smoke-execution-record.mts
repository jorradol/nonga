/**
 * v6.9C — Onboarding + viral captions routing staging route smoke execution record
 * (static validation only)
 * npm run test:v69c-onboarding-viral-captions-routing-staging-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9C-onboarding-viral-captions-routing-staging-smoke-execution-record.md";
const HEAD_SHA = "84529d95913dbc9b262f2254421499af7d68f476";
const SHORT_HASH = "84529d9";
const LIVE_CSS = "index-ButDouqC.css";
const LIVE_JS = "index-DmYSxXpo.js";
const OLD_CSS = "index-8qfUkJSm.css";
const OLD_JS = "index-mW0K4gyL.js";
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
  "=== v6.9C Onboarding + Viral Captions Routing Staging Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9C label", /v6\.9C/i.test(doc));
  ok("overall verdict PASS", /\*\*สถานะ:\*\*.*PASS|Overall.*PASS/i.test(doc));
  ok("onboarding fixed", /\/onboarding.*Fixed|onboarding.*fixed/i.test(doc));
  ok("viral-captions fixed", /\/viral-captions.*Fixed|viral-captions.*fixed/i.test(doc));
  ok("9/9 routable scenarios pass", doc.includes("9/9 PASS"));
  ok("regression routes intact", /Regression routes.*Intact|regression routes intact/i.test(doc));
  ok("head sha", doc.includes(HEAD_SHA));
  ok("short hash", doc.includes(SHORT_HASH));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
  ok(
    "commit message routing fix",
    doc.includes("map /onboarding and /viral-captions to correct views (v6.9C)")
  );
  ok("staging url", doc.includes(STAGING_URL));
  ok("staging project", doc.includes(STAGING_PROJECT));
  ok("deploy staging only", /Staging only|staging only/i.test(doc));
  ok("production target not touched", /Production target.*Not selected|production.*not touched/i.test(doc));
  ok("hosting only deploy", /Hosting only|hosting-only|Firebase Hosting only/i.test(doc));
  ok("cloud run image deploy no", /Cloud Run image deploy.*NO|Cloud Run.*Unchanged/i.test(doc));
  ok("env secrets unchanged", /Env.*secrets.*Unchanged|env.*secrets.*unchanged/i.test(doc));
  ok("pre-deploy lint pass", /npm run lint.*PASS|`npm run lint`/i.test(doc));
  ok(
    "pre-deploy v69c routing guard pass",
    /test:v69c-onboarding-viral-captions-routing-guard.*PASS|27\/27/i.test(doc)
  );
  ok(
    "pre-deploy v547g car detail routing pass",
    /test:v547g-car-detail-routing.*PASS|10\/10/i.test(doc)
  );
  ok("pre-deploy build staging hosting pass", /build:staging:hosting.*PASS/i.test(doc));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("browser loaded live css", /browser loaded live css|Browser loaded live CSS/i.test(doc));
  ok("browser loaded live js", /browser loaded live js|Browser loaded live JS/i.test(doc));
  ok("old js not loaded", /Old JS loaded.*NO|index-mW0K4gyL.js.*NO/i.test(doc));
  ok("old css not loaded", /Old CSS loaded.*NO|index-8qfUkJSm.css.*NO/i.test(doc));
  ok("old js hash referenced", doc.includes(OLD_JS));
  ok("old css hash referenced", doc.includes(OLD_CSS));
  ok(
    "route strings in live js bundle",
    /Route strings.*\/onboarding.*\/viral-captions|route strings.*live JS bundle/i.test(doc)
  );
  ok("stale cache none observed", /Stale cache issue.*None|stale cache.*none observed/i.test(doc));
  ok("onboarding direct open pass", /\/onboarding.*direct open.*PASS|OnboardingView/i.test(doc));
  ok("onboarding refresh pass", /\/onboarding.*refresh.*PASS/i.test(doc));
  ok(
    "viral-captions direct open pass",
    /\/viral-captions.*direct open.*PASS|CaptionEngineDashboard/i.test(doc)
  );
  ok("viral-captions refresh pass", /\/viral-captions.*refresh.*PASS/i.test(doc));
  ok("home regression pass", /\/home.*regression.*PASS|HomeView/i.test(doc));
  ok("chat regression pass", /\/chat.*regression.*PASS|AIChatView/i.test(doc));
  ok("search regression pass", /\/search.*regression.*PASS|SearchPageView/i.test(doc));
  ok("login regression pass", /\/login.*regression.*PASS|LoginView/i.test(doc));
  ok("header viral captions pass", /Header.*viral captions.*PASS|เขียนแคปชั่น/i.test(doc));
  ok(
    "profile onboarding na pre-existing",
    /Profile.*onboarding.*N\/A|pre-existing auth menu gate/i.test(doc)
  );
  ok(
    "onboarding no longer falls through to chat",
    /no longer falls through|Fell through to chat/i.test(doc)
  );
  ok(
    "viral-captions no longer falls through to chat",
    /viral-captions.*chat|CaptionEngineDashboard.*no chat/i.test(doc)
  );
  ok("refresh url preserved", /URL preserved/i.test(doc));
  ok("refresh view preserved", /View preserved/i.test(doc));
  ok(
    "guest onboarding auth menu backlog",
    /Onboarding in-app via profile menu.*guest|auth menu gate/i.test(doc)
  );
  ok("car-vision backlog", doc.includes("/car-vision"));
  ok("car-post-generator backlog", doc.includes("/car-post-generator"));
  ok("seo-landing backlog", doc.includes("/seo-landing"));
  ok("production pilot gates pending", /pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc));
  ok("cloud run unchanged", doc.includes(CLOUD_RUN_REV));
  ok("production not touched", /Production.*Not touched|production.*not touched/i.test(doc));
  ok("production deploy no", /Production deploy.*NO/i.test(doc));
  ok("production pilot not started", /Production pilot started.*NOT STARTED|pilot.*NOT STARTED/i.test(doc));
  ok("public nationwide no", /Public.*nationwide.*NO|public.*nationwide.*NO/i.test(doc));
  ok("ai runtime not touched", /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc));
  ok("guard fallback not touched", /Guard.*Not touched|fallback logic.*Not touched/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok("leads not touched", /Lead system.*Not touched|DealerLeads.*Not touched/i.test(doc));
  ok("payment not touched", /Payment.*Not touched|payment.*not touched/i.test(doc));
  ok("dealer chat not touched", /Dealer dashboard cluster.*Not touched|Chat theme.*Not touched/i.test(doc));
  ok("rollback hosting via previous release", /Firebase Hosting release history|prior release/i.test(doc));
  ok("cloud run no rollback needed", /no Cloud Run rollback needed|Cloud Run.*no rollback needed/i.test(doc));
  ok("git revert 84529d9 reference", doc.includes("84529d9"));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok(
    "package script registered",
    pkg.includes(
      "test:v69c-onboarding-viral-captions-routing-staging-smoke-execution-record"
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

console.log("\nDone v6.9C routing staging smoke execution record tests.\n");

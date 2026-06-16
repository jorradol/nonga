/**
 * v6.9B — Trust panel contrast staging visual smoke execution record
 * (static validation only)
 * npm run test:v69b-trust-panel-contrast-staging-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9B-trust-panel-contrast-staging-smoke-execution-record.md";
const HEAD_SHA = "c720994ad2c159cdb48628f577b25fa09f9413c1";
const SHORT_HASH = "c720994";
const LIVE_CSS = "index-ButDouqC.css";
const LIVE_JS = "index-mW0K4gyL.js";
const OLD_CSS = "index-8qfUkJSm.css";
const OLD_JS = "index-Ddq10mfa.js";
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
  "=== v6.9B Trust Panel Contrast Staging Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9B label", /v6\.9B/i.test(doc));
  ok("overall verdict PASS", /\*\*สถานะ:\*\*.*PASS|Overall.*PASS/i.test(doc));
  ok("visual smoke 4/4 PASS", doc.includes("4/4 PASS"));
  ok("ai disclaimer contrast fixed", /AI disclaimer contrast.*Fixed|contrast.*fixed/i.test(doc));
  ok("head sha", doc.includes(HEAD_SHA));
  ok("short hash", doc.includes(SHORT_HASH));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
  ok(
    "commit message trust panel contrast",
    doc.includes("v6.9B trust panel light mode contrast minor fix")
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
    "pre-deploy v69b guard pass",
    /test:v69b-trust-panel-light-mode-contrast-guard.*PASS|6\/6/i.test(doc)
  );
  ok(
    "pre-deploy v69a phase1 guard pass",
    /test:v69a-light-mode-contrast-phase1-guard.*PASS|20\/20/i.test(doc)
  );
  ok(
    "pre-deploy v69a phase15 guard pass",
    /test:v69a-phase15-dark-variant-alignment-guard.*PASS|9\/9/i.test(doc)
  );
  ok("pre-deploy build staging hosting pass", /build:staging:hosting.*PASS/i.test(doc));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("browser loaded live css", /browser loaded live css|Browser loaded live CSS/i.test(doc));
  ok("browser loaded live js", /browser loaded live js|Browser loaded live JS/i.test(doc));
  ok("old js not loaded", /Old JS loaded.*NO|index-Ddq10mfa.js.*NO/i.test(doc));
  ok("old css not loaded", /Old CSS loaded.*NO|index-8qfUkJSm.css.*NO/i.test(doc));
  ok("old js hash referenced", doc.includes(OLD_JS));
  ok("old css hash referenced", doc.includes(OLD_CSS));
  ok("stale cache none observed", /Stale cache issue.*None|stale cache.*none observed/i.test(doc));
  ok("s1 app light os light pass", /S1.*PASS|App light \+ OS light.*PASS/i.test(doc));
  ok("s2 app light os dark pass", /S2.*PASS|App light \+ OS dark.*PASS/i.test(doc));
  ok("s3 app dark os light pass", /S3.*PASS|App dark \+ OS light.*PASS/i.test(doc));
  ok("s4 app dark os dark pass", /S4.*PASS|App dark \+ OS dark.*PASS/i.test(doc));
  ok("pre-fix contrast 2.47", doc.includes("2.47"));
  ok("post-fix contrast 9.74", doc.includes("9.74"));
  ok("text-slate-700 class", doc.includes("text-slate-700"));
  ok("dark text-slate-400 unchanged", /dark:text-slate-400.*unchanged|dark:text-slate-400 unchanged/i.test(doc));
  ok("visual readability improved", /Clearly improved|clearly improved/i.test(doc));
  ok(
    "phase15 dark variant still pass",
    /Phase 1\.5.*class-only variant.*PASS|Phase 1\.5.*no regression/i.test(doc)
  );
  ok(
    "dark text white no leak on light shell",
    /dark:text-white.*does not apply|darkWhiteAppliesWhenLight=false/i.test(doc)
  );
  ok("dark footer drawer readable", /Dark footer.*drawer readable|dark footer.*drawer readable/i.test(doc));
  ok("chat theme not touched", /Chat theme.*Not touched|chat theme.*not touched/i.test(doc));
  ok("home route pass", /\/home.*PASS|`\/home`/i.test(doc));
  ok("chat route pass", /\/chat.*PASS|`\/chat`/i.test(doc));
  ok(
    "onboarding pre-existing out of scope",
    /\/onboarding.*Pre-existing|Pre-existing.*onboarding/i.test(doc)
  );
  ok(
    "viral-captions pre-existing out of scope",
    /\/viral-captions.*Pre-existing|Pre-existing.*viral-captions/i.test(doc)
  );
  ok("onboarding routing backlog", /\/onboarding.*routing|routing.*onboarding/i.test(doc));
  ok("broader contrast sweep backlog", /Broader light-mode contrast|dealer dashboard cluster/i.test(doc));
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
  ok("routing dealer chat untouched", /Routing.*Not touched|Dealer dashboard cluster.*Not touched/i.test(doc));
  ok("rollback hosting via previous release", /Firebase Hosting release history|prior release/i.test(doc));
  ok("cloud run no rollback needed", /no Cloud Run rollback needed|Cloud Run.*no rollback needed/i.test(doc));
  ok("git revert c720994 reference", doc.includes("c720994"));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok(
    "package script registered",
    pkg.includes(
      "test:v69b-trust-panel-contrast-staging-smoke-execution-record"
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

console.log("\nDone v6.9B execution record tests.\n");

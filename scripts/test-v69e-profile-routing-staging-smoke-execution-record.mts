/**
 * v6.9E-B — Profile routing staging route smoke execution record
 * (static validation only)
 * npm run test:v69e-profile-routing-staging-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9E-B-profile-routing-staging-smoke-execution-record.md";
const HEAD_SHA = "00d8fc1e06c867cd5ff9a02ba03091de5d274d1c";
const SHORT_HASH = "00d8fc1";
const LIVE_CSS = "index-ButDouqC.css";
const LIVE_JS = "index-BdxExQxg.js";
const OLD_JS = "index-BQlddXam.js";
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
  "=== v6.9E-B Profile Routing Staging Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9E-B label", /v6\.9E-B/i.test(doc));
  ok(
    "pass for v6.9E-B routing objective",
    /PASS.*v6\.9E-B routing objective|routing objective.*PASS/i.test(doc)
  );
  ok("smoke detail 42/46 pass", doc.includes("42/46 PASS"));
  ok(
    "profile guest direct pass",
    /\/profile.*guest direct.*PASS|guest direct.*Fixed/i.test(doc)
  );
  ok(
    "profile guest refresh pass",
    /\/profile.*guest refresh.*PASS|guest refresh.*Fixed/i.test(doc)
  );
  ok(
    "no chat fallback for profile",
    /no chat fallback|not chat|no chat input/i.test(doc)
  );
  ok(
    "member gate preserved",
    /member gate.*Preserved|RequireMember.*Preserved|RequireMember gate/i.test(doc)
  );
  ok(
    "4 non-blocking failures not routing regressions",
    /4.*non-blocking.*not routing regressions|not routing regressions/i.test(doc)
  );
  ok(
    "guest header login hidden sm mobile",
    /hidden sm:|Login button hidden on mobile/i.test(doc)
  );
  ok(
    "signed-in auth bootstrap limitation",
    /auth bootstrap|did not bootstrap.*UserProfileView|Firebase staging/i.test(doc)
  );
  ok(
    "header profile menu mobile auth limitation",
    /mobile viewport.*auth bootstrap|profile avatar not found/i.test(doc)
  );
  ok(
    "v6.9C regression pass",
    /v6\.9C regression.*PASS|\/onboarding.*regression.*PASS/i.test(doc)
  );
  ok(
    "v6.9D regression pass",
    /v6\.9D regression.*PASS|\/car-vision.*regression.*PASS/i.test(doc)
  );
  ok(
    "core route regression pass",
    /Core regression.*PASS|\/home.*regression.*PASS/i.test(doc)
  );
  ok("head sha", doc.includes(HEAD_SHA));
  ok("short hash", doc.includes(SHORT_HASH));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok(
    "commit message routing fix",
    doc.includes(
      "map /profile to profile view with member gate preserved (v6.9E-B)"
    )
  );
  ok("staging url", doc.includes(STAGING_URL));
  ok("staging project", doc.includes(STAGING_PROJECT));
  ok("deploy staging only", /Staging only|staging only/i.test(doc));
  ok(
    "production target not touched",
    /Production target.*Not selected|production.*not touched/i.test(doc)
  );
  ok(
    "hosting only deploy",
    /Hosting only|hosting-only|Firebase Hosting only/i.test(doc)
  );
  ok(
    "cloud run image deploy no",
    /Cloud Run image deploy.*NO|Cloud Run.*Unchanged/i.test(doc)
  );
  ok(
    "env secrets unchanged",
    /Env.*secrets.*Unchanged|env.*secrets.*unchanged/i.test(doc)
  );
  ok("pre-deploy lint pass", /npm run lint.*PASS|`npm run lint`/i.test(doc));
  ok(
    "pre-deploy v69e profile routing guard pass",
    /test:v69e-profile-routing-guard.*PASS|32\/32/i.test(doc)
  );
  ok(
    "pre-deploy v69c routing guard pass",
    /test:v69c-onboarding-viral-captions-routing-guard.*PASS|27\/27/i.test(doc)
  );
  ok(
    "pre-deploy v69d routing guard pass",
    /test:v69d-similar-unmapped-routes-routing-guard.*PASS|35\/35/i.test(doc)
  );
  ok(
    "pre-deploy v547g car detail routing pass",
    /test:v547g-car-detail-routing.*PASS|10\/10/i.test(doc)
  );
  ok(
    "pre-deploy build staging hosting pass",
    /build:staging:hosting.*PASS/i.test(doc)
  );
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("live js asset", doc.includes(LIVE_JS));
  ok(
    "browser loaded live css",
    /browser loaded live css|Browser loaded live CSS/i.test(doc)
  );
  ok(
    "browser loaded live js",
    /browser loaded live js|Browser loaded live JS/i.test(doc)
  );
  ok(
    "old js not loaded",
    /Old JS loaded.*NO|index-BQlddXam.js.*NO/i.test(doc)
  );
  ok("old js hash referenced", doc.includes(OLD_JS));
  ok(
    "route string profile in live js",
    /\/profile/.test(doc) && /live JS bundle|Route string/i.test(doc)
  );
  ok(
    "stale cache none observed",
    /Stale cache issue.*None|stale cache.*none observed/i.test(doc)
  );
  ok(
    "onboarding regression",
    /\/onboarding.*regression.*PASS|OnboardingView/i.test(doc)
  );
  ok(
    "viral-captions regression",
    /\/viral-captions.*regression.*PASS|CaptionEngineDashboard/i.test(doc)
  );
  ok(
    "car-vision regression",
    /\/car-vision.*regression.*PASS|CarVisionDashboard/i.test(doc)
  );
  ok(
    "car-post-generator regression",
    /\/car-post-generator.*regression.*PASS|PostGeneratorDashboard/i.test(doc)
  );
  ok(
    "seo-landing regression",
    /\/seo-landing.*regression.*PASS|SeoLandingDashboard/i.test(doc)
  );
  ok("home regression", /\/home.*regression.*PASS|HomeView/i.test(doc));
  ok("chat regression", /\/chat.*regression.*PASS|AIChatView/i.test(doc));
  ok(
    "search regression",
    /\/search.*regression.*PASS|SearchPageView/i.test(doc)
  );
  ok("login regression", /\/login.*regression.*PASS|LoginView/i.test(doc));
  ok("billing backlog", /billing/i.test(doc));
  ok("boost backlog", /boost/i.test(doc));
  ok("dealer-dashboard backlog", /dealer-dashboard/i.test(doc));
  ok("dealer-showroom backlog", /dealer-showroom/i.test(doc));
  ok(
    "production pilot gates pending",
    /pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc)
  );
  ok("cloud run unchanged", doc.includes(CLOUD_RUN_REV));
  ok(
    "production not touched",
    /Production.*Not touched|production.*not touched/i.test(doc)
  );
  ok("production deploy no", /Production deploy.*NO/i.test(doc));
  ok(
    "production pilot not started",
    /Production pilot started.*NOT STARTED|pilot.*NOT STARTED/i.test(doc)
  );
  ok(
    "public nationwide no",
    /Public.*nationwide.*NO|public.*nationwide.*NO/i.test(doc)
  );
  ok(
    "ai runtime not touched",
    /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc)
  );
  ok(
    "guard fallback not touched",
    /Guard.*Not touched|fallback logic.*Not touched/i.test(doc)
  );
  ok(
    "firestore not touched",
    /Firestore.*Not touched|firestore.*not touched/i.test(doc)
  );
  ok(
    "leads not touched",
    /Lead system.*Not touched|DealerLeads.*Not touched/i.test(doc)
  );
  ok(
    "payment not touched",
    /Payment.*Not touched|payment.*not touched/i.test(doc)
  );
  ok(
    "dealer chat not touched",
    /Dealer dashboard cluster.*Not touched|Chat theme.*Not touched/i.test(doc)
  );
  ok(
    "rollback hosting via previous release",
    /Firebase Hosting release history|prior release/i.test(doc)
  );
  ok(
    "cloud run no rollback needed",
    /no Cloud Run rollback needed|Cloud Run.*no rollback needed/i.test(doc)
  );
  ok("git revert 00d8fc1 reference", doc.includes("00d8fc1"));
  ok("v6.9 not ready", /NOT READY/i.test(doc));
  ok(
    "package script registered",
    pkg.includes("test:v69e-profile-routing-staging-smoke-execution-record")
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

console.log(
  "\nDone v6.9E-B profile routing staging smoke execution record tests.\n"
);

/**
 * v6.9G-A — Staging hosting deploy + light mode visual smoke execution record
 * (static validation only)
 * npm run test:v69g-a-staging-hosting-deploy-light-mode-visual-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9G-A-staging-hosting-deploy-light-mode-visual-smoke-execution-record.md";
const HEAD_SHA = "a9943ac2198764e3b6eecca5ce617a1928366df2";
const SHORT_HASH = "a9943ac";
const RUNTIME_PATCH_SHA = "ed63cb3d550a2cd78a3ff723271c3fb2621ac562";
const RUNTIME_PATCH_SHORT = "ed63cb3";
const LIVE_JS = "index-CZUJav8l.js";
const LIVE_CSS = "index-v8LQYv3A.css";
const CLOUD_RUN_STAGING_REV = "nonga-staging-00154-q7l";
const CLOUD_RUN_API_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://nonga-ce93c.web.app";
const STAGING_PROJECT = "nonga-ce93c";
const DEPLOY_CMD =
  "npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c";

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
  "=== v6.9G-A Staging Hosting Deploy + Light Mode Visual Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9G-A label", /v6\.9G-A/i.test(doc));
  ok("overall PARTIAL verdict", /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc));
  ok("head sha a9943ac", doc.includes(HEAD_SHA));
  ok("short hash a9943ac", doc.includes(SHORT_HASH));
  ok("runtime patch sha ed63cb3", doc.includes(RUNTIME_PATCH_SHA));
  ok("runtime patch short ed63cb3", doc.includes(RUNTIME_PATCH_SHORT));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("working tree clean", /working tree.*clean|Working tree.*clean/i.test(doc));
  ok("local equals origin", /origin\/feature\/chat-image-attachment-v1/i.test(doc));
  ok("no commit during deploy smoke", /Commit during deploy\/smoke.*NO|no commit during deploy\/smoke/i.test(doc));
  ok("no runtime code changes deploy smoke", /Runtime code changes.*NO|no runtime code changes/i.test(doc));

  ok("build staging hosting pass", /build:staging:hosting.*PASS/i.test(doc));
  ok("npm run build staging hosting script", doc.includes("npm run build:staging:hosting"));
  ok("firebase guard pass", /Firebase guard.*PASS|vite-firebase-guard.*PASS/i.test(doc));
  ok("dist bundle verify pass", /Dist bundle verify.*PASS|dist bundle verified/i.test(doc));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok(
    "npm run build guard issue unresolved",
    /npm run build.*FAIL|guard issue.*unresolved|remains.*FAIL/i.test(doc) &&
      /Firebase production config guard|placeholder.*apiKey/i.test(doc)
  );

  ok("deploy command documented", doc.includes(DEPLOY_CMD));
  ok("hosting only scope", /Firebase Hosting only|Hosting only/i.test(doc));
  ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("staging url", doc.includes(STAGING_URL));
  ok("files uploaded 6", /6 files|6 files from `dist`/i.test(doc));
  ok("deploy exit code 0", /Exit code.*0|exit code.*0/i.test(doc));
  ok("live bundle js reference", doc.includes("/assets/index-CZUJav8l.js"));
  ok("live bundle css reference", doc.includes("/assets/index-v8LQYv3A.css"));

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok("cloud run staging revision", doc.includes(CLOUD_RUN_STAGING_REV));
  ok("cloud run api revision", doc.includes(CLOUD_RUN_API_REV));
  ok(
    "no cloud run deploy revision update",
    /No Cloud Run deploy|revision update.*No|Unchanged/i.test(doc)
  );

  ok("route profile partial", /\/profile.*PARTIAL|`\/profile`/i.test(doc));
  ok("route car-vision pass", /\/car-vision.*PASS|`\/car-vision`/i.test(doc));
  ok("route viral-captions pass", /\/viral-captions.*PASS|`\/viral-captions`/i.test(doc));
  ok("route home pass", /\/home.*PASS|`\/home`/i.test(doc));
  ok("route login pass", /\/login.*PASS|`\/login`/i.test(doc));
  ok("route search pass", /\/search.*PASS|`\/search`/i.test(doc));
  ok("route onboarding pass", /\/onboarding.*PASS|`\/onboarding`/i.test(doc));
  ok("route seo-landing pass", /\/seo-landing.*PASS|`\/seo-landing`/i.test(doc));
  ok("route car-post-generator pass", /\/car-post-generator.*PASS|`\/car-post-generator`/i.test(doc));

  ok(
    "carvision p0 resolved",
    /CarVisionDashboard.*P0 resolved|car-vision.*P0 resolved/i.test(doc)
  );
  ok(
    "caption engine p0 resolved",
    /CaptionEngineDashboard.*P0 resolved|viral-captions.*P0 resolved/i.test(doc)
  );
  ok("header improved readable", /Header.*Improved|header.*readable/i.test(doc));
  ok(
    "profile auth gated not fully verified",
    /UserProfileView.*Not fully verified|auth gate|auth-gated/i.test(doc)
  );
  ok("settings card not verified", /SettingsCard.*Not verified/i.test(doc));
  ok("home trust panel no regression", /trust panel.*no regression|No regression.*v6\.9B/i.test(doc));
  ok(
    "car-post-generator dark island intentional",
    /car-post-generator.*dark island.*intentional|Dark form island intentional/i.test(doc)
  );

  ok(
    "profile auth limitation documented",
    /staging test account|authenticated smoke/i.test(doc)
  );
  ok("no fake pass profile", /no fake pass/i.test(doc));
  ok("mobile drawer not tested", /Mobile drawer.*Not tested|mobile drawer not tested/i.test(doc));

  ok("production not touched", /Production.*Not touched|Production not touched/i.test(doc));
  ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));
  ok("ai runtime not touched", /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc));
  ok("guard fallback not touched", /Guard.*Not touched|fallback logic.*Not touched/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok("leads not touched", /Lead system.*Not touched|DealerLeads.*Not touched/i.test(doc));
  ok("payment boost not touched", /Payment.*Not touched|boost logic.*Not touched/i.test(doc));

  ok(
    "next authenticated profile smoke",
    /Authenticated.*\/profile`|authenticated.*profile smoke/i.test(doc)
  );
  ok("next mobile drawer smoke", /Mobile drawer smoke|mobile drawer smoke/i.test(doc));
  ok("next v69f-b dealer admin", /v6\.9F-B|dealer\/admin contrast/i.test(doc));

  ok(
    "package script registered",
    pkg.includes(
      "test:v69g-a-staging-hosting-deploy-light-mode-visual-smoke-execution-record"
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

console.log("\nDone v6.9G-A execution record tests.\n");

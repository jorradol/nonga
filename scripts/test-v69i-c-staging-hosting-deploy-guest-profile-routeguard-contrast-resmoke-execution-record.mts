/**
 * v6.9I-C — Staging hosting deploy + guest profile RouteGuard contrast re-smoke execution record
 * (static validation only)
 * npm run test:v69i-c-staging-hosting-deploy-guest-profile-routeguard-contrast-resmoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9I-C-staging-hosting-deploy-guest-profile-routeguard-contrast-resmoke-execution-record.md";
const HEAD_SHA = "20fcde669c0ebcb3928a725b4ee090d856889ecf";
const SHORT_HASH = "20fcde6";
const PARENT_SHA = "dec11930894373a304eb23c6c01c186bd4de0c5c";
const PARENT_SHORT = "dec1193";
const PRIOR_JS = "index-CbnVCCnG.js";
const LIVE_JS = "index-0kj8LJJl.js";
const LIVE_CSS = "index-v8LQYv3A.css";
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
  "=== v6.9I-C Staging Hosting Deploy + Guest Profile RouteGuard Contrast Re-Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9I-C label", /v6\.9I-C/i.test(doc));
  ok("overall PASS verdict", /\*\*สถานะ:\*\*.*PASS|Overall result.*PASS/i.test(doc));
  ok("head sha 20fcde6", doc.includes(HEAD_SHA));
  ok("short hash 20fcde6", doc.includes(SHORT_HASH));
  ok("parent sha dec1193", doc.includes(PARENT_SHA));
  ok("parent short dec1193", doc.includes(PARENT_SHORT));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("working tree clean", /working tree.*clean|Working tree.*clean/i.test(doc));
  ok("local equals origin", /origin\/feature\/chat-image-attachment-v1/i.test(doc));
  ok("patch commit deployed", /patch commit deployed|Patch commit deployed/i.test(doc));
  ok(
    "no commit during deploy smoke",
    /Commit during deploy\/smoke.*NO|no commit during deploy\/smoke/i.test(doc)
  );
  ok(
    "no runtime code changes deploy smoke",
    /Runtime code changes.*NO|no runtime code changes/i.test(doc)
  );

  ok("build staging hosting pass", /build:staging:hosting.*PASS/i.test(doc));
  ok("npm run build staging hosting script", doc.includes("npm run build:staging:hosting"));
  ok(
    "firebase web config guard pass",
    /Firebase web config guard.*PASS|vite-firebase-guard.*PASS/i.test(doc)
  );
  ok("dist bundle verify pass", /Dist bundle verify.*PASS|dist bundle verified/i.test(doc));
  ok("built js asset", doc.includes(LIVE_JS));
  ok("built css asset", doc.includes(LIVE_CSS));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok(
    "npm run build guard issue not deploy gate",
    /npm run build.*FAIL|guard issue|not used as this deploy gate/i.test(doc)
  );

  ok("deploy command documented", doc.includes(DEPLOY_CMD));
  ok("deploy result success", /Deploy result.*SUCCESS|Result.*SUCCESS/i.test(doc));
  ok("hosting only scope", /Firebase Hosting only|Hosting only/i.test(doc));
  ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("staging url", doc.includes(STAGING_URL));
  ok("files uploaded 6", /6 files|6 files from `dist`/i.test(doc));
  ok("2 new asset files uploaded", /2 new asset files/i.test(doc));
  ok("prior js asset", doc.includes(PRIOR_JS));
  ok("live bundle js reference", doc.includes("/assets/index-0kj8LJJl.js"));
  ok("live bundle css reference", doc.includes("/assets/index-v8LQYv3A.css"));

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok(
    "cloud run deploy not performed",
    /Cloud Run deploy.*Not performed|Cloud Run deploy not performed/i.test(doc)
  );
  ok("hosting only deploy", /Hosting-only deploy|hosting-only deploy/i.test(doc));

  ok("routeguard mentioned", /RouteGuard/i.test(doc));
  ok("text-slate-700 documented", doc.includes("text-slate-700"));
  ok("text-slate-200 documented", doc.includes("text-slate-200"));
  ok("issue i-b-02", doc.includes("I-B-02"));
  ok("i-b-02 resolved", /I-B-02.*Resolved|resolved on live staging/i.test(doc));

  ok("profile guest pass", /\/profile.*PASS|Overall guest.*PASS/i.test(doc));
  ok("route stayed profile", /Stays on.*\/profile|stays on.*\/profile/i.test(doc));
  ok("no chat fallback", /no chat fallback|No chat fallback/i.test(doc));
  ok("auth gate visible", /auth gate|กรุณาเข้าสู่ระบบ/i.test(doc));
  ok("gate message readable", /readable.*light mode|Gate message.*readable/i.test(doc));
  ok(
    "old text-slate-200 not applied light",
    /text-slate-200.*Not applied|not applied.*light mode/i.test(doc)
  );
  ok("computed color oklch", doc.includes("oklch(0.372 0.044 257.287)"));
  ok("cta login unchanged", /CTA.*Unchanged|navigates to.*\/login/i.test(doc));
  ok("no white on white", /White-on-white.*None|no white-on-white/i.test(doc));
  ok("no horizontal overflow", /Horizontal overflow.*None|no horizontal overflow/i.test(doc));

  ok("mobile viewport 390x844", doc.includes("390×844"));
  ok("mobile drawer pass", /Drawer opens.*PASS|drawer opens.*PASS/i.test(doc));
  ok("mobile auth gate readable", /Auth gate message readable.*PASS|auth gate message readable/i.test(doc));

  ok("regression home pass", /\/home.*PASS|`\/home`/i.test(doc));
  ok("regression car-vision pass", /\/car-vision.*PASS|`\/car-vision`/i.test(doc));
  ok("regression viral-captions pass", /\/viral-captions.*PASS|`\/viral-captions`/i.test(doc));
  ok("v69h-a header drawer stable", /v6\.9H-A header\/drawer|header\/drawer.*Stable/i.test(doc));

  ok(
    "authenticated profile still not verified",
    /authenticated.*\/profile.*still not verified|Authenticated.*\/profile.*still not verified/i.test(doc)
  );
  ok("settingscard not tested", /SettingsCard.*not tested|SettingsCard not tested/i.test(doc));
  ok(
    "superadmin avatar backlog",
    /superadmin profile icon\/avatar|Superadmin profile icon/i.test(doc)
  );
  ok("v6.9j defer", doc.includes("v6.9J"));
  ok(
    "dark mode gate not resmoked",
    /dark-mode RouteGuard.*not re-smoked|Dark mode gate.*not re-smoked/i.test(doc)
  );
  ok("no fake authenticated pass", /no fake authenticated pass|Fake authenticated pass.*NO/i.test(doc));

  ok(
    "scope limited pass note",
    /PASS applies only|not a full authenticated profile sign-off/i.test(doc)
  );
  ok("production not touched", /Production.*Not touched|Production not touched/i.test(doc));
  ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));
  ok("ai runtime not touched", /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc));
  ok("guard fallback not touched", /Guard.*Not touched|fallback logic.*Not touched/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok("leads not touched", /Lead system.*Not touched|DealerLeads.*Not touched/i.test(doc));
  ok("payment boost not touched", /Payment.*Not touched|boost logic.*Not touched/i.test(doc));

  ok(
    "package script registered",
    pkg.includes(
      "test:v69i-c-staging-hosting-deploy-guest-profile-routeguard-contrast-resmoke-execution-record"
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

console.log("\nDone v6.9I-C execution record tests.\n");

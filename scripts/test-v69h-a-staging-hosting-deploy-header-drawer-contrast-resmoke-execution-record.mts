/**
 * v6.9H-A — Staging hosting deploy + header/drawer contrast re-smoke execution record
 * (static validation only)
 * npm run test:v69h-a-staging-hosting-deploy-header-drawer-contrast-resmoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9H-A-staging-hosting-deploy-header-drawer-contrast-resmoke-execution-record.md";
const HEAD_SHA = "0ae72ff48c17043f2e27b52eb179b30084decee3";
const SHORT_HASH = "0ae72ff";
const PARENT_SHA = "fdbad025be846af5a51048871dd3e93c46f528cf";
const PARENT_SHORT = "fdbad02";
const LIVE_JS = "index-CbnVCCnG.js";
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
  "=== v6.9H-A Staging Hosting Deploy + Header/Drawer Contrast Re-Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9H-A label", /v6\.9H-A/i.test(doc));
  ok("overall PARTIAL verdict", /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc));
  ok("head sha 0ae72ff", doc.includes(HEAD_SHA));
  ok("short hash 0ae72ff", doc.includes(SHORT_HASH));
  ok("parent sha fdbad02", doc.includes(PARENT_SHA));
  ok("parent short fdbad02", doc.includes(PARENT_SHORT));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("working tree clean", /working tree.*clean|Working tree.*clean/i.test(doc));
  ok("local equals origin", /origin\/feature\/chat-image-attachment-v1/i.test(doc));
  ok("patch commit deployed", /patch commit deployed|Patch commit deployed/i.test(doc));
  ok("no commit during deploy smoke", /Commit during deploy\/smoke.*NO|no commit during deploy\/smoke/i.test(doc));
  ok("no runtime code changes deploy smoke", /Runtime code changes.*NO|no runtime code changes/i.test(doc));

  ok("build staging hosting pass", /build:staging:hosting.*PASS/i.test(doc));
  ok("npm run build staging hosting script", doc.includes("npm run build:staging:hosting"));
  ok("firebase web config guard pass", /Firebase web config guard.*PASS|vite-firebase-guard.*PASS/i.test(doc));
  ok("dist bundle verify pass", /Dist bundle verify.*PASS|dist bundle verified/i.test(doc));
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
  ok("live bundle js reference", doc.includes("/assets/index-CbnVCCnG.js"));
  ok("live bundle css reference", doc.includes("/assets/index-v8LQYv3A.css"));

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok(
    "cloud run deploy not performed",
    /Cloud Run deploy.*Not performed|Cloud Run deploy not performed/i.test(doc)
  );
  ok(
    "hosting only deploy",
    /Hosting-only deploy|hosting-only deploy/i.test(doc)
  );

  ok("route home pass", /\/home.*PASS|`\/home`/i.test(doc));
  ok("route profile guest pass", /\/profile.*PASS|`\/profile`/i.test(doc));
  ok("route car-vision pass", /\/car-vision.*PASS|`\/car-vision`/i.test(doc));
  ok("route viral-captions pass", /\/viral-captions.*PASS|`\/viral-captions`/i.test(doc));
  ok("no chat fallback", /no chat fallback|No chat fallback/i.test(doc));
  ok("no visible app crash", /no visible app crash|No visible app crash/i.test(doc));

  ok("contrast before 1.04:1", doc.includes("1.04:1"));
  ok("contrast before 2.47:1", doc.includes("2.47:1"));
  ok("contrast after 10.36:1", doc.includes("10.36:1"));
  ok("text-slate-700 documented", doc.includes("text-slate-700"));
  ok(
    "desktop guest cta patch classes",
    /from-orange-600 text-white|text-orange-500.*absent/i.test(doc)
  );
  ok("p1 issues resolved", /P1 resolved/i.test(doc));
  ok("no p0 observed", /P0.*None|no P0 observed/i.test(doc));
  ok(
    "drawer login cta readable",
    /Drawer login.*PASS|drawer login.*readable/i.test(doc)
  );

  ok(
    "h-03 p2 nongbot badge",
    /H-03.*P2|bg-orange-500\/10 text-orange-500/i.test(doc)
  );
  ok(
    "h-04 p2 drawer footer",
    /H-04.*P2|border-white\/5/i.test(doc)
  );
  ok(
    "auth profile defer",
    /Auth profile.*Defer|Signed-in profile dropdown.*Not verified/i.test(doc)
  );
  ok(
    "authenticated profile still not verified",
    /authenticated.*\/profile.*still not verified|Authenticated.*\/profile.*still not verified/i.test(doc)
  );
  ok("no fake authenticated pass", /no fake authenticated pass|Fake authenticated pass.*NO/i.test(doc));

  ok("production not touched", /Production.*Not touched|Production not touched/i.test(doc));
  ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));
  ok("ai runtime not touched", /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc));
  ok("guard fallback not touched", /Guard.*Not touched|fallback logic.*Not touched/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok("leads not touched", /Lead system.*Not touched|DealerLeads.*Not touched/i.test(doc));
  ok("payment boost not touched", /Payment.*Not touched|boost logic.*Not touched/i.test(doc));

  ok(
    "primary objectives verified",
    /primary v6\.9H-A.*verified|Primary v6\.9H-A objectives/i.test(doc)
  );
  ok(
    "not pass because profile unverified",
    /Not PASS because|authenticated.*not verified/i.test(doc)
  );
  ok(
    "not fail because deploy succeeded",
    /Not FAIL because|deploy.*succeeded/i.test(doc)
  );

  ok(
    "package script registered",
    pkg.includes(
      "test:v69h-a-staging-hosting-deploy-header-drawer-contrast-resmoke-execution-record"
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

console.log("\nDone v6.9H-A execution record tests.\n");

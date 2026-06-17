/**
 * v6.9K — Safe operator authenticated profile + avatar smoke closure execution record
 * (static validation only)
 * npm run test:v69k-safe-operator-authenticated-profile-avatar-smoke-closure-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9K-safe-operator-authenticated-profile-avatar-smoke-closure-execution-record.md";
const HEAD_SHA = "533ba0f4c92b0949d10aef29d54c852f501889fb";
const SHORT_HASH = "533ba0f";
const LIVE_JS = "index-CbN1x-wa.js";
const LIVE_CSS = "index-v8LQYv3A.css";
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
  "=== v6.9K Safe Operator Authenticated Profile + Avatar Smoke Closure Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9K label", /v6\.9K/i.test(doc));
  ok(
    "overall PARTIAL verdict",
    /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc)
  );
  ok(
    "authenticated smoke not verified",
    /authenticated smoke.*not verified|authenticated smoke \*\*not verified\*\*/i.test(doc)
  );
  ok(
    "no safe operator session",
    /no safe operator session|Safe authenticated operator session available.*NO/i.test(doc)
  );
  ok("head sha 533ba0f", doc.includes(HEAD_SHA));
  ok("short hash 533ba0f", doc.includes(SHORT_HASH));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("working tree clean", /working tree.*clean|Working tree.*clean/i.test(doc));
  ok(
    "no commit during smoke",
    /Commit during smoke.*NO|no commit during smoke/i.test(doc)
  );
  ok(
    "no runtime code changes smoke",
    /Runtime code changes.*NO|no runtime code changes/i.test(doc)
  );
  ok("no deploy performed", /Deploy performed.*NO|Staging deploy.*NO/i.test(doc));

  ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("staging url", doc.includes(STAGING_URL));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("live bundle js reference", doc.includes("/assets/index-CbN1x-wa.js"));
  ok("live bundle css reference", doc.includes("/assets/index-v8LQYv3A.css"));

  ok(
    "safe session available no",
    /Safe authenticated.*session available.*NO|safe authenticated session available.*\*\*NO\*\*/i.test(doc)
  );
  ok("login performed no", /Login performed.*NO/i.test(doc));
  ok("credentials requested no", /Credentials requested.*NO/i.test(doc));
  ok(
    "tokens cookies not logged",
    /Tokens\/cookies\/session.*NO|tokens\/cookies\/session inspected or logged.*NO/i.test(doc)
  );

  ok("guest host loads pass", /Live host loads.*PASS/i.test(doc));
  ok("guest bundle current pass", /Live bundle current.*PASS/i.test(doc));
  ok("guest header pass", /Guest header.*PASS/i.test(doc));
  ok("guest profile routeguard pass", /Guest.*profile.*RouteGuard.*PASS/i.test(doc));
  ok("no chat fallback pass", /No chat fallback.*PASS|no chat fallback.*PASS/i.test(doc));
  ok("no app crash pass", /No app crash.*PASS|no app crash.*PASS/i.test(doc));

  ok(
    "desktop avatar not verified",
    /Desktop header avatar fallback.*NOT VERIFIED/i.test(doc)
  );
  ok(
    "mobile drawer avatar not verified",
    /Mobile drawer avatar fallback.*NOT VERIFIED/i.test(doc)
  );

  ok("settings card not verified", /SettingsCard.*NOT VERIFIED/i.test(doc));
  ok("profile inputs not verified", /Profile inputs.*NOT VERIFIED/i.test(doc));
  ok("ai tone cards not verified", /AI tone cards.*NOT VERIFIED/i.test(doc));
  ok(
    "bordered panels not verified",
    /Bordered panels\/dividers.*NOT VERIFIED/i.test(doc)
  );
  ok(
    "signed-in dropdown not verified",
    /Signed-in header\/profile dropdown.*NOT VERIFIED/i.test(doc)
  );
  ok(
    "signed-in mobile drawer not verified",
    /Signed-in mobile drawer\/header.*NOT VERIFIED/i.test(doc)
  );

  ok("blocker k-01", doc.includes("K-01"));
  ok(
    "carry-forward signed-in avatar",
    /Signed-in avatar fallback still unverified|signed-in avatar fallback still unverified/i.test(doc)
  );
  ok(
    "carry-forward authenticated profile",
    /Authenticated.*profile.*contrast still unresolved|authenticated.*profile.*contrast still unresolved/i.test(doc)
  );
  ok("v69i-b reference", /v6\.9I-B/i.test(doc));
  ok("v69j-c reference", /v6\.9J-C/i.test(doc));

  ok("no code patch now", /Code patch now.*None|no code patch now/i.test(doc));
  ok("preserve partial result", /Preserve PARTIAL result/i.test(doc));
  ok("v69k-b re-run recommendation", /v6\.9K-B/i.test(doc));

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok("production not touched", /Production.*Not touched|Production deploy.*NO/i.test(doc));
  ok(
    "auth session routing not changed",
    /Auth.*Not changed|auth.*session.*Not changed/i.test(doc)
  );
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok(
    "production pilot still NOT READY",
    /Production pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc)
  );
  ok(
    "not production-ready",
    /not production-ready|Not production-ready/i.test(doc)
  );
  ok(
    "not deploy-ready",
    /not deploy-ready|Not deploy-ready/i.test(doc)
  );
  ok(
    "package script registered",
    pkg.includes(
      "test:v69k-safe-operator-authenticated-profile-avatar-smoke-closure-execution-record"
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

console.log(
  "\nDone v6.9K safe operator authenticated profile + avatar smoke closure execution record tests.\n"
);

/**
 * v6.9G-B — Authenticated profile + mobile light mode smoke execution record
 * (static validation only)
 * npm run test:v69g-b-authenticated-profile-mobile-light-mode-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9G-B-authenticated-profile-mobile-light-mode-smoke-execution-record.md";
const HEAD_SHA = "4b40ee183f649a2011adb40d6c3e00fa41be70dd";
const SHORT_HASH = "4b40ee1";
const LIVE_JS = "index-CZUJav8l.js";
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
  "=== v6.9G-B Authenticated Profile + Mobile Light Mode Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9G-B label", /v6\.9G-B/i.test(doc));
  ok("overall PARTIAL verdict", /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc));
  ok("head sha 4b40ee1", doc.includes(HEAD_SHA));
  ok("short hash 4b40ee1", doc.includes(SHORT_HASH));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("working tree clean", /working tree.*clean|Working tree.*clean/i.test(doc));
  ok("local equals origin", /origin\/feature\/chat-image-attachment-v1/i.test(doc));
  ok("staging url", doc.includes(STAGING_URL));
  ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("live js asset", doc.includes(LIVE_JS));
  ok("live css asset", doc.includes(LIVE_CSS));
  ok("no deploy needed", /Deploy needed.*NO|no deploy|Deploy performed.*NO/i.test(doc));
  ok("v69g-a asset match", /v6\.9G-A|match with v6\.9G-A/i.test(doc));

  ok(
    "member email length only",
    /NONGA_TEST_MEMBER_EMAIL.*len=19|len=19.*not logged/i.test(doc)
  );
  ok(
    "member uid length only",
    /NONGA_TEST_MEMBER_UID.*len=28|len=28.*not logged/i.test(doc)
  );
  ok("password env not present", /Password env vars.*Not present|password env vars not present/i.test(doc));
  ok(
    "oauth manual operator",
    /OAuth.*manual operator|requires.*manual operator interaction/i.test(doc)
  );
  ok(
    "automated login not possible",
    /Automated authenticated login.*Not possible|automated authenticated login not possible/i.test(doc)
  );
  ok(
    "no credentials logged",
    /Credentials.*not logged|no credentials.*logged|value \*\*not logged\*\*/i.test(doc)
  );

  ok("profile partial status", /\/profile.*PARTIAL|Status.*PARTIAL/i.test(doc));
  ok("route stayed profile", /Stays on.*\/profile|route stayed.*\/profile/i.test(doc));
  ok("auth gate visible", /auth gate|กรุณาเข้าสู่ระบบ/i.test(doc));
  ok("settingscard not verified", /SettingsCard.*Not verified|SettingsCard not verified/i.test(doc));
  ok("profile inputs not verified", /Profile name.*Not verified|profile inputs not verified/i.test(doc));
  ok("ai tone cards not verified", /AI tone cards.*Not verified|tone cards not verified/i.test(doc));
  ok("bordered panels not verified", /Bordered panels.*Not verified|bordered panels not verified/i.test(doc));
  ok(
    "signed-in dropdown not verified",
    /Signed-in profile dropdown.*Not verified|profile dropdown not verified/i.test(doc)
  );
  ok("no crash observed", /crash.*None|no crash observed/i.test(doc));
  ok(
    "no fake pass",
    /No fake pass|no fake pass|Fake pass for profile internals.*\*\*NO\*\*/i.test(doc)
  );

  ok("guest header state", /Guest header state|guest header state/i.test(doc));
  ok(
    "profile dropdown not testable",
    /Profile label.*Not testable|profile dropdown not testable/i.test(doc)
  );
  ok("header nav readable", /Header nav.*Readable|header nav.*readable/i.test(doc));
  ok("login cta text", doc.includes("เข้าสู่ระบบ AI"));
  ok("contrast 1.04", doc.includes("1.04:1"));
  ok(
    "pre-existing not v69f-a regression",
    /pre-existing pattern.*not v6\.9F-A|not v6\.9F-A regression/i.test(doc)
  );

  ok("mobile viewport 390x844", doc.includes("390×844"));
  ok("mobile drawer label", /Mobile drawer|mobile drawer/i.test(doc));
  ok("drawer opens closes", /Drawer opens|drawer opens/i.test(doc));
  ok("drawer header readable", /Header readable|header readable/i.test(doc));
  ok("inactive links readable", /Inactive drawer links.*Readable|inactive links readable/i.test(doc));
  ok("active link strong contrast", /Active link.*Strong contrast|active link strong contrast/i.test(doc));
  ok("login area present drawer", /Login area in drawer|login area present/i.test(doc));
  ok("no white on white", /White-on-white.*None|no white-on-white/i.test(doc));
  ok("no horizontal overflow", /Horizontal overflow.*None|no horizontal overflow/i.test(doc));
  ok("mobile drawer pass", /Mobile drawer overall.*PASS|mobile drawer overall PASS/i.test(doc));
  ok("contrast 2.47", doc.includes("2.47:1"));

  ok("regression car-vision pass", /\/car-vision.*PASS|`\/car-vision`/i.test(doc));
  ok("regression viral-captions pass", /\/viral-captions.*PASS|`\/viral-captions`/i.test(doc));
  ok("regression home trust pass", /\/home.*trust panel.*PASS|trust panel.*PASS/i.test(doc));

  ok("issue g-b-01", doc.includes("G-B-01"));
  ok("issue g-b-02", doc.includes("G-B-02"));
  ok("issue g-b-03", doc.includes("G-B-03"));
  ok("issue g-b-04", doc.includes("G-B-04"));
  ok("issue g-b-05", doc.includes("G-B-05"));
  ok("no p0 found", /No P0|no P0/i.test(doc));

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok("production not touched", /Production.*Not touched|Production not touched/i.test(doc));
  ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));
  ok("no deploy smoke", /Deploy.*NO|no deploy/i.test(doc));
  ok("no commit smoke", /Commit during smoke.*NO|no commit during smoke/i.test(doc));
  ok("no runtime code changes", /Runtime code changes.*NO|no runtime code changes/i.test(doc));

  ok(
    "next authenticated retry",
    /Authenticated profile smoke retry|authenticated profile smoke retry/i.test(doc)
  );
  ok("next v69h cta contrast", /v6\.9H|header\/drawer CTA contrast/i.test(doc));
  ok("next v69f-b dealer admin", /v6\.9F-B|dealer\/admin contrast/i.test(doc));

  ok(
    "package script registered",
    pkg.includes(
      "test:v69g-b-authenticated-profile-mobile-light-mode-smoke-execution-record"
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

console.log("\nDone v6.9G-B execution record tests.\n");

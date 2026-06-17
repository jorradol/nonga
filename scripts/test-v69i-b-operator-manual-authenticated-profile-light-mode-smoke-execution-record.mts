/**
 * v6.9I-B — Operator manual authenticated profile light mode smoke execution record
 * (static validation only)
 * npm run test:v69i-b-operator-manual-authenticated-profile-light-mode-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9I-B-operator-manual-authenticated-profile-light-mode-smoke-execution-record.md";
const HEAD_SHA = "700ece6b4518cb9b545f70b7ae1f9620d066d2eb";
const SHORT_HASH = "700ece6";
const LIVE_JS = "index-CbnVCCnG.js";
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
  "=== v6.9I-B Operator Manual Authenticated Profile Light Mode Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9I-B label", /v6\.9I-B/i.test(doc));
  ok("overall PARTIAL verdict", /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc));
  ok("head sha 700ece6", doc.includes(HEAD_SHA));
  ok("short hash 700ece6", doc.includes(SHORT_HASH));
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

  ok(
    "operator login unavailable",
    /Operator\/manual login.*Unavailable|operator\/manual login unavailable/i.test(doc)
  );
  ok(
    "no pre-authenticated session",
    /Pre-authenticated browser session.*None|pre-authenticated.*None/i.test(doc)
  );
  ok(
    "password env absent",
    /Password env vars.*Absent|password env vars.*absent/i.test(doc)
  );
  ok(
    "member email length only",
    /NONGA_TEST_MEMBER_EMAIL.*len=19|len=19.*not logged/i.test(doc)
  );
  ok(
    "member uid length only",
    /NONGA_TEST_MEMBER_UID.*len=28|len=28.*not logged/i.test(doc)
  );
  ok("login not performed", /Login performed.*NO|login performed.*NO/i.test(doc));
  ok(
    "no credentials logged",
    /Credentials.*not logged|no credentials.*logged|value \*\*not logged\*\*/i.test(doc)
  );

  ok("profile partial status", /\/profile.*PARTIAL|Status.*PARTIAL|Not verified/i.test(doc));
  ok("route stayed profile", /Stays on.*\/profile|route stayed.*\/profile|Route.*\/profile/i.test(doc));
  ok("no chat fallback", /no chat fallback|No chat fallback/i.test(doc));
  ok("auth gate visible", /auth gate|กรุณาเข้าสู่ระบบ/i.test(doc));
  ok("guest auth state", /Auth state.*Guest|guest session|auth state guest/i.test(doc));
  ok("settingscard not verified", /SettingsCard.*Not verified|SettingsCard not verified/i.test(doc));
  ok("profile inputs not verified", /Profile name.*Not verified|profile inputs not verified/i.test(doc));
  ok("ai tone cards not verified", /AI tone cards.*Not verified|tone cards not verified/i.test(doc));
  ok(
    "bordered panels not verified",
    /Bordered panels.*Not verified|bordered panels not verified/i.test(doc)
  );
  ok(
    "signed-in dropdown not verified",
    /Signed-in profile dropdown.*Not verified|profile dropdown not verified/i.test(doc)
  );
  ok("no crash observed", /crash.*None|no crash observed|No crash/i.test(doc));
  ok(
    "no fake pass",
    /No fake pass|no fake pass|Fake pass for profile internals.*\*\*NO\*\*/i.test(doc)
  );

  ok("routeguard mentioned", /RouteGuard/i.test(doc));
  ok("text-slate-200 finding", doc.includes("text-slate-200"));
  ok("guest header cta pass", /Guest header CTA.*PASS|header CTA.*PASS/i.test(doc));
  ok("desktop inactive nav readable", /Desktop inactive nav.*Readable|inactive nav.*readable/i.test(doc));
  ok("mobile drawer pass", /Mobile drawer.*PASS|mobile drawer.*PASS/i.test(doc));
  ok("no horizontal overflow", /Horizontal overflow.*None|no horizontal overflow/i.test(doc));

  ok(
    "signed-in chrome not verified",
    /Signed-in header.*Not verified|signed-in chrome.*not verified/i.test(doc)
  );
  ok(
    "signed-in mobile not testable",
    /Mobile signed-in.*Not testable|signed-in mobile.*Not testable/i.test(doc)
  );

  ok("regression home guest pass", /\/home.*PASS|`\/home`/i.test(doc));
  ok("regression car-vision pass", /\/car-vision.*PASS|`\/car-vision`/i.test(doc));
  ok("regression viral-captions pass", /\/viral-captions.*PASS|`\/viral-captions`/i.test(doc));
  ok(
    "guest sanity not signed-in pass",
    /do not count as signed-in|not signed-in pass|guest sanity only/i.test(doc)
  );

  ok("issue i-b-01", doc.includes("I-B-01"));
  ok("issue i-b-02", doc.includes("I-B-02"));
  ok("issue i-b-03", doc.includes("I-B-03"));
  ok("issue i-b-04", doc.includes("I-B-04"));
  ok("issue i-b-05", doc.includes("I-B-05"));
  ok("no p0 on guest", /No P0|no P0/i.test(doc));
  ok(
    "p0 cannot rule out authenticated",
    /P0 cannot be ruled out.*authenticated|cannot be ruled out.*authenticated profile/i.test(doc)
  );

  ok("owner backlog superadmin", /superadmin.*profile icon|Superadmin profile icon/i.test(doc));
  ok("owner backlog avatar", /avatar.*missing|profile icon\/avatar/i.test(doc));
  ok("v6.9j follow-up", doc.includes("v6.9J"));
  ok("do not patch v69i-b superadmin", /Do not mix into v6\.9I-B|do not patch in v6\.9I-B/i.test(doc));

  ok("no login firestore side effect", /lastLogin.*None|no login/i.test(doc));
  ok("no intentional writes", /Intentional writes.*None|no save.*tone.*avatar/i.test(doc));

  ok("next v69i-c routeguard", /v6\.9I-C|RouteGuard guest gate contrast/i.test(doc));
  ok("next v69j avatar audit", /v6\.9J.*Avatar|Superadmin Profile Icon/i.test(doc));
  ok(
    "next authenticated retry",
    /Authenticated profile smoke retry|authenticated profile smoke retry/i.test(doc)
  );

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok("production not touched", /Production.*Not touched|Production not touched/i.test(doc));
  ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));
  ok("no deploy smoke", /Deploy.*NO|no deploy/i.test(doc));
  ok("no commit smoke", /Commit during smoke.*NO|no commit during smoke/i.test(doc));
  ok("no runtime code changes", /Runtime code changes.*NO|no runtime code changes/i.test(doc));

  ok(
    "package script registered",
    pkg.includes(
      "test:v69i-b-operator-manual-authenticated-profile-light-mode-smoke-execution-record"
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

console.log("\nDone v6.9I-B execution record tests.\n");

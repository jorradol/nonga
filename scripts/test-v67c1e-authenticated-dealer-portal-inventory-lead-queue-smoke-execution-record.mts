/**
 * v6.7C-1-E — Authenticated dealer portal inventory lead queue smoke execution record
 * (static validation only)
 * npm run test:v67c1e-authenticated-dealer-portal-inventory-lead-queue-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.7C-1-E-authenticated-dealer-portal-inventory-lead-queue-smoke-execution-record.md";
const HEAD_SHA = "031e06d768e25bc83e2ba103d71f07bf11c55724";
const SHORT_HASH = "031e06d";
const LIVE_JS = "index-CtshoUt1.js";
const LIVE_CSS = "index-BTTuJqCy.css";
const STAGING_URL = "https://nonga-ce93c.web.app";
const CUSTOM_DOMAIN = "https://a.nongbot.org";
const STAGING_PROJECT = "nonga-ce93c";
const ROUTE_GUARD =
  "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ";

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
  "=== v6.7C-1-E Authenticated Dealer Portal Inventory Lead Queue Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.7C-1-E label", /v6\.7C-1-E/i.test(doc));
  ok(
    "overall PARTIAL verdict",
    /\*\*สถานะ:\*\*.*PARTIAL|Overall result.*PARTIAL/i.test(doc)
  );
  ok(
    "authenticated smoke not verified",
    /authenticated Dealer Portal inventory smoke.*not verified|NOT VERIFIED/i.test(
      doc
    )
  );
  ok(
    "no safe operator dealer session",
    /no safe operator\/dealer session|Safe authenticated dealer.*NO/i.test(doc)
  );
  ok(
    "not a fail rationale",
    /not a FAIL|Why not FAIL/i.test(doc)
  );
  ok("head sha 031e06d", doc.includes(HEAD_SHA));
  ok("short hash 031e06d", doc.includes(SHORT_HASH));
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
  ok("no deploy performed", /Deploy performed.*NO|no deploy/i.test(doc));

  ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("staging url", doc.includes(STAGING_URL));
  ok("custom domain a.nongbot.org", doc.includes(CUSTOM_DOMAIN));
  ok("live js asset CtshoUt1", doc.includes(LIVE_JS));
  ok("live css asset BTTuJqCy", doc.includes(LIVE_CSS));
  ok("live bundle js reference", doc.includes(`/assets/${LIVE_JS}`));
  ok("live bundle css reference", doc.includes(`/assets/${LIVE_CSS}`));

  ok(
    "browser tabs none signed in",
    /Browser tabs with existing signed-in session.*None|signed-in session.*None/i.test(
      doc
    )
  );
  ok(
    "staging dealer email not set",
    /NONGA_STAGING_DEALER_EMAIL.*not set/i.test(doc)
  );
  ok(
    "staging admin email not set",
    /NONGA_STAGING_ADMIN_EMAIL.*not set/i.test(doc)
  );
  ok(
    "staging member email not set",
    /NONGA_STAGING_MEMBER_EMAIL.*not set/i.test(doc)
  );
  ok(
    "no passwords requested",
    /Passwords requested.*NO|no passwords requested/i.test(doc)
  );
  ok(
    "no auth bypass",
    /Auth bypass attempted.*NO|no auth bypass/i.test(doc)
  );
  ok(
    "no tokens cookies session logged",
    /Tokens\/cookies\/session inspected or logged.*NO|not inspected or logged/i.test(
      doc
    )
  );

  ok(
    "guest dealer inventory 200",
    /\/dealer\/inventory.*200|HTTP.*200.*PASS/i.test(doc)
  );
  ok("route guard message", doc.includes(ROUTE_GUARD));
  ok(
    "guest login state header",
    /header.*login|เข้าสู่ระบบ/i.test(doc)
  );
  ok(
    "published cards not visible guest",
    /Published listing cards.*Not visible|not visible.*guest/i.test(doc)
  );
  ok(
    "inventory api not exercised",
    /Inventory API.*Not exercised|queue UI.*Not exercised/i.test(doc)
  );
  ok(
    "guest auth gate pass",
    /Guest.*auth gate.*PASS|auth gate.*PASS/i.test(doc)
  );

  ok(
    "listing lead queue section not verified",
    /ListingLeadQueueSection.*NOT VERIFIED|NOT VERIFIED.*ListingLeadQueueSection/i.test(
      doc
    )
  );
  ok(
    "sandbox crm not verified live",
    /Sandbox CRM.*NOT VERIFIED|NOT VERIFIED.*Sandbox CRM/i.test(doc)
  );
  ok(
    "buyer pii not exercised",
    /Buyer PII.*NOT EXERCISED|NOT EXERCISED/i.test(doc)
  );
  ok(
    "reveal skip not performed",
    /Reveal\/skip\/outcome.*NOT PERFORMED|NOT PERFORMED/i.test(doc)
  );

  ok(
    "primary blocker no safe session",
    /No safe operator\/dealer|no safe operator\/dealer\/admin session/i.test(doc)
  );
  ok(
    "no local staging credential env",
    /No local staging credential env|no local staging credential/i.test(doc)
  );
  ok(
    "no guest boundary regression",
    /None observed.*guest|guest boundary.*None/i.test(doc)
  );

  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run.*not touched/i.test(doc));
  ok("production not touched", /Production.*Not touched|Production deploy.*NO/i.test(doc));
  ok("firestore not touched", /Firestore.*Not touched|firestore.*not touched/i.test(doc));
  ok(
    "auth session routing not changed",
    /Auth.*Not changed|auth.*session.*Not changed/i.test(doc)
  );
  ok(
    "no aggregated dealer inbox gate",
    /No aggregated dealer inbox|no aggregated dealer inbox/i.test(doc)
  );
  ok(
    "parent thor group gap",
    /Parent Thor group|parent-group lead/i.test(doc)
  );
  ok(
    "thor runtime import blocked",
    /Thor Auto real runtime import.*blocked|Still blocked/i.test(doc)
  );
  ok(
    "thor not unblocked from partial",
    /Do not unblock Thor|runtime import unblocked.*NO/i.test(doc)
  );
  ok(
    "production pilot still NOT READY",
    /Production pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc)
  );
  ok(
    "not production-ready",
    /not production-ready|Not production-ready/i.test(doc)
  );
  ok(
    "not pilot-ready",
    /not pilot-ready|Not pilot-ready/i.test(doc)
  );
  ok(
    "recommended re-run when safe session",
    /Re-run.*v6\.7C-1-E|closure slice|safe authenticated dealer/i.test(doc)
  );
  ok(
    "prior v67c1d deploy record referenced",
    /v6\.7C-1-D|v67c1d/i.test(doc)
  );
  ok(
    "package script registered",
    pkg.includes(
      "test:v67c1e-authenticated-dealer-portal-inventory-lead-queue-smoke-execution-record"
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
  "\nDone v6.7C-1-E authenticated dealer portal inventory lead queue smoke execution record tests.\n"
);

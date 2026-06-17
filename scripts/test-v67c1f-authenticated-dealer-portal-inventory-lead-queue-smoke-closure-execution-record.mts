/**
 * v6.7C-1-F — Authenticated dealer portal inventory lead queue smoke closure
 * execution record (static validation only)
 * npm run test:v67c1f-authenticated-dealer-portal-inventory-lead-queue-smoke-closure-execution-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.7C-1-F-authenticated-dealer-portal-inventory-lead-queue-smoke-closure-execution-record.md";
const HEAD_SHA = "61dd07169dbbfe1933395bbce6c551ce8389670f";
const SHORT_HASH = "61dd071";
const LIVE_JS = "index-CtshoUt1.js";
const LIVE_CSS = "index-BTTuJqCy.css";
const STAGING_URL = "https://nonga-ce93c.web.app";
const CUSTOM_DOMAIN = "https://a.nongbot.org";
const STAGING_PROJECT = "nonga-ce93c";
const ROUTE_GUARD = "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /password\s*[=:]\s*['"][^'"]{3,}['"]/i,
  /session(?:Id|Cookie|Token)\s*[=:]\s*['"][^'"]{6,}['"]/i,
];

const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

/** Thai license-plate-like token, e.g. กก-1234 / 1กก2345 (synthetic leak guard). */
const PLATE_PATTERNS = [
  /[ก-ฮ]{1,2}[-\s]?\d{3,4}\b/,
  /\b\d[ก-ฮ]{2}\d{3,4}\b/,
];

/** 17-char VIN-like token guard. */
const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/;

const OVERCLAIM_PATTERNS = [
  /production-ready/i,
  /pilot-ready/i,
  /go\s+for\s+thor\s+runtime\s+import/i,
  /thor.*runtime\s+import.*unblocked\s*[:=]?\s*yes/i,
  /authenticated.*smoke.*PASS\b/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.7C-1-F Authenticated Dealer Portal Inventory Lead Queue Smoke Closure Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const pkg = readFileSync("package.json", "utf8");

// --- doc structure ---
ok("doc exists", doc.length > 2000);
ok("doc v6.7C-1-F label", /v6\.7C-1-F/i.test(doc));
ok("phase title smoke closure", /smoke closure/i.test(doc));
ok("head sha 61dd071", doc.includes(HEAD_SHA));
ok("short hash 61dd071", doc.includes(SHORT_HASH));
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline section", /## 2\. Baseline verification/i.test(doc));
ok("safe session status section", /## 3\. Safe session status/i.test(doc));
ok("guest re-verification section", /## 4\. Guest-safe staging re-verification/i.test(doc));
ok("authenticated operator section", /## 5\. Authenticated dealer smoke/i.test(doc));
ok("operator runbook section", /## 6\. Operator runbook/i.test(doc));
ok("expected proof section", /## 7\. Expected proof/i.test(doc));
ok("negative checks section", /## 8\. Negative checks/i.test(doc));
ok("safety confirmations section", /## 11\. Safety confirmations/i.test(doc));

// --- references prior PARTIAL ---
ok("references v6.7C-1-E partial", /v6\.7C-1-E.*PARTIAL|Prior slice.*PARTIAL/i.test(doc));
ok("references v6.7C-1-D deploy", /v6\.7C-1-D/i.test(doc));
ok("references v6.7C-1 patch", /v6\.7C-1 patch|d2ac583/i.test(doc));

// --- staging-only ---
ok("staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
ok("staging url", doc.includes(STAGING_URL));
ok("custom domain", doc.includes(CUSTOM_DOMAIN));
ok("staging-only stated", /staging-only|staging only|already live from v6\.7C-1-D/i.test(doc));
ok("live js asset", doc.includes(LIVE_JS));
ok("live css asset", doc.includes(LIVE_CSS));
ok("live bundle js reference", doc.includes(`/assets/${LIVE_JS}`));
ok("live bundle css reference", doc.includes(`/assets/${LIVE_CSS}`));

// --- authenticated dealer requirement ---
ok("authenticated dealer requirement", /authenticated.*dealer|dealer\/operator session/i.test(doc));
ok("safe session option A", /Option A.*manual browser|manual browser/i.test(doc));
ok("safe session option B", /Option B.*secure local|secure local env/i.test(doc));
ok(
  "operator action not agent",
  /operator action|OPERATOR ACTION REQUIRED|NOT VERIFIED \(agent\)/i.test(doc)
);
ok("route guard message present", doc.includes(ROUTE_GUARD));

// --- scoped proof expectation ---
ok(
  "dealer sees own scoped queue",
  /only their own|scoped|own listings/i.test(doc)
);
ok("listing lead queue section", /ListingLeadQueueSection/.test(doc));
ok("hidden listing omits queue", /[Hh]idden listing.*omit/i.test(doc));
ok("buyer pii masked before reveal", /masked.*before reveal|phone\/email.*masked/i.test(doc));

// --- negative checks ---
ok("no cross-dealer lead leak", /[Cc]ross-dealer lead leak/i.test(doc));
ok("no public unauth access", /[Pp]ublic\/unauthenticated access|unauth/i.test(doc));
ok("no raw pii leak check", /[Rr]aw buyer PII|raw PII/i.test(doc));
ok("no vin plate leak check", /VIN \/ license plate leak|VIN.*plate leak/i.test(doc));

// --- guest-safe evidence ---
ok("guest dealer inventory 200", /\/dealer\/inventory.*200|HTTP 200/i.test(doc));
ok("api cars 200", /\/api\/cars.*200|GET \/api\/cars/i.test(doc));
ok("bundle unchanged", /[Bb]undle unchanged|unchanged from v6\.7C-1-D/i.test(doc));

// --- no password/token/session in docs ---
ok("no passwords requested", /Passwords requested.*NO|never.*pasted in chat/i.test(doc));
ok("no auth bypass", /Auth bypass attempted.*NO|no auth bypass/i.test(doc));
ok(
  "no tokens cookies session logged",
  /[Tt]okens\/cookies\/session inspected or logged.*NO|never read or logged|never be pasted/i.test(
    doc
  )
);

// --- no production/deploy/import claims ---
ok("deploy performed no", /Deploy performed.*NO|no deploy/i.test(doc));
ok("cloud run not touched", /Cloud Run.*Not touched/i.test(doc));
ok("production not touched", /Production.*Not touched/i.test(doc));
ok("env secrets unchanged", /Env.*secrets.*Unchanged|env\/secrets.*Unchanged/i.test(doc));
ok("firestore not touched", /Firestore.*Not touched/i.test(doc));
ok("runtime code changes no", /Runtime code changes.*NO/i.test(doc));
ok("user-visible ai not enabled", /User-visible AI enabled.*NO/i.test(doc));
ok("public signup not opened", /Public signup opened.*NO/i.test(doc));

// --- thor remains blocked ---
ok("thor runtime import blocked", /Thor Auto runtime import.*BLOCKED|Still blocked/i.test(doc));
ok("thor not unblocked", /Thor Auto runtime import unblocked.*NO|not unblock Thor/i.test(doc));
ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));

// --- verdict not over-claiming ---
ok(
  "verdict partial operator action",
  /PARTIAL — OPERATOR ACTION REQUIRED|PARTIAL -- OPERATOR ACTION REQUIRED/i.test(
    doc
  )
);
ok(
  "not a fail rationale",
  /not a FAIL|Why not FAIL/i.test(doc)
);
ok("claims production-ready no", /Claims production-ready.*NO/i.test(doc));
ok("claims pilot-ready no", /Claims pilot-ready.*NO/i.test(doc));

// --- over-claim guard: these phrases only allowed in explicit negation context ---
for (const pattern of OVERCLAIM_PATTERNS) {
  const matches = doc.match(new RegExp(pattern, "gi")) ?? [];
  // allow when each occurrence sits on a line that also negates it
  const lines = doc.split(/\r?\n/);
  const badLines = lines.filter(
    (ln) =>
      pattern.test(ln) &&
      !/\b(no|not|never|nicht|ห้าม|ยัง|blocked|NOT READY|ไม่|remains)\b/i.test(ln) &&
      !/ไม่|ยัง|ห้าม/.test(ln)
  );
  ok(`overclaim guarded ${pattern}`, badLines.length === 0, badLines[0] ?? "");
}

// --- secrets / PII / VIN / plate in doc ---
for (const pattern of SECRET_PATTERNS) {
  ok(`no secret pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PII_PATTERNS) {
  ok(`no pii pattern ${pattern}`, !pattern.test(doc));
}
ok("no vin-like token", !VIN_PATTERN.test(doc));
for (const pattern of PLATE_PATTERNS) {
  // Allow synthetic example plate explicitly marked as masked example only if absent.
  ok(`no plate-like token ${pattern}`, !pattern.test(doc));
}
ok(
  "no raw code/output dump",
  !/```[\s\S]{400,}```/.test(doc)
);

// --- package script ---
ok(
  "package script registered",
  pkg.includes(
    "test:v67c1f-authenticated-dealer-portal-inventory-lead-queue-smoke-closure-execution-record"
  )
);

console.log(
  "\nDone v6.7C-1-F authenticated dealer portal inventory lead queue smoke closure execution record tests.\n"
);

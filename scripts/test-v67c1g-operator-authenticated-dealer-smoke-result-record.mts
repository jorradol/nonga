/**
 * v6.7C-1-G — Operator authenticated dealer smoke result record
 * (static validation only)
 * npm run test:v67c1g-operator-authenticated-dealer-smoke-result-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.7C-1-G-operator-authenticated-dealer-smoke-result-record.md";
const HEAD_SHA = "fd0526865a70c1695080bcf7d4fcb5a1cb106a24";
const SHORT_HASH = "fd05268";
const STAGING_URL = "https://nonga-ce93c.web.app";
const STAGING_PROJECT = "nonga-ce93c";
const LIVE_JS = "index-CtshoUt1.js";
const LIVE_CSS = "index-BTTuJqCy.css";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /password\s*[=:]\s*['"][^'"]{3,}['"]/i,
  /session(?:Id|Cookie|Token)\s*[=:]\s*['"][^'"]{6,}['"]/i,
  /cookie\s*[=:]\s*['"][^'"]{6,}['"]/i,
];

const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

/** Thai license-plate-like token guard. */
const PLATE_PATTERNS = [
  /[ก-ฮ]{1,2}[-\s]?\d{3,4}\b/,
  /\b\d[ก-ฮ]{2}\d{3,4}\b/,
];

/** 17-char VIN-like token guard. */
const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/;

/** Over-claim guard: only allowed when the line also negates. */
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
  "=== v6.7C-1-G Operator Authenticated Dealer Smoke Result Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 2000);
ok("doc v6.7C-1-G label", /v6\.7C-1-G/i.test(doc));
ok(
  "phase title operator smoke result",
  /Operator Authenticated Dealer Smoke Result Record/i.test(doc)
);
ok("head sha fd05268", doc.includes(HEAD_SHA));
ok("short hash fd05268", doc.includes(SHORT_HASH));
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline section", /## 2\. Baseline verification/i.test(doc));
ok("operator boundary section", /## 3\. Operator action boundary/i.test(doc));
ok("safe evidence format section", /## 4\. Safe evidence format/i.test(doc));
ok("expected proof section", /## 5\. Expected proof/i.test(doc));
ok("negative checks section", /## 6\. Negative checks/i.test(doc));
ok("result entry section", /## 7\. Result entry/i.test(doc));
ok("safety confirmations section", /## 9\. Safety confirmations/i.test(doc));

// --- references v6.7C-1-F ---
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok(
  "references runbook operator base",
  /runbook\/operator-action base|operator runbook/i.test(doc)
);

// --- staging URL ---
ok("staging url present", doc.includes(STAGING_URL));
ok("staging project present", doc.includes(STAGING_PROJECT));
ok("live js asset", doc.includes(LIVE_JS));
ok("live css asset", doc.includes(LIVE_CSS));

// --- safe evidence format ---
ok("safe evidence non-pii", /non-PII/i.test(doc));
ok("evidence pass fail format", /PASS\/FAIL|PASS\/FAIL\/NA/i.test(doc));
ok("forbidden buyer pii listed", /Buyer phone\/email\/name|buyer.*PII/i.test(doc));
ok("forbidden plate vin listed", /License plate \/ VIN|plate.*VIN/i.test(doc));
ok("forbidden credential listed", /Session token \/ cookie \/ password|credential/i.test(doc));

// --- expected proof EP-01..EP-07 ---
for (let i = 1; i <= 7; i++) {
  const id = `EP-0${i}`;
  ok(`expected proof ${id}`, doc.includes(id));
}
ok("ep01 login session valid", /EP-01.*[Ll]ogin\/session valid|Login\/session valid/i.test(doc));
ok("ep02 inventory page loads", /EP-02.*page loads|inventory page loads/i.test(doc));
ok("ep03 lead queue scoped", /EP-03.*queue visible.*scoped|scoped dealer\/listing/i.test(doc));
ok("ep04 masked before reveal", /EP-04.*[Mm]asked.*before.*reveal|remain masked/i.test(doc));
ok("ep05 controls scoped", /EP-05.*scoped correctly|controls scoped/i.test(doc));
ok("ep06 no cross-dealer leak", /EP-06.*cross-dealer\/owner lead leak|No cross-dealer/i.test(doc));
ok("ep07 guest path safe", /EP-07.*[Uu]nauth\/guest path|guest path remains/i.test(doc));

// --- negative checks NC-01..NC-06 ---
for (let i = 1; i <= 6; i++) {
  const id = `NC-0${i}`;
  ok(`negative check ${id}`, doc.includes(id));
}
ok("nc01 no credential recorded", /NC-01.*password\/token\/session|No password\/token\/session/i.test(doc));
ok("nc02 no buyer raw contact", /NC-02.*buyer raw contact|No buyer raw contact/i.test(doc));
ok("nc03 no plate vin", /NC-03.*plate\/VIN|No plate\/VIN/i.test(doc));
ok("nc04 no prod deploy env", /NC-04.*production\/deploy\/env|No production\/deploy\/env/i.test(doc));
ok("nc05 no thor import", /NC-05.*Thor runtime import|No Thor runtime import/i.test(doc));
ok("nc06 no overclaim", /NC-06.*over-claiming production-ready|No over-claiming/i.test(doc));

// --- no credentials/session/token/password in doc ---
ok("no agent login", /Agent login performed.*NO|Agent login \/ credential read.*NO|Agent performs login.*NO/i.test(doc));
ok(
  "passwords not requested",
  /Passwords\/tokens\/sessions requested.*NO|FORBIDDEN/i.test(doc)
);
ok("auth bypass no", /Auth bypass attempted.*NO/i.test(doc));

// --- no deploy/production/env/firestore/import claims ---
ok("deploy performed no", /Deploy performed.*NO/i.test(doc));
ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run deploy.*NO/i.test(doc));
ok("production not touched", /Production.*Not touched/i.test(doc));
ok("env secrets unchanged", /Env.*secrets.*Unchanged|env\/secrets.*Unchanged/i.test(doc));
ok("firestore not touched", /Firestore write from agent.*Not touched|Firestore.*Not touched/i.test(doc));
ok("runtime code changes no", /Runtime code changes.*NO/i.test(doc));
ok("user-visible ai no", /User-visible AI enabled.*NO/i.test(doc));
ok("public signup no", /Public signup opened.*NO/i.test(doc));

// --- thor remains blocked ---
ok("thor runtime import blocked", /Thor Auto runtime import.*BLOCKED|Still blocked/i.test(doc));
ok("thor not unblocked", /Thor Auto runtime import unblocked.*NO|Unblock Thor from this record.*NO/i.test(doc));
ok("production pilot not ready", /Production pilot.*NOT READY|NOT READY/i.test(doc));

// --- verdict not over-claiming ---
ok(
  "verdict awaiting operator result",
  /PARTIAL — AWAITING OPERATOR RESULT|PARTIAL -- AWAITING OPERATOR RESULT/i.test(
    doc
  )
);
ok("operator result not supplied", /Operator result supplied.*NO|template\/shell only/i.test(doc));
ok("claims production-ready no", /Claims production-ready.*NO/i.test(doc));
ok("claims pilot-ready no", /Claims pilot-ready.*NO/i.test(doc));

for (const pattern of OVERCLAIM_PATTERNS) {
  const lines = doc.split(/\r?\n/);
  const badLines = lines.filter(
    (ln) =>
      pattern.test(ln) &&
      !/\b(no|not|never|blocked|NOT READY|remains|pending|forbidden|until|only if)\b/i.test(
        ln
      ) &&
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
  ok(`no plate-like token ${pattern}`, !pattern.test(doc));
}
ok("no raw code/output dump", !/```[\s\S]{400,}```/.test(doc));

// --- package script ---
ok(
  "package script registered",
  pkg.includes("test:v67c1g-operator-authenticated-dealer-smoke-result-record")
);

console.log(
  "\nDone v6.7C-1-G operator authenticated dealer smoke result record tests.\n"
);

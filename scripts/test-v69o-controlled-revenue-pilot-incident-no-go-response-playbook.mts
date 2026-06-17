/**
 * v6.9O — Controlled Revenue Pilot Incident / No-Go Response Playbook
 * (static validation only)
 * npm run test:v69o-controlled-revenue-pilot-incident-no-go-response-playbook
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9O-controlled-revenue-pilot-incident-no-go-response-playbook.md";

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

/** Phone/email-like PII guard. */
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

/** Over-claim guard: only flagged when the line does NOT negate. */
const OVERCLAIM_PATTERNS = [
  /production-ready/i,
  /pilot-ready/i,
  /go\s+for\s+thor\s+runtime\s+import/i,
  /thor.*runtime\s+import.*unblocked\s*[:=]?\s*yes/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.9O Controlled Revenue Pilot Incident / No-Go Response Playbook ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9O", /v6\.9O/i.test(doc));
ok(
  "phase title incident no-go response playbook",
  /Controlled Revenue Pilot Incident \/ No-Go Response Playbook/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 118100b", doc.includes("118100b"));

// --- verdict ---
ok(
  "verdict INCIDENT PLAYBOOK ONLY",
  /PARTIAL — INCIDENT PLAYBOOK ONLY|PARTIAL -- INCIDENT PLAYBOOK ONLY/i.test(doc)
);

// --- references to dependent phases ---
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9N", /v6\.9N/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("incident severity levels section", /Incident severity levels/i.test(doc));
ok("no-go triggers section", /No-go triggers/i.test(doc));
ok("immediate stop procedure section", /Immediate stop procedure/i.test(doc));
ok("evidence handling rules section", /Evidence handling rules/i.test(doc));
ok(
  "privacy-safe incident log format section",
  /Privacy-safe incident log format/i.test(doc)
);
ok("escalation path section", /Escalation path/i.test(doc));
ok("recovery/resume criteria section", /Recovery \/ resume criteria/i.test(doc));
ok("owner approval requirement section", /Owner approval requirement/i.test(doc));
ok(
  "relation section",
  /Relation to v6\.9M, v6\.7C-1-F, v6\.7C-1-G, v6\.9N/i.test(doc)
);
ok("next slices section", /Next slices/i.test(doc));

// --- severity SEV-0 .. SEV-3 ---
for (let i = 0; i <= 3; i++) {
  ok(`severity SEV-${i}`, doc.includes(`SEV-${i}`));
}
ok("sev-0 critical", /SEV-0.*Critical|Critical.*SEV-0/i.test(doc));
ok("sev-1 high", /SEV-1.*High|High.*SEV-1/i.test(doc));
ok("sev-2 medium", /SEV-2.*Medium|Medium.*SEV-2/i.test(doc));
ok("sev-3 low", /SEV-3.*Low|Low.*SEV-3/i.test(doc));

// --- no-go triggers NG-01..NG-12 ---
for (let i = 1; i <= 12; i++) {
  const id = i < 10 ? `NG-0${i}` : `NG-${i}`;
  ok(`no-go trigger ${id}`, doc.includes(id));
}
ok("trigger cross-dealer leak", /cross-dealer.*lead leak/i.test(doc));
ok("trigger raw pii before reveal", /raw PII visible before authorized reveal/i.test(doc));
ok("trigger buyer contact exposed", /buyer phone \/ email \/ raw contact exposed/i.test(doc));
ok("trigger plate/vin not allowed", /plate \/ VIN visible where not allowed/i.test(doc));
ok("trigger unauth queue access", /unauth \/ guest can access queue \/ lead detail/i.test(doc));
ok("trigger dealer outside scope", /dealer sees listing \/ lead outside scope/i.test(doc));
ok("trigger mutation outside scope", /reveal \/ skip \/ outcome mutation works outside allowed scope/i.test(doc));
ok("trigger env import touched", /env \/ secrets \/ deploy \/ runtime \/ import touched without approval/i.test(doc));
ok("trigger thor gate not approved", /Thor owner gate not approved/i.test(doc));
ok("trigger smoke not pass", /operator authenticated smoke not PASS/i.test(doc));
ok("trigger monitor needs pii", /lead monitor cannot be maintained without PII/i.test(doc));
ok("trigger credential appears", /credential \/ session \/ token \/ cookie appears in repo \/ chat/i.test(doc));

// --- immediate stop procedure steps ---
ok("stop pilot action", /stop pilot action/i.test(doc));
ok("do not reveal more leads", /do not reveal more leads/i.test(doc));
ok("do not import thor data", /do not import Thor data/i.test(doc));
ok("do not deploy quick fix", /do not deploy quick fix without approval/i.test(doc));
ok("collect non-pii evidence", /collect only non-PII evidence/i.test(doc));
ok("record counts status only", /record counts \/ status only/i.test(doc));
ok("escalate to owner/operator", /escalate to owner \/ operator/i.test(doc));
ok("open follow-up slice", /open follow-up fix \/ audit slice before resume/i.test(doc));

// --- evidence handling (privacy-safe) ---
ok(
  "no credential rule",
  /password \/ token \/ session \/ cookie|agent login หรือดู credential|Agent login \/ credential read.*NO/i.test(
    doc
  )
);
ok(
  "no real name phone email rule",
  /ชื่อจริง เบอร์โทร อีเมล raw contact/i.test(doc)
);
ok("no plate/vin rule", /บันทึก plate \/ VIN/i.test(doc));
ok("count/status/anonymized only", /count \/ status \/ anonymized labels เท่านั้น/i.test(doc));
ok("screenshot redact rule", /screenshot.*redact PII ก่อนเข้า repo/i.test(doc));

// --- recovery/resume criteria ---
ok("root cause identified", /root cause identified/i.test(doc));
ok("fix mitigation documented", /fix or mitigation documented/i.test(doc));
ok("static validation updated", /static validation updated/i.test(doc));
ok("staging smoke re-run", /staging smoke re-run if relevant/i.test(doc));
ok("operator result updated", /operator result updated \(non-PII\)|operator result updated/i.test(doc));
ok("owner approval confirmed", /owner approval confirmed/i.test(doc));
ok(
  "thor blocked until gates pass",
  /Thor runtime import remains blocked until all gates pass/i.test(doc)
);

// --- escalation owner/operator ---
ok(
  "owner operator escalation",
  /Owner \(ลุงเด่น\)/i.test(doc) && /Operator\/admin/i.test(doc)
);

// --- no deploy/production/env/firestore/runtime/import ---
ok("no deploy rule", /Deploy performed.*NO|Deploy.*\*\*NO\*\*/i.test(doc));
ok("no production rule", /Production.*Not touched/i.test(doc));
ok("no env rule", /Env \/ secrets \/ deploy config.*Unchanged/i.test(doc));
ok(
  "no firestore rule",
  /Firestore write from agent.*Not touched|Real lead created\/edited in Firestore.*NO/i.test(
    doc
  )
);
ok("no runtime rule", /Runtime code changes.*NO/i.test(doc));
ok("no thor import rule", /Thor data imported.*NO/i.test(doc));
ok("no agent lead mutation rule", /agent สร้าง\/แก้ lead จริงใน Firestore|Real lead created\/edited in Firestore.*NO/i.test(doc));

// --- Thor remains blocked ---
ok(
  "thor runtime import blocked",
  /Thor.*runtime import.*BLOCKED|Thor runtime import ยัง.*BLOCKED|remains blocked/i.test(
    doc
  )
);
ok(
  "thor not unblocked",
  /Thor Auto runtime import unblocked.*NO|Thor runtime import approved.*NO.*BLOCKED/i.test(
    doc
  )
);

// --- not GO / not production-ready / not pilot-ready / not deploy / not revenue pilot ---
ok(
  "not go for thor runtime import",
  /GO FOR THOR RUNTIME IMPORT.*NO|ไม่ใช่.*GO FOR THOR RUNTIME IMPORT|This is NOT GO FOR THOR RUNTIME IMPORT/i.test(
    doc
  )
);
ok("claims production-ready no", /Claims production-ready.*NO|Production-ready.*NO/i.test(doc));
ok("claims pilot-ready no", /Claims pilot-ready.*NO|Pilot-ready.*NO/i.test(doc));
ok("revenue pilot not opened", /Revenue pilot opened.*NO|เปิด revenue pilot.*NO/i.test(doc));

// --- awaiting operator smoke + owner approval ---
ok(
  "awaiting operator authenticated smoke",
  /รอ operator authenticated smoke result|AWAITING OPERATOR RESULT/i.test(doc)
);
ok(
  "awaiting owner approval",
  /รอ owner approval|Owner approves.*PENDING/i.test(doc)
);

// --- over-claim guard (line-level, allow negated lines) ---
const lines = doc.split(/\r?\n/);
for (const pattern of OVERCLAIM_PATTERNS) {
  const badLines = lines.filter(
    (ln) =>
      pattern.test(ln) &&
      !/\b(no|not|never|blocked|NOT READY|remains|pending|forbidden|until|only if|ยังไม่)\b/i.test(
        ln
      ) &&
      !/ไม่|ยัง|ห้าม/.test(ln)
  );
  ok(`overclaim guarded ${pattern}`, badLines.length === 0, badLines[0] ?? "");
}

// --- no secret / PII / plate / VIN tokens in doc ---
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
  pkg.includes(
    "test:v69o-controlled-revenue-pilot-incident-no-go-response-playbook"
  )
);

console.log(
  "\nDone v6.9O controlled revenue pilot incident / no-go response playbook tests.\n"
);

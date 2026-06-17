/**
 * v6.9N — Controlled Revenue Pilot Ops SOP + Lead Monitor Skeleton
 * (static validation only)
 * npm run test:v69n-controlled-revenue-pilot-ops-sop-lead-monitor-skeleton
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9N-controlled-revenue-pilot-ops-sop-lead-monitor-skeleton.md";

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
  "=== v6.9N Controlled Revenue Pilot Ops SOP + Lead Monitor Skeleton ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9N", /v6\.9N/i.test(doc));
ok(
  "phase title controlled revenue pilot ops sop",
  /Controlled Revenue Pilot Ops SOP \+ Lead Monitor Skeleton/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 736c63c", doc.includes("736c63c"));

// --- verdict ---
ok(
  "verdict SOP SKELETON ONLY",
  /PARTIAL — SOP SKELETON ONLY|PARTIAL -- SOP SKELETON ONLY/i.test(doc)
);

// --- references to dependent phases ---
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "what this sop does/does not section",
  /What this SOP does \/ does not do|does not do/i.test(doc)
);
ok(
  "lead intake workflow section",
  /Lead intake workflow/i.test(doc)
);
ok("lead monitor fields section", /Lead monitor fields/i.test(doc));
ok(
  "daily/weekly checklist section",
  /Daily \/ weekly operator checklist|Daily \/ weekly/i.test(doc)
);
ok(
  "incident/no-go triggers section",
  /Incident \/ no-go triggers|no-go triggers/i.test(doc)
);
ok("escalation path section", /Escalation path/i.test(doc));
ok("evidence format section", /Evidence format/i.test(doc));
ok("owner approval section", /Owner approval/i.test(doc));
ok("next slices section", /Next slices/i.test(doc));

// --- admin-assisted workflow ---
ok("admin-assisted mentioned", /admin-assisted/i.test(doc));
ok(
  "safe flow queue -> masking -> scoped -> count",
  /queue/i.test(doc) &&
    /masking/i.test(doc) &&
    /scope/i.test(doc) &&
    /count\/status/i.test(doc)
);

// --- lead monitor non-PII fields ---
const MONITOR_FIELDS = [
  "date",
  "environment",
  "dealer_scope_label",
  "listing_count_checked",
  "lead_rows_observed_count",
  "masked_rows_count",
  "reveal_attempts_count",
  "skip_outcome_attempts_count",
  "anomalies_count",
  "incident_flag",
  "operator_initials_role",
  "notes",
];
for (const field of MONITOR_FIELDS) {
  ok(`monitor field ${field}`, doc.includes(field));
}
ok("monitor fields non-PII labelled", /non-PII/i.test(doc));

// --- no-go triggers NG-01..NG-08 ---
for (let i = 1; i <= 8; i++) {
  const id = `NG-0${i}`;
  ok(`no-go trigger ${id}`, doc.includes(id));
}
ok("trigger cross-dealer leak", /cross-dealer lead leak/i.test(doc));
ok("trigger raw pii before reveal", /raw PII.*before.*reveal|raw PII ก่อน reveal/i.test(doc));
ok("trigger plate/vin leak", /plate \/ VIN leak|plate\/VIN leak/i.test(doc));
ok("trigger unauth/guest queue", /unauth.*guest.*queue|guest.*เห็น.*queue/i.test(doc));
ok("trigger dealer out of scope", /นอก scope|out of scope/i.test(doc));
ok("trigger env/deploy/runtime/import untouched", /env \/ deploy \/ runtime \/ import|env\/deploy\/runtime\/import/i.test(doc));
ok("trigger thor owner gate not approved", /Thor owner gate ยังไม่ approve|owner gate.*not approve/i.test(doc));
ok("trigger authenticated smoke not pass", /authenticated smoke ยังไม่ PASS|authenticated smoke.*not.*PASS/i.test(doc));

// --- no credential/session/password/token rule ---
ok(
  "no credential rule",
  /agent ห้าม login|Agent login \/ credential read.*NO|ไม่อ่าน credential|credential read.*NO/i.test(
    doc
  )
);
ok(
  "no password/token/session/cookie rule",
  /passwords?, tokens?, session cookies?|Session token \/ cookie \/ password|password.*token.*session/i.test(
    doc
  )
);

// --- no PII / raw contact / plate / VIN rule ---
ok(
  "no PII raw contact rule",
  /ห้ามบันทึก.*เบอร์โทร.*อีเมล|raw lead contact|Buyer phone \/ email \/ name/i.test(
    doc
  )
);
ok(
  "no plate/VIN rule",
  /plate VIN|plate \/ VIN|License plate \/ VIN/i.test(doc)
);

// --- no deploy/production/env/firestore/runtime/import rule ---
ok("no deploy rule", /Deploy performed.*NO|ไม่.*deploy|Not touched/i.test(doc));
ok("no production rule", /Production.*Not touched|production-ready.*NO/i.test(doc));
ok("no env rule", /Env.*secrets.*Unchanged|ไม่แก้ env/i.test(doc));
ok(
  "no firestore rule",
  /Firestore write from agent.*Not touched|ไม่.*เขียน Firestore|Real lead created\/edited in Firestore.*NO/i.test(
    doc
  )
);
ok("no runtime rule", /Runtime code changes.*NO|ไม่เปลี่ยน runtime code/i.test(doc));
ok(
  "no thor import rule",
  /Thor data imported.*NO|ไม่ import Thor|Thor data.*Not touched/i.test(doc)
);
ok(
  "no agent lead mutation rule",
  /agent ห้ามสร้าง\/แก้ lead จริง|Real lead created\/edited in Firestore.*NO|agent.*create.*edit.*lead.*Firestore/i.test(
    doc
  )
);

// --- Thor remains blocked ---
ok(
  "thor runtime import blocked",
  /Thor.*runtime import.*BLOCKED|Thor runtime import ยัง.*BLOCKED|remains BLOCKED/i.test(
    doc
  )
);
ok(
  "thor not unblocked",
  /Thor Auto runtime import unblocked.*NO|Thor runtime import approved.*NO.*BLOCKED/i.test(
    doc
  )
);

// --- not GO / not production-ready / not pilot-ready ---
ok(
  "not go for thor runtime import",
  /GO FOR THOR RUNTIME IMPORT.*NO|ไม่ใช่.*GO FOR THOR RUNTIME IMPORT|This is NOT GO FOR THOR RUNTIME IMPORT/i.test(
    doc
  )
);
ok("claims production-ready no", /Claims production-ready.*NO|Production-ready.*NO/i.test(doc));
ok("claims pilot-ready no", /Claims pilot-ready.*NO|Pilot-ready.*NO/i.test(doc));

// --- awaiting operator smoke + owner approval ---
ok(
  "awaiting operator authenticated smoke",
  /รอ operator authenticated smoke result|AWAITING OPERATOR RESULT/i.test(doc)
);
ok(
  "awaiting owner approval",
  /รอ owner approval|owner approval.*PENDING|Owner approves.*PENDING/i.test(doc)
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
    "test:v69n-controlled-revenue-pilot-ops-sop-lead-monitor-skeleton"
  )
);

console.log(
  "\nDone v6.9N controlled revenue pilot ops SOP + lead monitor skeleton tests.\n"
);

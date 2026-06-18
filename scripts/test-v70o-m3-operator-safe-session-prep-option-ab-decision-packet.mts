/**
 * v7.0O — M-3 Operator Safe Session Prep / Option A-B Decision Packet
 * (static validation only)
 * npm run test:v70o-m3-operator-safe-session-prep-option-ab-decision-packet
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0O-m3-operator-safe-session-prep-option-ab-decision-packet.md";

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
  /revenue\s+(pilot\s+)?GO/i,
  /go\s+for\s+thor\s+runtime\s+import/i,
  /thor.*runtime\s+import.*unblocked\s*[:=]?\s*yes/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v7.0O M-3 Operator Safe Session Prep / Option A-B Decision Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0O", /v7\.0O/i.test(doc));
ok(
  "phase title m3 safe session prep / option a-b",
  /M-3 Operator Safe Session Prep \/ Option A-B Decision Packet/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline a3a87dd", doc.includes("a3a87dd"));

// --- verdict ---
ok(
  "verdict M-3 OPTION A-B DECISION PACKET ONLY",
  /PARTIAL — M-3 OPERATOR SAFE SESSION PREP \/ OPTION A-B DECISION PACKET ONLY|PARTIAL -- M-3 OPERATOR SAFE SESSION PREP \/ OPTION A-B DECISION PACKET ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v7.0K", /v7\.0K/i.test(doc));
ok("references v7.0L", /v7\.0L/i.test(doc));
ok("references v7.0M", /v7\.0M/i.test(doc));
ok("references v7.0N", /v7\.0N/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why m3 prep only section",
  /Why this is M-3 safe session prep \/ decision packet only/i.test(doc)
);
ok(
  "source chain section",
  /Source chain: v7\.0K \/ v7\.0L \/ v7\.0M \/ v7\.0N/i.test(doc)
);
ok("target step section", /Target step: M-3 operator safe session/i.test(doc));
ok(
  "option a/b decision frame section",
  /Option A\/B decision frame/i.test(doc)
);
ok("safe session constraints section", /Safe session constraints/i.test(doc));
ok(
  "allowed vs forbidden evidence section",
  /Allowed evidence vs forbidden evidence/i.test(doc)
);
ok(
  "credential/session prohibition section",
  /Credential\/session prohibition/i.test(doc)
);
ok("no-go/abort conditions section", /No-go \/ abort conditions/i.test(doc));
ok("future slice boundary section", /Future slice boundary/i.test(doc));
ok("what this m3 prep allows section", /What this M-3 prep allows/i.test(doc));
ok(
  "what this m3 prep does not allow section",
  /What this M-3 prep does not allow/i.test(doc)
);
ok("relationship to v7.0N section", /Relationship to v7\.0N/i.test(doc));
ok(
  "relationship to v6.7C-1-F section",
  /Relationship to v6\.7C-1-F \/ v6\.7C-1-G/i.test(doc)
);
ok(
  "missing items before actual smoke section",
  /Missing items before actual smoke execution/i.test(doc)
);
ok(
  "missing items before thor import section",
  /Missing items before Thor runtime import/i.test(doc)
);
ok(
  "missing items before gemini pilot section",
  /Missing items before Gemini user-visible pilot/i.test(doc)
);
ok("safety confirmations section", /Safety confirmations/i.test(doc));
ok("next slices section", /Next slices/i.test(doc));

// --- Option A/B decision frame content ---
ok("option A present", /Option A/i.test(doc));
ok("option B present", /Option B/i.test(doc));
ok(
  "option a/b per v6.7C-1-F §6",
  /per v6\.7C-1-F §6|v6\.7C-1-F §6/i.test(doc)
);
ok(
  "option a/b decision/prep only",
  /Option A\/B[^\n]*decision\/prep เท่านั้น|Option A\/B เป็น \*\*decision\/prep เท่านั้น\*\*/i.test(
    doc
  )
);
ok(
  "option not selected",
  /Option ที่เลือกแล้ว[^\n]*NONE|การเลือก Option[^\n]*PENDING/i.test(doc)
);

// --- M-3 target & status ---
ok(
  "m3 target step",
  /Target step[^\n]*M-3|M-3[^\n]*operator safe session available/i.test(doc)
);
ok(
  "m3 prep not closed",
  /PREP \/ OPTION DECISION FRAME ONLY|M-3 ยัง[^\n]*ไม่ปิด|M-3 not closed/i.test(
    doc
  )
);
ok(
  "m3 goal prepare safe session before login",
  /เตรียมกติกา session ให้ปลอดภัยก่อน operator login จริง/i.test(doc)
);

// --- safe session constraints ---
ok(
  "no store credential in repo/report",
  /ห้ามเก็บ credential\/session\/cookie\/token\/password ใน repo หรือรายงาน|Credential\/session\/token stored in repo\/report.*NO/i.test(
    doc
  )
);
ok("staging only constraint", /staging only|staging URL เท่านั้น/i.test(doc));

// --- allowed vs forbidden evidence ---
ok("allowed evidence non-pii", /Allowed[^\n]*non-PII/i.test(doc));
ok("forbidden credential evidence", /Forbidden[^\n]*credential/i.test(doc));
ok("forbidden screenshot evidence", /Forbidden[^\n]*screenshot/i.test(doc));

// --- abort conditions AB-1..AB-7 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-7/.test(doc));
ok(
  "abort on pii/lead leak/cross-dealer",
  /หากพบ PII \/ lead leak \/ cross-dealer leak[^\n]*abort|abort.*PII.*lead leak.*cross-dealer/i.test(
    doc
  )
);

// --- AS-01..AS-09 range + PENDING / NOT RUN ---
ok("result range AS-01..AS-09 referenced", /AS-01\.\.AS-09/.test(doc));
ok(
  "result table pending status",
  /Result table AS-01\.\.AS-09[^\n]*PENDING \/ NOT RUN/i.test(doc)
);

// --- IN-1..IN-10 range + NOT RUN ---
ok("evidence intake range IN-1..IN-10 referenced", /IN-1\.\.IN-10/.test(doc));
ok(
  "evidence intake not run status",
  /Evidence intake IN-1\.\.IN-10[^\n]*NOT RUN/i.test(doc)
);

// --- Firestore write NOT PERFORMED ---
ok(
  "firestore write not performed",
  /Firestore write confirmation[^\n]*NOT PERFORMED|Firestore write[^\n]*NOT PERFORMED/i.test(
    doc
  )
);

// --- future slice boundary content ---
ok(
  "future slice may close m3 option",
  /next slice may close M-3 option decision/i.test(doc)
);
ok(
  "future slice may prepare actual execution",
  /next slice may prepare actual smoke execution/i.test(doc)
);
ok(
  "actual execution must be separate",
  /actual authenticated smoke execution must be separate/i.test(doc)
);
ok(
  "actual execution not capture secrets/pii",
  /actual execution must not capture secrets|actual execution must not capture PII/i.test(
    doc
  )
);

// --- v7.0O is NOT execution / not smoke result / not login round ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|v7\.0O \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
    doc
  )
);
ok("not smoke result", /ไม่ใช่.*smoke result/i.test(doc));
ok("not operator login round", /ไม่ใช่.*operator login round/i.test(doc));

// --- no authenticated smoke PASS yet ---
ok(
  "no authenticated smoke pass yet",
  /ยังไม่มี.*authenticated smoke PASS|NO authenticated smoke PASS yet|no smoke PASS yet/i.test(
    doc
  )
);

// --- no overclaim production/pilot/revenue rule ---
ok(
  "no overclaim production/pilot/revenue rule",
  /ห้าม overclaim[^\n]*production-ready \/ pilot-ready \/ revenue GO/i.test(doc)
);

// --- operator login not in this slice ---
ok(
  "login not in this slice",
  /operator login จริง \*\*ยังไม่เกิด\*\* ใน slice นี้|Operator login in this slice.*NO|operator login จริงใน slice นี้/i.test(
    doc
  )
);

// --- no screenshot rule ---
ok(
  "no screenshot rule",
  /Screenshot attached.*NO|ไม่แนบ screenshot|ไม่มี screenshot|ห้ามแนบ screenshot/i.test(
    doc
  )
);

// --- Thor / blocked invariants ---
ok(
  "thor runtime import remains blocked",
  /Thor.*runtime import.*BLOCKED|Thor runtime import ยัง.*BLOCKED|remains BLOCKED/i.test(
    doc
  )
);
ok("thor not unblocked", /Thor Auto runtime import unblocked.*NO/i.test(doc));
ok(
  "user-visible gemini remains blocked",
  /User-visible AI \/ Gemini enabled.*BLOCKED|user-visible Gemini ยัง.*BLOCKED|User-visible Gemini remains BLOCKED/i.test(
    doc
  )
);
ok(
  "public signup remains blocked",
  /Public signup opened.*BLOCKED|public signup ยัง.*BLOCKED|Public signup remains BLOCKED/i.test(
    doc
  )
);
ok(
  "production deploy remains blocked",
  /Production deploy readiness.*BLOCKED|production deploy ยัง.*BLOCKED|Production deploy remains BLOCKED/i.test(
    doc
  )
);
ok(
  "revenue pilot go remains blocked",
  /Revenue pilot GO.*BLOCKED|revenue pilot GO ยัง.*BLOCKED|Revenue pilot GO remains BLOCKED/i.test(
    doc
  )
);

// --- not GO / not production-ready / not pilot-ready / not revenue go ---
ok(
  "not go for thor runtime import",
  /Claims GO for Thor runtime import.*NO|ไม่ใช่.*GO FOR THOR RUNTIME IMPORT|This is NOT GO FOR THOR RUNTIME IMPORT/i.test(
    doc
  )
);
ok(
  "claims production-ready no",
  /Claims production-ready.*NO|production-ready.*NO/i.test(doc)
);
ok("claims pilot-ready no", /Claims pilot-ready.*NO|pilot-ready.*NO/i.test(doc));
ok("claims revenue go no", /Claims revenue GO.*NO|revenue GO.*NO/i.test(doc));

// --- no credential/session/password/token/cookie rule ---
ok(
  "no credential rule",
  /Credential \/ session \/ cookie \/ token read.*NO|Agent login \/ credential read.*NO/i.test(
    doc
  )
);
ok("operator login this slice no", /Operator login in this slice.*NO/i.test(doc));
ok(
  "no credential rule text",
  /ห้ามแชร์ password|ห้ามส่ง credential|credential\/session\/cookie\/token\/password/i.test(
    doc
  )
);

// --- no PII / raw contact / plate / VIN rule ---
ok(
  "no PII raw contact rule",
  /Buyer\/seller PII \/ VIN \/ plate \/ raw contact in doc.*NO/i.test(doc)
);
ok(
  "no pii rule text",
  /buyer PII \/ raw contact|license plate \/ VIN|lead\/contact\/plate\/VIN|PII \/ raw contact \/ phone \/ email \/ plate \/ VIN/i.test(
    doc
  )
);

// --- no runtime/deploy/env/firestore/import rule ---
ok("no runtime rule", /Runtime code changes.*NO/i.test(doc));
ok("no deploy rule", /Deploy performed.*NO/i.test(doc));
ok("no env rule", /Env \/ secrets \/ deploy config.*Unchanged/i.test(doc));
ok(
  "no firestore rule",
  /Firestore write from agent.*Not touched|Real lead created\/edited in Firestore.*NO/i.test(
    doc
  )
);
ok("no thor import rule", /Thor data imported.*NO/i.test(doc));

// --- over-claim guard (line-level, allow negated lines) ---
const lines = doc.split(/\r?\n/);
for (const pattern of OVERCLAIM_PATTERNS) {
  const badLines = lines.filter(
    (ln) =>
      pattern.test(ln) &&
      !/\b(no|not|never|blocked|NOT READY|NOT ALLOWED|NOT RUN|NO-GO|remains|pending|missing|forbidden|until|only if|cannot|ยังไม่|ไม่ใช่|ไม่อนุมัติ)\b/i.test(
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
ok("no raw code/output dump", !/```[\s\S]{600,}```/.test(doc));

// --- package script ---
ok(
  "package script registered",
  pkg.includes(
    "test:v70o-m3-operator-safe-session-prep-option-ab-decision-packet"
  )
);

console.log(
  "\nDone v7.0O M-3 operator safe session prep / Option A-B decision packet tests.\n"
);

/**
 * v7.0J — Authenticated Dealer Smoke Result Shell / Evidence Intake Packet
 * (static validation only)
 * npm run test:v70j-authenticated-dealer-smoke-result-shell-evidence-intake-packet
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0J-authenticated-dealer-smoke-result-shell-evidence-intake-packet.md";

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
  "=== v7.0J Authenticated Dealer Smoke Result Shell / Evidence Intake Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0J", /v7\.0J/i.test(doc));
ok(
  "phase title result shell / evidence intake packet",
  /Authenticated Dealer Smoke Result Shell \/ Evidence Intake Packet/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline f4dd821", doc.includes("f4dd821"));

// --- verdict ---
ok(
  "verdict RESULT SHELL / EVIDENCE INTAKE ONLY",
  /PARTIAL — AUTHENTICATED SMOKE RESULT SHELL \/ EVIDENCE INTAKE ONLY|PARTIAL -- AUTHENTICATED SMOKE RESULT SHELL \/ EVIDENCE INTAKE ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v7.0A", /v7\.0A/i.test(doc));
ok("references v7.0B", /v7\.0B/i.test(doc));
ok("references v7.0C", /v7\.0C/i.test(doc));
ok("references v7.0F", /v7\.0F/i.test(doc));
ok("references v7.0G", /v7\.0G/i.test(doc));
ok("references v7.0H", /v7\.0H/i.test(doc));
ok("references v7.0I", /v7\.0I/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why result shell only section",
  /Why this is result shell \/ evidence intake only/i.test(doc)
);
ok(
  "preconditions section",
  /Preconditions from v7\.0A\.\.v7\.0I/i.test(doc)
);
ok(
  "operator safe session boundary section",
  /Operator safe session boundary/i.test(doc)
);
ok(
  "credential/session prohibition section",
  /Credential\/session prohibition/i.test(doc)
);
ok("non-pii evidence rules section", /Non-PII evidence rules/i.test(doc));
ok(
  "evidence intake fields section",
  /Evidence intake fields/i.test(doc)
);
ok("result table shell section", /Result table shell/i.test(doc));
ok("default final verdict section", /Default final verdict/i.test(doc));
ok("abort/no-go conditions section", /Abort\/no-go conditions/i.test(doc));
ok("what this shell allows section", /What this shell allows/i.test(doc));
ok(
  "what this shell does not allow section",
  /What this shell does not allow/i.test(doc)
);
ok("relationship to v7.0I section", /Relationship to v7\.0I/i.test(doc));
ok(
  "relationship to v6.7C-1-G section",
  /Relationship to v6\.7C-1-G/i.test(doc)
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

// --- evidence intake fields IN-1..IN-10 present ---
for (let i = 1; i <= 10; i++) {
  ok(`evidence intake field IN-${i}`, doc.includes(`IN-${i}`));
}

// --- required future-execution intake fields explicitly mentioned ---
ok("intake: execution date/time", /Execution date\/time/i.test(doc));
ok(
  "intake: operator identity no credential",
  /Operator identity.*ไม่ใส่ credential|Operator identity.*role/i.test(doc)
);
ok("intake: staging URL", /Staging URL/i.test(doc));
ok("intake: safe pre-checks", /Safe pre-checks/i.test(doc));
ok(
  "intake: login action no session/cookie/token",
  /Login action result.*ไม่บันทึก session\/cookie\/token/i.test(doc)
);
ok(
  "intake: dealer dashboard visibility",
  /Dealer dashboard visibility/i.test(doc)
);
ok(
  "intake: lead queue isolation no PII",
  /Lead queue isolation.*ไม่มี PII\/raw contact/i.test(doc)
);
ok("intake: cross-dealer leak check", /Cross-dealer leak check/i.test(doc));
ok(
  "intake: firestore write NOT PERFORMED",
  /Firestore write confirmation[^\n]*NOT PERFORMED/i.test(doc)
);
ok("intake: logout/session closed", /Logout \/ session closed/i.test(doc));

// --- abort conditions AB-1..AB-7 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-7/.test(doc));

// --- AS-01..AS-09 all PENDING ---
const AS_ITEMS: Record<string, string> = {
  "AS-01": "safe session prepared",
  "AS-02": "operator login performed by operator only",
  "AS-03": "no credential/session/token shared",
  "AS-04": "dealer portal accessible",
  "AS-05": "lead queue accessible count/status-only",
  "AS-06": "no cross-dealer lead visibility observed",
  "AS-07": "no PII captured in evidence",
  "AS-08": "abort conditions not triggered",
  "AS-09": "result ready for v6.7C-1-G",
};
for (const id of Object.keys(AS_ITEMS)) {
  ok(`result item ${id}`, doc.includes(id));
  const rowRe = new RegExp(`\\| ${id} \\|[^\\n]*\\| \\*\\*PENDING\\*\\* \\|`);
  ok(`result item ${id} = PENDING`, rowRe.test(doc));
}
ok(
  "result table pending/not-run all",
  /AS-01\.\.AS-09 = \*\*PENDING \/ NOT RUN ทั้งหมด\*\*/i.test(doc)
);

// --- default per-execution verdict PENDING / NOT RUN ---
ok(
  "default verdict pending/not run",
  /Default per-execution verdict[^\n]*PENDING \/ NOT RUN|Per-execution verdict[^\n]*PENDING \/ NOT RUN/i.test(
    doc
  )
);

// --- v7.0J is NOT authenticated smoke execution ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|v7\.0J \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
    doc
  )
);

// --- no authenticated smoke PASS yet ---
ok(
  "no authenticated smoke pass yet",
  /ยังไม่มี.*authenticated smoke PASS|NO authenticated smoke PASS yet|no smoke PASS yet/i.test(
    doc
  )
);

// --- no overclaim PASS rule ---
ok(
  "no overclaim pass rule",
  /ห้าม overclaim ว่า PASS|overclaim ว่า PASS[^\n]*NOT ALLOWED|ห้าม overclaim/i.test(
    doc
  )
);

// --- actual smoke execution must happen in separate slice after owner approve ---
ok(
  "actual execution in separate slice after approve",
  /actual smoke execution ต้องเกิดใน slice แยกหลัง owner approve/i.test(doc)
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

// --- template PASS / shell PASS not pilot/production/GO ---
ok(
  "shell not pilot/production/go",
  /shell PASS \*\*ยังไม่ใช่\*\* pilot-ready \/ production-ready \/ GO|ยังไม่ใช่ pilot-ready/i.test(
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

// --- not GO / not production-ready / not pilot-ready ---
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
      !/\b(no|not|never|blocked|NOT READY|NOT ALLOWED|NOT RUN|remains|pending|missing|forbidden|until|only if|cannot|ยังไม่|ไม่อนุมัติ)\b/i.test(
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
    "test:v70j-authenticated-dealer-smoke-result-shell-evidence-intake-packet"
  )
);

console.log(
  "\nDone v7.0J authenticated dealer smoke result shell / evidence intake packet tests.\n"
);

/**
 * v7.0K — Authenticated Dealer Smoke Owner Go/No-Go Decision Packet
 * (static validation only)
 * npm run test:v70k-authenticated-dealer-smoke-owner-go-no-go-decision-packet
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0K-authenticated-dealer-smoke-owner-go-no-go-decision-packet.md";

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
  "=== v7.0K Authenticated Dealer Smoke Owner Go/No-Go Decision Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0K", /v7\.0K/i.test(doc));
ok(
  "phase title owner go/no-go decision packet",
  /Authenticated Dealer Smoke Owner Go\/No-Go Decision Packet/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline c064cd1", doc.includes("c064cd1"));

// --- verdict ---
ok(
  "verdict OWNER GO/NO-GO DECISION PACKET ONLY",
  /PARTIAL — OWNER GO\/NO-GO DECISION PACKET ONLY|PARTIAL -- OWNER GO\/NO-GO DECISION PACKET ONLY/i.test(
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
ok("references v7.0J", /v7\.0J/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why decision packet only section",
  /Why this is owner decision packet only/i.test(doc)
);
ok("preconditions section", /Preconditions from v7\.0A\.\.v7\.0J/i.test(doc));
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
  "owner decision items section",
  /Owner Go\/No-Go decision items/i.test(doc)
);
ok("decision rules section", /Decision rules/i.test(doc));
ok("abort/no-go conditions section", /Abort\/no-go conditions/i.test(doc));
ok("what this packet allows section", /What this packet allows/i.test(doc));
ok(
  "what this packet does not allow section",
  /What this packet does not allow/i.test(doc)
);
ok("relationship to v7.0J section", /Relationship to v7\.0J/i.test(doc));
ok(
  "relationship to v6.9Q section",
  /Relationship to v6\.9Q \/ v6\.7C-1-G/i.test(doc)
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

// --- OD-K1..OD-K9 present + default PENDING / NO-GO ---
const OD_QUESTIONS: Record<string, RegExp> = {
  "OD-K1": /operator login/i,
  "OD-K2": /staging URL/i,
  "OD-K3": /credential\/session\/cookie\/token/i,
  "OD-K4": /screenshot/i,
  "OD-K5": /Firestore write \/ lead mutation/i,
  "OD-K6": /Thor runtime import/i,
  "OD-K7": /user-visible Gemini \/ AI/i,
  "OD-K8": /production deploy \/ public signup/i,
  "OD-K9": /PII\/lead leak\/cross-dealer leak/i,
};
for (const id of Object.keys(OD_QUESTIONS)) {
  ok(`decision item ${id}`, doc.includes(id));
  const rowRe = new RegExp(
    `\\| ${id} \\|[^\\n]*\\| \\*\\*PENDING \\/ NO-GO\\*\\* \\|`
  );
  ok(`decision item ${id} default PENDING / NO-GO`, rowRe.test(doc));
  ok(`decision item ${id} question`, OD_QUESTIONS[id].test(doc));
}
ok(
  "decision items default summary",
  /OD-K1\.\.OD-K9 = \*\*PENDING \/ NO-GO ทั้งหมด\*\*/i.test(doc)
);

// --- abort conditions AB-1..AB-7 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-7/.test(doc));

// --- AS-01..AS-09 range referenced + PENDING / NOT RUN ---
ok("result range AS-01..AS-09 referenced", /AS-01\.\.AS-09/.test(doc));
ok(
  "result table pending status",
  /Result table AS-01\.\.AS-09[^\n]*PENDING \/ NOT RUN/i.test(doc)
);

// --- IN-1..IN-10 range referenced + NOT RUN ---
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

// --- v7.0K is NOT authenticated smoke execution / not smoke result ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|v7\.0K \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
    doc
  )
);
ok(
  "not smoke result",
  /ไม่ใช่.*smoke result|v7\.0K \*\*ไม่ใช่\*\*.*smoke result/i.test(doc)
);

// --- no authenticated smoke PASS yet ---
ok(
  "no authenticated smoke pass yet",
  /ยังไม่มี.*authenticated smoke PASS|NO authenticated smoke PASS yet|no smoke PASS yet/i.test(
    doc
  )
);

// --- no owner GO yet ---
ok(
  "no owner go yet",
  /ยังไม่มี.*owner GO|There is NO owner GO yet|Owner GO for authenticated smoke.*NO/i.test(
    doc
  )
);

// --- no overclaim PASS / GO rule ---
ok(
  "no overclaim pass or go rule",
  /ห้าม overclaim ว่า PASS หรือ GO|overclaim ว่า PASS หรือ GO[^\n]*NOT ALLOWED|ห้าม overclaim/i.test(
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

// --- default decision PENDING / NO-GO until owner approve ---
ok(
  "default decision pending/no-go",
  /default = PENDING \/ NO-GO|เริ่มต้น PENDING \/ NO-GO/i.test(doc)
);

// --- decision packet not pilot/production/go ---
ok(
  "packet not pilot/production/go",
  /decision packet \*\*ยังไม่ใช่\*\* pilot-ready \/ production-ready \/ GO|ยังไม่ใช่ pilot-ready/i.test(
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
      !/\b(no|not|never|blocked|NOT READY|NOT ALLOWED|NOT RUN|NO-GO|remains|pending|missing|forbidden|until|only if|cannot|ยังไม่|ไม่อนุมัติ)\b/i.test(
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
    "test:v70k-authenticated-dealer-smoke-owner-go-no-go-decision-packet"
  )
);

console.log(
  "\nDone v7.0K authenticated dealer smoke owner Go/No-Go decision packet tests.\n"
);

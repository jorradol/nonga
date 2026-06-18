/**
 * v7.0H — Operator Safe Session Readiness Checklist Closure
 * (static validation only)
 * npm run test:v70h-operator-safe-session-readiness-checklist-closure
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0H-operator-safe-session-readiness-checklist-closure.md";

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
  "=== v7.0H Operator Safe Session Readiness Checklist Closure ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0H", /v7\.0H/i.test(doc));
ok(
  "phase title readiness closure",
  /Operator Safe Session Readiness Checklist Closure/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline acf0e0f", doc.includes("acf0e0f"));

// --- verdict ---
ok(
  "verdict OPERATOR SAFE SESSION READINESS CLOSED ONLY",
  /PARTIAL — OPERATOR SAFE SESSION READINESS CLOSED ONLY|PARTIAL -- OPERATOR SAFE SESSION READINESS CLOSED ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v7.0C", /v7\.0C/i.test(doc));
ok("references v7.0F", /v7\.0F/i.test(doc));
ok("references v7.0G", /v7\.0G/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why operator readiness section",
  /Why operator safe-session readiness is needed/i.test(doc)
);
ok(
  "source approval section",
  /Source approval from v7\.0F \/ v7\.0G/i.test(doc)
);
ok(
  "readiness checklist section",
  /RC-01\.\.RC-06 readiness checklist/i.test(doc)
);
ok(
  "operator safe-session ack section",
  /Operator safe-session acknowledgement/i.test(doc)
);
ok(
  "non-pii evidence ack section",
  /Non-PII evidence acknowledgement/i.test(doc)
);
ok(
  "credential prohibition ack section",
  /Credential\/session\/token prohibition acknowledgement/i.test(doc)
);
ok(
  "abort lead/contact ack section",
  /Lead\/contact\/plate\/VIN abort acknowledgement/i.test(doc)
);
ok(
  "abort no-go conditions ack section",
  /Abort\/no-go conditions acknowledgement/i.test(doc)
);
ok("what is now allowed section", /What is now allowed/i.test(doc));
ok("what remains blocked section", /What remains blocked/i.test(doc));
ok("relationship to v7.0C section", /Relationship to v7\.0C/i.test(doc));
ok("relationship to v7.0G section", /Relationship to v7\.0G/i.test(doc));
ok(
  "relationship to v6.7C-1-G section",
  /Relationship to v6\.7C-1-G/i.test(doc)
);
ok(
  "missing items before authenticated smoke section",
  /Missing items before authenticated smoke execution/i.test(doc)
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

// --- RC-01..RC-06 all PASS ---
for (let i = 1; i <= 6; i++) {
  const id = `RC-${String(i).padStart(2, "0")}`;
  ok(`readiness item ${id}`, doc.includes(id));
  const rowRe = new RegExp(`\\| ${id} \\|[^\\n]*\\| \\*\\*PASS\\*\\* \\|`);
  ok(`readiness item ${id} = PASS`, rowRe.test(doc));
}
ok(
  "readiness summary pass all",
  /OPERATOR SAFE SESSION READINESS = \*\*PASS\*\* ทั้ง RC-01\.\.RC-06/i.test(doc)
);

// --- acknowledgements present ---
ok("acknowledged token present", /ACKNOWLEDGED/.test(doc));
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-6/.test(doc));

// --- v7.0H is NOT authenticated smoke execution ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|v7\.0H \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
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

// --- readiness PASS not pilot/production/GO ---
ok(
  "readiness not pilot/production/go",
  /readiness PASS \*\*ยังไม่ใช่\*\* pilot-ready \/ production-ready \/ GO|ยังไม่ใช่ pilot-ready/i.test(
    doc
  )
);

// --- still awaiting smoke result + owner approval recorded in v6.9Q ---
ok(
  "awaiting operator smoke result",
  /รอ operator authenticated smoke result|AWAITING OPERATOR RESULT/i.test(doc)
);
ok(
  "owner approval at v6.9Q",
  /บันทึก.*v6\.9Q|owner approval.*v6\.9Q|รอ owner approval/i.test(doc)
);

// --- Thor / blocked invariants ---
ok(
  "thor runtime import remains blocked",
  /Thor.*runtime import.*BLOCKED|Thor runtime import ยัง.*BLOCKED|remains blocked/i.test(
    doc
  )
);
ok("thor not unblocked", /Thor Auto runtime import unblocked.*NO/i.test(doc));
ok(
  "user-visible gemini remains blocked",
  /User-visible AI \/ Gemini enabled.*BLOCKED|user-visible Gemini ยัง.*BLOCKED|user-visible Gemini remains BLOCKED/i.test(
    doc
  )
);
ok(
  "public signup remains blocked",
  /Public signup opened.*BLOCKED|public signup ยัง.*BLOCKED|public signup remains BLOCKED/i.test(
    doc
  )
);
ok(
  "production deploy remains blocked",
  /Production deploy readiness.*BLOCKED|production deploy ยัง.*BLOCKED/i.test(doc)
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
  /buyer PII \/ raw contact|license plate \/ VIN|lead\/contact\/plate\/VIN|PII\/raw contact\/plate\/VIN/i.test(
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
      !/\b(no|not|never|blocked|NOT READY|remains|pending|missing|forbidden|until|only if|cannot|ยังไม่|ไม่อนุมัติ)\b/i.test(
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
    "test:v70h-operator-safe-session-readiness-checklist-closure"
  )
);

console.log(
  "\nDone v7.0H operator safe session readiness checklist closure tests.\n"
);

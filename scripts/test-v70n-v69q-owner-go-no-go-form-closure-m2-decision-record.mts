/**
 * v7.0N — v6.9Q Owner Go/No-Go Form Closure / M-2 Decision Record
 * (static validation only)
 * npm run test:v70n-v69q-owner-go-no-go-form-closure-m2-decision-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0N-v69q-owner-go-no-go-form-closure-m2-decision-record.md";

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
  "=== v7.0N v6.9Q Owner Go/No-Go Form Closure / M-2 Decision Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0N", /v7\.0N/i.test(doc));
ok(
  "phase title m2 decision record",
  /v6\.9Q Owner Go\/No-Go Form Closure \/ M-2 Decision Record/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline f36a169", doc.includes("f36a169"));

// --- verdict ---
ok(
  "verdict M-2 DECISION RECORD ONLY",
  /PARTIAL — v6\.9Q OWNER GO\/NO-GO FORM CLOSURE \/ M-2 DECISION RECORD ONLY|PARTIAL -- v6\.9Q OWNER GO\/NO-GO FORM CLOSURE \/ M-2 DECISION RECORD ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v7.0K", /v7\.0K/i.test(doc));
ok("references v7.0L", /v7\.0L/i.test(doc));
ok("references v7.0M", /v7\.0M/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why m2 decision record only section",
  /Why this is M-2 decision record only/i.test(doc)
);
ok("source chain section", /Source chain: v7\.0K \/ v7\.0L \/ v7\.0M/i.test(doc));
ok("target gate section", /Target gate: v6\.9Q M-2/i.test(doc));
ok("m2 closure table section", /M-2 closure table/i.test(doc));
ok("scope of m2 closure section", /Scope of M-2 closure/i.test(doc));
ok(
  "operator safe session boundary section",
  /Operator safe session boundary/i.test(doc)
);
ok(
  "credential/session prohibition section",
  /Credential\/session prohibition/i.test(doc)
);
ok("non-pii evidence rules section", /Non-PII evidence rules/i.test(doc));
ok("no-go/abort conditions section", /No-go \/ abort conditions/i.test(doc));
ok("future slice boundary section", /Future slice boundary/i.test(doc));
ok(
  "what this m2 closure allows section",
  /What this M-2 closure allows/i.test(doc)
);
ok(
  "what this m2 closure does not allow section",
  /What this M-2 closure does not allow/i.test(doc)
);
ok("relationship to v7.0M section", /Relationship to v7\.0M/i.test(doc));
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

// --- M-2.1..M-2.9 closure items present ---
for (let i = 1; i <= 9; i++) {
  ok(`m2 closure item M-2.${i}`, doc.includes(`M-2.${i}`));
}

// --- M-2 closure mapping checks ---
ok(
  "M-2.1 owner decision captured",
  /M-2\.1[^\n]*owner decision captured/i.test(doc)
);
ok(
  "M-2.2 staging-only constraint retained",
  /M-2\.2[^\n]*staging-only constraint retained/i.test(doc)
);
ok(
  "M-2.3 credential capture forbidden",
  /M-2\.3[^\n]*credential\/session\/cookie\/token capture forbidden/i.test(doc)
);
ok(
  "M-2.4 sensitive screenshot forbidden",
  /M-2\.4[^\n]*sensitive screenshot forbidden/i.test(doc)
);
ok(
  "M-2.5 lead/Firestore write mutation forbidden",
  /M-2\.5[^\n]*lead\/Firestore write mutation forbidden unless separately approved/i.test(
    doc
  )
);
ok(
  "M-2.6 Thor runtime import blocked",
  /M-2\.6[^\n]*Thor runtime import blocked/i.test(doc)
);
ok(
  "M-2.7 user-visible Gemini/AI blocked",
  /M-2\.7[^\n]*user-visible Gemini\/AI blocked/i.test(doc)
);
ok(
  "M-2.8 production deploy/public signup blocked",
  /M-2\.8[^\n]*production deploy\/public signup blocked/i.test(doc)
);
ok(
  "M-2.9 abort on PII / lead leak / cross-dealer leak",
  /M-2\.9[^\n]*abort on PII \/ lead leak \/ cross-dealer leak/i.test(doc)
);

// --- M-2 done in missing-items table ---
ok(
  "M-2 done in missing items",
  /\| M-2 \|[^\n]*\| \*\*DONE \(this doc — M-2 closed\)\*\* \|/.test(doc)
);

// --- M-2 closure NOT smoke PASS / NOT revenue GO / NOT production/pilot ---
ok(
  "m2 closure not smoke pass",
  /การปิด M-2 \*\*ไม่ใช่\*\* authenticated smoke PASS|การปิด M-2[^\n]*ไม่ใช่[^\n]*authenticated smoke PASS/i.test(
    doc
  )
);
ok(
  "m2 closure not revenue go",
  /การปิด M-2 \*\*ไม่ใช่\*\* revenue pilot GO|การปิด M-2[^\n]*ไม่ใช่[^\n]*revenue pilot GO/i.test(
    doc
  )
);
ok(
  "m2 closure not production/pilot ready",
  /การปิด M-2[^\n]*ไม่ใช่[^\n]*production-ready \/ pilot-ready|M-2 closure[^\n]*production-ready \/ pilot-ready/i.test(
    doc
  )
);

// --- OD-K1 = YES prep only, OD-K2..OD-K9 = PASS guardrails ---
ok(
  "od-k1 yes prep only",
  /OD-K1 = YES ยังคงหมายถึงอนุญาตเฉพาะ.*เตรียม execution slice ถัดไป|OD-K1 = YES[^\n]*เตรียม execution slice ถัดไป/i.test(
    doc
  )
);
ok(
  "od-k2..k9 pass guardrails",
  /OD-K2\.\.OD-K9 = PASS[^\n]*guardrails/i.test(doc)
);

// --- abort conditions AB-1..AB-7 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-7/.test(doc));

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

// --- v6.9Q gate not authenticated smoke PASS ---
ok(
  "v6.9Q gate not smoke pass yet",
  /v6\.9Q gate[^\n]*ยังไม่ถือว่า authenticated smoke PASS|v6\.9Q gate = authenticated smoke PASS[^\n]*NO/i.test(
    doc
  )
);

// --- future slice boundary content ---
ok(
  "future slice may be m3 safe session",
  /next slice may be M-3 operator safe session prep\/closure/i.test(doc)
);
ok(
  "actual execution must be separate",
  /actual authenticated smoke execution must be separate/i.test(doc)
);

// --- v7.0N is NOT execution / not smoke result / not login round ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|v7\.0N \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
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
    "test:v70n-v69q-owner-go-no-go-form-closure-m2-decision-record"
  )
);

console.log(
  "\nDone v7.0N v6.9Q owner Go/No-Go form closure / M-2 decision record tests.\n"
);

/**
 * v7.0A — Operator Non-Login Dry-Run Execution Record
 * (static validation only)
 * npm run test:v70a-operator-non-login-dry-run-execution-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v7.0A-operator-non-login-dry-run-execution-record.md";

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

console.log("=== v7.0A Operator Non-Login Dry-Run Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0A", /v7\.0A/i.test(doc));
ok(
  "phase title execution record",
  /Operator Non-Login Dry-Run Execution Record/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 6d30f99", doc.includes("6d30f99"));

// --- verdict ---
ok(
  "verdict NON-LOGIN DRY-RUN EXECUTION ONLY",
  /PARTIAL — NON-LOGIN DRY-RUN EXECUTION ONLY|PARTIAL -- NON-LOGIN DRY-RUN EXECUTION ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v6.9S", /v6\.9S/i.test(doc));
ok("references v6.9T", /v6\.9T/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("dry-run execution scope section", /Dry-run execution scope/i.test(doc));
ok(
  "operator dry-run result table section",
  /Operator dry-run result table/i.test(doc)
);
ok("dr result section", /DR-01\.\.DR-10 result section/i.test(doc));
ok("ep/nc understanding result section", /EP\/NC understanding result section/i.test(doc));
ok(
  "lead monitor count-only section",
  /Lead monitor count-only rehearsal result/i.test(doc)
);
ok(
  "incident understanding section",
  /Incident \/ no-go understanding result/i.test(doc)
);
ok(
  "owner decision understanding section",
  /Owner decision understanding result/i.test(doc)
);
ok(
  "result entry format section",
  /Result entry format for ลุงเด่น\/operator/i.test(doc)
);
ok(
  "what this proves section",
  /What this execution record proves/i.test(doc)
);
ok(
  "what this not prove section",
  /What this execution record does NOT prove/i.test(doc)
);
ok(
  "missing items before authenticated smoke section",
  /Missing items before authenticated smoke/i.test(doc)
);
ok(
  "missing items before gemini pilot section",
  /Missing items before Gemini user-visible pilot/i.test(doc)
);
ok("safety confirmations section", /Safety confirmations/i.test(doc));
ok("next slices section", /Next slices/i.test(doc));

// --- DR-01..DR-10 result section ---
for (let i = 1; i <= 10; i++) {
  const id = `DR-${String(i).padStart(2, "0")}`;
  ok(`dry-run result item ${id}`, doc.includes(id));
}
ok("dr-01 no credential sharing", /DR-01 \| no credential sharing rule understood/i.test(doc));
ok("dr-02 non-pii evidence format", /DR-02 \| non-PII evidence format understood/i.test(doc));
ok("dr-10 thor remains blocked understood", /DR-10 \| Thor runtime import remains BLOCKED understood/i.test(doc));

// --- result table fields ---
ok("form dry-run date", /dry-run date/i.test(doc));
ok("form operator role label", /operator role label/i.test(doc));
ok("form session method non_login_only", /NON_LOGIN_ONLY/.test(doc));
ok("form lead monitor rehearsal rows", /lead monitor rehearsal rows/i.test(doc));
ok("form incident rehearsal rows", /incident rehearsal rows/i.test(doc));
ok("form anomalies", /anomalies/i.test(doc));
ok("form incident flag", /incident flag.*YES.*NO|incident flag.*YES \/ NO/i.test(doc));
ok("form notes count-only", /notes.*count-only|count-only \/ no PII/i.test(doc));

// --- result statuses present + default PENDING ---
ok("status pending", /PENDING/.test(doc));
ok("status pass", /\bPASS\b/.test(doc));
ok("status fail", /\bFAIL\b/.test(doc));
ok("status needs fix", /NEEDS FIX/i.test(doc));

// --- EP/NC understanding result ---
ok("ep understanding", /EP understanding/i.test(doc));
ok("nc understanding", /NC understanding/i.test(doc));
ok("ep-01..ep-07 referenced", /EP-01\.\.EP-07/i.test(doc));
ok("nc-01..nc-06 referenced", /NC-01\.\.NC-06/i.test(doc));

// --- lead monitor count-only rehearsal ---
ok("lead monitor count_only", /COUNT_ONLY/.test(doc));
ok("lead monitor status_only", /STATUS_ONLY/.test(doc));
ok("lead monitor redacted", /REDACTED/.test(doc));
ok("lead monitor no firestore", /ไม่อ่าน\/ไม่เขียน lead จริง|ไม่เขียน Firestore/i.test(doc));

// --- incident/no-go understanding ---
ok("incident sev levels", /SEV-0/i.test(doc) && /SEV-3/i.test(doc));

// --- owner decision understanding ---
ok("owner decision thor block", /Thor runtime import.*ยัง BLOCK/i.test(doc));

// --- dry-run PASS is NOT authenticated smoke PASS ---
ok(
  "dry-run not authenticated smoke pass",
  /dry-run PASS \*\*ไม่ใช่\*\* authenticated smoke PASS/i.test(doc)
);

// --- dry-run cannot open Gemini for real customers ---
ok(
  "dry-run cannot open gemini for customers",
  /dry-run \*\*ไม่สามารถ\*\* เปิด Gemini ให้ลูกค้าจริง|ไม่สามารถเปิด Gemini ให้ลูกค้าจริง/i.test(
    doc
  )
);

// --- still awaiting smoke + owner approval ---
ok(
  "awaiting operator smoke result",
  /รอ operator authenticated smoke result|AWAITING OPERATOR RESULT/i.test(doc)
);
ok(
  "awaiting owner approval",
  /รอ owner approval|owner approval still required|PREPARE ONLY/i.test(doc)
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
ok("claims production-ready no", /Claims production-ready.*NO|production-ready.*NO/i.test(doc));
ok("claims pilot-ready no", /Claims pilot-ready.*NO|pilot-ready.*NO/i.test(doc));
ok("revenue pilot not opened", /Revenue pilot opened.*NO|เปิด revenue pilot.*NO/i.test(doc));

// --- no credential/session/password/token/cookie rule ---
ok(
  "no credential rule",
  /Agent login \/ credential read.*NO|Secret \/ token \/ session \/ cookie logged.*NO/i.test(
    doc
  )
);
ok("operator login dry-run no", /Operator login in dry-run.*NO/i.test(doc));
ok(
  "no credential/session/password/token/cookie rule text",
  /no credential|no session|no password|no token|no cookie|Session token \/ cookie \/ password/i.test(
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
  /ห้าม.*ใส่ PII|no PII|raw contact|phone|email|plate|VIN/i.test(doc)
);

// --- no deploy/production/env/firestore/runtime/import rule ---
ok("no deploy rule", /Deploy performed.*NO/i.test(doc));
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
  pkg.includes("test:v70a-operator-non-login-dry-run-execution-record")
);

console.log(
  "\nDone v7.0A operator non-login dry-run execution record tests.\n"
);

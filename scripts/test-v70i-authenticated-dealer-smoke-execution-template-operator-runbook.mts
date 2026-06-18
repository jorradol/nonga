/**
 * v7.0I — Authenticated Dealer Smoke Execution Template / Operator Runbook
 * (static validation only)
 * npm run test:v70i-authenticated-dealer-smoke-execution-template-operator-runbook
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0I-authenticated-dealer-smoke-execution-template-operator-runbook.md";

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
  "=== v7.0I Authenticated Dealer Smoke Execution Template / Operator Runbook ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0I", /v7\.0I/i.test(doc));
ok(
  "phase title execution template / operator runbook",
  /Authenticated Dealer Smoke Execution Template \/ Operator Runbook/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 66a234c", doc.includes("66a234c"));

// --- verdict ---
ok(
  "verdict AUTHENTICATED SMOKE EXECUTION TEMPLATE ONLY",
  /PARTIAL — AUTHENTICATED SMOKE EXECUTION TEMPLATE ONLY|PARTIAL -- AUTHENTICATED SMOKE EXECUTION TEMPLATE ONLY/i.test(
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
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why execution template only section",
  /Why this is execution template only/i.test(doc)
);
ok(
  "preconditions section",
  /Preconditions from v7\.0A\.\.v7\.0H/i.test(doc)
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
  "authenticated smoke execution steps section",
  /Authenticated smoke execution steps/i.test(doc)
);
ok(
  "dealer portal path checklist section",
  /Dealer portal path checklist/i.test(doc)
);
ok(
  "lead queue path checklist section",
  /Lead queue path checklist/i.test(doc)
);
ok(
  "count/status-only result format section",
  /Count\/status-only result format/i.test(doc)
);
ok("abort/no-go conditions section", /Abort\/no-go conditions/i.test(doc));
ok("evidence capture template section", /Evidence capture template/i.test(doc));
ok("result table template section", /Result table template/i.test(doc));
ok(
  "relationship to v6.7C-1-G section",
  /Relationship to v6\.7C-1-G/i.test(doc)
);
ok("what this template allows section", /What this template allows/i.test(doc));
ok(
  "what this template does not allow section",
  /What this template does not allow/i.test(doc)
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

// --- execution steps ES-1..ES-9 present + PENDING ---
for (let i = 1; i <= 9; i++) {
  const id = `ES-${i}`;
  ok(`execution step ${id}`, doc.includes(id));
}

// --- dealer portal checklist DP-1..DP-5 ---
for (let i = 1; i <= 5; i++) {
  ok(`dealer portal check DP-${i}`, doc.includes(`DP-${i}`));
}

// --- lead queue checklist LQ-1..LQ-6 ---
for (let i = 1; i <= 6; i++) {
  ok(`lead queue check LQ-${i}`, doc.includes(`LQ-${i}`));
}

// --- abort conditions AB-1..AB-7 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-6/.test(doc));

// --- evidence capture EV-1..EV-8 ---
for (let i = 1; i <= 8; i++) {
  ok(`evidence capture EV-${i}`, doc.includes(`EV-${i}`));
}

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
  "result table pending all",
  /AS-01\.\.AS-09 = \*\*PENDING ทั้งหมด\*\*/i.test(doc)
);

// --- v7.0I is NOT authenticated smoke execution ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|v7\.0I \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
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

// --- template PASS not pilot/production/GO ---
ok(
  "template not pilot/production/go",
  /template PASS \*\*ยังไม่ใช่\*\* pilot-ready \/ production-ready \/ GO|ยังไม่ใช่ pilot-ready/i.test(
    doc
  )
);

// --- login not in this slice ---
ok(
  "login not in this slice",
  /login จริง \*\*ยังไม่เกิด\*\* ใน slice นี้|Operator login in this slice.*NO/i.test(
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
      !/\b(no|not|never|blocked|NOT READY|NOT ALLOWED|remains|pending|missing|forbidden|until|only if|cannot|ยังไม่|ไม่อนุมัติ)\b/i.test(
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
    "test:v70i-authenticated-dealer-smoke-execution-template-operator-runbook"
  )
);

console.log(
  "\nDone v7.0I authenticated dealer smoke execution template / operator runbook tests.\n"
);

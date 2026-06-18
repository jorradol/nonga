/**
 * v6.9T — Operator Non-Login Dry-Run Result Shell
 * (static validation only)
 * npm run test:v69t-operator-non-login-dry-run-result-shell
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.9T-operator-non-login-dry-run-result-shell.md";

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

console.log("=== v6.9T Operator Non-Login Dry-Run Result Shell ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9T", /v6\.9T/i.test(doc));
ok(
  "phase title result shell",
  /Operator Non-Login Dry-Run Result Shell/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 2c8523d", doc.includes("2c8523d"));

// --- verdict ---
ok(
  "verdict DRY-RUN RESULT SHELL ONLY",
  /PARTIAL — DRY-RUN RESULT SHELL ONLY|PARTIAL -- DRY-RUN RESULT SHELL ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v6.9S", /v6\.9S/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.9N", /v6\.9N/i.test(doc));
ok("references v6.9O", /v6\.9O/i.test(doc));
ok("references v6.9P", /v6\.9P/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));
ok("references v6.9R", /v6\.9R/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "what this records section",
  /What this result shell records/i.test(doc)
);
ok(
  "what this not prove section",
  /What this result shell does NOT prove/i.test(doc)
);
ok("operator dry-run result form section", /Operator dry-run result form/i.test(doc));
ok("dr result table section", /DR-01\.\.DR-10 result table/i.test(doc));
ok("ep/nc understanding section", /EP\/NC understanding rehearsal/i.test(doc));
ok(
  "lead monitor count-only section",
  /Lead monitor count-only rehearsal/i.test(doc)
);
ok(
  "incident understanding section",
  /Incident \/ no-go understanding rehearsal/i.test(doc)
);
ok(
  "owner decision understanding section",
  /Owner decision understanding rehearsal/i.test(doc)
);
ok("pass/fail/needs-fix section", /Pass\/fail\/needs-fix criteria/i.test(doc));
ok(
  "missing items section",
  /Missing items before real authenticated smoke/i.test(doc)
);
ok("non-pii reporting rules section", /Non-PII reporting rules/i.test(doc));
ok(
  "relation section",
  /Relation to v6\.9S, v6\.7C-1-G, v6\.9M, v6\.9N, v6\.9O, v6\.9P, v6\.9Q, v6\.9R/i.test(
    doc
  )
);
ok("next slices section", /Next slices/i.test(doc));

// --- DR-01..DR-10 result table ---
for (let i = 1; i <= 10; i++) {
  const id = `DR-${String(i).padStart(2, "0")}`;
  ok(`dry-run result item ${id}`, doc.includes(id));
}

// --- result form fields ---
ok("form dry-run date", /dry-run date/i.test(doc));
ok("form operator role label", /operator role label/i.test(doc));
ok("form session method non_login_only", /NON_LOGIN_ONLY/.test(doc));
ok("form lead monitor rehearsal rows", /lead monitor rehearsal rows/i.test(doc));
ok("form incident rehearsal rows", /incident rehearsal rows/i.test(doc));
ok("form anomalies", /anomalies/i.test(doc));
ok("form incident flag", /incident flag.*YES.*NO|incident flag.*YES \/ NO/i.test(doc));
ok("form notes count-only", /notes.*count-only|count-only \/ no PII/i.test(doc));

// --- result statuses present ---
ok("status pending", /PENDING/.test(doc));
ok("status pass", /\bPASS\b/.test(doc));
ok("status fail", /\bFAIL\b/.test(doc));
ok("status needs fix", /NEEDS FIX/i.test(doc));

// --- EP/NC understanding rehearsal ---
ok("ep understanding", /EP understanding/i.test(doc));
ok("nc understanding", /NC understanding/i.test(doc));
ok("ep-01..ep-07 referenced", /EP-01\.\.EP-07/i.test(doc));
ok("nc-01..nc-06 referenced", /NC-01\.\.NC-06/i.test(doc));

// --- lead monitor count-only rehearsal ---
ok("lead monitor count_only", /COUNT_ONLY/.test(doc));
ok("lead monitor status_only", /STATUS_ONLY/.test(doc));
ok("lead monitor redacted", /REDACTED/.test(doc));
ok("lead monitor no firestore", /ไม่อ่าน\/ไม่เขียน lead จริง|ไม่เขียน Firestore/i.test(doc));

// --- incident/no-go understanding rehearsal ---
ok("incident sev levels", /SEV-0/i.test(doc) && /SEV-3/i.test(doc));

// --- pass/fail/needs-fix criteria ---
ok(
  "passfail dry-run not authenticated smoke",
  /dry-run PASS \*\*ไม่ใช่\*\* authenticated smoke PASS/i.test(doc)
);
ok(
  "passfail cannot unblock thor",
  /dry-run \*\*ไม่สามารถ\*\* unblock Thor runtime import/i.test(doc)
);
ok(
  "passfail not pilot/production ready",
  /dry-run \*\*ไม่สามารถ\*\* ทำให้ pilot-ready หรือ production-ready/i.test(doc)
);

// --- dry-run is NOT authenticated smoke PASS ---
ok(
  "not authenticated smoke pass",
  /ไม่พิสูจน์ authenticated smoke PASS|Dry-run treated as authenticated smoke PASS.*NO|NOT an authenticated smoke PASS|dry-run PASS \*\*ไม่ใช่\*\* authenticated smoke PASS/i.test(
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
  "parent thor inbox defer",
  /Parent Thor aggregated inbox.*DEFER|parent Thor aggregated inbox ยัง.*DEFER/i.test(
    doc
  )
);
ok(
  "user-visible ai remains blocked",
  /User-visible AI enabled.*BLOCKED|user-visible AI ยัง.*BLOCKED|User-visible AI \| \*\*BLOCKED/i.test(
    doc
  )
);
ok(
  "public signup remains blocked",
  /Public signup opened.*BLOCKED|public signup ยัง.*BLOCKED|Public signup \| \*\*BLOCKED/i.test(
    doc
  )
);
ok(
  "production deploy remains blocked",
  /Production deploy readiness.*BLOCKED|production deploy ยัง.*BLOCKED|Production deploy \| \*\*BLOCKED/i.test(
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
ok("claims production-ready no", /Claims production-ready.*NO|Production-ready.*NO/i.test(doc));
ok("claims pilot-ready no", /Claims pilot-ready.*NO|Pilot-ready.*NO/i.test(doc));
ok("revenue pilot not opened", /Revenue pilot opened.*NO|เปิด revenue pilot.*NO/i.test(doc));

// --- no credential/session/password/token/cookie rule ---
ok(
  "no credential rule",
  /Agent login \/ credential read.*NO|Secret \/ token \/ session \/ cookie logged.*NO/i.test(
    doc
  )
);
ok("operator login dry-run no", /Operator login in dry-run.*NO/i.test(doc));

// --- no PII / raw contact / plate / VIN rule ---
ok(
  "no PII raw contact rule",
  /Buyer\/seller PII \/ VIN \/ plate \/ raw contact in doc.*NO/i.test(doc)
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
  pkg.includes("test:v69t-operator-non-login-dry-run-result-shell")
);

console.log(
  "\nDone v6.9T operator non-login dry-run result shell tests.\n"
);

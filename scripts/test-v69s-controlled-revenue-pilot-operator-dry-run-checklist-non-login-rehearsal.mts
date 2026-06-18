/**
 * v6.9S — Controlled Revenue Pilot Operator Dry-Run Checklist / Non-Login Rehearsal
 * (static validation only)
 * npm run test:v69s-controlled-revenue-pilot-operator-dry-run-checklist-non-login-rehearsal
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9S-controlled-revenue-pilot-operator-dry-run-checklist-non-login-rehearsal.md";

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
  "=== v6.9S Controlled Revenue Pilot Operator Dry-Run Checklist / Non-Login Rehearsal ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9S", /v6\.9S/i.test(doc));
ok(
  "phase title operator dry-run",
  /Operator Dry-Run Checklist \/ Non-Login Rehearsal/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline c9c6049", doc.includes("c9c6049"));

// --- verdict ---
ok(
  "verdict NON-LOGIN DRY-RUN ONLY",
  /PARTIAL — NON-LOGIN DRY-RUN ONLY|PARTIAL -- NON-LOGIN DRY-RUN ONLY/i.test(doc)
);

// --- references to dependent phases ---
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9N", /v6\.9N/i.test(doc));
ok("references v6.9O", /v6\.9O/i.test(doc));
ok("references v6.9P", /v6\.9P/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));
ok("references v6.9R", /v6\.9R/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("what this dry-run is section", /What this dry-run is\b/i.test(doc));
ok("what this dry-run is not section", /What this dry-run is NOT/i.test(doc));
ok("operator dry-run checklist section", /Operator dry-run checklist/i.test(doc));
ok("non-login rehearsal steps section", /Non-login rehearsal steps/i.test(doc));
ok("evidence format rehearsal section", /Evidence format rehearsal/i.test(doc));
ok(
  "lead monitor rehearsal section",
  /Lead monitor rehearsal \(dummy \/ count-only rows\)/i.test(doc)
);
ok(
  "incident no-go rehearsal section",
  /Incident \/ no-go response rehearsal/i.test(doc)
);
ok("owner decision rehearsal section", /Owner decision rehearsal/i.test(doc));
ok("pass/fail criteria section", /Pass\/fail criteria for rehearsal/i.test(doc));
ok(
  "missing items section",
  /Missing items before real authenticated smoke/i.test(doc)
);
ok(
  "relation section",
  /Relation to v6\.9M, v6\.7C-1-F, v6\.7C-1-G, v6\.9N, v6\.9O, v6\.9P, v6\.9Q, v6\.9R/i.test(
    doc
  )
);
ok("next slices section", /Next slices/i.test(doc));

// --- dry-run checklist DR-01..DR-10 ---
for (let i = 1; i <= 10; i++) {
  const id = `DR-${String(i).padStart(2, "0")}`;
  ok(`dry-run item ${id}`, doc.includes(id));
}
ok("dr-01 no credential sharing", /DR-01.*no credential sharing rule/i.test(doc));
ok("dr-02 non-pii evidence format", /DR-02.*non-PII evidence format/i.test(doc));
ok("dr-03 EP-01..EP-07", /DR-03.*EP-01\.\.EP-07/i.test(doc));
ok("dr-04 NC-01..NC-06", /DR-04.*NC-01\.\.NC-06/i.test(doc));
ok("dr-05 lead monitor fields", /DR-05.*lead monitor fields/i.test(doc));
ok("dr-06 incident SEV", /DR-06.*incident SEV-0\.\.SEV-3/i.test(doc));
ok("dr-07 gate matrix", /DR-07.*gate matrix/i.test(doc));
ok("dr-08 owner decision packet", /DR-08.*owner decision packet/i.test(doc));
ok("dr-09 evidence index", /DR-09.*evidence index/i.test(doc));
ok(
  "dr-10 thor remains blocked",
  /DR-10.*Thor runtime import remains BLOCKED/i.test(doc)
);

// --- referenced check IDs present ---
ok("EP-01..EP-07 referenced", /EP-01\.\.EP-07/i.test(doc));
ok("NC-01..NC-06 referenced", /NC-01\.\.NC-06/i.test(doc));
ok("SEV levels referenced", /SEV-0/i.test(doc) && /SEV-3/i.test(doc));

// --- non-login rehearsal steps content ---
ok("rehearsal no login", /ไม่ login/i.test(doc));
ok(
  "rehearsal no credential tokens",
  /ไม่ใช้ password\/token\/session\/cookie|ไม่ใช้ password \/ token \/ session \/ cookie/i.test(
    doc
  )
);
ok("rehearsal no real lead edit", /ไม่เปิด\/แก้ lead จริง|ไม่เปิด\/แก้ lead/i.test(doc));
ok("rehearsal no reveal contact", /ไม่ reveal contact จริง/i.test(doc));
ok("rehearsal no firestore", /ไม่เขียน Firestore/i.test(doc));
ok("rehearsal no thor import", /ไม่ import Thor data/i.test(doc));
ok(
  "rehearsal dummy count-only rows",
  /dummy\/count-only|count-only rows|dummy \/ count-only/i.test(doc)
);
ok("rehearsal placeholder count_only", /COUNT_ONLY/.test(doc));
ok("rehearsal placeholder status_only", /STATUS_ONLY/.test(doc));
ok("rehearsal placeholder redacted", /REDACTED/.test(doc));
ok(
  "rehearsal mock redacted screenshot",
  /mock\/redacted|mock \/ redacted/i.test(doc)
);

// --- evidence format rehearsal examples ---
ok("ev format ep-01 pending/pass/fail", /EP-01.*PENDING.*PASS.*FAIL/i.test(doc));
ok("ev format listings checked", /listings checked/i.test(doc));
ok("ev format queue rows observed", /queue rows observed/i.test(doc));
ok("ev format masked rows observed", /masked rows observed/i.test(doc));
ok("ev format reveal attempts", /reveal attempts/i.test(doc));
ok("ev format anomalies", /anomalies/i.test(doc));
ok("ev format incident flag", /incident flag.*YES.*NO|incident flag.*YES \/ NO/i.test(doc));
ok("ev format notes no pii", /notes.*no PII|no PII \/ count-only/i.test(doc));

// --- pass/fail criteria ---
ok(
  "passfail dry-run understanding only",
  /PASS ได้ \*\*เฉพาะ\*\* dry-run understanding|เฉพาะ.*dry-run understanding\/rehearsal/i.test(
    doc
  )
);
ok(
  "passfail not authenticated smoke pass",
  /PASS ของ dry-run \*\*ไม่ใช่\*\* PASS ของ authenticated smoke/i.test(doc)
);
ok(
  "passfail cannot unblock thor",
  /dry-run \*\*ไม่สามารถ\*\* unblock Thor runtime import/i.test(doc)
);
ok(
  "passfail not pilot/production ready",
  /dry-run \*\*ไม่สามารถ\*\* ทำให้ pilot-ready หรือ production-ready/i.test(doc)
);
ok(
  "passfail needs fix on misunderstanding",
  /ไม่เข้าใจ no-go triggers หรือ evidence safety.*NEEDS FIX/i.test(doc)
);

// --- missing items before real authenticated smoke ---
ok("missing safe session", /operator safe session available/i.test(doc));
ok("missing runs runbook", /operator runs v6\.7C-1-F §6/i.test(doc));
ok(
  "missing result recorded non-pii",
  /result recorded into v6\.7C-1-G แบบ non-PII/i.test(doc)
);
ok("missing no-go acknowledged", /no-go triggers acknowledged/i.test(doc));
ok("missing owner approval required", /owner approval still required/i.test(doc));
ok(
  "missing thor separate approval",
  /Thor runtime import still requires separate explicit approval/i.test(doc)
);

// --- dry-run is NOT authenticated smoke PASS ---
ok(
  "not authenticated smoke pass",
  /ไม่ใช่ authenticated smoke PASS|Dry-run treated as authenticated smoke PASS.*NO|NOT an authenticated smoke PASS/i.test(
    doc
  )
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
  pkg.includes(
    "test:v69s-controlled-revenue-pilot-operator-dry-run-checklist-non-login-rehearsal"
  )
);

console.log(
  "\nDone v6.9S controlled revenue pilot operator dry-run checklist / non-login rehearsal tests.\n"
);

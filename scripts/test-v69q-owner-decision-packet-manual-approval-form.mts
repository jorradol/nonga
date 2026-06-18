/**
 * v6.9Q — Owner Decision Packet / Manual Approval Form
 * (static validation only)
 * npm run test:v69q-owner-decision-packet-manual-approval-form
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9Q-owner-decision-packet-manual-approval-form.md";

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
  "=== v6.9Q Owner Decision Packet / Manual Approval Form ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9Q", /v6\.9Q/i.test(doc));
ok(
  "phase title owner decision packet",
  /Owner Decision Packet \/ Manual Approval Form/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 42276a9", doc.includes("42276a9"));

// --- verdict ---
ok(
  "verdict OWNER DECISION PACKET ONLY",
  /PARTIAL — OWNER DECISION PACKET ONLY|PARTIAL -- OWNER DECISION PACKET ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9N", /v6\.9N/i.test(doc));
ok("references v6.9O", /v6\.9O/i.test(doc));
ok("references v6.9P", /v6\.9P/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("owner decision principles section", /Owner decision principles/i.test(doc));
ok("manual approval form section", /Manual approval form/i.test(doc));
ok("approval options section", /Approval options/i.test(doc));
ok("explicit no-go choices section", /Explicit no-go choices/i.test(doc));
ok(
  "required evidence before thor section",
  /Required evidence before Thor runtime import/i.test(doc)
);
ok(
  "required evidence before pilot section",
  /Required evidence before controlled revenue pilot/i.test(doc)
);
ok("operator-only actions section", /Operator-only actions/i.test(doc));
ok("non-pii reporting format section", /Non-PII reporting format/i.test(doc));
ok("risks owner acknowledge section", /Risks owner must acknowledge/i.test(doc));
ok("decisions not allowed section", /Decisions not allowed yet/i.test(doc));
ok(
  "relation section",
  /Relation to v6\.9M, v6\.7C-1-F, v6\.7C-1-G, v6\.9N, v6\.9O, v6\.9P/i.test(doc)
);
ok("next slices section", /Next slices/i.test(doc));

// --- decision items D-01..D-10 ---
for (let i = 1; i <= 10; i++) {
  const id = `D-${String(i).padStart(2, "0")}`;
  ok(`decision item ${id}`, doc.includes(id));
}
ok("d-01 keep thor blocked", /D-01.*Thor runtime import BLOCKED/i.test(doc));
ok("d-02 operator smoke later", /D-02.*operator authenticated smoke to be run later with safe session/i.test(doc));
ok("d-03 sop skeleton draft", /D-03.*SOP skeleton as working draft/i.test(doc));
ok("d-04 incident playbook draft", /D-04.*incident \/ no-go playbook as working draft/i.test(doc));
ok("d-05 readiness matrix dashboard", /D-05.*readiness matrix as current dashboard/i.test(doc));
ok("d-06 defer parent inbox", /D-06.*Defer parent Thor aggregated inbox/i.test(doc));
ok("d-07 keep ai disabled", /D-07.*Keep user-visible AI disabled/i.test(doc));
ok("d-08 keep signup disabled", /D-08.*Keep public signup disabled/i.test(doc));
ok("d-09 no production deploy", /D-09.*Do not approve production deploy/i.test(doc));
ok("d-10 no thor import yet", /D-10.*Do not approve Thor runtime import yet/i.test(doc));

// --- approval options ---
const APPROVAL_OPTIONS = [
  "APPROVE PREP ONLY",
  "APPROVE OPERATOR SMOKE ONLY",
  "DEFER",
  "BLOCK",
  "NEEDS FIX",
  "NOT APPROVED FOR RUNTIME IMPORT",
];
for (const opt of APPROVAL_OPTIONS) {
  ok(`approval option ${opt}`, doc.includes(opt));
}

// --- required evidence before Thor runtime import ---
ok("t evidence smoke pass non-pii", /v6\.7C-1-G operator authenticated smoke result = \*\*PASS\*\* แบบ non-PII/i.test(doc));
ok("t evidence owner approval recorded", /owner approval explicitly recorded/i.test(doc));
ok("t evidence sop accepted", /SOP accepted/i.test(doc));
ok("t evidence playbook accepted", /incident \/ no-go playbook accepted/i.test(doc));
ok("t evidence matrix updated", /readiness matrix updated/i.test(doc));
ok("t evidence privacy gap addressed", /live privacy \/ VIN \/ plate gap addressed or accepted with mitigation/i.test(doc));
ok("t evidence explicit thor approval", /explicit separate approval for Thor runtime import/i.test(doc));

// --- required evidence before controlled revenue pilot ---
ok("p evidence owner form completed", /owner decision form completed/i.test(doc));
ok("p evidence operator assigned", /operator assigned/i.test(doc));
ok("p evidence lead monitor accepted", /lead monitor accepted/i.test(doc));
ok("p evidence no-go acknowledged", /no-go triggers acknowledged/i.test(doc));
ok("p evidence escalation accepted", /incident escalation path accepted/i.test(doc));
ok("p evidence smoke pass", /authenticated smoke PASS/i.test(doc));
ok("p evidence pilot scope limited", /pilot scope limited and admin-assisted/i.test(doc));
ok(
  "p evidence no prod/signup/ai unless separate",
  /no production \/ public signup \/ user-visible AI unless separately approved/i.test(
    doc
  )
);

// --- decisions not allowed yet ---
ok("not allowed go thor import", /GO FOR THOR RUNTIME IMPORT/i.test(doc));
ok("not allowed go production", /GO FOR PRODUCTION/i.test(doc));
ok("not allowed enable ai", /enable user-visible AI/i.test(doc));
ok("not allowed enable signup", /enable public signup/i.test(doc));
ok("not allowed import thor data", /import real Thor data/i.test(doc));
ok("not allowed store raw pii", /store raw PII in repo \/ docs \/ tests/i.test(doc));
ok("not allowed bypass smoke", /bypass authenticated smoke/i.test(doc));
ok("not allowed bypass owner approval", /bypass owner approval/i.test(doc));
ok("not allowed bypass playbook", /bypass incident playbook/i.test(doc));

// --- Thor / blocked invariants ---
ok(
  "thor runtime import remains blocked",
  /Thor.*runtime import.*BLOCKED|Thor runtime import ยัง.*BLOCKED|remains blocked/i.test(
    doc
  )
);
ok(
  "thor not unblocked",
  /Thor Auto runtime import unblocked.*NO/i.test(doc)
);
ok(
  "user-visible ai remains blocked",
  /User-visible AI enabled.*BLOCKED|user-visible AI ยัง.*BLOCKED/i.test(doc)
);
ok(
  "public signup remains blocked",
  /Public signup opened.*BLOCKED|public signup ยัง.*BLOCKED/i.test(doc)
);
ok(
  "production deploy remains blocked",
  /Production deploy readiness.*BLOCKED|production deploy ยัง.*BLOCKED/i.test(doc)
);

// --- not GO / not production-ready / not pilot-ready / not deploy / not revenue pilot ---
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

// --- awaiting operator smoke + owner approval ---
ok(
  "awaiting operator authenticated smoke",
  /รอ operator authenticated smoke result|AWAITING OPERATOR RESULT/i.test(doc)
);
ok(
  "awaiting owner approval",
  /รอ owner approval|owner approval explicitly recorded.*PENDING|PREPARE ONLY/i.test(
    doc
  )
);

// --- over-claim guard (line-level, allow negated lines) ---
const lines = doc.split(/\r?\n/);
for (const pattern of OVERCLAIM_PATTERNS) {
  const badLines = lines.filter(
    (ln) =>
      pattern.test(ln) &&
      !/\b(no|not|never|blocked|NOT READY|remains|pending|forbidden|until|only if|ยังไม่|ไม่อนุมัติ)\b/i.test(
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
  pkg.includes("test:v69q-owner-decision-packet-manual-approval-form")
);

console.log(
  "\nDone v6.9Q owner decision packet / manual approval form tests.\n"
);

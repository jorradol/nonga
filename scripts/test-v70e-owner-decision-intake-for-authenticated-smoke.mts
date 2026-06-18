/**
 * v7.0E — Owner Decision Intake for Authenticated Smoke
 * (static validation only)
 * npm run test:v70e-owner-decision-intake-for-authenticated-smoke
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0E-owner-decision-intake-for-authenticated-smoke.md";

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
  "=== v7.0E Owner Decision Intake for Authenticated Smoke ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0E", /v7\.0E/i.test(doc));
ok(
  "phase title owner decision intake",
  /Owner Decision Intake for Authenticated Smoke/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 1dfb298", doc.includes("1dfb298"));

// --- verdict ---
ok(
  "verdict OWNER DECISION INTAKE ONLY",
  /PARTIAL — OWNER DECISION INTAKE ONLY|PARTIAL -- OWNER DECISION INTAKE ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v7.0A", /v7\.0A/i.test(doc));
ok("references v7.0B", /v7\.0B/i.test(doc));
ok("references v7.0C", /v7\.0C/i.test(doc));
ok("references v7.0D", /v7\.0D/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("owner decision purpose section", /Owner decision purpose/i.test(doc));
ok("decision options section", /Decision options/i.test(doc));
ok("recommended decision section", /Recommended decision/i.test(doc));
ok(
  "approved scope if yes section",
  /Approved scope if owner says YES/i.test(doc)
);
ok("explicit non-approvals section", /Explicit non-approvals/i.test(doc));
ok("owner attestation fields section", /Owner attestation fields/i.test(doc));
ok(
  "non-pii decision entry format section",
  /Non-PII decision entry format/i.test(doc)
);
ok("relationship to v6.9M section", /Relationship to v6\.9M/i.test(doc));
ok("relationship to v6.9Q section", /Relationship to v6\.9Q/i.test(doc));
ok("relationship to v7.0D section", /Relationship to v7\.0D/i.test(doc));
ok(
  "relationship to v6.7C-1-G section",
  /Relationship to v6\.7C-1-G/i.test(doc)
);
ok("what a yes allows section", /What a YES decision allows/i.test(doc));
ok(
  "what a yes not allow section",
  /What a YES decision does not allow/i.test(doc)
);
ok(
  "what a no/hold means section",
  /What a NO \/ HOLD decision means/i.test(doc)
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

// --- decision options ---
ok("option yes limited prep", /YES \(limited prep\)/i.test(doc));
ok("option no", /\*\*NO\*\*/.test(doc));
ok("option hold", /\*\*HOLD\*\*/.test(doc));

// --- approved scope / non-approval items ---
for (let i = 1; i <= 4; i++) {
  ok(`approved scope AS-${i}`, doc.includes(`AS-${i}`));
}
for (let i = 1; i <= 7; i++) {
  ok(`explicit non-approval NA-${i}`, doc.includes(`NA-${i}`));
}

// --- decision table OD-1..OD-8 default PENDING ---
for (let i = 1; i <= 8; i++) {
  const id = `OD-${i}`;
  ok(`decision item ${id}`, doc.includes(id));
  const rowRe = new RegExp(`\\| ${id} \\|[^\\n]*\\| _PENDING_ \\| PENDING \\|`);
  ok(`decision item ${id} default PENDING`, rowRe.test(doc));
}
ok(
  "od-1 authenticated smoke prep",
  /OD-1 \| owner decision for authenticated smoke prep/i.test(doc)
);
ok(
  "od-2 no thor import",
  /OD-2 \| owner confirms no Thor runtime import approval/i.test(doc)
);
ok(
  "od-3 no gemini",
  /OD-3 \| owner confirms no user-visible Gemini approval/i.test(doc)
);

// --- owner attestation fields ---
ok("attestation decision date", /decision date/i.test(doc));
ok("attestation owner role label", /owner role label/i.test(doc));
ok("attestation decision field", /\| decision \|/i.test(doc));

// --- non-PII decision entry format ---
ok("status_only present", /STATUS_ONLY/.test(doc));
ok("redacted present", /REDACTED/.test(doc));

// --- v7.0E is NOT authenticated smoke execution ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|NOT an authenticated smoke execution|v7\.0E \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
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

// --- not owner GO for real revenue pilot ---
ok(
  "not owner go for revenue pilot",
  /ไม่ใช่.*owner GO สำหรับ revenue pilot จริง|NOT owner GO for real revenue pilot|Owner GO for real revenue pilot.*NO/i.test(
    doc
  )
);

// --- still awaiting smoke result + owner approval ---
ok(
  "awaiting operator smoke result",
  /รอ operator authenticated smoke result|AWAITING OPERATOR RESULT/i.test(doc)
);
ok(
  "awaiting owner approval",
  /รอ owner approval|REQUIRED — not given|PREPARE ONLY/i.test(doc)
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
  /ส่ง credential\/session\/cookie\/token|ไม่ส่ง credential|Credential \/ session \/ cookie \/ token/i.test(
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
  /PII \/ raw contact \/ plate \/ VIN|PII\/raw contact\/plate\/VIN|raw buyer data/i.test(
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
  pkg.includes("test:v70e-owner-decision-intake-for-authenticated-smoke")
);

console.log(
  "\nDone v7.0E owner decision intake for authenticated smoke tests.\n"
);

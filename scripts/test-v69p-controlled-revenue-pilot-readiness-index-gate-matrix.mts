/**
 * v6.9P — Controlled Revenue Pilot Readiness Index / Gate Matrix
 * (static validation only)
 * npm run test:v69p-controlled-revenue-pilot-readiness-index-gate-matrix
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9P-controlled-revenue-pilot-readiness-index-gate-matrix.md";

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
  "=== v6.9P Controlled Revenue Pilot Readiness Index / Gate Matrix ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9P", /v6\.9P/i.test(doc));
ok(
  "phase title readiness index gate matrix",
  /Controlled Revenue Pilot Readiness Index \/ Gate Matrix/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline f4a2f69", doc.includes("f4a2f69"));

// --- verdict ---
ok(
  "verdict GATE MATRIX ONLY",
  /PARTIAL — GATE MATRIX ONLY|PARTIAL -- GATE MATRIX ONLY/i.test(doc)
);

// --- references to dependent phases ---
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9N", /v6\.9N/i.test(doc));
ok("references v6.9O", /v6\.9O/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current global verdict section", /Current global verdict/i.test(doc));
ok("gate matrix section", /## 3\. Gate matrix/i.test(doc));
ok("ready items section", /READY items/i.test(doc));
ok("partial items section", /PARTIAL items/i.test(doc));
ok("blocked items section", /BLOCKED items/i.test(doc));
ok("defer items section", /DEFER items/i.test(doc));
ok(
  "required before thor section",
  /Required before Thor runtime import/i.test(doc)
);
ok(
  "required before pilot section",
  /Required before controlled revenue pilot/i.test(doc)
);
ok(
  "required before production section",
  /Required before production readiness/i.test(doc)
);
ok("smallest next actions section", /Smallest next actions/i.test(doc));
ok("risk summary section", /Risk summary/i.test(doc));
ok("owner decision section", /Owner decision/i.test(doc));
ok(
  "relation section",
  /Relation to v6\.9M, v6\.7C-1-F, v6\.7C-1-G, v6\.9N, v6\.9O/i.test(doc)
);
ok("next slices section", /Next slices/i.test(doc));

// --- status vocabulary ---
for (const status of ["READY", "PARTIAL", "BLOCKED", "DEFER"]) {
  ok(`status ${status} present`, doc.includes(status));
}

// --- gate matrix required rows ---
const GATE_ROWS = [
  "Public privacy redaction / public listing safe path",
  "Dealer Portal → BuyerLead queue wiring",
  "Masked queue + scoped reveal/skip/outcome APIs",
  "Per-listing queue readiness for first pilot",
  "Authenticated dealer portal smoke",
  "Operator authenticated smoke result",
  "Thor owner approval gate",
  "Ops SOP / lead monitor skeleton",
  "Incident / no-go response playbook",
  "Live VIN/plate proof on staging",
  "Thor runtime import",
  "Parent Thor aggregated inbox",
  "User-visible AI / public signup",
  "Production deploy readiness",
];
for (const row of GATE_ROWS) {
  ok(`gate row: ${row}`, doc.includes(row));
}

// --- locked statuses ---
ok(
  "authenticated smoke PARTIAL awaiting operator",
  /Authenticated dealer portal smoke \| \*\*PARTIAL\*\*.*awaiting operator safe session result/i.test(
    doc
  )
);
ok(
  "operator smoke result PARTIAL awaiting non-PII",
  /Operator authenticated smoke result \| \*\*PARTIAL\*\*.*awaiting non-PII result/i.test(
    doc
  )
);
ok(
  "thor owner gate blocked/partial awaiting owner",
  /Thor owner approval gate \| \*\*BLOCKED\*\*.*awaiting owner approval/i.test(doc)
);
ok(
  "thor runtime import blocked row",
  /Thor runtime import \| \*\*BLOCKED\*\*/i.test(doc)
);
ok(
  "parent thor inbox defer row",
  /Parent Thor aggregated inbox \| \*\*DEFER\*\*/i.test(doc)
);
ok(
  "user-visible ai/public signup blocked row",
  /User-visible AI \/ public signup \| \*\*BLOCKED\*\*/i.test(doc)
);
ok(
  "production deploy readiness blocked row",
  /Production deploy readiness \| \*\*BLOCKED\*\*/i.test(doc)
);
ok("ops sop skeleton partial", /Ops SOP \/ lead monitor skeleton \| \*\*PARTIAL\*\*/i.test(doc));
ok("incident playbook partial", /Incident \/ no-go response playbook \| \*\*PARTIAL\*\*/i.test(doc));
ok(
  "per-listing queue first pilot not full inbox",
  /sufficient for first pilot.*not full parent inbox|เพียงพอสำหรับ first pilot แต่ยังไม่ใช่ full parent inbox/i.test(
    doc
  )
);

// --- required before Thor runtime import ---
ok("req thor owner approval v6.9M", /owner approval from v6\.9M/i.test(doc));
ok("req operator smoke result v6.7C-1-G", /operator authenticated smoke result from v6\.7C-1-G/i.test(doc));
ok("req non-PII evidence captured", /non-PII evidence captured/i.test(doc));
ok("req no-go playbook acknowledged", /no-go playbook acknowledged/i.test(doc));
ok("req lead monitor skeleton accepted", /lead monitor skeleton accepted/i.test(doc));
ok("req no live leak proof gap", /no live PII\/plate\/VIN leak proof gap/i.test(doc));
ok("req explicit thor approval", /explicit Thor runtime import approval still required/i.test(doc));

// --- required before controlled revenue pilot ---
ok("pilot req owner gate approved", /Thor owner gate approved/i.test(doc));
ok("pilot req authenticated smoke pass", /authenticated smoke PASS/i.test(doc));
ok("pilot req sop accepted", /SOP accepted/i.test(doc));
ok("pilot req incident playbook accepted", /incident playbook accepted/i.test(doc));
ok("pilot req lead monitor without pii", /lead monitor usable without PII/i.test(doc));
ok("pilot req operator assigned", /operator assigned/i.test(doc));
ok("pilot req no-go triggers understood", /no-go triggers understood/i.test(doc));
ok(
  "pilot req first-pilot scope limited",
  /first-pilot scope limited to admin-assisted \/ staging or approved controlled path only/i.test(
    doc
  )
);

// --- required before production readiness ---
ok("prod req deploy plan separate", /production deploy plan separate/i.test(doc));
ok("prod req security review separate", /security \/ privacy review separate/i.test(doc));
ok("prod req multi-dealer isolation", /multi-dealer isolation verified with real sessions/i.test(doc));
ok("prod req incident process tested", /incident process tested/i.test(doc));
ok("prod req billing tiers later", /billing \/ subscription tiers defined later/i.test(doc));
ok(
  "prod req signup ai separately gated",
  /public signup and user-visible AI remain separately gated/i.test(doc)
);

// --- smallest next actions ---
ok("smallest next actions present", /N-1|Smallest next action/i.test(doc));

// --- Thor / defer / blocked invariants ---
ok(
  "thor runtime import remains blocked",
  /Thor.*runtime import.*BLOCKED|Thor runtime import ยัง.*BLOCKED|remains blocked/i.test(
    doc
  )
);
ok(
  "thor not unblocked",
  /Thor Auto runtime import unblocked.*NO|Owner approves Thor runtime import.*NO.*BLOCKED/i.test(
    doc
  )
);
ok("parent thor inbox remains defer", /Parent Thor aggregated inbox.*DEFER/i.test(doc));
ok(
  "user-visible ai remains blocked",
  /User-visible AI enabled.*BLOCKED|User-visible AI \/ public signup.*BLOCKED/i.test(
    doc
  )
);
ok(
  "public signup remains blocked",
  /Public signup opened.*BLOCKED|public signup.*BLOCKED/i.test(doc)
);

// --- not GO / not production-ready / not pilot-ready / not deploy / not revenue pilot ---
ok(
  "not go for thor runtime import",
  /GO FOR THOR RUNTIME IMPORT.*NO|ไม่ใช่.*GO FOR THOR RUNTIME IMPORT|This is NOT GO FOR THOR RUNTIME IMPORT/i.test(
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
  /รอ owner approval|Owner approves.*PENDING/i.test(doc)
);

// --- over-claim guard (line-level, allow negated lines) ---
const lines = doc.split(/\r?\n/);
for (const pattern of OVERCLAIM_PATTERNS) {
  const badLines = lines.filter(
    (ln) =>
      pattern.test(ln) &&
      !/\b(no|not|never|blocked|NOT READY|remains|pending|forbidden|until|only if|ยังไม่)\b/i.test(
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
  pkg.includes(
    "test:v69p-controlled-revenue-pilot-readiness-index-gate-matrix"
  )
);

console.log(
  "\nDone v6.9P controlled revenue pilot readiness index / gate matrix tests.\n"
);

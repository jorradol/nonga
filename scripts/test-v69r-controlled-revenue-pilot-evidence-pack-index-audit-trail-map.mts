/**
 * v6.9R — Controlled Revenue Pilot Evidence Pack Index / Audit Trail Map
 * (static validation only)
 * npm run test:v69r-controlled-revenue-pilot-evidence-pack-index-audit-trail-map
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read. Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9R-controlled-revenue-pilot-evidence-pack-index-audit-trail-map.md";

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
  "=== v6.9R Controlled Revenue Pilot Evidence Pack Index / Audit Trail Map ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v6.9R", /v6\.9R/i.test(doc));
ok(
  "phase title evidence pack index",
  /Evidence Pack Index \/ Audit Trail Map/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 86c19f9", doc.includes("86c19f9"));

// --- verdict ---
ok(
  "verdict EVIDENCE INDEX ONLY",
  /PARTIAL — EVIDENCE INDEX ONLY|PARTIAL -- EVIDENCE INDEX ONLY/i.test(doc)
);

// --- references to dependent phases ---
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9N", /v6\.9N/i.test(doc));
ok("references v6.9O", /v6\.9O/i.test(doc));
ok("references v6.9P", /v6\.9P/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("current global status section", /Current global status/i.test(doc));
ok("evidence pack index section", /Evidence pack index/i.test(doc));
ok("audit trail map section", /Audit trail map/i.test(doc));
ok("what proves section", /What each evidence item proves/i.test(doc));
ok("what not prove section", /What each evidence item does NOT prove/i.test(doc));
ok(
  "missing evidence thor section",
  /Missing evidence before Thor runtime import/i.test(doc)
);
ok(
  "missing evidence pilot section",
  /Missing evidence before controlled revenue pilot/i.test(doc)
);
ok("evidence safety rules section", /Evidence safety rules/i.test(doc));
ok("non-pii evidence format section", /Non-PII evidence format/i.test(doc));
ok("blocked deferred gates section", /Blocked \/ deferred gates/i.test(doc));
ok("owner operator action section", /Owner \/ operator action list/i.test(doc));
ok(
  "relation section",
  /Relation to v6\.9M, v6\.7C-1-F, v6\.7C-1-G, v6\.9N, v6\.9O, v6\.9P, v6\.9Q/i.test(
    doc
  )
);
ok("next slices section", /Next slices/i.test(doc));

// --- evidence items E-01..E-07 ---
for (let i = 1; i <= 7; i++) {
  const id = `E-${String(i).padStart(2, "0")}`;
  ok(`evidence item ${id}`, doc.includes(id));
}
ok("e-01 owner gate checklist", /E-01.*owner gate checklist/i.test(doc));
ok("e-02 smoke runbook", /E-02.*smoke runbook/i.test(doc));
ok("e-03 operator smoke result", /E-03.*operator smoke result/i.test(doc));
ok("e-04 ops sop lead monitor", /E-04.*Ops SOP \+ Lead Monitor/i.test(doc));
ok("e-05 incident playbook", /E-05.*Incident \/ No-Go Response Playbook/i.test(doc));
ok("e-06 readiness matrix", /E-06.*Readiness Index \/ Gate Matrix/i.test(doc));
ok("e-07 owner decision packet", /E-07.*Owner Decision Packet/i.test(doc));

// --- evidence item required attributes (sections present) ---
ok("evidence has source document", /Source document/i.test(doc));
ok("evidence has current verdict", /Current verdict/i.test(doc));
ok("evidence proves table", /What it proves/i.test(doc));
ok("evidence does not prove table", /What it does NOT prove/i.test(doc));
ok("evidence current gate status", /Current global status|current gate|gate status/i.test(doc));
ok("evidence next action", /next action|Next action|Next slices/i.test(doc));

// --- every evidence item: can unblock Thor runtime import = NO ---
ok(
  "unblock column header NO",
  /Can unblock Thor runtime import/i.test(doc)
);
{
  const lines = doc.split(/\r?\n/);
  let allNo = true;
  let firstBad = "";
  for (let i = 1; i <= 7; i++) {
    const id = `E-${String(i).padStart(2, "0")}`;
    // find the index-table row for this E-id that includes the unblock column
    const row = lines.find(
      (ln) =>
        ln.includes(`| ${id} `) &&
        ln.includes("|") &&
        /\*\*NO\*\*/.test(ln)
    );
    if (!row) {
      allNo = false;
      firstBad = id;
      break;
    }
  }
  ok(`all evidence items unblock import = NO`, allNo, firstBad);
}

// --- missing evidence before Thor runtime import ---
ok(
  "missing operator smoke pass",
  /operator authenticated smoke \*\*PASS\*\* from v6\.7C-1-G/i.test(doc)
);
ok(
  "missing owner approval completed",
  /owner approval completed from v6\.9M \/ v6\.9Q/i.test(doc)
);
ok(
  "missing explicit thor approval",
  /explicit separate Thor runtime import approval/i.test(doc)
);
ok("missing non-pii evidence captured", /non-PII evidence captured/i.test(doc));
ok(
  "missing privacy vin plate gap",
  /live privacy \/ VIN \/ plate gap resolved or formally mitigated/i.test(doc)
);
ok(
  "missing sop playbook accepted",
  /SOP \(v6\.9N\) and incident playbook \(v6\.9O\) accepted/i.test(doc)
);
ok(
  "missing matrix updated",
  /readiness matrix \(v6\.9P\) updated after operator result/i.test(doc)
);

// --- missing evidence before controlled revenue pilot ---
ok("pilot missing smoke pass", /authenticated dealer smoke \*\*PASS\*\*/i.test(doc));
ok("pilot missing operator assigned", /operator assigned/i.test(doc));
ok("pilot missing lead monitor accepted", /lead monitor accepted/i.test(doc));
ok("pilot missing no-go acknowledged", /no-go triggers acknowledged/i.test(doc));
ok("pilot missing incident escalation", /incident escalation accepted/i.test(doc));
ok("pilot missing owner form completed", /owner decision form completed/i.test(doc));
ok("pilot missing scope limited", /pilot scope explicitly limited/i.test(doc));
ok(
  "pilot missing no prod/signup/ai unless separate",
  /no production \/ public signup \/ user-visible AI unless separately approved/i.test(
    doc
  )
);

// --- evidence safety rules ---
ok(
  "safety no password/token/session/cookie",
  /ห้ามใส่ password \/ token \/ session \/ cookie/i.test(doc)
);
ok(
  "safety no name/phone/email/raw contact",
  /ห้ามใส่ชื่อจริง เบอร์โทร อีเมล raw contact/i.test(doc)
);
ok("safety no plate/vin", /ห้ามใส่ plate \/ VIN/i.test(doc));
ok(
  "safety count/status/anonymized only",
  /ใช้ count \/ status \/ anonymized labels เท่านั้น/i.test(doc)
);
ok("safety screenshot redact", /screenshot ต้อง redact ก่อนเข้า repo/i.test(doc));
ok(
  "safety agent no login/credential",
  /agent ห้าม login หรืออ่าน credential/i.test(doc)
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
      !/\b(no|not|never|blocked|NOT READY|remains|pending|missing|forbidden|until|only if|ยังไม่|ไม่อนุมัติ)\b/i.test(
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
    "test:v69r-controlled-revenue-pilot-evidence-pack-index-audit-trail-map"
  )
);

console.log(
  "\nDone v6.9R controlled revenue pilot evidence pack index / audit trail map tests.\n"
);

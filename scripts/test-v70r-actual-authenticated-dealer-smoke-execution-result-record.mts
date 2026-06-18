/**
 * v7.0R — Actual Authenticated Dealer Smoke Execution / Operator Safe Session Run
 * (Result Record — static validation only)
 * npm run test:v70r-actual-authenticated-dealer-smoke-execution-result-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no agent login, no user-visible Gemini.
 * Docs + static validation only. Verdict = BLOCKED / NOT RUN (awaiting operator).
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0R-actual-authenticated-dealer-smoke-execution-result-record.md";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /password\s*[=:]\s*['"][^'"]{3,}['"]/i,
  /otp\s*[=:]\s*['"]?\d{4,8}['"]?/i,
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
  "=== v7.0R Actual Authenticated Dealer Smoke Execution Result Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0R", /v7\.0R/i.test(doc));
ok(
  "phase title actual smoke execution result record",
  /Actual Authenticated Dealer Smoke Execution \/ Operator Safe Session Run/i.test(
    doc
  )
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 0e9a344", doc.includes("0e9a344"));

// --- verdict BLOCKED / NOT RUN ---
ok(
  "verdict BLOCKED / NOT RUN",
  /BLOCKED \/ NOT RUN/i.test(doc)
);
ok(
  "execution verdict field blocked/not run",
  /Execution verdict[^\n]*BLOCKED \/ NOT RUN/i.test(doc)
);
ok("pass not claimed", /PASS claimed[^\n]*NO|ห้าม overclaim PASS/i.test(doc));

// --- references to dependent phases ---
ok("references v7.0I", /v7\.0I/i.test(doc));
ok("references v7.0J", /v7\.0J/i.test(doc));
ok("references v7.0P", /v7\.0P/i.test(doc));
ok("references v7.0Q", /v7\.0Q/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("execution verdict section", /Execution verdict/i.test(doc));
ok("execution mode section", /Execution mode \(Option A only\)/i.test(doc));
ok(
  "why blocked/not run section",
  /Why result is BLOCKED \/ NOT RUN/i.test(doc)
);
ok(
  "expected checks section",
  /Expected checks AS-01\.\.AS-09/i.test(doc)
);
ok("evidence intake section", /Evidence intake IN-1\.\.IN-10/i.test(doc));
ok(
  "allowed vs forbidden evidence section",
  /Allowed evidence vs forbidden evidence/i.test(doc)
);
ok(
  "credential/session prohibition section",
  /Credential\/session prohibition/i.test(doc)
);
ok("abort/no-go conditions section", /Abort \/ no-go conditions/i.test(doc));
ok("result handling section", /Result handling/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("safety confirmations section", /Safety confirmations/i.test(doc));
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
ok("next slices section", /Next slices/i.test(doc));

// --- execution mode Option A only ---
ok(
  "execution mode option a only",
  /Option A only/i.test(doc)
);
ok(
  "agent receives credential prohibited",
  /Agent receives credential[^\n]*PROHIBITED|ห้ามให้ AI\/agent รับ credential/i.test(
    doc
  )
);
ok(
  "agent login prohibited",
  /Agent login[^\n]*PROHIBITED|agent[^\n]*ห้าม login/i.test(doc)
);
ok(
  "operator manual login required",
  /Operator manual login[^\n]*REQUIRED|operator ต้อง login เองแบบ manual/i.test(
    doc
  )
);
ok("no credential sharing", /No credential sharing|no credential sharing/i.test(doc));
ok("no session capture", /No session capture|no session capture/i.test(doc));
ok(
  "evidence sanitized text only",
  /sanitized text only/i.test(doc)
);
ok("staging only", /staging only|staging เท่านั้น/i.test(doc));

// --- why blocked content ---
ok(
  "agent must not receive credential reason",
  /AI\/agent ห้ามรับ credential และห้าม login/i.test(doc)
);
ok(
  "no sanitized evidence yet",
  /ยังไม่มี sanitized evidence จาก operator/i.test(doc)
);
ok(
  "result handling blocked rule",
  /login ทำอย่างปลอดภัยไม่ได้[^\n]*BLOCKED \/ NOT RUN|If login cannot be performed safely[^\n]*BLOCKED \/ NOT RUN/i.test(
    doc
  )
);

// --- AS-01..AS-09 framework + each id + NOT RUN ---
ok("AS-01 staging url confirmed", /AS-01[^\n]*staging URL \/ environment confirmed/i.test(doc));
ok(
  "AS-02 operator manual login no credential captured",
  /AS-02[^\n]*operator manual login[^\n]*no credential\/session captured/i.test(
    doc
  )
);
ok("AS-03 landing page loads", /AS-03[^\n]*landing page loads/i.test(doc));
ok(
  "AS-04 dashboard authenticated area",
  /AS-04[^\n]*dashboard[^\n]*authenticated area/i.test(doc)
);
ok(
  "AS-05 lead queue allowed scope",
  /AS-05[^\n]*lead queue[^\n]*allowed scope/i.test(doc)
);
ok(
  "AS-06 no cross-dealer visibility",
  /AS-06[^\n]*no cross-dealer lead visibility/i.test(doc)
);
ok(
  "AS-07 no pii exposed",
  /AS-07[^\n]*no PII\/raw contact\/phone\/email\/plate\/VIN exposed/i.test(doc)
);
ok(
  "AS-08 no firestore write/mutation/deploy/import/gemini",
  /AS-08[^\n]*no Firestore write \/ lead mutation \/ deploy \/ import \/ Gemini enablement/i.test(
    doc
  )
);
ok(
  "AS-09 logout cleanup no token captured",
  /AS-09[^\n]*logout \/ session cleanup[^\n]*no token\/cookie captured/i.test(doc)
);
ok("result range AS-01..AS-09 referenced", /AS-01\.\.AS-09/.test(doc));
ok(
  "AS all not run / blocked",
  /AS-01\.\.AS-09 = \*\*NOT RUN \/ BLOCKED \(all\)\*\*|NOT RUN \/ BLOCKED \(all\)/i.test(
    doc
  )
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

// --- allowed vs forbidden evidence ---
ok(
  "allowed evidence sanitized text only",
  /Allowed[^\n]*sanitized text only/i.test(doc)
);
ok("forbidden credential evidence", /Forbidden[^\n]*credential/i.test(doc));
ok("forbidden screenshot evidence", /Forbidden[^\n]*screenshot/i.test(doc));
ok("forbidden production url", /Forbidden[^\n]*production URL/i.test(doc));
ok("forbidden deploy log", /Forbidden[^\n]*deploy log/i.test(doc));

// --- credential prohibition (most critical) ---
ok(
  "no agent receive credential rule",
  /ห้ามให้ AI\/agent รับ credential/i.test(doc)
);
ok(
  "no paste credential rule",
  /ห้าม paste credential\/password\/OTP\/session\/cookie\/token/i.test(doc)
);
ok(
  "operator manual login only rule",
  /operator ต้อง login เองแบบ manual เท่านั้น/i.test(doc)
);

// --- abort/no-go conditions AB-1..AB-8 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-8/.test(doc));
ok(
  "abort credential/session/token/otp exposure",
  /credential \/ session \/ token \/ OTP exposure/i.test(doc)
);
ok("abort pii exposure", /PII \/ raw contact exposure/i.test(doc));
ok("abort plate/vin exposure", /license plate \/ VIN exposure/i.test(doc));
ok("abort lead leak", /lead leak/i.test(doc));
ok(
  "abort cross-dealer / wrong dealer",
  /cross-dealer leak \/ ข้อมูลผิด dealer/i.test(doc)
);
ok("abort session exposure", /session exposure/i.test(doc));
ok(
  "abort firestore write outside scope",
  /Firestore write \/ lead mutation outside approved scope/i.test(doc)
);
ok(
  "abort production/public/gemini/thor action",
  /any production \/ public signup \/ Gemini \/ Thor import action/i.test(doc)
);
ok(
  "abort immediately on pii/lead/cross-dealer/session",
  /หากพบ PII \/ lead leak \/ cross-dealer leak \/ ข้อมูลผิด dealer \/ session exposure[^\n]*ABORT/i.test(
    doc
  )
);

// --- result handling rules ---
ok(
  "result populate via v7.0J shell",
  /อิง v7\.0J result shell|populate.*v7\.0J|v7\.0J result shell/i.test(doc)
);
ok(
  "no overclaim pass rule",
  /ห้าม overclaim PASS|no overclaim PASS|Do not overclaim PASS/i.test(doc)
);
ok(
  "partial not pass rule",
  /partial visibility[^\n]*PARTIAL|mark PARTIAL ไม่ใช่ PASS/i.test(doc)
);
ok(
  "abort marks abort rule",
  /abort condition occurs[^\n]*ABORT|mark \*\*ABORT\*\*/i.test(doc)
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
ok(
  "no authenticated smoke pass yet",
  /ยังไม่มี.*authenticated smoke PASS|NO authenticated smoke PASS yet|no smoke PASS yet/i.test(
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

// --- agent did not receive credential / did not login ---
ok(
  "agent received credential no",
  /Agent received credential[^\n]*NO/i.test(doc)
);
ok("agent login no", /Agent login[^\n]*NO/i.test(doc));
ok(
  "operator login this slice no",
  /Operator manual login performed \(this slice\)[^\n]*NO/i.test(doc)
);

// --- no PII / raw contact / plate / VIN rule ---
ok(
  "no PII raw contact rule",
  /Buyer\/seller PII \/ VIN \/ plate \/ raw contact in doc.*NO/i.test(doc)
);
ok(
  "no pii rule text",
  /buyer PII \/ raw contact|license plate \/ VIN|PII\/raw contact\/phone\/email\/plate\/VIN/i.test(
    doc
  )
);

// --- no runtime/deploy/env/firestore/import rule ---
ok("no runtime rule", /Runtime code changes.*NO/i.test(doc));
ok("no deploy rule", /Deploy performed.*NO/i.test(doc));
ok("no production url rule", /Production URL \/ action[^\n]*NO/i.test(doc));
ok("no deploy log rule", /Deploy log in repo\/report[^\n]*NO/i.test(doc));
ok("no env rule", /Env \/ secrets \/ deploy config.*Unchanged/i.test(doc));
ok(
  "no firestore rule",
  /Firestore write from agent.*Not touched|Real lead created\/edited in Firestore.*NO/i.test(
    doc
  )
);
ok("no thor import rule", /Thor data imported.*NO/i.test(doc));
ok(
  "no thor import evidence rule",
  /Thor runtime import evidence[^\n]*NO/i.test(doc)
);
ok(
  "no gemini enablement evidence rule",
  /User-visible Gemini enablement evidence[^\n]*NO/i.test(doc)
);

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
    "test:v70r-actual-authenticated-dealer-smoke-execution-result-record"
  )
);

console.log(
  "\nDone v7.0R actual authenticated dealer smoke execution result record tests.\n"
);

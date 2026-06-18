/**
 * v7.0Q — Actual Authenticated Smoke Execution Prep / Final Run Binding
 * (static validation only)
 * npm run test:v70q-actual-authenticated-smoke-execution-prep-final-run-binding
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0Q-actual-authenticated-smoke-execution-prep-final-run-binding.md";

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
  "=== v7.0Q Actual Authenticated Smoke Execution Prep / Final Run Binding ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0Q", /v7\.0Q/i.test(doc));
ok(
  "phase title actual smoke execution prep / final run binding",
  /Actual Authenticated Smoke Execution Prep \/ Final Run Binding/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline e292761", doc.includes("e292761"));

// --- verdict ---
ok(
  "verdict FINAL RUN BINDING ONLY",
  /PARTIAL — ACTUAL AUTHENTICATED SMOKE EXECUTION PREP \/ FINAL RUN BINDING ONLY|PARTIAL -- ACTUAL AUTHENTICATED SMOKE EXECUTION PREP \/ FINAL RUN BINDING ONLY/i.test(
    doc
  )
);

// --- references to dependent phases (source chain binding) ---
ok("references v7.0I", /v7\.0I/i.test(doc));
ok("references v7.0J", /v7\.0J/i.test(doc));
ok("references v7.0K", /v7\.0K/i.test(doc));
ok("references v7.0L", /v7\.0L/i.test(doc));
ok("references v7.0M", /v7\.0M/i.test(doc));
ok("references v7.0N", /v7\.0N/i.test(doc));
ok("references v7.0O", /v7\.0O/i.test(doc));
ok("references v7.0P", /v7\.0P/i.test(doc));
ok("references v6.7C-1-F", /v6\.7C-1-F/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok(
  "why final run binding only section",
  /Why this is final run binding only/i.test(doc)
);
ok("source chain binding section", /Source chain binding/i.test(doc));
ok("final run boundary section", /Final run boundary/i.test(doc));
ok(
  "execution preconditions section",
  /Execution preconditions for next slice/i.test(doc)
);
ok(
  "allowed vs forbidden evidence section",
  /Allowed evidence vs forbidden evidence/i.test(doc)
);
ok(
  "credential/session prohibition section",
  /Credential\/session prohibition/i.test(doc)
);
ok("abort/no-go conditions section", /Abort \/ no-go conditions/i.test(doc));
ok("future result binding section", /Future result binding/i.test(doc));
ok(
  "what this final run binding allows section",
  /What this final run binding allows/i.test(doc)
);
ok(
  "what this final run binding does not allow section",
  /What this final run binding does not allow/i.test(doc)
);
ok("relationship to v7.0P section", /Relationship to v7\.0P/i.test(doc));
ok(
  "relationship to v6.7C-1-F section",
  /Relationship to v6\.7C-1-F \/ v6\.7C-1-G/i.test(doc)
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

// --- source chain binding content (all artefacts bound) ---
ok("bind v7.0I runbook", /v7\.0I[^\n]*runbook|runbook[^\n]*v7\.0I/i.test(doc));
ok(
  "bind v7.0J result shell",
  /v7\.0J[^\n]*result shell|result shell[^\n]*v7\.0J/i.test(doc)
);
ok(
  "bind v7.0K decision packet",
  /v7\.0K[^\n]*decision packet|decision packet[^\n]*v7\.0K/i.test(doc)
);
ok(
  "bind v7.0L decision closure",
  /v7\.0L[^\n]*decision closure|decision closure[^\n]*v7\.0L/i.test(doc)
);
ok(
  "bind v7.0M gate alignment",
  /v7\.0M[^\n]*gate alignment|gate alignment[^\n]*v7\.0M/i.test(doc)
);
ok(
  "bind v7.0N m2 record",
  /v7\.0N[^\n]*M-2|M-2[^\n]*v7\.0N/i.test(doc)
);
ok(
  "bind v7.0O m3 prep",
  /v7\.0O[^\n]*M-3|M-3[^\n]*v7\.0O|v7\.0O[^\n]*safe session prep/i.test(doc)
);
ok(
  "bind v7.0P option A closure",
  /v7\.0P[^\n]*Option A|Option A[^\n]*v7\.0P|v7\.0P[^\n]*selection\/closure/i.test(
    doc
  )
);

// --- final run boundary content ---
ok(
  "next slice may be actual execution",
  /next slice may be actual authenticated dealer smoke execution/i.test(doc)
);
ok(
  "v7.0Q must not login or execute",
  /v7\.0Q[^\n]*must not login or execute|v7\.0Q itself must not login or execute/i.test(
    doc
  )
);
ok(
  "actual login execution separate slice",
  /actual login \+ execution[^\n]*separate|actual login \+ execution ต้องเกิดใน slice แยก/i.test(
    doc
  )
);

// --- execution preconditions EP-1..EP-10 ---
ok("execution preconditions EP present", /EP-1/.test(doc) && /EP-10/.test(doc));
ok("precondition staging only", /staging only/i.test(doc));
ok(
  "precondition option a safe session only",
  /Option A safe session only|Option A safe session/i.test(doc)
);
ok(
  "precondition no credential capture",
  /no credential\/session\/cookie\/token capture/i.test(doc)
);
ok("precondition no sensitive screenshots", /no sensitive screenshots/i.test(doc));
ok(
  "precondition no pii in report",
  /no PII \/ raw contact \/ phone \/ email \/ plate \/ VIN in report/i.test(doc)
);
ok("precondition no thor import", /no Thor runtime import/i.test(doc));
ok(
  "precondition no user-visible gemini",
  /no user-visible Gemini \/ AI|no user-visible Gemini/i.test(doc)
);
ok("precondition no public signup", /no public signup/i.test(doc));
ok("precondition no production deploy", /no production deploy/i.test(doc));
ok("precondition no revenue pilot go", /no revenue pilot GO/i.test(doc));

// --- allowed vs forbidden evidence ---
ok("allowed evidence non-pii", /Allowed[^\n]*non-PII/i.test(doc));
ok("forbidden credential evidence", /Forbidden[^\n]*credential/i.test(doc));
ok("forbidden screenshot evidence", /Forbidden[^\n]*screenshot/i.test(doc));

// --- abort/no-go conditions AB-1..AB-8 ---
ok("abort conditions AB present", /AB-1/.test(doc) && /AB-7/.test(doc));
ok(
  "abort credential/session/token exposure",
  /credential \/ session \/ token exposure/i.test(doc)
);
ok("abort pii/raw contact exposure", /PII \/ raw contact exposure/i.test(doc));
ok("abort lead leak", /lead leak/i.test(doc));
ok("abort cross-dealer visibility", /cross-dealer visibility/i.test(doc));
ok(
  "abort firestore write outside scope",
  /Firestore write or lead mutation outside approved scope/i.test(doc)
);
ok(
  "abort production/public/gemini/thor action",
  /any production \/ public \/ Gemini \/ Thor import action/i.test(doc)
);
ok(
  "abort on pii/lead leak/cross-dealer",
  /หากพบ PII \/ lead leak \/ cross-dealer leak[^\n]*abort|abort.*PII.*lead leak.*cross-dealer/i.test(
    doc
  )
);

// --- future result binding content ---
ok(
  "result via v7.0J shell",
  /result โดยใช้ v7\.0J result shell|result ต้องกรอกผ่าน v7\.0J result shell|using v7\.0J result shell/i.test(
    doc
  )
);
ok(
  "result evidence-based",
  /evidence-based/i.test(doc)
);
ok(
  "no overclaim before actual execution result",
  /ห้าม overclaim[^\n]*ก่อน[^\n]*actual execution result|no overclaim[^\n]*actual execution result/i.test(
    doc
  )
);
ok(
  "v7.0R or next execution slice populates result",
  /v7\.0R[^\n]*result|v7\.0R หรือ next execution slice/i.test(doc)
);

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

// --- v7.0Q is NOT execution / not smoke result / not login round ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|This is NOT an authenticated smoke execution/i.test(
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

// --- option A safe-session path / actual login separate ---
ok(
  "option a safe-session path not login this slice",
  /safe-session path เท่านั้น ไม่ใช่การ login ใน slice นี้|safe-session path only \(NOT a login in this slice\)/i.test(
    doc
  )
);
ok(
  "actual login in separate slice",
  /actual login \+ execution ต้องเกิดใน slice แยก|actual login[^\n]*separate slice|actual login \+ execution = separate slice/i.test(
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
  /operator login จริง[^\n]*ใน slice นี้|Operator login in this slice.*NO/i.test(
    doc
  )
);

// --- no screenshot rule ---
ok(
  "no screenshot rule",
  /Screenshot attached.*NO|ไม่แนบ screenshot|ไม่มี screenshot|ห้ามแนบ screenshot|ไม่มี \*\*screenshot\*\*/i.test(
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
  /buyer PII \/ raw contact|license plate \/ VIN|PII \/ raw contact \/ phone \/ email \/ plate \/ VIN/i.test(
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
    "test:v70q-actual-authenticated-smoke-execution-prep-final-run-binding"
  )
);

console.log(
  "\nDone v7.0Q actual authenticated smoke execution prep / final run binding tests.\n"
);

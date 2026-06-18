/**
 * v7.0C — Authenticated Dealer Smoke Safe Session Prep Packet
 * (static validation only)
 * npm run test:v70c-authenticated-dealer-smoke-safe-session-prep-packet
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no operator login, no user-visible Gemini.
 * Docs + static validation only.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.0C-authenticated-dealer-smoke-safe-session-prep-packet.md";

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
  "=== v7.0C Authenticated Dealer Smoke Safe Session Prep Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 3000);
ok("phase name v7.0C", /v7\.0C/i.test(doc));
ok(
  "phase title prep packet",
  /Authenticated Dealer Smoke Safe Session Prep Packet/i.test(doc)
);
ok(
  "branch feature/chat-image-attachment-v1",
  doc.includes("feature/chat-image-attachment-v1")
);
ok("baseline 0d8a8f9", doc.includes("0d8a8f9"));

// --- verdict ---
ok(
  "verdict AUTHENTICATED SMOKE SAFE SESSION PREP ONLY",
  /PARTIAL — AUTHENTICATED SMOKE SAFE SESSION PREP ONLY|PARTIAL -- AUTHENTICATED SMOKE SAFE SESSION PREP ONLY/i.test(
    doc
  )
);

// --- references to dependent phases ---
ok("references v7.0A", /v7\.0A/i.test(doc));
ok("references v7.0B", /v7\.0B/i.test(doc));
ok("references v6.7C-1-G", /v6\.7C-1-G/i.test(doc));
ok("references v6.9M", /v6\.9M/i.test(doc));
ok("references v6.9Q", /v6\.9Q/i.test(doc));

// --- required main sections ---
ok("executive summary section", /Executive summary/i.test(doc));
ok("baseline section", /##\s*\d+\.\s*Baseline/i.test(doc));
ok("current gate status section", /Current gate status/i.test(doc));
ok("why prep-only section", /Why v7\.0C is prep-only/i.test(doc));
ok("safe session boundary section", /Safe session boundary/i.test(doc));
ok("operator responsibilities section", /Operator responsibilities/i.test(doc));
ok("forbidden data list section", /Forbidden data list/i.test(doc));
ok("non-pii evidence format section", /Non-PII evidence format/i.test(doc));
ok(
  "authenticated smoke readiness checklist section",
  /Authenticated smoke readiness checklist/i.test(doc)
);
ok(
  "dealer portal smoke path outline section",
  /Dealer portal smoke path outline/i.test(doc)
);
ok(
  "lead queue smoke path outline section",
  /Lead queue smoke path outline/i.test(doc)
);
ok(
  "expected count/status-only outputs section",
  /Expected count\/status-only outputs/i.test(doc)
);
ok("what can be recorded section", /What can be recorded/i.test(doc));
ok("what must not be recorded section", /What must not be recorded/i.test(doc));
ok("abort/no-go conditions section", /Abort \/ no-go conditions/i.test(doc));
ok(
  "relationship to v6.7C-1-G section",
  /Relationship to v6\.7C-1-G/i.test(doc)
);
ok(
  "relationship to owner approval section",
  /Relationship to v6\.9M \/ v6\.9Q owner approval/i.test(doc)
);
ok(
  "what this proves section",
  /What this prep packet proves/i.test(doc)
);
ok(
  "what this not prove section",
  /What this prep packet does NOT prove/i.test(doc)
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

// --- safe session boundary content ---
ok("boundary operator login self", /operator\/ลุง เท่านั้น/i.test(doc));
ok("boundary agent login forbidden", /agent login.*ห้าม|agent ไม่ login/i.test(doc));
ok(
  "boundary no credential return",
  /ห้ามส่งกลับมา|ไม่มี credential\/session\/cookie\/token ออกจากเครื่อง/i.test(doc)
);

// --- operator responsibilities content ---
for (let i = 1; i <= 7; i++) {
  ok(`operator responsibility OR-${i}`, doc.includes(`OR-${i}`));
}

// --- readiness checklist RC-01..RC-06 ---
for (let i = 1; i <= 6; i++) {
  const id = `RC-${String(i).padStart(2, "0")}`;
  ok(`readiness item ${id}`, doc.includes(id));
}

// --- smoke path outlines ---
ok("dealer portal step DP-1", /DP-1/.test(doc));
ok("lead queue step LQ-1", /LQ-1/.test(doc));

// --- abort/no-go conditions ---
for (let i = 1; i <= 6; i++) {
  ok(`abort condition AB-${i}`, doc.includes(`AB-${i}`));
}

// --- non-PII evidence format / count-status ---
ok("count_only present", /COUNT_ONLY/.test(doc));
ok("status_only present", /STATUS_ONLY/.test(doc));
ok("redacted present", /REDACTED/.test(doc));
ok("ep referenced", /EP-01\.\.EP-07/i.test(doc));
ok("nc referenced", /NC-01\.\.NC-06/i.test(doc));

// --- v7.0C is NOT authenticated smoke execution ---
ok(
  "not authenticated smoke execution",
  /ไม่ใช่.*authenticated smoke execution|NOT an authenticated smoke execution|v7\.0C \*\*ไม่ใช่\*\* authenticated smoke execution/i.test(
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
  /no credential sharing|Password \/ token \/ session \/ cookie \/ credential|ห้ามแชร์ password|ไม่แชร์ password/i.test(
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
  /Buyer phone number|raw lead contact|License plate|VIN/i.test(doc)
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
  pkg.includes(
    "test:v70c-authenticated-dealer-smoke-safe-session-prep-packet"
  )
);

console.log(
  "\nDone v7.0C authenticated dealer smoke safe session prep packet tests.\n"
);

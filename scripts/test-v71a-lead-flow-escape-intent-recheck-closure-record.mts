/**
 * v7.1A — Lead Flow Escape + Intent Re-check Closure Record
 * (static validation only)
 * npm run test:v71a-lead-flow-escape-intent-recheck-closure-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no user-visible Gemini. Docs + static validation only.
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.1A-lead-flow-escape-intent-recheck-closure-record.md";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /password\s*[=:]\s*['"][^'"]{3,}['"]/i,
  /session(?:Id|Cookie|Token)\s*[=:]\s*['"][^'"]{6,}['"]/i,
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

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v7.1A Lead Flow Escape + Intent Re-check Closure Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / phase ---
ok("doc exists", doc.length > 2000);
ok("phase name v7.1A", /v7\.1A/i.test(doc));
ok(
  "title closure record",
  /Lead Flow Escape \+ Intent Re-check Closure Record/i.test(doc)
);
ok("verdict closed", /CLOSED — v7\.1 LEAD FLOW ESCAPE|v7\.1 ปิดรอบแล้ว/i.test(doc));

// --- (1) goal ---
ok("section goal", /##\s*1\.\s*เป้าหมาย v7\.1/.test(doc));
ok("goal mentions escape + recheck", /Lead Flow Escape \+ Intent Re-check/i.test(doc));
ok("goal mentions pause not send", /พัก lead.*ไม่ส่ง|ไม่ส่ง lead/i.test(doc));

// --- (2) commit / push ---
ok("commit full hash", doc.includes("6ab26fd4012639c19a56d71e5bb52ea25af9bf68"));
ok("commit short hash", /\b6ab26fd\b/.test(doc));
ok("branch name", doc.includes("feature/chat-image-attachment-v1"));
ok("push range", doc.includes("c5bed06..6ab26fd"));
ok("local equals origin", /local = origin/i.test(doc));
ok("working tree clean", /working tree clean/i.test(doc));

// --- (3) six changed files ---
const SIX_FILES = [
  "src/services/leads/buyerLeadFlowEscape.ts",
  "src/services/leads/buyerLeadCaptureFlow.ts",
  "src/hooks/chat/useChat.ts",
  "scripts/test-v71-lead-flow-escape-intent-recheck.mts",
  "docs/v7.1-lead-flow-escape-intent-recheck.md",
  "package.json",
];
for (const f of SIX_FILES) {
  ok(`changed file listed: ${f}`, doc.includes(f));
}

// --- (4) test result ---
ok("test PASS 34/34", /PASS 34\/34/.test(doc));
ok(
  "lint known existing issue v69m",
  /test-v69m[^\n]*/i.test(doc) && /known existing issue/i.test(doc)
);
ok("known issue out of scope", /นอก scope/i.test(doc));

// --- (5) safety confirmations ---
ok("no production deploy", /Production deploy \| \*\*NO\*\*/i.test(doc));
ok("no staging deploy", /Staging deploy \| \*\*NO\*\*/i.test(doc));
ok(
  "no user-visible AI",
  /User-visible AI \/ Gemini จริง เปิด \| \*\*NO\*\*/i.test(doc)
);
ok(
  "no auto lead send",
  /ส่ง lead จริงเองโดยไม่ยืนยัน \| \*\*NO\*\*/i.test(doc)
);
ok("buyer enters phone", /เบอร์ลูกค้าต้องกรอกเอง[^\n]*\*\*YES/i.test(doc));
ok("no guess phone", /เดาเบอร์ลูกค้า \| \*\*NO\*\*/i.test(doc));
ok("no pull phone", /ดึงเบอร์แทนลูกค้า \| \*\*NO\*\*/i.test(doc));
ok("no queue display", /แตะ queue display[^\n]*\*\*NO\*\*/i.test(doc));
ok(
  "no full plate exposure",
  /เปิดเผยทะเบียนเต็มใน public\/buyer chat \| \*\*NO\*\*/i.test(doc)
);
ok(
  "no phone exposure public",
  /เปิดเผยเบอร์ใน public\/buyer chat \| \*\*NO\*\*/i.test(doc)
);
ok("paused is draft not sent", /paused lead = draft ไม่ส่ง \| \*\*YES\*\*/i.test(doc));

// --- (6) handoff to v7.2..v7.5 ---
ok("handoff v7.2 memory", /v7\.2 Conversational Lead Memory/i.test(doc));
ok(
  "handoff v7.3 preview no queue",
  /v7\.3 Natural Lead Preview \+ No Queue Count Display/i.test(doc)
);
ok(
  "handoff v7.4 fusion",
  /v7\.4 AI Answer Naturalness \+ Car Card Narrative Fusion/i.test(doc)
);
ok(
  "handoff v7.5 market context",
  /v7\.5 Thai Used-car Market Context \+ Safety Advice Layer/i.test(doc)
);

// --- (7) close round + new chat for v7.2 ---
ok("round closed", /v7\.1 ปิดรอบแล้ว \(CLOSED\)/i.test(doc));
ok("new chat for v7.2 only", /v7\.2[^\n]*แชทใหม่|แชทใหม่[^\n]*v7\.2/i.test(doc));
ok("not start v7.2 here", /ไม่เริ่ม v7\.2 ในแชทนี้/i.test(doc));

// --- artifacts referenced by this closure record exist ---
ok(
  "main v7.1 doc exists",
  existsSync("docs/v7.1-lead-flow-escape-intent-recheck.md")
);
ok(
  "v7.1 harness exists",
  existsSync("scripts/test-v71-lead-flow-escape-intent-recheck.mts")
);
ok(
  "escape module exists",
  existsSync("src/services/leads/buyerLeadFlowEscape.ts")
);

// --- no secret / PII / plate tokens in doc ---
for (const pattern of SECRET_PATTERNS) {
  ok(`no secret pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PII_PATTERNS) {
  ok(`no pii pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PLATE_PATTERNS) {
  ok(`no plate-like token ${pattern}`, !pattern.test(doc));
}

// --- package scripts registered ---
ok(
  "v7.1 package script registered",
  pkg.includes("test:v71-lead-flow-escape-intent-recheck")
);
ok(
  "v7.1A closure package script registered",
  pkg.includes("test:v71a-lead-flow-escape-intent-recheck-closure-record")
);

console.log(
  "\nDone v7.1A lead flow escape + intent re-check closure record tests.\n"
);

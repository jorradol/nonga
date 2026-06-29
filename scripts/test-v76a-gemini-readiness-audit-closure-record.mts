/**
 * v7.6A — Gemini Readiness Audit Closure Record (static validation only)
 * npm run test:v76a-gemini-readiness-audit-closure-record
 *
 * Validates the closure record doc only — does NOT fetch network/staging, call
 * gcloud/firebase, change env/secrets, or invoke Gemini. CLOSURE-ONLY / DOCS-ONLY.
 */
import { readFileSync } from "node:fs";

const CLOSURE_DOC =
  "docs/v7.6A-gemini-readiness-audit-closure-record.md";
const V76_DOC =
  "docs/v7.6-gemini-readiness-audit-user-visible-ai-go-no-go-plan.md";
const SELF_PATH =
  "scripts/test-v76a-gemini-readiness-audit-closure-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT = "test:v76a-gemini-readiness-audit-closure-record";

const HEAD_FULL = "f6f85fbae10ae97f688e1c96f492f0ca4a86b697";
const HEAD_SHORT = "f6f85fb";
const PUSH_RANGE = "d2a29b6..f6f85fb";
const STAGING_RUNTIME = "92d0dac";
const BRANCH = "feature/chat-image-attachment-v1";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

console.log("=== v7.6A Gemini Readiness Audit Closure Record ===\n");

const doc = readFileSync(CLOSURE_DOC, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + closure-only labelling ---
{
  ok("closure doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
  ok("doc v7.6A label", doc.includes("v7.6A"));
  ok("doc title closure record", /closure record/i.test(doc));
  ok(
    "doc closure-only / docs-only / static validation",
    /closure-only/i.test(doc) &&
      /docs-only/i.test(doc) &&
      /static validation/i.test(doc)
  );
  ok("doc references v7.6 source plan", doc.includes(V76_DOC) || doc.includes("v7.6"));
}

// --- baseline commit + push ---
{
  ok("baseline commit short f6f85fb", doc.includes(HEAD_SHORT));
  ok("baseline commit full sha", doc.includes(HEAD_FULL));
  ok("push range d2a29b6..f6f85fb", doc.includes(PUSH_RANGE));
  ok("branch named", doc.includes(BRANCH));
  ok("local = origin stated", /local HEAD = origin HEAD|local = origin/i.test(doc));
  ok("push success stated", /push สำเร็จ/i.test(doc));
  ok("no force push stated", /ไม่ใช่ force push|ไม่ force/i.test(doc));
}

// --- readiness-only, not runtime activation ---
{
  ok("readiness-only not runtime activation", /readiness only|readiness-only/i.test(doc) && /ไม่ใช่ runtime activation|not runtime activation/i.test(doc));
  ok("no runtime/src touched", /ไม่แตะ runtime|runtime \/ `src\/`.*ไม่ถูกแตะ|ไม่ถูกแตะ/i.test(doc));
}

// --- no deploy / no production touch / no env secrets change ---
{
  ok("no deploy staging", /ไม่มี deploy staging/i.test(doc));
  ok("no deploy production", /ไม่มี deploy production/i.test(doc));
  ok("production not touched", /production ไม่ถูกแตะ/i.test(doc));
  ok("no env/secrets/api key change", /env \/ secrets \/ API key: ไม่เปลี่ยน|ไม่เปลี่ยน.*env|env\/secrets.*ไม่/i.test(doc));
}

// --- gemini / user-visible / public signup / real lead still off ---
{
  ok("gemini still off", /Gemini จริง: ยังปิด|Gemini.*ยังปิด/i.test(doc));
  ok("user-visible ai still off", /user-visible AI จริง: ยังปิด|user-visible AI.*ยังปิด/i.test(doc));
  ok("public signup still off", /public signup: ยังปิด|public signup.*ยังปิด/i.test(doc));
  ok("real lead sending still off", /real lead sending: ยังปิด|real lead sending.*ยังปิด/i.test(doc));
}

// --- staging runtime still 92d0dac ---
{
  ok("staging runtime 92d0dac", doc.includes(STAGING_RUNTIME));
  ok("staging runtime unchanged stated", /staging runtime ยังเป็น `?92d0dac`?|staging runtime.*ยังคงเป็น.*92d0dac/i.test(doc));
}

// --- deterministic flow is source of truth ---
{
  ok("deterministic flow source of truth", /deterministic flow.*source of truth/i.test(doc));
  ok("ai not source of truth", /ไม่ใช่ source of truth|ไม่ใช่ผู้ตัดสินใจ flow/i.test(doc));
}

// --- guardrails + known blockers + next step + rollback + checklist ---
{
  ok("guardrails summary present", /guardrails สำคัญ/i.test(doc));
  ok("known blockers present", /known blockers/i.test(doc));
  ok("next recommended step present", /next recommended step|v7\.7/i.test(doc));
  ok("v7.7 admin-only shadow not enabled", /admin-only Gemini shadow|admin-only shadow/i.test(doc) && /ยังไม่เปิดจริง|ยังไม่ activate|ไม่ activate/i.test(doc));
  ok("rollback/safety note present", /rollback/i.test(doc) && /ยังไม่มีอะไรต้อง rollback/i.test(doc));
  ok("closure checklist present", /closure checklist/i.test(doc));
  ok("closure verdict present", /closure verdict|v7\.6 CLOSED/i.test(doc));
}

// --- no PII / phone / VIN / full plate / secret / API key in doc ---
{
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key (AIza...)", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key (sk-...)", /\bsk-[a-zA-Z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{12,}/],
    ["gemini key assignment", /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i],
  ];
  for (const [label, re] of SECRET_PATTERNS) {
    ok(`doc no secret: ${label}`, !re.test(doc));
  }
  ok("doc no thai phone number", !/\b0[689]\d{8}\b/.test(doc));
  ok("doc no 9-11 plain digit run", !/(?<![\d,.-])\d{9,11}(?![\d,.-])/.test(doc));
  ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));
}

// --- this validation script is static-only ---
{
  const head = self.split("// --- this validation script is static-only ---")[0] ?? self;
  ok("script no http fetch", !/fetch\s*\(\s*[`'"]https?:/.test(head));
  ok("script no generateContent", !/generateContent\s*\(/.test(head));
  ok("script no gcloud exec", !/exec(?:Sync)?\s*\(\s*[`'"]\s*gcloud/.test(head));
  ok("script no firebase deploy exec", !/exec(?:Sync)?\s*\(\s*[`'"][^`'"]*firebase deploy/.test(head));
  ok("script reads no secrets/env", !/process\.env\[/.test(head));
  ok("script uses readFileSync", head.includes("readFileSync"));
}

// --- package.json npm script ---
{
  ok("package.json has npm script key", pkg.includes(`"${NPM_SCRIPT}"`));
  ok(
    "package.json points to mts",
    pkg.includes("scripts/test-v76a-gemini-readiness-audit-closure-record.mts")
  );
}

console.log(`\nDone v7.6A closure record validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

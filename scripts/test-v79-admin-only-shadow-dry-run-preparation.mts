/**
 * v7.9 — Admin-only Shadow Dry-run Preparation (static validation only)
 * npm run test:v79-admin-only-shadow-dry-run-preparation
 *
 * Validates the dry-run preparation doc only — does NOT fetch network/staging,
 * call gcloud/firebase, change env/secrets, read secrets, or invoke Gemini.
 * PREPARATION-ONLY / DOCS-ONLY / STATIC VALIDATION ONLY — NOT ACTIVATION.
 */
import { readFileSync } from "node:fs";

const PREP_DOC = "docs/v7.9-admin-only-shadow-dry-run-preparation.md";
const V78_DOC = "docs/v7.8-admin-only-gemini-shadow-smoke-approval-packet.md";
const SELF_PATH = "scripts/test-v79-admin-only-shadow-dry-run-preparation.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT = "test:v79-admin-only-shadow-dry-run-preparation";

const HEAD_SHORT = "c451807";
const HEAD_FULL = "c45180714328a7734fbce7bee68b8d2b15d1ed40";
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

console.log("=== v7.9 Admin-only Shadow Dry-run Preparation ===\n");

const doc = readFileSync(PREP_DOC, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + preparation/docs-only labelling ---
{
  ok("prep doc exists (substantial)", doc.length > 4000, `${doc.length} chars`);
  ok("doc v7.9 label", doc.includes("v7.9"));
  ok("doc title dry-run preparation", /dry-run preparation/i.test(doc));
  ok(
    "doc preparation/docs-only / static validation only",
    /preparation-only/i.test(doc) &&
      /docs-only/i.test(doc) &&
      /static validation/i.test(doc)
  );
  ok("doc not activation stated", /not activation|ไม่ใช่ activation|ไม่ใช่การขอเปิด/i.test(doc));
  ok("doc references v7.8 source", doc.includes(V78_DOC) || doc.includes("v7.8"));
  ok("doc branch named", doc.includes(BRANCH));
}

// (1) executive summary
{
  ok("executive summary present", /executive summary/i.test(doc));
  ok("executive summary mentions ลุงเด่น", /ลุงเด่น/.test(doc));
  ok(
    "executive: prepare readiness not run-now/open-now",
    /เตรียมความพร้อม|เตรียมอะไรให้ครบ/i.test(doc) && /ไม่ใช่ "ซ้อมเลยไหม"|ไม่ใช่ "เปิดเลยไหม"/i.test(doc)
  );
}

// (2) current baseline
{
  ok("current baseline section present", /current baseline/i.test(doc));
  ok("baseline head short c451807", doc.includes(HEAD_SHORT));
  ok("baseline head full sha", doc.includes(HEAD_FULL));
  ok("staging runtime 92d0dac present", doc.includes(STAGING_RUNTIME));
  ok(
    "staging runtime unchanged stated",
    /staging runtime ยังเป็น `?92d0dac`?/i.test(doc)
  );
  ok("no deploy stated", /ไม่มี deploy|no deploy/i.test(doc));
  ok("no production touch stated", /production ไม่ถูกแตะ|no production touch/i.test(doc));
  ok("gemini still off", /Gemini จริง: ยังปิด|Gemini.*ยังปิด/i.test(doc));
  ok("user-visible ai still off", /user-visible AI จริง: ยังปิด|user-visible AI.*ยังปิด/i.test(doc));
  ok("admin-only shadow not opened", /admin-only shadow จริง: ยังไม่ได้เปิด|admin-only shadow.*ยังไม่/i.test(doc));
  ok("buyer-facing ai not opened", /buyer-facing AI: ยังไม่ได้เปิด|buyer-facing AI.*ยังไม่/i.test(doc));
  ok("public signup still off", /public signup: ยังปิด|public signup.*ยังปิด/i.test(doc));
  ok("real lead sending still off", /real lead sending: ยังปิด|real lead sending.*ยังปิด/i.test(doc));
  ok("no src/runtime change v7.7..v7.8A", /ไม่มี `src\/` \/ runtime change จาก v7\.7 ถึง v7\.8A/i.test(doc));
}

// (3) purpose
{
  ok("purpose section present", /## 3\. Purpose/i.test(doc));
  ok("purpose: prepare dry-run readiness only", /เตรียม \*\*dry-run readiness เท่านั้น|dry-run readiness เท่านั้น/i.test(doc));
  ok("purpose: not open shadow yet", /ยังไม่เปิด shadow จริง/i.test(doc));
}

// (4) Gate B readiness checklist
{
  ok("gate B readiness section present", /Gate B Readiness/i.test(doc));
  const gateB = [
    "secret wiring plan",
    "no real secret in repo",
    "secret access boundary",
    "local / staging separation",
    "rollback if secret wiring fails",
  ];
  for (const g of gateB) {
    ok(`gate B has: ${g}`, doc.includes(g));
  }
}

// (5) Gate C readiness checklist
{
  ok("gate C readiness section present", /Gate C Readiness/i.test(doc));
  const gateC = [
    "admin-only dry-run approval requirements",
    "admin-only route/boundary proof",
    "no buyer-facing exposure proof",
    "deterministic output remains primary",
  ];
  for (const g of gateC) {
    ok(`gate C has: ${g}`, doc.includes(g));
  }
}

// (6) budget/quota cap readiness
{
  ok("budget/quota cap readiness section present", /Budget \/ Quota Cap Readiness/i.test(doc));
  const caps = [
    "daily cap",
    "per-run cap",
    "timeout cap",
    "emergency stop",
    "cost evidence required before activation",
  ];
  for (const c of caps) {
    ok(`budget/quota: ${c}`, doc.includes(c));
  }
}

// (7) kill switch drill readiness
{
  ok("kill switch drill readiness section present", /Kill Switch Drill Readiness/i.test(doc));
  ok("kill: what switch stops AI", /what switch stops AI/i.test(doc));
  ok("kill: how to verify switch", /how to verify switch/i.test(doc));
  ok("kill: what evidence must be captured", /what evidence must be captured/i.test(doc));
  ok("kill: fallback after switch off", /fallback after switch off/i.test(doc));
  ok("kill: emergency kill switch flag referenced", /EMERGENCY_KILL_SWITCH/i.test(doc));
}

// (8) fallback deterministic proof
{
  ok("fallback deterministic proof section present", /Fallback Deterministic Proof/i.test(doc));
  const fb = [
    "AI fail",
    "timeout",
    "blocked output",
    "unsafe output",
    "hallucination risk",
    "policy uncertainty",
  ];
  for (const f of fb) {
    ok(`fallback covers: ${f}`, doc.includes(f));
  }
}

// (9) logging/redaction proof
{
  ok("logging/redaction proof section present", /Logging \/ Redaction Proof/i.test(doc));
  ok("logging: allowed sanitized logs", /Allowed \(sanitized logs\)|sanitized logs/i.test(doc));
  ok("logging: forbidden logs", /Forbidden logs/i.test(doc));
  ok("logging: no phone", /no phone/i.test(doc));
  ok("logging: no full plate", /no full plate/i.test(doc));
  ok("logging: no VIN", /no VIN/i.test(doc));
  ok("logging: no internal price", /no internal price/i.test(doc));
  ok("logging: no wholesale price", /no wholesale price/i.test(doc));
  ok("logging: no raw owner data", /no raw owner data/i.test(doc));
}

// (10) admin-only boundary proof
{
  ok("admin-only boundary proof section present", /Admin-only Boundary Proof/i.test(doc));
  ok("boundary: who can see AI shadow output", /who can see AI shadow output/i.test(doc));
  ok("boundary: how buyer/public are blocked", /how buyer\/public are blocked/i.test(doc));
  ok("boundary: how to prove no buyer exposure", /how to prove no buyer exposure/i.test(doc));
}

// (11) shadow dry-run scenario list
{
  ok("scenario list section present", /Shadow Dry-run Scenario List/i.test(doc));
  const scenarios = [
    "ค้นหารถ",
    "เปรียบเทียบรถ",
    "ถามผ่อน",
    "ขอผู้ขายติดต่อกลับ",
    "เปลี่ยนใจค้นหาต่อ",
    "ถามความปลอดภัย",
    "prompt injection",
  ];
  for (const s of scenarios) {
    ok(`scenario: ${s}`, doc.includes(s));
  }
}

// (12) evidence checklist before owner sign-off
{
  ok("evidence checklist section present", /Evidence Checklist ก่อนขอ owner sign-off/i.test(doc));
  ok("evidence: sanitized screenshots/log excerpts", /screenshots \/ log excerpts แบบ sanitized/i.test(doc));
  ok("evidence: validation result", /validation result/i.test(doc));
  ok("evidence: no deploy confirmation", /no deploy confirmation/i.test(doc));
  ok("evidence: no env/secrets change confirmation", /no env\/secrets change confirmation/i.test(doc));
  ok("evidence: no runtime activation confirmation", /no runtime activation confirmation/i.test(doc));
}

// (13) explicit non-goals
{
  ok("explicit non-goals section present", /Explicit Non-Goals/i.test(doc));
  ok("non-goal: no gemini in v7.9", /ไม่เปิด Gemini จริงใน v7\.9/i.test(doc));
  ok("non-goal: no deploy", /ไม่ deploy/i.test(doc));
  ok("non-goal: no admin-only shadow real", /ไม่เปิด admin-only shadow จริง/i.test(doc));
  ok("non-goal: no buyer-facing ai", /ไม่เปิด buyer-facing AI/i.test(doc));
  ok("non-goal: no real lead", /ไม่ส่ง lead จริง/i.test(doc));
  ok("non-goal: no runtime change", /ไม่แก้ runtime \/ `src\/`|ไม่แก้ runtime/i.test(doc));
}

// (14) stop condition / rollback preparation
{
  ok("stop condition / rollback prep section present", /Stop Condition \/ Rollback Preparation/i.test(doc));
  ok("kill switch in stop condition", /kill switch/i.test(doc));
  ok("nothing to rollback now", /ยังไม่มีอะไรต้อง rollback/i.test(doc));
}

// (15) recommended next version
{
  ok("recommended next version section present", /Recommended Next Version หลัง v7\.9/i.test(doc));
  ok("next: v7.9A closure record", /v7\.9A.*closure record/i.test(doc));
  ok("next: v8.0 owner sign-off packet", /v8\.0.*owner sign-off packet/i.test(doc));
  ok("next: gate B/C condition", /Gate B \/ Gate C พร้อมจริง/i.test(doc));
  ok("not buyer-facing AI yet", /ยังไม่ใช่ buyer-facing AI/i.test(doc));
}

// (16) static validation confirms docs-only / preparation-only
{
  ok("static validation section present", /Static Validation/i.test(doc));
  ok("validation confirms docs-only/preparation-only", /docs-only \/ preparation-only|preparation-only/i.test(doc));
  ok("npm script referenced in doc", doc.includes(NPM_SCRIPT));
}

// runtime/src not touched in this round
ok("no runtime/src touched stated", /ไม่แตะ runtime \/ `src\/`|ไม่แก้ runtime \/ `src\/`/i.test(doc));

// deterministic flow source of truth
ok("deterministic flow source of truth", /deterministic flow.*authority|deterministic flow.*source of truth|deterministic output remains primary/i.test(doc));

// no env/secrets/api key change
ok("no env/secrets/api key change", /no env\/secrets\/API key change|env \/ secrets \/ API key: \*\*ไม่เปลี่ยน|env \/ secrets \/ API key.*ไม่เปลี่ยน|ไม่เพิ่ม\/เปลี่ยน env|ไม่เพิ่ม\/แก้ env/i.test(doc));

// admin-only / shadow-only / no buyer-facing exposure
{
  ok("admin-only present", /admin-only/i.test(doc));
  ok("shadow-only present", /shadow-only/i.test(doc));
  ok("no buyer-facing exposure present", /no buyer-facing exposure/i.test(doc));
}

// no PII / phone / full plate / VIN / secret / API key value in doc
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
  // 9-11 plain decimal run, but NOT when embedded in a hex commit hash.
  ok(
    "doc no 9-11 plain digit run",
    !/(?<![\dA-Fa-f,.\-])\d{9,11}(?![\dA-Fa-f,.\-])/.test(doc)
  );
  ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));
}

// --- this validation script is static-only ---
{
  const head = self.split("// --- this validation script is static-only ---")[0] ?? self;
  ok("script no http fetch", !/fetch\s*\(\s*[`'"]https?:/.test(head));
  ok("script no generateContent", !/generateContent\s*\(/.test(head));
  ok("script no gcloud exec", !/exec(?:Sync)?\s*\(\s*[`'"]\s*gcloud/.test(head));
  ok("script no firebase deploy exec", !/exec(?:Sync)?\s*\(\s*[`'"][^`'"]*firebase deploy/.test(head));
  ok("script no firebase admin import", !/firebase-admin/.test(head));
  ok("script reads no secrets/env", !/process\.env\[/.test(head));
  ok("script uses readFileSync", head.includes("readFileSync"));
}

// --- package.json npm script ---
{
  ok("package.json has npm script key", pkg.includes(`"${NPM_SCRIPT}"`));
  ok(
    "package.json points to mts",
    pkg.includes("scripts/test-v79-admin-only-shadow-dry-run-preparation.mts")
  );
}

console.log(`\nDone v7.9 admin-only shadow dry-run preparation validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

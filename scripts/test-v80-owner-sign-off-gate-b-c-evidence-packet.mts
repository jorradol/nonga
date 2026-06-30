/**
 * v8.0 — Owner Sign-off / Gate B-C Evidence Packet (static validation only)
 * npm run test:v80-owner-sign-off-gate-b-c-evidence-packet
 *
 * Validates the evidence packet doc only — does NOT fetch network/staging,
 * call gcloud/firebase, change env/secrets, read secrets, or invoke Gemini.
 * EVIDENCE-PACKET-ONLY / DOCS-ONLY / STATIC VALIDATION ONLY — NOT ACTIVATION.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.0-owner-sign-off-gate-b-c-evidence-packet.md";
const PREV_DOC = "docs/v7.9A-admin-only-shadow-dry-run-preparation-closure-record.md";
const SELF_PATH = "scripts/test-v80-owner-sign-off-gate-b-c-evidence-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT = "test:v80-owner-sign-off-gate-b-c-evidence-packet";

const HEAD_SHORT = "1ba136f";
const HEAD_FULL = "1ba136f04dcad8889aafa8e1c0d278e69ba4bb8a";
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

console.log("=== v8.0 Owner Sign-off / Gate B-C Evidence Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + packet/docs-only labelling ---
{
  ok("doc exists (substantial)", doc.length > 5000, `${doc.length} chars`);
  ok("doc v8.0 label", doc.includes("v8.0"));
  ok("doc title owner sign-off", /Owner Sign-off/i.test(doc));
  ok("doc title gate b-c evidence packet", /Gate B-C Evidence Packet/i.test(doc));
  ok(
    "doc evidence-packet-only / docs-only / static validation",
    /evidence-packet-only/i.test(doc) &&
      /docs-only/i.test(doc) &&
      /static validation/i.test(doc)
  );
  ok("doc not activation stated", /not activation|ไม่ใช่การ activate|ไม่ใช่การเปิดใช้งานจริง/i.test(doc));
  ok("doc references v7.9A source", doc.includes(PREV_DOC) || doc.includes("v7.9A"));
  ok("doc branch named", doc.includes(BRANCH));
}

// (1) executive summary
{
  ok("executive summary present", /Executive Summary/i.test(doc));
  ok("executive summary mentions ลุงเด่น", /ลุงเด่น/.test(doc));
}

// (2) current baseline
{
  ok("current baseline section present", /Current Baseline/i.test(doc));
  ok("baseline head short 1ba136f", doc.includes(HEAD_SHORT));
  ok("baseline head full sha", doc.includes(HEAD_FULL));
  ok("staging runtime 92d0dac present", doc.includes(STAGING_RUNTIME));
  ok("no deploy stated", /no deploy|ไม่มี deploy/i.test(doc));
  ok("no production touch stated", /no production touch|production ไม่ถูกแตะ/i.test(doc));
  ok("no env/secrets/api key change", /no env\/secrets\/API key change|ไม่เปลี่ยน/i.test(doc));
  ok("gemini still off", /Gemini จริง: ยังปิด|Gemini.*ยังปิด/i.test(doc));
  ok("user-visible ai still off", /user-visible AI จริง: ยังปิด|user-visible AI.*ยังปิด/i.test(doc));
  ok("admin-only shadow still off", /admin-only shadow จริง: ยังไม่ได้เปิด|admin-only shadow.*ยังไม่ได้เปิด/i.test(doc));
  ok("buyer-facing ai still off", /buyer-facing AI: ยังไม่ได้เปิด|buyer-facing AI.*ยังไม่ได้เปิด/i.test(doc));
  ok("public signup still off", /public signup: ยังปิด|public signup.*ยังปิด/i.test(doc));
  ok("real lead sending still off", /real lead sending: ยังปิด|real lead sending.*ยังปิด/i.test(doc));
  ok("no src/runtime change stated", /ไม่มี `src\/` \/ runtime change|ไม่แตะ runtime/i.test(doc));
  ok("deterministic flow source of truth", /deterministic flow.*source of truth/i.test(doc));
}

// (3) decision purpose
{
  ok("decision purpose section present", /Decision Purpose/i.test(doc));
  ok("purpose: evidence packet for owner sign-off", /owner sign-off evidence packet/i.test(doc));
  ok("purpose: not open admin-only shadow real", /ไม่ใช่การเปิด admin-only shadow จริง/i.test(doc));
  ok("purpose: not open gemini real", /ไม่ใช่การเปิด Gemini จริง/i.test(doc));
}

// (4) Gate B evidence checklist
{
  ok("gate b section present", /Gate B Evidence Checklist/i.test(doc));
  const gateB = [
    "secret wiring readiness",
    "no real secret in repo",
    "secret storage",
    "access boundary proof",
    "verification method",
    "failure/rollback condition",
  ];
  for (const g of gateB) ok(`gate B has: ${g}`, doc.toLowerCase().includes(g.toLowerCase()));
}

// (5) Gate C evidence checklist
{
  ok("gate c section present", /Gate C Evidence Checklist/i.test(doc));
  const gateC = [
    "admin-only dry-run readiness",
    "admin-only boundary proof",
    "no buyer-facing exposure proof",
    "deterministic remains source of truth",
    "shadow output visible only to admin/reviewer",
  ];
  for (const g of gateC) ok(`gate C has: ${g}`, doc.toLowerCase().includes(g.toLowerCase()));
}

// (6) Budget / quota evidence checklist
{
  ok("budget/quota section present", /Budget \/ Quota Evidence Checklist/i.test(doc));
  const caps = [
    "daily cap",
    "per-run cap",
    "timeout cap",
    "emergency stop",
    "cost/quota baseline",
    "owner-approved spending limit",
  ];
  for (const c of caps) ok(`budget/quota has: ${c}`, doc.toLowerCase().includes(c.toLowerCase()));
}

// (7) Kill switch evidence checklist
{
  ok("kill switch section present", /Kill Switch Evidence Checklist/i.test(doc));
  ok("kill switch: switch name/config concept", /switch name\/config concept/i.test(doc));
  ok("kill switch: verification steps", /verification steps/i.test(doc));
  ok("kill switch: expected evidence", /expected evidence/i.test(doc));
  ok("kill switch: stop condition", /stop condition if switch fails/i.test(doc));
}

// (8) fallback deterministic evidence checklist
{
  ok("fallback deterministic section present", /Fallback Deterministic Evidence Checklist/i.test(doc));
  const fb = ["AI fail", "timeout", "blocked output", "unsafe output", "hallucination risk", "policy uncertainty"];
  for (const f of fb) ok(`fallback has: ${f}`, doc.includes(f));
}

// (9) logging/redaction
{
  ok("logging/redaction section present", /Logging \/ Redaction Evidence Checklist/i.test(doc));
  const redaction = [
    "allowed sanitized logs",
    "forbidden logs",
    "ห้าม phone",
    "ห้าม full plate",
    "ห้าม VIN",
    "ห้าม internal price",
    "ห้าม wholesale price",
    "ห้าม raw owner data",
    "ห้าม raw lead data",
  ];
  for (const r of redaction) ok(`logging/redaction has: ${r}`, doc.includes(r));
}

// (10) PDPA / privacy
{
  ok("pdpa/privacy section present", /PDPA \/ Privacy Evidence Checklist/i.test(doc));
  ok("pdpa: no pii sent to ai", /no PII sent to AI/i.test(doc));
  ok("pdpa: no phone auto-fill", /no phone auto-fill/i.test(doc));
  ok("pdpa: buyer fills phone at final confirmation", /buyer กรอกเบอร์เองที่ final confirmation เท่านั้น/i.test(doc));
  ok("pdpa: consent preview still present", /consent preview ยังอยู่/i.test(doc));
  ok("pdpa: final confirmation still present", /final confirmation ยังอยู่/i.test(doc));
}

// (11) lead / dealer isolation
{
  ok("lead/dealer isolation section present", /Lead \/ Dealer Isolation Evidence Checklist/i.test(doc));
  ok("no real lead sending in phase", /no real lead sending in this phase/i.test(doc));
  ok("owner/dealer routing unchanged", /owner\/dealer routing ไม่เปลี่ยน/i.test(doc));
  ok("dealer isolation unchanged", /dealer isolation ไม่ถูกแตะ/i.test(doc));
  ok("queue count not user-facing", /queue count ไม่แสดง user-facing/i.test(doc));
}

// (12) shadow scenario evidence list
{
  ok("shadow scenario section present", /Shadow Scenario Evidence Checklist/i.test(doc));
  const scenarios = [
    "ค้นหารถ",
    "เปรียบเทียบรถ",
    "ถามผ่อน",
    "ขอผู้ขายติดต่อกลับ",
    "เปลี่ยนใจค้นหาต่อ",
    "โอนเงิน/มัดจำ/ความปลอดภัย",
    "prompt injection",
  ];
  for (const s of scenarios) ok(`scenario has: ${s}`, doc.includes(s));
}

// (13) owner decision form go/hold/no-go
{
  ok("owner decision form section present", /Owner Decision Form/i.test(doc));
  ok("decision has GO", /GO/.test(doc));
  ok("decision has HOLD", /HOLD/.test(doc));
  ok("decision has NO-GO", /NO-GO/.test(doc));
}

// (14) explicit non-goals
{
  ok("explicit non-goals section present", /Explicit Non-Goals/i.test(doc));
  ok("non-goal no real gemini open in v8.0", /ไม่เปิด Gemini จริงใน v8\.0/i.test(doc));
  ok("non-goal no admin-only shadow real", /ไม่เปิด admin-only shadow จริง/i.test(doc));
  ok("non-goal no buyer-facing ai", /ไม่เปิด buyer-facing AI/i.test(doc));
  ok("non-goal no deploy", /ไม่ deploy/i.test(doc));
  ok("non-goal no secret", /ไม่ใส่ secret/i.test(doc));
  ok("non-goal no real lead sending", /ไม่ส่ง lead จริง/i.test(doc));
  ok("non-goal no runtime change", /ไม่แก้ runtime/i.test(doc));
}

// (15) stop/rollback future
{
  ok("stop/rollback section present", /Stop \/ Rollback Conditions/i.test(doc));
  ok("stop condition stated", /Stop condition/i.test(doc));
  ok("rollback condition stated", /Rollback condition/i.test(doc));
}

// (16) evidence format list
{
  ok("evidence format section present", /Evidence Format Requirement/i.test(doc));
  const formats = [
    "sanitized screenshots",
    "sanitized logs",
    "validation result",
    "git status",
    "no deploy confirmation",
    "no env/secrets change confirmation",
    "no runtime activation confirmation",
  ];
  for (const f of formats) ok(`evidence format has: ${f}`, doc.includes(f));
}

// (17) known blockers
{
  ok("known blockers section present", /Known Blockers/i.test(doc));
  const blockers = [
    "owner sign-off ยังไม่มี",
    "secret wiring ยังไม่พิสูจน์",
    "budget/quota cap ยังไม่พิสูจน์",
    "kill switch ยังไม่มี evidence",
    "admin-only boundary ยังไม่มี evidence",
    "fallback/logging-redaction ยังไม่มี evidence",
  ];
  for (const b of blockers) ok(`blocker has: ${b}`, doc.includes(b));
}

// (18) recommended next version
{
  ok("recommended next version section present", /Recommended Next Version/i.test(doc));
  ok("next includes v8.0A closure record", /v8\.0A closure record/i.test(doc));
  ok("next includes v8.1 gate b-c evidence collection plan", /v8\.1 Gate B-C evidence collection dry-run plan/i.test(doc));
  ok("next explicitly not auto gemini activation", /ต้องไม่ใช่ Gemini activation อัตโนมัติ/i.test(doc));
}

// (19) static validation section
{
  ok("static validation section present", /Static Validation \(v8\.0\)/i.test(doc));
  ok("doc references v8.0 npm script", doc.includes(NPM_SCRIPT));
  ok("doc says docs-only/evidence-packet-only/no activation", /docs-only \/ evidence-packet-only \/ no activation/i.test(doc));
}

// no deploy + no production + no env/secrets + deterministic authority + no runtime change
{
  ok("explicit no deploy", /ไม่มี deploy|no deploy/i.test(doc));
  ok("explicit no production touch", /production ไม่ถูกแตะ|no production touch/i.test(doc));
  ok("explicit no env/secrets/api key change", /no env\/secrets\/API key change|ไม่เปลี่ยน/i.test(doc));
  ok("explicit no runtime/src change", /ไม่แตะ runtime \/ `src\/`|ไม่แก้ runtime|no runtime/i.test(doc));
  ok("explicit deterministic source of truth", /deterministic flow remains \*\*source of truth\*\*|deterministic flow.*source of truth/i.test(doc));
}

// --- no real secret / phone / vin / plate-like value in doc ---
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
  ok("package.json points to v80 mts", pkg.includes("scripts/test-v80-owner-sign-off-gate-b-c-evidence-packet.mts"));
}

console.log(`\nDone v8.0 owner sign-off evidence packet validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

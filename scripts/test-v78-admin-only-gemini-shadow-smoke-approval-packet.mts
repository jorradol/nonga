/**
 * v7.8 — Admin-only Gemini Shadow Smoke Approval Packet (static validation only)
 * npm run test:v78-admin-only-gemini-shadow-smoke-approval-packet
 *
 * Validates the approval packet doc only — does NOT fetch network/staging, call
 * gcloud/firebase, change env/secrets, read secrets, or invoke Gemini.
 * APPROVAL PACKET / DOCS-ONLY / STATIC VALIDATION ONLY — NOT ACTIVATION.
 */
import { readFileSync } from "node:fs";

const PACKET_DOC =
  "docs/v7.8-admin-only-gemini-shadow-smoke-approval-packet.md";
const V76_DOC =
  "docs/v7.6-gemini-readiness-audit-user-visible-ai-go-no-go-plan.md";
const V77_DOC = "docs/v7.7-admin-only-gemini-shadow-smoke-plan.md";
const SELF_PATH =
  "scripts/test-v78-admin-only-gemini-shadow-smoke-approval-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT = "test:v78-admin-only-gemini-shadow-smoke-approval-packet";

const HEAD_SHORT = "bd1a96f";
const HEAD_FULL = "bd1a96f7dfdf99333bbbf16d26f5c389060185e5";
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

console.log("=== v7.8 Admin-only Gemini Shadow Smoke Approval Packet ===\n");

const doc = readFileSync(PACKET_DOC, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + approval/docs-only labelling ---
{
  ok("packet doc exists (substantial)", doc.length > 4000, `${doc.length} chars`);
  ok("doc v7.8 label", doc.includes("v7.8"));
  ok("doc title approval packet", /approval packet/i.test(doc));
  ok(
    "doc approval/docs-only / static validation only",
    /approval packet/i.test(doc) &&
      /docs-only/i.test(doc) &&
      /static validation/i.test(doc)
  );
  ok("doc not activation stated", /not activation|ไม่ใช่ activation|ไม่ใช่การขอเปิด/i.test(doc));
  ok("doc references v7.6 source", doc.includes(V76_DOC) || doc.includes("v7.6"));
  ok("doc references v7.7 source", doc.includes(V77_DOC) || doc.includes("v7.7"));
  ok("doc branch named", doc.includes(BRANCH));
}

// (1) executive summary
{
  ok("executive summary present", /executive summary/i.test(doc));
  ok("executive summary mentions ลุงเด่น", /ลุงเด่น/.test(doc));
  ok(
    "executive: question is ready-to-ask not open-now",
    /พร้อมจะขอเปิด admin-only shadow จริง|พร้อมจะขอเปิด admin-only shadow|พร้อมขอเปิด admin-only shadow/i.test(doc)
  );
}

// (2) current baseline
{
  ok("current baseline section present", /current baseline/i.test(doc));
  ok("baseline head short bd1a96f", doc.includes(HEAD_SHORT));
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
  ok("public signup still off", /public signup: ยังปิด|public signup.*ยังปิด/i.test(doc));
  ok("real lead sending still off", /real lead sending: ยังปิด|real lead sending.*ยังปิด/i.test(doc));
}

// (3) decision being requested
{
  ok("decision being requested section present", /decision being requested/i.test(doc));
  ok("not buyer-facing ai request", /ไม่ใช่การขอเปิด buyer-facing AI|ยังไม่ใช่การขอเปิด buyer-facing AI/i.test(doc));
  ok(
    "packet to decide readiness",
    /พร้อมขอเปิด admin-only shadow จริงหรือยัง|พร้อมขอเปิด admin-only shadow/i.test(doc)
  );
}

// (4) preconditions before opening admin-only shadow real
{
  ok("preconditions section present", /preconditions ก่อนเปิด admin-only shadow|preconditions/i.test(doc));
  const preconditions = [
    "owner sign-off",
    "secret wiring",
    "budget cap",
    "quota cap",
    "kill switch verified",
    "fallback deterministic verified",
    "admin-only boundary verified",
    "logging / redaction verified",
  ];
  for (const p of preconditions) {
    ok(`precondition: ${p}`, doc.includes(p));
  }
  ok(
    "no PII/plate/VIN/phone/internal price in AI payload",
    /no PII\/plate\/VIN\/phone\/internal price in AI payload/i.test(doc)
  );
}

// (5) go/no-go checklist
{
  ok("go/no-go checklist section present", /go\/no-go checklist/i.test(doc));
  const gng = [
    "no blocker",
    "owner sign-off",
    "secret wiring approve",
    "budget caps approve",
    "kill switch drill pass",
    "fallback deterministic pass",
    "output safety pass",
    "PII redaction pass",
    "admin-only boundary pass",
    "no buyer-facing exposure pass",
  ];
  for (const g of gng) {
    ok(`go/no-go has: ${g}`, doc.includes(g));
  }
  ok("no-go stated", /NO-GO/i.test(doc));
}

// (6) risk matrix
{
  ok("risk matrix section present", /risk matrix/i.test(doc));
  const risks: Array<[string, RegExp]> = [
    ["PDPA / privacy", /PDPA \/ privacy|PDPA/i],
    ["hallucination ภาษาไทย", /hallucination ภาษาไทย/i],
    ["prompt injection", /prompt injection/i],
    ["accidental buyer-facing exposure", /accidental buyer-facing exposure/i],
    ["cost / quota overrun", /cost \/ quota overrun|cost\/quota overrun/i],
    ["fallback failure", /fallback failure/i],
    ["lead consent bypass", /lead consent bypass/i],
    ["dealer/owner isolation risk", /dealer \/ owner isolation risk|dealer\/owner isolation/i],
  ];
  for (const [label, re] of risks) {
    ok(`risk: ${label}`, re.test(doc));
  }
}

// (7) mitigation plan for each risk
{
  ok("mitigation plan section present", /mitigation plan/i.test(doc));
  for (const r of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]) {
    ok(`mitigation covers ${r}`, new RegExp(`\\b${r}\\b`).test(doc));
  }
}

// (8) owner approval gates A-E
{
  ok("owner approval gates section present", /owner approval gates/i.test(doc));
  ok("gate A docs approval", /Gate A.*docs approval/i.test(doc));
  ok("gate B secret/budget/kill switch", /Gate B.*secret|Gate B.*budget|Gate B.*kill switch/i.test(doc));
  ok("gate C admin-only dry-run", /Gate C.*dry-run/i.test(doc));
  ok("gate D shadow result review", /Gate D.*shadow result/i.test(doc));
  ok("gate E future user-visible ai (separate)", /Gate E.*user-visible AI/i.test(doc) && /แยกต่างหาก|gate แยก/i.test(doc));
}

// (9) explicit non-goals
{
  ok("explicit non-goals section present", /explicit non-goals|non-goals/i.test(doc));
  ok("non-goal: no gemini in v7.8", /ไม่เปิด Gemini จริงใน v7\.8/i.test(doc));
  ok("non-goal: no deploy", /ไม่ deploy/i.test(doc));
  ok("non-goal: no buyer-facing ai", /ไม่เปิด buyer-facing AI/i.test(doc));
  ok("non-goal: no real lead", /ไม่ส่ง lead จริง/i.test(doc));
  ok("non-goal: no runtime change", /ไม่แก้ runtime \/ `src\/`|ไม่แก้ runtime/i.test(doc));
}

// (10) rollback / stop condition
{
  ok("rollback/stop condition section present", /rollback \/ stop condition|stop condition/i.test(doc));
  ok("kill switch in stop condition", /kill switch/i.test(doc));
  ok("emergency kill switch flag referenced", /EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("nothing to rollback now", /ยังไม่มีอะไรต้อง rollback/i.test(doc));
}

// (11) evidence checklist
{
  ok("evidence checklist section present", /evidence checklist/i.test(doc));
  ok("evidence: secret wiring plan", /secret wiring plan/i.test(doc));
  ok("evidence: budget/quota cap config", /budget cap \/ quota cap|budget cap/i.test(doc));
  ok("evidence: kill switch drill result", /kill switch drill result/i.test(doc));
  ok("evidence: fallback deterministic test result", /fallback deterministic test result/i.test(doc));
  ok("evidence: PII redaction test result", /PII redaction test result/i.test(doc));
  ok("evidence: admin-only boundary verification", /admin-only boundary verification/i.test(doc));
  ok("evidence: sanitized scenario log", /sanitized scenario log/i.test(doc));
}

// (12) recommended next version
{
  ok("recommended next version section present", /recommended next version/i.test(doc));
  ok("next: v7.8A closure record", /v7\.8A.*closure record/i.test(doc));
  ok("next: v7.9 shadow dry-run preparation", /v7\.9.*shadow dry-run preparation/i.test(doc));
  ok("not buyer-facing AI yet", /ยังไม่ใช่ buyer-facing AI/i.test(doc));
}

// (13) static validation confirms docs-only / approval-only
{
  ok("static validation section present", /static validation/i.test(doc));
  ok("validation confirms docs-only/approval-only", /docs-only \/ approval-only|docs-only|approval-only/i.test(doc));
  ok("npm script referenced in doc", doc.includes(NPM_SCRIPT));
}

// runtime/src not touched in this round
ok("no runtime/src touched stated", /ไม่แตะ runtime \/ `src\/`|ไม่แก้ runtime \/ `src\/`/i.test(doc));

// deterministic flow source of truth
ok("deterministic flow source of truth", /deterministic flow.*authority|deterministic flow.*source of truth/i.test(doc));

// no env/secrets/api key change
ok("no env/secrets/api key change", /no env\/secrets\/API key change|env \/ secrets \/ API key: \*\*ไม่เปลี่ยน|env \/ secrets \/ API key.*ไม่เปลี่ยน|ไม่เพิ่ม\/เปลี่ยน env/i.test(doc));

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
    pkg.includes("scripts/test-v78-admin-only-gemini-shadow-smoke-approval-packet.mts")
  );
}

console.log(`\nDone v7.8 admin-only gemini shadow smoke approval packet validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

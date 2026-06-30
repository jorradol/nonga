/**
 * v8.1 — Gate B-C Evidence Collection Dry-run Plan
 * (docs-only / static validation)
 * npm run test:v81-gate-b-c-evidence-collection-dry-run-plan
 *
 * Validates documentation content only.
 * Does NOT deploy, does NOT call Gemini, does NOT read secrets/env,
 * and does NOT modify runtime/source code.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.1-gate-b-c-evidence-collection-dry-run-plan.md";
const SELF_PATH = "scripts/test-v81-gate-b-c-evidence-collection-dry-run-plan.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v81-gate-b-c-evidence-collection-dry-run-plan";

const EXPECTED = {
  branch: "feature/chat-image-attachment-v1",
  headShort: "308439f",
  headFull: "308439fcd276d21d8f00e741d98fb5952ed7594a",
  stagingRuntime: "92d0dac",
};

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

console.log("=== v8.1 Gate B-C Evidence Collection Dry-run Plan Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- core labeling ---
ok("doc exists (substantial)", doc.length > 7000, `${doc.length} chars`);
ok("contains v8.1 label", /v8\.1/i.test(doc));
ok("contains dry-run-plan-only label", /dry-run-plan-only/i.test(doc));
ok("contains docs-only label", /docs-only/i.test(doc));
ok("contains static validation label", /static validation/i.test(doc));

// --- baseline assertions ---
ok("baseline branch present", doc.includes(EXPECTED.branch));
ok("baseline short head present", doc.includes(EXPECTED.headShort));
ok("baseline full head present", doc.includes(EXPECTED.headFull));
ok("baseline staging runtime present", doc.includes(EXPECTED.stagingRuntime));
ok("states no deploy", /no deploy|ไม่มี deploy/i.test(doc));
ok("states no production touch", /production:?\s*ไม่ถูกแตะ|no production touch/i.test(doc));
ok(
  "states no env-secrets-api key change",
  /env\/secrets\/API key: ไม่เปลี่ยน|ไม่มีการแก้ env\/secrets\/API key|no env\/secrets\/API key change/i.test(
    doc
  )
);
ok("states no real secret in repo", /secret จริงใน repo: ไม่มี|no real secret in repo/i.test(doc));
ok("states gemini still off", /Gemini จริง: ยังปิด|ไม่เปิด Gemini จริง/i.test(doc));
ok("states user-visible ai still off", /user-visible AI จริง: ยังปิด|ไม่เปิด user-visible AI/i.test(doc));
ok("states admin-only shadow still off", /admin-only shadow จริง: ยังไม่ได้เปิด|ไม่เปิด admin-only shadow จริง/i.test(doc));
ok("states buyer-facing ai still off", /buyer-facing AI: ยังไม่ได้เปิด|ไม่เปิด buyer-facing AI/i.test(doc));
ok("states public signup still off", /public signup: ยังปิด|ไม่เปิด public signup/i.test(doc));
ok("states real lead sending still off", /real lead sending: ยังปิด|ไม่ส่ง lead จริง/i.test(doc));
ok("states no runtime/src change", /ไม่แก้ runtime|ไม่แตะ `src\/`|ไม่มีการเปลี่ยนแปลง/i.test(doc));
ok("states deterministic source of truth", /deterministic flow.*source of truth/i.test(doc));

// --- required section coverage ---
const REQUIRED_SECTIONS: Array<[string, RegExp]> = [
  ["executive summary", /Executive Summary/i],
  ["current baseline", /Current Baseline/i],
  ["decision purpose", /Decision Purpose/i],
  ["gate b plan", /Gate B Evidence Collection Plan/i],
  ["gate c plan", /Gate C Evidence Collection Plan/i],
  ["budget quota plan", /Budget \/ Quota Evidence Collection Plan/i],
  ["kill switch plan", /Kill Switch Evidence Collection Plan/i],
  ["fallback deterministic plan", /Fallback Deterministic Evidence Collection Plan/i],
  ["logging redaction plan", /Logging \/ Redaction Evidence Collection Plan/i],
  ["pdpa privacy plan", /PDPA \/ Privacy Evidence Collection Plan/i],
  ["lead dealer isolation plan", /Lead \/ Dealer Isolation Evidence Collection Plan/i],
  ["shadow scenario plan", /Shadow Scenario Evidence Collection Plan/i],
  ["evidence format", /Evidence Format ที่ต้องส่งให้ลุงเด่น/i],
  ["owner review checklist", /Owner Review Checklist/i],
  ["explicit non-goals", /Explicit Non-goals/i],
  ["stop rollback conditions", /Stop \/ Rollback Conditions/i],
  ["known blockers", /Known Blockers/i],
  ["recommended next version", /Recommended Next Version/i],
  ["static validation requirement", /Static Validation Requirement/i],
];
for (const [name, re] of REQUIRED_SECTIONS) ok(`section: ${name}`, re.test(doc));

// --- key detail checks in sections ---
{
  ok("gate b mentions secret readiness", /Secret Readiness Evidence/i.test(doc));
  ok("gate b mentions no secret in repo proof", /No Secret in Repo Proof/i.test(doc));
  ok("gate b mentions secret storage boundary", /Secret Storage Boundary Proof/i.test(doc));
  ok("gate b mentions access boundary", /Access Boundary Proof/i.test(doc));
  ok("gate b mentions failure rollback", /Failure \/ Rollback Evidence/i.test(doc));

  ok("gate c mentions admin-only readiness", /Admin-only Dry-run Readiness Evidence/i.test(doc));
  ok("gate c mentions admin-only boundary", /Admin-only Boundary Proof/i.test(doc));
  ok("gate c mentions no buyer-facing exposure", /No Buyer-facing Exposure Proof/i.test(doc));
  ok("gate c mentions deterministic source", /Deterministic Source-of-Truth Proof/i.test(doc));

  ok("budget mentions daily cap", /daily cap evidence/i.test(doc));
  ok("budget mentions per-run cap", /per-run cap evidence/i.test(doc));
  ok("budget mentions timeout cap", /timeout cap evidence/i.test(doc));
  ok("budget mentions emergency stop", /emergency stop evidence/i.test(doc));
  ok("budget mentions baseline", /cost\/quota baseline evidence/i.test(doc));
  ok("budget mentions owner-approved limit", /owner-approved spending limit evidence/i.test(doc));

  ok("kill switch mentions dry-run verification", /Dry-run Verification Steps/i.test(doc));
  ok("kill switch mentions stop condition", /Stop Condition/i.test(doc));

  ok("fallback includes ai fail", /\bAI fail\b/i.test(doc));
  ok("fallback includes timeout", /\btimeout\b/i.test(doc));
  ok("fallback includes blocked output", /blocked output/i.test(doc));
  ok("fallback includes unsafe output", /unsafe output/i.test(doc));
  ok("fallback includes hallucination risk", /hallucination risk/i.test(doc));
  ok("fallback includes policy uncertainty", /policy uncertainty/i.test(doc));

  ok("logging forbidden phone", /phone number/i.test(doc));
  ok("logging forbidden full plate", /full plate number/i.test(doc));
  ok("logging forbidden full vin", /full VIN/i.test(doc));
  ok("logging forbidden internal price", /internal price/i.test(doc));
  ok("logging forbidden wholesale price", /wholesale price/i.test(doc));
  ok("logging forbidden raw owner data", /raw owner data/i.test(doc));
  ok("logging forbidden raw lead data", /raw lead data/i.test(doc));

  ok("pdpa no pii to ai", /no PII sent to AI/i.test(doc));
  ok("pdpa no phone auto-fill", /no phone auto-fill/i.test(doc));
  ok("pdpa final confirmation only", /final confirmation เท่านั้น/i.test(doc));
  ok("pdpa consent preview remains", /consent preview/i.test(doc));
  ok("pdpa final confirmation remains", /final confirmation/i.test(doc));

  ok("lead isolation no real lead sending", /no real lead sending/i.test(doc));
  ok("lead isolation routing unchanged", /routing ไม่เปลี่ยน/i.test(doc));
  ok("lead isolation dealer isolation untouched", /dealer isolation ไม่ถูกแตะ/i.test(doc));
  ok("lead isolation no queue count user-facing", /queue count ไม่แสดง user-facing/i.test(doc));

  ok("shadow scenario search", /ค้นหารถ/i.test(doc));
  ok("shadow scenario compare", /เปรียบเทียบรถ/i.test(doc));
  ok("shadow scenario installment", /ถามผ่อน/i.test(doc));
  ok("shadow scenario callback", /ขอผู้ขายติดต่อกลับ/i.test(doc));
  ok("shadow scenario continue search", /เปลี่ยนใจค้นหาต่อ/i.test(doc));
  ok("shadow scenario transfer deposit safety", /โอนเงิน\/มัดจำ\/ความปลอดภัย/i.test(doc));
  ok("shadow scenario prompt injection", /prompt injection/i.test(doc));
}

// --- explicit non-goals and blockers ---
{
  ok("non-goal no real gemini", /ไม่เปิด Gemini จริงใน v8\.1/i.test(doc));
  ok("non-goal no real admin shadow", /ไม่เปิด admin-only shadow จริง/i.test(doc));
  ok("non-goal no buyer-facing ai", /ไม่เปิด buyer-facing AI/i.test(doc));
  ok("non-goal no deploy", /ไม่ deploy/i.test(doc));
  ok("non-goal no secret", /ไม่ใส่ secret/i.test(doc));
  ok("non-goal no real lead", /ไม่ส่ง lead จริง/i.test(doc));
  ok("non-goal no runtime edit", /ไม่แก้ runtime/i.test(doc));

  ok("blocker owner sign-off missing", /owner sign-off ยังไม่มี/i.test(doc));
  ok("blocker secret wiring unproven", /secret wiring ยังไม่พิสูจน์จริง/i.test(doc));
  ok("blocker budget cap unproven", /budget\/quota cap ยังไม่พิสูจน์จริง/i.test(doc));
  ok("blocker kill switch no runtime evidence", /kill switch ยังไม่มี runtime evidence จริง/i.test(doc));
  ok("blocker admin boundary no runtime evidence", /admin-only boundary ยังไม่มี runtime evidence จริง/i.test(doc));
  ok("blocker fallback logging no runtime evidence", /fallback\/logging-redaction ยังไม่มี runtime evidence จริง/i.test(doc));
}

// --- next version guidance ---
ok("mentions v8.1A closure option", /v8\.1A/i.test(doc));
ok("mentions v8.2 checklist option", /v8\.2/i.test(doc));
ok("next step not auto gemini activation", /ต้องไม่ใช่ Gemini activation อัตโนมัติ/i.test(doc));

// --- ensure no clear activation instructions ---
{
  const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
    ["firebase deploy command", /\bfirebase\s+deploy\b/i],
    ["gcloud run deploy command", /\bgcloud\s+run\s+deploy\b/i],
    ["execute-approved switch", /--execute-approved/],
    ["live gemini invoke", /generateContent\s*\(/],
    ["api key assignment", /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i],
  ];
  for (const [label, re] of FORBIDDEN_PATTERNS) {
    ok(`doc has no activation command: ${label}`, !re.test(doc));
  }
}

// --- secret and pii scan ---
{
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key (AIza...)", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key (sk-...)", /\bsk-[a-zA-Z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{12,}/],
    ["generic token assignment", /\b(?:token|secret|password)\s*[:=]\s*['"][^'"]{10,}['"]/i],
  ];
  for (const [label, re] of SECRET_PATTERNS) {
    ok(`doc no secret pattern: ${label}`, !re.test(doc));
  }
  ok("doc no thai phone number", !/\b0[689]\d{8}\b/.test(doc));
  ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));
}

// --- validator itself stays static-only ---
{
  const head = self.split("// --- validator itself stays static-only ---")[0] ?? self;
  ok("script uses readFileSync only", /readFileSync/.test(head));
  ok("script no fetch", !/\bfetch\s*\(/.test(head));
  ok("script no child_process import", !/from\s+["']node:child_process["']/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no process.env read", !/process\.env/.test(head));
}

// --- package.json script wiring ---
ok("package.json contains v8.1 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.1 validator script",
  pkg.includes("scripts/test-v81-gate-b-c-evidence-collection-dry-run-plan.mts")
);

console.log(`\nDone v8.1 dry-run plan validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

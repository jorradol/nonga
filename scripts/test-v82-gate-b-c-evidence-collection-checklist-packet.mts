/**
 * v8.2 — Gate B-C Evidence Collection Checklist Packet
 * (checklist-only / docs-only / static validation)
 * npm run test:v82-gate-b-c-evidence-collection-checklist-packet
 *
 * Validates documentation coverage and safety constraints only.
 * Does NOT deploy, does NOT call Gemini, does NOT read secrets/env,
 * and does NOT modify runtime/source code.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.2-gate-b-c-evidence-collection-checklist-packet.md";
const SELF_PATH = "scripts/test-v82-gate-b-c-evidence-collection-checklist-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v82-gate-b-c-evidence-collection-checklist-packet";

const EXPECTED = {
  branch: "feature/chat-image-attachment-v1",
  headShort: "34aae52",
  headFull: "34aae52735dc1d46add35c8939525d172a2d196b",
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

console.log("=== v8.2 Gate B-C Evidence Collection Checklist Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- core labeling ---
ok("doc exists (substantial)", doc.length > 9000, `${doc.length} chars`);
ok("contains v8.2 label", /v8\.2/i.test(doc));
ok("contains checklist-packet-only label", /checklist-packet-only/i.test(doc));
ok("contains docs-only label", /docs-only/i.test(doc));
ok("contains static validation label", /static validation/i.test(doc));
ok("states not activation milestone", /not activation milestone|ไม่ใช่ activation milestone/i.test(doc));

// --- baseline assertions ---
ok("baseline branch present", doc.includes(EXPECTED.branch));
ok("baseline short head present", doc.includes(EXPECTED.headShort));
ok("baseline full head present", doc.includes(EXPECTED.headFull));
ok("baseline staging runtime present", doc.includes(EXPECTED.stagingRuntime));
ok("states no deploy", /no deploy|ไม่มี deploy/i.test(doc));
ok("states no production touch", /production:?\s*ไม่ถูกแตะ|no production touch/i.test(doc));
ok(
  "states no env-secrets-api key change",
  /env\/secrets\/API key: ไม่เปลี่ยน|ไม่มีการเปลี่ยน env\/secrets\/API key|no env\/secrets\/API key change/i.test(
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
  ["gate b checklist", /Gate B Checklist/i],
  ["gate c checklist", /Gate C Checklist/i],
  ["pdpa checklist", /PDPA \/ Privacy Checklist/i],
  ["lead dealer isolation checklist", /Lead \/ Dealer Isolation Checklist/i],
  ["deterministic authority checklist", /Deterministic Authority Checklist/i],
  ["shadow scenario checklist", /Shadow Scenario Checklist/i],
  ["logging redaction checklist", /Logging \/ Redaction Checklist/i],
  ["evidence status table", /Evidence Status Table/i],
  ["owner decision table", /Owner Decision Table/i],
  ["explicit non-goals", /Explicit Non-goals/i],
  ["stop rollback", /Stop \/ Rollback Conditions/i],
  ["known blockers", /Known Blockers/i],
  ["recommended next version", /Recommended Next Version/i],
  ["static validation requirement", /Static Validation Requirement/i],
  ["checklist packet snapshot", /Checklist Packet Snapshot/i],
  ["packet verdict", /Packet Verdict/i],
];
for (const [name, re] of REQUIRED_SECTIONS) ok(`section: ${name}`, re.test(doc));

// --- gate b coverage ---
{
  ok("gate b has secret readiness item", /B1\.\s*Secret readiness inventory/i.test(doc));
  ok("gate b has no secret in repo item", /B2\.\s*No secret in repo proof/i.test(doc));
  ok("gate b has storage boundary item", /B3\.\s*Secret storage boundary/i.test(doc));
  ok("gate b has access boundary item", /B4\.\s*Access boundary/i.test(doc));
  ok("gate b has failure rollback item", /B5\.\s*Failure\/rollback readiness/i.test(doc));
  ok("gate b has budget quota item", /B6\.\s*Budget\/quota readiness/i.test(doc));
  ok("gate b has kill switch item", /B7\.\s*Kill switch readiness/i.test(doc));
  ok("mentions daily cap", /daily cap/i.test(doc));
  ok("mentions per-run cap", /per-run cap/i.test(doc));
  ok("mentions timeout cap", /timeout cap/i.test(doc));
  ok("mentions emergency stop", /emergency stop/i.test(doc));
  ok("mentions owner-approved spending limit", /owner-approved spending limit/i.test(doc));
  ok("mentions switch concept", /switch concept/i.test(doc));
  ok("mentions verification evidence", /verification evidence/i.test(doc));
  ok("mentions stop condition", /stop condition/i.test(doc));
}

// --- gate c coverage ---
{
  ok("gate c has admin-only dry-run readiness", /C1\.\s*Admin-only dry-run readiness/i.test(doc));
  ok("gate c has admin-only boundary proof", /C2\.\s*Admin-only boundary proof/i.test(doc));
  ok("gate c has no buyer-facing exposure proof", /C3\.\s*No buyer-facing exposure proof/i.test(doc));
  ok("gate c has deterministic authority proof", /C4\.\s*Deterministic source-of-truth proof/i.test(doc));
  ok("gate c has fallback deterministic proof", /C5\.\s*Fallback deterministic proof/i.test(doc));
  ok("gate c has logging redaction proof", /C6\.\s*Logging\/redaction proof/i.test(doc));
  ok("fallback includes ai fail", /\bAI fail\b/i.test(doc));
  ok("fallback includes timeout", /\btimeout\b/i.test(doc));
  ok("fallback includes blocked output", /blocked/i.test(doc));
  ok("fallback includes unsafe output", /unsafe/i.test(doc));
  ok("fallback includes hallucination risk", /hallucination/i.test(doc));
  ok("fallback includes policy uncertainty", /policy uncertainty/i.test(doc));
}

// --- logging / redaction / forbidden data coverage ---
{
  ok("contains allowed sanitized logs section", /Allowed Sanitized Logs/i.test(doc));
  ok("contains forbidden logs section", /Forbidden Logs/i.test(doc));
  ok("forbidden: phone number", /phone number/i.test(doc));
  ok("forbidden: full plate number", /full plate number/i.test(doc));
  ok("forbidden: full VIN", /full VIN/i.test(doc));
  ok("forbidden: internal price", /internal price/i.test(doc));
  ok("forbidden: wholesale price", /wholesale price/i.test(doc));
  ok("forbidden: raw owner data", /raw owner data/i.test(doc));
  ok("forbidden: raw lead data", /raw lead data/i.test(doc));
  ok("contains sanitized evidence format example", /Sanitized Evidence Format/i.test(doc));
}

// --- pdpa / privacy coverage ---
{
  ok("pdpa no pii to ai", /No PII sent to AI|no PII-to-AI/i.test(doc));
  ok("pdpa no phone auto-fill", /No phone auto-fill|no phone auto-fill/i.test(doc));
  ok("pdpa final confirmation only", /final confirmation เท่านั้น|only at final confirmation/i.test(doc));
  ok("pdpa consent preview retained", /Consent preview retained|consent preview/i.test(doc));
  ok("pdpa final confirmation retained", /Final confirmation retained|final confirmation/i.test(doc));
}

// --- lead / dealer isolation coverage ---
{
  ok("lead isolation no real lead sending", /No real lead sending in this phase|no real lead sending/i.test(doc));
  ok("lead isolation routing unchanged", /Owner\/dealer routing unchanged|routing ไม่เปลี่ยน/i.test(doc));
  ok("lead isolation dealer isolation untouched", /Dealer isolation untouched|dealer isolation ไม่ถูกแตะ/i.test(doc));
  ok("lead isolation queue not user-facing", /Queue count not user-facing|queue count ไม่แสดง user-facing/i.test(doc));
}

// --- shadow scenario list coverage ---
{
  ok("scenario search", /S1\..*ค้นหารถ/i.test(doc));
  ok("scenario compare", /S2\..*เปรียบเทียบรถ/i.test(doc));
  ok("scenario installment", /S3\..*ถามผ่อน/i.test(doc));
  ok("scenario callback", /S4\..*ขอผู้ขายติดต่อกลับ/i.test(doc));
  ok("scenario continue search", /S5\..*เปลี่ยนใจค้นหาต่อ/i.test(doc));
  ok("scenario transfer deposit safety", /S6\..*โอนเงิน\/มัดจำ\/ความปลอดภัย/i.test(doc));
  ok("scenario prompt injection", /S7\..*Prompt injection/i.test(doc));
}

// --- evidence status + decision table checks ---
{
  ok("has current status column", /Current Status/i.test(doc));
  ok("has blocker yes/no column", /Blocker \(Yes\/No\)/i.test(doc));
  ok("has owner decision column", /Owner Decision/i.test(doc));
  ok("decision GO present", /\|\s*GO\s*\|/i.test(doc));
  ok("decision HOLD present", /\|\s*HOLD\s*\|/i.test(doc));
  ok("decision NO-GO present", /\|\s*NO-GO\s*\|/i.test(doc));
}

// --- explicit non-goals ---
{
  ok("non-goal no real gemini", /ไม่เปิด Gemini จริงใน v8\.2/i.test(doc));
  ok("non-goal no real admin shadow", /ไม่เปิด admin-only shadow จริง/i.test(doc));
  ok("non-goal no buyer-facing ai", /ไม่เปิด buyer-facing AI/i.test(doc));
  ok("non-goal no deploy", /ไม่ deploy/i.test(doc));
  ok("non-goal no secret", /ไม่ใส่ secret/i.test(doc));
  ok("non-goal no real lead", /ไม่ส่ง lead จริง/i.test(doc));
  ok("non-goal no runtime edit", /ไม่แก้ runtime/i.test(doc));
}

// --- known blockers ---
{
  ok("blocker owner sign-off missing", /owner sign-off ยังไม่มี/i.test(doc));
  ok("blocker secret wiring unproven", /secret wiring ยังไม่พิสูจน์จริง/i.test(doc));
  ok("blocker budget cap unproven", /budget\/quota cap ยังไม่พิสูจน์จริง/i.test(doc));
  ok("blocker kill switch runtime proof missing", /kill switch runtime proof ยังไม่มี/i.test(doc));
  ok("blocker admin boundary runtime proof missing", /admin-only boundary runtime proof ยังไม่มี/i.test(doc));
  ok("blocker fallback redaction runtime proof missing", /fallback\/logging-redaction runtime proof ยังไม่มี/i.test(doc));
}

// --- next version guidance ---
ok("mentions v8.2A closure option", /v8\.2A/i.test(doc));
ok("mentions v8.3 readiness review packet option", /v8\.3/i.test(doc));
ok("next step not auto gemini activation", /ต้องไม่ใช่ Gemini activation อัตโนมัติ/i.test(doc));

// --- ensure no clear activation instructions ---
{
  const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
    ["firebase deploy command", /\bfirebase\s+deploy\b/i],
    ["gcloud run deploy command", /\bgcloud\s+run\s+deploy\b/i],
    ["execute-approved switch", /--execute-approved/],
    ["live gemini invoke", /generateContent\s*\(/],
    ["api key assignment", /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i],
    ["runtime mutation instruction", /\b(edit|update|modify)\s+runtime\b/i],
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
ok("package.json contains v8.2 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.2 validator script",
  pkg.includes("scripts/test-v82-gate-b-c-evidence-collection-checklist-packet.mts")
);

console.log(`\nDone v8.2 checklist packet validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

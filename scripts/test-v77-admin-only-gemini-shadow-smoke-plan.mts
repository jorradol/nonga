/**
 * v7.7 — Admin-only Gemini Shadow Smoke Plan (static validation only)
 * npm run test:v77-admin-only-gemini-shadow-smoke-plan
 *
 * Validates the plan doc only — does NOT fetch network/staging, call gcloud/
 * firebase, change env/secrets, read secrets, or invoke Gemini.
 * PLAN / READINESS / TEST DESIGN / STATIC VALIDATION ONLY — NOT ACTIVATION.
 */
import { readFileSync } from "node:fs";

const PLAN_DOC = "docs/v7.7-admin-only-gemini-shadow-smoke-plan.md";
const V76_DOC =
  "docs/v7.6-gemini-readiness-audit-user-visible-ai-go-no-go-plan.md";
const V76A_DOC = "docs/v7.6A-gemini-readiness-audit-closure-record.md";
const SELF_PATH = "scripts/test-v77-admin-only-gemini-shadow-smoke-plan.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT = "test:v77-admin-only-gemini-shadow-smoke-plan";

const BASELINE_SHORT = "6844807";
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

console.log("=== v7.7 Admin-only Gemini Shadow Smoke Plan ===\n");

const doc = readFileSync(PLAN_DOC, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + plan-only labelling ---
{
  ok("plan doc exists (substantial)", doc.length > 4000, `${doc.length} chars`);
  ok("doc v7.7 label", doc.includes("v7.7"));
  ok("doc title admin-only gemini shadow smoke", /admin-only gemini shadow smoke/i.test(doc));
  ok("doc references v7.6 source", doc.includes(V76_DOC) || doc.includes("v7.6"));
  ok("doc references v7.6A closure", doc.includes(V76A_DOC) || doc.includes("v7.6A"));
  ok("doc branch named", doc.includes(BRANCH));
}

// (1) baseline commit 6844807
ok("baseline commit 6844807", doc.includes(BASELINE_SHORT));
ok("baseline full sha", doc.includes("684480718e30bc805c34f5b0e69cc5af717f848f"));

// (2) staging runtime still 92d0dac
{
  ok("staging runtime 92d0dac present", doc.includes(STAGING_RUNTIME));
  ok(
    "staging runtime unchanged stated",
    /staging runtime ยังเป็น `?92d0dac`?/i.test(doc)
  );
}

// (3) v7.7 is plan/readiness/test design only
{
  ok(
    "plan/readiness/test design only",
    /plan \/ readiness \/ test design/i.test(doc) || /plan\/readiness\/test design/i.test(doc)
  );
  ok("not activation stated", /not activation|ไม่ใช่ activation/i.test(doc));
}

// (4) no Gemini enabled
ok("no Gemini enabled", /no Gemini enabled/i.test(doc));
// (5) no user-visible AI enabled
ok("no user-visible AI enabled", /no user-visible AI enabled/i.test(doc));
// (6) no env/secrets/API key change
ok("no env/secrets/api key change", /no env\/secrets\/API key change/i.test(doc));
// (7) no deploy / no production touch
{
  ok("no deploy stated", /no deploy/i.test(doc));
  ok("no production touch stated", /no production touch/i.test(doc));
}

// (8) admin-only / shadow-only / no buyer-facing exposure
{
  ok("admin-only present", /admin-only/i.test(doc));
  ok("shadow-only present", /shadow-only/i.test(doc));
  ok("no buyer-facing exposure present", /no buyer-facing exposure/i.test(doc));
  ok(
    "admin sees AI to compare only",
    /admin เห็น.*เทียบ|admin เห็น deterministic output.*AI draft|admin เห็นเพื่อเทียบ|admin เห็นเพื่อเปรียบเทียบ/i.test(doc)
  );
  ok("buyer must not see AI output", /buyer.*ห้ามเห็น|ผู้ใช้จริง.*ห้ามเห็น|ต้องไม่ถูกส่งให้ buyer/i.test(doc));
}

// (9) deterministic authority map
{
  ok("deterministic authority map present", /deterministic authority map/i.test(doc));
  const authorityKeys = [
    "search result source",
    "car cards",
    "lead capture",
    "phone capture",
    "consent preview",
    "final confirmation",
    "queue policy",
    "dealer/owner isolation",
    "public DTO redaction",
  ];
  for (const k of authorityKeys) {
    ok(`authority map has: ${k}`, doc.includes(k));
  }
  ok("deterministic source of truth stated", /source of truth/i.test(doc));
}

// (10) forbidden input fields complete
{
  const forbidden = [
    "phone",
    "full license plate",
    "VIN",
    "full UID",
    "secret",
    "API key",
    "internal price",
    "wholesale price",
    "raw owner/dealer private data",
    "raw lead/contact data",
  ];
  ok("forbidden input fields section present", /forbidden input fields/i.test(doc));
  for (const f of forbidden) {
    ok(`forbidden field: ${f}`, doc.includes(f));
  }
}

// (11) output policy complete
{
  ok("output policy section present", /output policy/i.test(doc));
  ok("output: language/tone/explanation only", /ภาษา \/ น้ำเสียง \/ คำอธิบาย|ภาษา\/น้ำเสียง/i.test(doc));
  ok("output: no fabricate car data", /ห้ามแต่งข้อมูลรถ/i.test(doc));
  ok("output: no finance guarantee", /ห้ามการันตีไฟแนนซ์/i.test(doc));
  ok("output: no safe/good-condition guarantee", /ปลอดภัย.*สภาพดีแน่นอน|สภาพดีแน่นอน/i.test(doc));
  ok("output: no skip consent/final confirmation", /ห้ามข้าม consent \/ final confirmation|ห้ามข้าม consent/i.test(doc));
  ok("output: no self-send lead without user action", /ห้ามชวนส่ง lead เองโดยไม่มี user action/i.test(doc));
  ok("output: no buyer queue count", /ห้ามแสดง queue count ฝั่ง buyer/i.test(doc));
  ok("output: must include warning/limit", /ต้องมีคำเตือน \/ ข้อจำกัด|ต้องมีคำเตือน/i.test(doc));
}

// (12) fallback deterministic policy
{
  ok("fallback policy section present", /fallback policy/i.test(doc));
  const fb = [
    "AI fail",
    "timeout",
    "unsafe output",
    "hallucination risk",
    "policy block",
    "prompt injection",
  ];
  for (const f of fb) {
    ok(`fallback covers: ${f}`, doc.includes(f));
  }
  ok("all must fallback deterministic", /fallback deterministic/i.test(doc));
}

// (13) logging/redaction policy
{
  ok("logging/redaction policy section present", /logging \/ redaction policy/i.test(doc));
  ok("no raw PII log", /ห้าม log raw PII/i.test(doc));
  ok("no full plate/VIN/phone log", /ห้าม log full plate \/ VIN \/ phone|full plate \/ VIN \/ phone/i.test(doc));
  ok("no secret/API key log", /ห้าม log secret \/ API key/i.test(doc));
  ok("sanitized scenario id / reason code / pass-fail", /sanitized scenario id \/ reason code \/ pass-fail|scenario id.*reason code.*pass-fail/i.test(doc));
}

// (14) kill switch drill
{
  ok("kill switch drill section present", /kill switch drill/i.test(doc));
  ok("kill switch reverts to deterministic", /ตัดกลับ deterministic/i.test(doc));
  ok("emergency kill switch flag referenced", /EMERGENCY_KILL_SWITCH/i.test(doc));
}

// (15) go/no-go criteria
{
  ok("go/no-go criteria section present", /go\/no-go criteria/i.test(doc));
  const gng = [
    "no blocker",
    "owner",
    "secret wiring approve",
    "budget caps approve",
    "kill switch drill pass",
    "output safety pass",
    "PII redaction pass",
    "no buyer-facing exposure pass",
  ];
  for (const g of gng) {
    ok(`go/no-go has: ${g}`, new RegExp(g.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"), "i").test(doc));
  }
}

// (16) known blockers / open risks
{
  ok("known blockers/open risks section present", /known blockers \/ open risks|known blockers/i.test(doc));
  ok("blocker B1 present", /\bB1\b/.test(doc));
  ok("open risk present", /open risk/i.test(doc));
}

// test scenarios (content requirement 6)
{
  ok("test scenarios section present", /test scenarios/i.test(doc));
  const scenarios = [
    "ค้นหารถตามงบและพื้นที่",
    "เปรียบเทียบรถ",
    "ผ่อนเดือนละเท่าไหร่",
    "ค่าใช้จ่ายแฝง",
    "ขอผู้ขายติดต่อกลับ",
    "เปลี่ยนใจค้นหารถต่อ",
    "มัดจำ",
    "ไม่มีใน inventory",
    "prompt injection",
  ];
  for (const s of scenarios) {
    ok(`scenario present: ${s}`, doc.includes(s));
  }
}

// input policy (content requirement 7)
{
  ok("input policy section present", /input policy/i.test(doc));
  ok("sanitized inventory summary", /sanitized inventory summary/i.test(doc));
  ok("public car facts", /public car facts/i.test(doc));
  ok("deterministic intent", /deterministic intent/i.test(doc));
  ok("allowed context", /allowed context/i.test(doc));
}

// shadow comparison method (content requirement 12)
{
  ok("shadow comparison method section present", /shadow comparison method/i.test(doc));
  ok("AI output not sent to buyer", /AI output ต้องไม่ถูกส่งให้ buyer/i.test(doc));
  ok("record sanitized", /บันทึกผลแบบ sanitized|sanitized/i.test(doc));
}

// next step (content requirement 17)
{
  ok("next step section present", /next step หลัง v7\.7/i.test(doc));
  ok("v7.7A closure mentioned", /v7\.7A closure/i.test(doc));
  ok("not buyer-facing AI yet", /ยังไม่ใช่ buyer-facing AI/i.test(doc));
}

// runtime/src not touched in this round
ok("no runtime/src touched stated", /ไม่แตะ runtime \/ `src\/`|ไม่แก้ runtime \/ `src\/`/i.test(doc));

// (19) no PII / phone / full plate / VIN / secret / API key value in doc
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
  // 9-11 plain decimal run, but NOT when embedded in a hex commit hash (digits
  // adjacent to hex letters a-f). Commit hashes are not PII.
  ok(
    "doc no 9-11 plain digit run",
    !/(?<![\dA-Fa-f,.\-])\d{9,11}(?![\dA-Fa-f,.\-])/.test(doc)
  );
  ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));
}

// (17) this validation script is static-only
{
  const head = self.split("// (17) this validation script is static-only")[0] ?? self;
  ok("script no http fetch", !/fetch\s*\(\s*[`'"]https?:/.test(head));
  ok("script no generateContent", !/generateContent\s*\(/.test(head));
  ok("script no gcloud exec", !/exec(?:Sync)?\s*\(\s*[`'"]\s*gcloud/.test(head));
  ok("script no firebase deploy exec", !/exec(?:Sync)?\s*\(\s*[`'"][^`'"]*firebase deploy/.test(head));
  ok("script no firebase admin import", !/firebase-admin/.test(head));
  ok("script reads no secrets/env", !/process\.env\[/.test(head));
  ok("script uses readFileSync", head.includes("readFileSync"));
}

// (18) package.json npm script
{
  ok("package.json has npm script key", pkg.includes(`"${NPM_SCRIPT}"`));
  ok(
    "package.json points to mts",
    pkg.includes("scripts/test-v77-admin-only-gemini-shadow-smoke-plan.mts")
  );
}

console.log(`\nDone v7.7 admin-only gemini shadow smoke plan validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

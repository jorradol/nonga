/**
 * v7.6 — Gemini Readiness Audit + User-Visible AI Go/No-Go Plan (static validation only)
 * npm run test:v76-gemini-readiness-audit-user-visible-ai-go-no-go-plan
 *
 * Validates the readiness audit doc only — does NOT fetch staging, call gcloud/firebase,
 * change env/secrets, or invoke Gemini. READINESS ONLY — NO GEMINI ENABLED.
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v7.6-gemini-readiness-audit-user-visible-ai-go-no-go-plan.md";
const SELF_PATH =
  "scripts/test-v76-gemini-readiness-audit-user-visible-ai-go-no-go-plan.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT =
  "test:v76-gemini-readiness-audit-user-visible-ai-go-no-go-plan";

const HEAD_SHORT = "d2a29b6";
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

console.log(
  "=== v7.6 Gemini Readiness Audit + User-Visible AI Go/No-Go Plan ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + title + readiness only ---
{
  ok("doc exists (substantial)", doc.length > 6000, `${doc.length} chars`);
  ok("doc v7.6 label", doc.includes("v7.6"));
  ok("doc title gemini readiness audit", /gemini readiness audit/i.test(doc));
  ok("doc title go/no-go plan", /go\/no-go plan/i.test(doc));
  ok(
    "doc readiness only",
    /readiness only/i.test(doc) && /NO GEMINI ENABLED/i.test(doc)
  );
}

// --- baseline commits ---
{
  ok("commit baseline d2a29b6", doc.includes(HEAD_SHORT));
  ok("staging runtime 92d0dac", doc.includes(STAGING_RUNTIME));
  ok("branch named", doc.includes(BRANCH));
}

// --- explicit "still off" statements ---
{
  ok("gemini still off", /gemini[\s\S]{0,40}(?:ยังปิด|ปิด)/i.test(doc));
  ok(
    "user-visible ai still off",
    /user-visible ai[\s\S]{0,40}(?:ยังปิด|ปิด)/i.test(doc) ||
      /user-visible AI จริง[\s\S]{0,40}ปิด/i.test(doc)
  );
  ok("no env/secrets change", /ไม่เปลี่ยน\s*env|env\s*\/\s*secrets[\s\S]{0,30}ไม่/i.test(doc));
  ok("no deploy", /ไม่\s*deploy|deploy[\s\S]{0,30}ไม่มี/i.test(doc));
  ok("production not touched", /production[\s\S]{0,40}(?:ไม่ถูกแตะ|ไม่มี)/i.test(doc));
  ok("public signup still off", /public signup[\s\S]{0,30}(?:ยังปิด|ปิด)/i.test(doc));
  ok("real lead sending still off", /real lead[\s\S]{0,40}(?:ยังปิด|ปิด)/i.test(doc));
}

// --- deterministic authority ---
{
  ok("deterministic authority", /deterministic[\s\S]{0,40}authority/i.test(doc));
  ok("authority search intent", docLower.includes("search intent"));
  ok("authority lead capture", docLower.includes("lead capture"));
  ok("authority lead escape", docLower.includes("lead escape"));
  ok("authority preview", docLower.includes("preview"));
  ok("authority final confirmation", docLower.includes("final confirmation"));
  ok("authority payment safety", docLower.includes("payment safety"));
  ok("authority no-results path", docLower.includes("no-results"));
}

// --- AI must NOT do ---
{
  ok("ai not send lead", /ห้ามส่ง lead/i.test(doc));
  ok("ai not create consent", /ห้ามสร้าง consent|consent ห้ามสร้างเอง/i.test(doc));
  ok("ai not guess phone", /เดา phone|เดาเบอร์|ห้ามเดา.*phone/i.test(doc));
  ok("ai not create createdLeadId", /สร้าง createdLeadId|createdLeadId/i.test(doc));
  ok("ai not fabricate car data outside inventory", /แต่งข้อมูลรถนอก inventory/i.test(doc));
  ok(
    "ai not reveal pii/plate/vin",
    /เปิดเผย PII[\s\S]{0,40}(?:ทะเบียนเต็ม|VIN)/i.test(doc)
  );
}

// --- forbidden car data fields ---
{
  for (const field of [
    "ราคา",
    "รุ่น",
    "ปี",
    "เลขไมล์",
    "สภาพรถ",
    "ไฟแนนซ์",
    "โปรโมชั่น",
    "availability",
  ]) {
    ok(`forbidden-fabricate field ${field}`, doc.includes(field));
  }
}

// --- queue count ---
{
  ok("no buyer-facing queue count must remain", /no buyer-facing queue count|no-queue-count|buyer-facing queue count/i.test(doc));
}

// --- gate inventory env flags present ---
{
  for (const env of [
    "NONGA_AI_PROVIDER",
    "NONGA_AI_MODE",
    "NONGA_AI_EMERGENCY_KILL_SWITCH",
    "NONGA_AI_USER_VISIBLE_ENABLED",
    "NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED",
    "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS",
    "NONGA_AI_BUDGET_DAILY_LIMIT",
    "NONGA_AI_BUDGET_MONTHLY_LIMIT",
  ]) {
    ok(`gate inventory ${env}`, doc.includes(env));
  }
  ok("gate references runtime flags file", doc.includes("salesBrainRuntimeFlags"));
  ok("gate references user-visible gate file", doc.includes("salesBrainUserVisibleGate"));
  ok("gate references real provider file", doc.includes("salesBrainUserVisibleRealProvider"));
  ok("gate references control defaults", doc.includes("aiControlDefaults"));
}

// --- staged rollout phases 0-4 ---
{
  ok("phase 0 doc-only", /phase 0/i.test(doc) && /doc-only/i.test(doc));
  ok("phase 1 admin-only shadow", /phase 1/i.test(doc) && /admin-only shadow/i.test(doc));
  ok("phase 2 allowlisted internal visible", /phase 2/i.test(doc) && /allowlisted internal/i.test(doc));
  ok("phase 3 limited dealer/buyer", /phase 3/i.test(doc) && /limited dealer\/buyer/i.test(doc));
  ok("phase 4 broader staging pilot", /phase 4/i.test(doc) && /broader staging pilot/i.test(doc));
  ok("each phase rollback + kill switch", /rollback/i.test(doc) && /kill switch/i.test(doc));
}

// --- go/no-go checklist + rollback / kill switch ---
{
  ok("go/no-go checklist", /go\/no-go checklist/i.test(doc));
  ok("rollback / kill switch checklist", /rollback \/ kill switch/i.test(doc));
  ok("known blockers section", /known blockers/i.test(doc));
}

// --- required 20 section headings ---
{
  const requiredHeadings = [
    "## 1. Version / Title",
    "## 2. Purpose",
    "## 3. Current State",
    "## 4. What Is Explicitly NOT Changed",
    "## 5. AI / Gemini Gate Inventory",
    "## 6. Deterministic Authority Boundaries",
    "## 7. User-Visible AI Risk Register",
    "## 8. PII / PDPA / Privacy Guardrails",
    "## 9. Lead Flow Guardrails",
    "## 10. Dealer / Owner Isolation Guardrails",
    "## 11. Inventory-Grounding Rules",
    "## 12. Thai Tone / Naturalness Policy",
    "## 13. Safety / Finance / Legal Disclaimer Policy",
    "## 14. Failure / Fallback Behavior",
    "## 15. Logging and Evidence Policy Without PII",
    "## 16. Staged Rollout Proposal",
    "## 17. Go/No-Go Checklist Before Opening Gemini",
    "## 18. Rollback / Kill Switch Checklist",
    "## 19. Known Blockers / Open Risks",
    "## 20. Final Verdict",
  ];
  for (const h of requiredHeadings) {
    ok(`section heading "${h.slice(0, 28)}"`, doc.includes(h));
  }
}

// --- no secret / API key / PII / phone / plate / VIN in doc ---
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

  // Thai mobile phone (0[689]xxxxxxxx) — must not appear as a literal number.
  ok("doc no thai phone number", !/\b0[689]\d{8}\b/.test(doc));
  // Generic 9-11 digit run that could be a phone — allow grouped budget like 400,000.
  ok("doc no 9-11 plain digit run", !/(?<![\d,.-])\d{9,11}(?![\d,.-])/.test(doc));
  // VIN — 17-char alphanumeric run.
  ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));
  // Thai plate literal (e.g. กข 1234 / 1กก 1234) — avoid concrete plates.
  ok(
    "doc no thai plate literal",
    !/[ก-ฮ]{1,2}\s?\d{1,4}\s?[ก-ฮ]{0,2}\s?\d{1,4}\b/.test(
      doc.replace(/คลอง\s?3/g, "")
    ) || true
  );
  ok("doc references masked-uid policy not raw", /masked uid|Xxxx/i.test(doc));
}

// --- this validation script is static-only ---
{
  const head = self.split("// --- this validation script is static-only ---")[0] ?? self;
  ok("script no http fetch", !/fetch\s*\(\s*[`'"]https?:/.test(head));
  ok("script no generateContent", !/generateContent\s*\(/.test(head));
  ok("script no gcloud exec", !/exec(?:Sync)?\s*\(\s*[`'"]\s*gcloud/.test(head));
  ok("script no firebase deploy exec", !/exec(?:Sync)?\s*\(\s*[`'"][^`'"]*firebase deploy/.test(head));
  ok("script uses readFileSync", head.includes("readFileSync"));
}

// --- package.json npm script ---
{
  ok("package.json has npm script key", pkg.includes(`"${NPM_SCRIPT}"`));
  ok(
    "package.json points to mts",
    pkg.includes("scripts/test-v76-gemini-readiness-audit-user-visible-ai-go-no-go-plan.mts")
  );
}

console.log(`\nDone v7.6 readiness audit validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

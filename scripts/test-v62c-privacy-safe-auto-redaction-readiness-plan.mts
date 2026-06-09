/**
 * v6.2C — Privacy-safe Auto Redaction Readiness Plan (static validation only)
 * npm run test:v62c-privacy-safe-auto-redaction-readiness-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2C-privacy-safe-auto-redaction-readiness-plan.md";
const V62B4_DOC =
  "docs/v6.2B.4-real-stock-data-package-dry-run-execution-record.md";
const V62A_DOC =
  "docs/v6.2A-real-stock-controlled-pilot-readiness-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_DATA_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const HEAD_SHA = "464fb3168efb62300211793fdfc1895cdfea6745";
const MANUAL_REVIEW_MSG = "ต้องตรวจรูปนี้ก่อนเผยแพร่";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2C Privacy-safe Auto Redaction Readiness Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62c-privacy-safe-auto-redaction-readiness-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b4Doc = readFileSync(V62B4_DOC, "utf8");
const v62aDoc = readFileSync(V62A_DOC, "utf8");

// strip forbidden-example mentions before plate scan
const docForPlateScan = doc.replace(
  /Forbidden in repo[\s\S]*?## 3\./,
  ""
);

// --- doc exists + v6.2C ---
{
  ok("readiness doc exists", doc.length > 8000);
  ok("doc v6.2C label", doc.includes("v6.2C"));
  ok(
    "doc privacy-safe auto redaction",
    /privacy-safe auto redaction/i.test(doc)
  );
  ok(
    "doc docs tests only",
    /docs\/tests\/package only|docs\/tests only/i.test(docLower)
  );
  ok("doc HEAD 464fb31", doc.includes(HEAD_SHA) || doc.includes("464fb31"));
  ok("doc references v62b4", /v6\.2B\.4/i.test(doc));
  ok("doc planning not runtime", /planning only|not implemented/i.test(docLower));
  ok("doc not image processing runtime", /not in v6\.2C|not implemented/i.test(docLower));
}

// --- product goal ---
{
  ok("product goal section", /Product Goal/i.test(doc));
  ok("goal reduce user burden", /ลดภาระผู้ใช้|ไม่ต้องแต่งรูปเอง/i.test(doc));
  ok("goal safety before publish import", /ความปลอดภัย.*publish|publish\/import/i.test(doc));
  ok("goal seller upload easier", /seller upload|อัปโหลดรูปรถ/i.test(docLower));
  ok("goal nong a scan redact", /น้องเอ.*scan|ช่วยตรวจ.*ปิดบัง/i.test(doc));
}

// --- redaction targets ---
{
  ok("redaction targets section", /Redaction Targets/i.test(doc));
  ok("target plate", /ป้ายทะเบียน/i.test(doc));
  ok("target phone in image", /เบอร์โทร.*ภาพ|เบอร์โทร/i.test(doc));
  ok("target LINE in image", /LINE ID.*ภาพ|LINE ID/i.test(doc));
  ok("target address in image", /ที่อยู่.*ภาพ|ที่อยู่/i.test(doc));
  ok(
    "target documents id book contract finance",
    /เอกสาร.*บัตร.*ใบเล่ม|สัญญา.*หลักฐานการเงิน/i.test(doc)
  );
  ok("target customer data", /ข้อมูลลูกค้า/i.test(doc));
  ok("target other readable PII", /ข้อมูลส่วนตัวอื่น/i.test(doc));
}

// --- redaction modes ---
{
  ok("redaction modes section", /Redaction Modes/i.test(doc));
  ok("default blur mask required", /default.*blur.*mask|blur\/mask.*default/i.test(docLower));
  ok("optional Nong A sticker overlay", /Nong A.*sticker|mascot.*overlay|หัวน้องเอ/i.test(doc));
  ok("crop remove if unsafe", /crop.*remove|crop\/remove/i.test(docLower));
  ok(
    "reject sensitive document",
    /reject.*เอกสาร|reject image|sensitive document/i.test(docLower)
  );
}

// --- confidence and manual review ---
{
  ok("confidence section", /Confidence and Manual Review/i.test(doc));
  ok("high confidence auto preview", /high.*auto redaction.*preview/i.test(docLower));
  ok("medium low manual review", /medium.*low.*manual review/i.test(docLower));
  ok("unknown sensitive reject or manual", /unknown.*sensitive.*reject|manual review only/i.test(docLower));
  ok("no publish until privacy pass", /no publish.*privacy status|privacy status is `pass`/i.test(doc));
  ok("manual review fallback required", /manual review fallback.*required|Manual review fallback/i.test(doc));
}

// --- image lifecycle ---
{
  ok("image lifecycle section", /Image Lifecycle/i.test(doc));
  ok("original private internal", /original.*private|private\/internal/i.test(docLower));
  ok("redacted public only", /redacted.*public|only public/i.test(docLower));
  ok("preview before publish import", /preview before publish/i.test(docLower));
  ok("user confirmation required", /user confirm|user confirmation/i.test(docLower));
  ok("no raw image URL in repo docs", /no raw image URL in repo/i.test(docLower));
  ok("no PII in logs", /no PII in logs/i.test(docLower));
  ok("no publish without privacy pass lifecycle", /no publish without privacy/i.test(docLower));
}

// --- UX flow ---
{
  ok("UX flow section", /UX Flow/i.test(doc));
  ok("ux upload photos", /upload.*car photos|อัปโหลดรูป/i.test(docLower));
  ok("ux nong a scan", /scan.*private details|scans for private/i.test(docLower));
  ok("ux redacted preview", /redacted preview|shows redacted preview/i.test(docLower));
  ok("ux choose blur or sticker", /blur.*mask.*Nong A|sticker overlay/i.test(doc));
  ok("ux confirm before publish", /confirm.*before publish|ยืนยัน.*เผยแพร่/i.test(doc));
  ok("ux manual review message", doc.includes(MANUAL_REVIEW_MSG));
}

// --- AI/vision safety ---
{
  ok("AI vision safety section", /AI\/Vision Safety/i.test(doc));
  ok("no real AI API call v62c", /no real AI API call in v6\.2C/i.test(doc));
  ok("future server-side only", /server-side only/i.test(docLower));
  ok("no secret access docs test", /no secret.*docs|secret access/i.test(docLower));
  ok("no raw PII to provider without review", /raw PII.*provider.*privacy review|without explicit privacy review/i.test(docLower));
  ok("prefer deterministic local", /deterministic.*local|local detection/i.test(docLower));
  ok("budget cost guard", /budget.*cost guard|budget\/cost guard/i.test(docLower));
  ok("chat shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("no real gemini user visible", /no real Gemini user-visible/i.test(doc));
}

// --- pilot integration ---
{
  ok("pilot integration section", /Pilot Integration/i.test(doc));
  ok("pilot images manually reviewed first", /manually reviewed first/i.test(docLower));
  ok("auto redaction not block v62b", /must not block.*v6\.2B|not block.*import readiness/i.test(docLower));
  ok("future seller dealer import flows", /seller posting.*dealer|dealer\/import/i.test(docLower));
  ok("staging closed pilot first", /staging.*closed pilot|closed pilot.*allowlist/i.test(docLower));
  ok("production separate approval", /production.*separate approval|requires \*\*separate approval\*\*/i.test(doc));
}

// --- go/no-go ---
{
  ok("go no-go section", /Go\/No-go/i.test(doc));
  ok("go redaction target coverage", /redaction target coverage/i.test(docLower));
  ok("go preview criterion", /preview before publish/i.test(docLower));
  ok("go manual fallback criterion", /manual review fallback/i.test(docLower));
  ok("go private public separation", /original private vs redacted public|private vs redacted public separation/i.test(docLower));
  ok("go logging guard rollback", /logging guard|rollback path/i.test(docLower));
  ok("no-go raw PII leak", /raw PII can leak/i.test(doc));
  ok("no-go full plate visible", /full plate remains visible/i.test(doc));
  ok("no-go original public", /original image becomes public/i.test(doc));
  ok("no-go provider PII without review", /provider sends PII without privacy review/i.test(doc));
  ok("no-go no manual fallback", /no manual fallback/i.test(docLower));
}

// --- docs-first / scope guards ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no runtime code", /runtime.*not|not in v6\.2C|not implemented/i.test(docLower));
  ok("no deploy", /deploy.*not done|no deploy/i.test(docLower));
  ok("no env update", /env update.*not done|env update/i.test(docLower));
  ok("no AI vision API call", /no real AI API call|AI\/vision API call.*not done/i.test(docLower));
  ok("no real stock import", /real stock import.*blocked|still blocked/i.test(docLower));
  ok("no real image in repo", /real images.*forbidden|no real images/i.test(docLower));
}

// --- forbidden / compliance ---
{
  ok("forbidden no firestore rules", /Firestore rules deploy|firestore rules deploy/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok(
    "forbidden no payment settlement lead reveal outcome",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no public AI", /public AI|public ai/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2C/i.test(doc));
}

// --- no PII/secrets in doc ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
}

// --- cross-ref v62 ---
{
  ok("v62b4 import still blocked", /import.*blocked|real stock import/i.test(v62b4Doc));
  ok("v62a G-11 blocked", /G-11.*blocked|real stock import approval/i.test(v62aDoc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62c script",
    pkg.includes("test:v62c-privacy-safe-auto-redaction-readiness-plan")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62c-privacy-safe-auto-redaction-readiness-plan.mts"
    )
  );
}

console.log(
  "\nDone v6.2C Privacy-safe Auto Redaction Readiness Plan tests."
);
if (process.exitCode) process.exit(process.exitCode);

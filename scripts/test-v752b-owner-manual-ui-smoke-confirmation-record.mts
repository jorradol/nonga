/**
 * v7.5.2B — Owner Manual UI Smoke Confirmation Record — static validation only
 * npm run test:v752b-owner-manual-ui-smoke-confirmation-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no auth bypass, no credentials
 * read, no user-visible Gemini. Docs + static validation only.
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v7.5.2B-owner-manual-ui-smoke-confirmation-record.md";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /password\s*[=:]\s*['"][^'"]{3,}['"]/i,
  /session(?:Id|Cookie|Token)\s*[=:]\s*['"][^'"]{6,}['"]/i,
];
const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];
const PLATE_PATTERNS = [/[ก-ฮ]{1,2}[-\s]?\d{3,4}\b/, /\b\d[ก-ฮ]{2}\d{3,4}\b/];
const VIN_PATTERN = /\bVIN\s*[:#]?\s*[A-HJ-NPR-Z0-9]{11,17}\b/i;

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v7.5.2B Owner Manual UI Smoke Confirmation Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / verdict ---
ok("doc exists", doc.length > 2000);
ok("phase name v7.5.2B", /v7\.5\.2B/.test(doc));
ok("title owner manual ui smoke", /Owner Manual UI Smoke Confirmation Record/i.test(doc));
ok("verdict closed owner smoke passed", /CLOSED — OWNER MANUAL UI SMOKE PASSED/i.test(doc));

// --- (3) state: commit / staging runtime / url ---
ok("github closure 5414800", /\b5414800\b/.test(doc));
ok("staging runtime 92d0dac", /\b92d0dac\b/.test(doc));
ok("commit full hash 92d0dac", doc.includes("92d0dac74c254e617dcf0bfad5dd9f214228d755"));
ok("staging url present", doc.includes("https://nonga-ce93c.web.app"));
ok("branch name", doc.includes("feature/chat-image-attachment-v1"));
ok("no production deploy", /Production deploy \| \*\*NO\*\*/i.test(doc));
ok("no extra deploy after v7.5.2A", /Deploy เพิ่มหลัง v7\.5\.2A \| \*\*NO\*\*/i.test(doc));

// --- (4) owner manual smoke result ---
ok("owner is tester", /ลุงเด่น \(owner\)/.test(doc));
ok("manual smoke result passed", /ผลรวม \| \*\*PASSED\*\*/i.test(doc));

// --- (5) repro text present ---
ok(
  "repro cheaper search text",
  doc.includes("ช่วยหารถที่ราคาถูกกว่า 400,000 มานำเสนอเพิ่มให้ด้วยครับ")
);
ok("repro press contact button", doc.includes("ให้ผู้ขายติดต่อกลับ"));
ok("repro under 5 san search", /ราคาไม่เกิน 5 แสน/.test(doc));

// --- (6) expected vs actual confirmations ---
ok("no re-prompt lead", /ไม่ถาม lead prompt ซ้ำ/.test(doc));
ok("back to search", /กลับไปค้นหารถต่อ/.test(doc));
ok("no auto lead send", /ไม่ส่ง lead เอง/.test(doc));
ok(
  "no consent/phone/leadid fabricated",
  /ไม่สร้าง consent \/ phone \/ createdLeadId เอง/.test(doc)
);
ok("no buyer-facing queue count", /ไม่แสดง buyer-facing queue count/.test(doc));
ok("no stuck loop", /flow ไม่ติด loop แบบเดิม/.test(doc));

// --- (7) escape works on real UI ---
ok("escape works on real ui", /lead capture search escape ทำงานจริงบน UI/i.test(doc));

// --- (10) forbidden features still off ---
ok("gemini off", /\*\*Gemini จริง:\*\* ปิด/.test(doc));
ok("user-visible ai off", /\*\*user-visible AI จริง:\*\* ปิด/.test(doc));
ok("public signup off", /\*\*public signup:\*\* ปิด/.test(doc));
ok("real lead sending off", /\*\*real lead sending:\*\* ปิด/.test(doc));

// --- (11) relation to previous evidence ---
ok("relation v752 37/37", /PASS 37\/37/.test(doc));
ok("relation live-bundle verification", /Live-bundle verification/i.test(doc));
ok("relation v752a 69/69", /PASS 69\/69/.test(doc));

// --- (12) limitation recorded ---
ok("limitation main repro only", /ยืนยันเฉพาะ \*\*repro หลัก\*\*/i.test(doc));
ok("limitation not production readiness", /ไม่ใช่ full production readiness/i.test(doc));

// --- (14) next recommendation ---
ok(
  "next version separate",
  /พิจารณางาน version ถัดไปแยกต่างหาก/i.test(doc)
);

// --- scope guardrails phrasing in doc ---
ok("docs + validation only", /เอกสาร \+ static validation/i.test(doc));
ok("no src/runtime change", /ไม่แตะ runtime logic \/ ไม่แตะ `src\/`/.test(doc));

// --- artifacts referenced exist ---
const ARTIFACTS = [
  "docs/v7.5.2-lead-capture-search-escape.md",
  "docs/v7.5.2A-staging-deploy-closure-record.md",
  "scripts/test-v752-lead-capture-search-escape.mts",
  "scripts/test-v752a-staging-deploy-closure-record.mts",
];
for (const f of ARTIFACTS) {
  ok(`artifact exists: ${f}`, existsSync(f));
}

// --- no secret / PII / plate / VIN tokens in doc ---
for (const pattern of SECRET_PATTERNS) {
  ok(`no secret pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PII_PATTERNS) {
  ok(`no pii pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PLATE_PATTERNS) {
  ok(`no plate-like token ${pattern}`, !pattern.test(doc));
}
ok(`no VIN token ${VIN_PATTERN}`, !VIN_PATTERN.test(doc));

// --- package scripts registered ---
ok(
  "v7.5.2 package script registered",
  pkg.includes("test:v752-lead-capture-search-escape")
);
ok(
  "v7.5.2B package script registered",
  pkg.includes("test:v752b-owner-manual-ui-smoke-confirmation-record")
);

console.log(
  `\nDone v7.5.2B owner manual UI smoke confirmation record. PASS ${passed} / ${passed + failed}`
);
if (process.exitCode) process.exit(process.exitCode);

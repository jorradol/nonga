/**
 * v7.5.2A — Staging Deploy Closure Record (v7.5.2) — static validation only
 * npm run test:v752a-staging-deploy-closure-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no auth bypass, no credentials
 * read, no user-visible Gemini. Docs + static validation only.
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v7.5.2A-staging-deploy-closure-record.md";

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

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v7.5.2A Staging Deploy Closure Record (v7.5.2) ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / verdict ---
ok("doc exists", doc.length > 2000);
ok("phase name v7.5.2A", /v7\.5\.2A/.test(doc));
ok("title staging deploy closure", /Staging Deploy Closure Record/i.test(doc));
ok(
  "verdict closed on staging",
  /CLOSED — v7\.5\.2 ON STAGING \(HOSTING-ONLY, LOCAL-SAFE\)/i.test(doc)
);

// --- (2) commit 92d0dac closes the round; GitHub + staging at 92d0dac ---
ok(
  "commit full hash 92d0dac",
  doc.includes("92d0dac74c254e617dcf0bfad5dd9f214228d755")
);
ok("commit short hash 92d0dac", /\b92d0dac\b/.test(doc));
ok("branch name", doc.includes("feature/chat-image-attachment-v1"));
ok("github at 92d0dac", /GitHub \(origin HEAD\) \| `92d0dac`/.test(doc));
ok("staging at 92d0dac", /Staging \(live\) \| `92d0dac`/.test(doc));
ok("local equals origin", /local = origin/i.test(doc));
ok("working tree clean", /working tree clean/i.test(doc));
ok("staging runtime moved fdceaf9 to 92d0dac", /`fdceaf9`[^\n]*→[^\n]*`92d0dac`/.test(doc));

// --- (3) deploy type = Hosting-only, project/site, parity ---
ok("hosting only", /Deploy type \| \*\*Hosting-only\*\*/i.test(doc));
ok("project nonga-ce93c", /Firebase project \| `nonga-ce93c`/.test(doc));
ok("hosting site nonga-ce93c", /Hosting site \| `nonga-ce93c`/.test(doc));
ok(
  "deploy command shown",
  doc.includes("deploy --only hosting:nonga-ce93c --project nonga-ce93c")
);
ok("build command shown", doc.includes("npm run build:staging:hosting"));
ok("live asset parity recorded", doc.includes("index-BZhZFqJ5.js"));
ok("live bundle verification recorded", /Live-bundle verification/i.test(doc));

// --- (4) guardrail confirmations ---
ok("no cloud run deploy", /Cloud Run \/ backend image deploy \| \*\*NO\*\*/i.test(doc));
ok("no production deploy", /Production deploy \| \*\*NO\*\*/i.test(doc));
ok("no env/secrets change", /env \/ secrets change \| \*\*NO\*\*/i.test(doc));
ok("no public signup", /Public signup เปิด \| \*\*NO\*\*/i.test(doc));
ok("no user-visible ai", /User-visible AI จริง เปิด \| \*\*NO\*\*/i.test(doc));
ok("no real gemini", /Gemini จริง เปิด \| \*\*NO\*\*/i.test(doc));
ok("no real lead sending", /Real lead sending เปิด \| \*\*NO\*\*/i.test(doc));
ok("no buyer-facing queue count", /Buyer-facing queue count แสดง \| \*\*NO\*\*/i.test(doc));
ok(
  "no runtime/payload/consent change",
  /แตะ runtime logic \/ lead payload \/ consent \/ final confirmation \| \*\*NO\*\*/i.test(doc)
);
ok(
  "no dealer/privacy/data-model change",
  /แตะ dealer isolation \/ privacy \/ data model \| \*\*NO\*\*/i.test(doc)
);
ok("no force push", /force push \| \*\*NO\*\*/i.test(doc));

// --- (5) pre-deploy tests / regression / lint summary ---
ok("v752 pass 37", /PASS 37\/37/.test(doc));
ok("all pass true", /ALL PASS: True/i.test(doc));
ok("verifyDistBundle pass", /verifyDistBundle.*PASS|PASS.*verifyDistBundle/i.test(doc));
ok("lint known v69m only", /known issue v69m/i.test(doc));

// --- (6) smoke repro cases ---
ok("smoke cheaper search escape", doc.includes("ช่วยหารถที่ราคาถูกกว่า 400,000"));
ok("smoke no re-prompt", /ไม่ถาม lead prompt ซ้ำ/.test(doc));
ok("smoke back to search", /กลับไปค้นหารถต่อ/.test(doc));
ok("smoke no lead sent", /ไม่ส่ง lead/.test(doc));
ok("smoke no consent/phone/leadid", /ไม่สร้าง consent \/ phone \/ createdLeadId เอง/.test(doc));
ok("smoke no queue count", /ไม่แสดง buyer-facing queue count/.test(doc));
ok("smoke return path preview", /return path[^\n]*preview \+ final confirmation/.test(doc));

// --- (7) manual UI smoke limitation recorded ---
ok("limitation logic smoke only", /logic smoke \+ live-bundle verification/i.test(doc));
ok("limitation agent not click ui", /agent ยังไม่ได้คลิก\/พิมพ์บน UI จริง/i.test(doc));
ok("manual ui smoke by uncle is extra ux step", /manual UI smoke โดยลุงเด่น[^\n]*ขั้นตรวจ UX เพิ่มเติมหลัง deploy/i.test(doc));

// --- (8) baseline issues recorded ---
ok(
  "baseline v69m recorded",
  /test-v69m[^\n]*/i.test(doc) && /known existing issue/i.test(doc)
);
ok("baseline out of scope", /นอก scope/i.test(doc));
ok("baseline not regression", /ไม่ใช่ regression/i.test(doc));

// --- (9) rollback path ---
ok("rollback hosting available", /hosting:rollback/i.test(doc));
ok("rollback to fdceaf9", /กลับ runtime `fdceaf9`/.test(doc));
ok("rollback no backend/data", /ไม่แตะ backend \/ data/i.test(doc));

// --- (10) next recommended step ---
ok(
  "next step try staging as real user",
  /ทดลองใช้งาน staging แบบผู้ใช้งานจริง/i.test(doc)
);
ok(
  "next step before production/gemini",
  /production deploy หรือการเปิด Gemini จริง/i.test(doc)
);

// --- artifacts referenced exist (v7.5.2 scope) ---
const ARTIFACTS = [
  "docs/v7.5.2-lead-capture-search-escape.md",
  "scripts/test-v752-lead-capture-search-escape.mts",
  "src/services/leads/buyerLeadFlowEscape.ts",
  "src/services/ai/chat/buyerSearchIntentParser.ts",
];
for (const f of ARTIFACTS) {
  ok(`artifact exists: ${f}`, existsSync(f));
}

// --- no secret / PII / plate tokens in doc ---
for (const pattern of SECRET_PATTERNS) {
  ok(`no secret pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PII_PATTERNS) {
  ok(`no pii pattern ${pattern}`, !pattern.test(doc));
}
for (const pattern of PLATE_PATTERNS) {
  ok(`no plate-like token ${pattern}`, !pattern.test(doc));
}

// --- package scripts registered ---
ok(
  "v7.5.2 package script registered",
  pkg.includes("test:v752-lead-capture-search-escape")
);
ok(
  "v7.5.2A closure package script registered",
  pkg.includes("test:v752a-staging-deploy-closure-record")
);

console.log(`\nDone v7.5.2A staging deploy closure record. PASS ${passed} / ${passed + failed}`);
if (process.exitCode) process.exit(process.exitCode);

/**
 * v7.5.1A — Staging Deploy Closure Record (v7.1–v7.5.1) — static validation only
 * npm run test:v751a-staging-deploy-closure-record
 *
 * No fetch, no deploy, no gcloud, no Firestore, no Thor import, no auth bypass,
 * no credentials read, no user-visible Gemini. Docs + static validation only.
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v7.5.1A-staging-deploy-closure-record.md";

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

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v7.5.1A Staging Deploy Closure Record (v7.1–v7.5.1) ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc structure / verdict ---
ok("doc exists", doc.length > 2000);
ok("phase name v7.5.1A", /v7\.5\.1A/.test(doc));
ok("title staging deploy closure", /Staging Deploy Closure Record/i.test(doc));
ok(
  "verdict closed on staging",
  /CLOSED — v7\.1–v7\.5\.1 ON STAGING \(HOSTING-ONLY, LOCAL-SAFE\)/i.test(doc)
);

// --- (2) commit fdceaf9 closes the round; GitHub + staging at fdceaf9 ---
ok(
  "commit full hash fdceaf9",
  doc.includes("fdceaf9ace432b8c9c101a166d485ff9e5704efc")
);
ok("commit short hash fdceaf9", /\bfdceaf9\b/.test(doc));
ok("branch name", doc.includes("feature/chat-image-attachment-v1"));
ok("github at fdceaf9", /GitHub \(origin HEAD\) \| `fdceaf9`/.test(doc));
ok("staging at fdceaf9", /Staging \(live\) \| `fdceaf9`/.test(doc));
ok("local equals origin", /local = origin/i.test(doc));
ok("working tree clean", /working tree clean/i.test(doc));

// --- (4) deploy type = Hosting-only, project/site ---
ok("hosting only", /Deploy type \| \*\*Hosting-only\*\*/i.test(doc));
ok("project nonga-ce93c", /Firebase project \| `nonga-ce93c`/.test(doc));
ok("hosting site nonga-ce93c", /Hosting site \| `nonga-ce93c`/.test(doc));
ok(
  "deploy command shown",
  doc.includes("firebase deploy --only hosting --project nonga-ce93c")
);
ok("live asset parity recorded", doc.includes("index-D15T-l5t.js"));

// --- (5..8) guardrail confirmations ---
ok("no cloud run deploy", /Cloud Run \/ backend image deploy \| \*\*NO\*\*/i.test(doc));
ok("no production deploy", /Production deploy \| \*\*NO\*\*/i.test(doc));
ok("no env/secrets change", /env \/ secrets change \| \*\*NO\*\*/i.test(doc));
ok("no public signup", /Public signup เปิด \| \*\*NO\*\*/i.test(doc));
ok("no user-visible ai", /User-visible AI จริง เปิด \| \*\*NO\*\*/i.test(doc));
ok("no real gemini", /Gemini จริง เปิด \| \*\*NO\*\*/i.test(doc));
ok("no real lead sending", /Real lead sending เปิด \| \*\*NO\*\*/i.test(doc));
ok("no thor runtime", /import Thor runtime จริง \| \*\*NO\*\*/i.test(doc));
ok(
  "no runtime/payload/consent change",
  /แตะ runtime logic \/ lead payload \/ consent \/ final confirmation \| \*\*NO\*\*/i.test(doc)
);
ok(
  "no dealer/privacy/data-model change",
  /แตะ dealer isolation \/ privacy \/ data model \| \*\*NO\*\*/i.test(doc)
);
ok("no force push", /force push \| \*\*NO\*\*/i.test(doc));

// --- (9) pre-deploy tests / regression / tsc summary ---
ok("v75 pass 72", /PASS 72/.test(doc));
ok("all pass true", /ALL PASS: True/i.test(doc));
ok("verifyDistBundle pass", /verifyDistBundle.*PASS|PASS.*verifyDistBundle/i.test(doc));
ok("tsc filter clean", /tsc filter[^\n]*clean/i.test(doc));

// --- (10) smoke v7.5.1 payment-safety ---
ok("smoke payment-safety fixed", /ต้องโอนมัดจำก่อนดูรถไหม[^\n]*PASS — แก้แล้ว/i.test(doc));
ok("smoke suv nudge", doc.includes("มีรถ SUV ให้นัดดูรถไหม"));
ok("smoke yaris control", /มีรถ Yaris ไหม[^\n]*(?:control)?[^\n]*ไม่มี safety nudge/i.test(doc));

// --- (11) baseline issues recorded ---
ok(
  "baseline v69m recorded",
  /test-v69m[^\n]*/i.test(doc) && /known existing issue/i.test(doc)
);
ok("baseline chat-car-cards recorded", doc.includes("test-nonga-chat-car-cards.mts"));
ok("baseline out of scope", /นอก scope/i.test(doc));

// --- (12) rollback path ---
ok("rollback hosting available", /hosting:rollback/i.test(doc));
ok("rollback no backend/data", /ไม่แตะ backend \/ data/i.test(doc));

// --- (13) next recommended step ---
ok(
  "next step try staging as real user",
  /ทดลองใช้งาน staging แบบผู้ใช้งานจริง/i.test(doc)
);
ok(
  "next step before production/gemini",
  /ก่อน[^\n]*production[^\n]*หรือ[^\n]*Gemini จริง|production deploy หรือการเปิด Gemini จริง/i.test(doc)
);

// --- artifacts referenced exist (all 6 sub-rounds + this record) ---
const ARTIFACTS = [
  "docs/v7.1-lead-flow-escape-intent-recheck.md",
  "docs/v7.2-conversational-lead-memory.md",
  "docs/v7.3-natural-lead-preview-no-queue-count.md",
  "docs/v7.4-ai-answer-naturalness-card-narrative-fusion.md",
  "docs/v7.5-thai-used-car-market-context-safety-advice.md",
  "scripts/test-v75-thai-used-car-market-context-safety-advice.mts",
  "src/services/ai/chat/chatUsedCarSafetyAdvice.ts",
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
  "v7.5 package script registered",
  pkg.includes("test:v75-thai-used-car-market-context-safety-advice")
);
ok(
  "v7.5.1A closure package script registered",
  pkg.includes("test:v751a-staging-deploy-closure-record")
);

console.log("\nDone v7.5.1A staging deploy closure record tests.\n");

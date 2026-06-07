/**
 * v6.0A — Smart AI Conversation & Sales Brain Blueprint (static validation only)
 * npm run test:v60a-smart-ai-conversation-sales-brain-blueprint
 *
 * Validates blueprint doc — does NOT call AI API, fetch network, or Firebase/gcloud.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0A-smart-ai-conversation-sales-brain-blueprint.md";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0A Smart AI Conversation & Sales Brain Blueprint ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60a-smart-ai-conversation-sales-brain-blueprint.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0A label ---
{
  ok("blueprint doc exists", doc.length > 2000);
  ok("doc v6.0A label", doc.includes("v6.0A"));
  ok("doc smart ai conversation title", /smart ai conversation|sales brain/i.test(doc));
  ok("doc blueprint status", /blueprint|docs-only|docs\/tests readiness/i.test(docLower));
}

// --- AI First Evaluation Mode ---
{
  ok("doc AI First Evaluation Mode", doc.includes("AI First Evaluation Mode"));
  ok("doc staging closed pilot default high", /staging.*closed pilot.*default.*high|default.*\*\*high\*\*.*staging/i.test(docLower));
  ok("doc AI First not cost optimize first", /ไม่ optimize cost|product value|พิสูจน์ product value/i.test(docLower));
  ok("doc monitor cost", /monitor cost/i.test(docLower));
}

// --- buyer / seller / dealer flows ---
{
  ok("doc buyer flow section", /buyer flow|## 3\. buyer/i.test(docLower));
  ok("doc seller flow section", /seller flow|## 4\. seller/i.test(docLower));
  ok("doc dealer flow section", /dealer flow|## 5\. dealer/i.test(docLower));
  ok("doc buyer flow content", /buyer.*(search|lead|consent|orchestrator)/i.test(docLower));
  ok("doc seller flow content", /seller.*(draft|copy|lead|inbox)/i.test(docLower));
  ok("doc dealer flow content", /dealer.*(inquiry|suggest|showroom)/i.test(docLower));
}

// --- sales brain: negotiation / advice / clarify / finance ---
{
  ok("doc sales brain section", /sales brain|## 6\./i.test(docLower));
  ok("doc negotiation", /negotiat|ต่อรอง/i.test(docLower));
  ok("doc recommendation advice", /recommend|แนะนำ/i.test(docLower));
  ok("doc clarification ask back", /clarif|ถามกลับ/i.test(docLower));
  ok("doc finance explanation", /finance|ไฟแนนซ์/i.test(docLower));
}

// --- no hallucination guard ---
{
  ok("doc no hallucination section", /no-hallucination|hallucinat|ห้ามมั่ว/i.test(docLower));
  ok("doc inventory binding", /inventory|listing.*(fact|field|record)/i.test(docLower));
  ok("doc no fake car data", /ห้าม.*(แต่ง|มั่ว|เดา)|ไม่มีใน.*(ระบบ|inventory|database)/i.test(docLower));
  ok("doc facts-only prompt ref", /CHAT_FACTS_ONLY|facts-only|facts only/i.test(doc));
}

// --- consent / privacy guard ---
{
  ok("doc consent privacy section", /consent.*privacy|privacy guard|## 8\./i.test(docLower));
  ok("doc no contact without consent", /ห้าม.*(contact|เบอร์|consent)|consent.*(modal|ก่อน)/i.test(docLower));
  ok("doc buyer lead consent modal ref", /BuyerLeadConsentModal/i.test(doc));
  ok("doc pdpa or privacy", /PDPA|privacy|masked/i.test(doc));
}

// --- credit-risk & financial/legal guard ---
{
  ok("doc credit risk guard", /credit.risk|ติดบูโร|credit-risk/i.test(docLower));
  ok("doc no credit label", /ห้าม.*(ติดบูโร|credit|เครดิต)/i.test(docLower));
  ok("doc financial legal guard", /financial.*legal|กฎหมาย|ฟันธง/i.test(docLower));
  ok("doc no finance guarantee", /ห้าม.*(รับประกัน|อนุมัติแน่|guarantee)/i.test(docLower));
}

// --- deterministic fallback ---
{
  ok("doc deterministic fallback section", /deterministic fallback|## 10\./i.test(docLower));
  ok("doc fallback triggers", /fallback.*(template|error|budget|off|brake|kill)/i.test(docLower));
  ok("doc skipGemini or orchestrator fallback", /skipGemini|orchestrator|fallbackToTemplate/i.test(doc));
  ok("doc fallback chain", /fallback.*(chain|priority|template)/i.test(docLower));
}

// --- SuperAdmin AI Brake / Downshift ---
{
  ok("doc superadmin brake downshift", /SuperAdmin AI Brake|brake.*downshift|downshift/i.test(doc));
  ok("doc downshift ladder high to off", /high.*standard.*low.*off|high\s*→\s*standard/i.test(docLower));
  ok("doc per-flow downshift", /buyerChat|buyer chat|sellerDraft|dealerSuggestedReply|priceNegotiation|financeExplanation|troubleshooting/i.test(doc));
  ok("doc emergency kill switch", /emergency kill switch|Emergency AI Off/i.test(doc));
  ok("doc tier high", /\*\*high\*\*|tier.*high/i.test(docLower));
  ok("doc tier off", /\*\*off\*\*|tier.*off/i.test(docLower));
}

// --- hard no-go zones ---
{
  ok("doc hard no-go zones section", /Hard No-Go Zones|hard no-go zones/i.test(doc));
  ok("doc no-go revenue write path", /ห้าม AI ใน revenue write path|revenue write path/i.test(docLower));
  ok("doc no-go settlement adjustment", /settlement adjustment write/i.test(docLower));
  ok("doc no-go payment", /ห้าม AI ใน payment|payment.*❌/i.test(docLower));
  ok("doc no-go invoice", /ห้าม AI ใน invoice|invoice.*❌/i.test(docLower));
  ok("doc no-go consent contact", /ห้าม AI reveal buyer phone|contact โดยไม่มี consent/i.test(docLower));
  ok("doc no-go listing hallucination", /ห้าม AI แต่งข้อมูลรถ/i.test(doc));
}

// --- evaluation metrics ---
{
  ok("doc evaluation metrics section", /Evaluation Metrics|## 13\./i.test(doc));
  ok("doc metric buyer engagement", /buyer engagement/i.test(docLower));
  ok("doc metric lead conversion", /lead conversion/i.test(docLower));
  ok("doc metric seller satisfaction", /seller satisfaction/i.test(docLower));
  ok("doc metric dealer usefulness", /dealer usefulness/i.test(docLower));
  ok("doc metric hallucination reports", /hallucination reports/i.test(docLower));
  ok("doc metric cost per useful conversation", /cost per useful conversation/i.test(docLower));
  ok("doc metric downgrade events", /SuperAdmin downgrade events|downgrade events/i.test(docLower));
}

// --- budget monitor / warning / stop ---
{
  ok("doc budget monitor section", /Budget Monitor|budget monitor/i.test(doc));
  ok("doc daily budget warning", /daily budget warning/i.test(docLower));
  ok("doc monthly budget warning", /monthly budget warning/i.test(docLower));
  ok("doc budget stop", /budget stop/i.test(docLower));
}

// --- logging no PII ---
{
  ok("doc logging section", /logging.*PII|## 15\./i.test(docLower));
  ok("doc redact pii", /redact|PII|ห้ามเก็บ/i.test(docLower));
  ok("doc no phone in log", /เบอร์|phone/i.test(docLower));
}

// --- staged rollout plan (AI First) ---
{
  ok("doc staged rollout section", /staged rollout|## 16\./i.test(docLower));
  ok("doc stage docs", /docs.*\(v6\.0A|stage.*0.*docs/i.test(docLower));
  ok("doc stage mock responses", /mock responses/i.test(docLower));
  ok("doc stage local AI First flag", /local AI First flag/i.test(doc));
  ok("doc stage staging AI First flag", /staging AI First flag/i.test(doc));
  ok("doc stage closed pilot high mode", /closed pilot high mode/i.test(docLower));
  ok("doc stage measure", /\*\*measure\*\*|stage.*5.*measure/i.test(docLower));
  ok("doc stage downshift optimize", /downshift.*cost optimize|downshift \/ cost optimize/i.test(docLower));
  ok("doc rollout rollback", /rollback|brake/i.test(docLower));
}

// --- Thai tone guide ---
{
  ok("doc thai tone guide", /Thai Tone Guide|## 17\./i.test(doc));
  ok("doc tone warm professional", /อบอุ่น|มืออาชีพ/i.test(doc));
  ok("doc tone sales assistant", /ผู้ช่วยขายรถ|คุยเก่ง|แนะนำเป็น/i.test(doc));
  ok("doc tone no overdo", /ไม่เว่อร์|ไม่มั่ว|ไม่กดดัน/i.test(doc));
}

// --- v6.0A does NOT change runtime behavior / no real AI API ---
{
  ok("doc no runtime change statement", /ยังไม่เปลี่ยน runtime behavior|no runtime change|does not change runtime/i.test(docLower));
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy|ห้าม deploy/i.test(docLower));
  ok("doc forbidden no env secrets", /ไม่เปิด env|no env|secrets/i.test(docLower));
  ok("doc forbidden no paid ai api", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc forbidden no payment settlement", /payment.*invoice.*settlement|settlement logic/i.test(docLower));
  ok("doc forbidden no lead reveal outcome change", /buyer lead.*seller reveal.*outcome|ห้ามแตะ/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- references prior work ---
{
  ok("references v56j", doc.includes("v5.6J"));
  ok("references v56a", doc.includes("v5.6A"));
  ok("references orchestrator", doc.includes("chatSearchOrchestrator"));
}

// --- test script static only (no network / AI / firebase) ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase deploy exec", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
  ok("script no spawn network", !/spawn\s*\(\s*[`'"]curl/.test(selfCode));
  ok("script uses readFileSync only", readFileSync.length >= 0 && selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60a script", pkg.includes("test:v60a-smart-ai-conversation-sales-brain-blueprint"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60a-smart-ai-conversation-sales-brain-blueprint.mts")
  );
}

console.log("\nDone v6.0A Smart AI Conversation & Sales Brain Blueprint tests.");
if (process.exitCode) process.exit(process.exitCode);

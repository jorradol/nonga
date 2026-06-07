/**
 * v6.0C — Existing AI Capability Inventory & Sales Brain Integration Map (static validation only)
 * npm run test:v60c-existing-ai-capability-inventory-sales-brain-map
 *
 * Validates inventory doc — does NOT call AI API, fetch network, or Firebase/gcloud.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0C-existing-ai-capability-inventory-sales-brain-map.md";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0C Existing AI Capability Inventory & Sales Brain Map ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60c-existing-ai-capability-inventory-sales-brain-map.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0C label ---
{
  ok("inventory doc exists", doc.length > 3000);
  ok("doc v6.0C label", doc.includes("v6.0C"));
  ok("doc capability inventory title", /capability inventory|sales brain integration map/i.test(doc));
  ok("doc readiness status", /docs\/tests readiness|ยังไม่เปลี่ยน runtime/i.test(docLower));
}

// --- capability inventory (at least 10) ---
{
  const capMatches = doc.match(/CAP-\d+/g) ?? [];
  ok("capability inventory at least 10 entries", capMatches.length >= 10, `found ${capMatches.length}`);
  ok("cap CAP-01 image draft", doc.includes("CAP-01"));
  ok("cap CAP-02 publish guard", doc.includes("CAP-02"));
  ok("cap CAP-03 marketing copy", doc.includes("CAP-03"));
  ok("cap CAP-04 buyer search parser", doc.includes("CAP-04"));
  ok("cap CAP-05 buyer scoring", doc.includes("CAP-05"));
  ok("cap CAP-06 curated analysis", doc.includes("CAP-06"));
  ok("cap CAP-07 lead text parser", doc.includes("CAP-07"));
  ok("cap CAP-09 consent", doc.includes("CAP-09"));
  ok("cap CAP-10 lead queue reveal", doc.includes("CAP-10"));
  ok("cap CAP-14 facts guard", doc.includes("CAP-14"));
  ok("cap CAP-15 deterministic fallback", doc.includes("CAP-15"));
}

// --- specific capability topics from requirements ---
{
  ok("topic seller image to draft", /image-to-draft|image understanding/i.test(docLower));
  ok("topic listing draft publish guard", /publish guard|draft completeness/i.test(docLower));
  ok("topic seller marketing share copy", /marketing copy|share copy/i.test(docLower));
  ok("topic buyer search parser", /buyer search parser|buyerSearchIntentParser/i.test(doc));
  ok("topic buyer scoring ranking", /scoring|ranking|buyerMarketplaceScoring/i.test(doc));
  ok("topic curated analysis", /curated analysis|buildInChatCuratedAnalysis/i.test(doc));
  ok("topic buyer lead text parser", /buyerLeadTextParser|lead natural text/i.test(doc));
  ok("topic purchase profile reuse", /purchase profile|buyerPurchaseProfile/i.test(doc));
  ok("topic consent modal privacy", /BuyerLeadConsentModal|consent modal|phone privacy/i.test(doc));
  ok("topic dealer import column mapping", /column mapping|prepareSmartImport|dealer import/i.test(docLower));
  ok("topic report moderation", /moderation|listingReport/i.test(doc));
  ok("topic revenue settlement read-only", /revenue.*read-only|settlement.*read-only|revenuePreview/i.test(doc));
  ok("topic chatSearchOrchestrator", doc.includes("chatSearchOrchestrator"));
}

// --- buyer/seller/dealer/admin integration maps ---
{
  ok("doc buyer integration map", /Integration Map — Buyer|Sales Brain Integration Map — Buyer/i.test(doc));
  ok("doc seller integration map", /Integration Map — Seller|Sales Brain Integration Map — Seller/i.test(doc));
  ok("doc dealer integration map", /Integration Map — Dealer|Sales Brain Integration Map — Dealer/i.test(doc));
  ok("doc admin integration map", /Admin \/ SuperAdmin|Integration Map — Admin/i.test(doc));
  ok("buyer map references search", /buyerSearchIntentParser|scored search/i.test(docLower));
  ok("seller map references draft", /sellIntentParser|precheck/i.test(docLower));
  ok("dealer map references import", /columnMapping|pasteRawVehicleParser/i.test(doc));
}

// --- AI-as-orchestrator concept ---
{
  ok("doc AI-as-orchestrator section", /AI-as-Orchestrator|ai-as-orchestrator/i.test(doc));
  ok("doc orchestrator not data source", /orchestrator\/adapter|ไม่ใช่แหล่งข้อมูลหลัก/i.test(docLower));
  ok("doc AI reads intent selects tool", /อ่าน intent|เลือก tool|capability/i.test(docLower));
  ok("doc AI summarize not invent facts", /facts ต้องมาจากระบบ|ไม่เดา/i.test(docLower));
  ok("doc no separate AI chat stack", /ไม่สร้าง AI chat แยก|parallel chat stack/i.test(docLower));
}

// --- listing facts / no hallucination ---
{
  ok("doc listing facts guard", /listing facts|CHAT_FACTS_ONLY|chatSearchFacts/i.test(doc));
  ok("doc no hallucination", /hallucinat|no hallucination|ห้าม.*มั่ว/i.test(docLower));
  ok("doc chatBuyerFactsQa", doc.includes("chatBuyerFactsQa"));
}

// --- deterministic fallback ---
{
  ok("doc deterministic fallback section", /Deterministic Fallback|deterministic fallback/i.test(doc));
  ok("doc fallback orchestrator", doc.includes("chatSearchOrchestrator"));
  ok("doc fallback skipGemini", doc.includes("skipGemini"));
  ok("doc fallback chatMockFallback", doc.includes("chatMockFallback"));
}

// --- no-go zones ---
{
  ok("doc no-go zones section", /Hard No-Go Zones|no-go zones/i.test(doc));
  ok("doc no-go revenue write", /revenue write/i.test(docLower));
  ok("doc no-go settlement", /settlement adjustment write|settlement.*write/i.test(docLower));
  ok("doc no-go payment", /payment/i.test(docLower));
  ok("doc no-go invoice", /invoice/i.test(docLower));
  ok("doc no-go contact reveal consent", /contact reveal without consent|consent/i.test(docLower));
}

// --- priority plan ---
{
  ok("doc priority plan section", /Priority Plan|Phase 1/i.test(doc));
  ok("doc phase 1 inventory map", /Phase 1.*inventory|Inventory \+ map/i.test(doc));
  ok("doc phase 2 mock tool calls", /Phase 2.*mock tool|mock tool calls/i.test(doc));
  ok("doc phase 3 local harness", /Phase 3.*deterministic harness|local deterministic/i.test(doc));
  ok("doc phase 4 staging mock", /Phase 4.*staging.*mock|mock tools/i.test(docLower));
  ok("doc phase 5 staging real high", /Phase 5.*real AI high|staging real AI/i.test(doc));
  ok("doc phase 6 measure downshift", /Phase 6.*downshift|measure \+ SuperAdmin/i.test(doc));
}

// --- classification matrix ---
{
  ok("doc capability classification", /Capability Classification|Deterministic only|AI allowed/i.test(doc));
  ok("doc references v60a v60b", doc.includes("v6.0A") && doc.includes("v6.0B"));
}

// --- v6.0C no runtime change ---
{
  ok("doc no runtime change statement", /v6\.0C ยังไม่เปลี่ยน runtime behavior|ยังไม่เปลี่ยน runtime behavior/i.test(doc));
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy/i.test(docLower));
  ok("doc forbidden no env secrets", /env\/secrets|secrets ใหม่/i.test(docLower));
  ok("doc forbidden no paid ai api", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("doc forbidden no production", /ไม่แตะ production|production/i.test(docLower));
  ok("doc forbidden no payment settlement change", /payment.*settlement|settlement logic/i.test(docLower));
  ok("doc forbidden no lead reveal outcome", /buyer lead.*reveal.*outcome|reveal \/ outcome/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase deploy exec", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
  ok("script no spawn network", !/spawn\s*\(\s*[`'"]curl/.test(selfCode));
  ok("script uses readFileSync only", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v60c script",
    pkg.includes("test:v60c-existing-ai-capability-inventory-sales-brain-map")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60c-existing-ai-capability-inventory-sales-brain-map.mts")
  );
}

console.log("\nDone v6.0C Existing AI Capability Inventory & Sales Brain Map tests.");
if (process.exitCode) process.exit(process.exitCode);

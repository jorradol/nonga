/**
 * v6.0D — Mock Tool Calls & Sales Brain Harness (offline only)
 * npm run test:v60d-mock-tool-calls-sales-brain-harness
 *
 * Spec harness + doc validation — no AI API, network, Firebase, or gcloud.
 */
import { readFileSync } from "node:fs";
import { routeSalesBrainMock } from "../src/services/ai/salesBrainMock.ts";

const DOC_PATH = "docs/v6.0D-mock-tool-calls-sales-brain-harness.md";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0D Mock Tool Calls & Sales Brain Harness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync("scripts/test-v60d-mock-tool-calls-sales-brain-harness.mts", "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0D ---
{
  ok("harness doc exists", doc.length > 2500);
  ok("doc v6.0D label", doc.includes("v6.0D"));
  ok("doc mock tool calls title", /mock tool call|sales brain harness/i.test(doc));
  ok("doc offline harness status", /offline|ยังไม่เปลี่ยน runtime/i.test(docLower));
}

// --- mock tool call contract ---
{
  ok("contract input userMessage", /userMessage/.test(doc));
  ok("contract input userRole", /userRole/.test(doc));
  ok("contract input flowContext", /flowContext/.test(doc));
  ok("contract input listingContext", /listingContext/.test(doc));
  ok("contract input aiMode", /aiMode/.test(doc));
  ok("contract output intent", /intent/.test(doc));
  ok("contract output selectedCapabilities", /selectedCapabilities/.test(doc));
  ok("contract output mockToolCalls", /mockToolCalls/.test(doc));
  ok("contract output responsePlan", /responsePlan/.test(doc));
  ok("contract output safetyDecision", /safetyDecision/.test(doc));
  ok("contract output fallback", /fallback/.test(doc));
  ok("contract askFollowUp no hallucinate", /askFollowUp|ไม่ hallucinate|ไม่เดา/i.test(docLower));
  ok("contract no pii logging", /no PII|ห้ามมี PII|phone-redacted/i.test(doc));
}

// --- mock scenarios in doc ---
{
  ok("scenario SC-B01 buyer search", doc.includes("SC-B01"));
  ok("scenario SC-B02 finance negotiate", doc.includes("SC-B02"));
  ok("scenario SC-S01 image draft", doc.includes("SC-S01"));
  ok("scenario SC-S02 marketing copy", doc.includes("SC-S02"));
  ok("scenario SC-D01 dealer import", doc.includes("SC-D01"));
  ok("scenario SC-D02 dealer reply", doc.includes("SC-D02"));
  ok("scenario SC-A01 admin ai mode", doc.includes("SC-A01"));
  ok("scenario SC-A02 revenue readonly", doc.includes("SC-A02"));
  ok("scenario buyer message budget", doc.includes("งบ 4 แสน"));
  ok("scenario buyer finance negotiate msg", /ผ่อนได้ไหม ลดได้ไหม/.test(doc));
}

// --- no-go zones in doc ---
{
  ok("doc no-go revenue write", /revenue write/i.test(docLower));
  ok("doc no-go settlement write", /settlement.*write|settlement adjust/i.test(docLower));
  ok("doc no-go payment", /payment/i.test(docLower));
  ok("doc no-go invoice", /invoice/i.test(docLower));
  ok("doc no-go contact reveal", /contact reveal|reveal phone/i.test(docLower));
}

// --- deterministic fallback + listing facts ---
{
  ok("doc deterministic fallback", /Deterministic Fallback|deterministic fallback/i.test(doc));
  ok("doc chatSearchOrchestrator fallback", doc.includes("chatSearchOrchestrator"));
  ok("doc listing facts guard", /listing facts|CAP-14|chatSearchFacts/i.test(doc));
  ok("doc no hallucination", /hallucinat|ห้าม hallucinate/i.test(docLower));
}

// --- v6.0D no runtime change ---
{
  ok("doc no runtime change", /v6\.0D ยังไม่เปลี่ยน runtime behavior|ยังไม่เปลี่ยน runtime behavior/i.test(doc));
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy/i.test(docLower));
  ok("doc forbidden no network", /fetch network|ไม่ fetch/i.test(docLower));
  ok("doc forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("doc references v60c", doc.includes("v6.0C"));
}

// --- offline harness scenario tests ---
{
  const b01 = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
    aiProvider: "mock",
  });
  ok("harness SC-B01 intent", b01.intent === "buyer.search");
  ok("harness SC-B01 caps", b01.selectedCapabilities.includes("CAP-04") && b01.selectedCapabilities.includes("CAP-05"));
  ok("harness SC-B01 mock calls", b01.mockToolCalls.length >= 3 && b01.mockToolCalls.every((c) => c.mock === true));

  const b02 = routeSalesBrainMock({
    userMessage: "คันนี้ผ่อนได้ไหม ลดได้ไหม",
    userRole: "buyer",
    listingContext: { listingId: "L1", price: 450000, fieldsPresent: ["price"] },
    aiMode: "high",
  });
  ok("harness SC-B02 intent", b02.intent === "buyer.finance_negotiate");
  ok("harness SC-B02 has CAP-09 consent path", b02.selectedCapabilities.includes("CAP-09"));
  ok("harness SC-B02 no fallback", b02.fallback === false);

  const b03 = routeSalesBrainMock({
    userMessage: "คันนี้ผ่อนได้ไหม",
    userRole: "buyer",
    aiMode: "high",
  });
  ok("harness SC-B03 askFollowUp", b03.safetyDecision === "askFollowUp");
  ok("harness SC-B03 ask text", Boolean(b03.askFollowUp?.includes("คันไหน")));

  const s01 = routeSalesBrainMock({
    userMessage: "ช่วยลงขายจากรูปให้หน่อย",
    userRole: "seller",
    flowContext: { attachedImageCount: 2 },
  });
  ok("harness SC-S01 image draft", s01.intent === "seller.image_draft");
  ok("harness SC-S01 CAP-01", s01.selectedCapabilities.includes("CAP-01"));

  const s02 = routeSalesBrainMock({
    userMessage: "ช่วยเขียนโพสต์ขาย",
    userRole: "seller",
    listingContext: { listingId: "L2", brand: "Toyota", fieldsPresent: ["brand", "price"] },
  });
  ok("harness SC-S02 marketing", s02.intent === "seller.marketing_copy");
  ok("harness SC-S02 CAP-03", s02.selectedCapabilities.includes("CAP-03"));

  const d01 = routeSalesBrainMock({
    userMessage: "มีไฟล์รถหลายคันจะเอาเข้า",
    userRole: "dealer",
  });
  ok("harness SC-D01 import", d01.intent === "dealer.import");
  ok("harness SC-D01 CAP-11", d01.selectedCapabilities.includes("CAP-11"));

  const d02 = routeSalesBrainMock({
    userMessage: "ช่วยตอบลูกค้าคันนี้",
    userRole: "dealer",
    listingContext: { listingId: "L3", fieldsPresent: ["carTitle"] },
  });
  ok("harness SC-D02 dealer reply", d02.intent === "dealer.suggested_reply");
  ok("harness SC-D02 draft only plan", /Draft reply|no contact reveal/i.test(d02.responsePlan));

  const a01 = routeSalesBrainMock({
    userMessage: "ดูสถานะ AI mode",
    userRole: "admin",
  });
  ok("harness SC-A01 admin ai", a01.intent === "admin.ai_control_readonly");
  ok("harness SC-A01 CAP-16", a01.selectedCapabilities.includes("CAP-16"));

  const a02 = routeSalesBrainMock({
    userMessage: "รายได้เดือนนี้เท่าไหร่",
    userRole: "admin",
  });
  ok("harness SC-A02 revenue readonly", a02.intent === "admin.revenue_readonly");
  ok("harness SC-A02 no settlement write", /no settlement write|read-only/i.test(a02.responsePlan));

  const off = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "off",
  });
  ok("harness aiMode off fallback", off.fallback === true && off.selectedCapabilities.includes("CAP-15"));

  const nogo = routeSalesBrainMock({
    userMessage: "process payment for this lead",
    userRole: "admin",
  });
  ok("harness no-go payment", nogo.safetyDecision === "no_go" && nogo.fallback === true);
  ok("harness no-go empty tools", nogo.mockToolCalls.length === 0);

  const reveal = routeSalesBrainMock({
    userMessage: "reveal phone to seller now",
    userRole: "seller",
  });
  ok("harness no-go contact reveal", reveal.safetyDecision === "no_go");

  const settle = routeSalesBrainMock({
    userMessage: "settlement adjust write for buyer",
    userRole: "admin",
  });
  ok("harness no-go settlement write", settle.safetyDecision === "no_go");

  const inv = routeSalesBrainMock({
    userMessage: "generate invoice for deal",
    userRole: "admin",
  });
  ok("harness no-go invoice", inv.safetyDecision === "no_go");

  const phoneMsg = routeSalesBrainMock({
    userMessage: "งบ 4 แสน โทร 0812345678",
    userRole: "buyer",
  });
  ok("harness log no raw phone", !JSON.stringify(phoneMsg.logRecord).includes("0812345678"));
  ok("harness paramsHash deterministic", phoneMsg.logRecord.paramsHash.length === 16);

  const det1 = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
  });
  const det2 = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
  });
  ok(
    "harness deterministic same input",
    det1.intent === det2.intent &&
      det1.logRecord.paramsHash === det2.logRecord.paramsHash &&
      det1.selectedCapabilities.join() === det2.selectedCapabilities.join()
  );
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
}

// --- package.json ---
{
  ok("package v60d script", pkg.includes("test:v60d-mock-tool-calls-sales-brain-harness"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60d-mock-tool-calls-sales-brain-harness.mts")
  );
}

console.log("\nDone v6.0D Mock Tool Calls & Sales Brain Harness tests.");
if (process.exitCode) process.exit(process.exitCode);

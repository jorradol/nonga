/**
 * v6.0D — Mock Tool Calls & Sales Brain Harness (offline only)
 * npm run test:v60d-mock-tool-calls-sales-brain-harness
 *
 * Spec harness + doc validation — no AI API, network, Firebase, or gcloud.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0D-mock-tool-calls-sales-brain-harness.md";

type UserRole = "buyer" | "seller" | "dealer" | "admin";
type AiMode = "off" | "low" | "standard" | "high";
type SafetyDecision = "allow" | "no_go" | "askFollowUp";

interface SalesBrainMockInput {
  userMessage: string;
  userRole: UserRole;
  flowContext?: {
    sessionIdHash?: string;
    selectedListingId?: string;
    attachedImageCount?: number;
  };
  listingContext?: {
    listingId?: string;
    price?: number;
    brand?: string;
    model?: string;
    fieldsPresent?: string[];
  };
  aiMode?: AiMode;
  aiProvider?: "mock" | "none";
}

interface MockToolCall {
  toolId: string;
  capId: string;
  mock: true;
  paramsHash: string;
}

interface SalesBrainMockOutput {
  intent: string;
  selectedCapabilities: string[];
  mockToolCalls: MockToolCall[];
  responsePlan: string;
  safetyDecision: SafetyDecision;
  fallback: boolean;
  askFollowUp?: string;
  logRecord: {
    intent: string;
    caps: string[];
    safety: SafetyDecision;
    paramsHash: string;
    latencyMs: number;
  };
}

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function redactPii(text: string): string {
  return text
    .replace(/0[689]\d[\d\s-]{7,}/g, "[phone-redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "[email-redacted]");
}

function paramsHash(input: SalesBrainMockInput): string {
  const safe = {
    role: input.userRole,
    msg: redactPii(input.userMessage).slice(0, 120),
    listingId: input.listingContext?.listingId ?? null,
    aiMode: input.aiMode ?? "high",
  };
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex").slice(0, 16);
}

function mockCall(toolId: string, capId: string, input: SalesBrainMockInput): MockToolCall {
  return { toolId, capId, mock: true, paramsHash: paramsHash(input) };
}

const NO_GO_PATTERNS =
  /settlement adjust|revenue write|process payment|generate invoice|reveal phone|send buyer number|submit lead without consent/i;

function routeSalesBrainMock(input: SalesBrainMockInput): SalesBrainMockOutput {
  const aiMode = input.aiMode ?? "high";
  const msg = input.userMessage;
  const hash = paramsHash(input);

  if (NO_GO_PATTERNS.test(msg)) {
    return {
      intent: "blocked.no_go",
      selectedCapabilities: [],
      mockToolCalls: [],
      responsePlan: "fallback to existing deterministic route — no-go zone",
      safetyDecision: "no_go",
      fallback: true,
      logRecord: { intent: "blocked.no_go", caps: [], safety: "no_go", paramsHash: hash, latencyMs: 0 },
    };
  }

  if (aiMode === "off" || input.aiProvider === "none") {
    return {
      intent: "fallback.orchestrator",
      selectedCapabilities: ["CAP-15"],
      mockToolCalls: [],
      responsePlan: "chatSearchOrchestrator + templates",
      safetyDecision: "allow",
      fallback: true,
      logRecord: {
        intent: "fallback.orchestrator",
        caps: ["CAP-15"],
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  // Buyer: budget search
  if (input.userRole === "buyer" && /งบ|4\s*แสน|มีรถ.*น่า/i.test(msg)) {
    const caps = ["CAP-04", "CAP-05", "CAP-06", "CAP-14"];
    return {
      intent: "buyer.search",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockCall("buyerSearchIntentParser.parse", "CAP-04", input),
        mockCall("buyerScoredMarketplaceSearch.run", "CAP-05", input),
        mockCall("buildInChatCuratedAnalysis.build", "CAP-06", input),
        mockCall("chatSearchFacts.bind", "CAP-14", input),
      ],
      responsePlan: "Parse budget → score → curated → facts-bound cards",
      safetyDecision: "allow",
      fallback: false,
      logRecord: { intent: "buyer.search", caps, safety: "allow", paramsHash: hash, latencyMs: 0 },
    };
  }

  // Buyer: finance + negotiate (needs listing)
  if (input.userRole === "buyer" && /ผ่อน|ลดได้/i.test(msg)) {
    const hasListing =
      Boolean(input.listingContext?.listingId) ||
      Boolean(input.flowContext?.selectedListingId);
    if (!hasListing) {
      return {
        intent: "buyer.finance_negotiate",
        selectedCapabilities: ["CAP-14"],
        mockToolCalls: [],
        responsePlan: "ask which car — no price hallucination",
        safetyDecision: "askFollowUp",
        fallback: false,
        askFollowUp: "สนใจรถคันไหนครับ ช่วยบอกรุ่นหรือเลือกจากการ์ดรถในแชทได้เลย",
        logRecord: {
          intent: "buyer.finance_negotiate",
          caps: ["CAP-14"],
          safety: "askFollowUp",
          paramsHash: hash,
          latencyMs: 0,
        },
      };
    }
    const caps = ["CAP-14", "CAP-15", "CAP-07", "CAP-09"];
    return {
      intent: "buyer.finance_negotiate",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockCall("chatBuyerFactsQa.answer", "CAP-14", input),
        mockCall("chatBuyerFinanceCalculator.estimate", "CAP-15", input),
        mockCall("priceNegotiation.hint", "CAP-07", input),
        mockCall("buyerLeadCaptureFlow.consentPath", "CAP-09", input),
      ],
      responsePlan: "Facts → finance disclaimer → negotiation hint → consent path",
      safetyDecision: "allow",
      fallback: false,
      logRecord: {
        intent: "buyer.finance_negotiate",
        caps,
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  // Seller: image draft
  if (input.userRole === "seller" && /ลงขายจากรูป|จากรูป/i.test(msg)) {
    const caps = ["CAP-01", "CAP-02", "CAP-14"];
    return {
      intent: "seller.image_draft",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockCall("visionEngine.analyzeMock", "CAP-01", input),
        mockCall("chatPrecheckLayer.check", "CAP-01", input),
        mockCall("sellIntentParser.extract", "CAP-01", input),
        mockCall("memberListingPublishGuard.preview", "CAP-02", input),
      ],
      responsePlan: "Mock vision → precheck → missing fields checklist",
      safetyDecision: "allow",
      fallback: false,
      logRecord: {
        intent: "seller.image_draft",
        caps,
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  // Seller: marketing copy
  if (input.userRole === "seller" && /เขียนโพสต์|โพสต์ขาย/i.test(msg)) {
    const caps = ["CAP-03", "CAP-14"];
    return {
      intent: "seller.marketing_copy",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockCall("sellerShareCopy.generate", "CAP-03", input),
        mockCall("thaiSalesCopyVariation.build", "CAP-03", input),
        mockCall("listingDescriptionHelper.fromFields", "CAP-03", input),
      ],
      responsePlan: "Copy from listing fields only — seller reviews",
      safetyDecision: "allow",
      fallback: false,
      logRecord: {
        intent: "seller.marketing_copy",
        caps,
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  // Dealer: import
  if (input.userRole === "dealer" && /ไฟล์รถ|เอาเข้า/i.test(msg)) {
    const caps = ["CAP-11"];
    return {
      intent: "dealer.import",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockCall("columnMapping.suggest", "CAP-11", input),
        mockCall("prepareSmartInventoryImport.preview", "CAP-11", input),
      ],
      responsePlan: "Column map → import review",
      safetyDecision: "allow",
      fallback: false,
      logRecord: { intent: "dealer.import", caps, safety: "allow", paramsHash: hash, latencyMs: 0 },
    };
  }

  // Dealer: suggested reply
  if (input.userRole === "dealer" && /ตอบลูกค้า/i.test(msg)) {
    const caps = ["CAP-14", "CAP-17"];
    return {
      intent: "dealer.suggested_reply",
      selectedCapabilities: caps,
      mockToolCalls: [mockCall("dealerStore.suggestReplyMock", "CAP-17", input)],
      responsePlan: "Draft reply only — no contact reveal",
      safetyDecision: "allow",
      fallback: false,
      logRecord: {
        intent: "dealer.suggested_reply",
        caps,
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  // Admin: AI mode
  if (input.userRole === "admin" && /AI mode|สถานะ AI/i.test(msg)) {
    const caps = ["CAP-16"];
    return {
      intent: "admin.ai_control_readonly",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockCall("aiControlConfig.resolveMock", "CAP-16", input),
        mockCall("SmartSalesAiControlPreview.render", "CAP-16", input),
      ],
      responsePlan: "Read-only AI control preview",
      safetyDecision: "allow",
      fallback: false,
      logRecord: {
        intent: "admin.ai_control_readonly",
        caps,
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  // Admin: revenue read-only
  if (input.userRole === "admin" && /รายได้|revenue/i.test(msg)) {
    const caps = ["CAP-13"];
    return {
      intent: "admin.revenue_readonly",
      selectedCapabilities: caps,
      mockToolCalls: [mockCall("revenuePreviewBackend.previewMock", "CAP-13", input)],
      responsePlan: "Read-only revenue preview — no settlement write",
      safetyDecision: "allow",
      fallback: false,
      logRecord: {
        intent: "admin.revenue_readonly",
        caps,
        safety: "allow",
        paramsHash: hash,
        latencyMs: 0,
      },
    };
  }

  return {
    intent: "unknown",
    selectedCapabilities: ["CAP-15"],
    mockToolCalls: [],
    responsePlan: "fallback orchestrator",
    safetyDecision: "allow",
    fallback: true,
    logRecord: {
      intent: "unknown",
      caps: ["CAP-15"],
      safety: "allow",
      paramsHash: hash,
      latencyMs: 0,
    },
  };
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

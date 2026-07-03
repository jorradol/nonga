/**
 * v6.0E — Local mock Sales Brain router (deterministic, no network, no paid API).
 * Not wired to chat/orchestrator runtime — import for tests and future feature-flagged use.
 */
import type {
  SalesBrainMockInput,
  SalesBrainMockOutput,
  SalesBrainMockToolCall,
  SalesBrainUserRole,
} from "./salesBrainTypes";
import { SALES_BRAIN_NO_GO_TOOL_PATTERNS } from "./salesBrainTypes";

export type {
  SalesBrainMockInput,
  SalesBrainMockOutput,
  SalesBrainMockToolCall,
  SalesBrainUserRole,
} from "./salesBrainTypes";

export function redactPiiForSalesBrainLog(text: string): string {
  return text
    .replace(/0[689]\d[\d\s-]{7,}/g, "[phone-redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "[email-redacted]");
}

function computeParamsHash(input: SalesBrainMockInput): string {
  const safe = {
    role: input.userRole,
    msg: redactPiiForSalesBrainLog(input.userMessage).slice(0, 120),
    listingId: input.listingContext?.listingId ?? null,
    aiMode: input.aiMode ?? "high",
    aiFirst: input.aiFirstEnabled ?? true,
    kill: input.emergencyKillSwitch ?? false,
  };
  return stableHash16(JSON.stringify(safe));
}

function stableHash16(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c;
    h2 = Math.imul(h2, 0x27d4eb2d);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${p1}${p2}`;
}

function mockToolCall(
  toolId: string,
  capId: string,
  input: SalesBrainMockInput
): SalesBrainMockToolCall {
  return { toolId, capId, mock: true, paramsHash: computeParamsHash(input) };
}

function fallbackOrchestrator(hash: string, intent = "fallback.orchestrator"): SalesBrainMockOutput {
  return {
    intent,
    selectedCapabilities: ["CAP-15"],
    mockToolCalls: [],
    responsePlan: "chatSearchOrchestrator + templates",
    safetyDecision: "allow",
    fallback: true,
    logRecord: {
      intent,
      caps: ["CAP-15"],
      safety: "allow",
      paramsHash: hash,
      latencyMs: 0,
    },
  };
}

function isAdminRole(role: SalesBrainUserRole): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Deterministic mock router — maps user message + role to v6.0C capability chain.
 */
export function routeSalesBrainMock(input: SalesBrainMockInput): SalesBrainMockOutput {
  const aiMode = input.aiMode ?? "high";
  const msg = input.userMessage;
  const hash = computeParamsHash(input);

  if (input.emergencyKillSwitch === true) {
    return fallbackOrchestrator(hash, "fallback.emergency_kill_switch");
  }

  if (SALES_BRAIN_NO_GO_TOOL_PATTERNS.test(msg)) {
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

  const aiFirstOff = input.aiFirstEnabled === false;
  if (aiMode === "off" || input.aiProvider === "none" || aiFirstOff) {
    return fallbackOrchestrator(hash);
  }

  // Buyer: budget search
  if (input.userRole === "buyer" && /งบ|4\s*แสน|มีรถ.*น่า/i.test(msg)) {
    const caps = ["CAP-04", "CAP-05", "CAP-06", "CAP-14"];
    return {
      intent: "buyer.search",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockToolCall("buyerSearchIntentParser.parse", "CAP-04", input),
        mockToolCall("buyerScoredMarketplaceSearch.run", "CAP-05", input),
        mockToolCall("buildInChatCuratedAnalysis.build", "CAP-06", input),
        mockToolCall("chatSearchFacts.bind", "CAP-14", input),
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
        mockToolCall("chatBuyerFactsQa.answer", "CAP-14", input),
        mockToolCall("chatBuyerFinanceCalculator.estimate", "CAP-15", input),
        mockToolCall("priceNegotiation.hint", "CAP-07", input),
        mockToolCall("buyerLeadCaptureFlow.consentPath", "CAP-09", input),
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
        mockToolCall("visionEngine.analyzeMock", "CAP-01", input),
        mockToolCall("chatPrecheckLayer.check", "CAP-01", input),
        mockToolCall("sellIntentParser.extract", "CAP-01", input),
        mockToolCall("memberListingPublishGuard.preview", "CAP-02", input),
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
        mockToolCall("sellerShareCopy.generate", "CAP-03", input),
        mockToolCall("thaiSalesCopyVariation.build", "CAP-03", input),
        mockToolCall("listingDescriptionHelper.fromFields", "CAP-03", input),
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
        mockToolCall("columnMapping.suggest", "CAP-11", input),
        mockToolCall("prepareSmartInventoryImport.preview", "CAP-11", input),
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
      mockToolCalls: [mockToolCall("dealerStore.suggestReplyMock", "CAP-17", input)],
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

  // Admin / SuperAdmin: AI mode read-only
  if (isAdminRole(input.userRole) && /AI mode|สถานะ AI/i.test(msg)) {
    const caps = ["CAP-16"];
    return {
      intent: "admin.ai_control_readonly",
      selectedCapabilities: caps,
      mockToolCalls: [
        mockToolCall("aiControlConfig.resolveMock", "CAP-16", input),
        mockToolCall("SmartSalesAiControlPreview.render", "CAP-16", input),
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

  // Admin / SuperAdmin: revenue read-only
  if (isAdminRole(input.userRole) && /รายได้|revenue/i.test(msg)) {
    const caps = ["CAP-13"];
    return {
      intent: "admin.revenue_readonly",
      selectedCapabilities: caps,
      mockToolCalls: [mockToolCall("revenuePreviewBackend.previewMock", "CAP-13", input)],
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

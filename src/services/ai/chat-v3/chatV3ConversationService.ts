/**
 * WP-V3-07B/11 — Thin Chat V.3 Conversation Service.
 * Provider owns answer content; no marketplace template override.
 * WP-V3-11 adds deterministic automotive safety + self-protection layer.
 * WP-V3-14A/14E — at most one post-answer Gemini correction for finance + high-risk claims.
 */
import {
  CHAT_V3_CONVERSATION_SLICE_ID,
  CHAT_V3_USER_FACING_UNAVAILABLE,
  attachChatV3SearchCompositionBoundaryDiagnostic,
  validateChatV3ConversationRequest,
  type ChatV3ConversationErrorCode,
  type ChatV3ConversationResponse,
  type ChatV3SearchCompositionBoundaryDiagnostic,
  type ChatV3ValidatedConversationRequest,
} from "./chatV3ConversationContracts";
import {
  isChatV3KillSwitchActive,
  resolveChatV3ProviderAdapter,
  type ChatV3EnvReader,
  type ChatV3ProviderAdapter,
  type ChatV3ProviderEnvironment,
  type ChatV3ProviderFailureReason,
} from "./chatV3ProviderAdapter";
import {
  appendChatV3SafetyInstructionGuidance,
  applyChatV3OutputSafetyBoundary,
  assessChatV3Safety,
} from "./chatV3SafetyLayer";
import { analyzeChatV3AutomotiveTurn } from "./chatV3AutomotiveReasoning";
import {
  buildChatV3FinanceCorrectionInstruction,
  CHAT_V3_FINANCE_CONSISTENCY_PROVIDER_ID,
  CHAT_V3_FINANCE_RECALC_NOTICE,
  validateChatV3FinanceConsistency,
  type ChatV3FinanceConsistencyResult,
} from "./chatV3FinanceConsistency";
import {
  buildChatV3HighRiskCorrectionInstruction,
  CHAT_V3_HIGH_RISK_FALLBACK_PROVIDER_ID,
  recordChatV3HighRiskGuardMetadata,
  resetChatV3HighRiskGuardMetadata,
  resolveChatV3HighRiskFallback,
  validateChatV3HighRiskResponse,
  type ChatV3HighRiskClass,
  type ChatV3HighRiskProviderErrorCategory,
  type ChatV3HighRiskValidationResult,
} from "./chatV3HighRiskResponseValidator";
import { buildChatV3SystemInstruction } from "./chatV3SystemInstruction";
import { normalizeChatV3AssistantTypography } from "./chatV3TypographyNormalize";
import { normalizeChatV3UnsupportedDurableMemoryClaims } from "./chatV3MemoryClaimNormalizer";
import type { FinanceCalcResult } from "../../../utils/financeCalculator";
import type { ChatV3AutomotiveVehicleContext } from "./chatV3AutomotiveReasoning";
import {
  SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA,
  unwrapSearchGroundingProviderContent,
} from "../chat/chatV2V3SearchGroundingCompose";
import type { ChatV3SearchCompositionMetadata } from "./chatV3ConversationContracts";

export interface RunChatV3ConversationOptions {
  rawRequest: unknown;
  environment: ChatV3ProviderEnvironment;
  readEnv?: ChatV3EnvReader;
  provider?: ChatV3ProviderAdapter;
  allowFakeProvider?: boolean;
  now?: () => number;
  createMessageId?: () => string;
  /** Server-only Search Grounding appendix. Never read from Client request body. */
  searchGroundingAppendix?: string;
  /** Server-only trusted vehicles for Search Grounding. Bypasses Client DTO cap. */
  searchGroundingVehicleContext?: ChatV3AutomotiveVehicleContext | null;
  /** Server-only grounded selected vehicle for General follow-ups. Bypasses Client DTO. */
  authoritativeSelectedVehicleContext?: ChatV3AutomotiveVehicleContext | null;
  /** Search Grounding composition: skip post-answer correction generate. */
  searchGroundingComposition?: boolean;
}

function mapProviderFailureToErrorCode(
  reason: ChatV3ProviderFailureReason
): ChatV3ConversationErrorCode {
  if (reason === "kill_switch") return "kill_switch";
  if (reason === "provider_timeout") return "provider_timeout";
  if (reason === "provider_rejected") return "provider_rejected";
  if (
    reason === "provider_unavailable" ||
    reason === "live_not_enabled" ||
    reason === "configuration_error" ||
    reason === "fake_blocked_in_production"
  ) {
    return "provider_unavailable";
  }
  return "provider_failure";
}

/**
 * Output safety boundary: reject empty/leaky output.
 * Does not replace safe provider text with automotive templates.
 */
export function applyChatV3SafetyBoundary(content: string): {
  ok: true;
  content: string;
} | {
  ok: false;
  errorCode: ChatV3ConversationErrorCode;
  message: string;
} {
  const result = applyChatV3OutputSafetyBoundary(content);
  if (!result.ok) {
    return {
      ok: false,
      errorCode: "unsafe_output",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }
  return { ok: true, content: result.content };
}

function defaultMessageId(now: number): string {
  return `msg-v3-assistant-${now}`;
}

function riskClassesOf(
  result: ChatV3HighRiskValidationResult
): ChatV3HighRiskClass[] {
  return result.findings.map((item) => item.riskClass);
}

function buildUnifiedCorrectionInstruction(input: {
  highRisk: ChatV3HighRiskValidationResult;
  financeCheck: ChatV3FinanceConsistencyResult;
  trustedFinance?: FinanceCalcResult;
}): string {
  const riskClasses = riskClassesOf(input.highRisk);
  const parts: string[] = [];
  if (riskClasses.length > 0) {
    parts.push(buildChatV3HighRiskCorrectionInstruction({ riskClasses }));
  }
  if (!input.financeCheck.ok && input.trustedFinance) {
    parts.push(
      buildChatV3FinanceCorrectionInstruction({
        result: input.trustedFinance,
        mismatches: input.financeCheck.mismatches,
      })
    );
  }
  return parts.join("\n\n");
}

function financeCheckFor(
  content: string,
  trustedFinance: FinanceCalcResult | undefined
): ChatV3FinanceConsistencyResult {
  if (!trustedFinance) {
    return { ok: true, mismatches: [] };
  }
  return validateChatV3FinanceConsistency(content, trustedFinance);
}

function withSearchCompositionBoundaryDiagnostic(
  searchComposition: boolean,
  response: ChatV3ConversationResponse,
  diagnostic: ChatV3SearchCompositionBoundaryDiagnostic
): ChatV3ConversationResponse {
  if (!searchComposition) return response;
  return attachChatV3SearchCompositionBoundaryDiagnostic(response, diagnostic);
}

/**
 * Classify unwrap json-leak into a bounded stage. Diagnostic only; does not
 * change the existing unsafe_output return.
 */
function classifySearchCompositionJsonLeak(
  raw: string
): ChatV3SearchCompositionBoundaryDiagnostic {
  const trimmed = String(raw ?? "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      searchCompositionFallbackReason: trimmed.startsWith("{")
        ? "structured-output-invalid-json"
        : "unknown-bounded",
      structuredOutputParseStatus: trimmed.startsWith("{")
        ? "invalid-json"
        : "absent",
      searchCompositionTextPresent: false,
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      searchCompositionFallbackReason: "structured-output-schema-mismatch",
      structuredOutputParseStatus: "schema-mismatch",
      searchCompositionTextPresent: false,
    };
  }
  const record = parsed as Record<string, unknown>;
  const introRaw = record.introText;
  if (typeof introRaw !== "string") {
    return {
      searchCompositionFallbackReason: "structured-output-schema-mismatch",
      structuredOutputParseStatus: "schema-mismatch",
      searchCompositionTextPresent: false,
    };
  }
  if (!Array.isArray(record.vehicleAnalyses) || typeof record.closingText !== "string") {
    return {
      searchCompositionFallbackReason: "structured-output-schema-mismatch",
      structuredOutputParseStatus: "schema-mismatch",
      searchCompositionTextPresent: false,
    };
  }
  return {
    searchCompositionFallbackReason: "structured-output-envelope-leak",
    structuredOutputParseStatus: "envelope-leak",
    searchCompositionTextPresent: false,
  };
}

export async function runChatV3Conversation(
  options: RunChatV3ConversationOptions
): Promise<ChatV3ConversationResponse> {
  resetChatV3HighRiskGuardMetadata();
  const readEnv = options.readEnv ?? ((key: string) => process.env[key]);
  const now = options.now?.() ?? Date.now();
  const searchComposition = options.searchGroundingComposition === true;

  if (isChatV3KillSwitchActive(readEnv)) {
    return withSearchCompositionBoundaryDiagnostic(
      searchComposition,
      {
        success: false,
        errorCode: "kill_switch",
        message: CHAT_V3_USER_FACING_UNAVAILABLE,
      },
      {
        searchCompositionFallbackReason: "unknown-bounded",
        structuredOutputParseStatus: "absent",
        searchCompositionTextPresent: false,
      }
    );
  }

  const validated = validateChatV3ConversationRequest(options.rawRequest);
  if (validated.ok === false) {
    return withSearchCompositionBoundaryDiagnostic(
      searchComposition,
      {
        success: false,
        errorCode: validated.errorCode,
        message: validated.message,
      },
      {
        searchCompositionFallbackReason: "unknown-bounded",
        structuredOutputParseStatus: "absent",
        searchCompositionTextPresent: false,
      }
    );
  }

  const request: ChatV3ValidatedConversationRequest = validated.value;
  const searchVehicleContext =
    options.searchGroundingVehicleContext ??
    options.authoritativeSelectedVehicleContext ??
    request.vehicleContext ??
    null;
  const searchAppendix = String(options.searchGroundingAppendix ?? "").trim();

  // WP-V3-11 — input safety assessment (does not mutate user message).
  const safetyAssessment = assessChatV3Safety(request.message);
  if (safetyAssessment.shouldShortCircuit && safetyAssessment.safeReply) {
    const content = normalizeChatV3UnsupportedDurableMemoryClaims(
      normalizeChatV3AssistantTypography(safetyAssessment.safeReply, {
        userMessage: request.message,
      })
    );
    return withSearchCompositionBoundaryDiagnostic(
      searchComposition,
      {
        success: true,
        data: {
          sliceId: CHAT_V3_CONVERSATION_SLICE_ID,
          conversationId: request.conversationId,
          messageId: options.createMessageId?.() ?? defaultMessageId(now),
          content,
          expertModeHint: request.expertMode,
          providerId: "chat-v3-safety-layer",
        },
      },
      {
        searchCompositionFallbackReason: "none",
        structuredOutputParseStatus: "not-applicable",
        searchCompositionTextPresent: true,
      }
    );
  }

  const provider =
    options.provider ??
    resolveChatV3ProviderAdapter({
      environment: options.environment,
      readEnv,
      allowFakeProvider: options.allowFakeProvider === true,
    });

  const baseInstruction = buildChatV3SystemInstruction(request.expertMode, {
    message: request.message,
    history: request.history,
    vehicleContext: searchVehicleContext,
    ...(searchAppendix ? { searchGroundingAppendix: searchAppendix } : {}),
  });
  const systemInstruction = appendChatV3SafetyInstructionGuidance(
    baseInstruction,
    safetyAssessment
  );

  let providerResult;
  try {
    providerResult = await provider.generate({
      conversationId: request.conversationId,
      message: request.message,
      history: request.history,
      expertMode: request.expertMode,
      systemInstruction,
      ...(searchComposition
        ? {
            responseMimeType: "application/json" as const,
            responseSchema: SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA,
          }
        : {}),
    });
  } catch {
    return withSearchCompositionBoundaryDiagnostic(
      searchComposition,
      {
        success: false,
        errorCode: "provider_failure",
        message: CHAT_V3_USER_FACING_UNAVAILABLE,
      },
      {
        searchCompositionFallbackReason: "provider-failure",
        structuredOutputParseStatus: "absent",
        searchCompositionTextPresent: false,
      }
    );
  }

  if (!providerResult.ok) {
    return withSearchCompositionBoundaryDiagnostic(
      searchComposition,
      {
        success: false,
        errorCode: mapProviderFailureToErrorCode(providerResult.reason),
        message: CHAT_V3_USER_FACING_UNAVAILABLE,
      },
      {
        searchCompositionFallbackReason: "provider-failure",
        structuredOutputParseStatus: "absent",
        searchCompositionTextPresent: false,
      }
    );
  }

  let providerContent = providerResult.content;
  let searchCompositionMetadata: ChatV3SearchCompositionMetadata | undefined;
  let searchParseStatus: ChatV3SearchCompositionBoundaryDiagnostic["structuredOutputParseStatus"] =
    "not-applicable";
  if (searchComposition) {
    const unwrapped = unwrapSearchGroundingProviderContent(providerResult.content);
    if (unwrapped.kind === "json-leak") {
      return withSearchCompositionBoundaryDiagnostic(
        true,
        {
          success: false,
          errorCode: "unsafe_output",
          message: CHAT_V3_USER_FACING_UNAVAILABLE,
        },
        classifySearchCompositionJsonLeak(providerResult.content)
      );
    }
    if (unwrapped.kind === "structured") {
      const introText = normalizeChatV3AssistantTypography(unwrapped.introText, {
        userMessage: request.message,
      });
      const closingText = normalizeChatV3AssistantTypography(unwrapped.closingText, {
        userMessage: request.message,
      });
      const vehicleAnalyses = unwrapped.vehicleAnalyses.map((item) => ({
        listingId: item.listingId,
        analysisText: normalizeChatV3AssistantTypography(item.analysisText, {
          userMessage: request.message,
        }),
      }));
      providerContent = [introText, ...vehicleAnalyses.map((item) => item.analysisText), closingText]
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join("\n\n");
      searchParseStatus = "structured";
      searchCompositionMetadata = {
        introText,
        vehicleAnalyses,
        closingText,
      };
    } else {
      providerContent = unwrapped.text;
      searchParseStatus = "plain-text";
    }
  }

  const outputSafety = applyChatV3SafetyBoundary(providerContent);
  if (outputSafety.ok === false) {
    const empty = !String(providerContent ?? "").trim();
    // Adaptive Search: empty narrative with valid structured metadata is allowed.
    // Cards remain authoritative; do not invent a Server essay.
    if (searchComposition && searchCompositionMetadata && empty) {
      recordChatV3HighRiskGuardMetadata({
        riskClasses: [],
        remainingRiskClasses: [],
        correctionAttempted: false,
        correctionAccepted: false,
        fallbackUsed: false,
        providerErrorCategory: "none",
      });
      return withSearchCompositionBoundaryDiagnostic(
        true,
        {
          success: true,
          data: {
            sliceId: CHAT_V3_CONVERSATION_SLICE_ID,
            conversationId: request.conversationId,
            messageId: options.createMessageId?.() ?? defaultMessageId(now),
            content: "",
            expertModeHint: request.expertMode,
            providerId: providerResult.providerId,
            searchComposition: searchCompositionMetadata,
          },
        },
        {
          searchCompositionFallbackReason: "none",
          structuredOutputParseStatus: searchParseStatus,
          searchCompositionTextPresent: false,
        }
      );
    }
    return withSearchCompositionBoundaryDiagnostic(
      searchComposition,
      {
        success: false,
        errorCode: outputSafety.errorCode,
        message: outputSafety.message,
      },
      {
        searchCompositionFallbackReason: empty
          ? "missing-success-text"
          : "unsafe-output",
        structuredOutputParseStatus: searchComposition
          ? searchParseStatus
          : "not-applicable",
        searchCompositionTextPresent: false,
      }
    );
  }

  // WP-V3-10D/14A — assistant-only formatting repair (does not touch user message).
  let content = normalizeChatV3AssistantTypography(outputSafety.content, {
    userMessage: request.message,
  });
  let providerId = providerResult.providerId;

  const financeAnalysis = analyzeChatV3AutomotiveTurn({
    message: request.message,
    history: request.history,
    vehicleContext: searchVehicleContext,
  });
  const trustedFinance =
    financeAnalysis.financeBlock.status === "complete"
      ? financeAnalysis.financeBlock.result
      : undefined;

  // WP-V3-14A/14E — one bounded correction slot for finance + high-risk claims.
  const firstHighRisk = validateChatV3HighRiskResponse(content);
  const firstFinance = financeCheckFor(content, trustedFinance);
  const firstRiskClasses = riskClassesOf(firstHighRisk);

  if (firstHighRisk.ok && firstFinance.ok) {
    recordChatV3HighRiskGuardMetadata({
      riskClasses: [],
      remainingRiskClasses: [],
      correctionAttempted: false,
      correctionAccepted: false,
      fallbackUsed: false,
      providerErrorCategory: "none",
    });
  } else if (searchComposition) {
    recordChatV3HighRiskGuardMetadata({
      riskClasses: firstRiskClasses,
      remainingRiskClasses: riskClassesOf(firstHighRisk),
      correctionAttempted: false,
      correctionAccepted: false,
      fallbackUsed: false,
      providerErrorCategory: "none",
    });
  } else {
    const originalUnsafe = content;
    const correctionInstruction = buildUnifiedCorrectionInstruction({
      highRisk: firstHighRisk,
      financeCheck: firstFinance,
      trustedFinance,
    });
    let providerErrorCategory: ChatV3HighRiskProviderErrorCategory = "none";
    let correctionResult;
    try {
      correctionResult = await provider.generate({
        conversationId: request.conversationId,
        message: request.message,
        history: [
          ...request.history,
          { role: "assistant", content: originalUnsafe },
        ],
        expertMode: request.expertMode,
        systemInstruction: correctionInstruction,
      });
    } catch {
      correctionResult = null;
      providerErrorCategory = "throw";
    }

    if (correctionResult && correctionResult.ok === false) {
      providerErrorCategory = "provider_failure";
    }

    const correctionSafety =
      correctionResult?.ok === true
        ? applyChatV3SafetyBoundary(correctionResult.content)
        : null;
    if (correctionResult?.ok === true && correctionSafety?.ok === false) {
      providerErrorCategory = "unsafe_output";
    }
    const corrected =
      correctionSafety?.ok === true
        ? normalizeChatV3AssistantTypography(correctionSafety.content, {
            userMessage: request.message,
          })
        : "";
    const secondHighRisk =
      corrected.length > 0
        ? validateChatV3HighRiskResponse(corrected)
        : firstHighRisk;
    const secondFinance =
      corrected.length > 0
        ? financeCheckFor(corrected, trustedFinance)
        : firstFinance;
    const remainingRiskClasses = riskClassesOf(secondHighRisk);

    if (
      secondHighRisk.ok &&
      secondFinance.ok &&
      correctionResult?.ok === true &&
      corrected.length > 0
    ) {
      content = corrected;
      providerId = correctionResult.providerId;
      recordChatV3HighRiskGuardMetadata({
        riskClasses: firstRiskClasses,
        remainingRiskClasses: [],
        correctionAttempted: true,
        correctionAccepted: true,
        fallbackUsed: false,
        providerErrorCategory: "none",
      });
    } else if (remainingRiskClasses.length > 0) {
      content = resolveChatV3HighRiskFallback(remainingRiskClasses);
      providerId = CHAT_V3_HIGH_RISK_FALLBACK_PROVIDER_ID;
      recordChatV3HighRiskGuardMetadata({
        riskClasses: firstRiskClasses,
        remainingRiskClasses,
        correctionAttempted: true,
        correctionAccepted: false,
        fallbackUsed: true,
        providerErrorCategory,
      });
    } else {
      content = CHAT_V3_FINANCE_RECALC_NOTICE;
      providerId = CHAT_V3_FINANCE_CONSISTENCY_PROVIDER_ID;
      recordChatV3HighRiskGuardMetadata({
        riskClasses: firstRiskClasses,
        remainingRiskClasses: [],
        correctionAttempted: true,
        correctionAccepted: false,
        fallbackUsed: true,
        providerErrorCategory,
      });
    }
  }

  return withSearchCompositionBoundaryDiagnostic(
    searchComposition,
    {
      success: true,
      data: {
        sliceId: CHAT_V3_CONVERSATION_SLICE_ID,
        conversationId: request.conversationId,
        messageId:
          options.createMessageId?.() ?? defaultMessageId(now),
        content: normalizeChatV3UnsupportedDurableMemoryClaims(content),
        expertModeHint: request.expertMode,
        providerId,
        ...(searchCompositionMetadata
          ? { searchComposition: searchCompositionMetadata }
          : {}),
      },
    },
    {
      searchCompositionFallbackReason: "none",
      structuredOutputParseStatus: searchParseStatus,
      searchCompositionTextPresent: true,
    }
  );
}

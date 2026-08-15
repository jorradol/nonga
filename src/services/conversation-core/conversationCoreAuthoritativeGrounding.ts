/**
 * WP-V2U-03E2C2A / R1 — Authoritative grounding (allow-by-construction).
 */
import {
  validateToolResult,
  type ToolResult,
} from "./toolEnvelope";
import {
  conversationCoreTextHasNumericRange,
  conversationCoreTextHasScaledAmountUnit,
  extractConversationCoreMoneyAmounts,
  findConversationCoreListingIdSpans,
  normalizeConversationCoreDigits,
  parseConversationCoreIntegerToken,
} from "./conversationCoreNumericNormalization";

export const CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT =
  "ขออภัยครับ ระบบไม่สามารถยืนยันข้อมูลจากผลลัพธ์ล่าสุดได้ในขณะนี้";

export const CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_REASON_CODES = [
  "unsupported_tool",
  "invalid_tool_result",
  "tool_result_not_ok",
  "unknown_listing_id",
  "listing_count_mismatch",
  "unsupported_vehicle_detail_claim",
  "user_assumption_role_mismatch",
  "ambiguous_numeric_format",
  "scaled_amount",
  "numeric_range",
  "malformed_numeric_token",
  "unaccounted_numeric_claim",
  "selection_listing_mismatch",
  "selection_status_mismatch",
  "unsupported_prose_shape",
  "unverifiable_vehicle_claim",
  "noncanonical_grounded_answer",
] as const;

export type ConversationCoreAuthoritativeGroundingReasonCode =
  (typeof CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_REASON_CODES)[number];

export function isConversationCoreAuthoritativeGroundingReasonCode(
  value: unknown
): value is ConversationCoreAuthoritativeGroundingReasonCode {
  return (
    typeof value === "string" &&
    (CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_REASON_CODES as readonly string[]).includes(value)
  );
}

export interface ConversationCoreUserMoneyAssumption {
  readonly kind: "user-reported-money-baht";
  readonly amount: number;
}

export interface ConversationCoreUserTextAssumption {
  readonly kind: "user-reported-search-context";
  readonly text: string;
}

export type ConversationCoreUserAssumption =
  | ConversationCoreUserMoneyAssumption
  | ConversationCoreUserTextAssumption;

export interface ConversationCoreAuthoritativeGroundingInput {
  readonly assistantText: string;
  readonly toolResult: unknown;
  readonly userAssumptions?: readonly ConversationCoreUserAssumption[];
}

export type ConversationCoreAuthoritativeGroundingResult =
  | { readonly ok: true; readonly assistantText: string }
  | {
      readonly ok: false;
      readonly code: ConversationCoreAuthoritativeGroundingReasonCode;
      readonly fallbackText: string;
    };

type RejectResult = Extract<ConversationCoreAuthoritativeGroundingResult, { ok: false }>;

interface ParsedListingAnswer {
  readonly kind: "listing";
  readonly budgetAmount?: number;
  readonly budgetApproximate?: boolean;
  readonly searchContextAttribution?: boolean;
  readonly emptyResult: boolean;
  readonly count?: number;
  readonly countApproximate?: boolean;
  readonly listingIds: readonly string[];
}

interface ParsedSelectionAnswer {
  readonly kind: "selection";
  readonly listingId: string;
  readonly resolved: boolean;
}

function reject(
  code: ConversationCoreAuthoritativeGroundingReasonCode
): RejectResult {
  return {
    ok: false,
    code,
    fallbackText: CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT,
  };
}

function collapseWhitespace(text: string): string {
  return normalizeConversationCoreDigits(text).replace(/\s+/g, " ").trim();
}

function formatBahtAmount(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

function formatListingIdList(listingIds: readonly string[]): string {
  if (listingIds.length === 0) {
    return "";
  }
  if (listingIds.length === 1) {
    return listingIds[0]!;
  }
  const head = listingIds.slice(0, -1).join(", ");
  return `${head} และ ${listingIds[listingIds.length - 1]!}`;
}

export function buildConversationCoreAuthoritativeGroundedAnswer(
  toolResult: ToolResult,
  userAssumptions: readonly ConversationCoreUserAssumption[] = []
): string {
  const validated = validateToolResult(toolResult);
  if (validated.ok === false || validated.value.status !== "ok") {
    return CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT;
  }

  const okResult = validated.value;
  const moneyAssumption = userAssumptions.find(
    (assumption): assumption is ConversationCoreUserMoneyAssumption =>
      assumption.kind === "user-reported-money-baht"
  );
  const hasSearchContext = userAssumptions.some(
    (assumption) => assumption.kind === "user-reported-search-context"
  );

  if (okResult.toolName === "vehicle.resolveSelection") {
    const listingId = okResult.data.listingId;
    if (okResult.data.resolved) {
      return `เลือกรายการ ${listingId} แล้ว`;
    }
    return `ยังไม่สามารถยืนยันการเลือกรายการ ${listingId} ได้`;
  }

  if (
    okResult.toolName === "marketplace.search" ||
    okResult.toolName === "inventory.fetch"
  ) {
    const listingIds = orderedListingIdsFromToolResult(okResult);
    const prefixParts: string[] = [];
    if (moneyAssumption) {
      prefixParts.push(
        `ตามงบ ${formatBahtAmount(moneyAssumption.amount)} บาทที่คุณแจ้ง`
      );
    } else if (hasSearchContext) {
      prefixParts.push("ตามเงื่อนไขที่คุณแจ้ง");
    }
    const prefix = prefixParts.length > 0 ? `${prefixParts.join(" ")} ` : "";

    if (listingIds.length === 0) {
      return `${prefix}ไม่พบรายการจากการค้นหานี้`.trim();
    }

    const idList = formatListingIdList(listingIds);
    return `${prefix}พบผลลัพธ์ ${listingIds.length} รายการ: ${idList}`.trim();
  }

  return CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT;
}

const FORBIDDEN_VEHICLE_DETAIL_PATTERNS: readonly RegExp[] = [
  /(?:ปี|รุ่นปี|ค\.ศ\.|พ\.ศ\.)\s*[\d,๐-๙]{4}/u,
  /(?:ไมล์|เลขไมล์|กม\.|km)\s*[\d,๐-๙]/iu,
  /(?:ราคา|ค่างวด|ดาวน์|เงินดาวน์|ผ่อน|ยอดจัด|ยอดผ่อน)/u,
  /(?:สี|เบนซิน|ดีเซล|เชื้อเพลิง|เกียร์|ออโต้|manual|cvt|hybrid|ev|phev|plug[\s-]?in)/iu,
  /(?:ดีลเลอร์|dealer|โชว์รูม|ศูนย์บริการ|promotion|โปรโมชั่น|ประกัน|warranty|รับประกัน)/iu,
  /(?:ไม่เคยชน|ไม่ชน|ชน|อุบัติเหตุ|น้ำท่วม|ไม่ท่วม|เจ้าของ|มือเดียว|มือสอง|สภาพ|เครื่องดี|ขับนุ่ม|ประหยัด|พร้อมใช้|สวย|ดูแลดี|น่าสนใจ|น่าเชื่อถือ|คันนี้|คันนั้น|ทุกคัน)/u,
];

function hasForbiddenVehicleDetailClaim(text: string): boolean {
  const normalized = collapseWhitespace(text);
  return FORBIDDEN_VEHICLE_DETAIL_PATTERNS.some((pattern) => pattern.test(normalized));
}

function parseIntegerToken(
  raw: string,
  allowApproximatePrefix = false
): { ok: true; value: number; approximate: boolean } | { ok: false } {
  const parsed = parseConversationCoreIntegerToken(raw, {
    allowApproximatePrefix,
  });
  if (parsed.ok === false) {
    return { ok: false };
  }
  return {
    ok: true,
    value: parsed.value.value,
    approximate: parsed.value.approximate,
  };
}

function parseListingIdsFromSuffix(
  suffix: string,
  authoritativeIds: readonly string[]
): readonly string[] | null {
  const trimmed = suffix.replace(/\s+และ\s+/gu, ", ").trim();
  if (!trimmed) {
    return [];
  }

  const authoritativeSet = new Set(authoritativeIds);
  const commaParts = trimmed
    .split(",")
    .map((part) => part.trim().replace(/^และ\s+/u, "").trim())
    .filter(Boolean);
  if (commaParts.length > 1) {
    const ids: string[] = [];
    for (const token of commaParts) {
      if (!authoritativeSet.has(token)) {
        return null;
      }
      ids.push(token);
    }
    return ids;
  }

  const tokens = trimmed.split(/\s+/u).filter(Boolean);
  const ids: string[] = [];
  for (const token of tokens) {
    const cleaned = token.replace(/^และ$/u, "");
    if (!cleaned) {
      continue;
    }
    const idToken = cleaned.replace(/^และ/u, "").trim();
    if (!idToken) {
      continue;
    }
    if (!authoritativeSet.has(idToken)) {
      return null;
    }
    ids.push(idToken);
  }
  return ids;
}

function parseListingAnswer(
  text: string,
  authoritativeIds: readonly string[]
): ParsedListingAnswer | null {
  let remaining = collapseWhitespace(text);
  let budgetAmount: number | undefined;
  let budgetApproximate = false;
  let searchContextAttribution = false;

  const budgetMatch = remaining.match(
    /^ตามงบ\s*(?:ประมาณ\s+)?([\d,๐-๙]+)\s*บาทที่คุณแจ้ง\s+(.+)$/u
  );
  if (budgetMatch) {
    const parsedBudget = parseIntegerToken(budgetMatch[1] ?? "");
    if (parsedBudget.ok === false) {
      return null;
    }
    budgetAmount = parsedBudget.value;
    budgetApproximate = budgetApproximate || parsedBudget.approximate;
    remaining = budgetMatch[2] ?? "";
  }

  const searchContextMatch = remaining.match(
    /^(ตามเงื่อนไขที่คุณแจ้ง|จากเงื่อนไขการค้นหาของคุณ)\s+(.+)$/u
  );
  if (searchContextMatch) {
    searchContextAttribution = true;
    remaining = searchContextMatch[2] ?? "";
  }

  if (remaining === "ไม่พบรายการจากการค้นหานี้") {
    return {
      kind: "listing",
      budgetAmount,
      budgetApproximate,
      searchContextAttribution,
      emptyResult: true,
      listingIds: [],
    };
  }

  const colonMatch = remaining.match(
    /^(?:พบผลลัพธ์|พบ|มี)\s*(?:ประมาณ\s+)?([\d,๐-๙]+)\s*(?:คัน|รายการ)\s*:\s*(.+)$/u
  );
  if (colonMatch) {
    const parsedCount = parseIntegerToken(colonMatch[1] ?? "", true);
    if (parsedCount.ok === false) {
      return null;
    }
    const listingIds = parseListingIdsFromSuffix(colonMatch[2] ?? "", authoritativeIds);
    if (listingIds === null) {
      return null;
    }
    return {
      kind: "listing",
      budgetAmount,
      budgetApproximate,
      searchContextAttribution,
      emptyResult: false,
      count: parsedCount.value,
      countApproximate: parsedCount.approximate,
      listingIds,
    };
  }

  const spaceMatch = remaining.match(
    /^(?:พบผลลัพธ์|พบ|มี)\s*(?:ประมาณ\s+)?([\d,๐-๙]+)\s*(?:คัน|รายการ)\s+(.+)$/u
  );
  if (spaceMatch) {
    const parsedCount = parseIntegerToken(spaceMatch[1] ?? "", true);
    if (parsedCount.ok === false) {
      return null;
    }
    const listingIds = parseListingIdsFromSuffix(spaceMatch[2] ?? "", authoritativeIds);
    if (listingIds === null) {
      return null;
    }
    return {
      kind: "listing",
      budgetAmount,
      budgetApproximate,
      searchContextAttribution,
      emptyResult: false,
      count: parsedCount.value,
      countApproximate: parsedCount.approximate,
      listingIds,
    };
  }

  const countOnlyMatch = remaining.match(
    /^(?:พบผลลัพธ์|พบ|มี)\s*(?:ประมาณ\s+)?([\d,๐-๙]+)\s*(?:คัน|รายการ)$/u
  );
  if (countOnlyMatch) {
    const parsedCount = parseIntegerToken(countOnlyMatch[1] ?? "", true);
    if (parsedCount.ok === false) {
      return null;
    }
    return {
      kind: "listing",
      budgetAmount,
      budgetApproximate,
      searchContextAttribution,
      emptyResult: false,
      count: parsedCount.value,
      countApproximate: parsedCount.approximate,
      listingIds: [],
    };
  }

  return null;
}

function parseSelectionAnswer(text: string): ParsedSelectionAnswer | null {
  const normalized = collapseWhitespace(text);

  const resolvedCanonical = normalized.match(/^เลือกรายการ\s+(\S+)\s+แล้ว$/u);
  if (resolvedCanonical) {
    return {
      kind: "selection",
      listingId: resolvedCanonical[1]!,
      resolved: true,
    };
  }

  const resolvedAlt = normalized.match(/^เลือก\s+(\S+)\s+สำเร็จ(?:ครับ)?$/u);
  if (resolvedAlt) {
    return {
      kind: "selection",
      listingId: resolvedAlt[1]!,
      resolved: true,
    };
  }

  const unresolvedCanonical = normalized.match(
    /^ยังไม่สามารถยืนยันการเลือกรายการ\s+(\S+)\s+ได้$/u
  );
  if (unresolvedCanonical) {
    return {
      kind: "selection",
      listingId: unresolvedCanonical[1]!,
      resolved: false,
    };
  }

  const unresolvedAlt = normalized.match(/^ยังเลือก\s+(\S+)\s+ไม่สำเร็จ(?:ครับ)?$/u);
  if (unresolvedAlt) {
    return {
      kind: "selection",
      listingId: unresolvedAlt[1]!,
      resolved: false,
    };
  }

  return null;
}

function orderedListingIdsFromToolResult(result: ToolResult): readonly string[] {
  if (result.status !== "ok" || !result.data) {
    return [];
  }
  if ("listingIds" in result.data) {
    return [...result.data.listingIds];
  }
  if ("listingId" in result.data) {
    return [result.data.listingId];
  }
  return [];
}

function detectUnknownListingIdClaim(
  text: string,
  authoritativeIds: readonly string[]
): boolean {
  const authoritativeSet = new Set(authoritativeIds);
  const tokenPattern = /[A-Za-z0-9][A-Za-z0-9_-]*/gu;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(text)) !== null) {
    const token = match[0];
    if (authoritativeSet.has(token)) {
      continue;
    }
    if (token.includes("listing") || token.includes("-")) {
      for (const authoritativeId of authoritativeIds) {
        if (token.startsWith(authoritativeId) && token !== authoritativeId) {
          return true;
        }
      }
      if (/^listing[\w-]+$/u.test(token)) {
        return true;
      }
    }
  }
  return false;
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function getUserMoneyAssumption(
  assumptions: readonly ConversationCoreUserAssumption[] | undefined
): ConversationCoreUserMoneyAssumption | undefined {
  return assumptions?.find(
    (assumption): assumption is ConversationCoreUserMoneyAssumption =>
      assumption.kind === "user-reported-money-baht"
  );
}

function validateNumericPolicy(text: string): RejectResult | null {
  if (conversationCoreTextHasScaledAmountUnit(text)) {
    return reject("scaled_amount");
  }
  if (conversationCoreTextHasNumericRange(text)) {
    return reject("numeric_range");
  }

  const money = extractConversationCoreMoneyAmounts(text);
  if (money.ok === false) {
    if (money.code === "scaled_amount") {
      return reject("scaled_amount");
    }
    if (money.code === "numeric_range") {
      return reject("numeric_range");
    }
    if (money.code === "malformed_comma") {
      return reject("malformed_numeric_token");
    }
    return reject("ambiguous_numeric_format");
  }

  return null;
}

function validateUserMoneyClaims(
  text: string,
  userAssumptions: readonly ConversationCoreUserAssumption[] | undefined,
  parsedBudgetAmount?: number
): RejectResult | null {
  const money = extractConversationCoreMoneyAmounts(text);
  if (money.ok === false) {
    return null;
  }

  const userMoney = getUserMoneyAssumption(userAssumptions);
  const attributedPattern =
    /(?:ตามงบ\s*(?:ประมาณ\s+)?[\d,๐-๙]+\s*บาทที่คุณแจ้ง)/u;
  const hasAttributedBudget = attributedPattern.test(collapseWhitespace(text));

  for (const amount of money.value) {
    if (userMoney && hasAttributedBudget && amount.value === userMoney.amount) {
      if (parsedBudgetAmount !== undefined && parsedBudgetAmount !== userMoney.amount) {
        return reject("user_assumption_role_mismatch");
      }
      continue;
    }
    return reject("user_assumption_role_mismatch");
  }

  return null;
}

function validateListingGrounding(
  text: string,
  authoritativeIds: readonly string[],
  userAssumptions: readonly ConversationCoreUserAssumption[] | undefined
): ConversationCoreAuthoritativeGroundingResult {
  const normalized = collapseWhitespace(text);

  const numericPolicy = validateNumericPolicy(text);
  if (numericPolicy) {
    return numericPolicy;
  }

  if (hasForbiddenVehicleDetailClaim(normalized)) {
    return reject("unverifiable_vehicle_claim");
  }

  if (detectUnknownListingIdClaim(normalized, authoritativeIds)) {
    return reject("unknown_listing_id");
  }

  const parsed = parseListingAnswer(normalized, authoritativeIds);
  if (!parsed) {
    return reject("unsupported_prose_shape");
  }

  const moneyCheck = validateUserMoneyClaims(text, userAssumptions, parsed.budgetAmount);
  if (moneyCheck) {
    return moneyCheck;
  }

  const userMoney = getUserMoneyAssumption(userAssumptions);
  if (parsed.budgetAmount !== undefined) {
    if (!userMoney || parsed.budgetAmount !== userMoney.amount) {
      return reject("user_assumption_role_mismatch");
    }
  } else if (userMoney) {
    return reject("user_assumption_role_mismatch");
  }

  if (parsed.emptyResult) {
    if (authoritativeIds.length > 0) {
      return reject("listing_count_mismatch");
    }
    const canonical = buildConversationCoreAuthoritativeGroundedAnswer(
      {
        requestId: "builder",
        conversationId: "builder",
        toolName: "marketplace.search",
        status: "ok",
        provenance: "marketplace-search",
        data: { listingIds: [], query: "" },
      },
      userAssumptions
    );
    if (normalized !== collapseWhitespace(canonical)) {
      return reject("noncanonical_grounded_answer");
    }
    return { ok: true, assistantText: normalized };
  }

  if (parsed.count !== undefined && parsed.count !== authoritativeIds.length) {
    return reject("listing_count_mismatch");
  }

  if (parsed.listingIds.length > 0) {
    if (!arraysEqual(parsed.listingIds, authoritativeIds)) {
      if (parsed.listingIds.some((id) => !authoritativeIds.includes(id))) {
        return reject("unknown_listing_id");
      }
      return reject("noncanonical_grounded_answer");
    }
  }

  const authoritativeSet = new Set(authoritativeIds);
  const spans = findConversationCoreListingIdSpans(normalized, authoritativeSet);
  for (const span of spans) {
    if (!authoritativeSet.has(span.listingId)) {
      return reject("unknown_listing_id");
    }
  }

  const mentionedIds = [...new Set(spans.map((span) => span.listingId))];
  if (mentionedIds.length > 0 && !arraysEqual(mentionedIds, [...authoritativeIds])) {
    return reject("noncanonical_grounded_answer");
  }

  return { ok: true, assistantText: normalized };
}

function validateSelectionGrounding(
  text: string,
  authoritativeListingId: string,
  authoritativeResolved: boolean
): ConversationCoreAuthoritativeGroundingResult {
  const normalized = collapseWhitespace(text);

  const numericPolicy = validateNumericPolicy(text);
  if (numericPolicy) {
    return numericPolicy;
  }

  if (hasForbiddenVehicleDetailClaim(normalized)) {
    return reject("unverifiable_vehicle_claim");
  }

  const parsed = parseSelectionAnswer(normalized);
  if (!parsed) {
    return reject("unsupported_prose_shape");
  }

  if (parsed.listingId !== authoritativeListingId) {
    return reject("selection_listing_mismatch");
  }
  if (parsed.resolved !== authoritativeResolved) {
    return reject("selection_status_mismatch");
  }

  return { ok: true, assistantText: normalized };
}

export function validateConversationCoreAuthoritativeGrounding(
  input: ConversationCoreAuthoritativeGroundingInput
): ConversationCoreAuthoritativeGroundingResult {
  const assistantText = String(input.assistantText ?? "").trim();
  if (!assistantText) {
    return reject("unsupported_prose_shape");
  }

  const validated = validateToolResult(input.toolResult);
  if (validated.ok === false) {
    return reject("invalid_tool_result");
  }

  const toolResult = validated.value;
  if (toolResult.status !== "ok") {
    return reject("tool_result_not_ok");
  }

  if (toolResult.toolName === "finance.calculate") {
    return reject("unsupported_tool");
  }

  if (toolResult.toolName === "vehicle.resolveSelection") {
    return validateSelectionGrounding(
      assistantText,
      toolResult.data.listingId,
      toolResult.data.resolved
    );
  }

  if (
    toolResult.toolName === "marketplace.search" ||
    toolResult.toolName === "inventory.fetch"
  ) {
    const listingIds = orderedListingIdsFromToolResult(toolResult);
    return validateListingGrounding(
      assistantText,
      listingIds,
      input.userAssumptions
    );
  }

  return reject("unsupported_tool");
}

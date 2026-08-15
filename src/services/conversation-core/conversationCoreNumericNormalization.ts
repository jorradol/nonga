/**
 * WP-V2U-03E2C2A — Pure numeric and listing-token normalization for authoritative grounding.
 */
export const CONVERSATION_CORE_NUMERIC_NORMALIZATION_ERROR_CODES = [
  "scaled_amount",
  "numeric_range",
  "malformed_comma",
  "ambiguous_token",
  "unsupported_format",
  "negative_value",
  "empty_token",
] as const;

export type ConversationCoreNumericNormalizationErrorCode =
  (typeof CONVERSATION_CORE_NUMERIC_NORMALIZATION_ERROR_CODES)[number];

export type ConversationCoreNumericNormalizationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: ConversationCoreNumericNormalizationErrorCode };

export interface ConversationCoreNormalizedIntegerToken {
  readonly value: number;
  readonly approximate: boolean;
}

const THAI_DIGIT_MAP: Record<string, string> = {
  "๐": "0",
  "๑": "1",
  "๒": "2",
  "๓": "3",
  "๔": "4",
  "๕": "5",
  "๖": "6",
  "๗": "7",
  "๘": "8",
  "๙": "9",
};

const SCALED_AMOUNT_PATTERN =
  /(?:^|[^\p{L}\p{N}])(?:\d[\d,.๐-๙]*\s*)?(?:พัน|หมื่น|แสน|ล้าน)(?:[^\p{L}\p{N}]|$)/u;

const NUMERIC_RANGE_PATTERN =
  /\d[\d,.๐-๙]*\s*(?:-|–|—)\s*\d[\d,.๐-๙]*|\d[\d,.๐-๙]*\s+ถึง\s+\d[\d,.๐-๙]*/u;

const APPROXIMATE_PREFIX_PATTERN = /(?:^|[^\p{L}\p{N}])ประมาณ\s*/u;

const INTEGER_TOKEN_PATTERN = /^[\d,๐-๙]+$/u;

const MONEY_AMOUNT_PATTERN =
  /(?:ประมาณ\s*)?([\d,๐-๙]+)\s*(?:บาท|฿)/giu;

const COUNT_CLAIM_PATTERN =
  /(?:พบ|มี|จำนวน|ทั้งหมด|รวม)\s*(?:ประมาณ\s*)?([\d,๐-๙]+)\s*(?:คัน|รายการ|listing)?/giu;

const BARE_COUNT_UNIT_PATTERN =
  /(?:^|[^\p{L}\p{N}])(?:ประมาณ\s*)?([\d,๐-๙]+)\s*(?:คัน|รายการ)(?:[^\p{L}\p{N}]|$)/giu;

export function normalizeConversationCoreDigits(input: string): string {
  return String(input ?? "").replace(/[๐-๙]/g, (digit) => THAI_DIGIT_MAP[digit] ?? digit);
}

export function conversationCoreTextHasScaledAmountUnit(text: string): boolean {
  return SCALED_AMOUNT_PATTERN.test(normalizeConversationCoreDigits(text));
}

export function conversationCoreTextHasNumericRange(text: string): boolean {
  return NUMERIC_RANGE_PATTERN.test(normalizeConversationCoreDigits(text));
}

function isValidCommaGroupedInteger(digits: string): boolean {
  if (!/^\d+(?:,\d{3})*$/.test(digits)) {
    return false;
  }
  const parts = digits.split(",");
  for (let index = 1; index < parts.length; index += 1) {
    if (parts[index]!.length !== 3) {
      return false;
    }
  }
  return true;
}

export function parseConversationCoreIntegerToken(
  raw: string,
  options: { readonly allowApproximatePrefix?: boolean } = {}
): ConversationCoreNumericNormalizationResult<ConversationCoreNormalizedIntegerToken> {
  let source = String(raw ?? "").trim();
  if (!source) {
    return { ok: false, code: "empty_token" };
  }

  let approximate = false;
  if (options.allowApproximatePrefix) {
    const normalized = normalizeConversationCoreDigits(source);
    const match = normalized.match(APPROXIMATE_PREFIX_PATTERN);
    if (match) {
      approximate = true;
      source = normalized.slice(match.index! + match[0].length).trim();
    }
  }

  const digits = normalizeConversationCoreDigits(source);
  if (!INTEGER_TOKEN_PATTERN.test(digits)) {
    return { ok: false, code: "unsupported_format" };
  }
  if (!isValidCommaGroupedInteger(digits)) {
    return { ok: false, code: "malformed_comma" };
  }

  const value = Number(digits.replace(/,/g, ""));
  if (!Number.isSafeInteger(value)) {
    return { ok: false, code: "ambiguous_token" };
  }
  if (value < 0) {
    return { ok: false, code: "negative_value" };
  }

  return { ok: true, value: { value, approximate } };
}

export interface ConversationCoreListingIdSpan {
  readonly listingId: string;
  readonly start: number;
  readonly end: number;
}

export function findConversationCoreListingIdSpans(
  text: string,
  authoritativeListingIds: ReadonlySet<string>
): ConversationCoreListingIdSpan[] {
  const spans: ConversationCoreListingIdSpan[] = [];
  for (const listingId of authoritativeListingIds) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const index = text.indexOf(listingId, searchFrom);
      if (index < 0) {
        break;
      }
      const before = index > 0 ? text[index - 1] : "";
      const after = index + listingId.length < text.length ? text[index + listingId.length] : "";
      const boundaryBefore = before === "" || /[^\p{L}\p{N}_-]/u.test(before);
      const boundaryAfter = after === "" || /[^\p{L}\p{N}_-]/u.test(after);
      if (boundaryBefore && boundaryAfter) {
        spans.push({
          listingId,
          start: index,
          end: index + listingId.length,
        });
      }
      searchFrom = index + listingId.length;
    }
  }
  return spans.sort((left, right) => left.start - right.start);
}

function spansOverlap(
  left: { readonly start: number; readonly end: number },
  right: { readonly start: number; readonly end: number }
): boolean {
  return left.start < right.end && right.start < left.end;
}

export function maskConversationCoreListingIdSpans(
  text: string,
  spans: readonly ConversationCoreListingIdSpan[]
): string {
  if (spans.length === 0) {
    return text;
  }
  let masked = "";
  let cursor = 0;
  for (const span of spans) {
    masked += text.slice(cursor, span.start);
    masked += " ".repeat(span.end - span.start);
    cursor = span.end;
  }
  masked += text.slice(cursor);
  return masked;
}

export interface ConversationCoreParsedMoneyAmount {
  readonly value: number;
  readonly approximate: boolean;
  readonly start: number;
  readonly end: number;
}

export function extractConversationCoreMoneyAmounts(
  text: string
): ConversationCoreNumericNormalizationResult<readonly ConversationCoreParsedMoneyAmount[]> {
  if (conversationCoreTextHasScaledAmountUnit(text)) {
    return { ok: false, code: "scaled_amount" };
  }
  if (conversationCoreTextHasNumericRange(text)) {
    return { ok: false, code: "numeric_range" };
  }

  const amounts: ConversationCoreParsedMoneyAmount[] = [];
  const normalized = normalizeConversationCoreDigits(text);
  let match: RegExpExecArray | null;
  MONEY_AMOUNT_PATTERN.lastIndex = 0;
  while ((match = MONEY_AMOUNT_PATTERN.exec(normalized)) !== null) {
    const token = match[1] ?? "";
    const approximate = /ประมาณ\s*$/.test(normalized.slice(Math.max(0, match.index - 8), match.index));
    const parsed = parseConversationCoreIntegerToken(token);
    if (parsed.ok === false) {
      return { ok: false, code: parsed.code };
    }
    amounts.push({
      value: parsed.value.value,
      approximate: approximate || parsed.value.approximate,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return { ok: true, value: Object.freeze(amounts) };
}

export interface ConversationCoreParsedCountClaim {
  readonly value: number;
  readonly approximate: boolean;
  readonly start: number;
  readonly end: number;
}

export function extractConversationCoreCountClaims(
  text: string
): ConversationCoreNumericNormalizationResult<readonly ConversationCoreParsedCountClaim[]> {
  if (conversationCoreTextHasScaledAmountUnit(text)) {
    return { ok: false, code: "scaled_amount" };
  }
  if (conversationCoreTextHasNumericRange(text)) {
    return { ok: false, code: "numeric_range" };
  }

  const claims: ConversationCoreParsedCountClaim[] = [];
  const normalized = normalizeConversationCoreDigits(text);
  const patterns = [COUNT_CLAIM_PATTERN, BARE_COUNT_UNIT_PATTERN];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalized)) !== null) {
      const token = match[1] ?? "";
      const prefix = normalized.slice(Math.max(0, match.index - 8), match.index);
      const approximate = /ประมาณ\s*$/.test(prefix);
      const parsed = parseConversationCoreIntegerToken(token);
      if (parsed.ok === false) {
        return { ok: false, code: parsed.code };
      }
      const claim = {
        value: parsed.value.value,
        approximate: approximate || parsed.value.approximate,
        start: match.index,
        end: match.index + match[0].length,
      };
      if (!claims.some((existing) => spansOverlap(existing, claim))) {
        claims.push(claim);
      }
    }
  }
  return { ok: true, value: Object.freeze(claims) };
}

export interface ConversationCoreUnmaskedNumericToken {
  readonly raw: string;
  readonly value: number;
  readonly approximate: boolean;
  readonly start: number;
  readonly end: number;
}

export function extractConversationCoreUnmaskedNumericTokens(
  text: string,
  maskedText: string
): ConversationCoreNumericNormalizationResult<readonly ConversationCoreUnmaskedNumericToken[]> {
  if (conversationCoreTextHasScaledAmountUnit(text)) {
    return { ok: false, code: "scaled_amount" };
  }
  if (conversationCoreTextHasNumericRange(text)) {
    return { ok: false, code: "numeric_range" };
  }

  const tokens: ConversationCoreUnmaskedNumericToken[] = [];
  const pattern = /(?:ประมาณ\s*)?([\d,๐-๙]+)/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(maskedText)) !== null) {
    if (/^\s*$/.test(maskedText.slice(match.index, match.index + match[0].length))) {
      continue;
    }
    const digitSource = match[1] ?? "";
    if (!/[\d๐-๙]/.test(digitSource)) {
      continue;
    }
    const approximate = /^ประมาณ\s*/u.test(match[0]);
    const parsed = parseConversationCoreIntegerToken(digitSource);
    if (parsed.ok === false) {
      return { ok: false, code: parsed.code };
    }
    tokens.push({
      raw: match[0],
      value: parsed.value.value,
      approximate: approximate || parsed.value.approximate,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return { ok: true, value: Object.freeze(tokens) };
}

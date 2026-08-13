/**
 * WP-V3-10D/14/14A — Chat V.3 assistant typography as a formatting repair layer.
 * Converts a small allowlist of raw LaTeX-like commands to readable Unicode.
 * Repairs replacement characters and known broken escapes.
 * Does not censor foreign-language content, user-intended CJK/Kana, or technical Latin terms.
 * Preserves fenced code blocks, inline code, and normal Markdown.
 */

/** Longest-first so \\rightarrow wins over shorter prefixes. */
const LATEX_COMMAND_MAP: ReadonlyArray<readonly [command: string, glyph: string]> = [
  ["\\rightarrow", "→"],
  ["\\leftarrow", "←"],
  ["\\approx", "≈"],
  ["\\times", "×"],
  ["\\div", "÷"],
  ["\\ge", "≥"],
  ["\\le", "≤"],
  ["\\%", "%"],
];

/** Banned cheer / hype tokens (WP-V3-14). */
const BANNED_CHEER_RE = /ปังปุริเย่[!！]?/g;

const REPLACEMENT_CHAR = "\uFFFD";

/**
 * CJK Unified Ideographs + Hiragana + Katakana — used only for context-aware
 * leakage *detection*. Never used as a blanket deletion range.
 */
const CJK_OR_KANA_RE =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

type TextSegment = { kind: "plain" | "code"; text: string };

export interface ChatV3TypographyNormalizeOptions {
  /** Latest user message — used only to decide whether foreign script is intentional. */
  userMessage?: string;
}

function isThaiOrLatinLetter(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z\u0E00-\u0E7F]/.test(ch);
}

function containsCjkOrKana(text: string): boolean {
  CJK_OR_KANA_RE.lastIndex = 0;
  return CJK_OR_KANA_RE.test(text);
}

/**
 * Context-aware detector. Returns true only when foreign script is *proven*
 * leakage. Intentional user/vehicle CJK, quoted names, and unproven cases
 * must return false — the normalizer then keeps the characters.
 */
export function isProvenForeignScriptLeakage(input: {
  assistantContent: string;
  userMessage?: string;
}): boolean {
  const content = String(input.assistantContent ?? "");
  const userMessage = String(input.userMessage ?? "");
  if (!containsCjkOrKana(content)) return false;
  if (containsCjkOrKana(userMessage)) return false;
  if (/[「『“"'][^」』"']*[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(content)) {
    return false;
  }
  const letters = content.replace(/[^A-Za-z\u0E00-\u0E7F\u3040-\u9fff]/g, "");
  if (!letters) return false;
  const cjkChars = letters.replace(/[A-Za-z\u0E00-\u0E7F]/g, "");
  if (cjkChars.length / letters.length >= 0.15) return false;
  // Isolated CJK in Thai/English is still not proven leakage (model names, quotes, citations).
  return false;
}

/**
 * Split so fenced ```...``` and inline `...` segments are left untouched.
 * Incomplete/unclosed fences fall through as plain text (safe no-op for most chat).
 */
function splitPreservingCodeSegments(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /```[\s\S]*?```|`[^`\n]+`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "plain", text: input.slice(lastIndex, match.index) });
    }
    segments.push({ kind: "code", text: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ kind: "plain", text: input.slice(lastIndex) });
  }
  return segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace every needle with glyph, inserting a space when Thai/Latin letters
 * would otherwise concatenate across the replacement.
 */
function replaceAllWithSeparation(
  text: string,
  needle: string,
  glyph: string
): string {
  if (!needle || !text.includes(needle)) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(needle, i);
    if (idx === -1) {
      out += text.slice(i);
      break;
    }
    const beforeChar = idx > 0 ? text[idx - 1] : "";
    const afterChar =
      idx + needle.length < text.length ? text[idx + needle.length] : "";
    let piece = glyph;
    if (glyph && isThaiOrLatinLetter(beforeChar)) {
      piece = ` ${piece}`;
    }
    if (glyph && isThaiOrLatinLetter(afterChar)) {
      piece = `${piece} `;
    }
    if (
      !glyph &&
      isThaiOrLatinLetter(beforeChar) &&
      isThaiOrLatinLetter(afterChar)
    ) {
      piece = " ";
    }
    out += text.slice(i, idx) + piece;
    i = idx + needle.length;
  }
  return out;
}

function stripBannedCheer(text: string): string {
  BANNED_CHEER_RE.lastIndex = 0;
  return text.replace(BANNED_CHEER_RE, (match, offset: number) => {
    const beforeChar = offset > 0 ? text[offset - 1] : "";
    const afterChar =
      offset + match.length < text.length ? text[offset + match.length] : "";
    if (isThaiOrLatinLetter(beforeChar) && isThaiOrLatinLetter(afterChar)) {
      return " ";
    }
    return "";
  });
}

function repairReplacementChars(text: string): string {
  if (!text.includes(REPLACEMENT_CHAR)) return text;
  return replaceAllWithSeparation(text, REPLACEMENT_CHAR, "");
}

/**
 * Apply only the allowlisted command mappings on a plain-text slice.
 * - `$\\rightarrow$` → `→` with surrounding letters kept apart
 * - bare `\\rightarrow` → `→` when not followed by a letter (avoids half-eating `\\leq`)
 * - leaves `$20,000`, `2.5%`, URLs, Markdown, CJK/Kana, CDI/CVT/PSI/ABS alone
 */
function normalizePlainTypography(text: string): string {
  let out = text;

  for (const [command, glyph] of LATEX_COMMAND_MAP) {
    const wrapped = `$${command}$`;
    out = replaceAllWithSeparation(out, wrapped, glyph);
  }

  for (const [command, glyph] of LATEX_COMMAND_MAP) {
    if (command === "\\%") {
      out = replaceAllWithSeparation(out, "\\%", glyph);
      continue;
    }
    const name = command.slice(1);
    const bare = new RegExp(`\\\\${escapeRegExp(name)}(?![A-Za-z])`, "g");
    out = out.replace(bare, (match, offset: number) => {
      const beforeChar = offset > 0 ? out[offset - 1] : "";
      const afterChar =
        offset + match.length < out.length ? out[offset + match.length] : "";
      let piece = glyph;
      if (isThaiOrLatinLetter(beforeChar)) {
        piece = ` ${piece}`;
      }
      if (isThaiOrLatinLetter(afterChar)) {
        piece = `${piece} `;
      }
      return piece;
    });
  }

  out = stripBannedCheer(out);
  out = repairReplacementChars(out);
  // Collapse leftover double spaces from removals (keep newlines).
  out = out.replace(/[^\S\n]{2,}/g, " ");

  return out;
}

function needsTypographyPass(content: string): boolean {
  BANNED_CHEER_RE.lastIndex = 0;
  return (
    content.includes("\\") ||
    content.includes("$") ||
    content.includes(REPLACEMENT_CHAR) ||
    BANNED_CHEER_RE.test(content)
  );
}

/**
 * Normalize assistant-visible Chat V.3 text only.
 * Formatting repair — not content censorship. Idempotent for converted Unicode.
 */
export function normalizeChatV3AssistantTypography(
  content: string,
  options: ChatV3TypographyNormalizeOptions = {}
): string {
  if (!content) return content;

  const preserveForeignScript = !isProvenForeignScriptLeakage({
    assistantContent: content,
    userMessage: options.userMessage,
  });
  if (!preserveForeignScript) {
    // Proven leakage still must not become a Unicode-range deletion pass.
  }

  if (!needsTypographyPass(content)) return content;

  return splitPreservingCodeSegments(content)
    .map((segment) =>
      segment.kind === "code"
        ? segment.text
        : normalizePlainTypography(segment.text)
    )
    .join("");
}

/** Exported for tests — the exact mapping table under test. */
export const CHAT_V3_TYPOGRAPHY_COMMAND_MAP = LATEX_COMMAND_MAP;

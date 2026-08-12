/**
 * WP-V3-10D — Targeted Chat V.3 assistant typography cleanup.
 * Converts a small allowlist of raw LaTeX-like commands to Unicode.
 * Does not strip $, \\, {}, HTML, or escapes broadly.
 * Preserves fenced code blocks and inline code unchanged.
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

type TextSegment = { kind: "plain" | "code"; text: string };

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
 * Apply only the allowlisted command mappings on a plain-text slice.
 * - `$\\rightarrow$` → `→`
 * - bare `\\rightarrow` → `→` when not followed by a letter (avoids half-eating `\\leq`)
 * - leaves `$20,000`, `2.5%`, URLs, Markdown alone
 */
function normalizePlainTypography(text: string): string {
  let out = text;

  for (const [command, glyph] of LATEX_COMMAND_MAP) {
    const wrapped = `$${command}$`;
    if (out.includes(wrapped)) {
      out = out.split(wrapped).join(glyph);
    }
  }

  for (const [command, glyph] of LATEX_COMMAND_MAP) {
    if (command === "\\%") {
      if (out.includes("\\%")) {
        out = out.split("\\%").join(glyph);
      }
      continue;
    }
    const name = command.slice(1);
    const bare = new RegExp(`\\\\${escapeRegExp(name)}(?![A-Za-z])`, "g");
    out = out.replace(bare, glyph);
  }

  return out;
}

/**
 * Normalize assistant-visible Chat V.3 text only.
 * Idempotent for already-converted Unicode glyphs.
 */
export function normalizeChatV3AssistantTypography(content: string): string {
  if (!content) return content;
  if (!content.includes("\\") && !content.includes("$")) {
    return content;
  }

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

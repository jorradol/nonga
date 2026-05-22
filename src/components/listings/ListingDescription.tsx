import { useMemo, type ReactNode } from "react";
import {
  formatListingDescription,
  type ListingDescriptionBlock,
} from "../../utils/formatListingDescription";

const BODY_STYLE = {
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};

export interface ListingDescriptionProps {
  text?: string | null;
  className?: string;
  fallback?: ReactNode;
  /** full = แสดงครบ; preview = กล่องเลื่อนได้ (ไม่ตัดเนื้อหา) */
  variant?: "full" | "preview";
  tone?: "dark" | "light";
}

function blockText(block: ListingDescriptionBlock): string {
  return block.lines.join("\n");
}

function BlockContent({
  block,
  tone,
}: {
  block: ListingDescriptionBlock;
  tone: "dark" | "light";
}) {
  const text = blockText(block);
  const body =
    tone === "light"
      ? "text-slate-600 leading-[1.75]"
      : "text-slate-300 leading-[1.75]";

  switch (block.type) {
    case "heading":
      return (
        <h3
          className={`text-sm sm:text-[15px] font-bold tracking-tight mt-5 mb-2 first:mt-0 ${
            tone === "light" ? "text-slate-800" : "text-slate-100"
          }`}
          style={BODY_STYLE}
        >
          {text}
        </h3>
      );
    case "bullets":
      return (
        <ul
          className={`my-2.5 space-y-2 list-none pl-0 ${body}`}
          role="list"
        >
          {block.lines.map((line, j) => (
            <li key={j} className="pl-0.5" style={BODY_STYLE}>
              {line}
            </li>
          ))}
        </ul>
      );
    case "spacing":
      return <div className="h-4 shrink-0" aria-hidden />;
    case "paragraph":
    default:
      return (
        <p
          className={`my-2.5 first:mt-0 last:mb-0 text-sm sm:text-[15px] ${body}`}
          style={BODY_STYLE}
        >
          {text}
        </p>
      );
  }
}

/**
 * แสดงรายละเอียดประกาศ — plain text ปลอดภัย, รักษา \\n และย่อหน้า
 */
export default function ListingDescription({
  text,
  className = "",
  fallback = null,
  variant = "full",
  tone = "dark",
}: ListingDescriptionProps) {
  const blocks = useMemo(() => formatListingDescription(text), [text]);
  const hasContent = blocks.length > 0;

  if (!hasContent) {
    return fallback ? <>{fallback}</> : null;
  }

  const shell =
    variant === "preview"
      ? "max-h-48 sm:max-h-56 overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
      : "";

  return (
    <article
      className={`listing-description w-full max-w-prose font-sans text-left ${shell} ${className}`}
      lang="th"
    >
      {blocks.map((block, idx) => (
        <div key={idx}>
          <BlockContent block={block} tone={tone} />
        </div>
      ))}
    </article>
  );
}

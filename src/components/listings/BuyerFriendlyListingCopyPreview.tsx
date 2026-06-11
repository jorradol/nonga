/**
 * v6.3B.3 — Additive buyer-friendly listing copy preview panel (staging-gated).
 */
import ListingDescription from "./ListingDescription";
import type { BuyerFriendlyListingCopyResult } from "../../utils/buyerFriendlyListingCopy";

export const BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER =
  "preview ไม่พร้อม — ใช้ข้อความประกาศเดิมเป็นหลัก";

export const BUYER_FRIENDLY_PREVIEW_TITLE = "น้องเอช่วยสรุปให้อ่านง่าย";

export const BUYER_FRIENDLY_PREVIEW_SUBTITLE =
  "สรุปรายละเอียดสำหรับผู้ซื้อ — ภาษาคนช่วยขาย อ่านง่ายจากข้อมูลประกาศ";

export const BUYER_FRIENDLY_PREVIEW_EMPTY_NOTICE =
  "ยังไม่มีข้อมูลประกาศเพียงพอสำหรับสรุปให้อ่านง่าย";

export interface BuyerFriendlyListingCopyPreviewProps {
  result: BuyerFriendlyListingCopyResult;
  tone?: "dark" | "light";
}

function previewShellClasses(tone: "dark" | "light") {
  return tone === "light"
    ? "border-slate-200 bg-slate-50"
    : "border-slate-700/80 bg-slate-900/40";
}

function previewMutedClasses(tone: "dark" | "light") {
  return tone === "light" ? "text-slate-500" : "text-slate-400";
}

function previewTitleClasses(tone: "dark" | "light") {
  return tone === "light" ? "text-slate-900" : "text-slate-100";
}

function PreviewHeader({ tone }: { tone: "dark" | "light" }) {
  const badge =
    tone === "light"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-amber-500/10 text-amber-300 border-amber-500/20";
  const muted = previewMutedClasses(tone);
  const title = previewTitleClasses(tone);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`text-sm font-bold ${title}`}>{BUYER_FRIENDLY_PREVIEW_TITLE}</h3>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge}`}
        >
          Preview · Staging
        </span>
      </div>
      <p className={`text-xs leading-relaxed ${muted}`}>{BUYER_FRIENDLY_PREVIEW_SUBTITLE}</p>
    </div>
  );
}

export default function BuyerFriendlyListingCopyPreview({
  result,
  tone = "dark",
}: BuyerFriendlyListingCopyPreviewProps) {
  const shell = previewShellClasses(tone);
  const muted = previewMutedClasses(tone);

  if (result.source === "empty") {
    return (
      <div
        className={`mt-5 rounded-xl border px-4 py-4 space-y-3 ${shell}`}
        data-testid="buyer-friendly-copy-preview-empty"
      >
        <PreviewHeader tone={tone} />
        <p className={`text-xs ${muted}`}>{BUYER_FRIENDLY_PREVIEW_EMPTY_NOTICE}</p>
      </div>
    );
  }

  if (!result.guardPass) {
    return (
      <div
        className={`mt-5 rounded-xl border px-4 py-3 space-y-3 ${shell}`}
        data-testid="buyer-friendly-copy-preview-fallback"
      >
        <PreviewHeader tone={tone} />
        <p className={`text-xs ${muted}`}>{BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER}</p>
      </div>
    );
  }

  if (!result.text.trim()) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-xl border px-4 py-4 space-y-3 ${shell}`}
      data-testid="buyer-friendly-copy-preview-panel"
    >
      <PreviewHeader tone={tone} />

      {result.warnings.includes("seller-overclaim-omitted") && (
        <p className={`text-[10px] ${muted}`}>
          ข้อความฟันธงจากผู้ขายถูกลดน้ำหนักใน preview
        </p>
      )}

      <ListingDescription text={result.text} variant="full" tone={tone} />
    </div>
  );
}

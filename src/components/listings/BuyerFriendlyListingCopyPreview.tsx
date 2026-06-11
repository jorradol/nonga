/**
 * v6.3B.2 — Additive buyer-friendly listing copy preview panel (staging-gated).
 */
import ListingDescription from "./ListingDescription";
import type { BuyerFriendlyListingCopyResult } from "../../utils/buyerFriendlyListingCopy";

export const BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER =
  "preview ไม่พร้อม — ใช้ข้อความประกาศเดิมเป็นหลัก";

export interface BuyerFriendlyListingCopyPreviewProps {
  result: BuyerFriendlyListingCopyResult;
  tone?: "dark" | "light";
}

export default function BuyerFriendlyListingCopyPreview({
  result,
  tone = "dark",
}: BuyerFriendlyListingCopyPreviewProps) {
  const shell =
    tone === "light"
      ? "border-slate-200 bg-slate-50"
      : "border-slate-700/80 bg-slate-900/40";

  const badge =
    tone === "light"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-amber-500/10 text-amber-300 border-amber-500/20";

  const muted = tone === "light" ? "text-slate-500" : "text-slate-400";

  if (result.source === "empty") {
    return null;
  }

  if (!result.guardPass) {
    return (
      <div
        className={`mt-5 rounded-xl border px-4 py-3 ${shell}`}
        data-testid="buyer-friendly-copy-preview-fallback"
      >
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
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge}`}
        >
          Preview · Staging · Deterministic
        </span>
        <span className={`text-[10px] ${muted}`}>
          จากข้อมูลประกาศ — ไม่ใช่การยืนยันสภาพรถ
        </span>
      </div>

      {result.warnings.includes("seller-overclaim-omitted") && (
        <p className={`text-[10px] ${muted}`}>
          ข้อความฟันธงจากผู้ขายถูกลดน้ำหนักใน preview
        </p>
      )}

      <ListingDescription text={result.text} variant="full" tone={tone} />
    </div>
  );
}

import React from "react";
import { ClipboardCopy, Check } from "lucide-react";
import type { ChatMessageAttachment, PendingListingCardData } from "../../types";
import type { ExtractedCarFields } from "../../services/ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../../services/ai/chat/chatPrecheckLayer";
import { ChatMessageAttachments } from "./ChatMessageAttachments";
import { useClipboard } from "../../hooks/chat/useClipboard";
import { LISTING_CARD_MAX_THUMBNAILS } from "../../constants/listingImagePolicy";

interface ChatPendingListingCardProps {
  card: PendingListingCardData;
  attachments?: ChatMessageAttachment[];
  messageId: string;
  onEdit: () => void;
  onConfirmSave: () => void;
  onNotNow: () => void;
}

function fieldLine(
  label: string,
  value: string | number | undefined | null
): string | null {
  if (value == null || value === "") return null;
  return `${label}: ${value}`;
}

export function ChatPendingListingCard({
  card,
  attachments,
  messageId,
  onEdit,
  onConfirmSave,
  onNotNow,
}: ChatPendingListingCardProps) {
  const { copiedId, copyToClipboard } = useClipboard();
  const copyKey = `${messageId}-marketing`;
  const fields = card.fields as ExtractedCarFields;
  const visionSummary = card.visionSummary as VisionObservationSummary | undefined;

  const brandModel = [fields.brand || visionSummary?.brand, fields.model || visionSummary?.model]
    .filter(Boolean)
    .join(" ");

  const specs = [
    fieldLine("ยี่ห้อ/รุ่น", brandModel || undefined),
    fieldLine("ปี", fields.year),
    fieldLine(
      "ราคา",
      fields.price != null
        ? `${Number(fields.price).toLocaleString("th-TH")} บาท`
        : undefined
    ),
    fieldLine(
      "เลขไมล์",
      fields.mileage != null
        ? `${Number(fields.mileage).toLocaleString("th-TH")} กม.`
        : undefined
    ),
    fieldLine("เกียร์", fields.transmission),
    fieldLine("สี", fields.color || visionSummary?.color),
    fieldLine("รหัสรถ", card.publicRefCode),
  ].filter(Boolean) as string[];

  return (
    <div
      className="mt-3 rounded-xl border border-orange-500/25 bg-slate-950/40 overflow-hidden"
      data-testid="chat-pending-listing-card"
    >
      <div className="px-3 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-orange-300">
          การ์ดประกาศร่าง
        </span>
        <span className="text-[10px] font-semibold text-amber-200/90 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
          {card.statusLabel}
        </span>
      </div>

      {attachments && attachments.length > 0 ? (
        <div className="px-3 pt-3">
          <ChatMessageAttachments
            attachments={attachments}
            maxVisibleImages={LISTING_CARD_MAX_THUMBNAILS}
          />
        </div>
      ) : (
        <p className="px-3 pt-3 text-[10px] text-slate-500">
          ยังไม่มีตัวอย่างรูปในการ์ด — รบกวนแนบรูปในแชทก่อนกดยืนยันบันทึกประกาศครับ
        </p>
      )}

      <div className="px-3 py-3 space-y-1.5">
        {specs.map((line) => (
          <p key={line} className="text-[11px] text-slate-200">
            {line}
          </p>
        ))}
      </div>

      {card.marketingCopy.trim() && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              โพสต์ตัวอย่าง (copy ได้)
            </p>
            <button
              type="button"
              onClick={() => copyToClipboard(card.marketingCopy, copyKey)}
              className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 cursor-pointer"
            >
              {copiedId === copyKey ? (
                <>
                  <Check className="w-3 h-3" />
                  คัดลอกแล้ว
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3 h-3" />
                  คัดลอก
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-slate-900/60 border border-slate-800 px-2.5 py-2">
            {card.marketingCopy}
          </p>
        </div>
      )}

      <div className="px-3 pb-3 flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={onEdit}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          แก้ไขข้อมูล
        </button>
        <button
          type="button"
          onClick={onConfirmSave}
          className="px-3 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
        >
          ยืนยันบันทึกประกาศ
        </button>
        <button
          type="button"
          onClick={onNotNow}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          ยังไม่ลงตลาดตอนนี้
        </button>
      </div>
    </div>
  );
}

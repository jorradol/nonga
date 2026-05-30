import React from "react";
import { ClipboardCopy, Check, ExternalLink } from "lucide-react";
import type { ChatMessageAttachment, SavedMemberListingCardData } from "../../types";
import type { ExtractedCarFields } from "../../services/ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../../services/ai/chat/chatPrecheckLayer";
import { ChatMessageAttachments } from "./ChatMessageAttachments";
import { useClipboard } from "../../hooks/chat/useClipboard";
import { CHAT_MEMBER_PUBLISH_LISTING_ACTION, CHAT_SAVED_MEMBER_LISTING_CARD_FOOTER } from "../../services/chat/chatSavedMemberListing";

interface ChatSavedMemberListingCardProps {
  card: SavedMemberListingCardData;
  attachments?: ChatMessageAttachment[];
  messageId: string;
  onViewMyListings: () => void;
  onEdit: () => void;
  onPublishComingSoon: () => void;
}

function fieldLine(
  label: string,
  value: string | number | undefined | null
): string | null {
  if (value == null || value === "") return null;
  return `${label}: ${value}`;
}

export function ChatSavedMemberListingCard({
  card,
  attachments,
  messageId,
  onViewMyListings,
  onEdit,
  onPublishComingSoon,
}: ChatSavedMemberListingCardProps) {
  const { copiedId, copyToClipboard } = useClipboard();
  const copyKey = `${messageId}-saved-marketing`;
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
    fieldLine("รหัสอ้างอิงจากแชท", card.publicRefCode),
    fieldLine("รหัสประกาศ", card.listingId),
  ].filter(Boolean) as string[];

  return (
    <div
      className="mt-3 rounded-xl border border-emerald-500/30 bg-slate-950/40 overflow-hidden"
      data-testid="chat-saved-member-listing-card"
    >
      <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-emerald-300 block">
            ประกาศร่างที่บันทึกแล้ว
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            ยังไม่เผยแพร่ในตลาด
          </span>
        </div>
        <span className="text-[10px] font-semibold text-emerald-100/90 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0 text-center">
          {card.statusLabel}
        </span>
      </div>

      {attachments && attachments.length > 0 && (
        <div className="px-3 pt-3">
          <p className="text-[10px] font-semibold text-emerald-300/90 mb-2">
            รูปในระบบ {card.imageUrls.length || attachments.length} รูป
          </p>
          <ChatMessageAttachments
            attachments={attachments}
            maxVisibleImages={12}
          />
        </div>
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
              className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
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
          onClick={onViewMyListings}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          ดูในประกาศของฉัน
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          แก้ไขข้อมูล
        </button>
        <button
          type="button"
          onClick={onPublishComingSoon}
          title="ฟีเจอร์นี้จะเปิดในรอบถัดไป — ประกาศยังเป็นร่างและยังไม่ลงตลาด"
          className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-xs font-bold rounded-xl border border-dashed border-slate-600 transition-colors cursor-pointer"
        >
          {CHAT_MEMBER_PUBLISH_LISTING_ACTION}
        </button>
      </div>
      <p className="px-3 pb-3 text-[10px] text-slate-500 text-center leading-relaxed">
        {CHAT_SAVED_MEMBER_LISTING_CARD_FOOTER}
      </p>
    </div>
  );
}

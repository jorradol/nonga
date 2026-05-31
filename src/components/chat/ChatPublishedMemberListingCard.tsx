import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { ChatMessageAttachment, PublishedMemberListingCardData } from "../../types";
import type { ExtractedCarFields } from "../../services/ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../../services/ai/chat/chatPrecheckLayer";
import { LISTING_CARD_MAX_THUMBNAILS } from "../../constants/listingImagePolicy";
import { ChatMessageAttachments } from "./ChatMessageAttachments";
import { useAppStore } from "../../store";

interface ChatPublishedMemberListingCardProps {
  card: PublishedMemberListingCardData;
  attachments?: ChatMessageAttachment[];
}

function fieldLine(
  label: string,
  value: string | number | undefined | null
): string | null {
  if (value == null || value === "") return null;
  return `${label}: ${value}`;
}

export function ChatPublishedMemberListingCard({
  card,
  attachments,
}: ChatPublishedMemberListingCardProps) {
  const { setView } = useAppStore();
  const [expanded, setExpanded] = useState(false);
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
    fieldLine("รหัสอ้างอิงจากแชท", card.publicRefCode || undefined),
    fieldLine("รหัสประกาศ", card.listingId),
  ].filter(Boolean) as string[];

  const imageCount = card.imageUrls.length || attachments?.length || 0;
  const description =
    typeof fields.description === "string" && fields.description.trim()
      ? fields.description.trim()
      : "";

  return (
    <div
      className="mt-3 rounded-xl border border-orange-500/30 bg-slate-950/40 overflow-hidden"
      data-testid="chat-published-member-listing-card"
      data-listing-id={card.listingId}
    >
      <div className="px-3 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-orange-300 block">
            ประกาศที่ลงตลาดแล้ว
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            ลูกค้าสามารถค้นหาและดูประกาศในตลาดรถได้แล้ว
          </span>
        </div>
        <span className="text-[10px] font-semibold text-orange-100/90 bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 rounded-full shrink-0 text-center">
          {card.statusLabel}
        </span>
      </div>

      {attachments && attachments.length > 0 && (
        <div className="px-3 pt-3">
          <p className="text-[10px] font-semibold text-orange-300/90 mb-2">
            รูปในระบบ {imageCount} รูป
          </p>
          <ChatMessageAttachments
            attachments={attachments}
            maxVisibleImages={LISTING_CARD_MAX_THUMBNAILS}
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

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-orange-500/10 pt-3">
          {card.marketingCopy.trim() && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                โพสต์ตัวอย่าง
              </p>
              <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-slate-900/60 border border-slate-800 px-2.5 py-2">
                {card.marketingCopy}
              </p>
            </div>
          )}
          {description && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                รายละเอียดเพิ่มเติม
              </p>
              <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-slate-900/60 border border-slate-800 px-2.5 py-2">
                {description}
              </p>
            </div>
          )}
          {!card.marketingCopy.trim() && !description && (
            <p className="text-[11px] text-slate-500 text-center">
              ไม่มีรายละเอียดเพิ่มเติมในระบบ
            </p>
          )}
        </div>
      )}

      <div className="px-3 pb-3 flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-orange-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          data-testid="chat-published-listing-expand-btn"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              ย่อรายละเอียด
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              ดูรายละเอียดในแชท
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setView("marketplace", card.listingId)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
          id="chat-view-marketplace-btn"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          ดูในตลาดรถ
        </button>
      </div>
    </div>
  );
}

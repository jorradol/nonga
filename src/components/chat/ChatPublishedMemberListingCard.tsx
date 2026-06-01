import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ChatMessageAttachment, PublishedMemberListingCardData } from "../../types";
import type { ExtractedCarFields } from "../../services/ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../../services/ai/chat/chatPrecheckLayer";
import { buildSellerShareInputFromPublishedCard } from "../../services/chat/sellerShareCopy";
import { ChatSellerShareCopyPanel } from "./ChatSellerShareCopyPanel";

interface ChatPublishedMemberListingCardProps {
  card: PublishedMemberListingCardData;
  attachments?: ChatMessageAttachment[];
}

const TEXT_PREVIEW_CHARS = 140;
const SUMMARY_THUMB_COUNT = 3;
const DETAIL_THUMB_COUNT = 4;

function resolveAttachmentImageUrl(attachment: ChatMessageAttachment): string | null {
  const url =
    attachment.imageUrl ??
    attachment.previewUrl ??
    attachment.previewDataUrl ??
    attachment.thumbnailUrl;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function truncateText(text: string, maxChars: number): { preview: string; truncated: boolean } {
  const normalized = text.trim();
  if (normalized.length <= maxChars) {
    return { preview: normalized, truncated: false };
  }
  return {
    preview: `${normalized.slice(0, maxChars).trim()}…`,
    truncated: true,
  };
}

interface SpecItem {
  key: string;
  label: string;
  value: string;
}

function SpecGrid({
  items,
  compact = false,
}: {
  items: SpecItem[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <dl
      className={`grid gap-2 ${
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
      }`}
      data-testid={compact ? "chat-published-listing-spec-summary" : "chat-published-listing-spec-detail"}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={`min-w-0 rounded-lg border border-slate-800/80 bg-slate-900/50 px-2.5 py-2 ${
            item.key === "brandModel" && !compact ? "col-span-2 sm:col-span-3" : ""
          }`}
        >
          <dt className="text-[9px] uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd
            className={`mt-0.5 text-slate-100 break-words ${
              compact ? "text-[11px] font-semibold" : "text-[11px] sm:text-xs font-medium"
            } ${item.key === "price" ? "text-orange-400 font-bold" : ""}`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ChatListingImageGallery({
  imageUrls,
  expanded,
}: {
  imageUrls: string[];
  expanded: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, imageUrls.length - 1));
  const activeUrl = imageUrls[safeIndex];

  if (imageUrls.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 aspect-[16/10] max-h-40 sm:max-h-48 flex items-center justify-center"
        data-testid="chat-published-listing-no-images"
      >
        <span className="text-[10px] text-slate-500">ยังไม่มีรูปในระบบ</span>
      </div>
    );
  }

  const thumbCount = expanded ? DETAIL_THUMB_COUNT : SUMMARY_THUMB_COUNT;
  const thumbs = imageUrls.slice(1, 1 + thumbCount);
  const overflowCount = Math.max(0, imageUrls.length - 1 - thumbCount);

  return (
    <div className="space-y-2 min-w-0 max-w-full overflow-hidden" data-testid="chat-published-listing-gallery">
      <div
        className={`relative w-full max-w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900 ${
          expanded ? "aspect-[16/10] max-h-52 sm:max-h-64" : "aspect-[16/10] max-h-40 sm:max-h-48"
        }`}
      >
        <img
          src={activeUrl}
          alt=""
          className="h-full w-full max-w-full object-cover object-center"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {imageUrls.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-slate-200">
            {safeIndex + 1}/{imageUrls.length}
          </span>
        )}
      </div>

      {imageUrls.length > 1 && (
        <div className="flex gap-1.5 min-w-0 max-w-full overflow-hidden">
          {thumbs.map((url, index) => {
            const imageIndex = index + 1;
            const isActive = safeIndex === imageIndex;
            const isLastVisible = index === thumbs.length - 1 && overflowCount > 0;
            return (
              <button
                key={`${url}-${imageIndex}`}
                type="button"
                onClick={() => setActiveIndex(imageIndex)}
                className={`relative shrink-0 overflow-hidden rounded-md border transition-colors ${
                  isActive
                    ? "border-orange-500 ring-1 ring-orange-500/40"
                    : "border-slate-700 hover:border-slate-500"
                } h-12 w-12 sm:h-14 sm:w-14`}
                aria-label={`ดูรูปที่ ${imageIndex + 1}`}
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                {isLastVisible && (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/75 text-[10px] font-bold text-orange-200">
                    +{overflowCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandableTextBlock({
  title,
  text,
  testId,
}: {
  title: string;
  text: string;
  testId: string;
}) {
  const [showFull, setShowFull] = useState(false);
  const { preview, truncated } = truncateText(text, TEXT_PREVIEW_CHARS);
  const displayText = showFull || !truncated ? text.trim() : preview;

  return (
    <div data-testid={testId}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
        {title}
      </p>
      <p className="text-[11px] sm:text-xs text-slate-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-slate-900/60 border border-slate-800 px-2.5 py-2 break-words">
        {displayText}
      </p>
      {truncated && (
        <button
          type="button"
          onClick={() => setShowFull((prev) => !prev)}
          className="mt-1.5 text-[10px] font-semibold text-orange-300 hover:text-orange-200 cursor-pointer"
          data-testid={`${testId}-toggle`}
        >
          {showFull ? "ย่อข้อความ" : "อ่านเพิ่มเติม"}
        </button>
      )}
    </div>
  );
}

export function ChatPublishedMemberListingCard({
  card,
  attachments,
}: ChatPublishedMemberListingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const fields = card.fields as ExtractedCarFields;
  const visionSummary = card.visionSummary as VisionObservationSummary | undefined;

  const brandModel = [fields.brand || visionSummary?.brand, fields.model || visionSummary?.model]
    .filter(Boolean)
    .join(" ");

  const imageUrls = useMemo(() => {
    const fromAttachments =
      attachments
        ?.filter((item) => item.kind === "image")
        .map(resolveAttachmentImageUrl)
        .filter((url): url is string => Boolean(url)) ?? [];
    if (fromAttachments.length > 0) return fromAttachments;
    return card.imageUrls.filter((url) => typeof url === "string" && url.trim());
  }, [attachments, card.imageUrls]);

  const priceLabel =
    fields.price != null
      ? `${Number(fields.price).toLocaleString("th-TH")} บาท`
      : null;
  const mileageLabel =
    fields.mileage != null
      ? `${Number(fields.mileage).toLocaleString("th-TH")} กม.`
      : null;

  const summarySpecs: SpecItem[] = [
    brandModel ? { key: "brandModel", label: "ยี่ห้อ/รุ่น", value: brandModel } : null,
    fields.year != null ? { key: "year", label: "ปี", value: String(fields.year) } : null,
    priceLabel ? { key: "price", label: "ราคา", value: priceLabel } : null,
    mileageLabel ? { key: "mileage", label: "เลขไมล์", value: mileageLabel } : null,
  ].filter(Boolean) as SpecItem[];

  const detailSpecs: SpecItem[] = [
    ...summarySpecs,
    fields.transmission
      ? { key: "transmission", label: "เกียร์", value: String(fields.transmission) }
      : null,
    fields.color || visionSummary?.color
      ? {
          key: "color",
          label: "สี",
          value: String(fields.color || visionSummary?.color),
        }
      : null,
    card.listingId
      ? { key: "listingId", label: "รหัสประกาศ", value: card.listingId }
      : null,
    card.publicRefCode
      ? { key: "publicRefCode", label: "รหัสอ้างอิงจากแชท", value: card.publicRefCode }
      : null,
    { key: "status", label: "สถานะ", value: card.statusLabel },
  ].filter(Boolean) as SpecItem[];

  const description =
    typeof fields.description === "string" && fields.description.trim()
      ? fields.description.trim()
      : "";
  const marketingCopy = card.marketingCopy.trim();
  const shareInput = useMemo(
    () => buildSellerShareInputFromPublishedCard(card),
    [card]
  );

  return (
    <div
      className="mt-3 w-full max-w-full min-w-0 rounded-xl border border-orange-500/30 bg-slate-950/40 overflow-hidden"
      data-testid="chat-published-member-listing-card"
      data-listing-id={card.listingId}
    >
      <div className="px-3 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-orange-300 block truncate">
            {brandModel || "ประกาศที่ลงตลาดแล้ว"}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block line-clamp-2">
            {expanded
              ? "รายละเอียดประกาศในช่องแชท — อ่านได้ทุกอุปกรณ์"
              : "แตะดูรายละเอียดในแชทได้โดยไม่ต้องออกจากหน้านี้"}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-orange-100/90 bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 rounded-full shrink-0 text-center">
          {card.statusLabel}
        </span>
      </div>

      <div className="px-3 pt-3 pb-3 space-y-3 min-w-0 max-w-full">
        <ChatListingImageGallery imageUrls={imageUrls} expanded={expanded} />

        {expanded ? (
          <SpecGrid items={detailSpecs} />
        ) : (
          <SpecGrid items={summarySpecs} compact />
        )}

        {expanded && (
          <div className="space-y-3 border-t border-orange-500/10 pt-3">
            {marketingCopy ? (
              <ExpandableTextBlock
                title="คำขาย / โพสต์ตัวอย่าง"
                text={marketingCopy}
                testId="chat-published-listing-marketing"
              />
            ) : null}
            {description ? (
              <ExpandableTextBlock
                title="รายละเอียดเพิ่มเติม"
                text={description}
                testId="chat-published-listing-description"
              />
            ) : null}
            {!marketingCopy && !description && (
              <p
                className="text-[11px] text-slate-500 text-center"
                data-testid="chat-published-listing-no-extra-copy"
              >
                ไม่มีรายละเอียดเพิ่มเติมในระบบ
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-3 pb-2">
        <ChatSellerShareCopyPanel
          input={shareInput}
          idPrefix={`published-${card.listingId || card.publicRefCode}`}
        />
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-orange-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer min-h-[44px]"
          data-testid="chat-published-listing-expand-btn"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ย่อรายละเอียด
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ดูรายละเอียดในแชท
            </>
          )}
        </button>
      </div>
    </div>
  );
}

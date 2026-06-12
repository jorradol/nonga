import React, { useEffect, useMemo, useState } from "react";
import { fetchListingInterestQueueStats } from "../../services/leads/buyerLeadApi";
import { buildPublicInterestLabel } from "../../services/leads/buyerLeadQueuePolicy";
import { Car, ChevronDown, ChevronUp, ImageOff, PhoneCall, Quote, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { ChatCarCardData } from "../../types";
import { saveLastSelectedCarId, addRecentlyViewedCarId } from "../../utils/chatCarContext";
import { useSpeech } from "../../hooks/chat/useSpeech";
import {
  buildInChatCuratedAnalysis,
  buildInChatCuratedSpeakableText,
  hasInChatCuratedSpeakableText,
  IN_CHAT_CURATED_SPEAK_ARIA_LABEL,
  IN_CHAT_CURATED_TITLE,
} from "../../services/ai/chat/buildInChatCuratedAnalysis";

interface ChatCarCardProps {
  car: ChatCarCardData;
  onRequestSellerCallback?: (car: ChatCarCardData) => void;
}

const TEXT_PREVIEW_CHARS = 140;
const SUMMARY_THUMB_COUNT = 3;
const DETAIL_THUMB_COUNT = 4;

interface SpecItem {
  key: string;
  label: string;
  value: string;
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
      data-testid={compact ? "chat-car-card-spec-summary" : "chat-car-card-spec-detail"}
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

function ChatCarImageGallery({
  imageUrls,
  expanded,
  alt,
}: {
  imageUrls: string[];
  expanded: boolean;
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, imageUrls.length - 1));
  const activeUrl = imageUrls[safeIndex];

  if (imageUrls.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 aspect-[16/10] max-h-40 sm:max-h-48 flex flex-col items-center justify-center gap-2"
        data-testid="chat-car-card-no-images"
      >
        <ImageOff className="w-8 h-8 opacity-60 text-slate-500" />
        <span className="text-[10px] text-slate-500">ยังไม่มีรูปในระบบ</span>
      </div>
    );
  }

  const thumbCount = expanded ? DETAIL_THUMB_COUNT : SUMMARY_THUMB_COUNT;
  const visibleThumbs = imageUrls.slice(0, thumbCount);
  const overflowCount = Math.max(0, imageUrls.length - thumbCount);

  return (
    <div className="space-y-2 min-w-0 max-w-full" data-testid="chat-car-card-gallery">
      <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-[16/10] max-h-40 sm:max-h-48">
        <img
          src={activeUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {imageUrls.length > 1 && (
          <span className="absolute bottom-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-slate-200">
            {safeIndex + 1}/{imageUrls.length}
          </span>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 max-w-full">
          {visibleThumbs.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`shrink-0 w-12 h-9 sm:w-14 sm:h-10 rounded-md overflow-hidden border-2 transition cursor-pointer ${
                index === safeIndex
                  ? "border-orange-400"
                  : "border-slate-700 opacity-80 hover:opacity-100"
              }`}
              aria-label={`รูปที่ ${index + 1}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
          {overflowCount > 0 && (
            <div className="shrink-0 w-12 h-9 sm:w-14 sm:h-10 rounded-md border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
              +{overflowCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandableDescription({ text }: { text: string }) {
  const [showFull, setShowFull] = useState(false);
  const { preview, truncated } = truncateText(text, TEXT_PREVIEW_CHARS);
  const displayText = showFull || !truncated ? text.trim() : preview;

  return (
    <div data-testid="chat-car-card-description">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
        รายละเอียดเพิ่มเติม
      </p>
      <p className="text-[11px] sm:text-xs text-slate-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-slate-900/60 border border-slate-800 px-2.5 py-2 break-words">
        {displayText}
      </p>
      {truncated && (
        <button
          type="button"
          onClick={() => setShowFull((prev) => !prev)}
          className="mt-1.5 text-[10px] font-semibold text-orange-300 hover:text-orange-200 cursor-pointer"
          data-testid="chat-car-card-description-toggle"
        >
          {showFull ? "ย่อข้อความ" : "อ่านเพิ่มเติม"}
        </button>
      )}
    </div>
  );
}

function ChatCarCuratedAnalysisPanel({ car }: { car: ChatCarCardData }) {
  const analysis = useMemo(() => buildInChatCuratedAnalysis(car), [car]);
  const speakableText = useMemo(
    () => buildInChatCuratedSpeakableText(analysis),
    [analysis]
  );
  const canSpeak = hasInChatCuratedSpeakableText(analysis);
  const ttsMessageId = `curated-tts-${car.id}`;
  const { toggleSpeak, isSpeaking } = useSpeech();
  const speaking = isSpeaking(ttsMessageId);

  return (
    <div
      className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-3 space-y-2.5"
      data-testid="chat-car-curated-analysis"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <Quote className="w-3 h-3 text-orange-500/70 shrink-0" />
          <span className="text-[11px] font-bold text-orange-400">{analysis.title}</span>
        </div>
        {canSpeak ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleSpeak(speakableText, ttsMessageId);
            }}
            className={`shrink-0 p-1 rounded transition cursor-pointer ${
              speaking
                ? "text-sky-400 hover:bg-sky-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            aria-label={IN_CHAT_CURATED_SPEAK_ARIA_LABEL}
            title={speaking ? "หยุดบรรยาย" : IN_CHAT_CURATED_SPEAK_ARIA_LABEL}
            data-testid="chat-car-curated-tts-btn"
            data-car-id={car.id}
          >
            {speaking ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        ) : null}
      </div>
      <div className="space-y-2 text-[11px] sm:text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
        <p>{analysis.opening}</p>
        {analysis.featureWeave ? <p>{analysis.featureWeave}</p> : null}
        <p>{analysis.highlights}</p>
        <p className="text-slate-400">{analysis.closing}</p>
      </div>
    </div>
  );
}

export function ChatCarCard({ car, onRequestSellerCallback }: ChatCarCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [interestCount, setInterestCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchListingInterestQueueStats(car.id).then((stats) => {
      if (!cancelled && stats) setInterestCount(stats.interestCount);
    });
    return () => {
      cancelled = true;
    };
  }, [car.id]);

  const interestLabel =
    interestCount != null && interestCount > 0
      ? buildPublicInterestLabel(interestCount)
      : "";

  const brandModel = `${car.brand} ${car.model}`.trim();
  const priceLabel =
    car.price > 0 ? `${car.price.toLocaleString("th-TH")} บาท` : "ติดต่อสอบถาม";
  const mileageLabel =
    car.mileage > 0 ? `${car.mileage.toLocaleString("th-TH")} กม.` : "—";

  const imageUrls = useMemo(() => {
    const fromList = (car.imageUrls ?? []).filter((url) => typeof url === "string" && url.trim());
    if (fromList.length > 0) return fromList;
    if (car.hasImage && car.imageUrl?.trim()) return [car.imageUrl.trim()];
    return [];
  }, [car.imageUrls, car.hasImage, car.imageUrl]);

  const summarySpecs: SpecItem[] = [
    { key: "brandModel", label: "ยี่ห้อ/รุ่น", value: brandModel },
    { key: "year", label: "ปี", value: String(car.year) },
    { key: "price", label: "ราคา", value: priceLabel },
    { key: "mileage", label: "เลขไมล์", value: mileageLabel },
  ];

  const detailSpecs: SpecItem[] = [
    ...summarySpecs,
    ...(car.transmission
      ? [{ key: "transmission", label: "เกียร์", value: car.transmission }]
      : []),
    ...(car.color ? [{ key: "color", label: "สี", value: car.color }] : []),
    { key: "listingId", label: "รหัสประกาศ", value: car.id },
  ];

  const rememberSelectedCar = () => {
    saveLastSelectedCarId(car.id);
    addRecentlyViewedCarId(car.id);
  };

  const handleToggleInChatDetail = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        rememberSelectedCar();
      }
      return next;
    });
  };

  return (
    <article
      className="w-full max-w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg"
      data-car-id={car.id}
      data-testid="chat-car-card"
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="px-3 py-2 border-b border-slate-800/80 flex items-start gap-2 min-w-0">
        <Car className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-100 leading-snug truncate">
            {brandModel}{" "}
            <span className="text-slate-400 font-medium">ปี {car.year}</span>
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
            {expanded
              ? "รายละเอียดรถในช่องแชท — จากข้อมูลจริงในระบบ"
              : "แตะดูรายละเอียดในแชทได้โดยไม่ต้องออกจากหน้านี้"}
          </p>
          {interestLabel ? (
            <p
              className="text-[10px] text-amber-400/90 mt-1 font-medium"
              data-testid="chat-car-card-interest-queue"
            >
              {interestLabel}
            </p>
          ) : null}
        </div>
        {car.matchKind === "alternative" && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            ทางเลือกใกล้เคียง
          </span>
        )}
      </div>

      <div className="px-3 pt-3 pb-3 space-y-3 min-w-0 max-w-full">
        <ChatCarImageGallery
          imageUrls={imageUrls}
          expanded={expanded}
          alt={brandModel}
        />

        {expanded ? (
          <SpecGrid items={detailSpecs} />
        ) : (
          <SpecGrid items={summarySpecs} compact />
        )}

        {expanded ? (
          <div className="border-t border-slate-800/80 pt-3 space-y-3">
            <ChatCarCuratedAnalysisPanel car={car} />
            {car.description?.trim() ? (
              <ExpandableDescription text={car.description.trim()} />
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className="px-3 pb-3 space-y-2"
        data-testid="chat-car-card-actions"
        data-layout="chat-car-card-actions-footer"
      >
        {onRequestSellerCallback ? (
          <button
            type="button"
            onClick={() => {
              rememberSelectedCar();
              onRequestSellerCallback(car);
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500/90 hover:bg-orange-400 text-slate-950 text-xs font-bold rounded-xl border border-orange-400/50 transition-colors cursor-pointer min-h-[44px]"
            data-testid="chat-car-card-seller-callback-btn"
          >
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            ให้ผู้ขายติดต่อกลับ
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleToggleInChatDetail}
          className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-orange-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer min-h-[44px]"
          data-testid="chat-car-card-expand-btn"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ย่อรายละเอียด
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ดูรายละเอียดรถ
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// Re-export title for tests
export { IN_CHAT_CURATED_TITLE };

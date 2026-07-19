/**
 * Chat Experience V2 — compact vehicle card for the Vehicle Workspace.
 * Renders ONLY fields present on the structured ChatCarCardData contract.
 * No availability badges are invented; the detail page is the source of
 * truth for the latest listing status. No lead/dealer actions.
 */
import { useMemo } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import type { ChatCarCardData } from "../../types";
import { useAppStore } from "../../store";

export function ChatV2VehicleCard({ car }: { car: ChatCarCardData }) {
  const setView = useAppStore((s) => s.setView);

  const imageUrl = useMemo(() => {
    const fromList = (car.imageUrls ?? []).find(
      (url) => typeof url === "string" && url.trim()
    );
    if (fromList) return fromList;
    if (car.hasImage && car.imageUrl?.trim()) return car.imageUrl.trim();
    return null;
  }, [car.imageUrls, car.hasImage, car.imageUrl]);

  const brandModel = `${car.brand} ${car.model}`.trim();
  const priceLabel =
    car.price > 0 ? `${car.price.toLocaleString("th-TH")} บาท` : "ติดต่อสอบถาม";
  const mileageLabel =
    car.mileage > 0 ? `${car.mileage.toLocaleString("th-TH")} กม.` : "—";

  return (
    <article
      className="rounded-xl border border-(--nonga-border) bg-(--nonga-bg-surface) overflow-hidden shadow-xs hover:border-orange-500/35 transition-colors motion-reduce:transition-none"
      data-testid="chat-v2-vehicle-card"
      data-car-id={car.id}
    >
      <div className="aspect-[16/9] bg-(--nonga-bg-subtle) relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${brandModel} ปี ${car.year}`}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 nonga-text-muted">
            <ImageOff className="w-6 h-6 opacity-60" aria-hidden="true" />
            <span className="text-[10px]">ยังไม่มีรูปในระบบ</span>
          </div>
        )}
        {car.matchKind === "alternative" && (
          <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-amber-950">
            ทางเลือกใกล้เคียง
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="min-w-0">
          <h4 className="text-[13px] font-bold nonga-text-primary truncate leading-snug">
            {brandModel}
          </h4>
          <p className="text-[11px] nonga-text-muted mt-0.5">
            ปี {car.year} · ไมล์ {mileageLabel}
            {car.transmission ? ` · ${car.transmission}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-orange-700 dark:text-orange-400">
            {priceLabel}
          </span>
        </div>

        {car.fitReason?.trim() ? (
          <p className="text-[11px] nonga-text-secondary leading-relaxed rounded-lg border border-orange-500/15 bg-orange-500/5 px-2.5 py-1.5 break-words">
            {car.fitReason.trim()}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setView("car-details", car.id)}
          className="w-full min-h-10 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-(--nonga-border) bg-(--nonga-bg-subtle) text-xs font-semibold nonga-text-secondary hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-500/40 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
          data-testid="chat-v2-vehicle-card-detail-btn"
          aria-label={`ดูรายละเอียด ${brandModel} ปี ${car.year}`}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          ดูรายละเอียดและสถานะล่าสุด
        </button>
      </div>
    </article>
  );
}

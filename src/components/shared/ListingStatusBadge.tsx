import React from "react";

export type ListingStatusVariant =
  | "draft-pending"
  | "needs-review"
  | "needs-images"
  | "ready-publish"
  | "pending-review"
  | "published"
  | "hidden";

const STYLES: Record<
  ListingStatusVariant,
  { label: string; className: string }
> = {
  "draft-pending": {
    label: "ยังไม่ลงขาย",
    className: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  },
  "needs-review": {
    label: "ข้อมูลไม่ครบ",
    className: "bg-orange-500/15 text-orange-200 border-orange-500/30",
  },
  "needs-images": {
    label: "รอเพิ่มรูป",
    className: "bg-sky-500/15 text-sky-200 border-sky-500/30",
  },
  "ready-publish": {
    label: "พร้อมลงขาย",
    className: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  },
  "pending-review": {
    label: "รออนุมัติ",
    className: "bg-violet-500/15 text-violet-200 border-violet-500/30",
  },
  published: {
    label: "ลงขายแล้ว",
    className: "bg-green-500/15 text-green-200 border-green-500/30",
  },
  hidden: {
    label: "ปิดประกาศ",
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
};

/** Map inventory listingStatus → dealer-facing badge (v22.34). */
export function inventoryListingStatusVariant(
  listingStatus: string | null | undefined
): ListingStatusVariant {
  if (listingStatus === "pending_review") return "pending-review";
  if (listingStatus === "hidden") return "hidden";
  return "published";
}

export const DEALER_PENDING_REVIEW_GUIDANCE_TH =
  "ประกาศนี้ส่งให้ผู้ดูแลตรวจสอบแล้ว ยังไม่แสดงในตลาด";

interface Props {
  variant: ListingStatusVariant;
  publishReady?: boolean;
  missingImage?: boolean;
  className?: string;
}

export function ListingStatusBadge({
  variant,
  publishReady,
  missingImage = false,
  className = "",
}: Props) {
  const effectiveVariant =
    typeof publishReady === "boolean"
      ? draftPublishReadinessStatusVariant(publishReady, missingImage)
      : variant;
  const s = STYLES[effectiveVariant];
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.className} ${className}`}
    >
      {s.label}
    </span>
  );
}

/** สถานะประกาศร่างต้องอิง publish guard เป็นหลัก ไม่ใช่ record status เดิม */
export function draftPublishReadinessStatusVariant(
  publishReady: boolean,
  missingImage: boolean
): ListingStatusVariant {
  if (publishReady) return "ready-publish";
  if (missingImage) return "needs-images";
  return "needs-review";
}

export interface DraftCardStatusUi {
  variant: ListingStatusVariant;
  publishEnabled: boolean;
  needsConfidenceReview: boolean;
  needsSalesCopyReview: boolean;
}

export function resolveDraftCardStatusUi(input: {
  publishReady: boolean;
  missingImage: boolean;
  confidenceScore?: number;
  description?: string | null;
}): DraftCardStatusUi {
  const publishReady = input.publishReady === true;
  return {
    variant: draftPublishReadinessStatusVariant(
      publishReady,
      input.missingImage
    ),
    publishEnabled: publishReady,
    needsConfidenceReview:
      publishReady && Number(input.confidenceScore ?? 100) < 90,
    needsSalesCopyReview:
      publishReady && !String(input.description ?? "").trim(),
  };
}

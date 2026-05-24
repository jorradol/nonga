import React from "react";

export type ListingStatusVariant =
  | "draft-pending"
  | "needs-review"
  | "needs-images"
  | "ready-publish"
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
  published: {
    label: "ลงขายแล้ว",
    className: "bg-green-500/15 text-green-200 border-green-500/30",
  },
  hidden: {
    label: "ปิดประกาศ",
    className: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
};

interface Props {
  variant: ListingStatusVariant;
  className?: string;
}

export function ListingStatusBadge({ variant, className = "" }: Props) {
  const s = STYLES[variant];
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.className} ${className}`}
    >
      {s.label}
    </span>
  );
}

/** สถานะประกาศร่างจาก record ใน Dealer Portal */
export function draftRecordStatusVariant(
  status: "draft" | "needs_review",
  publishReady: boolean,
  missingImage: boolean
): ListingStatusVariant {
  if (status === "needs_review") return "needs-review";
  if (missingImage) return "needs-images";
  if (!publishReady) return "draft-pending";
  if (publishReady) return "ready-publish";
  return "draft-pending";
}

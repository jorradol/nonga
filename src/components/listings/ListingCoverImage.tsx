import { useState } from "react";
import { ImageOff } from "lucide-react";
import {
  LISTING_PLACEHOLDER_IMAGE,
  getListingPrimaryImage,
  type ListingImageFieldSource,
} from "../../utils/listingImages";

type Props = {
  listingId: string;
  alt?: string;
  className?: string;
  testId?: string;
  showPlaceholderIcon?: boolean;
  images?: string[];
} & ListingImageFieldSource;

/**
 * Listing cover image with intentional placeholder + broken-src fallback.
 */
export function ListingCoverImage({
  listingId,
  alt = "",
  className = "w-full h-full object-cover",
  testId = "listing-cover-image",
  showPlaceholderIcon = false,
  ...imageFields
}: Props) {
  const primary = getListingPrimaryImage({
    id: listingId,
    ...imageFields,
  });
  const [src, setSrc] = useState(primary);
  const isPlaceholder = src === LISTING_PLACEHOLDER_IMAGE;

  return (
    <>
      <img
        key={`${listingId}-${src}`}
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        data-testid={testId}
        onError={() => {
          if (src !== LISTING_PLACEHOLDER_IMAGE) {
            setSrc(LISTING_PLACEHOLDER_IMAGE);
          }
        }}
      />
      {showPlaceholderIcon && isPlaceholder ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/80 pointer-events-none"
          data-testid="listing-cover-image-placeholder"
          aria-hidden
        >
          <ImageOff className="w-6 h-6 text-slate-500" />
          <span className="text-[9px] text-slate-500">ยังไม่มีรูป</span>
        </div>
      ) : null}
    </>
  );
}

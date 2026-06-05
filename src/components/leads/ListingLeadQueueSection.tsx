import { SellerMaskedLeadQueuePanel } from "./SellerMaskedLeadQueuePanel";

type Props = {
  listingId: string;
  isListingOwnerContext?: boolean;
  isDarkMode?: boolean;
  onRevenueRelevantChange?: () => void | Promise<void>;
};

/**
 * Seller lead queue as an add-on below the listing card body — never in the image/actions flex row.
 */
export function ListingLeadQueueSection({
  listingId,
  isListingOwnerContext = false,
  isDarkMode = true,
  onRevenueRelevantChange,
}: Props) {
  return (
    <section
      className="w-full min-w-0 border-t border-slate-800/60 pt-3 mt-1"
      data-testid="listing-lead-queue-section"
      data-layout="listing-lead-queue-below-card"
    >
      <SellerMaskedLeadQueuePanel
        listingId={listingId}
        isListingOwnerContext={isListingOwnerContext}
        isDarkMode={isDarkMode}
        onRevenueRelevantChange={onRevenueRelevantChange}
      />
    </section>
  );
}

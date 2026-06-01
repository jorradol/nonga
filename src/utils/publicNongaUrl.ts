/** Public marketplace domain for user-facing links (share copy, posts). */
export const PUBLIC_NONGA_BASE_URL = "https://a.nongbot.org";

export function buildPublicListingDetailUrl(listingId: string): string {
  const id = listingId.trim();
  if (!id) return PUBLIC_NONGA_BASE_URL;
  return `${PUBLIC_NONGA_BASE_URL}/cars/${encodeURIComponent(id)}`;
}

export function resolvePublicMarketplaceUrl(detailPath: string): string {
  const path = detailPath.startsWith("/") ? detailPath : `/${detailPath}`;
  return `${PUBLIC_NONGA_BASE_URL}${path}`;
}

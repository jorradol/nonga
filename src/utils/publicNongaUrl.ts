import { isUiFixtureBuild } from "../fixture/uiFixtureMode";

/**
 * Public marketplace domain for user-facing links (share copy, posts).
 * Fixture builds must not embed Production hostname — Vite constant-folds this.
 */
export const PUBLIC_NONGA_BASE_URL: string = isUiFixtureBuild
  ? String(import.meta.env.VITE_NONGA_PUBLIC_BASE_URL || "https://nonga-staging-2026.web.app")
  : "https://a.nongbot.org";

export function buildPublicListingDetailUrl(listingId: string): string {
  const id = listingId.trim();
  if (!id) return PUBLIC_NONGA_BASE_URL;
  return `${PUBLIC_NONGA_BASE_URL}/cars/${encodeURIComponent(id)}`;
}

export function resolvePublicMarketplaceUrl(detailPath: string): string {
  const path = detailPath.startsWith("/") ? detailPath : `/${detailPath}`;
  return `${PUBLIC_NONGA_BASE_URL}${path}`;
}

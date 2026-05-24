/** นำทางไปหน้า Draft ใน Dealer Portal — ใช้ route เดิม /dealer/drafts */

export const DEALER_DRAFTS_PATH = "/dealer/drafts";
export const DEALER_DRAFT_FOCUS_PARAM = "focus";

export function buildDealerDraftUrl(draftId: string): string {
  const id = draftId.trim();
  return `${DEALER_DRAFTS_PATH}?${DEALER_DRAFT_FOCUS_PARAM}=${encodeURIComponent(id)}`;
}

export function parseDealerDraftFocusFromLocation(
  loc: Pick<Location, "pathname" | "search"> = typeof window !== "undefined"
    ? window.location
    : { pathname: "", search: "" }
): string | null {
  if (!loc.pathname.startsWith("/dealer/drafts")) return null;
  const raw = new URLSearchParams(loc.search).get(DEALER_DRAFT_FOCUS_PARAM);
  return raw?.trim() || null;
}

export function logDealerDraftEditUrl(draftId: string): void {
  try {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (!env?.DEV || typeof window === "undefined") return;
    const url = `${window.location.origin}${buildDealerDraftUrl(draftId)}`;
    console.debug("[NongA Chat draft edit URL]", url);
  } catch {
    // ignore
  }
}

/** เปิด Dealer Portal → แท็บ Draft และโฟกัสรายการ draftId */
export function navigateToSavedDealerDraft(
  draftId: string,
  setView: (view: "dealer-portal") => void
): void {
  if (typeof window === "undefined") return;
  const url = buildDealerDraftUrl(draftId);
  window.history.replaceState(null, "", url);
  setView("dealer-portal");
  window.dispatchEvent(new PopStateEvent("popstate"));
  logDealerDraftEditUrl(draftId);
}

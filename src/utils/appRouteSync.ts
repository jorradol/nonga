/**
 * Pathname-first routing. "/" and "/chat" = Chat; "/home" = orange Home page.
 */

export type RoutableAppView =
  | "home"
  | "marketplace"
  | "my-listings"
  | "chat"
  | "sell"
  | "dealers"
  | "saved"
  | "car-details"
  | "login"
  | "register"
  | "forgot-password"
  | "profile"
  | "onboarding"
  | "dealer-dashboard"
  | "admin-dashboard"
  | "inventory-import"
  | "dealer-draft-inventory"
  | "dealer-portal"
  | "search"
  | "car-vision"
  | "car-post-generator"
  | "viral-captions"
  | "seo-landing"
  | "dealer-showroom"
  | "billing"
  | "boost"
  | "pilot-policy"
  | "admin-reports"
  | "admin-pilot-users"
  | "admin-shadow-smoke";

/** Legacy keys that pinned home on "/" before chat-default routing. */
export const LEGACY_APP_VIEW_KEYS = [
  "nonga_current_view",
  "nonga_last_view",
  "nonga_active_view",
] as const;

export type PilotPolicySlug = "terms" | "privacy" | "listing";

export function resolvePilotPolicySlug(pathname: string): PilotPolicySlug | null {
  const path = pathname.toLowerCase();
  if (path === "/policy/terms") return "terms";
  if (path === "/policy/privacy") return "privacy";
  if (path === "/policy/listing") return "listing";
  return null;
}

export function clearLegacyPinnedHomeView(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_APP_VIEW_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const normalized = raw.replace(/^"|"$/g, "").trim().toLowerCase();
      if (normalized === "home") {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore quota / private mode
    }
  }
}

/** Legacy "/#chat" → "/" (canonical chat entry). */
export function normalizeLegacyHashRoute(): boolean {
  if (typeof window === "undefined") return false;
  const hash = (window.location.hash || "").trim().toLowerCase();
  if (!hash) return false;
  const isLegacyChat =
    hash === "#chat" || hash.startsWith("#chat/") || hash.startsWith("#chat?");
  if (!isLegacyChat) return false;
  const queryStart = hash.indexOf("?");
  const search = queryStart >= 0 ? hash.slice(queryStart) : "";
  window.history.replaceState(null, "", `/${search}`);
  return true;
}

export function isChatEntryPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return path === "/" || path === "/chat";
}

/** Public share links: /cars/{listingId} */
export function resolveCarIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/cars\/([^/]+)\/?$/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function resolveViewFromPathname(pathname: string): RoutableAppView {
  const path = pathname.toLowerCase();
  if (resolveCarIdFromPathname(pathname)) return "car-details";
  if (path === "/" || path === "/chat") return "chat";
  if (path === "/home") return "home";
  if (path === "/marketplace") return "marketplace";
  if (path === "/my-listings") return "my-listings";
  if (path === "/dealers") return "dealers";
  if (path === "/sell") return "sell";
  if (path === "/saved") return "saved";
  if (path === "/search") return "search";
  if (path === "/login") return "login";
  if (path === "/profile") return "profile";
  if (path === "/onboarding") return "onboarding";
  if (path === "/viral-captions") return "viral-captions";
  if (path === "/car-vision") return "car-vision";
  if (path === "/car-post-generator") return "car-post-generator";
  if (path === "/seo-landing") return "seo-landing";
  if (path === "/register") return "register";
  if (path === "/forgot-password") return "forgot-password";
  if (path === "/admin/inventory-import") return "inventory-import";
  if (path === "/admin/draft-inventory") return "dealer-draft-inventory";
  if (path === "/admin/reports") return "admin-reports";
  if (path === "/admin/pilot-users") return "admin-pilot-users";
  if (path === "/admin/shadow-smoke") return "admin-shadow-smoke";
  if (path === "/admin/dashboard" || path === "/admin") return "admin-dashboard";
  if (path.startsWith("/dealer")) return "dealer-portal";
  if (resolvePilotPolicySlug(path)) return "pilot-policy";
  return "chat";
}

export function resolvePathnameForView(
  view: RoutableAppView,
  currentPath: string
): string | null {
  if (view === "dealer-portal") {
    return currentPath.startsWith("/dealer") ? currentPath : "/dealer";
  }
  const path = currentPath.toLowerCase();
  switch (view) {
    case "home":
      return "/home";
    case "chat":
      if (path === "/" || path === "/chat") return null;
      return "/";
    case "marketplace":
      return "/marketplace";
    case "my-listings":
      return "/my-listings";
    case "dealers":
      return "/dealers";
    case "sell":
      return "/sell";
    case "saved":
      return "/saved";
    case "search":
      return "/search";
    case "onboarding":
      return "/onboarding";
    case "viral-captions":
      return "/viral-captions";
    case "car-vision":
      return "/car-vision";
    case "car-post-generator":
      return "/car-post-generator";
    case "seo-landing":
      return "/seo-landing";
    case "login":
      return "/login";
    case "profile":
      return "/profile";
    case "register":
      return "/register";
    case "forgot-password":
      return "/forgot-password";
    case "inventory-import":
      return "/admin/inventory-import";
    case "dealer-draft-inventory":
      return "/admin/draft-inventory";
    case "admin-reports":
      return "/admin/reports";
    case "admin-pilot-users":
      return "/admin/pilot-users";
    case "admin-shadow-smoke":
      return "/admin/shadow-smoke";
    case "admin-dashboard":
      return "/admin/dashboard";
    case "car-details":
      return null;
    case "pilot-policy":
      return resolvePilotPolicySlug(currentPath) ? null : "/policy/terms";
    default:
      return null;
  }
}

export function bootstrapAppRouteState(): void {
  if (typeof window === "undefined") return;
  normalizeLegacyHashRoute();
  clearLegacyPinnedHomeView();
}

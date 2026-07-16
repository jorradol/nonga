/**
 * P8A — Hide Unready Public SEO Surface (static + route redirect regression)
 * npm run test:p8a-hide-unready-public-seo-surface
 */
import { existsSync, readFileSync } from "node:fs";
import {
  bootstrapAppRouteState,
  redirectUnreadyPublicSeoLandingPath,
  resolvePathnameForView,
  resolveViewFromPathname,
} from "../src/utils/appRouteSync.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== P8A Hide Unready Public SEO Surface ===\n");

const header = readFileSync("src/components/Header.tsx", "utf8");
const routeSync = readFileSync("src/utils/appRouteSync.ts", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- Nav removal (desktop + mobile share navItems / sandboxNavItems) ---
ok(
  "Header nav omits SEO หน้าพิเศษ label",
  !header.includes("SEO หน้าพิเศษ")
);
ok(
  "Header sandboxNavItems omits seo-landing id",
  !/sandboxNavItems[\s\S]*id:\s*"seo-landing"/.test(header)
);
ok(
  "Header keeps car-vision sandbox nav",
  header.includes('id: "car-vision"')
);
ok(
  "Header keeps car-post-generator sandbox nav",
  header.includes('id: "car-post-generator"')
);
ok(
  "Header keeps viral-captions sandbox nav",
  header.includes('id: "viral-captions"')
);
ok(
  "Header keeps marketplace / chat / search public nav",
  header.includes('id: "marketplace"') &&
    header.includes('id: "chat"') &&
    header.includes('id: "search"')
);

// --- Direct URL → Home view ---
ok(
  "direct /seo-landing resolves to home view",
  resolveViewFromPathname("/seo-landing") === "home"
);
ok(
  "direct /Seo-Landing (case) resolves to home view",
  resolveViewFromPathname("/Seo-Landing") === "home"
);
ok(
  "seo-landing view pathname canonicalizes to /home",
  resolvePathnameForView("seo-landing", "/") === "/home"
);
ok(
  "direct /seo-landing does not resolve to seo-landing view",
  resolveViewFromPathname("/seo-landing") !== "seo-landing"
);

// --- URL rewrite on bootstrap / refresh path ---
ok(
  "bootstrapAppRouteState calls SEO redirect helper",
  /redirectUnreadyPublicSeoLandingPath\(\)/.test(routeSync) &&
    /export function bootstrapAppRouteState/.test(routeSync)
);
ok(
  "redirect helper replaceState targets /home",
  /replaceState\(null,\s*""\,\s*`\/home\$\{search\}\$\{hash\}`\)/.test(routeSync) ||
    /replaceState\(null,\s*""\,\s*"\/home/.test(routeSync)
);

{
  let replaceCalls = 0;
  let currentPath = "/seo-landing";
  let currentSearch = "?from=test";
  let currentHash = "#anchor";
  const previousWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window: unknown }).window = {
    location: {
      get pathname() {
        return currentPath;
      },
      get search() {
        return currentSearch;
      },
      get hash() {
        return currentHash;
      },
    },
    history: {
      replaceState(_state: unknown, _title: string, url: string) {
        replaceCalls += 1;
        const parsed = new URL(url, "https://nonga.example");
        currentPath = parsed.pathname;
        currentSearch = parsed.search;
        currentHash = parsed.hash;
      },
    },
  };

  const redirected = redirectUnreadyPublicSeoLandingPath();
  ok("redirectUnreadyPublicSeoLandingPath returns true on /seo-landing", redirected);
  ok("redirect rewrite pathname is /home", currentPath === "/home");
  ok("redirect preserves search", currentSearch === "?from=test");
  ok("redirect preserves hash", currentHash === "#anchor");
  ok("redirect called replaceState once", replaceCalls === 1);

  // Refresh / second bootstrap on already-rewritten URL is a no-op
  const second = redirectUnreadyPublicSeoLandingPath();
  ok("redirect is no-op after URL is /home (refresh-safe)", second === false);
  ok("refresh path stays /home", currentPath === "/home");

  bootstrapAppRouteState();
  ok("bootstrap on /home does not re-rewrite", replaceCalls === 1);

  // Simulate fresh direct open again
  currentPath = "/seo-landing";
  currentSearch = "";
  currentHash = "";
  bootstrapAppRouteState();
  ok("bootstrap on /seo-landing rewrites to /home", currentPath === "/home");

  if (previousWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window: unknown }).window = previousWindow;
  }
}

// --- Core routes unchanged ---
ok("home path still maps to home", resolveViewFromPathname("/home") === "home");
ok("marketplace path still maps to marketplace", resolveViewFromPathname("/marketplace") === "marketplace");
ok("chat path still maps to chat", resolveViewFromPathname("/chat") === "chat");
ok("search path still maps to search", resolveViewFromPathname("/search") === "search");
ok("root still maps to chat", resolveViewFromPathname("/") === "chat");
ok(
  "car-post-generator still maps correctly",
  resolveViewFromPathname("/car-post-generator") === "car-post-generator"
);
ok(
  "viral-captions still maps correctly",
  resolveViewFromPathname("/viral-captions") === "viral-captions"
);

// --- Backlog preserved (do not delete core SEO code) ---
ok(
  "SeoLandingDashboard component file kept (backlog)",
  existsSync("src/components/seo/SeoLandingDashboard.tsx")
);
ok(
  "seoService file kept (backlog)",
  existsSync("src/services/seo/seoService.ts")
);
ok(
  "App still retains seo-landing case (backlog mount)",
  /case "seo-landing":[\s\S]*<SeoLandingDashboard/.test(app)
);
ok(
  "RoutableAppView still includes seo-landing type (backlog)",
  /\| "seo-landing"/.test(routeSync)
);

ok(
  "package script registered",
  pkg.includes("test:p8a-hide-unready-public-seo-surface")
);
ok(
  "route sync scope: no gemini provider imports",
  !/gemini|GenerativeModel|@google\/generative-ai/i.test(routeSync)
);
ok(
  "route sync scope: no firestore writes",
  !/firestore|DealerLeads|collection\(/i.test(routeSync)
);
ok(
  "Header scope: no Cloud Run / lead / signup changes",
  !/cloud run|cloudrun|buyerLead|PUBLIC_SIGNUP/i.test(header)
);

console.log("\nDone P8A hide unready public SEO surface.\n");

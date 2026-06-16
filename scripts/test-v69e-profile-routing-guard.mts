/**
 * v6.9E-B — /profile routing guard (static validation only)
 * npm run test:v69e-profile-routing-guard
 */
import { readFileSync } from "node:fs";
import {
  isChatEntryPath,
  resolvePathnameForView,
  resolveViewFromPathname,
} from "../src/utils/appRouteSync.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.9E-B Profile Routing Guard ===\n");

const routeSync = readFileSync("src/utils/appRouteSync.ts", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const dealerEntry = readFileSync("src/utils/dealerEntryNavigation.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok("profile path maps to profile view", resolveViewFromPathname("/profile") === "profile");
ok(
  "profile path case-insensitive",
  resolveViewFromPathname("/Profile") === "profile"
);
ok(
  "profile view maps to /profile pathname",
  resolvePathnameForView("profile", "/") === "/profile"
);
ok("profile not chat entry path", !isChatEntryPath("/profile"));
ok(
  "profile path does not fallback to chat",
  resolveViewFromPathname("/profile") !== "chat"
);

ok(
  "resolveViewFromPathname includes profile route",
  /path === "\/profile"\) return "profile"/.test(routeSync)
);
ok(
  "resolvePathnameForView includes profile case",
  /case "profile":[\s\S]*return "\/profile"/.test(routeSync)
);
ok(
  "App renders UserProfileView with RequireMember",
  /case "profile":[\s\S]*RequireMember[\s\S]*UserProfileView/.test(app)
);

ok(
  "billing path still falls back to chat",
  resolveViewFromPathname("/billing") === "chat"
);
ok(
  "boost path still falls back to chat",
  resolveViewFromPathname("/boost") === "chat"
);
ok(
  "dealer-dashboard path still maps to dealer-portal",
  resolveViewFromPathname("/dealer-dashboard") === "dealer-portal"
);
ok(
  "dealer-showroom path still maps to dealer-portal",
  resolveViewFromPathname("/dealer-showroom") === "dealer-portal"
);
ok(
  "no billing mapping in route sync",
  !/path === "\/billing"\) return "billing"/.test(routeSync)
);
ok(
  "no boost mapping in route sync",
  !/path === "\/boost"\) return "boost"/.test(routeSync)
);
ok(
  "no dealer-dashboard mapping in route sync",
  !/path === "\/dealer-dashboard"\) return "dealer-dashboard"/.test(routeSync)
);
ok(
  "no dealer-showroom mapping in route sync",
  !/path === "\/dealer-showroom"\) return "dealer-showroom"/.test(routeSync)
);

ok(
  "v6.9C onboarding path still maps to onboarding",
  resolveViewFromPathname("/onboarding") === "onboarding"
);
ok(
  "v6.9C viral-captions path still maps to viral-captions",
  resolveViewFromPathname("/viral-captions") === "viral-captions"
);
ok(
  "v6.9D car-vision path still maps to car-vision",
  resolveViewFromPathname("/car-vision") === "car-vision"
);
ok(
  "v6.9D car-post-generator path still maps to car-post-generator",
  resolveViewFromPathname("/car-post-generator") === "car-post-generator"
);
ok(
  "v6.9D seo-landing path still maps to seo-landing",
  resolveViewFromPathname("/seo-landing") === "seo-landing"
);
ok("home path still maps to home", resolveViewFromPathname("/home") === "home");
ok("chat path still maps to chat", resolveViewFromPathname("/chat") === "chat");
ok("search path still maps to search", resolveViewFromPathname("/search") === "search");
ok("login path still maps to login", resolveViewFromPathname("/login") === "login");
ok("root still maps to chat", resolveViewFromPathname("/") === "chat");
ok(
  "unknown path still defaults to chat",
  resolveViewFromPathname("/unknown-path") === "chat"
);

ok(
  "dealer entry navigation still writes /profile",
  dealerEntry.includes('"/profile"')
);
ok(
  "package script registered",
  pkg.includes("test:v69e-profile-routing-guard")
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
  "route sync scope: no deploy config",
  !/firebase\.json|cloud run|cloudrun/i.test(routeSync)
);
ok(
  "route sync scope: no payment backend imports",
  !/paymentService|invoiceService|stripe/i.test(routeSync)
);

console.log("\nDone v6.9E-B profile routing guard.\n");

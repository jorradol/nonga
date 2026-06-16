/**
 * v6.9C — /onboarding and /viral-captions routing guard (static validation only)
 * npm run test:v69c-onboarding-viral-captions-routing-guard
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

console.log("=== v6.9C Onboarding + Viral Captions Routing Guard ===\n");

const routeSync = readFileSync("src/utils/appRouteSync.ts", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok("onboarding path maps to onboarding view", resolveViewFromPathname("/onboarding") === "onboarding");
ok(
  "viral-captions path maps to viral-captions view",
  resolveViewFromPathname("/viral-captions") === "viral-captions"
);
ok(
  "onboarding path case-insensitive",
  resolveViewFromPathname("/Onboarding") === "onboarding"
);
ok(
  "viral-captions path case-insensitive",
  resolveViewFromPathname("/Viral-Captions") === "viral-captions"
);
ok("chat path still maps to chat", resolveViewFromPathname("/chat") === "chat");
ok("home path still maps to home", resolveViewFromPathname("/home") === "home");
ok("search path still maps to search", resolveViewFromPathname("/search") === "search");
ok("login path still maps to login", resolveViewFromPathname("/login") === "login");
ok("root still maps to chat", resolveViewFromPathname("/") === "chat");
ok(
  "onboarding view maps to /onboarding pathname",
  resolvePathnameForView("onboarding", "/") === "/onboarding"
);
ok(
  "viral-captions view maps to /viral-captions pathname",
  resolvePathnameForView("viral-captions", "/") === "/viral-captions"
);
ok(
  "onboarding not chat entry path",
  !isChatEntryPath("/onboarding")
);
ok(
  "viral-captions not chat entry path",
  !isChatEntryPath("/viral-captions")
);
ok(
  "known onboarding path does not fallback to chat",
  resolveViewFromPathname("/onboarding") !== "chat"
);
ok(
  "known viral-captions path does not fallback to chat",
  resolveViewFromPathname("/viral-captions") !== "chat"
);
ok(
  "unknown path still defaults to chat",
  resolveViewFromPathname("/unknown-path") === "chat"
);

ok(
  "resolveViewFromPathname includes onboarding route",
  /path === "\/onboarding"\) return "onboarding"/.test(routeSync)
);
ok(
  "resolveViewFromPathname includes viral-captions route",
  /path === "\/viral-captions"\) return "viral-captions"/.test(routeSync)
);
ok(
  "resolvePathnameForView includes onboarding case",
  /case "onboarding":[\s\S]*return "\/onboarding"/.test(routeSync)
);
ok(
  "resolvePathnameForView includes viral-captions case",
  /case "viral-captions":[\s\S]*return "\/viral-captions"/.test(routeSync)
);
ok("App renders OnboardingView case", /case "onboarding":[\s\S]*<OnboardingView/.test(app));
ok(
  "App renders CaptionEngineDashboard case",
  /case "viral-captions":[\s\S]*<CaptionEngineDashboard/.test(app)
);
ok(
  "store uses resolveViewFromPathname for enforcePathnameView",
  store.includes("resolveViewFromPathname(pathname)")
);
ok(
  "package script registered",
  pkg.includes("test:v69c-onboarding-viral-captions-routing-guard")
);
ok(
  "route sync scope: no gemini provider imports",
  !/gemini|GenerativeModel|@google\/generative-ai/i.test(routeSync)
);
ok(
  "route sync scope: no firestore writes",
  !/firestore|DealerLeads|collection\(/i.test(routeSync)
);

console.log("\nDone v6.9C onboarding + viral-captions routing guard.\n");

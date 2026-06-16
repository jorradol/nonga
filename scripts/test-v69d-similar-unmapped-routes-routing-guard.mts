/**
 * v6.9D — /car-vision, /car-post-generator, /seo-landing routing guard (static validation only)
 * npm run test:v69d-similar-unmapped-routes-routing-guard
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

console.log("=== v6.9D Similar Unmapped Routes Routing Guard ===\n");

const routeSync = readFileSync("src/utils/appRouteSync.ts", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "car-vision path maps to car-vision view",
  resolveViewFromPathname("/car-vision") === "car-vision"
);
ok(
  "car-post-generator path maps to car-post-generator view",
  resolveViewFromPathname("/car-post-generator") === "car-post-generator"
);
ok(
  "seo-landing path maps to seo-landing view",
  resolveViewFromPathname("/seo-landing") === "seo-landing"
);
ok(
  "car-vision path case-insensitive",
  resolveViewFromPathname("/Car-Vision") === "car-vision"
);
ok(
  "car-post-generator path case-insensitive",
  resolveViewFromPathname("/Car-Post-Generator") === "car-post-generator"
);
ok(
  "seo-landing path case-insensitive",
  resolveViewFromPathname("/Seo-Landing") === "seo-landing"
);
ok(
  "car-vision view maps to /car-vision pathname",
  resolvePathnameForView("car-vision", "/") === "/car-vision"
);
ok(
  "car-post-generator view maps to /car-post-generator pathname",
  resolvePathnameForView("car-post-generator", "/") === "/car-post-generator"
);
ok(
  "seo-landing view maps to /seo-landing pathname",
  resolvePathnameForView("seo-landing", "/") === "/seo-landing"
);
ok("car-vision not chat entry path", !isChatEntryPath("/car-vision"));
ok(
  "car-post-generator not chat entry path",
  !isChatEntryPath("/car-post-generator")
);
ok("seo-landing not chat entry path", !isChatEntryPath("/seo-landing"));
ok(
  "car-vision path does not fallback to chat",
  resolveViewFromPathname("/car-vision") !== "chat"
);
ok(
  "car-post-generator path does not fallback to chat",
  resolveViewFromPathname("/car-post-generator") !== "chat"
);
ok(
  "seo-landing path does not fallback to chat",
  resolveViewFromPathname("/seo-landing") !== "chat"
);

ok(
  "v6.9C onboarding path still maps to onboarding",
  resolveViewFromPathname("/onboarding") === "onboarding"
);
ok(
  "v6.9C viral-captions path still maps to viral-captions",
  resolveViewFromPathname("/viral-captions") === "viral-captions"
);
ok("home path still maps to home", resolveViewFromPathname("/home") === "home");
ok("chat path still maps to chat", resolveViewFromPathname("/chat") === "chat");
ok("search path still maps to search", resolveViewFromPathname("/search") === "search");
ok("root still maps to chat", resolveViewFromPathname("/") === "chat");
ok(
  "unknown path still defaults to chat",
  resolveViewFromPathname("/unknown-path") === "chat"
);

ok(
  "resolveViewFromPathname includes car-vision route",
  /path === "\/car-vision"\) return "car-vision"/.test(routeSync)
);
ok(
  "resolveViewFromPathname includes car-post-generator route",
  /path === "\/car-post-generator"\) return "car-post-generator"/.test(routeSync)
);
ok(
  "resolveViewFromPathname includes seo-landing route",
  /path === "\/seo-landing"\) return "seo-landing"/.test(routeSync)
);
ok(
  "resolvePathnameForView includes car-vision case",
  /case "car-vision":[\s\S]*return "\/car-vision"/.test(routeSync)
);
ok(
  "resolvePathnameForView includes car-post-generator case",
  /case "car-post-generator":[\s\S]*return "\/car-post-generator"/.test(routeSync)
);
ok(
  "resolvePathnameForView includes seo-landing case",
  /case "seo-landing":[\s\S]*return "\/seo-landing"/.test(routeSync)
);
ok(
  "App renders CarVisionDashboard case",
  /case "car-vision":[\s\S]*<CarVisionDashboard/.test(app)
);
ok(
  "App renders PostGeneratorDashboard case",
  /case "car-post-generator":[\s\S]*<PostGeneratorDashboard/.test(app)
);
ok(
  "App renders SeoLandingDashboard case",
  /case "seo-landing":[\s\S]*<SeoLandingDashboard/.test(app)
);
ok(
  "store uses resolveViewFromPathname for enforcePathnameView",
  store.includes("resolveViewFromPathname(pathname)")
);
ok(
  "package script registered",
  pkg.includes("test:v69d-similar-unmapped-routes-routing-guard")
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

console.log("\nDone v6.9D similar unmapped routes routing guard.\n");

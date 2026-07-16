/**
 * v6.9A Phase 1 — Light mode contrast guard (static validation only)
 * npm run test:v69a-light-mode-contrast-phase1-guard
 *
 * Scans Phase 1 quick-win files for always-white text anti-patterns on light surfaces.
 * No fetch, no deploy, no runtime changes.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PHASE1_FILES = [
  "src/App.tsx",
  "src/components/Header.tsx",
  "src/components/OnboardingView.tsx",
  "src/components/captions/CaptionEngineDashboard.tsx",
  "src/components/cars/details/CarDetailsView.tsx",
  "src/components/cars/details/AIDynamicAnalysis.tsx",
  "src/components/cars/details/SellerCard.tsx",
  "src/components/cars/details/SpecificationsList.tsx",
  "src/components/cars/details/FinancingCalculator.tsx",
  "src/components/cars/details/CommentsSection.tsx",
  "src/components/HomeView.tsx",
] as const;

const BANNED_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    name: "text-white dark:text-white",
    pattern: /text-white\s+dark:text-white/,
  },
  {
    name: "text-slate-100 dark:text-slate-100",
    pattern: /text-slate-100\s+dark:text-slate-100/,
  },
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "chat") continue; // Phase 1: dark island excluded
      walkTsx(full, acc);
    } else if (entry.endsWith(".tsx")) {
      acc.push(full.replace(/\\/g, "/"));
    }
  }
  return acc;
}

console.log("=== v6.9A Light Mode Contrast Phase 1 Guard ===\n");

const pkg = readFileSync("package.json", "utf8");
ok(
  "package script registered",
  pkg.includes("test:v69a-light-mode-contrast-phase1-guard")
);

for (const filePath of PHASE1_FILES) {
  const src = readFileSync(filePath, "utf8");
  ok(`${filePath} exists`, src.length > 0);

  for (const { name, pattern } of BANNED_PATTERNS) {
    ok(`${filePath} no ${name}`, !pattern.test(src));
  }
}

{
  const app = readFileSync("src/App.tsx", "utf8");
  ok("App footer brand light text", /text-slate-900\s+dark:text-white/.test(app));
  ok(
    "App footer description light text",
    /text-slate-600\s+dark:text-slate-400/.test(app)
  );
  ok(
    "App trust panel light text",
    /text-slate-700\s+dark:text-slate-350/.test(app)
  );
}

{
  const header = readFileSync("src/components/Header.tsx", "utf8");
  ok(
    "Header mobile drawer brand light text",
    /text-slate-900\s+dark:text-white/.test(header)
  );
}

{
  const onboarding = readFileSync("src/components/OnboardingView.tsx", "utf8");
  ok(
    "Onboarding persona title light text",
    /text-slate-900\s+dark:text-slate-100/.test(onboarding)
  );
}

{
  const captions = readFileSync(
    "src/components/captions/CaptionEngineDashboard.tsx",
    "utf8"
  );
  ok(
    "Caption empty-state heading light text",
    /text-slate-900\s+dark:text-white/.test(captions)
  );
  ok(
    "Caption hook score heading no forced white",
    !/font-black text-sm text-white/.test(captions)
  );
  ok(
    "Caption uses semantic surfaces",
    captions.includes("nonga-bg-surface") &&
      captions.includes("nonga-bg-elevated") &&
      captions.includes("nonga-text-primary") &&
      captions.includes("nonga-text-secondary") &&
      captions.includes("nonga-placeholder")
  );
  ok(
    "Caption no navy input/card surfaces",
    !captions.includes("bg-slate-950") &&
      !captions.includes("bg-[#0f0f11]") &&
      !captions.includes("bg-[#0b0c0f]") &&
      !captions.includes("dark:bg-black/80")
  );
  ok(
    "Caption primary action contract",
    captions.includes("nonga-action") &&
      captions.includes("handleGenerateCaption")
  );
  ok(
    "Caption no hard-coded isDarkMode color branches",
    !/isDarkMode\s*\?\s*"[^"]*bg-slate/.test(captions) &&
      !/isDarkMode\s*\?\s*"bg-\[#/.test(captions)
  );
}

{
  const carDetails = readFileSync(
    "src/components/cars/details/CarDetailsView.tsx",
    "utf8"
  );
  const ai = readFileSync(
    "src/components/cars/details/AIDynamicAnalysis.tsx",
    "utf8"
  );
  const seller = readFileSync(
    "src/components/cars/details/SellerCard.tsx",
    "utf8"
  );
  const specs = readFileSync(
    "src/components/cars/details/SpecificationsList.tsx",
    "utf8"
  );

  ok(
    "CarDetails title uses semantic primary (no forced white)",
    carDetails.includes("nonga-text-primary") &&
      !/font-black text-xl sm:text-2xl text-white/.test(carDetails)
  );
  ok(
    "CarDetails price uses action-primary token",
    carDetails.includes("text-[var(--nonga-action-primary)]") &&
      carDetails.includes("฿{car.price.toLocaleString()}")
  );
  ok(
    "CarDetails listing tone follows theme",
    /tone=\{isDarkMode \? "dark" : "light"\}/.test(carDetails)
  );
  ok(
    "CarDetails uses semantic surfaces",
    carDetails.includes("nonga-bg-surface") &&
      carDetails.includes("nonga-bg-elevated") &&
      carDetails.includes("nonga-text-secondary")
  );
  ok(
    "CarDetails no dark-first title/surface pairing on main card",
    !/bg-slate-900\/40 border-white\/\[0\.06\]/.test(carDetails)
  );
  ok(
    "AI analysis uses semantic text/surfaces",
    ai.includes("nonga-text-primary") &&
      ai.includes("nonga-text-secondary") &&
      ai.includes("nonga-bg-surface") &&
      !/font-black text-lg text-white/.test(ai)
  );
  ok(
    "Seller card uses semantic primary name",
    seller.includes("nonga-text-primary") &&
      !/font-black text-\[15px\] text-white/.test(seller)
  );
  ok(
    "Specifications label/value semantic pairing",
    specs.includes("nonga-text-muted") &&
      specs.includes("nonga-text-primary") &&
      !/font-bold text-slate-100/.test(specs)
  );
}

{
  const home = readFileSync("src/components/HomeView.tsx", "utf8");
  ok(
    "Home simulator preview uses semantic elevated surface",
    home.includes("nonga-bg-elevated") &&
      !home.includes('bg-[#0c0c0e]') &&
      !home.includes('bg-[#111113]') &&
      !home.includes('bg-[#141417]')
  );
  ok(
    "Home simulator chat bubble theme-aware",
    home.includes("nonga-bg-surface border nonga-border nonga-text-primary") &&
      !/bg-\[#141417\] border border-white\/\[0\.04\] text-slate-200/.test(home)
  );
  ok(
    "Home simulator footer uses semantic secondary",
    /nonga-text-secondary font-mono/.test(home) &&
      !/text-xs text-slate-500 font-mono/.test(home)
  );
  ok(
    "Home simulator vehicle metadata readable tokens",
    home.includes("Honda CR-V 2.4 EL") &&
      /nonga-text-primary">Honda CR-V 2.4 EL/.test(home) &&
      home.includes("nonga-text-secondary block")
  );
  ok(
    "Home utilities cards drop forced white borders",
    !home.includes("border-white/[0.05]")
  );
  ok(
    "Home simulator behavior shell preserved",
    home.includes("handleSimulatorUpload") &&
      home.includes("resetSimulator") &&
      home.includes("simulatorStep") &&
      home.includes('setView("sell")')
  );
}

let repoAntiPatternCount = 0;
const otherTsx = walkTsx("src/components").filter(
  (p) => !(PHASE1_FILES as readonly string[]).includes(p)
);
for (const filePath of otherTsx) {
  const src = readFileSync(filePath, "utf8");
  for (const { pattern } of BANNED_PATTERNS) {
    if (pattern.test(src)) {
      repoAntiPatternCount += 1;
      break;
    }
  }
}
ok(
  "repo advisory other anti-pattern files (Phase 2+)",
  true,
  repoAntiPatternCount === 0
    ? "none outside Phase 1 files"
    : `${repoAntiPatternCount} file(s) — deferred to Phase 2+`
);

console.log("\nDone v6.9A light mode contrast Phase 1 guard.\n");

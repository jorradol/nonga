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

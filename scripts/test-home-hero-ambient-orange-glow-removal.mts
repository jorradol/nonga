/**
 * Guard — Public Home Hero Ambient Orange Glow Removal
 * Asserts home-landing-hero no longer ships the rectangular orange blur/glow
 * backdrop behind the hero copy group.
 *
 * Run: npx tsx scripts/test-home-hero-ambient-orange-glow-removal.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const homeViewPath = path.join(root, "src/components/HomeView.tsx");
const homeView = fs.readFileSync(homeViewPath, "utf8");

const heroMatch = homeView.match(/id="home-landing-hero"[\s\S]*?<\/section>/);
const heroBlock = heroMatch?.[0] ?? "";

console.log("--- HomeView hero ambient orange glow removed ---");

ok("home-landing-hero-block-found", Boolean(heroMatch), "");

ok(
  "no-ambient-background-light-circle-comment",
  !heroBlock.includes("Ambient background light circle"),
  ""
);

ok(
  "no-hero-orange-amber-red-blur-glow",
  !heroBlock.includes(
    "from-orange-500/10 via-amber-500/10 to-red-600/5 blur-[120px]"
  ),
  ""
);

ok(
  "no-hero-absolute-blur-backdrop-div",
  !/absolute[^>]*blur-\[120px\]/.test(heroBlock) &&
    !/blur-\[120px\][^>]*absolute/.test(heroBlock),
  ""
);

// Brand accents that must remain (not background glow)
ok("keeps-nonga-brand-word", heroBlock.includes("น้องเอ"), "");
ok(
  "keeps-highlight-tag-orange",
  heroBlock.includes("bg-orange-500/10 text-orange-500"),
  ""
);
ok(
  "keeps-primary-cta-orange-shadow",
  heroBlock.includes("shadow-orange-600/25"),
  ""
);

if (process.exitCode) {
  console.log("RESULT FAIL");
  process.exit(1);
}
console.log("RESULT PASS");

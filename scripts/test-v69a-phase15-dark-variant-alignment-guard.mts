/**
 * v6.9A Phase 1.5 — Class-only dark variant alignment guard (static validation)
 * npm run test:v69a-phase15-dark-variant-alignment-guard
 *
 * Ensures Tailwind `dark:` follows app `.dark` class (Zustand toggle), not OS preference.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.9A Phase 1.5 Dark Variant Alignment Guard ===\n");

const pkg = readFileSync("package.json", "utf8");
ok(
  "package script registered",
  pkg.includes("test:v69a-phase15-dark-variant-alignment-guard")
);

const css = readFileSync("src/index.css", "utf8");
ok(
  "index.css class-only dark custom variant",
  /@custom-variant\s+dark\s+\(&:where\(\.dark,\s*\.dark\s*\*\)\);/.test(css)
);
ok(
  "index.css no prefers-color-scheme dark variant override",
  !/@custom-variant\s+dark[^;]*prefers-color-scheme/.test(css)
);
ok(
  "index.css no OS dark media hook for theme",
  !/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/.test(css)
);

const store = readFileSync("src/store.ts", "utf8");
ok(
  "store toggleDarkMode syncs .dark on documentElement",
  /document\.documentElement\.classList\.toggle\(\s*["']dark["']/.test(store)
);
ok(
  "store initial .dark bootstrap for default isDarkMode",
  /useAppStore\.getState\(\)\.isDarkMode/.test(store) &&
    /documentElement\.classList\.add\(\s*["']dark["']\s*\)/.test(store)
);

console.log("\n--- Phase 1 contrast guard (regression) ---\n");
execSync("npm run test:v69a-light-mode-contrast-phase1-guard", {
  stdio: "inherit",
});

console.log("\n--- Built CSS dark variant strategy (post-build spot check) ---\n");
execSync("npm run build:staging:hosting", { stdio: "pipe" });

const cssAsset = readdirSync("dist/assets").find((f) => /^index-.*\.css$/.test(f));
const builtCss = cssAsset ? readFileSync(`dist/assets/${cssAsset}`, "utf8") : "";

ok("built CSS bundle exists", builtCss.length > 0, cssAsset ?? "missing");

if (builtCss.length > 0) {
  const osMediaDarkBlocks =
    builtCss.match(
      /@media\s*\([^)]*prefers-color-scheme:\s*dark[^)]*\)[^{]*\{[^}]*\.dark\\:/g
    ) ?? [];
  ok(
    "built CSS dark: utilities not gated by prefers-color-scheme",
    osMediaDarkBlocks.length === 0,
    osMediaDarkBlocks.length === 0
      ? "no OS-media dark: blocks found"
      : `${osMediaDarkBlocks.length} OS-media dark: block(s) found`
  );
  ok(
    "built CSS contains class-scoped dark selectors",
    /\.dark\\:/.test(builtCss) || /\.dark\s+\./.test(builtCss),
    cssAsset
  );
}

console.log("\nDone v6.9A Phase 1.5 dark variant alignment guard.\n");

/**
 * Guard: canonical Thai loopless font (Anuphan) must not change accidentally.
 *
 * Evidence baseline (verified 2026-07-18, commit 8c48147):
 * - The font stack has been identical since the repo's first commit (34b95fd):
 *   Google Fonts import (Inter, Space Grotesk, JetBrains Mono, Anuphan 200..700)
 *   + --font-sans: "Inter", "Anuphan", ... in src/index.css.
 * - Anuphan is the canonical Thai loopless font Owner approved; Thai glyphs
 *   render via Anuphan on live staging (CDP CSS.getPlatformFontsForNode).
 * - The isolated fixture build (scripts/vite-hosting-only-fixture-plugin.mts)
 *   intentionally strips Google Fonts for isolation — that must stay scoped to
 *   the fixture build only and never leak into the canonical staging build.
 *
 * Run: npm run test:canonical-thai-font-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Canonical Thai font guard ===\n");

const css = readFileSync("src/index.css", "utf8");
const html = readFileSync("index.html", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:canonical-thai-font-guard")
);

// --- Font source: single Google Fonts import with Anuphan variable weights ---
const importMatches = css.match(/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\)/g) ?? [];
ok("exactly one Google Fonts @import in index.css", importMatches.length === 1);
const importLine = importMatches[0] ?? "";
ok("import includes Anuphan wght 200..700", /family=Anuphan:wght@200\.\.700/.test(importLine));
ok("import includes Inter", /family=Inter:/.test(importLine));
ok("import includes Space Grotesk", /family=Space\+Grotesk:/.test(importLine));
ok("import includes JetBrains Mono", /family=JetBrains\+Mono:/.test(importLine));
ok("import uses display=swap (no hard FOIT)", /display=swap/.test(importLine));
ok(
  "Google Fonts import stays first (before tailwindcss import)",
  css.indexOf(importLine) < css.indexOf('@import "tailwindcss"')
);

// --- Canonical global font stacks (Thai loopless = Anuphan) ---
ok(
  "--font-sans is canonical Inter + Anuphan stack",
  css.includes(
    '--font-sans: "Inter", "Anuphan", ui-sans-serif, system-ui, sans-serif;'
  )
);
ok(
  "--font-display keeps Anuphan Thai fallback",
  css.includes('--font-display: "Space Grotesk", "Anuphan", sans-serif;')
);
ok(
  "--font-mono unchanged",
  css.includes('--font-mono: "JetBrains Mono", monospace;')
);

// --- No competing/duplicate font sources ---
ok(
  "index.html adds no font links or inline font-family",
  !/fonts\.googleapis|fonts\.gstatic|font-family/i.test(html)
);
ok(
  "no other Thai font family introduced in index.css",
  !/Kanit|Prompt|Sarabun|Noto Sans Thai|IBM Plex|LINE Seed|Mitr|Bai Jamjuree|Leelawadee|Tahoma/i.test(
    css
  )
);
ok(
  "no @font-face self-hosted override in index.css",
  !/@font-face/.test(css)
);

// --- Fixture font stripping must stay scoped to the fixture build only ---
const fixturePlugin = readFileSync(
  "scripts/vite-hosting-only-fixture-plugin.mts",
  "utf8"
);
ok(
  "fixture plugin font stripping stays gated on VITE_NONGA_UI_FIXTURE === \"true\"",
  /process\.env\.VITE_NONGA_UI_FIXTURE\s*===\s*"true"/.test(fixturePlugin) &&
    /fonts\\?\.googleapis/.test(fixturePlugin)
);

console.log(
  "\n" + (process.exitCode ? "RESULT: FAIL" : "RESULT: PASS (canonical Anuphan font frozen)")
);

/**
 * v6.9B — Trust panel / AI disclaimer light mode contrast guard (static validation only)
 * npm run test:v69b-trust-panel-light-mode-contrast-guard
 *
 * Ensures footer AI disclaimer uses darker light-mode text (not text-slate-500).
 * No fetch, no deploy, no runtime changes.
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.9B Trust Panel Light Mode Contrast Guard ===\n");

const pkg = readFileSync("package.json", "utf8");
ok(
  "package script registered",
  pkg.includes("test:v69b-trust-panel-light-mode-contrast-guard")
);

const app = readFileSync("src/App.tsx", "utf8");

ok("App.tsx exists", app.length > 0);

ok(
  "AI disclaimer paragraph opening tag contrast classes",
  /<p className="text-\[10px\] text-slate-700 dark:text-slate-400 leading-relaxed">[\s\S]*?AI Sales Assistant/.test(
    app
  )
);

ok(
  "AI disclaimer paragraph no text-slate-500 opening tag",
  !/<p className="text-\[10px\] text-slate-500 dark:text-slate-400/.test(app)
);

ok(
  "Certified trust badge retains text-slate-700 dark branch",
  /text-slate-700\s+dark:text-slate-350/.test(app)
);

ok(
  "No text-white dark:text-white in App footer scope",
  !/text-white\s+dark:text-white/.test(app)
);

console.log("\nDone v6.9B trust panel light mode contrast guard.\n");

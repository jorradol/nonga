/**
 * Guard: Header + Profile theme controls must share next-action semantics
 * (dark → sun / "เปลี่ยนเป็นโหมดสว่าง", light → moon / "เปลี่ยนเป็นโหมดมืด")
 * and useSettings must not re-load/fight when runtime isDarkMode changes.
 *
 * Run: npm run test:theme-toggle-action-semantics-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Theme toggle action-semantics guard ===\n");

const header = readFileSync("src/components/Header.tsx", "utf8");
const profile = readFileSync("src/components/UserProfileView.tsx", "utf8");
const settingsHook = readFileSync("src/hooks/settings/useSettings.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:theme-toggle-action-semantics-guard")
);

ok(
  "Header uses next-action aria-label for light",
  header.includes('aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}')
);

ok(
  "Header uses next-action title matching aria-label",
  header.includes('title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}')
);

ok(
  "Header shows Sun when dark (switch to light)",
  /isDarkMode\s*\?\s*<Sun[\s\S]*:\s*<Moon/.test(header)
);

ok(
  "Header theme button has focus ring + test id",
  header.includes("nonga-focus-ring") &&
    header.includes('data-testid="header-theme-toggle"')
);

ok(
  "Profile label is next-action from isDarkMode (not current-state ลุยโหมด)",
  profile.includes('{isDarkMode ? "☀️ เปลี่ยนเป็นโหมดสว่าง" : "🌙 เปลี่ยนเป็นโหมดมืด"}') &&
    !profile.includes("ลุยโหมดมืด") &&
    !profile.includes("ลุยโหมดสว่าง")
);

ok(
  "Profile click derives next theme from isDarkMode",
  profile.includes('const changeTo = isDarkMode ? "light" : "dark"')
);

ok(
  "Profile aria-label matches Header next-action copy",
  profile.includes('aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}')
);

ok(
  "Profile theme button has keyboard focus styles + test id",
  profile.includes("focus-visible:ring-2") &&
    profile.includes('data-testid="profile-theme-toggle"')
);

ok(
  "Profile does not bind toggle chrome to settings.theme",
  !/settings\.theme\s*===\s*["']dark["']/.test(profile)
);

ok(
  "useSettings load effect does not depend on storeIsDarkMode",
  /}, \[user, authLoading, showToast\]\);/.test(settingsHook) &&
    !/}, \[user, authLoading, showToast, storeIsDarkMode, toggleDarkMode\]\);/.test(
      settingsHook
    )
);

ok(
  "useSettings aligns local theme when store changes (Header path)",
  settingsHook.includes("Keep local settings.theme aligned with runtime store") &&
    settingsHook.includes('const desiredTheme = storeIsDarkMode ? "dark" : "light"')
);

ok(
  "useSettings save always aligns store to desired theme",
  settingsHook.includes("useAppStore.getState().isDarkMode") &&
    settingsHook.includes("Always align runtime store to the desired theme")
);

ok(
  "useSettings load sync uses getState (no storeIsDarkMode dep fight)",
  settingsHook.includes("useAppStore.getState().toggleDarkMode()")
);

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);

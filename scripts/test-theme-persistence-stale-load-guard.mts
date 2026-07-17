/**
 * Prove late settings responses cannot overwrite the user's latest theme choice.
 * Run: npm run test:theme-persistence-stale-load-guard
 */
import { readFileSync } from "node:fs";
import {
  resolveThemeAfterStaleLoad,
  RUNTIME_THEME_STORAGE_KEY,
} from "../src/hooks/settings/themeSync.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Theme persistence / stale-load guard ===\n");

const pkg = readFileSync("package.json", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const hook = readFileSync("src/hooks/settings/useSettings.ts", "utf8");
const sync = readFileSync("src/hooks/settings/themeSync.ts", "utf8");

ok(
  "package script registered",
  pkg.includes("test:theme-persistence-stale-load-guard")
);

ok(
  "themeSync exports resolveThemeAfterStaleLoad",
  sync.includes("export function resolveThemeAfterStaleLoad")
);

ok(
  "store persists runtime theme via themeSync helpers",
  store.includes("readStoredDarkModePreference") &&
    store.includes("writeStoredDarkModePreference") &&
    store.includes("setDarkMode") &&
    store.includes("themeEpoch")
);

ok(
  "store toggleDarkMode delegates to setDarkMode",
  /toggleDarkMode:\s*\(\)\s*=>\s*\{\s*get\(\)\.setDarkMode\(!get\(\)\.isDarkMode\)/.test(
    store
  )
);

ok(
  "useSettings does not put showToast in load effect deps",
  !/}, \[user, authLoading, showToast/.test(hook) &&
    hook.includes("showToastRef") &&
    /}, \[user, authLoading, setDarkMode\]\);/.test(hook)
);

ok(
  "useSettings uses resolveThemeAfterStaleLoad before applying GET theme",
  hook.includes("resolveThemeAfterStaleLoad") &&
    hook.includes("epochAtLoadStart") &&
    hook.includes("applyLoadedThemeToStore")
);

ok(
  "useSettings never reverts theme on persist failure",
  hook.includes("Keep runtime theme; never silently snap back") &&
    hook.includes("ธีมบนหน้าจอยังตามที่เลือกไว้")
);

ok(
  "useSettings applies theme optimistically via setDarkMode",
  hook.includes("setDarkMode(nextSettings.theme === \"dark\")") ||
    hook.includes("setDarkMode(nextSettings.theme === 'dark')")
);

ok(
  "runtime storage key is stable",
  RUNTIME_THEME_STORAGE_KEY === "nonga_runtime_theme"
);

console.log("\n--- executable stale-load matrix ---\n");

const keepUserLight = resolveThemeAfterStaleLoad({
  loadedTheme: "dark",
  epochAtLoadStart: 0,
  epochNow: 1,
  runtimeIsDark: false,
});
ok(
  "late dark GET after user chose light does not apply to store",
  keepUserLight.applyLoadedThemeToStore === false &&
    keepUserLight.theme === "light",
  JSON.stringify(keepUserLight)
);

const keepUserDark = resolveThemeAfterStaleLoad({
  loadedTheme: "light",
  epochAtLoadStart: 2,
  epochNow: 3,
  runtimeIsDark: true,
});
ok(
  "late light GET after user chose dark does not apply to store",
  keepUserDark.applyLoadedThemeToStore === false &&
    keepUserDark.theme === "dark",
  JSON.stringify(keepUserDark)
);

const applyFresh = resolveThemeAfterStaleLoad({
  loadedTheme: "light",
  epochAtLoadStart: 4,
  epochNow: 4,
  runtimeIsDark: true,
});
ok(
  "fresh GET with unchanged epoch may apply loaded theme",
  applyFresh.applyLoadedThemeToStore === true &&
    applyFresh.theme === "light",
  JSON.stringify(applyFresh)
);

const rapidToggle = resolveThemeAfterStaleLoad({
  loadedTheme: "dark",
  epochAtLoadStart: 0,
  epochNow: 5,
  runtimeIsDark: false,
});
ok(
  "rapid toggles (epoch jumped) still keep latest runtime theme",
  rapidToggle.applyLoadedThemeToStore === false &&
    rapidToggle.theme === "light",
  JSON.stringify(rapidToggle)
);

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);

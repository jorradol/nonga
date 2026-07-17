/**
 * Theme sync helpers — keep runtime preference durable and reject stale settings loads.
 * Runtime SoT: Zustand isDarkMode + documentElement.dark (+ this localStorage mirror).
 * Persisted API settings.theme is subordinate to the latest user themeEpoch.
 */

export const RUNTIME_THEME_STORAGE_KEY = "nonga_runtime_theme";

export function readStoredDarkModePreference(defaultDark = true): boolean {
  if (typeof localStorage === "undefined") return defaultDark;
  try {
    const value = localStorage.getItem(RUNTIME_THEME_STORAGE_KEY);
    if (value === "light") return false;
    if (value === "dark") return true;
  } catch {
    // ignore quota / private-mode failures
  }
  return defaultDark;
}

export function writeStoredDarkModePreference(isDark: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RUNTIME_THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // ignore quota / private-mode failures
  }
}

export type SettingsTheme = "light" | "dark" | "system";

/**
 * When a settings GET was started at epochAtLoadStart, a later user toggle bumps themeEpoch.
 * Late responses must keep the user's runtime theme and must not call setDarkMode/toggleDarkMode.
 */
export function resolveThemeAfterStaleLoad(input: {
  loadedTheme: SettingsTheme;
  epochAtLoadStart: number;
  epochNow: number;
  runtimeIsDark: boolean;
}): { theme: SettingsTheme; applyLoadedThemeToStore: boolean } {
  if (input.epochNow !== input.epochAtLoadStart) {
    return {
      theme: input.runtimeIsDark ? "dark" : "light",
      applyLoadedThemeToStore: false,
    };
  }
  return {
    theme: input.loadedTheme,
    applyLoadedThemeToStore: true,
  };
}

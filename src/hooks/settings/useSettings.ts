import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { userService, UserUserSettings } from "../../services/user/userService";
import { useAppStore } from "../../store";
import { AppFriendlyError } from "../../utils/appFriendlyError";
import { resolveThemeAfterStaleLoad } from "./themeSync";

export function useSettings(showToast?: (msg: string, type?: "success" | "info" | "error") => void) {
  const { user, loading: authLoading } = useAuthContext();
  const storeIsDarkMode = useAppStore((state) => state.isDarkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);

  const [settings, setSettings] = useState<UserUserSettings>({
    theme: storeIsDarkMode ? "dark" : "light",
    emailNotifications: true,
    pushNotifications: false,
    language: "th",
    updatedAt: new Date().toISOString()
  });

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // showToast from useUserProfile is a new function every render — never put it in
  // effect deps or a theme toggle re-render will re-GET settings and snap the theme back.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const persistReadyRef = useRef(false);
  const savingRef = useRef(false);

  const persistThemePreference = async (
    uid: string,
    next: UserUserSettings,
    options?: { quietSuccess?: boolean }
  ) => {
    try {
      await userService.ensureProfileReady(uid);
      await userService.updateUserSettings(uid, next);
      if (!options?.quietSuccess) {
        showToastRef.current?.("บันทึกการตั้งค่าระบบเรียบร้อยแล้วครับผม 🛡️");
      }
    } catch (err) {
      // Keep runtime theme; never silently snap back on persist failure.
      if (err instanceof AppFriendlyError && err.code === "network") {
        showToastRef.current?.(
          "เครือข่ายไม่พร้อม ธีมบนหน้าจอยังตามที่เลือกไว้ แต่ยังซิงก์ขึ้นเซิร์ฟเวอร์ไม่ได้",
          "info"
        );
      } else {
        console.error("Failed to persist settings:", err);
        showToastRef.current?.(
          "บันทึกการตั้งค่าขึ้นเซิร์ฟเวอร์ไม่สำเร็จ ธีมบนหน้าจอยังตามที่เลือกไว้",
          "error"
        );
      }
      throw err;
    }
  };

  // Load user settings on mount / auth identity change only.
  useEffect(() => {
    let active = true;
    persistReadyRef.current = false;

    if (authLoading) return;
    if (!user || user.uid === "guest-user-100") {
      setIsLoadingSettings(false);
      persistReadyRef.current = true;
      return;
    }

    const epochAtLoadStart = useAppStore.getState().themeEpoch;
    const uid = user.uid;

    async function load() {
      setIsLoadingSettings(true);
      try {
        await userService.ensureProfileReady(uid);
        const loaded = await userService.getUserSettings(uid);
        if (!active) return;

        const { themeEpoch, isDarkMode } = useAppStore.getState();
        const resolved = resolveThemeAfterStaleLoad({
          loadedTheme: loaded.theme,
          epochAtLoadStart,
          epochNow: themeEpoch,
          runtimeIsDark: isDarkMode,
        });

        const merged: UserUserSettings = {
          ...loaded,
          theme: resolved.theme,
        };
        setSettings(merged);
        settingsRef.current = merged;

        if (resolved.applyLoadedThemeToStore) {
          setDarkMode(loaded.theme === "dark");
        } else if (loaded.theme !== resolved.theme) {
          // User toggled while GET was in flight — keep UI, push newer theme to API.
          try {
            await persistThemePreference(uid, merged, { quietSuccess: true });
          } catch {
            // toast already shown; UI stays on user choice
          }
        }
      } catch (err) {
        if (active) {
          if (err instanceof AppFriendlyError && err.code === "network") {
            showToastRef.current?.(
              "ตอนนี้เครือข่ายไม่เสถียร กำลังใช้ค่าที่บันทึกในเครื่องชั่วคราว",
              "info"
            );
          } else {
            showToastRef.current?.("ไม่สามารถโหลดการตั้งค่าจากเซิร์ฟเวอร์ได้", "error");
          }
        }
      } finally {
        if (active) {
          setIsLoadingSettings(false);
          persistReadyRef.current = true;
        }
      }
    }
    load();

    return () => {
      active = false;
    };
  }, [user, authLoading, setDarkMode]);

  /**
   * Persist runtime theme when Header toggles after settings load has settled.
   * Skips while Profile saveSettings is already writing.
   */
  useEffect(() => {
    if (!persistReadyRef.current) return;
    if (savingRef.current) return;
    if (!user || user.uid === "guest-user-100") return;

    const desiredTheme = storeIsDarkMode ? "dark" : "light";
    if (settingsRef.current.theme === desiredTheme) return;

    const updated: UserUserSettings = {
      ...settingsRef.current,
      theme: desiredTheme,
      updatedAt: new Date().toISOString(),
    };
    settingsRef.current = updated;
    setSettings(updated);

    void persistThemePreference(user.uid, updated, { quietSuccess: true }).catch(() => {
      // toast already shown; do not revert store
    });
  }, [storeIsDarkMode, user]);

  /**
   * Save settings back to database
   */
  const saveSettings = async (nextSettings: Partial<UserUserSettings>) => {
    if (!user) return;

    savingRef.current = true;
    setIsSavingSettings(true);
    const updated: UserUserSettings = {
      ...settingsRef.current,
      ...nextSettings,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local + runtime theme — UI must flip immediately
    setSettings(updated);
    settingsRef.current = updated;
    if (nextSettings.theme) {
      setDarkMode(nextSettings.theme === "dark");
    }

    try {
      await persistThemePreference(user.uid, updated);
    } catch {
      // keep chosen theme; error already toasted
    } finally {
      savingRef.current = false;
      setIsSavingSettings(false);
    }
  };

  /**
   * Trigger theme toggle
   */
  const toggleThemeState = async () => {
    const nextTheme = useAppStore.getState().isDarkMode ? "light" : "dark";
    await saveSettings({ theme: nextTheme });
  };

  return {
    settings,
    isLoadingSettings,
    isSavingSettings,
    saveSettings,
    toggleThemeState
  };
}

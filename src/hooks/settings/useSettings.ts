import { useState, useEffect } from "react";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { userService, UserUserSettings } from "../../services/user/userService";
import { useAppStore } from "../../store";
import { AppFriendlyError } from "../../utils/appFriendlyError";

export function useSettings(showToast?: (msg: string, type?: "success" | "info" | "error") => void) {
  const { user, loading: authLoading } = useAuthContext();
  const storeIsDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);

  const [settings, setSettings] = useState<UserUserSettings>({
    theme: storeIsDarkMode ? "dark" : "light",
    emailNotifications: true,
    pushNotifications: false,
    language: "th",
    updatedAt: new Date().toISOString()
  });

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load user settings on mount
  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user || user.uid === "guest-user-100") {
      setIsLoadingSettings(false);
      return;
    }

    async function load() {
      setIsLoadingSettings(true);
      try {
        await userService.ensureProfileReady(user.uid);
        const loaded = await userService.getUserSettings(user.uid);
        if (active) {
          setSettings(loaded);
          
          // Align store's dark mode to fetched settings theme
          const targetDark = loaded.theme === "dark";
          if (targetDark !== storeIsDarkMode) {
            toggleDarkMode();
          }
        }
      } catch (err) {
        if (active) {
          if (err instanceof AppFriendlyError && err.code === "network") {
            showToast?.(
              "ตอนนี้เครือข่ายไม่เสถียร กำลังใช้ค่าที่บันทึกในเครื่องชั่วคราว",
              "info"
            );
          } else {
            showToast?.("ไม่สามารถโหลดการตั้งค่าจากเซิร์ฟเวอร์ได้", "error");
          }
        }
      } finally {
        if (active) {
          setIsLoadingSettings(false);
        }
      }
    }
    load();

    return () => {
      active = false;
    };
  }, [user, authLoading, showToast, storeIsDarkMode, toggleDarkMode]);

  /**
   * Save settings back to database
   */
  const saveSettings = async (nextSettings: Partial<UserUserSettings>) => {
    if (!user) return;
    
    setIsSavingSettings(true);
    const updated = {
      ...settings,
      ...nextSettings,
      updatedAt: new Date().toISOString()
    };

    // Keep state sync
    setSettings(updated);

    try {
      await userService.ensureProfileReady(user.uid);
      await userService.updateUserSettings(user.uid, updated);
      
      // Handle theme change toggle locally if mismatch exists
      if (nextSettings.theme && nextSettings.theme !== settings.theme) {
        const wantsDark = nextSettings.theme === "dark";
        const hasDarkNow = storeIsDarkMode;
        if (wantsDark !== hasDarkNow) {
          toggleDarkMode();
        }
      }

      if (showToast) {
        showToast("บันทึกการตั้งค่าระบบเรียบร้อยแล้วครับผม 🛡️");
      }
    } catch (err) {
      if (err instanceof AppFriendlyError && err.code === "network") {
        showToast?.("เครือข่ายไม่พร้อม ระบบจะพยายามซิงก์อีกครั้งเมื่อออนไลน์", "info");
      } else {
        console.error("Failed to push settings updates:", err);
        showToast("ไม่สามารถอัปเดตการตั้งค่าระยะไกลได้ กรุณาลองใหม่อีกครั้ง", "error");
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  /**
   * Trigger theme toggle
   */
  const toggleThemeState = async () => {
    const nextTheme = settings.theme === "dark" ? "light" : "dark";
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

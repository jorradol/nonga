import { isMockConfig } from "../../lib/firebase";
import {
  FirebaseAuthUnavailableError,
  requireFirebaseAuthHeaders,
} from "../auth/firebaseAuthHeaders";
import { safeApiFetch, type ApiJsonEnvelope } from "../../utils/safeApiFetch";
import { AppFriendlyError } from "../../utils/appFriendlyError";

export interface UserUserSettings {
  theme: "light" | "dark" | "system";
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: "th" | "en";
  updatedAt: string;
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: "guest" | "member" | "dealer" | "premium" | "admin" | "superadmin";
  createdAt: string;
  lastLogin: string;
  favoriteCars: string[];
  aiPersona: string;
  membershipType: "free" | "pro" | "dealer" | "enterprise";
  postLimit: number;
  totalPosts: number;
  premiumExpireDate?: string | null;
}

type ProfileReadyEnvelope = ApiJsonEnvelope & {
  data?: {
    uid?: string;
    role?: string;
    status?: string;
    profileReady?: boolean;
  };
};

type UserProfileEnvelope = ApiJsonEnvelope & {
  data?: Partial<UserProfileData>;
};

type UserSettingsEnvelope = ApiJsonEnvelope & {
  data?: Partial<UserUserSettings>;
};

const DEFAULT_SETTINGS: UserUserSettings = {
  theme: "dark",
  emailNotifications: true,
  pushNotifications: false,
  language: "th",
  updatedAt: new Date().toISOString()
};

export const userService = {
  _profileReadyInflight: new Map<string, Promise<void>>(),

  async ensureProfileReady(uid: string): Promise<void> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");
    if (isSimulated) return;

    const key = uid.trim();
    if (!key) throw new Error("ไม่พบบัญชีผู้ใช้ — กรุณาเข้าสู่ระบบก่อน");
    const existing = this._profileReadyInflight.get(key);
    if (existing) {
      await existing;
      return;
    }

    const request = (async () => {
      const headers = await requireFirebaseAuthHeaders({ contentType: "none" });
      const json = await safeApiFetch<ProfileReadyEnvelope>("/api/me/profile-ready", {
        method: "GET",
        headers,
      });
      if (json.success === false || json.data?.profileReady !== true) {
        throw new Error("ระบบยังไม่พร้อมใช้งานโปรไฟล์ผู้ใช้");
      }
    })();

    this._profileReadyInflight.set(key, request);
    try {
      await request;
    } finally {
      this._profileReadyInflight.delete(key);
    }
  },

  /**
   * Fetches user profile from API or simulated storage.
   */
  async getUserProfile(uid: string): Promise<UserProfileData | null> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");
    
    if (isSimulated) {
      const savedUsers = localStorage.getItem("nonga_simulated_users") 
        ? JSON.parse(localStorage.getItem("nonga_simulated_users")!) 
        : {};
      return savedUsers[uid] || null;
    }

    try {
      await this.ensureProfileReady(uid);
      const headers = await requireFirebaseAuthHeaders({ contentType: "none" });
      const json = await safeApiFetch<UserProfileEnvelope>("/api/me/profile", {
        method: "GET",
        headers,
      });
      const data = json.data;
      if (!data) return null;
      return {
        uid: String(data.uid ?? uid),
        displayName: String(data.displayName ?? ""),
        email: String(data.email ?? ""),
        photoURL: String(data.photoURL ?? ""),
        role: (String(data.role ?? "member") as UserProfileData["role"]) ?? "member",
        createdAt: String(data.createdAt ?? new Date().toISOString()),
        lastLogin: String(data.lastLogin ?? new Date().toISOString()),
        favoriteCars: Array.isArray(data.favoriteCars)
          ? (data.favoriteCars as string[])
          : [],
        aiPersona: String(data.aiPersona ?? "Professional - เน้นข้อมูลสเปกเชิงลึก"),
        membershipType: String(data.membershipType ?? "free") as UserProfileData["membershipType"],
        postLimit: Number(data.postLimit ?? 5),
        totalPosts: Number(data.totalPosts ?? 0),
        premiumExpireDate:
          data.premiumExpireDate == null ? null : String(data.premiumExpireDate),
      };
    } catch (err) {
      if (err instanceof FirebaseAuthUnavailableError) return null;
      throw err;
    }
  },

  /**
   * Updates user profile fields through API.
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfileData>): Promise<void> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");

    if (isSimulated) {
      const savedUsers = localStorage.getItem("nonga_simulated_users") 
        ? JSON.parse(localStorage.getItem("nonga_simulated_users")!) 
        : {};
      const current = savedUsers[uid] || {};
      savedUsers[uid] = { ...current, ...updates };
      localStorage.setItem("nonga_simulated_users", JSON.stringify(savedUsers));
      return;
    }

    try {
      await this.ensureProfileReady(uid);
      const allowedKeys = new Set([
        "displayName",
        "photoURL",
        "lastLogin",
        "favoriteCars",
        "aiPersona",
        "premiumExpireDate",
      ]);
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.has(key)) sanitized[key] = value;
      }
      if (Object.keys(sanitized).length === 0) return;
      const headers = await requireFirebaseAuthHeaders({ contentType: "json" });
      await safeApiFetch<ApiJsonEnvelope>("/api/me/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify(sanitized),
      });
    } catch (err) {
      if (err instanceof FirebaseAuthUnavailableError) return;
      throw err;
    }
  },

  /**
   * Fetches user settings document from API/local storage.
   */
  async getUserSettings(uid: string): Promise<UserUserSettings> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");

    if (isSimulated) {
      const key = `nonga_settings_${uid}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    }

    try {
      await this.ensureProfileReady(uid);
      const headers = await requireFirebaseAuthHeaders({ contentType: "none" });
      const json = await safeApiFetch<UserSettingsEnvelope>("/api/me/settings", {
        method: "GET",
        headers,
      });
      const data = json.data ?? {};
      return {
        theme:
          data.theme === "light" || data.theme === "dark" || data.theme === "system"
            ? data.theme
            : DEFAULT_SETTINGS.theme,
        emailNotifications:
          typeof data.emailNotifications === "boolean"
            ? data.emailNotifications
            : DEFAULT_SETTINGS.emailNotifications,
        pushNotifications:
          typeof data.pushNotifications === "boolean"
            ? data.pushNotifications
            : DEFAULT_SETTINGS.pushNotifications,
        language: data.language === "en" || data.language === "th" ? data.language : "th",
        updatedAt:
          typeof data.updatedAt === "string" && data.updatedAt.trim()
            ? data.updatedAt
            : new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof AppFriendlyError && err.code === "network") {
        return DEFAULT_SETTINGS;
      }
      if (err instanceof FirebaseAuthUnavailableError) {
        return DEFAULT_SETTINGS;
      }
      throw err;
    }
  },

  async getPersonalPreset(uid: string): Promise<string | null> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");
    if (isSimulated) return null;
    try {
      await this.ensureProfileReady(uid);
      const headers = await requireFirebaseAuthHeaders({ contentType: "none" });
      const json = await safeApiFetch<ApiJsonEnvelope & { data?: { presetId?: string } }>(
        "/api/me/personality",
        {
          method: "GET",
          headers,
        }
      );
      const presetId = String(json.data?.presetId ?? "").trim();
      return presetId || null;
    } catch (err) {
      if (err instanceof AppFriendlyError && err.code === "network") {
        return null;
      }
      if (err instanceof FirebaseAuthUnavailableError) {
        return null;
      }
      throw err;
    }
  },

  async updatePersonalPreset(uid: string, presetId: string): Promise<void> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");
    if (isSimulated) return;
    if (!presetId.trim()) return;
    await this.ensureProfileReady(uid);
    const headers = await requireFirebaseAuthHeaders({ contentType: "json" });
    await safeApiFetch<ApiJsonEnvelope>("/api/me/personality", {
      method: "PUT",
      headers,
      body: JSON.stringify({ presetId }),
    });
  },

  /**
   * Updates user settings through API/localStorage fallback.
   */
  async updateUserSettings(uid: string, settings: UserUserSettings): Promise<void> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");

    if (isSimulated) {
      const key = `nonga_settings_${uid}`;
      localStorage.setItem(key, JSON.stringify(settings));
      return;
    }

    await this.ensureProfileReady(uid);
    const headers = await requireFirebaseAuthHeaders({ contentType: "json" });
    await safeApiFetch<ApiJsonEnvelope>("/api/me/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        theme: settings.theme,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        language: settings.language,
      }),
    });
  },

  /**
   * Simulates an avatar upload using a file, providing progress monitoring.
   */
  async simulateAvatarUpload(
    uid: string,
    file: File,
    onProgress: (percent: number) => void
  ): Promise<string> {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          const seed = encodeURIComponent(file.name.replace(/\.[^/.]+$/, ""));
          const mockURL = `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}_${Date.now()}`;
          resolve(mockURL);
        }
      }, 150);
    });
  },
};

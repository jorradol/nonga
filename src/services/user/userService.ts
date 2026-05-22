import { db, auth, isMockConfig } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../../utils/firebaseHelpers";

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

const DEFAULT_SETTINGS: UserUserSettings = {
  theme: "dark",
  emailNotifications: true,
  pushNotifications: false,
  language: "th",
  updatedAt: new Date().toISOString()
};

export const userService = {
  /**
   * Fetches user profile from Firestore or Simulated databases.
   */
  async getUserProfile(uid: string): Promise<UserProfileData | null> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");
    
    if (isSimulated) {
      const savedUsers = localStorage.getItem("nonga_simulated_users") 
        ? JSON.parse(localStorage.getItem("nonga_simulated_users")!) 
        : {};
      return savedUsers[uid] || null;
    }

    if (!db) return null;
    try {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          uid,
          displayName: data.displayName || "",
          email: data.email || "",
          photoURL: data.photoURL || "",
          role: data.role || "member",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin?.toDate?.()?.toISOString() || data.lastLogin || new Date().toISOString(),
          favoriteCars: data.favoriteCars || [],
          aiPersona: data.aiPersona || "Professional - เน้นข้อมูลสเปกเชิงลึก",
          membershipType: data.membershipType || "free",
          postLimit: data.postLimit || 5,
          totalPosts: data.totalPosts || 0,
          premiumExpireDate: data.premiumExpireDate?.toDate?.()?.toISOString() || data.premiumExpireDate || null
        } as UserProfileData;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  },

  /**
   * Updates user profile fields inside Firestore or Simulated state.
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

    if (!db) return;
    try {
      const docRef = doc(db, "users", uid);
      // Clean updates of fields standard users cannot modify on themselves unless they are admin
      // The secure keys allowed in existing firestore rules: ['displayName', 'photoURL', 'lastLogin', 'favoriteCars', 'aiPersona', 'premiumExpireDate']
      const sanitizedUpdates: Record<string, any> = {};
      const allowedKeys = ['displayName', 'photoURL', 'lastLogin', 'favoriteCars', 'aiPersona', 'premiumExpireDate'];
      
      Object.keys(updates).forEach(key => {
        if (allowedKeys.includes(key)) {
          sanitizedUpdates[key] = (updates as any)[key];
        }
      });

      await updateDoc(docRef, sanitizedUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  },

  /**
   * Fetches user settings document from Firestore/local storage.
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

    if (!db) return DEFAULT_SETTINGS;
    try {
      const docRef = doc(db, "user_settings", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          theme: data.theme || "dark",
          emailNotifications: typeof data.emailNotifications === "boolean" ? data.emailNotifications : true,
          pushNotifications: typeof data.pushNotifications === "boolean" ? data.pushNotifications : false,
          language: data.language || "th",
          updatedAt: data.updatedAt || new Date().toISOString()
        } as UserUserSettings;
      }
      return DEFAULT_SETTINGS;
    } catch (err) {
      console.warn("Flipped fallback for settings fetch error, using default settings:", err);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Updates user settings inside Firestore or Simulated localStorage.
   */
  async updateUserSettings(uid: string, settings: UserUserSettings): Promise<void> {
    const isSimulated = isMockConfig || uid === "guest-user-100" || uid.startsWith("sim-");

    if (isSimulated) {
      const key = `nonga_settings_${uid}`;
      localStorage.setItem(key, JSON.stringify(settings));
      return;
    }

    if (!db) return;
    try {
      const docRef = doc(db, "user_settings", uid);
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_settings/${uid}`);
    }
  },

  /**
   * Simulates an avatar upload using a file, providing progress monitoring.
   */
  async simulateAvatarUpload(
    uid: string, 
    file: File, 
    onProgress: (percent: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          // generate elegant image url based on name or random seed
          const seed = encodeURIComponent(file.name.replace(/\.[^/.]+$/, ""));
          const mockURL = `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}_${Date.now()}`;
          resolve(mockURL);
        }
      }, 150);
    });
  }
};

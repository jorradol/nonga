import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import {
  auth,
  firebaseClientAuthEnvironment,
  firebaseAuthUnavailableMessage,
  isFirebaseAuthReady,
  isMockAuthStorageEnabled,
  isMockConfig,
} from "../../lib/firebase";

import type { DealerOwnerContext } from "../../utils/dealerIdentity";
import type { UserStatus } from "../../utils/rbac";

export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: string;
  isSimulated?: boolean;
  role?: string;
  status?: UserStatus;
  membershipType?: string;
  postLimit?: number;
  totalPosts?: number;
  createdAt?: string;
  lastLogin?: string;
  favoriteCars?: string[];
  aiPersona?: string;
  premiumExpireDate?: string | null;
  /** ผูก Dealer Portal / import */
  dealerId?: string;
  showroomName?: string;
  dealerProfile?: Partial<DealerOwnerContext>;
}

// LocalStorage key for session persistence
const AUTH_SESSION_KEY = "nonga_auth_session";
const REGISTERED_USERS_KEY = "nonga_registered_local_users";
const PUBLIC_SIGNUP_DISABLED_MESSAGE =
  "ระบบสมัครสมาชิกสาธารณะยังไม่ได้เปิดใช้งานในสภาพแวดล้อมนี้ครับ";

export interface PublicSignupEnv {
  DEV?: boolean;
  VITE_NONGA_PUBLIC_SIGNUP_ENABLED?: string;
}

function readViteFlag(key: "DEV"): boolean {
  try {
    const meta = import.meta as { env?: Record<string, unknown> };
    return Boolean(meta.env?.[key]);
  } catch {
    return false;
  }
}

function readViteString(key: string): string {
  try {
    const meta = import.meta as { env?: Record<string, unknown> };
    const value = meta.env?.[key];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

function isEnabledFlag(value: string): boolean {
  return /^(1|true|yes|on)$/i.test(value.trim());
}

export function isPublicSignupEnabled(
  env?: PublicSignupEnv,
  mockMode = isMockConfig
): boolean {
  const configured =
    env?.VITE_NONGA_PUBLIC_SIGNUP_ENABLED?.trim() ||
    readViteString("VITE_NONGA_PUBLIC_SIGNUP_ENABLED");
  if (configured) return isEnabledFlag(configured);
  const isDev = env?.DEV ?? readViteFlag("DEV");
  return mockMode && isDev;
}

export const authService = {
  // Get active session stored in localStorage (if any)
  getPersistedSession(): UserSession | null {
    try {
      if (!isMockConfig && isFirebaseAuthReady && firebaseClientAuthEnvironment.isProduction) {
        return null;
      }
      const session = localStorage.getItem(AUTH_SESSION_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session) as UserSession;
      if (!isFirebaseAuthReady && !isMockAuthStorageEnabled) {
        return null;
      }
      if (!isMockAuthStorageEnabled && parsed.isSimulated) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  // Save session to local storage for persistence
  persistSession(user: UserSession | null) {
    if (user) {
      if (!isMockConfig && isFirebaseAuthReady && firebaseClientAuthEnvironment.isProduction) {
        return;
      }
      if (!isMockAuthStorageEnabled && user.isSimulated) return;
      if (user.providerId === "guest") return;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  },

  // Email and Password Registration
  async registerWithEmail(email: string, password: string, displayName: string): Promise<UserSession> {
    if (!isPublicSignupEnabled()) {
      throw new Error(PUBLIC_SIGNUP_DISABLED_MESSAGE);
    }
    if (isMockConfig) {
      if (!isMockAuthStorageEnabled) {
        throw new Error(firebaseAuthUnavailableMessage);
      }
      // Simulate registration with local storage database
      const users = this._getLocalUsers();
      if (users[email]) {
        throw new Error("อีเมลนี้ถูกใช้งานในการลงทะเบียนแล้วครับ ❌");
      }

      const uid = "sim-" + Math.random().toString(36).substring(2, 11);
      const newUser: UserSession = {
        uid,
        email,
        displayName,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
        providerId: "password",
        isSimulated: true
      };

      users[email] = { password, mockUser: newUser };
      this._saveLocalUsers(users);
      this.persistSession(newUser);
      return newUser;
    } else {
      // Real firebase authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update firebase profile display name
      const photoURL = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`;
      await updateProfile(firebaseUser, { displayName, photoURL });
      
      const userSession: UserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: displayName,
        photoURL,
        providerId: "password"
      };

      this.persistSession(userSession);
      return userSession;
    }
  },

  // Email and Password Login
  async loginWithEmail(email: string, password: string): Promise<UserSession> {
    if (isMockConfig) {
      if (!isMockAuthStorageEnabled) {
        throw new Error(firebaseAuthUnavailableMessage);
      }
      const users = this._getLocalUsers();
      const userRecord = users[email];
      
      if (!userRecord || userRecord.password !== password) {
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งครับ ❌");
      }

      const userSession = userRecord.mockUser;
      this.persistSession(userSession);
      return userSession;
    } else {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userSession: UserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: firebaseUser.displayName || email.split("@")[0],
        photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`,
        providerId: "password"
      };

      this.persistSession(userSession);
      return userSession;
    }
  },

  // Send Password Reset Link
  async resetPassword(email: string): Promise<void> {
    if (isMockConfig) {
      if (!isMockAuthStorageEnabled) {
        throw new Error(firebaseAuthUnavailableMessage);
      }
      // Simulate password reset
      const users = this._getLocalUsers();
      if (!users[email]) {
        throw new Error("ไม่พบอีเมลนี้ในระบบการลงทะเบียนครับ ❌");
      }
      return new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      await sendPasswordResetEmail(auth, email);
    }
  },

  // Google OAuth Login
  async loginWithGoogle(): Promise<UserSession> {
    if (isMockConfig) {
      if (!isMockAuthStorageEnabled) {
        throw new Error(firebaseAuthUnavailableMessage);
      }
      // Simulate Google OAuth popup
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockUser: UserSession = {
            uid: "google-uid-12345",
            email: "google.user@gmail.com",
            displayName: "Auto Blogger Google",
            photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=GoogleUser",
            providerId: "google.com",
            isSimulated: true
          };
          this.persistSession(mockUser);
          resolve(mockUser);
        }, 1500);
      });
    } else {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userSession: UserSession = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "Google User",
        photoURL: firebaseUser.photoURL || undefined,
        providerId: "google.com"
      };

      this.persistSession(userSession);
      return userSession;
    }
  },

  // Facebook OAuth Login Simulation
  async loginWithFacebook(): Promise<UserSession> {
    if (!isFirebaseAuthReady && !isMockAuthStorageEnabled) {
      throw new Error(firebaseAuthUnavailableMessage);
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: UserSession = {
          uid: "facebook-uid-67890",
          email: "facebook.buddy@fb.com",
          displayName: "NongBot Facebook Host",
          photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=FacebookUser",
          providerId: "facebook.com",
          isSimulated: true
        };
        this.persistSession(mockUser);
        resolve(mockUser);
      }, 1500);
    });
  },

  // LINE OAuth Login Simulation
  async loginWithLINE(): Promise<UserSession> {
    if (!isFirebaseAuthReady && !isMockAuthStorageEnabled) {
      throw new Error(firebaseAuthUnavailableMessage);
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: UserSession = {
          uid: "line-uid-13570",
          email: "nongbot.line@line.me",
          displayName: "LINE User (NongBot Group)",
          photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=LineUser",
          providerId: "line.me",
          isSimulated: true
        };
        this.persistSession(mockUser);
        resolve(mockUser);
      }, 1500);
    });
  },

  // Logout Session
  async logout(): Promise<void> {
    if (!isMockConfig) {
      await signOut(auth);
    }
    this.persistSession(null);
  },

  // --- Private simulations helpers ---
  _getLocalUsers() {
    try {
      const usersStr = localStorage.getItem(REGISTERED_USERS_KEY);
      return usersStr ? JSON.parse(usersStr) : {};
    } catch {
      return {};
    }
  },

  _saveLocalUsers(users: any) {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Local storage persistent quota exceeded:", e);
    }
  }
};

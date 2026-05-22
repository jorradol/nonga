import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { authService, UserSession } from "../../services/auth/authService";
import { auth, db, isMockConfig } from "../../lib/firebase";
import { useAppStore } from "../../store";
import { handleFirestoreError, OperationType } from "../../utils/firebaseHelpers";

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<UserSession>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<UserSession>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<UserSession>;
  loginWithFacebook: () => Promise<UserSession>;
  loginWithLINE: () => Promise<UserSession>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserSession>) => Promise<void>;
  completeOnboarding: (persona: string, preferredRole: string) => Promise<void>;
  isSimulatedState: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const setUserInStore = useAppStore((state) => state.setUser);

  // Sync state cleanly with both local state and Zustand store
  const syncUser = (session: UserSession | null) => {
    setUserState(session);
    setUserInStore(session);
    authService.persistSession(session);
  };

  // Helper to fetch profile from DB or make a standard role document on signup
  const fetchOrCreateUserProfile = async (uid: string, baseSession: UserSession): Promise<UserSession> => {
    const isSimulated = isMockConfig || !!baseSession.isSimulated || uid.startsWith("sim-") || uid === "guest-user-100";
    
    if (isSimulated) {
      try {
        const savedUsers = localStorage.getItem("nonga_simulated_users") 
          ? JSON.parse(localStorage.getItem("nonga_simulated_users")!) 
          : {};
        
        let profile = savedUsers[uid];
        const currentTime = new Date().toISOString();
        if (!profile) {
          profile = {
            uid,
            email: baseSession.email,
            displayName: baseSession.displayName,
            photoURL: baseSession.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(baseSession.displayName)}`,
            role: baseSession.email === "jorradol@gmail.com" ? "superadmin" : "member",
            membershipType: "free",
            postLimit: 5,
            totalPosts: 0,
            createdAt: currentTime,
            lastLogin: currentTime,
            favoriteCars: [],
            aiPersona: "Professional - เน้นข้อมูลสเปกเชิงลึก",
            premiumExpireDate: null
          };
          savedUsers[uid] = profile;
          localStorage.setItem("nonga_simulated_users", JSON.stringify(savedUsers));
        } else {
          profile.lastLogin = currentTime;
          savedUsers[uid] = profile;
          localStorage.setItem("nonga_simulated_users", JSON.stringify(savedUsers));
        }
        return { ...baseSession, ...profile };
      } catch (simErr) {
        console.warn("Storage limits or parse failed inside simulated DB:", simErr);
        return baseSession;
      }
    }

    // Real Firebase Mode
    if (!db) return baseSession;
    const userDocRef = doc(db, "users", uid);
    try {
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        
        try {
          await updateDoc(userDocRef, {
            lastLogin: serverTimestamp()
          });
        } catch (updErr) {
          console.warn("Unable to update lastLogin timestamp:", updErr);
        }

        return {
          ...baseSession,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          premiumExpireDate: data.premiumExpireDate?.toDate?.()?.toISOString() || data.premiumExpireDate || null,
        };
      } else {
        const currentTime = new Date().toISOString();
        const defaultProfile = {
          uid,
          email: baseSession.email,
          displayName: baseSession.displayName,
          photoURL: baseSession.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(baseSession.displayName)}`,
          role: baseSession.email === "jorradol@gmail.com" ? "superadmin" : "member",
          membershipType: "free",
          postLimit: 5,
          totalPosts: 0,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          favoriteCars: [],
          aiPersona: "Professional - เน้นข้อมูลสเปกเชิงลึก",
          premiumExpireDate: null
        };

        await setDoc(userDocRef, defaultProfile);

        return {
          ...baseSession,
          ...defaultProfile,
          createdAt: currentTime,
          lastLogin: currentTime
        };
      }
    } catch (err) {
      console.error("Firestore user retrieval error:", err);
      try {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      } catch {
        // Suppress and return baseline session for offline robustness
      }
      return baseSession;
    }
  };

  const updateUserProfile = async (updates: Partial<UserSession>) => {
    if (!user) return;
    const uid = user.uid;
    const isSimulated = isMockConfig || !!user.isSimulated || uid.startsWith("sim-") || uid === "guest-user-100";

    const updatedUserSession = { ...user, ...updates };

    if (isSimulated) {
      try {
        const savedUsers = localStorage.getItem("nonga_simulated_users") 
          ? JSON.parse(localStorage.getItem("nonga_simulated_users")!) 
          : {};
        const profile = savedUsers[uid] || {};
        const updatedProfile = { ...profile, ...updates };
        savedUsers[uid] = updatedProfile;
        localStorage.setItem("nonga_simulated_users", JSON.stringify(savedUsers));
        syncUser(updatedUserSession);
      } catch (simErr) {
        console.warn("Storage limits exceeded inside simulated profile updates:", simErr);
        syncUser(updatedUserSession);
      }
      return;
    }

    if (!db) return;
    const userDocRef = doc(db, "users", uid);
    try {
      await updateDoc(userDocRef, updates);
      syncUser(updatedUserSession);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const completeOnboarding = async (persona: string, preferredRole: string) => {
    if (!user) return;
    const updates: Partial<UserSession> = {
      aiPersona: persona
    };

    if (["member", "dealer", "premium"].includes(preferredRole)) {
      updates.role = preferredRole;
      updates.membershipType = preferredRole === "premium" ? "pro" : preferredRole === "dealer" ? "dealer" : "free";
      updates.postLimit = preferredRole === "member" ? 5 : 999999;
    }

    await updateUserProfile(updates);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Check saved session
      const savedSession = authService.getPersistedSession();
      if (savedSession) {
        const fullProfile = await fetchOrCreateUserProfile(savedSession.uid, savedSession);
        syncUser(fullProfile);
        setLoading(false);
      } else {
        const defaultGuest: UserSession = {
          uid: "guest-user-100",
          displayName: "คุณออโต้ บล็อกเกอร์ (NongBot Guest)",
          email: "auto.nong@gmail.com",
          photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=NongBot",
          providerId: "guest",
          role: "guest",
          membershipType: "free",
          postLimit: 0,
          totalPosts: 0,
          favoriteCars: [],
          aiPersona: "Professional - เน้นข้อมูลสเปกเชิงลึก"
        };
        syncUser(defaultGuest);
        setLoading(false);
      }

      // 2. Clear loader on snapshot auth observer
      if (auth && !isMockConfig) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
          if (firebaseUser) {
            const baseSession: UserSession = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "AI User",
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`,
              providerId: firebaseUser.providerData[0]?.providerId || "password"
            };
            const fullProfile = await fetchOrCreateUserProfile(firebaseUser.uid, baseSession);
            syncUser(fullProfile);
          }
          setLoading(false);
        });
        return unsubscribe;
      }
    };

    initializeAuth();
  }, [setUserInStore]);

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.loginWithEmail(email, password);
      syncUser(session);
      return session;
    } catch (err: any) {
      const errMsg = err.message || "การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบอีเมลและรหัสผ่านครับ";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.registerWithEmail(email, password, displayName);
      syncUser(session);
      return session;
    } catch (err: any) {
      const errMsg = err.message || "การลงทะเบียนล้มเหลว กรุณากรอกข้อมูลให้ครบถ้วนและลองอีกครั้งครับ";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (err: any) {
      const errMsg = err.message || "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ กรุณาตรวจสอบความถูกต้องของอีเมลครับ";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.loginWithGoogle();
      syncUser(session);
      return session;
    } catch (err: any) {
      const errMsg = err.message || "การเข้าสู่ระบบผ่าน Google ล้มเหลว";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.loginWithFacebook();
      syncUser(session);
      return session;
    } catch (err: any) {
      const errMsg = err.message || "การเข้าสู่ระบบผ่าน Facebook ล้มเหลว";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithLINE = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.loginWithLINE();
      syncUser(session);
      return session;
    } catch (err: any) {
      const errMsg = err.message || "การเข้าสู่ระบบผ่าน LINE ล้มเหลว";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      syncUser(null);
    } catch (err: any) {
      setError(err?.message || "ลบเซสชันล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        loginWithGoogle,
        loginWithFacebook,
        loginWithLINE,
        logout,
        isSimulatedState: isMockConfig || !!user?.isSimulated
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

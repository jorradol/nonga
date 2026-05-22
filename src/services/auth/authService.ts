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
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isMockConfig } from "../../lib/firebase";

export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: string;
  isSimulated?: boolean;
  role?: string;
  membershipType?: string;
  postLimit?: number;
  totalPosts?: number;
  createdAt?: string;
  lastLogin?: string;
  favoriteCars?: string[];
  aiPersona?: string;
  premiumExpireDate?: string | null;
}

// LocalStorage key for session persistence
const AUTH_SESSION_KEY = "nonga_auth_session";
const REGISTERED_USERS_KEY = "nonga_registered_local_users";

export const authService = {
  // Get active session stored in localStorage (if any)
  getPersistedSession(): UserSession | null {
    try {
      const session = localStorage.getItem(AUTH_SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  },

  // Save session to local storage for persistence
  persistSession(user: UserSession | null) {
    if (user) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  },

  // Email and Password Registration
  async registerWithEmail(email: string, password: string, displayName: string): Promise<UserSession> {
    if (isMockConfig) {
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

      // Attempt to provision profile in Firestore
      try {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName,
          photoURL,
          createdAt: serverTimestamp(),
          provider: "password"
        });
      } catch (e) {
        console.error("Firestore user creation warning (expected if permissions are tight):", e);
      }

      this.persistSession(userSession);
      return userSession;
    }
  },

  // Email and Password Login
  async loginWithEmail(email: string, password: string): Promise<UserSession> {
    if (isMockConfig) {
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

      try {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: userSession.displayName,
          photoURL: userSession.photoURL,
          updatedAt: serverTimestamp(),
          provider: "google.com"
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore sync error:", e);
      }

      this.persistSession(userSession);
      return userSession;
    }
  },

  // Facebook OAuth Login Simulation
  async loginWithFacebook(): Promise<UserSession> {
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

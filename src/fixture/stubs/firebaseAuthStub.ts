import { recordFixtureFirebaseCall } from "./firebaseCallLog";

function blocked(api: string): never {
  recordFixtureFirebaseCall("authApi");
  throw new Error(`ปิดในโหมดตรวจสอบหน้าจอ: Firebase Auth ${api} is blocked`);
}

export function getAuth(_app?: unknown): never {
  recordFixtureFirebaseCall("getAuth");
  throw new Error("ปิดในโหมดตรวจสอบหน้าจอ: Firebase getAuth is blocked");
}

export function onAuthStateChanged(_auth: unknown, _cb: unknown): () => void {
  recordFixtureFirebaseCall("authApi");
  return () => undefined;
}

export function signInWithEmailAndPassword(..._args: unknown[]): never {
  return blocked("signInWithEmailAndPassword");
}
export function createUserWithEmailAndPassword(..._args: unknown[]): never {
  return blocked("createUserWithEmailAndPassword");
}
export function signOut(..._args: unknown[]): never {
  return blocked("signOut");
}
export function sendPasswordResetEmail(..._args: unknown[]): never {
  return blocked("sendPasswordResetEmail");
}
export function signInWithPopup(..._args: unknown[]): never {
  return blocked("signInWithPopup");
}
export function updateProfile(..._args: unknown[]): never {
  return blocked("updateProfile");
}
export class GoogleAuthProvider {}
export class FacebookAuthProvider {}
export type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  providerData: Array<{ providerId?: string }>;
};

export default {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
  GoogleAuthProvider,
};

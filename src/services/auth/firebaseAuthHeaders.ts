import type { User } from "firebase/auth";
import {
  auth,
  firebaseAuthUnavailableMessage,
  isFirebaseAuthReady,
} from "../../lib/firebase";

export interface FirebaseAuthHeaderOptions {
  forceRefresh?: boolean;
  contentType?: "json" | "none";
}

export class FirebaseAuthUnavailableError extends Error {
  constructor() {
    super(firebaseAuthUnavailableMessage);
    this.name = "FirebaseAuthUnavailableError";
  }
}

function currentFirebaseUser(): User | null {
  return auth?.currentUser ?? null;
}

export async function getCurrentUserIdToken(
  forceRefresh = false
): Promise<string | null> {
  if (!isFirebaseAuthReady) return null;
  const user = currentFirebaseUser();
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export async function getFirebaseAuthHeaders(
  options: FirebaseAuthHeaderOptions = {}
): Promise<HeadersInit> {
  const token = await getCurrentUserIdToken(options.forceRefresh);
  const headers: Record<string, string> = {};
  if (options.contentType !== "none") {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function requireFirebaseAuthHeaders(
  options: FirebaseAuthHeaderOptions = {}
): Promise<HeadersInit> {
  const headers = await getFirebaseAuthHeaders(options);
  if (!("Authorization" in headers)) {
    throw new FirebaseAuthUnavailableError();
  }
  return headers;
}

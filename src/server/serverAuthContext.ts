import type { NextFunction, Request, Response } from "express";
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  canAccessAdmin,
  canAccessDealerPortal,
  canManageRoles,
  normalizeRole,
  type AuthRole,
  type DealerMembership,
  type UserAuthProfile,
  type UserStatus,
} from "../utils/rbac";
import { normalizeDealerId } from "../utils/dealerIdentity";

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  displayName: string;
  provider: "firebase";
  verificationMode: "firebase-admin" | "dev-mock";
}

export interface ServerAuthContext {
  uid: string;
  email: string;
  displayName: string;
  role: AuthRole;
  status: UserStatus;
  dealerId?: string;
  dealerName?: string;
  memberships: DealerMembership[];
  provider: "firebase";
  verificationMode: "firebase-admin" | "dev-mock";
}

export class ServerAuthError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "ServerAuthError";
    this.status = status;
  }
}

type DevTokenClaims = {
  uid?: string;
  sub?: string;
  email?: string;
  displayName?: string;
  name?: string;
};

type StoredProfile = Partial<UserAuthProfile> & {
  showroomName?: string;
  [key: string]: unknown;
};

function readJsonEnv<T>(key: string): T | null {
  const raw = process.env[key]?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Invalid ${key} JSON:`, err);
    return null;
  }
}

function extractAuthorizationBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

function parseDevTokenClaims(token: string): DevTokenClaims | null {
  if (process.env.NODE_ENV === "production") return null;
  const map = readJsonEnv<Record<string, DevTokenClaims>>(
    "NONGA_DEV_FIREBASE_TOKEN_MAP"
  );
  return map?.[token] ?? null;
}

function firebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    ""
  );
}

function initializeFirebaseAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = firebaseProjectId();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return initializeApp({
      credential: cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
    });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }

  throw new ServerAuthError(
    401,
    "Firebase Admin credentials are not configured"
  );
}

export function getServerFirestore() {
  return getFirestore(initializeFirebaseAdminApp());
}

export async function getFirebaseAuthUserByEmail(email: string) {
  const normalized = email.trim();
  if (!normalized) {
    throw Object.assign(new Error("กรุณาระบุอีเมลผู้ทดลอง"), { status: 400 });
  }
  return getAuth(initializeFirebaseAdminApp()).getUserByEmail(normalized);
}

function identityFromDecodedToken(decoded: DecodedIdToken): VerifiedFirebaseIdentity {
  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    displayName:
      decoded.name ??
      (typeof decoded.firebase?.sign_in_provider === "string"
        ? decoded.email?.split("@")[0]
        : "") ??
      "",
    provider: "firebase",
    verificationMode: "firebase-admin",
  };
}

export async function verifyFirebaseIdToken(
  token: string
): Promise<VerifiedFirebaseIdentity> {
  if (!token) {
    throw new ServerAuthError(401, "Missing Firebase ID token");
  }

  const devClaims = parseDevTokenClaims(token);
  if (devClaims) {
    const uid = String(devClaims.uid ?? devClaims.sub ?? "").trim();
    if (!uid) throw new ServerAuthError(401, "Invalid dev Firebase token");
    return {
      uid,
      email: String(devClaims.email ?? ""),
      displayName: String(
        devClaims.displayName ?? devClaims.name ?? devClaims.email ?? uid
      ),
      provider: "firebase",
      verificationMode: "dev-mock",
    };
  }

  try {
    const app = initializeFirebaseAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token);
    return identityFromDecodedToken(decoded);
  } catch (err) {
    if (err instanceof ServerAuthError) throw err;
    throw new ServerAuthError(401, "Invalid Firebase ID token");
  }
}

function normalizeProfile(
  identity: VerifiedFirebaseIdentity,
  stored?: StoredProfile | null
): UserAuthProfile {
  const role = stored?.role ? normalizeRole(stored.role) : "member";
  const status =
    stored?.status === "active" ||
    stored?.status === "pending" ||
    stored?.status === "suspended"
      ? stored.status
      : "pending";
  const dealerId = stored?.dealerId
    ? normalizeDealerId(stored.dealerId)
    : undefined;

  return {
    uid: identity.uid,
    email: String(stored?.email ?? identity.email ?? ""),
    displayName: String(
      stored?.displayName ?? identity.displayName ?? identity.email ?? identity.uid
    ),
    role,
    status,
    ...(dealerId ? { dealerId } : {}),
    dealerName: stored?.dealerName ?? stored?.showroomName,
    createdAt: stored?.createdAt,
    updatedAt: stored?.updatedAt,
  };
}

function buildSafeProvisionedProfile(identity: VerifiedFirebaseIdentity): StoredProfile {
  const now = new Date().toISOString();
  const displayName =
    identity.displayName?.trim() || identity.email?.split("@")[0] || "Nong A User";
  return {
    uid: identity.uid,
    email: identity.email ?? "",
    displayName,
    role: "member",
    status: "pending",
    membershipType: "free",
    postLimit: 5,
    totalPosts: 0,
    favoriteCars: [],
    aiPersona: "Professional - เน้นข้อมูลสเปกเชิงลึก",
    premiumExpireDate: null,
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
    provider: "firebase",
  };
}

async function ensureSafeUserProfileProvisioned(
  identity: VerifiedFirebaseIdentity
): Promise<StoredProfile | null> {
  const app = initializeFirebaseAdminApp();
  const db = getFirestore(app);
  const userRef = db.collection("users").doc(identity.uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (snap.exists) {
      return snap.data() as StoredProfile;
    }
    const safeDefaults = buildSafeProvisionedProfile(identity);
    tx.create(userRef, safeDefaults);
    return safeDefaults;
  });
}

function devUserProfile(uid: string): StoredProfile | null {
  if (process.env.NODE_ENV === "production") return null;
  const map = readJsonEnv<Record<string, StoredProfile>>(
    "NONGA_DEV_USER_PROFILE_MAP"
  );
  return map?.[uid] ?? null;
}

export async function resolveUserAuthProfile(
  identity: VerifiedFirebaseIdentity
): Promise<UserAuthProfile> {
  const devProfile = devUserProfile(identity.uid);
  if (devProfile) return normalizeProfile(identity, devProfile);

  try {
    const app = initializeFirebaseAdminApp();
    const snapshot = await getFirestore(app).collection("users").doc(identity.uid).get();
    if (snapshot.exists) {
      return normalizeProfile(identity, snapshot.data() as StoredProfile);
    }
    const provisioned = await ensureSafeUserProfileProvisioned(identity);
    return normalizeProfile(identity, provisioned);
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
  }

  return normalizeProfile(identity, null);
}

function normalizeMembership(raw: Partial<DealerMembership>): DealerMembership | null {
  const uid = String(raw.uid ?? "").trim();
  const dealerId = normalizeDealerId(String(raw.dealerId ?? ""));
  const dealerName = String(raw.dealerName ?? "").trim();
  const roleInDealer = raw.roleInDealer === "staff" ? "staff" : "owner";
  const status =
    raw.status === "active" || raw.status === "pending" || raw.status === "disabled"
      ? raw.status
      : "pending";
  if (!uid || !dealerId) return null;
  return {
    uid,
    dealerId,
    ...(dealerName ? { dealerName } : {}),
    roleInDealer,
    status,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

function devDealerMemberships(uid: string): DealerMembership[] | null {
  if (process.env.NODE_ENV === "production") return null;
  const map = readJsonEnv<Record<string, Partial<DealerMembership>[]>>(
    "NONGA_DEV_DEALER_MEMBERSHIP_MAP"
  );
  const rows = map?.[uid];
  if (!rows) return null;
  return rows
    .map((row) => normalizeMembership({ ...row, uid: row.uid ?? uid }))
    .filter((row): row is DealerMembership => row !== null);
}

export async function resolveDealerMemberships(
  uid: string
): Promise<DealerMembership[]> {
  const devRows = devDealerMemberships(uid);
  if (devRows) return devRows;

  try {
    const app = initializeFirebaseAdminApp();
    const snapshot = await getFirestore(app)
      .collection("dealerMembers")
      .where("uid", "==", uid)
      .get();
    return snapshot.docs
      .map((doc) => normalizeMembership(doc.data() as Partial<DealerMembership>))
      .filter((row): row is DealerMembership => row !== null);
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    return [];
  }
}

function deriveDealerId(
  profile: UserAuthProfile,
  memberships: DealerMembership[]
): string | undefined {
  const activeMemberships = memberships.filter((row) => row.status === "active");
  if (profile.dealerId) {
    const matchesMembership = activeMemberships.some(
      (row) => row.dealerId === profile.dealerId
    );
    if (matchesMembership || canAccessAdmin(profile)) return profile.dealerId;
  }
  return activeMemberships[0]?.dealerId;
}

function deriveDealerName(
  profile: UserAuthProfile,
  memberships: DealerMembership[],
  dealerId?: string
): string | undefined {
  if (profile.dealerName) return profile.dealerName;
  if (!dealerId) return undefined;
  return memberships.find((row) => row.dealerId === dealerId)?.dealerName;
}

function assertProfileCanBuildContext(
  profile: UserAuthProfile,
  memberships: DealerMembership[]
): void {
  if (profile.status === "suspended") {
    throw new ServerAuthError(
      403,
      "บัญชีนี้ถูกระงับการใช้งานครับ กรุณาติดต่อผู้ดูแลระบบ"
    );
  }
  const role = normalizeRole(profile.role);
  const activeMemberships = memberships.filter((row) => row.status === "active");
  if (role === "dealer" && activeMemberships.length === 0) {
    return;
  }
  if ((role === "admin" || role === "superadmin") && profile.status !== "active") {
    throw new ServerAuthError(
      403,
      "บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ"
    );
  }
}

export async function getServerAuthContext(
  req: Request
): Promise<ServerAuthContext> {
  const token = extractAuthorizationBearer(req);
  if (!token) throw new ServerAuthError(401, "Missing Firebase ID token");

  const identity = await verifyFirebaseIdToken(token);
  const profile = await resolveUserAuthProfile(identity);
  const memberships = await resolveDealerMemberships(identity.uid);
  assertProfileCanBuildContext(profile, memberships);
  const dealerId = deriveDealerId(profile, memberships);
  const dealerName = deriveDealerName(profile, memberships, dealerId);

  return {
    uid: identity.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    status: profile.status,
    ...(dealerId ? { dealerId } : {}),
    ...(dealerName ? { dealerName } : {}),
    memberships,
    provider: "firebase",
    verificationMode: identity.verificationMode,
  };
}

export function authorizeDealerScope(
  context: ServerAuthContext,
  requestedDealerId?: string | null
): { ok: true; dealerId: string } | { ok: false; status: 403; message: string } {
  if (context.status === "suspended") {
    return {
      ok: false,
      status: 403,
      message: "บัญชีนี้ถูกระงับการใช้งานครับ กรุณาติดต่อผู้ดูแลระบบ",
    };
  }
  if (context.status !== "active") {
    return {
      ok: false,
      status: 403,
      message: "บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ",
    };
  }
  if (!canAccessDealerPortal(context)) {
    return { ok: false, status: 403, message: "บัญชีนี้ไม่มีสิทธิ์ดีลเลอร์" };
  }

  const requested = requestedDealerId ? normalizeDealerId(requestedDealerId) : "";
  if (canAccessAdmin(context) || canManageRoles(context)) {
    const dealerId = requested || context.dealerId || "";
    if (!dealerId) {
      return { ok: false, status: 403, message: "ต้องระบุ dealerId" };
    }
    return { ok: true, dealerId };
  }

  if (!context.dealerId) {
    const hasPendingMembership = context.memberships.some(
      (row) => row.status === "pending"
    );
    return {
      ok: false,
      status: 403,
      message: hasPendingMembership
        ? "บัญชีดีลเลอร์นี้ยังรอการอนุมัติครับ"
        : "บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ",
    };
  }
  if (requested && requested !== context.dealerId) {
    return { ok: false, status: 403, message: "dealerId ไม่ตรงกับสิทธิ์ของบัญชีนี้" };
  }
  return { ok: true, dealerId: context.dealerId };
}

export function requireServerAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  getServerAuthContext(req)
    .then((context) => {
      req.apiAuth = {
        role: context.role,
        dealerId: context.dealerId,
        uid: context.uid,
        email: context.email,
        displayName: context.displayName,
        status: context.status,
        dealerName: context.dealerName,
        memberships: context.memberships,
        provider: "firebase",
      };
      next();
    })
    .catch((err) => {
      const status = err instanceof ServerAuthError ? err.status : 401;
      res.status(status).json({
        success: false,
        message: status === 401 ? "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ" : "บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้ครับ",
      });
    });
}

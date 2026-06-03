import type { Express, Request, Response } from "express";
import { getServerFirestore } from "./serverAuthContext";
import {
  buildPilotUserListItem,
  validatePilotProvisionRequest,
  membershipDocId,
  type PilotProvisionUserDoc,
} from "../services/admin/pilotUserProvisioningCore";
import { normalizeDealerId } from "../utils/dealerIdentity";
import { normalizeRole } from "../utils/rbac";

async function getExistingUser(uid: string): Promise<Record<string, unknown> | null> {
  const snapshot = await getServerFirestore().collection("users").doc(uid).get();
  if (!snapshot.exists) return null;
  return { uid: snapshot.id, ...(snapshot.data() as Record<string, unknown>) };
}

export async function provisionPilotUser(params: {
  input: Record<string, unknown>;
  actorUid: string;
  actorRole: string;
}): Promise<{ user: PilotProvisionUserDoc; membershipId?: string }> {
  const validated = validatePilotProvisionRequest(
    params.input as Parameters<typeof validatePilotProvisionRequest>[0],
    normalizeRole(params.actorRole)
  );
  if (validated.ok === false) {
    throw Object.assign(new Error(validated.message), { status: 400 });
  }

  const data = validated.data;
  const existing = await getExistingUser(data.uid);
  const existingRole = String(existing?.role ?? "").trim();

  if (existingRole === "superadmin") {
    throw Object.assign(
      new Error("ไม่สามารถแก้ไข superadmin ผ่านหน้าผู้ใช้ทดลอง — ใช้ Firestore Console"),
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const createdAt = String(existing?.createdAt ?? now);
  const actorUid = params.actorUid.trim() || "admin";

  const userDoc: PilotProvisionUserDoc = {
    uid: data.uid,
    email: data.email || String(existing?.email ?? ""),
    displayName: data.displayName,
    role: data.role,
    status: data.status,
    updatedBy: actorUid,
    createdAt,
    updatedAt: now,
    ...(data.dealerId ? { dealerId: data.dealerId } : {}),
    ...(data.dealerName ? { dealerName: data.dealerName } : {}),
    ...(data.pilotNote ? { pilotNote: data.pilotNote } : {}),
    provisionedBy: String(existing?.provisionedBy ?? actorUid),
  };

  if (data.role !== "dealer") {
    delete userDoc.dealerId;
    delete userDoc.dealerName;
  }

  const db = getServerFirestore();
  await db.collection("users").doc(data.uid).set(userDoc, { merge: true });

  let membershipId: string | undefined;
  if (data.role === "dealer" && data.dealerId) {
    membershipId = membershipDocId(data.uid, data.dealerId);
    const membership = {
      uid: data.uid,
      dealerId: normalizeDealerId(data.dealerId),
      ...(data.dealerName ? { dealerName: data.dealerName } : {}),
      roleInDealer: data.roleInDealer,
      status:
        data.status === "active"
          ? "active"
          : data.status === "pending"
            ? "pending"
            : "disabled",
      createdAt: String(existing?.createdAt ?? now),
      updatedAt: now,
      provisionedBy: actorUid,
      updatedBy: actorUid,
    };
    await db.collection("dealerMembers").doc(membershipId).set(membership, { merge: true });
  }

  return { user: userDoc, membershipId };
}

export async function listPilotUsers(limit = 40) {
  const db = getServerFirestore();
  const snapshot = await db
    .collection("users")
    .orderBy("updatedAt", "desc")
    .limit(Math.min(Math.max(limit, 1), 100))
    .get()
    .catch(async () => {
      const fallback = await db.collection("users").limit(Math.min(Math.max(limit, 1), 100)).get();
      return fallback;
    });

  return snapshot.docs.map((doc) =>
    buildPilotUserListItem({ uid: doc.id, ...(doc.data() as Record<string, unknown>) })
  );
}

export function registerAdminPilotUserRoutes(app: Express): void {
  app.get("/api/admin/pilot-users", async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit ?? 40);
      const rows = await listPilotUsers(Number.isFinite(limit) ? limit : 40);
      return res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
      const message = err instanceof Error ? err.message : "โหลดรายชื่อผู้ใช้ไม่สำเร็จ";
      console.error("[GET /api/admin/pilot-users]", message);
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/admin/pilot-users/provision", async (req: Request, res: Response) => {
    try {
      const actorUid = String(req.apiAuth?.uid ?? "").trim();
      const actorRole = String(req.apiAuth?.role ?? "").trim();
      if (!actorUid || (actorRole !== "admin" && actorRole !== "superadmin")) {
        return res.status(403).json({
          success: false,
          message: "บัญชีนี้ไม่มีสิทธิ์จัดการผู้ใช้ทดลองครับ",
        });
      }

      const result = await provisionPilotUser({
        input: req.body ?? {},
        actorUid,
        actorRole,
      });

      return res.json({
        success: true,
        data: result,
        message: "บันทึกสิทธิผู้ใช้ทดลองเรียบร้อยแล้ว",
      });
    } catch (err) {
      const status =
        err && typeof err === "object" && "status" in err && typeof (err as { status: number }).status === "number"
          ? (err as { status: number }).status
          : 500;
      const message = err instanceof Error ? err.message : "บันทึกสิทธิผู้ใช้ไม่สำเร็จ";
      console.error("[POST /api/admin/pilot-users/provision]", message);
      return res.status(status).json({ success: false, message });
    }
  });
}

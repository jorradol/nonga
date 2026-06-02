import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { resolveInventoryDataBackend, type NongaDataBackend } from "./inventoryRepository";

export type ListingReportStatus = "open" | "reviewed" | "dismissed" | "actioned";
export type ListingReportReason =
  | "incorrect-info"
  | "image-mismatch-or-inappropriate"
  | "suspected-fraud"
  | "duplicate-listing"
  | "contact-unreachable-or-unclear"
  | "other";

export interface ListingReportRecord {
  reportId: string;
  listingId: string;
  listingTitle?: string;
  reason: ListingReportReason;
  note?: string;
  reporterUserId?: string;
  reporterRole?: string;
  createdAt: string;
  status: ListingReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface ListingReportRepository {
  create(input: Omit<ListingReportRecord, "reportId" | "createdAt" | "status">): Promise<ListingReportRecord>;
  list(status?: ListingReportStatus): Promise<ListingReportRecord[]>;
  getById(reportId: string): Promise<ListingReportRecord | null>;
  update(reportId: string, patch: Partial<ListingReportRecord>): Promise<ListingReportRecord | null>;
}

class FileListingReportRepository implements ListingReportRepository {
  private readonly reports = new Map<string, ListingReportRecord>();

  async create(
    input: Omit<ListingReportRecord, "reportId" | "createdAt" | "status">
  ): Promise<ListingReportRecord> {
    const report: ListingReportRecord = {
      reportId: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      reason: input.reason,
      ...(input.note ? { note: input.note } : {}),
      ...(input.reporterUserId ? { reporterUserId: input.reporterUserId } : {}),
      ...(input.reporterRole ? { reporterRole: input.reporterRole } : {}),
      createdAt: new Date().toISOString(),
      status: "open",
    };
    this.reports.set(report.reportId, report);
    return report;
  }

  async list(status?: ListingReportStatus): Promise<ListingReportRecord[]> {
    const rows = Array.from(this.reports.values());
    const filtered = status ? rows.filter((r) => r.status === status) : rows;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(reportId: string): Promise<ListingReportRecord | null> {
    return this.reports.get(reportId) ?? null;
  }

  async update(
    reportId: string,
    patch: Partial<ListingReportRecord>
  ): Promise<ListingReportRecord | null> {
    const existing = this.reports.get(reportId);
    if (!existing) return null;
    const next: ListingReportRecord = { ...existing, ...patch, reportId: existing.reportId };
    this.reports.set(reportId, next);
    return next;
  }
}

interface FirestoreCollectionLike {
  doc(id?: string): {
    id: string;
    set(data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<void>;
    get(): Promise<{ exists: boolean; id: string; data(): Record<string, unknown> | undefined }>;
  };
  where(field: string, op: "==", value: string): { get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown> }> }> };
  orderBy(field: string, direction: "asc" | "desc"): { get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown> }> }> };
}

interface FirestoreDbLike {
  collection(name: string): FirestoreCollectionLike;
}

class FirestoreListingReportRepository implements ListingReportRepository {
  constructor(private readonly db: FirestoreDbLike) {}

  private collection(): FirestoreCollectionLike {
    return this.db.collection("listingReports");
  }

  async create(
    input: Omit<ListingReportRecord, "reportId" | "createdAt" | "status">
  ): Promise<ListingReportRecord> {
    const ref = this.collection().doc();
    const report: ListingReportRecord = {
      reportId: ref.id,
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      reason: input.reason,
      ...(input.note ? { note: input.note } : {}),
      ...(input.reporterUserId ? { reporterUserId: input.reporterUserId } : {}),
      ...(input.reporterRole ? { reporterRole: input.reporterRole } : {}),
      createdAt: new Date().toISOString(),
      status: "open",
    };
    await ref.set(report as unknown as Record<string, unknown>);
    return report;
  }

  async list(status?: ListingReportStatus): Promise<ListingReportRecord[]> {
    const snap = status
      ? await this.collection().where("status", "==", status).get()
      : await this.collection().orderBy("createdAt", "desc").get();
    return snap.docs
      .map((doc) => ({ reportId: doc.id, ...(doc.data() as object) } as ListingReportRecord))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(reportId: string): Promise<ListingReportRecord | null> {
    const snap = await this.collection().doc(reportId).get();
    if (!snap.exists) return null;
    return { reportId: snap.id, ...(snap.data() as object) } as ListingReportRecord;
  }

  async update(
    reportId: string,
    patch: Partial<ListingReportRecord>
  ): Promise<ListingReportRecord | null> {
    const existing = await this.getById(reportId);
    if (!existing) return null;
    await this.collection()
      .doc(reportId)
      .set({ ...patch, reportId: existing.reportId } as unknown as Record<string, unknown>, {
        merge: true,
      });
    return this.getById(reportId);
  }
}

function initializeReportsAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      ...(projectId ? { projectId } : {}),
    });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }
  throw new Error("Firebase Admin credentials are required for listing reports repository");
}

export function createListingReportRepository(
  backend: NongaDataBackend = resolveInventoryDataBackend()
): ListingReportRepository {
  if (backend === "firestore") {
    const app = initializeReportsAdminApp();
    return new FirestoreListingReportRepository(getFirestore(app) as unknown as FirestoreDbLike);
  }
  return new FileListingReportRepository();
}


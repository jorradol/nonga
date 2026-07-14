/**
 * Shadow Mode AI quota usage report — reads Firestore collection `quota_usage`.
 *
 * Usage:
 *   npx tsx scripts/check-quota-usage.mts
 *
 * Requires Firebase Admin credentials (same env vars as production server):
 *   FIREBASE_SERVICE_ACCOUNT_JSON  OR  FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   OR  GOOGLE_APPLICATION_CREDENTIALS
 */
import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const QUOTA_USAGE_COLLECTION = "quota_usage";

interface QuotaUsageRow {
  userId: string;
  dailyRequestCount: number;
  dailyTokenCount: number;
  requestCount: number;
  totalTokens: number;
  updatedAt: string;
}

function env(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function firebaseProjectId(): string {
  return (
    env("FIREBASE_PROJECT_ID") ||
    env("NONGA_FIREBASE_PROJECT_ID") ||
    env("GOOGLE_CLOUD_PROJECT") ||
    env("GCLOUD_PROJECT")
  );
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = firebaseProjectId();
  const serviceAccountJson = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      ...(projectId ? { projectId } : {}),
    });
  }

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  if (env("GOOGLE_APPLICATION_CREDENTIALS")) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }

  throw new Error(
    "ไม่พบ Firebase Admin credentials — ตั้งค่า FIREBASE_SERVICE_ACCOUNT_JSON หรือ FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY หรือ GOOGLE_APPLICATION_CREDENTIALS"
  );
}

function nonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function parseQuotaDoc(docId: string, raw: Record<string, unknown> | undefined): QuotaUsageRow {
  const userId =
    typeof raw?.userId === "string" && raw.userId.trim() ? raw.userId.trim() : docId;
  const updatedAt =
    typeof raw?.updatedAt === "string" && raw.updatedAt.trim()
      ? raw.updatedAt.trim()
      : typeof raw?.lastUsageAt === "string" && raw.lastUsageAt.trim()
        ? raw.lastUsageAt.trim()
        : "";

  return {
    userId,
    dailyRequestCount: nonNegativeInt(raw?.dailyRequestCount),
    dailyTokenCount: nonNegativeInt(raw?.dailyTokenCount),
    requestCount: nonNegativeInt(raw?.requestCount),
    totalTokens: nonNegativeInt(raw?.totalTokens),
    updatedAt,
  };
}

function parseUpdatedAtMs(updatedAt: string): number {
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

async function fetchQuotaUsageRows(): Promise<QuotaUsageRow[]> {
  initializeFirebaseAdmin();
  const db = getFirestore();
  const snap = await db.collection(QUOTA_USAGE_COLLECTION).get();

  const rows = snap.docs.map((doc) =>
    parseQuotaDoc(doc.id, doc.data() as Record<string, unknown>)
  );

  rows.sort((a, b) => parseUpdatedAtMs(b.updatedAt) - parseUpdatedAtMs(a.updatedAt));
  return rows;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatUpdatedAt(iso: string): string {
  if (!iso) return "-";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

function printTable(rows: QuotaUsageRow[]): void {
  const headers = ["userId", "Total Requests", "Total Tokens", "updatedAt"];
  const tableRows = rows.map((row) => [
    row.userId,
    formatNumber(row.dailyRequestCount),
    formatNumber(row.dailyTokenCount),
    formatUpdatedAt(row.updatedAt),
  ]);

  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...tableRows.map((row) => String(row[index]).length)
    )
  );

  const pad = (value: string, width: number, align: "left" | "right") =>
    align === "right" ? value.padStart(width) : value.padEnd(width);

  const divider = widths.map((w) => "-".repeat(w)).join("-+-");
  const headerLine = headers
    .map((header, index) => {
      const align = index === 0 || index === 3 ? "left" : "right";
      return pad(header, widths[index], align);
    })
    .join(" | ");

  console.log(headerLine);
  console.log(divider);

  for (const row of tableRows) {
    console.log(
      row
        .map((cell, index) => {
          const align = index === 0 || index === 3 ? "left" : "right";
          return pad(String(cell), widths[index], align);
        })
        .join(" | ")
    );
  }
}

function printGrandTotals(rows: QuotaUsageRow[]): void {
  const grandRequests = rows.reduce((sum, row) => sum + row.requestCount, 0);
  const grandTokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);

  console.log("");
  console.log("สรุปยอดรวม (ตั้งแต่เริ่มเก็บข้อมูล)");
  console.log(`- Grand Total Requests : ${formatNumber(grandRequests)}`);
  console.log(`- Grand Total Tokens   : ${formatNumber(grandTokens)}`);
  console.log(`- จำนวนผู้ใช้งาน       : ${formatNumber(rows.length)}`);
}

async function main(): Promise<void> {
  const projectId = firebaseProjectId();
  console.log("Nong A — Shadow Mode AI Quota Usage");
  if (projectId) {
    console.log(`Project: ${projectId}`);
  }
  console.log(`Collection: ${QUOTA_USAGE_COLLECTION}`);
  console.log("");

  let rows: QuotaUsageRow[];
  try {
    rows = await fetchQuotaUsageRows();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firestore:");
    console.error(message);
    process.exitCode = 1;
    return;
  }

  if (rows.length === 0) {
    console.log("ยังไม่มีข้อมูลการใช้งาน");
    return;
  }

  console.log("หมายเหตุ: Total Requests / Total Tokens คือยอดรายวัน (dailyRequestCount / dailyTokenCount)");
  console.log("");
  printTable(rows);
  printGrandTotals(rows);
}

void main();

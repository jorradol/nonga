/**
 * v5.4.7f — staging admin listing-reports smoke (API E2E)
 * APP_URL=https://nonga-ce93c.web.app npm run test:v547f-admin-staging-smoke
 */
import "dotenv/config";
import { strict as assert } from "node:assert";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const BASE = (process.env.APP_URL ?? "https://nonga-ce93c.web.app").replace(/\/$/, "");
const BLOCKED_PUBLIC = [
  "reports",
  "reportOpenCount",
  "moderationStatus",
  "adminHiddenReason",
  "adminHiddenAt",
  "adminHiddenBy",
  "sellerConsentAccepted",
  "sellerConsentVersion",
];

type CarRow = {
  id: string;
  listingStatus?: string;
  title?: string;
  [key: string]: unknown;
};

type ReportRow = {
  reportId: string;
  listingId: string;
  status: string;
  listingTitle?: string;
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function publicLeaksMetadata(car: Record<string, unknown>): string[] {
  return BLOCKED_PUBLIC.filter((k) => k in car);
}

async function getAdminIdToken(): Promise<string> {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim();
  if (!saJson || !apiKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON and VITE_FIREBASE_API_KEY required");
  }
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(saJson)) });
  }
  let uid =
    process.env.NONGA_TEST_ADMIN_UID?.trim() ||
    process.env.NONGA_STAGING_ADMIN_UID?.trim() ||
    "";
  if (!uid) {
    const snap = await getFirestore()
      .collection("users")
      .where("role", "in", ["admin", "superadmin"])
      .limit(1)
      .get();
    uid = snap.docs[0]?.id ?? "";
  }
  if (!uid) throw new Error("No admin uid found for staging smoke");

  const customToken = await getAuth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const json = (await res.json()) as { idToken?: string; error?: { message?: string } };
  if (!res.ok || !json.idToken) {
    throw new Error(json.error?.message || "Failed to mint admin idToken");
  }
  return json.idToken;
}

async function fetchCars(): Promise<CarRow[]> {
  const res = await fetch(`${BASE}/api/cars`, { cache: "no-store" });
  const json = (await res.json()) as { success?: boolean; data?: CarRow[] };
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error("GET /api/cars failed");
  }
  return json.data;
}

async function createReport(listingId: string, note: string): Promise<void> {
  const res = await fetch(`${BASE}/api/cars/${encodeURIComponent(listingId)}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "other", note }),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.message || "create report failed");
  }
}

async function adminFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function listReports(token: string, status: string): Promise<ReportRow[]> {
  const q = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const res = await adminFetch(token, `/api/admin/listing-reports${q}`);
  const json = (await res.json()) as { success?: boolean; data?: ReportRow[]; message?: string };
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || "list reports failed");
  }
  return json.data;
}

async function patchReport(
  token: string,
  reportId: string,
  action: "reviewed" | "dismiss" | "hide",
  adminNote?: string
): Promise<ReportRow> {
  const res = await adminFetch(token, `/api/admin/listing-reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      action,
      ...(adminNote ? { adminNote } : {}),
    }),
  });
  const json = (await res.json()) as { success?: boolean; data?: ReportRow; message?: string };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || `patch ${action} failed`);
  }
  return json.data;
}

function findOpenReportForListing(rows: ReportRow[], listingId: string): ReportRow | undefined {
  return rows.find((r) => r.listingId === listingId && r.status === "open");
}

console.log("=== v5.4.7f admin staging smoke ===\n", BASE);

// 6) unauth guard
const unauth = await fetch(`${BASE}/api/admin/listing-reports`);
ok("unauth-admin-reports-401", unauth.status === 401, String(unauth.status));

let adminToken = "";
try {
  adminToken = await getAdminIdToken();
  ok("admin-id-token-minted", adminToken.length > 20, "");
} catch (e) {
  console.error("BLOCKER: cannot mint admin token:", e instanceof Error ? e.message : e);
  process.exit(1);
}

// 1) admin list works
const openBefore = await listReports(adminToken, "open");
ok("admin-list-open-reports", Array.isArray(openBefore), `count=${openBefore.length}`);

const carsBefore = await fetchCars();
ok("public-cars-available", carsBefore.length > 0, `count=${carsBefore.length}`);
for (const car of carsBefore.slice(0, 3)) {
  const leaks = publicLeaksMetadata(car as Record<string, unknown>);
  ok(`public-no-metadata-${car.id}`, leaks.length === 0, leaks.join(","));
}

const reviewTarget = carsBefore[0];
const dismissTarget = carsBefore[1] ?? carsBefore[0];
const hideTarget = carsBefore[carsBefore.length - 1];

if (!reviewTarget || !hideTarget) {
  throw new Error("Need at least one listing for smoke");
}

// Ensure open reports exist
await createReport(reviewTarget.id, `smoke-reviewed-${Date.now()}`);
if (dismissTarget.id !== reviewTarget.id) {
  await createReport(dismissTarget.id, `smoke-dismiss-${Date.now()}`);
}
await createReport(hideTarget.id, `smoke-hide-${Date.now()}`);

const openAfterCreate = await listReports(adminToken, "open");
const reportReview = findOpenReportForListing(openAfterCreate, reviewTarget.id);
const reportDismiss =
  dismissTarget.id === reviewTarget.id
    ? reportReview
    : findOpenReportForListing(openAfterCreate, dismissTarget.id);
const reportHide = findOpenReportForListing(openAfterCreate, hideTarget.id);

ok("open-report-for-review-target", !!reportReview, reportReview?.reportId ?? "");
ok("open-report-for-hide-target", !!reportHide, reportHide?.reportId ?? "");

// 7-8) report alone must not hide + no false metadata leak
const afterReportCars = await fetchCars();
ok(
  "report-alone-listing-stays-published",
  afterReportCars.some((c) => c.id === reviewTarget.id),
  reviewTarget.id
);
const reportedCar = afterReportCars.find((c) => c.id === reviewTarget.id) as
  | Record<string, unknown>
  | undefined;
ok(
  "under-review-not-hidden-in-public-api",
  reportedCar?.listingStatus !== "hidden",
  String(reportedCar?.listingStatus ?? "missing")
);
ok(
  "under-review-no-public-metadata",
  reportedCar ? publicLeaksMetadata(reportedCar).length === 0 : false,
  ""
);

// 3) reviewed
if (reportReview) {
  const reviewed = await patchReport(adminToken, reportReview.reportId, "reviewed");
  ok("reviewed-status", reviewed.status === "reviewed", reviewed.status);
  const carsAfterReviewed = await fetchCars();
  const car = carsAfterReviewed.find((c) => c.id === reviewTarget.id) as
    | Record<string, unknown>
    | undefined;
  ok(
    "reviewed-listing-still-in-marketplace",
    !!car && car.listingStatus !== "hidden",
    reviewTarget.id
  );
  ok(
    "reviewed-no-public-metadata",
    car ? publicLeaksMetadata(car).length === 0 : false,
    ""
  );
}

// 4) dismiss
if (reportDismiss && reportDismiss.reportId !== reportReview?.reportId) {
  const dismissed = await patchReport(adminToken, reportDismiss.reportId, "dismiss");
  ok("dismiss-status", dismissed.status === "dismissed", dismissed.status);
  const carsAfterDismiss = await fetchCars();
  const car = carsAfterDismiss.find((c) => c.id === dismissTarget.id) as
    | Record<string, unknown>
    | undefined;
  ok(
    "dismiss-listing-still-in-marketplace",
    !!car && car.listingStatus !== "hidden",
    dismissTarget.id
  );
  ok(
    "dismiss-no-public-metadata",
    car ? publicLeaksMetadata(car).length === 0 : false,
    ""
  );
} else {
  ok("dismiss-status", true, "skipped-same-report-as-reviewed");
  ok("dismiss-listing-still-in-marketplace", true, "skipped");
  ok("dismiss-no-public-metadata", true, "skipped");
}

// 5) hide
if (reportHide) {
  const hidden = await patchReport(adminToken, reportHide.reportId, "hide", "staging-smoke-hide");
  ok("hide-status", hidden.status === "actioned", hidden.status);
  const carsAfterHide = await fetchCars();
  ok(
    "hide-removes-from-public-marketplace",
    !carsAfterHide.some((c) => c.id === hideTarget.id),
    hideTarget.id
  );
  const stillListed = carsAfterHide.find((c) => c.id === reviewTarget.id);
  ok(
    "hide-does-not-wipe-other-listings",
    reviewTarget.id === hideTarget.id ? true : !!stillListed,
    ""
  );
  for (const car of carsAfterHide.slice(0, 3)) {
    ok(
      `hide-public-metadata-clean-${car.id}`,
      publicLeaksMetadata(car as Record<string, unknown>).length === 0,
      ""
    );
  }
}

console.log("\n=== v5.4.7f admin staging smoke — done ===\n");
assert(process.exitCode !== 1, "some checks failed");

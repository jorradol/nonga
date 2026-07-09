/**
 * Staging-only Thor duplicate cleanup (v22.19).
 * Merges durable Firebase image URLs into older canonical listings,
 * then hides the newer duplicate rows. No production. No PII logged.
 *
 * Auth: uses `gcloud auth print-access-token` (operator session) via Firestore REST.
 * Does not print tokens. Does not require owner terminal/token.
 *
 * Usage: npx tsx scripts/run-v22.19-staging-thor-duplicate-cleanup.mts
 */
import { execFileSync } from "node:child_process";

const PROJECT_ID = "nonga-ce93c";
const COLLECTION = "dealerListings";

const PAIRS = [
  {
    vehicle: "Honda CRV 2019",
    canonicalId: "car-import-1783556891631-p0",
    duplicateId: "car-import-1783565788477-p0",
  },
  {
    vehicle: "Toyota Camry 2019",
    canonicalId: "car-import-1783556891631-p1",
    duplicateId: "car-import-1783565788477-p1",
  },
  {
    vehicle: "MAZDA CX-30 2022",
    canonicalId: "car-import-1783556891631-p2",
    duplicateId: "car-import-1783565788477-p2",
  },
] as const;

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDoc {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}

function getAccessToken(): string {
  const fromEnv = String(process.env.NONGA_STAGING_CLEANUP_ACCESS_TOKEN ?? "").trim();
  if (fromEnv) return fromEnv;

  const gcloudBin =
    process.env.NONGA_STAGING_CLEANUP_GCLOUD?.trim() ||
    (process.platform === "win32" ? "gcloud.cmd" : "gcloud");
  const out = execFileSync(gcloudBin, ["auth", "print-access-token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  }).trim();
  if (!out) throw new Error("empty gcloud access token");
  return out;
}

function docUrl(id: string): string {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodeURIComponent(id)}`;
}

async function getDoc(
  token: string,
  id: string
): Promise<{ exists: boolean; fields: Record<string, FirestoreValue> }> {
  const res = await fetch(docUrl(id), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return { exists: false, fields: {} };
  if (!res.ok) {
    throw new Error(`GET ${id} failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as FirestoreDoc;
  return { exists: true, fields: body.fields ?? {} };
}

async function patchDoc(
  token: string,
  id: string,
  fields: Record<string, FirestoreValue>,
  updateMask: string[]
): Promise<void> {
  const qs = updateMask
    .map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`)
    .join("&");
  const res = await fetch(`${docUrl(id)}?${qs}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${id} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
}

function asString(v: FirestoreValue | undefined): string {
  if (!v) return "";
  if ("stringValue" in v) return String(v.stringValue ?? "");
  if ("integerValue" in v) return String(v.integerValue ?? "");
  if ("doubleValue" in v) return String(v.doubleValue ?? "");
  return "";
}

function asNumber(v: FirestoreValue | undefined): number {
  if (!v) return 0;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("stringValue" in v) return Number(v.stringValue) || 0;
  return 0;
}

function asStringArray(v: FirestoreValue | undefined): string[] {
  if (!v || !("arrayValue" in v)) return [];
  const values = v.arrayValue.values ?? [];
  return values
    .map((item) => ("stringValue" in item ? String(item.stringValue ?? "") : ""))
    .filter(Boolean);
}

function isDurableFirebaseUrl(url: string): boolean {
  return /^https?:\/\/firebasestorage\.googleapis\.com\//i.test(String(url ?? ""));
}

function stringField(value: string): FirestoreValue {
  return { stringValue: value };
}

function nullField(): FirestoreValue {
  return { nullValue: null };
}

function arrayField(urls: string[]): FirestoreValue {
  return {
    arrayValue: {
      values: urls.map((u) => ({ stringValue: u })),
    },
  };
}

async function main(): Promise<void> {
  const token = getAccessToken();
  const audit: Array<Record<string, unknown>> = [];

  for (const pair of PAIRS) {
    const [canon, dup] = await Promise.all([
      getDoc(token, pair.canonicalId),
      getDoc(token, pair.duplicateId),
    ]);

    if (!canon.exists || !dup.exists) {
      audit.push({
        vehicle: pair.vehicle,
        status: "SKIP_MISSING",
        canonicalExists: canon.exists,
        duplicateExists: dup.exists,
      });
      console.log("SKIP_MISSING", pair.vehicle, pair.canonicalId, pair.duplicateId);
      continue;
    }

    const same =
      asString(canon.fields.brand).toLowerCase() ===
        asString(dup.fields.brand).toLowerCase() &&
      asString(canon.fields.model).toLowerCase() ===
        asString(dup.fields.model).toLowerCase() &&
      asNumber(canon.fields.year) === asNumber(dup.fields.year) &&
      asNumber(canon.fields.price) === asNumber(dup.fields.price);

    if (!same) {
      audit.push({
        vehicle: pair.vehicle,
        status: "HOLD_FINGERPRINT_MISMATCH",
        canonicalId: pair.canonicalId,
        duplicateId: pair.duplicateId,
      });
      console.log("HOLD_FINGERPRINT_MISMATCH", pair.vehicle);
      continue;
    }

    const dupImages = asStringArray(dup.fields.images).filter(isDurableFirebaseUrl);
    if (dupImages.length === 0) {
      audit.push({
        vehicle: pair.vehicle,
        status: "HOLD_NO_DURABLE_IMAGES_ON_DUPLICATE",
        duplicateId: pair.duplicateId,
      });
      console.log("HOLD_NO_DURABLE_IMAGES_ON_DUPLICATE", pair.vehicle);
      continue;
    }

    const now = new Date().toISOString();
    const importKey =
      asString(dup.fields.importKey) || asString(canon.fields.importKey);
    const importKeyKind =
      asString(dup.fields.importKeyKind) || asString(canon.fields.importKeyKind);

    await patchDoc(
      token,
      pair.canonicalId,
      {
        images: arrayField(dupImages),
        ...(importKey ? { importKey: stringField(importKey) } : {}),
        ...(importKeyKind ? { importKeyKind: stringField(importKeyKind) } : {}),
        updatedAt: stringField(now),
        duplicateStatus: stringField("unique"),
        duplicateCanonicalId: nullField(),
      },
      [
        "images",
        ...(importKey ? ["importKey"] : []),
        ...(importKeyKind ? ["importKeyKind"] : []),
        "updatedAt",
        "duplicateStatus",
        "duplicateCanonicalId",
      ]
    );

    await patchDoc(
      token,
      pair.duplicateId,
      {
        listingStatus: stringField("hidden"),
        duplicateStatus: stringField("merged"),
        duplicateCanonicalId: stringField(pair.canonicalId),
        duplicateReviewAction: stringField("merge"),
        duplicateReviewedAt: stringField(now),
        updatedAt: stringField(now),
      },
      [
        "listingStatus",
        "duplicateStatus",
        "duplicateCanonicalId",
        "duplicateReviewAction",
        "duplicateReviewedAt",
        "updatedAt",
      ]
    );

    audit.push({
      vehicle: pair.vehicle,
      status: "MERGED_AND_HIDDEN",
      canonicalId: pair.canonicalId,
      duplicateId: pair.duplicateId,
      durableImageCount: dupImages.length,
      whyClear:
        "same brand/model/year/price fingerprint; newer batch has durable Firebase images",
    });
    console.log(
      "MERGED_AND_HIDDEN",
      pair.vehicle,
      "→",
      pair.canonicalId,
      "hid",
      pair.duplicateId,
      "images",
      dupImages.length
    );
  }

  console.log(JSON.stringify({ audit }, null, 2));
  const failed = audit.filter((a) => String(a.status) !== "MERGED_AND_HIDDEN");
  if (failed.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error("CLEANUP_FAILED", err instanceof Error ? err.message : err);
  process.exit(1);
});

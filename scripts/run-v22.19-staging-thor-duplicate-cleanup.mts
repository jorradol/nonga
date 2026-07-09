/**
 * Staging-only Thor duplicate cleanup (v22.19).
 * Merges durable Firebase image URLs into older canonical listings,
 * then hides the newer duplicate rows. No production. No PII logged.
 *
 * Usage: npx tsx scripts/run-v22.19-staging-thor-duplicate-cleanup.mts
 * Requires Application Default Credentials with Firestore access to nonga-ce93c.
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const COLLECTION = "dealerListings";

function isDurableFirebaseUrl(url: string): boolean {
  return /^https?:\/\/firebasestorage\.googleapis\.com\//i.test(String(url ?? ""));
}

async function main(): Promise<void> {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: "nonga-ce93c",
    });
  }
  const db = getFirestore();
  const audit: Array<Record<string, unknown>> = [];

  for (const pair of PAIRS) {
    const canonRef = db.collection(COLLECTION).doc(pair.canonicalId);
    const dupRef = db.collection(COLLECTION).doc(pair.duplicateId);
    const [canonSnap, dupSnap] = await Promise.all([canonRef.get(), dupRef.get()]);

    if (!canonSnap.exists || !dupSnap.exists) {
      audit.push({
        vehicle: pair.vehicle,
        status: "SKIP_MISSING",
        canonicalExists: canonSnap.exists,
        duplicateExists: dupSnap.exists,
      });
      console.log("SKIP_MISSING", pair.vehicle, pair.canonicalId, pair.duplicateId);
      continue;
    }

    const canon = canonSnap.data()!;
    const dup = dupSnap.data()!;

    // Safety: same brand/model/year/price fingerprint
    const same =
      String(canon.brand).toLowerCase() === String(dup.brand).toLowerCase() &&
      String(canon.model).toLowerCase() === String(dup.model).toLowerCase() &&
      Number(canon.year) === Number(dup.year) &&
      Number(canon.price) === Number(dup.price);
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

    const dupImages = Array.isArray(dup.images)
      ? (dup.images as string[]).filter(isDurableFirebaseUrl)
      : [];
    if (dupImages.length === 0) {
      audit.push({
        vehicle: pair.vehicle,
        status: "HOLD_NO_DURABLE_IMAGES_ON_DUPLICATE",
        duplicateId: pair.duplicateId,
      });
      console.log("HOLD_NO_DURABLE_IMAGES_ON_DUPLICATE", pair.vehicle);
      continue;
    }

    await canonRef.set(
      {
        images: dupImages,
        importKey: dup.importKey ?? canon.importKey ?? null,
        importKeyKind: dup.importKeyKind ?? canon.importKeyKind ?? null,
        updatedAt: new Date().toISOString(),
        duplicateStatus: "unique",
        duplicateCanonicalId: null,
      },
      { merge: true }
    );

    await dupRef.set(
      {
        listingStatus: "hidden",
        duplicateStatus: "merged",
        duplicateCanonicalId: pair.canonicalId,
        duplicateReviewAction: "merge",
        duplicateReviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    audit.push({
      vehicle: pair.vehicle,
      status: "MERGED_AND_HIDDEN",
      canonicalId: pair.canonicalId,
      duplicateId: pair.duplicateId,
      durableImageCount: dupImages.length,
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
}

main().catch((err) => {
  console.error("CLEANUP_FAILED", err instanceof Error ? err.message : err);
  process.exit(1);
});

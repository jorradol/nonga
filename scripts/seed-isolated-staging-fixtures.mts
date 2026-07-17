/**
 * Synthetic fixture seed plan for isolated staging.
 * Default: --dry-run (no Firestore writes).
 *
 * Exact write commands are intentionally withheld until separate Gate D approval.
 */

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  assertIsolatedTarget,
  requireOwnerApprovalPhrase,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";

interface ListingTemplate {
  id: string;
  brand: string;
  model: string;
  year: number;
  priceThb: number;
  dealerId: string;
  imageCountMin: number;
}

interface FixtureManifest {
  manifestVersion: string;
  proposedProjectIdForOwnerReviewOnly: string;
  listings: {
    publishedCountTarget: number;
    syntheticListingTemplates: ListingTemplate[];
    labelRequiredInTitleOrDescription: string;
    dealerPartitionForPublicCards: string;
    dealerPartitionForPortalTests: string;
  };
}

interface SyntheticListingDoc {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: "used";
  condition: string;
  mileage: number;
  fuelType: string;
  transmission: string;
  images: string[];
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  dealerId: string;
  listingStatus: "published";
  createdAt: string;
  updatedAt: string;
  isSold: false;
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || (!args.has("--write") && !args.has("--example"));
const write = args.has("--write");
const json = args.has("--json") || write;
const example = args.has("--example");

const manifestPath =
  process.env.NONGA_ISOLATED_STAGING_FIXTURE_MANIFEST ||
  "docs/examples/staging-synthetic-fixture-manifest.json";

function env(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function isoNow(): string {
  return new Date().toISOString();
}

function loadManifest(): FixtureManifest {
  return JSON.parse(readFileSync(manifestPath, "utf8")) as FixtureManifest;
}

function expandTemplates(manifest: FixtureManifest): SyntheticListingDoc[] {
  const target = manifest.listings.publishedCountTarget;
  const templates = manifest.listings.syntheticListingTemplates;
  const label = manifest.listings.labelRequiredInTitleOrDescription;
  const now = isoNow();
  const out: SyntheticListingDoc[] = [];

  for (let i = 0; i < target; i += 1) {
    const template = templates[i % templates.length];
    const seq = String(i + 1).padStart(3, "0");
    const id = i < templates.length ? template.id : `stg-car-${seq}`;
    const yearBump = Math.floor(i / templates.length);
    const year = template.year + yearBump;
    const price = template.priceThb + i * 5_000;
    out.push({
      id,
      title: `[${label}] ${template.brand} ${template.model} ${year}`,
      brand: template.brand,
      model: template.model,
      year,
      price,
      type: "used",
      condition: "good",
      mileage: 30_000 + i * 2_500,
      fuelType: "gasoline",
      transmission: "automatic",
      images: [`listing-images/stg-fixture-dealer-001/${id}/generated-placeholder-01.svg`],
      description: `${label} synthetic listing for isolated staging UI smoke (${id}). No PII.`,
      ownerId: "stg-fixture-owner-001",
      ownerName: "STAGING FICTIONAL OWNER",
      ownerPhone: "NOT-A-PHONE",
      dealerId: "stg-fixture-dealer-001",
      listingStatus: "published",
      createdAt: now,
      updatedAt: now,
      isSold: false,
    });
  }
  return out;
}

function initializeAdmin(projectId: string) {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccountJson = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) {
    throw new Error(
      "Verified isolated-staging FIREBASE_SERVICE_ACCOUNT_JSON is required for --write"
    );
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  if (String(serviceAccount.project_id ?? "").trim() !== projectId) {
    throw new Error("Service account project_id must match explicit isolated project");
  }
  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

async function writeListings(
  projectId: string,
  firestoreDatabaseId: string,
  listings: SyntheticListingDoc[]
): Promise<void> {
  initializeAdmin(projectId);
  const db = getFirestore(getApps()[0], firestoreDatabaseId);
  for (const listing of listings) {
    await db.collection("dealerListings").doc(listing.id).set(listing, { merge: true });
  }
}

function printPlan(payload: Record<string, unknown>): void {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log("Isolated staging synthetic fixture plan");
  console.log(`projectId: ${payload.projectId}`);
  console.log(`manifest: ${manifestPath}`);
  console.log(`listings: ${(payload.listings as SyntheticListingDoc[]).length}`);
  for (const listing of payload.listings as SyntheticListingDoc[]) {
    console.log(`- dealerListings/${listing.id}: ${listing.title}`);
  }
  if (dryRun) {
    console.log("\nDRY-RUN: no Firestore writes. Use --write after Owner approval phrase is set.");
  }
}

const manifest = loadManifest();
const target = resolveExplicitIsolatedTarget(process.env, "fixture seed");
assertIsolatedTarget(target, "fixture seed");
const projectId = target.projectId;

const listings = expandTemplates(manifest);
const plan = {
  mode: write ? "write" : dryRun ? "dry-run" : "plan",
  projectId,
  manifestPath,
  publishedCount: listings.length,
  safety: {
    copyFromProduction: false,
    leadCaptureEnabled: false,
    publicSignupEnabled: false,
  },
  listings,
};

if (write) {
  requireOwnerApprovalPhrase(
    env("OWNER_APPROVAL_PHRASE"),
    "gateDSeedFixtures",
    "staging fixture seed"
  );
  await writeListings(projectId, target.firestoreDatabaseId, listings);
  console.log(`PASS wrote ${listings.length} synthetic listings to ${projectId}`);
}

printPlan(plan);

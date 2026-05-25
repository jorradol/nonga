import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type SeedRole = "member" | "dealer" | "admin" | "superadmin";
type UserStatus = "active" | "pending" | "suspended";
type DealerMemberStatus = "active" | "pending" | "disabled";
type DealerRoleInDealer = "owner" | "staff";

interface UserSeedDoc {
  uid: string;
  email: string;
  displayName: string;
  role: SeedRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  dealerId?: string;
  dealerName?: string;
}

interface DealerMemberSeedDoc {
  uid: string;
  dealerId: string;
  dealerName: string;
  roleInDealer: DealerRoleInDealer;
  status: DealerMemberStatus;
  createdAt: string;
  updatedAt: string;
}

interface SeedPlan {
  users: Record<string, UserSeedDoc>;
  dealerMembers: Record<string, DealerMemberSeedDoc>;
}

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const json = args.has("--json") || args.has("--write");
const example = args.has("--example");

const requiredSeedEnvKeys = [
  "NONGA_TEST_MEMBER_UID",
  "NONGA_TEST_MEMBER_EMAIL",
  "NONGA_TEST_MEMBER_DISPLAY_NAME",
  "NONGA_TEST_DEALER_UID",
  "NONGA_TEST_DEALER_EMAIL",
  "NONGA_TEST_DEALER_DISPLAY_NAME",
  "NONGA_TEST_DEALER_ID",
  "NONGA_TEST_DEALER_NAME",
  "NONGA_TEST_ADMIN_UID",
  "NONGA_TEST_ADMIN_EMAIL",
  "NONGA_TEST_ADMIN_DISPLAY_NAME",
] as const;

function env(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function isoNow(): string {
  return new Date().toISOString();
}

function membershipId(uid: string, dealerId: string): string {
  return `${uid}_${dealerId}`;
}

function requireField(value: string, key: string, missing: string[]): string {
  if (!value) missing.push(key);
  return value;
}

function printSeedEnvStatus(): void {
  console.error("Seed env status (values redacted):");
  for (const key of requiredSeedEnvKeys) {
    console.error(`- ${key}: ${readSeedValue(key) ? "set" : "missing"}`);
  }
}

function roleFromEnv(value: string): "admin" | "superadmin" {
  return value === "superadmin" ? "superadmin" : "admin";
}

function sampleEnv(key: string): string {
  const samples: Record<string, string> = {
    NONGA_TEST_MEMBER_UID: "firebase-member-test-uid",
    NONGA_TEST_MEMBER_EMAIL: "member.test@example.com",
    NONGA_TEST_MEMBER_DISPLAY_NAME: "Nong A Test Member",
    NONGA_TEST_DEALER_UID: "firebase-dealer-test-uid",
    NONGA_TEST_DEALER_EMAIL: "dealer.test@example.com",
    NONGA_TEST_DEALER_DISPLAY_NAME: "Thor Auto Test Dealer",
    NONGA_TEST_DEALER_ID: "thor-auto",
    NONGA_TEST_DEALER_NAME: "Thor Auto Demo",
    NONGA_TEST_ADMIN_UID: "firebase-admin-test-uid",
    NONGA_TEST_ADMIN_EMAIL: "admin.test@example.com",
    NONGA_TEST_ADMIN_DISPLAY_NAME: "Nong A Test Admin",
    NONGA_TEST_ADMIN_ROLE: "admin",
  };
  return samples[key] ?? "";
}

function readSeedValue(key: string): string {
  return example ? sampleEnv(key) : env(key);
}

function buildSeedPlan(): { ok: true; plan: SeedPlan } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const now = isoNow();

  const memberUid = requireField(readSeedValue("NONGA_TEST_MEMBER_UID"), "NONGA_TEST_MEMBER_UID", missing);
  const memberEmail = requireField(readSeedValue("NONGA_TEST_MEMBER_EMAIL"), "NONGA_TEST_MEMBER_EMAIL", missing);
  const memberName = requireField(
    readSeedValue("NONGA_TEST_MEMBER_DISPLAY_NAME"),
    "NONGA_TEST_MEMBER_DISPLAY_NAME",
    missing
  );

  const dealerUid = requireField(readSeedValue("NONGA_TEST_DEALER_UID"), "NONGA_TEST_DEALER_UID", missing);
  const dealerEmail = requireField(readSeedValue("NONGA_TEST_DEALER_EMAIL"), "NONGA_TEST_DEALER_EMAIL", missing);
  const dealerDisplayName = requireField(
    readSeedValue("NONGA_TEST_DEALER_DISPLAY_NAME"),
    "NONGA_TEST_DEALER_DISPLAY_NAME",
    missing
  );
  const dealerId = requireField(readSeedValue("NONGA_TEST_DEALER_ID"), "NONGA_TEST_DEALER_ID", missing);
  const dealerName = requireField(readSeedValue("NONGA_TEST_DEALER_NAME"), "NONGA_TEST_DEALER_NAME", missing);

  const adminUid = requireField(readSeedValue("NONGA_TEST_ADMIN_UID"), "NONGA_TEST_ADMIN_UID", missing);
  const adminEmail = requireField(readSeedValue("NONGA_TEST_ADMIN_EMAIL"), "NONGA_TEST_ADMIN_EMAIL", missing);
  const adminDisplayName = requireField(
    readSeedValue("NONGA_TEST_ADMIN_DISPLAY_NAME"),
    "NONGA_TEST_ADMIN_DISPLAY_NAME",
    missing
  );
  const adminRole = roleFromEnv(readSeedValue("NONGA_TEST_ADMIN_ROLE"));

  if (missing.length > 0) return { ok: false, missing };

  const memberUser: UserSeedDoc = {
    uid: memberUid,
    email: memberEmail,
    displayName: memberName,
    role: "member",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const dealerUser: UserSeedDoc = {
    uid: dealerUid,
    email: dealerEmail,
    displayName: dealerDisplayName,
    role: "dealer",
    status: "active",
    dealerId,
    dealerName,
    createdAt: now,
    updatedAt: now,
  };

  const adminUser: UserSeedDoc = {
    uid: adminUid,
    email: adminEmail,
    displayName: adminDisplayName,
    role: adminRole,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const dealerMember: DealerMemberSeedDoc = {
    uid: dealerUid,
    dealerId,
    dealerName,
    roleInDealer: "owner",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  return {
    ok: true,
    plan: {
      users: {
        [memberUid]: memberUser,
        [dealerUid]: dealerUser,
        [adminUid]: adminUser,
      },
      dealerMembers: {
        [membershipId(dealerUid, dealerId)]: dealerMember,
      },
    },
  };
}

function initializeAdmin() {
  if (getApps().length > 0) return getApps()[0];
  const projectId =
    env("FIREBASE_PROJECT_ID") ||
    env("NONGA_FIREBASE_PROJECT_ID") ||
    env("GOOGLE_CLOUD_PROJECT") ||
    env("GCLOUD_PROJECT");
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

  throw new Error("Firebase Admin credentials are required for --write");
}

async function writeSeedPlan(plan: SeedPlan): Promise<void> {
  initializeAdmin();
  const db = getFirestore();
  for (const [uid, doc] of Object.entries(plan.users)) {
    await db.collection("users").doc(uid).set(doc, { merge: true });
  }
  for (const [id, doc] of Object.entries(plan.dealerMembers)) {
    await db.collection("dealerMembers").doc(id).set(doc, { merge: true });
  }
}

function printPlan(plan: SeedPlan): void {
  if (json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  console.log("Nong A v5.0 Firebase role test seed plan");
  console.log("users:");
  for (const [uid, doc] of Object.entries(plan.users)) {
    console.log(`- users/${uid}: ${doc.role} ${doc.status} ${doc.email}`);
  }
  console.log("dealerMembers:");
  for (const [id, doc] of Object.entries(plan.dealerMembers)) {
    console.log(`- dealerMembers/${id}: ${doc.dealerId} ${doc.roleInDealer} ${doc.status}`);
  }
}

const result = buildSeedPlan();
if (result.ok === false) {
  console.error("Missing required seed env:");
  for (const key of result.missing) console.error(`- ${key}`);
  printSeedEnvStatus();
  console.error("No passwords are required. Create Firebase Auth users first, then use their UIDs here.");
  process.exit(1);
}

if (write) {
  await writeSeedPlan(result.plan);
}

printPlan(result.plan);

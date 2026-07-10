/**
 * v22.48 — Existing durable lead storage discovery and readiness review
 * npm run test:v22.48
 *
 * Static + read-only staging probes. Does NOT enable capture.
 * Does NOT create leads. Does NOT switch repository. Does NOT write Firestore.
 */
import fs from "node:fs";
import path from "node:path";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  parseBuyerLeadCreateBody,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";
import {
  resolveBuyerLeadDataBackend,
  resetBuyerLeadRepositoryForTests,
  createBuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { LEAD_ENGINE_COLLECTIONS } from "../src/services/leads/leadTypes.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.48-existing-durable-lead-storage-discovery-and-readiness-review.md";
const PILOT_TITLES = ["Toyota Corolla 2020", "Toyota Corolla 2021"];

let failures = 0;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

console.log("=== v22.48 Durable Lead Storage Discovery ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc NEED REVIEW", /NEED REVIEW/.test(doc));
ok("doc recommends D1", /\*\*D1\*\*|Recommended next option:\s*\*\*D1\*\*/i.test(doc));
ok("doc not C1 as recommended", /Not recommended.*C1|C1.*Not recommended/i.test(doc));
ok("doc future auth draft present", /FINAL AUTHORIZE EXACTLY ONE SYNTHETIC DURABLE/.test(doc));
ok("doc no live switch claimed", /did not set `NONGA_LEAD_DATA_BACKEND`|No repository switch/i.test(doc));
ok("doc capture OFF", /Lead Capture remained OFF|leadCaptureEnabled.*false/i.test(doc));
ok("doc no dealer send", /No Dealer send|no Dealer-facing/i.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));
ok("doc no blead id dump", !/blead-[0-9]{10,}/.test(doc));
ok("doc no raw phone dump", !/0812345678|0000000000/.test(doc));

// --- Repository identification ---
const factory = read("src/server/repositories/buyerLeadRepository.ts");
const firestoreRepo = read("src/server/repositories/buyerLeadRepositoryFirestore.ts");
ok("memory repo identified", /InMemoryBuyerLeadRepository/.test(factory));
ok("firestore repo identified", /FirestoreBuyerLeadRepository/.test(firestoreRepo));
ok(
  "selection via NONGA_LEAD_DATA_BACKEND",
  /NONGA_LEAD_DATA_BACKEND/.test(factory) && /firestore/.test(factory)
);
ok("default memory", resolveBuyerLeadDataBackend({}) === "memory");
ok(
  "firestore when env set",
  resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "firestore" }) === "firestore"
);
ok(
  "invalid env stays memory",
  resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "postgres" }) === "memory"
);
ok(
  "inventory backend does not select lead firestore",
  resolveBuyerLeadDataBackend({ NONGA_DATA_BACKEND: "firestore" } as NodeJS.ProcessEnv) ===
    "memory"
);

resetBuyerLeadRepositoryForTests();
const mem = createBuyerLeadRepository("memory");
ok(
  "memory repo has interface methods",
  typeof mem.createBuyerLead === "function" &&
    typeof mem.getBuyerLeadById === "function" &&
    typeof mem.listBuyerLeadsByListingId === "function" &&
    typeof mem.updateBuyerLead === "function" &&
    typeof mem.appendContactLog === "function"
);
ok("collections buyerLeads", LEAD_ENGINE_COLLECTIONS.buyerLeads === "buyerLeads");
ok(
  "collections leadContactLogs",
  LEAD_ENGINE_COLLECTIONS.leadContactLogs === "leadContactLogs"
);

ok(
  "firestore create uses set",
  /createBuyerLead[\s\S]*\.set\(/.test(firestoreRepo)
);
ok(
  "firestore list by listingId",
  /listBuyerLeadsByListingId[\s\S]*listingId/.test(firestoreRepo)
);
ok(
  "firestore fails without admin creds message",
  /Firebase Admin credentials are required/.test(firestoreRepo)
);
const ifaceStart = factory.indexOf("export interface BuyerLeadRepository");
const ifaceEnd = factory.indexOf("}", ifaceStart);
const ifaceBlock =
  ifaceStart >= 0 && ifaceEnd > ifaceStart
    ? factory.slice(ifaceStart, ifaceEnd + 1)
    : "";
ok(
  "BuyerLeadRepository interface has no public delete",
  ifaceBlock.includes("createBuyerLead") && !/delete/i.test(ifaceBlock)
);
ok(
  "gated cleanup method name is controlled-only",
  /deleteBuyerLeadByIdForControlledCleanup/.test(
    read("src/server/repositories/buyerLeadRepositoryFirestore.ts")
  )
);

// --- Kill switch / ownership / API contract ---
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "kill switch true only",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true &&
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "1" }) === false
);

const body = parseBuyerLeadCreateBody({
  listingId: "car-synthetic",
  displayName: "Synthetic",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: "v5.6C-1",
  sellerId: "attacker",
  dealerId: "wrong",
  ownerId: "wrong",
} as Record<string, unknown>);
ok("parse ignores recipient overrides", body != null && !("sellerId" in (body as object)));
ok(
  "sellerId from listing ownership",
  resolveListingSellerId({ ownerId: "owner-nonga-dealer" }) === "owner-nonga-dealer"
);

const routes = read("src/server/buyerLeadRoutes.ts");
const queueRoutes = read("src/server/buyerLeadQueueRoutes.ts");
ok("create uses factory", /createBuyerLeadRepository/.test(routes));
ok("queue uses factory", /createBuyerLeadRepository/.test(queueRoutes));
ok("route kill switch present", /isLeadCaptureEnabled/.test(routes));
ok("no email/sms in buyerLeadRoutes", !/sendEmail|sendSms|twilio|nodemailer/.test(routes));
ok(
  "no email/sms in queue routes",
  !/sendEmail|sendSms|twilio|nodemailer/.test(queueRoutes)
);

// Legacy paths remain inactive for this engine
ok(
  "buyerLeadRoutes not InquireModal",
  !/InquireModal/.test(routes) && !/DealerLeads/.test(routes)
);

const rules = read("firestore.rules");
ok("rules deny buyerLeads client", /match \/buyerLeads\/\{leadId\}[\s\S]*allow read, write: if false/.test(rules));
ok(
  "rules deny leadContactLogs client",
  /match \/leadContactLogs\/\{logId\}[\s\S]*allow read, write: if false/.test(rules)
);

const healthSrc = read("server.ts");
ok(
  "health leadDataBackend is non-secret diagnostic",
  /leadDataBackend:\s*getActiveBuyerLeadDataBackend/.test(healthSrc)
);

console.log("\n--- Staging read-only (capture OFF, no writes) ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);

  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  const list = cars.data || [];
  ok("marketplace 15", Number(cars.count) === 15, `count=${cars.count}`);
  const pilot = list.filter((c: { title?: string }) =>
    PILOT_TITLES.includes(String(c.title || ""))
  );
  ok("pilot titles = 2", pilot.length === 2);
  let prot = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull", "sellerPhone"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
  }
  ok("public DTO no protected fields", prot === 0);
  for (const p of pilot) {
    ok(
      `Thor Auto ${p.title}`,
      p.sellerDisplayName === "Thor Auto" && p.dealerDisplayName === "Thor Auto"
    );
    ok(`images 5 ${p.title}`, Array.isArray(p.images) && p.images.length === 5);
  }

  const unauth = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", unauth.status === 401);

  // Non-writing evidence capture remains OFF: do not send authenticated create.
  // Documented expectation: authenticated create while OFF is 403 (proven in v22.47).
  ok("doc states auth create blocked while OFF", /403/.test(doc));
} catch (e) {
  ok("staging probes", false, String(e));
}

console.log(
  failures === 0
    ? "\n=== v22.48 PASS (static + read-only) ===\n"
    : `\n=== v22.48 FAIL (${failures}) ===\n`
);

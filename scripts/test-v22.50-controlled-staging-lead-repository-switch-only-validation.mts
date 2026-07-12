/**
 * v22.50 — Controlled Staging Lead repository switch-only validation (Option C2)
 * npm run test:v22.50
 *
 * Read-only staging probes + static guards.
 * Does NOT enable capture. Does NOT create Leads. Does NOT write queue.
 */
import fs from "node:fs";
import path from "node:path";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  resolveBuyerLeadDataBackend,
  getActiveBuyerLeadDataBackend,
  resetBuyerLeadRepositoryForTests,
  type BuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepository.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.50-controlled-staging-lead-repository-switch-only-validation.md";
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

console.log("=== v22.50 Switch-Only Validation ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc Option C2", /Option \*\*C2\*\*|Owner Option \*\*C2\*\*/.test(doc));
ok("doc PASS", /\*\*PASS\*\*/.test(doc));
ok("doc revision 00195", /nonga-staging-00195-bbs/.test(doc));
ok("doc prior 00194", /nonga-staging-00194-72z/.test(doc));
ok("doc capture OFF", /Lead Capture.*OFF|leadCaptureEnabled.*false/i.test(doc));
ok("doc zero leads", /Zero|zero|\*\*0\*\*/i.test(doc));
ok("doc D2 unapproved", /D2 remains unapproved|Not approved/i.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));
ok("doc no blead dump", !/blead-[0-9]{10,}/.test(doc));
ok("doc no raw phone", !/0812345678|0811111111/.test(doc));
ok("doc rollback ready", /Rollback/i.test(doc));

ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "kill switch true only",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true &&
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false
);
ok(
  "selector firestore",
  resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "firestore" }) === "firestore"
);
ok("selector default memory", resolveBuyerLeadDataBackend({}) === "memory");

const routes = read("src/server/buyerLeadRoutes.ts");
ok("route kill switch before create", /isLeadCaptureEnabled/.test(routes));
ok("route returns 403 when OFF", /status\(403\)/.test(routes));
ok("no email/sms in routes", !/sendEmail|twilio|nodemailer|webhook/.test(routes));

const healthSrc = read("server.ts");
ok("health has leadDataBackend", /leadDataBackend:\s*getActiveBuyerLeadDataBackend/.test(healthSrc));

// Authenticated OFF block without writing: service returns 403 before repo create.
resetBuyerLeadRepositoryForTests();
let createCalled = 0;
const spyRepo = {
  async createBuyerLead() {
    createCalled += 1;
    throw new Error("should not create");
  },
  async getBuyerLeadById() {
    return null;
  },
  async listBuyerLeadsByListingId() {
    return [];
  },
  async updateBuyerLead(l: unknown) {
    return l as never;
  },
  async appendContactLog(l: unknown) {
    return l as never;
  },
};
const blocked = await createConsentedBuyerLead({
  repository: spyRepo as unknown as BuyerLeadRepository,
  buyerUserId: "buyer-v2250",
  listing: { id: "listing-x", title: "X", price: 1, ownerId: "seller-x", isSold: false, listingStatus: "published" as const },
  env: {},
  input: {
    listingId: "listing-x",
    displayName: "X",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("auth OFF blocks create", blocked.ok === false && blocked.status === 403);
ok("repository create not called while OFF", createCalled === 0);

console.log("\n--- Staging read-only ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadDataBackend firestore", health.leadDataBackend === "firestore");
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);
  ok("no projectId in health", !("projectId" in health) && !("firebaseProjectId" in health));
  ok("no collection names in health", !("buyerLeads" in health));

  const unauth = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth 401", unauth.status === 401);

  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  const list = cars.data || [];
  ok("marketplace 15", Number(cars.count) === 15, `count=${cars.count}`);
  const pilot = list.filter((c: { title?: string }) =>
    PILOT_TITLES.includes(String(c.title || ""))
  );
  ok("pilot = 2", pilot.length === 2);
  let prot = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull", "sellerPhone"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
  }
  ok("DTO safe", prot === 0);
  for (const p of pilot) {
    ok(
      `Thor Auto ${p.title}`,
      p.sellerDisplayName === "Thor Auto" && p.dealerDisplayName === "Thor Auto"
    );
    ok(`images 5 ${p.title}`, Array.isArray(p.images) && p.images.length === 5);
  }

  const corolla = list.find((c: { title?: string }) => c.title === "Toyota Corolla 2020") as
    | { id?: string }
    | undefined;
  if (corolla?.id) {
    const stats = await (
      await fetch(`${STAGING}/api/listings/${corolla.id}/interest-queue-stats`)
    ).json();
    ok(
      "interest count 0",
      Number(stats?.data?.interestCount ?? stats?.interestCount) === 0
    );
  } else {
    ok("interest count 0", false, "missing corolla id");
  }
} catch (e) {
  ok("staging probes", false, String(e));
}

console.log(
  failures === 0 ? "\n=== v22.50 PASS ===\n" : `\n=== v22.50 FAIL (${failures}) ===\n`
);

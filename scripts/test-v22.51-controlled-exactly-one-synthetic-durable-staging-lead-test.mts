/**
 * v22.51 — Exactly-one synthetic durable Staging Lead (Option D2) — safe automated portion
 * npm run test:v22.51
 *
 * Read-only staging probes + doc/static assertions.
 * Does NOT enable capture. Does NOT create Leads.
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
  createConsentedBuyerLead,
} from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.51-controlled-exactly-one-synthetic-durable-staging-lead-test.md";
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

console.log("=== v22.51 Exactly-One Durable Synthetic Lead ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc Option D2", /Option \*\*D2\*\*/.test(doc));
ok("doc exactly one", /exactly \*\*one\*\*|Submit attempts \|\s*\*\*1\*\*/i.test(doc));
ok("doc 201", /\*\*201\*\*/.test(doc));
ok("doc durability", /Durability|repository recreation/i.test(doc));
ok("doc cleanup", /targeted delete|deleteBuyerLeadByIdForControlledCleanup/i.test(doc));
ok("doc returned OFF", /Capture OFF|leadCaptureEnabled.*false/i.test(doc));
ok("doc residue 0", /residue \|\s*\*\*0\*\*|Lead \/ log residue \|\s*\*\*0\*\*/i.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));
ok("doc PASS", /\*\*PASS\*\*/.test(doc));
ok("doc no dealer send", /No Dealer send|Dealer notification \|\s*\*\*None\*\*/i.test(doc));
ok("doc no blead dump", !/blead-[0-9]{10,}/.test(doc));
ok("doc no raw phone dump", !/0811111111|0000000000|0812345678/.test(doc));
ok("doc final revision 00197", /nonga-staging-00197-76h/.test(doc));

ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "kill switch true only",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true &&
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false
);

const body = parseBuyerLeadCreateBody({
  listingId: "car-synthetic",
  displayName: "Synthetic",
  contactPhone: "0811111111",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: BUYER_LEAD_CONSENT_VERSION,
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
ok("route kill switch present", /isLeadCaptureEnabled/.test(routes));
ok("no email/sms in buyerLeadRoutes", !/sendEmail|sendSms|twilio|nodemailer/.test(routes));

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
  repository: spyRepo,
  buyerUserId: "buyer-v2251",
  listing: { id: "x", title: "x", price: 1, ownerId: "seller-x" },
  env: {},
  input: {
    listingId: "x",
    displayName: "X",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("post-test OFF blocks before create", blocked.ok === false && blocked.status === 403);
ok("create not called while OFF", createCalled === 0);

console.log("\n--- Staging read-only (post D2 OFF) ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadDataBackend firestore", health.leadDataBackend === "firestore");
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);

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

  const unauth = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth 401", unauth.status === 401);

  const corolla = list.find((c: { title?: string }) => c.title === "Toyota Corolla 2020") as
    | { id?: string }
    | undefined;
  if (corolla?.id) {
    const stats = await (
      await fetch(`${STAGING}/api/listings/${corolla.id}/interest-queue-stats`)
    ).json();
    ok("interest 0", Number(stats?.data?.interestCount ?? stats?.interestCount) === 0);
  } else {
    ok("interest 0", false, "missing corolla");
  }
} catch (e) {
  ok("staging probes", false, String(e));
}

console.log(
  failures === 0 ? "\n=== v22.51 PASS ===\n" : `\n=== v22.51 FAIL (${failures}) ===\n`
);

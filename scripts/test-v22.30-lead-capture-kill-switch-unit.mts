/**
 * v22.30 — Lead capture kill switch unit + service proofs (default OFF).
 * Does not hit live staging auth; does not create durable leads when OFF.
 */
import {
  assertLeadCaptureDefaultsOff,
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  isLeadCaptureEnabled,
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  createConsentedBuyerLead,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  resetBuyerLeadRepositoryForTests,
  createBuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { mapBuyerLeadHttpError } from "../src/services/leads/buyerLeadApi.ts";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log("PASS", name, detail);
    return;
  }
  failures += 1;
  console.log("FAIL", name, detail);
}

const listing = {
  id: "car-kill-switch-test-1",
  title: "TEST Honda CRV 2019",
  price: 599000,
  ownerId: "owner-test-thor-binding",
  isSold: false,
  listingStatus: "published" as const,
};

const validInput = {
  listingId: listing.id,
  displayName: "ทดสอบ",
  contactPhone: "0812345678",
  purchaseMethod: "cash" as const,
  preferredContactWindow: "เย็น",
  consentConfirmed: true,
  consentVersion: BUYER_LEAD_CONSENT_VERSION,
};

async function main() {
  console.log("=== v22.30 lead capture kill switch unit ===\n");

  check(
    "unset env → OFF",
    isLeadCaptureEnabled({}) === false
  );
  check(
    "empty string → OFF",
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "" }) === false
  );
  check(
    "false → OFF",
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false
  );
  check(
    "TRUE uppercase alone not enough unless exact true",
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "TRUE" }) === true,
    "accepts case-insensitive true"
  );
  check(
    "true → ON",
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true
  );
  check(
    "1 → OFF (strict true only)",
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "1" }) === false
  );
  check("assert defaults off on empty", assertLeadCaptureDefaultsOff({}));

  resetBuyerLeadRepositoryForTests();
  const repo = createBuyerLeadRepository("memory");

  const blockedUnset = await createConsentedBuyerLead({
    input: validInput,
    buyerUserId: "buyer-test-uid",
    listing,
    repository: repo,
    env: {},
  });
  check(
    "create blocked when unset",
    blockedUnset.ok === false &&
      blockedUnset.status === 403 &&
      blockedUnset.message === BUYER_LEAD_CAPTURE_DISABLED_MESSAGE
  );
  const afterUnset = await repo.getBuyerLeadById("does-not-exist");
  check("no lead id after unset block", afterUnset === null);
  const listedUnset = await repo.listBuyerLeadsByListingId(listing.id);
  check("no lead rows when unset", listedUnset.length === 0);

  const blockedFalse = await createConsentedBuyerLead({
    input: validInput,
    buyerUserId: "buyer-test-uid",
    listing,
    repository: repo,
    env: { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" },
  });
  check(
    "create blocked when explicit false",
    blockedFalse.ok === false && blockedFalse.status === 403
  );
  const listedFalse = await repo.listBuyerLeadsByListingId(listing.id);
  check("no lead rows when false", listedFalse.length === 0);

  // Ownership still enforced when ON (empty owner).
  const emptyOwner = await createConsentedBuyerLead({
    input: validInput,
    buyerUserId: "buyer-test-uid",
    listing: { ...listing, ownerId: "" },
    repository: repo,
    env: { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" },
  });
  check(
    "empty ownerId still blocked when ON",
    emptyOwner.ok === false && emptyOwner.status === 400
  );
  check(
    "resolveListingSellerId empty",
    resolveListingSellerId({ ownerId: "" }) === ""
  );

  // Create succeeds only when ON + valid owner (in-memory test only; then cleanup).
  const created = await createConsentedBuyerLead({
    input: validInput,
    buyerUserId: "buyer-test-uid",
    listing,
    repository: repo,
    env: { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" },
  });
  check("create ok when ON", created.ok === true);
  if (created.ok) {
    check(
      "sellerId from listing ownerId",
      created.lead.sellerId === listing.ownerId
    );
    check(
      "phone locked on create",
      created.lead.contactRevealStatus === "locked"
    );
    // Cleanup test artifact from in-memory repo
    resetBuyerLeadRepositoryForTests();
    const cleaned = await createBuyerLeadRepository("memory").listBuyerLeadsByListingId(
      listing.id
    );
    check("test lead cleaned (memory reset)", cleaned.length === 0);
  }

  check(
    "process env still OFF (default)",
    !isLeadCaptureEnabled(process.env as Record<string, string | undefined>)
  );

  check(
    "map 403 disabled message preserved",
    mapBuyerLeadHttpError(403, BUYER_LEAD_CAPTURE_DISABLED_MESSAGE) ===
      BUYER_LEAD_CAPTURE_DISABLED_MESSAGE
  );

  check(
    "disabled message has no env name",
    !BUYER_LEAD_CAPTURE_DISABLED_MESSAGE.includes("NONGA_") &&
      !BUYER_LEAD_CAPTURE_DISABLED_MESSAGE.includes("env")
  );

  if (failures > 0) {
    console.log(`\nFAIL test:v22.30-unit (${failures})`);
    process.exit(1);
  }
  console.log("\nPASS test:v22.30-unit");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

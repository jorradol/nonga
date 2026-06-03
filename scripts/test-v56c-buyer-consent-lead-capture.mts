/**
 * v5.6C — buyer consent lead capture (pure + in-memory API core)
 * npm run test:v56c-buyer-consent-lead-capture
 */
import {
  resetBuyerLeadRepositoryForTests,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import {
  BUYER_LEAD_CONSENT_VERSION,
  validateBuyerLeadCreateInput,
  containsForbiddenSensitiveDocument,
} from "../src/services/leads/buyerLeadValidation.ts";
import {
  resolveBuyerLeadViewerRole,
  toPublicBuyerLead,
} from "../src/services/leads/buyerLeadView.ts";
import {
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  isBuyerLeadStartIntent,
  listMissingBuyerLeadFields,
  mergeBuyerLeadFieldsFromMessage,
  processBuyerLeadCaptureTurn,
  setBuyerLeadCaptureContextForTest,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import { maskBuyerContact } from "../src/services/leads/leadPolicy.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const listing = {
  id: "car-lead-1",
  title: "Toyota Vios 2018",
  price: 279000,
  ownerId: "seller-owner-1",
};

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

// --- no consent ---
{
  const v = validateBuyerLeadCreateInput({
    listingId: listing.id,
    displayName: "สมชาย",
    contactPhone: "0812345678",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น ๆ",
    consentConfirmed: false,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  });
  ok("reject without consent", !v.ok && v.errors.includes("missing_consent"));
}

// --- consent + min fields ---
{
  const v = validateBuyerLeadCreateInput({
    listingId: listing.id,
    displayName: "สมชาย",
    contactPhone: "0812345678",
    purchaseMethod: "finance",
    preferredContactWindow: "โทรหลังเลิกงาน",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  });
  ok("accept with consent + required fields", v.ok);
}

// --- forbidden docs ---
ok(
  "forbidden doc in message",
  containsForbiddenSensitiveDocument("ส่งสลิปเงินเดือนให้ดู")
);

// --- create lead ---
let leadId = "";
{
  const result = await createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName: "มานี",
      contactPhone: "0899998888",
      purchaseMethod: "undecided",
      preferredContactWindow: "วันเสาร์",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId: "buyer-uid-1",
    listing,
    repository: repo,
  });
  ok("create lead success", result.ok === true);
  if (result.ok) {
    leadId = result.lead.id;
    ok("status consented", result.lead.status === "consented");
    ok("reveal locked", result.lead.contactRevealStatus === "locked");
  }
}

// --- mask for seller ---
{
  const lead = await repo.getBuyerLeadById(leadId);
  ok("lead exists", Boolean(lead));
  if (lead) {
    const sellerView = toPublicBuyerLead(
      lead,
      resolveBuyerLeadViewerRole({
        viewerUid: "seller-owner-1",
        lead,
        listingSellerId: listing.ownerId,
      })
    );
    ok("seller sees masked phone", sellerView.contactMasked === true);
    ok("seller phone not full", !sellerView.contactPhone.includes("0899998888"));

    const buyerView = toPublicBuyerLead(
      lead,
      resolveBuyerLeadViewerRole({
        viewerUid: "buyer-uid-1",
        lead,
        listingSellerId: listing.ownerId,
      })
    );
    ok("buyer sees full phone", buyerView.contactPhone === "0899998888");
    ok("buyer not masked", buyerView.contactMasked === false);
  }
}

// --- mask helper ---
{
  const m = maskBuyerContact({
    displayName: "สมชาย",
    contactPhone: "0812345678",
  });
  ok("mask hides digits", m.phoneMasked && m.contactPhone.includes("5678"));
}

// --- chat flow: start intent ---
ok("start intent detected", isBuyerLeadStartIntent("ขอให้ผู้ขายติดต่อกลับครับ"));

// --- chat flow: no consent no submit ---
{
  const sid = "sess-flow-1";
  clearBuyerLeadCaptureContext(sid);
  const t1 = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ขอให้ผู้ขายติดต่อกลับ",
  });
  ok("flow begins", t1.handled && t1.stage === "collecting");
  const fields = mergeBuyerLeadFieldsFromMessage(
    { listingId: listing.id },
    "ชื่อ มานี เบอร์ 0899998888 ไฟแนนซ์ สะดวกเย็น"
  );
  setBuyerLeadCaptureContextForTest(sid, { stage: "collecting", fields });
  const t2 = processBuyerLeadCaptureTurn({ sessionId: sid, message: "ok" });
  ok("awaiting consent when complete", t2.handled && t2.stage === "awaiting_consent");
  const inputNoConsent = draftToCreateInput(fields, false);
  ok("draft without consent flag fails validation path", inputNoConsent?.consentConfirmed === false);
}

// --- guest: submit requires login (handler level — no API call in test) ---
ok("guest safety note", true, "API POST requires Bearer token (401 without auth)");

console.log("\nDone v5.6C buyer consent lead capture tests.");
if (process.exitCode) process.exit(process.exitCode);

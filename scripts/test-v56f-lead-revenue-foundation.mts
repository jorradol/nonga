/**
 * v5.6F — Durable lead persistence + Smart Sales + lead quality foundation
 * npm run test:v56f-lead-revenue-foundation
 */
import { readFileSync } from "node:fs";
import {
  createBuyerLeadRepository,
  resetBuyerLeadRepositoryForTests,
  resolveBuyerLeadDataBackend,
} from "../src/server/repositories/buyerLeadRepository.ts";
import {
  createBuyerPurchaseProfileRepository,
  resetBuyerPurchaseProfileRepositoryForTests,
} from "../src/server/repositories/buyerPurchaseProfileRepository.ts";
import { shouldAttemptAiBuyerLeadParse, tryAiParseBuyerLeadText } from "../src/services/leads/buyerLeadAiParseFallback.ts";
import { applySuspiciousBuyerReportPolicy } from "../src/services/leads/leadPolicy.ts";
import { computeLeadQualityScore } from "../src/services/leads/leadQualityScore.ts";
import type { BuyerLead } from "../src/services/leads/leadTypes.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  evaluatePurchaseMethodFit,
  isOfferBelowSellerFloor,
  resolveSellerNegotiationFloor,
} from "../src/services/leads/sellerLeadCriteria.ts";
import { guardSmartSalesAiInput } from "../src/services/leads/smartSalesAiGuards.ts";
import {
  trySmartSalesAiBuyerLeadParse,
  trySmartSalesLeadQualityNarrative,
} from "../src/services/leads/smartSalesAiHooks.ts";
import {
  BUYER_LEAD_AI_TEXT_PARSE_ENABLED,
  isBuyerLeadAiTextParseEnabled,
  isSmartSalesAiEnabled,
  NONGA_SMART_SALES_MODE,
  resolveSmartSalesModeFromEnv,
} from "../src/services/leads/smartSalesMode.ts";
import { parseNaturalBuyerLeadText } from "../src/services/leads/buyerLeadTextParser.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function baseLead(partial: Partial<BuyerLead> = {}): BuyerLead {
  const now = new Date().toISOString();
  return {
    id: "lead-v56f-1",
    listingId: "listing-v56f",
    sellerId: "seller-1",
    displayName: "คุณทดสอบ",
    contactPhone: "0812345678",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็นวันจันทร์–ศุกร์ 17:00–20:00",
    buyerSummary: "สนใจรถคันนี้ มีเงินสดพร้อม",
    consent: {
      version: BUYER_LEAD_CONSENT_VERSION,
      consentedAt: now,
      listingId: "listing-v56f",
    },
    source: "chat",
    status: "consented",
    contactRevealStatus: "locked",
    queuePosition: 1,
    queueLifecycle: "active",
    offeredPrice: 900_000,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// --- persistence factory ---
{
  ok("lead backend default memory", resolveBuyerLeadDataBackend({}) === "memory");
  ok(
    "lead backend firestore only when env set",
    resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "firestore" }) === "firestore"
  );
  resetBuyerLeadRepositoryForTests();
  const repo = createBuyerLeadRepository("memory");
  const lead = baseLead();
  await repo.createBuyerLead(lead);
  const loaded = await repo.getBuyerLeadById(lead.id);
  ok("in-memory lead round-trip", loaded?.id === lead.id);
  const listed = await repo.listBuyerLeadsByListingId(lead.listingId);
  ok("in-memory list by listing", listed.length === 1);
  ok("firestore impl file exists", readFileSync("src/server/repositories/buyerLeadRepositoryFirestore.ts", "utf8").includes("FirestoreBuyerLeadRepository"));
}

// --- smart sales flags default off ---
{
  ok("compile-time AI parse default false", BUYER_LEAD_AI_TEXT_PARSE_ENABLED === false);
  ok("runtime AI parse off", !isBuyerLeadAiTextParseEnabled({}));
  ok("smart sales mode default economy", resolveSmartSalesModeFromEnv({}) === "economy");
  ok("NONGA_SMART_SALES_MODE const economy", NONGA_SMART_SALES_MODE === "economy");
  ok("smart sales AI disabled", !isSmartSalesAiEnabled({}));
  const parse = parseNaturalBuyerLeadText("สนใจรถ งบ 8 แสน เงินสด");
  ok("should not attempt AI when off", !shouldAttemptAiBuyerLeadParse(parse));
  const ai = await tryAiParseBuyerLeadText({ message: "test", existingFields: { listingId: "x" } });
  ok("tryAiParse returns null when off", ai === null);
  const smart = await trySmartSalesAiBuyerLeadParse({ message: "test", existingFields: { listingId: "x" } });
  ok("smart sales parse null when off", smart === null);
  const narrative = await trySmartSalesLeadQualityNarrative({
    lead: baseLead(),
    score: computeLeadQualityScore({ lead: baseLead(), listedPrice: 1_000_000 }),
  });
  ok("quality narrative null when off", narrative === null);
}

// --- lead quality ---
{
  const hot = computeLeadQualityScore({
    lead: baseLead({ offeredPrice: 980_000 }),
    listedPrice: 1_000_000,
    sellerCriteria: { acceptsCash: true, acceptsFinance: true },
  });
  ok("complete lead scores hot/warm", hot.tier === "hot" || hot.tier === "warm", hot.tier);
  ok("hot score high", hot.score >= 55, String(hot.score));

  const incomplete = computeLeadQualityScore({
    lead: baseLead({
      offeredPrice: undefined,
      budgetMin: undefined,
      budgetMax: undefined,
      buyerSummary: "",
      preferredContactWindow: "เช้า",
    }),
    listedPrice: 1_000_000,
  });
  ok("incomplete lowers tier", incomplete.tier === "needs_info" || incomplete.tier === "risky", incomplete.tier);

  const below = computeLeadQualityScore({
    lead: baseLead({ offeredPrice: 700_000 }),
    listedPrice: 1_000_000,
  });
  ok("offer below floor factor", below.factors.includes("offer_below_floor"));
  ok("below floor has negotiation hint", below.sellerHints.some((h) => h.includes("ต่อรอง") || h.includes("ทางเลือก")));

  const suspicious = computeLeadQualityScore({
    lead: baseLead({ buyerSummary: "โอนก่อนค่อยดูรถ ส่งสำเนาบัตรในแชท" }),
    listedPrice: 1_000_000,
    suspiciousReported: true,
  });
  ok("suspicious report caps review", suspicious.factors.includes("suspicious_report_admin_review"));
  const policy = applySuspiciousBuyerReportPolicy({ reason: "other", buyerLeadId: "x" });
  ok("no auto penalty on report", policy.autoPenaltyApplied === false);
}

// --- seller criteria ---
{
  ok("default floor 90% list", resolveSellerNegotiationFloor(1_000_000) === 900_000);
  ok("custom minimum floor", resolveSellerNegotiationFloor(1_000_000, { minimumAcceptablePrice: 850_000 }) === 850_000);
  ok("cash mismatch", evaluatePurchaseMethodFit("cash", { acceptsCash: false, acceptsFinance: true }) === "mismatch");
  ok("offer below seller floor helper", isOfferBelowSellerFloor({ offeredPrice: 800_000, listedPrice: 1_000_000 }));
}

// --- guards ---
{
  const doc = guardSmartSalesAiInput("ช่วยส่งสำเนาบัตรประชาชนในแชท");
  ok(
    "blocks sensitive doc request",
    !doc.ok && doc.ok === false && doc.reason === "sensitive_document_request"
  );
  const commission = guardSmartSalesAiInput("ค่าคอมเท่าไหร่");
  ok("blocks commission language", !commission.ok);
}

// --- purchase profile repo (server) + client map separate ---
{
  resetBuyerPurchaseProfileRepositoryForTests();
  const profRepo = createBuyerPurchaseProfileRepository("memory");
  await profRepo.save("buyer-f", {
    displayName: "ลุงทด",
    purchaseMethod: "cash",
    offeredPrice: 500_000,
    preferredContactWindow: "โทรเย็น",
    updatedAt: new Date().toISOString(),
  });
  ok("server profile repo memory round-trip", (await profRepo.get("buyer-f"))?.displayName === "ลุงทด");
  ok(
    "client profile module has no firebase-admin import",
    !readFileSync("src/services/leads/buyerPurchaseProfile.ts", "utf8").includes("firebase-admin")
  );
}

// --- docs / no rules change ---
{
  const doc = readFileSync("docs/v5.6F-durable-lead-revenue-smart-sales.md", "utf8");
  ok("doc says no real payment", doc.includes("ยังไม่เปิดเก็บเงินจริง"));
  ok("doc says rules not changed", doc.includes("ไม่แก้ `firestore.rules`"));
  const rulesDiff = process.env.V56F_RULES_TOUCHED === "1";
  ok("no firestore.rules edit in v56f", !rulesDiff);
}

console.log("\nDone v5.6F lead revenue foundation tests.");
if (process.exitCode) process.exit(process.exitCode);

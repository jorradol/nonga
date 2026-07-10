/**
 * v22.46 — Existing Lead UI OFF polish + controlled-test readiness (safe automated)
 * npm run test:v22.46-existing-lead-ui-and-controlled-test-readiness-polish
 *
 * No Lead Capture enable. No Lead write. No Dealer notification.
 */
import fs from "node:fs";
import path from "node:path";
import {
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY,
} from "../src/services/leads/buyerLeadCaptureCopy.ts";
import {
  BUYER_LEAD_MODAL_CAPTURE_DISABLED_HINT,
} from "../src/services/leads/buyerLeadConsentModalCopy.ts";
import {
  clearBuyerLeadCaptureContext,
  getBuyerLeadCaptureContext,
  setBuyerLeadCaptureContextForTest,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  handleBuyerLeadCaptureFromCarCard,
  handleBuyerLeadCaptureTurn,
  submitBuyerLeadFromModal,
} from "../src/services/leads/buyerLeadCaptureHandler.ts";
import {
  resetLeadCaptureEnabledCacheForTests,
  setLeadCaptureEnabledForTests,
} from "../src/services/leads/leadCaptureClientFlags.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.46-existing-lead-ui-and-controlled-test-readiness-polish.md";
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

console.log("=== v22.46 Existing Lead UI + Controlled-Test Readiness ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc NEED REVIEW or PASS", /\*\*(NEED REVIEW|PASS)\*\*/.test(doc));
ok("doc no new lead system", /No new Lead|reuse|existing Lead system/i.test(doc));
ok("doc kill switch OFF", /Lead Capture OFF|leadCaptureEnabled.*false/i.test(doc));
ok("doc v22.47 draft phrase", /FINAL AUTHORIZE V22\.47/.test(doc));
ok("doc owner options", /Option A|Option C|Option D/.test(doc));
ok("doc memory backend", /memory/i.test(doc));
ok("doc cleanup", /Cleanup|cleanup/i.test(doc));

ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "kill switch true only",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true &&
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "1" }) === false
);
ok(
  "disabled server message safe",
  !BUYER_LEAD_CAPTURE_DISABLED_MESSAGE.includes("NONGA_")
);
ok(
  "unavailable reply no PII ask",
  BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY.includes("ยังไม่เปิด") &&
    !BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY.includes("เบอร์โทร")
);
ok(
  "modal disabled hint clear",
  BUYER_LEAD_MODAL_CAPTURE_DISABLED_HINT.includes("ยังไม่เปิด")
);

const modal = read("src/components/chat/BuyerLeadConsentModal.tsx");
ok(
  "modal OFF panel without phone when disabled",
  modal.includes("buyer-lead-capture-disabled-panel") &&
    modal.includes("!leadCaptureEnabled")
);
ok(
  "modal phone input only in enabled branch",
  modal.includes("buyer-lead-modal-phone") &&
    /leadCaptureEnabled \? \(/.test(modal) === false
      ? modal.indexOf("buyer-lead-capture-disabled-panel") <
        modal.indexOf("buyer-lead-modal-phone")
      : true
);
ok(
  "modal submit disabled attribute when OFF",
  modal.includes('data-lead-submit-disabled="true"')
);

const handler = read("src/services/leads/buyerLeadCaptureHandler.ts");
ok("handler short-circuits car card when OFF", /BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY/.test(handler));
ok("handler submit checks capture before API", /fetchLeadCaptureEnabled\(\{ force: true \}\)/.test(handler));

const inquire = read("src/components/cars/details/InquireModal.tsx");
ok("InquireModal not real API", !inquire.includes("/api/buyer-leads"));
ok("InquireModal legacy comment", /legacy mock|NOT the supported/i.test(inquire));

const dealerLeads = read("src/components/dealer/DealerLeads.tsx");
ok(
  "DealerLeads legacy comment",
  /not.*buyer-lead|Supported Buyer Lead path/i.test(dealerLeads)
);

const clientFlags = read("src/services/leads/leadCaptureClientFlags.ts");
ok(
  "client fail-closed exact true",
  clientFlags.includes("leadCaptureEnabled === true")
);
ok(
  "client no browser-storage enable path",
  !/localStorage|sessionStorage/.test(clientFlags)
);

// --- Unit: OFF path does not start draft / does not call API ---
{
  setLeadCaptureEnabledForTests(false);
  const sid = "sess-v2246-off-card";
  clearBuyerLeadCaptureContext(sid);
  const r = await handleBuyerLeadCaptureFromCarCard({
    sessionId: sid,
    car: {
      id: "car-off",
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 1,
      mileage: 1,
      bodyClass: "sedan",
      bodyClassLabel: "รถเก๋ง",
      hasImage: false,
      detailPath: "/cars/car-off",
      matchKind: "exact",
    },
  });
  ok(
    "OFF car card unavailable reply",
    r.reply.includes("ยังไม่เปิด") && !r.isBuyerLeadProfileReuse
  );
  ok("OFF car card no draft", getBuyerLeadCaptureContext(sid) == null);

  setBuyerLeadCaptureContextForTest(sid, {
    stage: "collecting",
    fields: { listingId: "car-off", displayName: "x" },
  });
  const turn = await handleBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ขอให้ผู้ขายติดต่อกลับ",
    isSignedIn: false,
  });
  ok("OFF start intent handled", turn.handled === true);
  ok(
    "OFF start intent clears draft",
    getBuyerLeadCaptureContext(sid) == null
  );
  ok(
    "OFF start intent no modal",
    turn.handled === true && !("openConsentModal" in turn && turn.openConsentModal)
  );

  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: {
      listingId: "car-off",
      displayName: "ทดสอบ",
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      budgetMax: 100000,
    },
  });
  const submit = await submitBuyerLeadFromModal({
    sessionId: sid,
    contactPhone: "0812345678",
    isSignedIn: true,
  });
  ok("OFF submit blocked without API success", submit.ok === false);
  ok(
    "OFF submit message unavailable",
    submit.ok === false && String(submit.message).includes("ยังไม่เปิด")
  );

  setLeadCaptureEnabledForTests(null);
  resetLeadCaptureEnabledCacheForTests();
}

console.log("\n--- Staging read-only ---\n");
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
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
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
  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.46 PASS ===");
else console.log(`\n=== v22.46 FAIL (${failures}) ===`);

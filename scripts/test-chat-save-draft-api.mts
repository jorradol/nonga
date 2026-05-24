import { extractCarFieldsFromMessage } from "../src/services/ai/chat/sellIntentParser.ts";
import {
  buildDealerDraftPayloadFromChat,
  isSaveListingChatAction,
  CHAT_SAVE_LISTING_ACTION,
} from "../src/services/ai/chat/chatDraftActions.ts";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DEALER_TOKEN =
  process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "✅" : "❌", name, detail);
  if (!pass) process.exit(1);
}

const sample =
  "Toyota Vios ปี 2018 สีขาว เกียร์ออโต้ ไมล์ 85,000 ราคา 279,000 รถบ้านมือเดียว สภาพดี ลงประกาศขาย";

const fields = extractCarFieldsFromMessage(sample);
ok("extract brand", fields.brand === "Toyota");
ok("extract model", fields.model === "Vios");
ok("extract year", fields.year === 2018);
ok("extract mileage", fields.mileage === 85000);
ok("extract price", fields.price === 279000);
ok("extract transmission", fields.transmission === "เกียร์ออโต้");
ok("extract description", !!fields.description?.includes("รถบ้าน"));

const { payload, missing } = buildDealerDraftPayloadFromChat(fields);
ok("payload complete", !!payload && missing.length === 0);

ok("save action label", CHAT_SAVE_LISTING_ACTION === "บันทึกประกาศ");
ok("recognize save action", isSaveListingChatAction("บันทึกประกาศ"));
ok("legacy save action", isSaveListingChatAction("บันทึกเป็น Draft"));

async function apiTest() {
  const res = await fetch(`${BASE}/api/dealer/drafts/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEALER_TOKEN}`,
      "X-Dealer-Id": "thor-auto",
      "X-User-Role": "dealer",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  ok(
    `POST /api/dealer/drafts/new → ${res.status}`,
    res.ok,
    text.slice(0, 120)
  );
}

apiTest().catch((e) => {
  console.warn("⚠️  API test skipped (start dev server):", e.message);
  console.log("--- Unit checks passed ---");
});

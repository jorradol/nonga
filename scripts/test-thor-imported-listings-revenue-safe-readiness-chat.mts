import {
  runMarketplaceChatSearch,
  summariesToCarCards,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const res = await fetch("https://a.nongbot.org/api/cars");
  assert(res.ok, `cars fetch failed: ${res.status}`);
  const body = (await res.json()) as {
    count?: number;
    data?: Array<Record<string, unknown>>;
  };
  const inventory = (body.data ?? []).map((c) => ({
    id: String(c.id ?? ""),
    title: String(c.title ?? `${c.brand ?? ""} ${c.model ?? ""}`.trim()),
    brand: String(c.brand ?? ""),
    model: String(c.model ?? ""),
    year: Number(c.year) || 0,
    price: Number(c.price) || 0,
    mileage: Number(c.mileage) || 0,
    fuelType: String(c.fuelType ?? ""),
    type: String(c.type ?? ""),
    images: Array.isArray(c.images) ? (c.images as string[]) : [],
    listingStatus: String(c.listingStatus ?? ""),
    isSold: Boolean(c.isSold),
    description: String(c.description ?? ""),
    showroomName: String(c.showroomName ?? ""),
  }));

  const marketplaceCount = Number(body.count ?? inventory.length);
  assert(
    marketplaceCount === 13,
    `marketplace count should stay 13 after upsert/re-import, got ${marketplaceCount}`
  );
  const thor = inventory.filter((c) => c.id.startsWith("car-import-"));
  assert(thor.length === 3, `expected 3 Thor imports, got ${thor.length}`);
  const fingerprints = new Set(
    thor.map((c) => `${c.brand}|${c.model}|${c.year}`.toLowerCase())
  );
  assert(
    fingerprints.size === 3,
    `Thor cars must be unique by brand/model/year, got ${fingerprints.size}`
  );

  const queries = [
    "มี Mazda CX-30 ไหม",
    "มี Toyota Camry ปี 2019 ไหม",
    "มี Honda CRV ไหม",
  ];

  for (const q of queries) {
    const result = runMarketplaceChatSearch(q, inventory);
    const cards = summariesToCarCards(result.primary, result.alternatives);
    const hit = cards.find((c) => String(c.id).startsWith("car-import-"));
    assert(Boolean(hit), `chat card missing for query: ${q}`);
    assert(
      hit?.hasImage === true && Boolean(hit?.imageUrl),
      `chat card must show durable image for ${hit?.id} (hasImage=${hit?.hasImage})`
    );
    assert(
      /^https:\/\/firebasestorage\.googleapis\.com\//i.test(String(hit?.imageUrl ?? "")),
      `chat card imageUrl must be durable Firebase Storage for ${hit?.id}`
    );
    const payload = JSON.stringify(cards);
    assert(!/"licensePlateFull"/.test(payload), "chat cards must hide full plate");
    assert(!/"vin"\s*:/.test(payload), "chat cards must hide vin");
    assert(
      !/"ownerPhone"\s*:\s*"[^"]+"/.test(payload),
      "chat cards must not echo owner phone"
    );
    assert(!/"importKey"\s*:/.test(payload), "chat cards must hide importKey");
    console.log(
      "PASS chat-retrieve",
      q,
      "->",
      hit?.id,
      hit?.brand,
      hit?.model,
      "hasImage=",
      hit?.hasImage,
      "imageHost=firebasestorage"
    );
  }

  console.log("PASS test-thor-imported-listings-revenue-safe-readiness-chat");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

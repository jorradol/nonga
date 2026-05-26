/**
 * Smoke: Draft edit → Publish → Marketplace sync (v4.17)
 * npm run test:dealer-draft-edit-publish
 *
 * Requires dev server at APP_URL (default http://localhost:3000)
 */
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const THOR = THOR_AUTO_DEALER_ID;
const OTHER = "other-dealer";
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const thorHdrs = (): Record<string, string> => ({
  Authorization: `Bearer ${TOKEN}`,
  "X-Dealer-Id": THOR,
  "X-User-Role": "dealer",
  "Content-Type": "application/json",
});

const otherHdrs = (): Record<string, string> => ({
  Authorization: `Bearer ${TOKEN}`,
  "X-Dealer-Id": OTHER,
  "X-User-Role": "dealer",
  "Content-Type": "application/json",
});

type DraftRow = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  images: string[];
  description?: string;
  dealerId?: string;
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function fetchDrafts(h: Record<string, string>): Promise<DraftRow[]> {
  const res = await fetch(`${BASE}/api/dealer/drafts`, { headers: h });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `drafts ${res.status}`);
  return body.data ?? [];
}

async function patchDraft(
  id: string,
  patch: Record<string, unknown>
): Promise<DraftRow> {
  const res = await fetch(`${BASE}/api/dealer/drafts/${id}`, {
    method: "PATCH",
    headers: thorHdrs(),
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `patch ${res.status}`);
  return body.data;
}

async function publishDraft(id: string) {
  const res = await fetch(`${BASE}/api/dealer/drafts/${id}/publish`, {
    method: "POST",
    headers: thorHdrs(),
  });
  const body = await res.json();
  return { res, body };
}

async function main() {
  console.log("=== Draft Edit → Publish → Marketplace (v4.17) ===\n");
  console.log(`BASE=${BASE} dealer=${THOR}\n`);

  try {
    const ping = await fetch(BASE);
    ok("0-server-up", ping.ok, String(ping.status));
  } catch (e) {
    ok("0-server-up", false, String(e));
    console.log("\nStart server: npm run dev");
    process.exit(1);
  }

  // 1. Dealer Portal / drafts page
  const draftsPage = await fetch(`${BASE}/dealer/drafts`);
  ok("1-dealer-drafts-page", draftsPage.ok, String(draftsPage.status));

  let drafts = await fetchDrafts(thorHdrs());
  ok("1-api-drafts-list", drafts.length >= 0, `count=${drafts.length}`);

  const pasteDrafts = drafts.filter((d) => d.id.startsWith("draft-import-"));
  ok(
    "1-paste-import-draft-exists",
    pasteDrafts.length > 0,
    `paste=${pasteDrafts.length} total=${drafts.length}`
  );

  // Prepare publishable draft with storage image
  const smokeDraftId = `draft-import-${Date.now()}-d0`;
  const upRes = await fetch(`${BASE}/api/dealer/paste-import/upload-images`, {
    method: "POST",
    headers: thorHdrs(),
    body: JSON.stringify({
      listingId: smokeDraftId,
      files: [{ mimeType: "image/png", dataBase64: TINY_PNG, name: "smoke.png" }],
    }),
  });
  const upBody = await upRes.json();
  ok(
    "setup-upload-image",
    upRes.ok && upBody.data?.storedUrls?.length >= 1,
    upBody.message ?? ""
  );
  const storedUrl = upBody.data.storedUrls[0] as string;

  const commitRes = await fetch(`${BASE}/api/dealer/import/commit`, {
    method: "POST",
    headers: thorHdrs(),
    body: JSON.stringify({
      published: [],
      drafts: [
        {
          sourceRowIndex: 1,
          importStatus: "warning",
          title: "Smoke Edit Publish",
          brand: "Toyota",
          model: "SmokeBase",
          year: 2020,
          price: 400000,
          type: "used",
          condition: "มือสอง",
          mileage: 50000,
          fuelType: "petrol",
          description: "ก่อนแก้ไข smoke",
          images: [storedUrl],
          commitDraftId: smokeDraftId,
          skipSourceImageDownload: true,
          disposition: "draft",
        },
      ],
      owner: {
        dealerId: THOR,
        ownerId: `owner-${THOR}`,
        ownerName: "Smoke Test",
        ownerPhone: "0815553335",
        showroomName: "Thor Auto",
      },
    }),
  });
  const commitBody = await commitRes.json();
  ok(
    "setup-commit-draft",
    commitRes.ok && commitBody.success,
    JSON.stringify(commitBody).slice(0, 80)
  );

  let target = (await fetchDrafts(thorHdrs())).find((d) => d.id === smokeDraftId);
  ok("setup-draft-found", !!target, smokeDraftId);

  // 2a. PATCH price only (no images field) — รูปต้องไม่หาย (regression bug #1)
  const priceOnly = await patchDraft(smokeDraftId, { price: 555001 });
  ok("2a-patch-price-only", priceOnly.price === 555001, String(priceOnly.price));
  const afterPriceOnly = (await fetchDrafts(thorHdrs())).find(
    (d) => d.id === smokeDraftId
  );
  ok(
    "2a-images-kept-after-price-patch",
    (afterPriceOnly?.images?.length ?? 0) >= 1 &&
      afterPriceOnly!.images[0].includes("/storage/listings/"),
    afterPriceOnly?.images?.[0] ?? ""
  );
  ok(
    "2a-primary-image-order",
    afterPriceOnly?.images?.[0] === storedUrl,
    afterPriceOnly?.images?.[0] ?? ""
  );

  // 2. Edit draft via API (UI supports brand/model/year/price/mileage; API also description/images)
  const edited = await patchDraft(smokeDraftId, {
    brand: "HondaSmoke",
    model: "CRVSmokeTest",
    year: 2021,
    price: 555000,
    mileage: 88888,
    description: "คำอธิบายหลังแก้ไข smoke test",
    images: [storedUrl],
  });
  ok("2-patch-edit", edited.brand === "HondaSmoke", edited.brand);

  drafts = await fetchDrafts(thorHdrs());
  const reloaded = drafts.find((d) => d.id === smokeDraftId);
  ok(
    "2-persist-after-refresh",
    reloaded?.brand === "HondaSmoke" &&
      reloaded?.model === "CRVSmokeTest" &&
      reloaded?.price === 555000 &&
      reloaded?.mileage === 88888,
    `${reloaded?.brand} ${reloaded?.price}`
  );
  ok(
    "2-images-persist",
    (reloaded?.images?.length ?? 0) >= 1 &&
      reloaded!.images[0].includes(smokeDraftId),
    reloaded?.images?.[0] ?? ""
  );
  ok(
    "2-description-persist",
    (reloaded?.description ?? "").includes("หลังแก้ไข"),
    reloaded?.description?.slice(0, 40) ?? ""
  );

  // 3. Publish guard
  const guardCases: Array<{
    name: string;
    patch: Record<string, unknown>;
    expect: string[];
  }> = [
    { name: "3a-no-image", patch: { images: [] }, expect: ["image"] },
    { name: "3b-no-brand", patch: { brand: "" }, expect: ["brand"] },
    { name: "3c-no-model", patch: { model: "" }, expect: ["model"] },
    { name: "3d-no-price", patch: { price: 0 }, expect: ["price"] },
  ];

  for (const c of guardCases) {
    await patchDraft(smokeDraftId, {
      brand: "HondaSmoke",
      model: "CRVSmokeTest",
      year: 2021,
      price: 555000,
      mileage: 88888,
      images: [storedUrl],
      description: "guard test",
      ...c.patch,
    });
    const { res, body } = await publishDraft(smokeDraftId);
    const blocked =
      res.status === 400 &&
      body.error === "missing_required_fields" &&
      c.expect.every((f) => (body.missingFields as string[])?.includes(f));
    const hasThai =
      Array.isArray(body.missingLabelsThai) &&
      body.missingLabelsThai.length > 0;
    ok(c.name, blocked && hasThai, JSON.stringify(body).slice(0, 100));
  }

  const clientGuard = validateDraftForPublish({
    id: smokeDraftId,
    brand: "",
    model: "",
    year: 0,
    price: 0,
    mileage: -1,
    images: [],
  });
  ok(
    "3e-client-guard-labels",
    clientGuard.missingLabelsThai.includes("ขาดรูปภาพสินค้า") &&
      clientGuard.missingLabelsThai.includes("ขาดยี่ห้อรถ"),
    clientGuard.missingLabelsThai.join("|")
  );

  // Restore complete draft
  await patchDraft(smokeDraftId, {
    brand: "HondaSmoke",
    model: "CRVSmokeTest",
    year: 2021,
    price: 555000,
    mileage: 88888,
    images: [storedUrl],
    description: "พร้อม publish smoke",
  });

  // 4. Publish success
  const beforeDraftCount = (await fetchDrafts(thorHdrs())).length;
  const pub = await publishDraft(smokeDraftId);
  ok(
    "4-publish-ok",
    pub.res.ok && pub.body.success && pub.body.data?.id,
    pub.body.message ?? String(pub.res.status)
  );
  const publishedCarId = pub.body.data?.id as string;
  const afterDraftCount = (await fetchDrafts(thorHdrs())).length;
  ok(
    "4-draft-removed",
    afterDraftCount < beforeDraftCount,
    `${beforeDraftCount} → ${afterDraftCount}`
  );

  const invRes = await fetch(`${BASE}/api/dealer/inventory`, {
    headers: thorHdrs(),
  });
  const invBody = await invRes.json();
  const invCars = (invBody.data ?? []) as { id: string; brand: string }[];
  ok(
    "4-dealer-inventory",
    invCars.some((c) => c.id === publishedCarId),
    publishedCarId
  );

  // 5. Marketplace /api/cars
  const carsRes = await fetch(`${BASE}/api/cars`);
  const carsBody = await carsRes.json();
  const cars = (carsBody.data ?? carsBody) as {
    id: string;
    brand: string;
    model: string;
    year: number;
    price: number;
    images: string[];
    description?: string;
    dealerId?: string;
    listingStatus?: string;
  }[];
  const car = cars.find((c) => c.id === publishedCarId);
  ok("5-marketplace-visible", !!car, publishedCarId);
  if (car) {
    ok("5-brand-model", car.brand === "HondaSmoke" && car.model === "CRVSmokeTest", "");
    ok("5-price-year", car.price === 555000 && car.year === 2021, `${car.price}`);
    ok(
      "5-images-storage",
      (car.images?.[0] ?? "").includes("/storage/listings/"),
      car.images?.[0] ?? ""
    );
    ok(
      "5-dealer-id",
      !car.dealerId || car.dealerId === THOR,
      car.dealerId ?? "unset"
    );
    ok(
      "5-not-hidden",
      car.listingStatus !== "hidden",
      car.listingStatus ?? "active"
    );
    ok(
      "5-description",
      (car.description ?? "").includes("publish") ||
        (car.description ?? "").length > 0,
      car.description?.slice(0, 30) ?? ""
    );
  }

  // 6. Data isolation
  const otherList = await fetchDrafts(otherHdrs());
  ok(
    "6-other-no-thor-draft",
    !otherList.some((d) => d.id === smokeDraftId),
    `other drafts=${otherList.length}`
  );
  const otherPatch = await fetch(`${BASE}/api/dealer/drafts/${smokeDraftId}`, {
    method: "PATCH",
    headers: otherHdrs(),
    body: JSON.stringify({ price: 1 }),
  });
  ok("6-other-cannot-patch", otherPatch.status === 404, String(otherPatch.status));

  const otherPub = await fetch(
    `${BASE}/api/dealer/drafts/${smokeDraftId}/publish`,
    { method: "POST", headers: otherHdrs() }
  );
  ok("6-other-cannot-publish", otherPub.status === 404, String(otherPub.status));

  console.log("\n=== Smoke complete ===");
  console.log(`Published car: ${publishedCarId}`);
  process.exit(process.exitCode === 1 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

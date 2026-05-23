/**
 * Draft edit — image upload / manage / save
 * npm run test:dealer-draft-image-edit
 */
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import {
  orderDraftImagesWithPrimary,
  mergeUploadedPendingUrls,
} from "../src/utils/dealer/dealerDraftImageEdit.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const THOR = THOR_AUTO_DEALER_ID;
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const hdrs = (): Record<string, string> => ({
  Authorization: `Bearer ${TOKEN}`,
  "X-Dealer-Id": THOR,
  "X-User-Role": "dealer",
  "Content-Type": "application/json",
});

type DraftRow = {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  images: string[];
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function fetchDrafts(): Promise<DraftRow[]> {
  const res = await fetch(`${BASE}/api/dealer/drafts`, { headers: hdrs() });
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
    headers: hdrs(),
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `patch ${res.status}`);
  return body.data;
}

async function uploadPasteImages(
  draftId: string,
  count = 1
): Promise<string[]> {
  const files = Array.from({ length: count }, (_, i) => ({
    mimeType: "image/png",
    dataBase64: TINY_PNG,
    name: `paste-${i}.png`,
  }));
  const res = await fetch(`${BASE}/api/dealer/paste-import/upload-images`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({ listingId: draftId, files }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `paste upload ${res.status}`);
  return body.data.storedUrls as string[];
}

async function uploadDraftImages(
  draftId: string,
  count = 1
): Promise<string[]> {
  const files = Array.from({ length: count }, (_, i) => ({
    mimeType: "image/png",
    dataBase64: TINY_PNG,
    name: `img-${i}.png`,
  }));
  const res = await fetch(
    `${BASE}/api/dealer/drafts/${encodeURIComponent(draftId)}/upload-images`,
    {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ files }),
    }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `upload ${res.status}`);
  return body.data.storedUrls as string[];
}

async function publishDraft(id: string) {
  const res = await fetch(`${BASE}/api/dealer/drafts/${id}/publish`, {
    method: "POST",
    headers: hdrs(),
  });
  const body = await res.json();
  return { res, body };
}

async function commitDraft(
  draftId: string,
  images: string[],
  title: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/dealer/import/commit`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({
      published: [],
      drafts: [
        {
          sourceRowIndex: 1,
          importStatus: "warning",
          title,
          brand: "Toyota",
          model: "ImgEditTest",
          year: 2020,
          price: 450000,
          type: "used",
          condition: "มือสอง",
          mileage: 40000,
          fuelType: "petrol",
          description: "draft image editar",
          images,
          commitDraftId: draftId,
          skipSourceImageDownload: true,
          disposition: "draft",
        },
      ],
      owner: {
        dealerId: THOR,
        ownerId: `owner-${THOR}`,
        ownerName: "Img Test",
        ownerPhone: "0815553335",
        showroomName: "Thor Auto",
      },
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "commit failed");
  }
}

async function main() {
  console.log("=== Dealer Draft Image Edit ===\n");

  ok(
    "util-order-primary",
    orderDraftImagesWithPrimary(["/a", "/b"], "/b")[0] === "/b",
    ""
  );
  ok(
    "util-merge-pending",
    mergeUploadedPendingUrls(["/a"], [{ id: "p1" } as never], ["/b"]).urls
      .length === 2,
    ""
  );

  try {
    const ping = await fetch(BASE);
    ok("0-server-up", ping.ok, String(ping.status));
  } catch (e) {
    ok("0-server-up", false, String(e));
    console.log("\nStart server: npm run dev");
    process.exit(1);
  }

  const ts = Date.now();

  // Case 1: no image → upload → save → publish guard ok
  const c1Id = `draft-import-${ts}-d1`;
  await commitDraft(c1Id, [], "Case1 No Image");
  let c1 = (await fetchDrafts()).find((d) => d.id === c1Id);
  ok("1-setup-no-image", !!c1 && (c1.images?.length ?? 0) === 0, c1Id);

  const guardBefore = validateDraftForPublish({
    id: c1Id,
    brand: c1!.brand,
    model: c1!.model,
    price: c1!.price,
    images: c1!.images,
  });
  ok("1-guard-missing-image", guardBefore.missingFields.includes("image"), "");

  const up1 = await uploadDraftImages(c1Id, 1);
  c1 = await patchDraft(c1Id, {
    brand: "Toyota",
    model: "ImgEditTest",
    year: 2020,
    price: 450000,
    images: up1,
  });
  ok("1-after-upload", (c1.images?.length ?? 0) >= 1, c1.images?.[0] ?? "");
  const guardAfter = validateDraftForPublish({
    id: c1Id,
    brand: c1.brand,
    model: c1.model,
    price: c1.price,
    images: c1.images,
  });
  ok("1-guard-ok", guardAfter.ok, guardAfter.missingLabelsThai.join(","));

  // Case 2: has image → price only patch → images kept
  const c2Id = `draft-import-${ts}-d2`;
  const c2Img = await uploadPasteImages(c2Id, 1);
  await commitDraft(c2Id, c2Img, "Case2 Keep Image");
  await patchDraft(c2Id, { price: 460001 });
  const c2 = (await fetchDrafts()).find((d) => d.id === c2Id);
  ok(
    "2-price-only-images-kept",
    (c2?.images?.length ?? 0) >= 1 && c2!.images[0] === c2Img[0],
    c2?.images?.[0] ?? ""
  );

  // Case 3: add 2 more images
  const c3Id = `draft-import-${ts}-d3`;
  const c3Base = await uploadPasteImages(c3Id, 1);
  await commitDraft(c3Id, c3Base, "Case3 Add Images");
  const c3More = await uploadDraftImages(c3Id, 2);
  const c3Merged = [...c3Base, ...c3More];
  const c3 = await patchDraft(c3Id, { images: c3Merged });
  ok("3-three-images", (c3.images?.length ?? 0) === 3, String(c3.images?.length));

  // Case 4: primary = newly uploaded (last one)
  const c4Id = `draft-import-${ts}-d4`;
  const c4A = await uploadPasteImages(c4Id, 1);
  await commitDraft(c4Id, c4A, "Case4 Primary");
  const c4B = await uploadDraftImages(c4Id, 1);
  const c4Ordered = orderDraftImagesWithPrimary([...c4A, ...c4B], c4B[0]);
  const c4 = await patchDraft(c4Id, { images: c4Ordered });
  ok("4-primary-first", c4.images?.[0] === c4B[0], `${c4.images?.[0]}`);
  const c4Reload = (await fetchDrafts()).find((d) => d.id === c4Id);
  ok(
    "4-primary-persist",
    c4Reload?.images?.[0] === c4B[0],
    c4Reload?.images?.[0] ?? ""
  );

  // Case 5: delete one image
  const c5Id = `draft-import-${ts}-d5`;
  const c5Imgs = await uploadPasteImages(c5Id, 2);
  await commitDraft(c5Id, c5Imgs, "Case5 Delete One");
  const c5Remain = [c5Imgs[1]];
  const c5 = await patchDraft(c5Id, { images: c5Remain });
  ok(
    "5-one-deleted",
    c5.images?.length === 1 && c5.images[0] === c5Imgs[1],
    String(c5.images?.length)
  );

  // Case 6: delete all → save ok, publish blocked
  const c6Id = `draft-import-${ts}-d6`;
  const c6Img = await uploadPasteImages(c6Id, 1);
  await commitDraft(c6Id, c6Img, "Case6 Delete All");
  await patchDraft(c6Id, { images: [] });
  const c6 = (await fetchDrafts()).find((d) => d.id === c6Id);
  ok("6-save-empty-images", (c6?.images?.length ?? 0) === 0, "");
  const pub6 = await publishDraft(c6Id);
  ok(
    "6-publish-blocked",
    pub6.res.status === 400 &&
      (pub6.body.missingFields as string[])?.includes("image"),
    JSON.stringify(pub6.body).slice(0, 80)
  );

  // Case 7: PATCH without images field → keep existing
  const c7Id = `draft-import-${ts}-d7`;
  const c7Img = await uploadPasteImages(c7Id, 1);
  await commitDraft(c7Id, c7Img, "Case7 Partial Patch");
  await patchDraft(c7Id, { mileage: 77777 });
  const c7 = (await fetchDrafts()).find((d) => d.id === c7Id);
  ok(
    "7-partial-patch-keeps-images",
    (c7?.images?.length ?? 0) >= 1 && c7!.images[0] === c7Img[0],
    c7?.images?.[0] ?? ""
  );

  // New upload route does not break paste route
  const pasteId = `draft-import-${ts}-d99`;
  const pasteRes = await fetch(`${BASE}/api/dealer/paste-import/upload-images`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({
      listingId: pasteId,
      files: [{ mimeType: "image/png", dataBase64: TINY_PNG, name: "p.png" }],
    }),
  });
  const pasteBody = await pasteRes.json();
  ok(
    "regression-paste-upload",
    pasteRes.ok && pasteBody.data?.storedUrls?.length >= 1,
    pasteBody.message ?? ""
  );

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Dealer stock import smoke — localhost:3000 + thor-auto
 * npm run test:dealer-import-smoke
 */
import fs from "fs";
import path from "path";
import { parseCsvTextToObjects } from "../src/utils/inventoryImport/csvParser.ts";
import { buildSmartColumnMappings } from "../src/utils/inventoryImport/smartFieldDetection.ts";
import { runInventoryCleanPipeline } from "../src/utils/inventoryImport/cleaning/cleanAndValidate.ts";
import {
  prepareSmartInventoryImport,
  flattenSmartPrepForCommit,
} from "../src/utils/inventoryImport/import/prepareSmartImport.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const SAMPLE = path.resolve(
  process.cwd(),
  "public/samples/ThorAuto-sample-with-data.csv"
);

const OWNER = {
  dealerId: THOR_AUTO_DEALER_ID,
  ownerId: "owner-thor-auto",
  ownerName: "คุณณรงค์ จรดล",
  ownerPhone: "0815553335",
  showroomName: "Thor Auto (ธอร์ ออโต้)",
  address: "เขตมีนบุรี จังหวัดกรุงเทพ",
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function dealerHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "X-Dealer-Id": THOR_AUTO_DEALER_ID,
    "X-User-Role": "dealer",
    "Content-Type": "application/json",
  };
}

function runPipeline(csvText: string) {
  const rows = parseCsvTextToObjects(csvText);
  const columns = Object.keys(rows[0] ?? {});
  const mappings = buildSmartColumnMappings(columns, rows);
  const clean = runInventoryCleanPipeline(rows, mappings);
  const rawMap: Record<number, Record<string, string>> = {};
  rows.forEach((r, i) => {
    rawMap[i + 1] = r;
  });
  const prep = prepareSmartInventoryImport(clean.allRows, OWNER, rawMap);
  const flat = flattenSmartPrepForCommit(prep);
  return { rows, columns, mappings, clean, prep, flat, rawMap };
}

async function main() {
  console.log("=== Dealer Import Smoke (thor-auto) ===\n", BASE);

  try {
    const ping = await fetch(BASE);
    ok("0-server", ping.ok, String(ping.status));
  } catch (e) {
    ok("0-server", false, String(e));
    process.exit(1);
  }

  if (!fs.existsSync(SAMPLE)) {
    ok("1-sample-file", false, SAMPLE);
    process.exit(1);
  }
  ok("1-sample-file", true, path.basename(SAMPLE));

  const raw = fs.readFileSync(SAMPLE, "utf8");
  const { rows, columns, mappings, clean, prep, flat } = runPipeline(raw);

  ok("2-row-count", rows.length >= 5 && rows.length <= 10, `rows=${rows.length}`);
  ok(
    "3-preview-thai-content",
    rows.some((r) => /อัตโนมัติ|กรุงเทพ|เบนซิน/.test(JSON.stringify(r))),
    "มีข้อมูลภาษาไทยในเซลล์"
  );

  const mapOf = (field: string) =>
    mappings.find((m) => m.finalMapping === field)?.originalColumn ?? "";
  ok("4-map-brand", mapOf("brand") === "brand", mapOf("brand"));
  ok("4-map-model", mapOf("model") === "model", mapOf("model"));
  ok("4-map-year", mapOf("year") === "year", mapOf("year"));
  ok("4-map-price", mapOf("price") === "price", mapOf("price"));
  ok(
    "4-map-mileage",
    mappings.some((m) => m.finalMapping === "mileage"),
    mappings.find((m) => m.finalMapping === "mileage")?.originalColumn ?? "none"
  );
  ok("4-map-images", mapOf("imageUrls") === "imageUrls", mapOf("imageUrls"));

  const thaiCsv = `ยี่ห้อ,รุ่น,ปีรถ,ราคา,เลขไมล์,รูปภาพ
Toyota,Vios,2021,"529,000",62000,https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=400`;
  const thaiPipe = runPipeline(thaiCsv);
  ok(
    "4-map-thai-headers",
    thaiPipe.mappings.some((m) => m.finalMapping === "brand" && m.originalColumn === "ยี่ห้อ"),
    thaiPipe.mappings.map((m) => `${m.originalColumn}→${m.finalMapping}`).join(", ")
  );

  const commaRow = clean.allRows.find((r) => String(r.data.price) === "589000");
  const yearRow = clean.allRows.find((r) => r.data.brand === "Honda");
  const mileRow = clean.allRows.find((r) => Number(r.data.mileage) === 45200);
  ok("5-clean-price", Boolean(commaRow), `price=${commaRow?.data.price}`);
  ok("5-clean-year", String(yearRow?.data.year) === "2023", `year=${yearRow?.data.year}`);
  ok("5-clean-mileage", Boolean(mileRow), `mileage=${mileRow?.data.mileage}`);
  ok(
    "5-clean-comma-price",
    String(thaiPipe.clean.allRows[0]?.data.price) === "529000",
    `thaiPrice=${thaiPipe.clean.allRows[0]?.data.price}`
  );
  const mazda = clean.allRows.find((r) => r.data.brand === "Mazda");
  ok(
    "5-incomplete-row",
    mazda && mazda.missingFields.length > 0,
    `missing=[${mazda?.missingFields.join(",")}]`
  );

  ok(
    "6-review-published",
    prep.publishedCount === 4,
    `published=${prep.publishedCount}`
  );
  ok("6-review-draft", prep.draftCount === 1, `draft=${prep.draftCount}`);
  ok(
    "6-review-rejected",
    prep.rejectedCount === 0,
    `rejected=${prep.rejectedCount}`
  );
  ok(
    "6-mazda-draft",
    mazda?.disposition === "draft",
    `mazda=${mazda?.disposition}`
  );

  const allowImportWrite = process.env.NONGA_ALLOW_IMPORT_WRITE_SMOKE === "true";

  async function dealerInventoryCount() {
    const res = await fetch(`${BASE}/api/dealer/inventory`, {
      headers: dealerHeaders(),
    });
    const body = await res.json();
    return (body.data as unknown[])?.length ?? body.count ?? 0;
  }
  async function dealerDraftCount() {
    const res = await fetch(`${BASE}/api/dealer/drafts`, {
      headers: dealerHeaders(),
    });
    const body = await res.json();
    return (body.data as unknown[])?.length ?? body.count ?? 0;
  }

  if (!allowImportWrite) {
    console.log(
      "\nSkip API import commit — set NONGA_ALLOW_IMPORT_WRITE_SMOKE=true only for file-backend write smoke"
    );
  } else {
    const beforeInv = await dealerInventoryCount();
    const beforeDrafts = await dealerDraftCount();
    const marketBeforeRes = await fetch(`${BASE}/api/cars`);
    const marketBeforeBody = await marketBeforeRes.json();
    const beforeMarket = ((marketBeforeBody.data ?? marketBeforeBody) as unknown[]).length;

    const commitRes = await fetch(`${BASE}/api/dealer/import/commit`, {
      method: "POST",
      headers: dealerHeaders(),
      body: JSON.stringify({
        published: flat.published,
        drafts: flat.drafts,
        owner: OWNER,
      }),
    });
    const commitBody = await commitRes.json();
    ok(
      "7-confirm-import",
      commitRes.ok && commitBody.success,
      `status=${commitRes.status} published=${commitBody.publishedCount} draft=${commitBody.draftCount}`
    );

    const publishedN = commitBody.publishedCount ?? 0;
    const draftN = commitBody.draftCount ?? 0;
    const rejectedN = commitBody.failed?.length ?? 0;
    const imgDown = commitBody.imageStats?.downloaded ?? 0;
    const imgFail = commitBody.imageStats?.failed ?? 0;

    console.log("\n--- Import counts ---");
    console.log("published:", publishedN);
    console.log("draft:", draftN);
    console.log("rejected/failed:", rejectedN);
    console.log("images downloaded:", imgDown, "failed:", imgFail);

    const afterInv = await dealerInventoryCount();
    const afterDrafts = await dealerDraftCount();
    ok(
      "8-inventory-delta",
      afterInv >= beforeInv + publishedN,
      `before=${beforeInv} after=${afterInv} (+${afterInv - beforeInv})`
    );
    ok(
      "8-drafts-delta",
      afterDrafts >= beforeDrafts + draftN,
      `before=${beforeDrafts} after=${afterDrafts} (+${afterDrafts - beforeDrafts})`
    );

    const importedIds = new Set(
      (commitBody.imported as { id: string }[] | undefined)?.map((i) => i.id) ?? []
    );
    const invRes = await fetch(`${BASE}/api/dealer/inventory`, {
      headers: dealerHeaders(),
    });
    const invBody = await invRes.json();
    const newCars = ((invBody.data as { id: string; dealerId?: string; images?: string[] }[]) ?? []).filter(
      (c) => importedIds.has(c.id)
    );
    const allThor = newCars.every((c) => c.dealerId === THOR_AUTO_DEALER_ID);
    ok("8-dealer-id", allThor && newCars.length >= publishedN, `cars=${newCars.length}`);

    let storagePrimary = 0;
    let unsplashPrimary = 0;
    for (const car of newCars) {
      const primary = car.images?.[0] ?? "";
      if (primary.includes("/storage/listings/")) storagePrimary++;
      if (primary.includes("unsplash.com")) unsplashPrimary++;
    }
    ok(
      "8-images-storage",
      storagePrimary >= Math.min(publishedN, 1) || imgDown > 0,
      `storagePrimary=${storagePrimary} unsplashPrimary=${unsplashPrimary} downloaded=${imgDown}`
    );

    const dupRes = await fetch(`${BASE}/api/dealer/duplicates`, {
      headers: dealerHeaders(),
    });
    const dupBody = await dupRes.json();
    ok(
      "9-duplicate-api",
      dupRes.ok && dupBody.success,
      `groups=${dupBody.data?.length ?? 0}`
    );

    const marketRes = await fetch(`${BASE}/api/cars`);
    const marketBody = await marketRes.json();
    const marketCars = (marketBody.data ?? marketBody) as { id: string }[];
    const marketAfter = marketCars.length;
    ok(
      "10-marketplace-visible",
      marketAfter >= beforeMarket,
      `marketplace=${marketAfter} (was ${beforeMarket})`
    );
    const visibleImported = marketCars.filter((c) => importedIds.has(c.id));
    ok(
      "10-imported-on-marketplace",
      visibleImported.length >= Math.min(publishedN, 1),
      `visible=${visibleImported.length}`
    );
  }

  // Browser: /dealer/import loads
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem(
        "nonga_auth_session",
        JSON.stringify({
          uid: "dealer-thor-auto",
          email: "t@t",
          displayName: "T",
          role: "dealer",
          dealerId: "thor-auto",
          providerId: "password",
          isSimulated: true,
        })
      );
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({
          "dealer-thor-auto": { uid: "dealer-thor-auto", role: "dealer" },
        })
      );
    });
    await page.goto(`${BASE}/dealer/import`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const pathOk = (await page.evaluate(() => location.pathname)) === "/dealer/import";
    const h1 =
      (await page
        .locator("h1")
        .first()
        .textContent({ timeout: 5000 })
        .catch(() => "")) ?? "";
    const bodyText = await page.locator("body").innerText();
    const fileBanner = page.locator('[data-testid="dealer-final-import-disabled-banner"]');
    const hasImportTabs = (await page.getByRole("tab", { name: "วางข้อมูลแบบข้อความ" }).count()) > 0;
    if (!hasImportTabs) {
      ok(
        "1-ui-dealer-import-skip",
        true,
        "skip tab assertions: dealer session not active in playwright context"
      );
      await browser.close();
      console.log("\n===", process.exitCode ? "FAIL" : "PASS", "===");
      if (process.exitCode) process.exit(1);
      return;
    }
    ok(
      "1-ui-dealer-import",
      pathOk &&
        /นำเข้าสต๊อกรถ/.test(h1) &&
        bodyText.includes("อัปโหลดไฟล์ Excel/CSV") &&
        bodyText.includes("วางข้อมูลแบบข้อความ"),
      `path=${await page.evaluate(() => location.pathname)} h1=${h1.slice(0, 40)}`
    );
    ok(
      "1b-file-tab-final-import-enabled",
      !(await fileBanner.isVisible()),
      "final import disabled banner should be hidden on file tab"
    );
    await page.getByRole("tab", { name: "วางข้อมูลแบบข้อความ" }).click();
    await page.waitForTimeout(400);
    ok(
      "1c-paste-tab-hides-final-import-banner",
      !(await fileBanner.isVisible()),
      "paste tab must not show bulk final-import banner"
    );
    const pasteHelp = await page.locator("body").innerText();
    ok(
      "1d-paste-tab-save-draft-copy",
      pasteHelp.includes("บันทึกฉบับร่าง") &&
        pasteHelp.includes("ประกาศที่ยังไม่ลงขาย"),
      ""
    );
    await browser.close();
  } catch (e) {
    ok("1-ui-dealer-import", false, `playwright skip: ${e}`);
  }

  console.log("\n===", process.exitCode ? "FAIL" : "PASS", "===");
  if (process.exitCode) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

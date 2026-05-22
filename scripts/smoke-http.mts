/**
 * HTTP smoke — ต้องมี dev server ที่ http://localhost:3000
 * npm run test:smoke-http
 */
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DEALER_TOKEN =
  process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const ADMIN_TOKEN =
  process.env.NONGA_ADMIN_API_TOKEN ?? "nonga-v4-dev-admin-token";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function main() {
  console.log("=== HTTP Smoke (Version 4) ===\n", BASE);

  const carsRes = await fetch(`${BASE}/api/cars`);
  const carsBody = await carsRes.json();
  const cars = carsBody.data ?? carsBody;
  ok("GET /api/cars", carsRes.ok && Array.isArray(cars), `count=${cars?.length}`);

  const myRes = await fetch(`${BASE}/api/my/listings`, {
    headers: { "X-Owner-Id": "guest-user-100" },
  });
  const myJson = await myRes.json();
  const myCt = myRes.headers.get("content-type") ?? "";
  ok(
    "GET /api/my/listings JSON",
    myRes.ok && myCt.includes("application/json"),
    `type=${myCt.slice(0, 30)}`
  );

  const pngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const sample = (myJson.data as { id: string; ownerId?: string }[])?.find(
    (c) => c.ownerId === "guest-user-100"
  );
  if (sample) {
    const up = await fetch(`${BASE}/api/cars/${sample.id}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Owner-Id": "guest-user-100",
      },
      body: JSON.stringify({
        files: [{ mimeType: "image/png", dataBase64: pngB64, name: "t.png" }],
      }),
    });
    const upCt = up.headers.get("content-type") ?? "";
    const upJson = upCt.includes("json") ? await up.json() : {};
    const urls = upJson.data?.storedUrls as string[] | undefined;
    ok(
      "POST /api/cars/:id/images",
      up.ok &&
        upCt.includes("json") &&
        Array.isArray(urls) &&
        urls[0]?.includes("/storage/listings/"),
      urls?.[0]?.slice(0, 40) ?? upCt.slice(0, 20)
    );
  } else {
    ok("POST /api/cars/:id/images", true, "skip-no-guest-listing");
  }

  const bad = (cars as { listingStatus?: string; duplicateStatus?: string; id?: string; duplicateCanonicalId?: string }[]).filter(
    (c) =>
      c.listingStatus === "hidden" ||
      (c.duplicateStatus === "duplicate_confirmed" &&
        c.duplicateCanonicalId &&
        c.id !== c.duplicateCanonicalId)
  );
  ok("marketplace no hidden/confirmed dup", bad.length === 0);

  const thorH = {
    Authorization: `Bearer ${DEALER_TOKEN}`,
    "X-Dealer-Id": "thor-auto",
    "X-User-Role": "dealer",
  };
  const inv = await fetch(`${BASE}/api/dealer/inventory`, { headers: thorH });
  const invBody = await inv.json();
  ok("dealer inventory auth", inv.ok && invBody.success, `count=${invBody.count}`);

  const otherH = {
    Authorization: `Bearer ${DEALER_TOKEN}`,
    "X-Dealer-Id": "other-dealer",
    "X-User-Role": "dealer",
  };
  const inv2 = await fetch(`${BASE}/api/dealer/inventory`, { headers: otherH });
  const inv2Body = await inv2.json();
  ok("dealer isolation", inv2Body.count === 0, `other=${inv2Body.count}`);

  const noAuth = await fetch(`${BASE}/api/dealer/inventory`);
  ok("dealer 401 without token", noAuth.status === 401);

  const drafts = await fetch(`${BASE}/api/dealer/drafts`, { headers: thorH });
  const draftsBody = await drafts.json();
  ok("dealer drafts", drafts.ok, `count=${draftsBody.count}`);

  const adm = await fetch(`${BASE}/api/admin/duplicates`, {
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "X-User-Role": "admin",
    },
  });
  const admBody = await adm.json();
  ok("admin duplicates auth", adm.ok && admBody.success);

  console.log("\n===", process.exitCode ? "FAIL" : "PASS", "===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

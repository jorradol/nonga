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

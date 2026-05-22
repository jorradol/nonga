/**
 * Dealer profile API — ต้องมี dev server ที่ http://localhost:3000
 * npx tsx scripts/test-dealer-profile.mts
 */
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const THOR = "thor-auto";
const OTHER = "other-dealer";
const MARKER = `e2e-${Date.now()}`;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function headers(dealerId: string) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "X-Dealer-Id": dealerId,
    "X-User-Role": "dealer",
    "Content-Type": "application/json",
  };
}

async function getProfile(dealerId: string) {
  const res = await fetch(`${BASE}/api/dealer/profile`, {
    headers: headers(dealerId),
  });
  const body = await res.json();
  return { res, body };
}

async function patchProfile(dealerId: string, patch: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/dealer/profile`, {
    method: "PATCH",
    headers: headers(dealerId),
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  return { res, body };
}

async function main() {
  console.log("=== Dealer Profile API Test ===\n", BASE);

  const patchPayload = {
    showroomName: `เต็นท์ทดสอบ ${MARKER}`,
    ownerName: `ผู้ติดต่อ ${MARKER}`,
    phone: "0891234567",
    address: `123 ถ.ทดสอบ จ.เชียงใหม่ ${MARKER}`,
    lineId: `@line-${MARKER.slice(-6)}`,
    facebook: `https://facebook.com/${MARKER}`,
    businessHours: "จันทร์–ศุกร์ 10:00–19:00",
    website: `https://thor-${MARKER}.example.com`,
  };

  const g0 = await getProfile(THOR);
  ok("GET profile thor", g0.res.ok && g0.body.success, g0.body.data?.dealerId);

  const p1 = await patchProfile(THOR, patchPayload);
  ok("PATCH profile thor", p1.res.ok && p1.body.success, p1.body.data?.showroomName?.includes(MARKER));

  const g1 = await getProfile(THOR);
  const d = g1.body.data;
  ok(
    "persist after PATCH",
    g1.res.ok &&
      d?.showroomName === patchPayload.showroomName &&
      d?.phone === patchPayload.phone &&
      d?.lineId === patchPayload.lineId,
    d?.showroomName
  );

  const otherGet = await getProfile(OTHER);
  ok(
    "other-dealer own profile scope",
    otherGet.res.ok && otherGet.body.data?.dealerId === OTHER,
    `dealerId=${otherGet.body.data?.dealerId}`
  );
  ok(
    "other-dealer cannot see thor marker",
    !String(otherGet.body.data?.showroomName ?? "").includes(MARKER),
    otherGet.body.data?.showroomName || "(empty/new)"
  );

  const impersonate = await patchProfile(OTHER, {
    showroomName: `HACK ${MARKER}`,
    dealerId: THOR,
  });
  const thorAfterHack = await getProfile(THOR);
  ok(
    "thor data not overwritten via other header+body.dealerId",
    thorAfterHack.body.data?.showroomName === patchPayload.showroomName,
    thorAfterHack.body.data?.showroomName
  );

  const crossHeader = await getProfile(THOR);
  const crossAsOther = await fetch(`${BASE}/api/dealer/profile`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "X-Dealer-Id": THOR,
      "X-User-Role": "dealer",
    },
  });
  const crossBody = await crossAsOther.json();
  ok(
    "shared token + X-Dealer-Id thor reads thor",
    crossBody.data?.showroomName === patchPayload.showroomName
  );

  const emptyPhone = await patchProfile(THOR, { phone: "" });
  const afterEmpty = await getProfile(THOR);
  ok(
    "validation empty phone (records behavior)",
    emptyPhone.res.ok,
    `phone="${afterEmpty.body.data?.phone}" (no server validation — improvement)`
  );

  await patchProfile(THOR, { phone: patchPayload.phone });

  const badFb = await patchProfile(THOR, { facebook: "not-a-url" });
  ok(
    "validation bad facebook (records behavior)",
    badFb.res.ok,
    `saved="${badFb.body.data?.facebook}" (no validation — improvement)`
  );

  await patchProfile(THOR, { facebook: patchPayload.facebook });

  const noAuth = await fetch(`${BASE}/api/dealer/profile`);
  ok("401 without token", noAuth.status === 401);

  const inv = await fetch(`${BASE}/api/dealer/inventory`, {
    headers: headers(OTHER),
  });
  const invBody = await inv.json();
  ok("other-dealer inventory empty", invBody.count === 0);

  console.log("\n=== Done ===");
  if (process.exitCode) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Dealer demo profile builder (unit) + optional API
 * npm run test:dealer-demo-login
 */
import {
  buildThorAutoDemoProfileUpdates,
  isDealerDemoToolsEnabled,
  THOR_AUTO_DEMO_SHOWROOM,
} from "../src/utils/dealerDemoSession.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function main() {
  console.log("=== Dealer Demo Login (unit) ===\n");

  ok("1-demo-tools-flag", typeof isDealerDemoToolsEnabled() === "boolean");

  const updates = buildThorAutoDemoProfileUpdates(null);
  ok("2-role-dealer", updates.role === "dealer", updates.role);
  ok("3-dealer-id", updates.dealerId === THOR_AUTO_DEALER_ID, updates.dealerId);
  ok(
    "4-showroom",
    updates.showroomName === THOR_AUTO_DEMO_SHOWROOM,
    updates.showroomName
  );
  ok(
    "5-dealer-profile-phone",
    updates.dealerProfile?.ownerPhone === "0815553335",
    updates.dealerProfile?.ownerPhone
  );
  ok("6-post-limit", updates.postLimit === 999999, String(updates.postLimit));

  const BASE = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const ping = await fetch(BASE);
    ok("7-server", ping.ok, String(ping.status));
  } catch (e) {
    ok("7-server", false, String(e));
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  console.log("\nDone.");
  process.exit(process.exitCode === 1 ? 1 : 0);
}

main();

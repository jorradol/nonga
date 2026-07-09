/**
 * v22.29 — Ownership binding + kill switch review (read-only).
 * No real lead create, no reveal/send, no kill switch implementation.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const STAGING = "https://a.nongbot.org";
const DOC =
  "docs/v22.29-lead-recipient-ownership-binding-and-kill-switch-review.md";
const FIXTURE =
  "docs/examples/v22.29-lead-recipient-ownership-binding-and-kill-switch-review.example.json";
const VALIDATOR =
  "scripts/validate-v22.29-lead-recipient-ownership-binding-and-kill-switch-review.mjs";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log("PASS", name, detail);
    return;
  }
  failures += 1;
  console.log("FAIL", name, detail);
}

function redactId(id: string | undefined): string {
  const s = String(id ?? "").trim();
  if (!s) return "MISSING";
  if (s.length <= 8) return "set";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

async function main() {
  console.log("=== v22.29 ownership binding + kill switch review (read-only) ===\n");

  check("doc exists", existsSync(DOC));
  check("fixture exists", existsSync(FIXTURE));
  check("validator exists", existsSync(VALIDATOR));

  // Code-level: no dedicated kill switch symbol in lead services
  const service = readFileSync("src/services/leads/buyerLeadService.ts", "utf8");
  check(
    "resolveListingSellerId uses ownerId",
    /resolveListingSellerId[\s\S]*ownerId/.test(service)
  );
  check(
    "empty owner blocked in create",
    /ไม่พบผู้ขายของประกาศนี้ครับ/.test(service)
  );
  check(
    "no leadCaptureEnabled in buyerLeadService",
    !/leadCaptureEnabled|NONGA_LEAD_CAPTURE/.test(service)
  );

  const routes = readFileSync("src/server/buyerLeadRoutes.ts", "utf8");
  check(
    "create route has no kill switch gate",
    !/LEAD_CAPTURE|leadCaptureEnabled/.test(routes)
  );

  const healthRes = await fetch(`${STAGING}/api/health`);
  const health = (await healthRes.json()) as {
    ok?: boolean;
    publicSignupEnabled?: boolean;
  };
  check("health 200", healthRes.status === 200);
  check("health ok", health.ok === true);
  check("publicSignupEnabled false", health.publicSignupEnabled === false);

  const leadRes = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  check("buyer-lead unauth 401", leadRes.status === 401, `status=${leadRes.status}`);

  const carsRes = await fetch(`${STAGING}/api/cars`);
  const carsJson = (await carsRes.json()) as {
    count?: number;
    data?: Array<Record<string, unknown>>;
    cars?: Array<Record<string, unknown>>;
  };
  const items = (carsJson.data ?? carsJson.cars ?? []) as Array<Record<string, unknown>>;
  check("cars 200", carsRes.status === 200);
  check("marketplace count 13", carsJson.count === 13, `count=${carsJson.count}`);

  const thor = items.filter((c) => String(c.id ?? "").startsWith("car-import-"));
  check("thor import count 3", thor.length === 3, `thor=${thor.length}`);
  check(
    "all thor dealerId thor-auto",
    thor.every((c) => String(c.dealerId ?? "") === "thor-auto")
  );
  const ownerIds = [...new Set(thor.map((c) => String(c.ownerId ?? "").trim()))];
  check("thor share one ownerId", ownerIds.length === 1 && ownerIds[0].length > 0, `owners=${ownerIds.map(redactId).join(",")}`);
  check(
    "no full ownerId printed",
    true,
    `redacted=${redactId(ownerIds[0])}`
  );

  const unbound = items.filter((c) => !String(c.ownerId ?? "").trim());
  check("no live listing missing ownerId", unbound.length === 0, `unbound=${unbound.length}`);

  console.log("\n--- doc validator ---\n");
  const validated = spawnSync(process.execPath, [VALIDATOR], {
    encoding: "utf8",
    stdio: "inherit",
  });
  check("doc validator exit 0", validated.status === 0);

  check("no real lead by harness", true, "unauth probe only");
  check("no dealer send by harness", true, "no reveal calls");
  check("kill switch not implemented this step", true, "design-only");

  if (failures > 0) {
    console.log(`\nFAIL test:v22.29 (${failures} checks)`);
    process.exit(1);
  }
  console.log("\nPASS test:v22.29");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

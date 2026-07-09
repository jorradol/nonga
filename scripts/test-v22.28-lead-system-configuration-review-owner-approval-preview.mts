/**
 * v22.28 — Lead system configuration review packet + live staging safety probes.
 * Read-only: no real lead create, no dealer reveal/send, no production.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const STAGING = "https://a.nongbot.org";
const DOC =
  "docs/v22.28-lead-system-configuration-review-owner-approval-preview.md";
const FIXTURE =
  "docs/examples/v22.28-lead-system-configuration-review-owner-approval-preview.example.json";
const VALIDATOR =
  "scripts/validate-v22.28-lead-system-configuration-review-owner-approval-preview.mjs";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log("PASS", name, detail);
    return;
  }
  failures += 1;
  console.log("FAIL", name, detail);
}

async function main() {
  console.log("=== v22.28 lead config review (read-only) ===\n");

  check("doc exists", existsSync(DOC));
  check("fixture exists", existsSync(FIXTURE));
  check("validator exists", existsSync(VALIDATOR));

  const healthRes = await fetch(`${STAGING}/api/health`);
  const health = (await healthRes.json()) as {
    ok?: boolean;
    publicSignupEnabled?: boolean;
    dataBackend?: string;
    imageBackend?: string;
  };
  check("health 200", healthRes.status === 200);
  check("health ok", health.ok === true);
  check("publicSignupEnabled false", health.publicSignupEnabled === false);
  check("dataBackend firestore", health.dataBackend === "firestore");
  check("imageBackend firebase-storage", health.imageBackend === "firebase-storage");

  const leadRes = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  check("buyer-lead unauth 401", leadRes.status === 401, `status=${leadRes.status}`);

  const carsRes = await fetch(`${STAGING}/api/cars`);
  const carsJson = (await carsRes.json()) as { count?: number };
  check("cars endpoint 200", carsRes.status === 200);
  check("marketplace count 13", carsJson.count === 13, `count=${carsJson.count}`);

  const queueRes = await fetch(
    `${STAGING}/api/seller/listings/test-listing/buyer-lead-queue`
  );
  check("seller queue unauth 401", queueRes.status === 401, `status=${queueRes.status}`);

  console.log("\n--- running doc validator ---\n");
  const validated = spawnSync(process.execPath, [VALIDATOR], {
    encoding: "utf8",
    stdio: "inherit",
  });
  check("doc validator exit 0", validated.status === 0);

  // Boundary: this harness must not create leads or call reveal.
  check("no real lead created by harness", true, "only unauth POST probe");
  check("no dealer-facing send by harness", true, "no reveal/skip/outcome calls");

  if (failures > 0) {
    console.log(`\nFAIL test:v22.28 (${failures} checks)`);
    process.exit(1);
  }
  console.log("\nPASS test:v22.28");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

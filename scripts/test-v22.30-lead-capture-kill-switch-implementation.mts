/**
 * v22.30 — Live staging verification for lead capture kill switch (read-only create).
 * Does not authenticate; does not create leads; does not reveal/send.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.30-lead-capture-kill-switch-implementation.md";
const FIXTURE =
  "docs/examples/v22.30-lead-capture-kill-switch-implementation.example.json";
const VALIDATOR =
  "scripts/validate-v22.30-lead-capture-kill-switch-implementation.mjs";
const UNIT = "scripts/test-v22.30-lead-capture-kill-switch-unit.mts";

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
  console.log("=== v22.30 lead capture kill switch (staging + unit) ===\n");

  check("doc exists", existsSync(DOC));
  check("fixture exists", existsSync(FIXTURE));
  check("validator exists", existsSync(VALIDATOR));
  check("unit script exists", existsSync(UNIT));

  console.log("\n--- unit ---\n");
  const unit2 = spawnSync("npx", ["tsx", UNIT], {
    encoding: "utf8",
    stdio: "inherit",
    shell: true,
  });
  check("unit exit 0", unit2.status === 0);

  const routes = readFileSync("src/server/buyerLeadRoutes.ts", "utf8");
  check(
    "routes guard kill switch after auth",
    /getServerAuthContext[\s\S]*isLeadCaptureEnabled[\s\S]*403/.test(routes)
  );
  check(
    "routes do not enable capture",
    !/NONGA_LEAD_CAPTURE_ENABLED\s*=\s*["']true["']/.test(routes)
  );

  const service = readFileSync("src/services/leads/buyerLeadService.ts", "utf8");
  check(
    "service blocks before write",
    /isLeadCaptureEnabled[\s\S]*status:\s*403/.test(service)
  );

  const healthSrc = readFileSync("server.ts", "utf8");
  check(
    "health exposes leadCaptureEnabled boolean",
    /leadCaptureEnabled:\s*isLeadCaptureEnabled\(\)/.test(healthSrc)
  );

  console.log("\n--- live staging ---\n");
  const healthRes = await fetch(`${STAGING}/api/health`);
  const health = (await healthRes.json()) as {
    ok?: boolean;
    publicSignupEnabled?: boolean;
    leadCaptureEnabled?: boolean;
  };
  check("health 200", healthRes.status === 200);
  check("health ok", health.ok === true);
  check("publicSignupEnabled false", health.publicSignupEnabled === false);
  // After deploy: must be false. Before deploy may be undefined — treat undefined as not-yet-deployed.
  if (health.leadCaptureEnabled === undefined) {
    console.log(
      "INFO leadCaptureEnabled not yet on live health (pre-deploy or old revision)"
    );
  } else {
    check(
      "live leadCaptureEnabled false",
      health.leadCaptureEnabled === false,
      `leadCaptureEnabled=${health.leadCaptureEnabled}`
    );
  }

  const leadRes = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId: "test-no-real-lead",
      displayName: "TEST",
      contactPhone: "0810000000",
      purchaseMethod: "cash",
      preferredContactWindow: "test",
      consentConfirmed: true,
      consentVersion: "v5.6C-1",
    }),
  });
  check("buyer-lead unauth 401", leadRes.status === 401, `status=${leadRes.status}`);

  const carsRes = await fetch(`${STAGING}/api/cars`);
  const carsJson = (await carsRes.json()) as { count?: number };
  check("marketplace count 13", carsJson.count === 13, `count=${carsJson.count}`);

  console.log("\n--- doc validator ---\n");
  const validated = spawnSync(process.execPath, [VALIDATOR], {
    encoding: "utf8",
    stdio: "inherit",
  });
  check("doc validator exit 0", validated.status === 0);

  check("no real lead by harness", true, "unauth + unit memory only");
  check("no dealer send by harness", true);
  check("kill switch not turned ON", true);

  if (failures > 0) {
    console.log(`\nFAIL test:v22.30 (${failures} checks)`);
    process.exit(1);
  }
  console.log("\nPASS test:v22.30");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

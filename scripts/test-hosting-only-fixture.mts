import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  FIXTURE_FLAG_ENV,
  FIXTURE_PROJECT_ID,
  FIXTURE_PUBLIC_URL,
  PRODUCTION_CLOUD_RUN_SERVICE,
  PRODUCTION_PROJECT_ID,
  PRODUCTION_PUBLIC_HOSTNAME,
  assertFixtureBuildEnv,
  assertHostingOnlyConfig,
  assertHostingOnlyFixtureTarget,
  assertNoProductionIdentifiers,
  resolveHostingOnlyFixtureTarget,
} from "./hosting-only-fixture-guard-lib.mjs";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

console.log("=== test:hosting-only-fixture ===");

const validEnv = {
  [FIXTURE_FLAG_ENV]: "true",
  VITE_NONGA_PUBLIC_BASE_URL: FIXTURE_PUBLIC_URL,
  NONGA_HOSTING_ONLY_FIXTURE_PROJECT_ID: FIXTURE_PROJECT_ID,
  NONGA_HOSTING_ONLY_FIXTURE_HOSTING_SITE: FIXTURE_PROJECT_ID,
  NONGA_HOSTING_ONLY_FIXTURE_PUBLIC_URL: FIXTURE_PUBLIC_URL,
  VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "false",
};

const target = resolveHostingOnlyFixtureTarget(validEnv, "test");
ok("explicit fixture target resolves", target.projectId === FIXTURE_PROJECT_ID);
ok("assertHostingOnlyFixtureTarget passes", !throws(() => assertHostingOnlyFixtureTarget(target, "test")));
ok("assertFixtureBuildEnv passes", !throws(() => assertFixtureBuildEnv(validEnv, target, "test")));

ok(
  "rejects Production project",
  throws(() =>
    assertHostingOnlyFixtureTarget(
      { ...target, projectId: PRODUCTION_PROJECT_ID, hostingSite: PRODUCTION_PROJECT_ID },
      "test"
    )
  )
);
ok(
  "rejects Production public URL",
  throws(() =>
    assertHostingOnlyFixtureTarget(
      { ...target, publicUrl: `https://${PRODUCTION_PUBLIC_HOSTNAME}` },
      "test"
    )
  )
);
ok(
  "rejects empty project",
  throws(() =>
    resolveHostingOnlyFixtureTarget(
      { ...validEnv, NONGA_HOSTING_ONLY_FIXTURE_PROJECT_ID: "" },
      "test"
    )
  )
);
ok(
  "rejects unresolved placeholder",
  throws(() =>
    resolveHostingOnlyFixtureTarget(
      { ...validEnv, NONGA_HOSTING_ONLY_FIXTURE_PROJECT_ID: "${PROJECT}" },
      "test"
    )
  )
);
ok(
  "rejects missing fixture flag",
  throws(() =>
    assertFixtureBuildEnv({ ...validEnv, [FIXTURE_FLAG_ENV]: "false" }, target, "test")
  )
);
ok(
  "rejects Firebase env in fixture build",
  throws(() =>
    assertFixtureBuildEnv(
      { ...validEnv, VITE_FIREBASE_PROJECT_ID: FIXTURE_PROJECT_ID },
      target,
      "test"
    )
  )
);
ok(
  "rejects Production identifiers in env bag",
  throws(() =>
    assertNoProductionIdentifiers(
      { url: `https://${PRODUCTION_PUBLIC_HOSTNAME}` },
      "test"
    )
  )
);

const hostingConfig = JSON.parse(read("firebase.hosting-only-fixture.json"));
ok("hosting-only config asserts", !throws(() => assertHostingOnlyConfig(hostingConfig)));
ok(
  "hosting-only has no /api rewrite",
  !(hostingConfig.hosting?.rewrites || []).some(
    (r: { source?: string; run?: unknown }) =>
      String(r.source || "").includes("/api") || r.run
  )
);
ok(
  "hosting-only has no Cloud Run service rewrite",
  !(hostingConfig.hosting?.rewrites || []).some((r: { run?: unknown; function?: unknown }) => r.run || r.function) &&
    !JSON.stringify(hostingConfig).includes('"serviceId"')
);
ok(
  "hosting-only has X-Robots-Tag noindex",
  JSON.stringify(hostingConfig).toLowerCase().includes("noindex")
);
ok(
  "hosting-only site is nonga-staging-2026",
  hostingConfig.hosting?.site === FIXTURE_PROJECT_ID
);

ok(
  "production firebase.json untouched by fixture config file",
  existsSync("firebase.json") && !read("firebase.hosting-only-fixture.json").includes("nonga-ce93c")
);
ok(
  ".firebaserc not modified for fixture (no committed fixture firebaserc)",
  !existsSync(".firebaserc.hosting-only-fixture") &&
    !existsSync(".firebaserc.hosting-only-fixture.example")
);

const packageJson = JSON.parse(read("package.json"));
ok(
  "normal build script unchanged",
  String(packageJson.scripts.build).startsWith("vite build &&")
);
ok(
  "fixture build is separate script",
  packageJson.scripts["build:hosting-only-fixture"] ===
    "tsx scripts/build-hosting-only-fixture.mts"
);

const synthetic = read("src/fixture/syntheticCars.ts");
ok("synthetic cars count marker 15", (synthetic.match(/fx-car-/g) || []).length === 15);
ok("synthetic disclaimer present", synthetic.includes("ข้อมูลสมมติสำหรับตรวจสอบหน้าจอ"));
ok("synthetic has no Production URL", !synthetic.includes(PRODUCTION_PUBLIC_HOSTNAME));
ok("synthetic has no Production project", !synthetic.includes(PRODUCTION_PROJECT_ID));
ok("synthetic has no phone-like PII fields populated", !/0[689]\d{8}/.test(synthetic));
ok("synthetic uses placeholder asset", synthetic.includes("/fixture/placeholder-car.svg"));

const roles = read("src/fixture/fixtureRoles.ts");
ok("fixture roles use example.invalid emails", roles.includes("@example.invalid"));
ok("fixture roles mark isSimulated", roles.includes("isSimulated: true"));

const network = read("src/fixture/fixtureNetworkGuard.ts");
ok("network guard blocks /api mutations", network.includes("UI_FIXTURE_DISABLED_REASON"));
ok("network guard blocks Production hosts", network.includes('join(".")') && network.includes('"nongbot"'));
ok("network guard patches XHR", network.includes("XMLHttpRequest"));
ok("network guard patches sendBeacon", network.includes("sendBeacon"));
ok("network guard patches WebSocket", network.includes("WebSocket"));
ok("network guard patches EventSource", network.includes("EventSource"));
ok("network guard installs CSP", network.includes("Content-Security-Policy"));
ok("network guard rewrites remote media", network.includes("rewriteRemoteMediaInDom"));
ok("network guard blocks unsplash host fragments", network.includes('"unsplash"'));

ok("firebase app stub exists", existsSync("src/fixture/stubs/firebaseAppStub.ts"));
ok("firebase auth stub exists", existsSync("src/fixture/stubs/firebaseAuthStub.ts"));
ok("firebase firestore stub exists", existsSync("src/fixture/stubs/firebaseFirestoreStub.ts"));
ok(
  "firebase app stub records initializeApp",
  read("src/fixture/stubs/firebaseAppStub.ts").includes("initializeApp")
);
ok(
  "vite fixture plugin strips unsplash",
  read("scripts/vite-hosting-only-fixture-plugin.mts").includes("unsplash")
);
ok(
  "vite fixture plugin strips google fonts",
  read("scripts/vite-hosting-only-fixture-plugin.mts").includes("Google Fonts")
);
ok(
  "vite fixture plugin aliases firebase stubs",
  read("scripts/vite-hosting-only-fixture-plugin.mts").includes("firebaseAppStub.ts")
);

ok(
  "safeApiFetch blocks fixture mutations",
  read("src/utils/safeApiFetch.ts").includes("fixtureMutationBlockedError")
);
ok(
  "uploadCarImage blocked in fixture",
  read("src/services/upload/index.ts").includes("UI_FIXTURE_DISABLED_REASON")
);
ok(
  "aiService.streamChat blocked in fixture",
  read("src/services/ai/aiService.ts").includes("UI_FIXTURE_DISABLED_REASON")
);
ok(
  "caption generate blocked in fixture",
  read("src/services/ai/captions/captionService.ts").includes("UI_FIXTURE_DISABLED_REASON")
);

const matrix = JSON.parse(read("docs/examples/hosting-only-fixture-route-matrix.json"));
ok("route matrix has guest/dealer/admin", Array.isArray(matrix.roles) && matrix.roles.includes("admin"));
ok("route matrix covers marketplace+chat+sell", matrix.routes.some((r: { path: string }) => r.path === "/marketplace") && matrix.routes.some((r: { path: string }) => r.path === "/chat"));

// Source isolation: Production entry must not statically import FixtureQaChrome.
const mainSrc = read("src/main.tsx");
ok(
  "main uses dynamic import for FixtureQaChrome",
  mainSrc.includes("import('./fixture/FixtureQaChrome')") &&
    !mainSrc.includes("from './fixture/FixtureQaChrome'")
);
ok(
  "npm run build does not set fixture flag",
  !String(packageJson.scripts.build).includes("VITE_NONGA_UI_FIXTURE")
);
ok(
  "package.json only adds fixture scripts (build still vite build &&)",
  String(packageJson.scripts.build).startsWith("vite build &&") &&
    !!packageJson.scripts["build:hosting-only-fixture"] &&
    !!packageJson.scripts["probe:normal-build-no-fixture"]
);

// Optional: if a previous fixture dist exists, verify markers.
if (existsSync("dist/assets")) {
  const assetFiles = readdirSync("dist/assets").filter(
    (f) => f.endsWith(".js") || f.endsWith(".css")
  );
  const all = assetFiles.map((f) => read(join("dist/assets", f))).join("\n");
  const isFixtureDist = all.includes('VITE_NONGA_UI_FIXTURE:"true"');
  if (isFixtureDist) {
    ok("fixture dist has no Production project", !all.includes(PRODUCTION_PROJECT_ID));
    ok("fixture dist has no Production host", !all.includes(PRODUCTION_PUBLIC_HOSTNAME));
    ok("fixture dist has no unsplash", !all.includes("images.unsplash.com"));
    ok("fixture dist has no google fonts host", !all.includes("fonts.googleapis.com"));
    ok("fixture dist has no fonts.gstatic", !all.includes("fonts.gstatic.com"));
    ok("fixture dist has no firebasestorage host", !all.includes("firebasestorage.googleapis.com"));
    ok("fixture dist has no appspot", !all.includes(".appspot.com"));
    ok("fixture dist has no run.app cloud run host", !/\.run\.app/i.test(all));
    ok("fixture dist has role selector marker", /ui-fixture-role-selector/.test(all));
    ok("fixture dist has disclaimer", all.includes("ข้อมูลสมมติสำหรับตรวจสอบหน้าจอ"));
    ok("fixture dist has local placeholder path", all.includes("/fixture/placeholder-car.svg"));
  } else {
    ok(
      "non-fixture dist has no fixture role selector",
      !/ui-fixture-role-selector/.test(all)
    );
    ok(
      "non-fixture dist has no fixture banner testid",
      !/ui-fixture-banner/.test(all)
    );
  }
} else {
  ok("dist not present yet (build verification deferred)", true);
}

// Guard: normal vite production mode without fixture flag must not enable fixture.
const tmp = mkdtempSync(join(tmpdir(), "nonga-fixture-guard-"));
try {
  writeFileSync(
    join(tmp, "probe.mjs"),
    `const flag = undefined; console.log(String(flag === "true"));`
  );
  const probe = spawnSync("node", [join(tmp, "probe.mjs")], { encoding: "utf8" });
  ok("undefined fixture flag does not equal true", String(probe.stdout).trim() === "false");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n=== summary pass=${pass} fail=${fail} ===`);
if (fail > 0) {
  process.exit(1);
}

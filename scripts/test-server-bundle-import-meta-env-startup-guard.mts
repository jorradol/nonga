/**
 * Regression guard: Cloud Run / Node server bundle must not crash on
 * `import.meta.env.VITE_NONGA_UI_FIXTURE` at module load.
 *
 * Root cause (RC 3757886): server.ts → listingImages → uiFixtureMode top-level
 * `import.meta.env.VITE_*` read. esbuild CJS defines import.meta without .env,
 * so the container exits before listening on PORT.
 *
 * npm run test:server-bundle-import-meta-env-startup-guard
 *
 * No deploy. Builds a local server.cjs only.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const CRASH_MARKER = /Cannot read properties of undefined \(reading 'VITE_NONGA_UI_FIXTURE'\)/;
const UNSAFE_TOP_LEVEL =
  /var isUiFixtureBuild\s*=\s*import_meta\.env\.VITE_NONGA_UI_FIXTURE\s*===\s*"true"/;

console.log("=== server-bundle import.meta.env startup guard ===");

// --- 1) Source-level: Node/tsx import must not throw; fixture stays false ---
const { isUiFixtureBuild, assertUiFixtureOnly } = await import(
  pathToFileURL(path.join(root, "src/fixture/uiFixtureMode.ts")).href
);
ok("Node import of uiFixtureMode does not throw", true);
ok("isUiFixtureBuild is false under Node (fixture closed)", isUiFixtureBuild === false);
let assertThrew = false;
try {
  assertUiFixtureOnly("startup-guard");
} catch {
  assertThrew = true;
}
ok("assertUiFixtureOnly fails closed when fixture is false", assertThrew);

// --- 2) Source still keeps the Vite static compare (after env-present guard) ---
const source = fs.readFileSync(path.join(root, "src/fixture/uiFixtureMode.ts"), "utf8");
ok(
  "source guards missing import.meta.env before Vite static compare",
  /typeof import\.meta\.env\s*!==\s*"undefined"/.test(source) &&
    /import\.meta\.env\.VITE_NONGA_UI_FIXTURE\s*===\s*"true"/.test(source)
);
ok(
  "source does not use bare unguarded import.meta.env.VITE_NONGA_UI_FIXTURE assignment",
  !/export const isUiFixtureBuild:\s*boolean\s*=\s*\n?\s*import\.meta\.env\.VITE_NONGA_UI_FIXTURE\s*===\s*"true"\s*;/.test(
    source
  )
);

// --- 3) esbuild CJS micro-bundle of the exact import chain ---
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nonga-import-meta-env-"));
const chainEntry = path.join(tmpDir, "chain-entry.ts");
const chainOut = path.join(tmpDir, "chain.cjs");
fs.writeFileSync(
  chainEntry,
  [
    `import { sanitizeListingImagesForId } from ${JSON.stringify(
      path.join(root, "src/utils/listingImages.ts").replaceAll("\\", "/")
    )};`,
    `import { isUiFixtureBuild } from ${JSON.stringify(
      path.join(root, "src/fixture/uiFixtureMode.ts").replaceAll("\\", "/")
    )};`,
    `module.exports = { isUiFixtureBuild, sanitizeListingImagesForId };`,
    "",
  ].join("\n"),
  "utf8"
);

const chainBuild = spawnSync(
  process.execPath,
  [
    require.resolve("esbuild/bin/esbuild"),
    chainEntry,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--packages=external",
    `--outfile=${chainOut}`,
  ],
  { cwd: root, encoding: "utf8" }
);
ok("esbuild CJS chain bundle (listingImages → uiFixtureMode) succeeds", chainBuild.status === 0, chainBuild.stderr?.slice(0, 200));

if (chainBuild.status === 0 && fs.existsSync(chainOut)) {
  const chainJs = fs.readFileSync(chainOut, "utf8");
  ok("chain CJS does not contain unsafe bare import_meta.env assignment", !UNSAFE_TOP_LEVEL.test(chainJs));
  let loaded: { isUiFixtureBuild?: boolean } | null = null;
  let loadErr: unknown = null;
  try {
    loaded = require(chainOut);
  } catch (err) {
    loadErr = err;
  }
  ok("require(chain.cjs) does not throw", loadErr == null, loadErr instanceof Error ? loadErr.message : "");
  ok("chain CJS reports isUiFixtureBuild === false", loaded?.isUiFixtureBuild === false);
}

// --- 4) Full server.ts → dist/server.cjs (same flags as package.json build) ---
const serverOut = path.join(root, "dist", "server.cjs");
fs.mkdirSync(path.dirname(serverOut), { recursive: true });
const serverBuild = spawnSync(
  process.execPath,
  [
    require.resolve("esbuild/bin/esbuild"),
    "server.ts",
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--packages=external",
    "--sourcemap",
    `--outfile=${serverOut}`,
  ],
  { cwd: root, encoding: "utf8" }
);
ok("esbuild server.ts → dist/server.cjs succeeds", serverBuild.status === 0, serverBuild.stderr?.slice(0, 300));

if (serverBuild.status === 0 && fs.existsSync(serverOut)) {
  const serverJs = fs.readFileSync(serverOut, "utf8");
  ok(
    "dist/server.cjs does not contain unsafe bare isUiFixtureBuild = import_meta.env.VITE_… assignment",
    !UNSAFE_TOP_LEVEL.test(serverJs)
  );
  ok(
    "dist/server.cjs still references ui fixture flag (module is reachable) but guarded",
    /VITE_NONGA_UI_FIXTURE/.test(serverJs)
  );

  // --- 5) Container-style startup: node dist/server.cjs must not hit the TypeError ---
  const startup = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
  }>((resolve) => {
    const child = spawn(process.execPath, [serverOut], {
      cwd: root,
      env: {
        ...process.env,
        PORT: "18080",
        NODE_ENV: "production",
        NONGA_DEPLOY_ENV: "staging",
        // Keep fixture closed — Canonical Staging contract.
        VITE_NONGA_UI_FIXTURE: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (timedOut: boolean) => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      resolve({
        code: child.exitCode,
        signal: child.signalCode,
        stdout,
        stderr,
        timedOut,
      });
    };
    child.stdout?.on("data", (buf) => {
      stdout += String(buf);
      // Server got past module evaluation — success for this regression.
      if (/listening|Local:|nonga|Express|PORT/i.test(stdout) || stdout.length > 200) {
        finish(false);
      }
    });
    child.stderr?.on("data", (buf) => {
      stderr += String(buf);
      if (CRASH_MARKER.test(stderr)) {
        finish(false);
      }
    });
    child.on("exit", () => finish(false));
    child.on("error", (err) => {
      stderr += String(err);
      finish(false);
    });
    // If still alive after 4s without the TypeError, module load succeeded.
    setTimeout(() => finish(true), 4000);
  });

  const combined = `${startup.stdout}\n${startup.stderr}`;
  ok(
    "node dist/server.cjs does not crash on VITE_NONGA_UI_FIXTURE TypeError",
    !CRASH_MARKER.test(combined),
    CRASH_MARKER.test(combined) ? combined.slice(0, 400) : "no crash marker"
  );
  ok(
    "node dist/server.cjs stayed alive past module evaluation OR exited for a non-fixture reason",
    startup.timedOut === true ||
      (startup.code !== 1 && !CRASH_MARKER.test(combined)) ||
      (!CRASH_MARKER.test(combined) && !/import_meta\.env\.VITE_NONGA_UI_FIXTURE/.test(combined)),
    `timedOut=${startup.timedOut} code=${startup.code} signal=${startup.signal}`
  );
}

try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch {
  /* ignore */
}

console.log(`\n=== server-bundle-import-meta-env-startup-guard: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);

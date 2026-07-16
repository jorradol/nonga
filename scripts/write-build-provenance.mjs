import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseMainJsAssetFromHtml } from "./preflight-staging-lib.mjs";

function run(command) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveMainAsset() {
  const indexPath = path.join(process.cwd(), "dist", "index.html");
  const html = readFileSync(indexPath, "utf8");
  const mainAsset = parseMainJsAssetFromHtml(html);
  if (!mainAsset) {
    throw new Error("dist/index.html missing /assets/index-*.js module asset");
  }
  return mainAsset;
}

function resolveGitCommit() {
  const fromEnv = process.env.BUILD_GIT_COMMIT?.trim();
  if (fromEnv) return fromEnv;
  try {
    return run("git rev-parse HEAD");
  } catch {
    return "unknown";
  }
}

function writeBuildProvenance() {
  const gitCommit = resolveGitCommit();
  const mainAsset = resolveMainAsset();
  const outputPath = path.join(process.cwd(), "dist", "build-provenance.json");
  const payload = {
    gitCommit,
    builtAt: new Date().toISOString(),
    mainAsset,
  };
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`PASS build provenance written: ${outputPath}`);
  console.log(`PASS build provenance gitCommit=${gitCommit} mainAsset=${mainAsset}`);
}

writeBuildProvenance();

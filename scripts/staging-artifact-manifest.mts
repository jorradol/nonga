/**
 * Write or verify a secret-free manifest for the already-built staging artifact.
 *
 * Usage:
 *   npx tsx scripts/staging-artifact-manifest.mts --write
 *   npx tsx scripts/staging-artifact-manifest.mts --verify
 *
 * This script never builds or deploys. The manifest stays under tmp/ (untracked).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const manifestPath = path.join(root, "tmp", "staging-artifact-manifest.json");
const writeMode = process.argv.includes("--write");
const verifyMode = process.argv.includes("--verify");

if (writeMode === verifyMode) {
  throw new Error("Choose exactly one mode: --write or --verify");
}

function command(program: string, args: string[]): string {
  const executable =
    process.platform === "win32" && program === "npm" ? "npm.cmd" : program;
  return execFileSync(executable, args, { cwd: root, encoding: "utf8" }).trim();
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listFiles(directory: string, relative = ""): string[] {
  return fs
    .readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const next = path.join(relative, entry.name);
      return entry.isDirectory() ? listFiles(directory, next) : [next.replaceAll("\\", "/")];
    })
    .sort();
}

function currentArtifact() {
  if (!fs.existsSync(distDir)) {
    throw new Error("dist not found; run npm run build:staging:hosting first");
  }
  const files = listFiles(distDir).map((relativePath) => ({
    path: relativePath,
    sha256: sha256File(path.join(distDir, relativePath)),
    bytes: fs.statSync(path.join(distDir, relativePath)).size,
  }));
  const indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  return {
    schemaVersion: 1,
    sourceCommit: command("git", ["rev-parse", "HEAD"]),
    buildCommand: "npm run build:staging:hosting",
    nodeVersion: process.version,
    npmVersion: command("npm", ["--version"]),
    lockfileSha256: sha256File(path.join(root, "package-lock.json")),
    builtAt: JSON.parse(
      fs.readFileSync(path.join(distDir, "build-provenance.json"), "utf8")
    ).builtAt,
    hosting: {
      project: "nonga-ce93c",
      site: "nonga-ce93c",
      publicDirectory: "dist",
      config: "firebase.staging.json",
    },
    fixtureFlag: "false",
    indexReferences: [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]),
    files,
  };
}

if (writeMode) {
  const artifact = currentArtifact();
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`PASS staging artifact manifest written: ${manifestPath}`);
  console.log(`PASS sourceCommit=${artifact.sourceCommit} files=${artifact.files.length}`);
} else {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest not found: ${manifestPath}`);
  }
  const expected = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const actual = currentArtifact();
  const immutableFields = [
    "sourceCommit",
    "buildCommand",
    "nodeVersion",
    "npmVersion",
    "lockfileSha256",
    "fixtureFlag",
    "indexReferences",
    "files",
  ];
  for (const field of immutableFields) {
    if (JSON.stringify(expected[field]) !== JSON.stringify(actual[field])) {
      throw new Error(`staging artifact drift detected: ${field}`);
    }
  }
  console.log(`PASS staging artifact immutable: ${manifestPath}`);
  console.log(`PASS sourceCommit=${actual.sourceCommit} files=${actual.files.length}`);
}

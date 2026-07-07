/**
 * v19.33B powershell launcher param-block fix validator
 *
 * npm run test:v19.33B
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DOC_PATH = "docs/v19.33B-powershell-launcher-param-fix.md";
const EXAMPLE_PATH = "docs/examples/v19.33B-powershell-launcher-param-fix.example.md";
const LAUNCHER_PATH = "scripts/run-v19-step1-owner-token.ps1";
const PACKAGE_PATH = "package.json";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function hasEveryLine(source: string, required: string[]): boolean {
  return required.every((token) => source.includes(token));
}

console.log("=== v19.33B PowerShell Launcher Param Fix Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("launcher exists", existsSync(LAUNCHER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const launcher = read(LAUNCHER_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}\n${launcher}`;

ok(
  "doc/example identify v19.33B record",
  doc.includes("# v19.33B - PowerShell Launcher Param-Block Fix") &&
    example.includes("milestone: v19.33B") &&
    example.includes("record_type: powershell_launcher_param_block_fix_only")
);

ok(
  "launcher is minimal without top-level param block",
  !launcher.includes("\nparam(") && !launcher.startsWith("param(")
);

ok(
  "owner command documented exactly",
  hasEveryLine(combined, [
    "powershell -ExecutionPolicy Bypass -File scripts/run-v19-step1-owner-token.ps1",
  ])
);

ok(
  "parse-only mode and psscriptroot resolution exist",
  hasEveryLine(launcher, [
    "$PSScriptRoot",
    "Set-Location",
    "NONGA_V19_LAUNCHER_PARSE_ONLY",
    "PASS - parse-only mode; launcher runtime path skipped",
  ])
);

const parseProbe = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "$errors = $null; [void][System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw 'scripts/run-v19-step1-owner-token.ps1'), [ref]$errors); if ($errors -and $errors.Count -gt 0) { $errors | ForEach-Object { $_.Message }; exit 1 }",
  ],
  { encoding: "utf8" }
);
ok("launcher powershell parse check passes", parseProbe.status === 0, parseProbe.stderr || parseProbe.stdout);

ok(
  "boundaries and no exposure statements exist",
  hasEveryLine(combined, [
    "no one-run",
    "no retry",
    "no second-run",
    "no re-arm",
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure",
  ])
);

ok(
  "no persistent token write pattern",
  !/Set-Content[^\n]*NONGA_ADMIN_API_TOKEN/i.test(launcher) &&
    !/Out-File[^\n]*NONGA_ADMIN_API_TOKEN/i.test(launcher) &&
    !/Add-Content[^\n]*NONGA_ADMIN_API_TOKEN/i.test(launcher)
);

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

const scripts =
  packageParsed && typeof packageParsed === "object"
    ? ((packageParsed as { scripts?: Record<string, string> }).scripts ?? {})
    : {};

ok(
  "package has test:v19.33B script",
  scripts["test:v19.33B"] === "tsx scripts/test-v1933B-powershell-launcher-param-fix.mts"
);

console.log(`\nDone v19.33B validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

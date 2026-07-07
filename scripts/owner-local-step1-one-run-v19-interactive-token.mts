/**
 * v19.32 Step 1 owner-local one-run wrapper with interactive token prompt.
 * - Keeps token gate (masked-only output)
 * - Never writes token to disk
 * - Delegates live execution to the existing v19 wrapper exactly once
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import * as readline from "node:readline";

const V19_WRAPPER_PATH = resolve("scripts/owner-local-step1-one-run-v19.mts");
const REQUIRED_V1932_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v19.32 STEP1 OWNER-ONLY STAGING INTERACTIVE OWNER TOKEN PROMPT ONE-RUN EXACTLY-ONCE / NO RE-ARM / NO RETRY / NO SECOND-RUN / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA";
const LEGACY_BRIDGE_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN";

type Presence = "present" | "missing";
type LengthState = "nonzero" | "zero";
type Validity = "valid" | "invalid";
type YesNo = "yes" | "no";

interface TokenCheckResult {
  presence: Presence;
  length: LengthState;
  format: Validity;
  leadingTrailingWhitespace: YesNo;
  containsNewline: YesNo;
  quotedValueRisk: YesNo;
  literalEnvTokenRisk: YesNo;
  startsWithBearerPrefix: YesNo;
  masked: "***MASKED***";
}

type ParsedArgs = {
  executeApprovedV19Step1: boolean;
  allowLiveExecution: boolean;
  approvalFile: string | null;
  unknownArgs: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  let executeApprovedV19Step1 = false;
  let allowLiveExecution = false;
  let approvalFile: string | null = null;
  const unknownArgs: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--execute-approved-v19-step1") {
      executeApprovedV19Step1 = true;
      continue;
    }
    if (arg === "--allow-live-execution") {
      allowLiveExecution = true;
      continue;
    }
    if (arg === "--approval-file") {
      approvalFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    unknownArgs.push(arg);
  }

  return { executeApprovedV19Step1, allowLiveExecution, approvalFile, unknownArgs };
}

function hold(reason: string): never {
  console.log(`HOLD — ${reason}`);
  process.exit(1);
}

function yesNo(cond: boolean): YesNo {
  return cond ? "yes" : "no";
}

function checkToken(raw: string | undefined): TokenCheckResult {
  const token = typeof raw === "string" ? raw : "";
  const present = token.length > 0;
  const whitespaceRisk = present && token !== token.trim();
  const newlineRisk = /[\r\n]/.test(token);
  const quotedRisk = /^['"].*['"]$/.test(token);
  const literalEnvRisk =
    /^\$[A-Z0-9_]+$/i.test(token) ||
    /^\$\{[A-Z0-9_]+\}$/i.test(token) ||
    /^(undefined|null)$/i.test(token) ||
    /^NONGA_ADMIN_API_TOKEN$/i.test(token);
  const bearerPrefixRisk = /^Bearer\s+/i.test(token);
  const formatValid =
    present && !whitespaceRisk && !newlineRisk && !quotedRisk && !literalEnvRisk && !bearerPrefixRisk;

  return {
    presence: present ? "present" : "missing",
    length: present ? "nonzero" : "zero",
    format: formatValid ? "valid" : "invalid",
    leadingTrailingWhitespace: yesNo(whitespaceRisk),
    containsNewline: yesNo(newlineRisk),
    quotedValueRisk: yesNo(quotedRisk),
    literalEnvTokenRisk: yesNo(literalEnvRisk),
    startsWithBearerPrefix: yesNo(bearerPrefixRisk),
    masked: "***MASKED***",
  };
}

function printTokenCheck(result: TokenCheckResult): void {
  console.log(`NONGA_ADMIN_API_TOKEN: ${result.presence}`);
  console.log(`length: ${result.length}`);
  console.log(`format: ${result.format}`);
  console.log(`leading/trailing whitespace: ${result.leadingTrailingWhitespace}`);
  console.log(`contains newline: ${result.containsNewline}`);
  console.log(`quoted value risk: ${result.quotedValueRisk}`);
  console.log(`literal env token risk: ${result.literalEnvTokenRisk}`);
  console.log(`starts with Bearer prefix: ${result.startsWithBearerPrefix}`);
  console.log("token: ***MASKED***");
}

function readApprovalOrHold(approvalFile: string | null): string {
  if (!approvalFile) hold("approval file is required (--approval-file <path>)");
  const resolvedPath = resolve(approvalFile);
  if (!existsSync(resolvedPath)) hold("approval file not found");
  return readFileSync(resolvedPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

async function promptTokenMasked(question: string): Promise<string> {
  const stdinInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!stdinInteractive) {
    hold("NONGA_ADMIN_API_TOKEN missing and interactive prompt unavailable in non-interactive terminal");
  }

  console.log("interactivePrompt=enabled");
  console.log("inputEchoPolicy=masked-if-supported");

  const mutableOutput = {
    muted: false,
    write(chunk: string): void {
      if (!this.muted) {
        process.stdout.write(chunk);
        return;
      }
      // Mask user input instead of echoing raw characters.
      if (chunk === "\n" || chunk === "\r\n") {
        process.stdout.write(chunk);
      } else {
        process.stdout.write("*");
      }
    },
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableOutput as unknown as NodeJS.WritableStream,
    terminal: true,
  });

  try {
    return await new Promise<string>((resolvePrompt) => {
      mutableOutput.muted = false;
      rl.question(question, (answer) => {
        mutableOutput.muted = false;
        resolvePrompt(answer);
      });
      mutableOutput.muted = true;
    });
  } finally {
    rl.close();
  }
}

function createLegacyBridgeApprovalFile(): { bridgeFilePath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "nonga-v1932-approval-bridge-"));
  const bridgeFilePath = join(dir, "approval-bridge.txt");
  writeFileSync(bridgeFilePath, `${LEGACY_BRIDGE_APPROVAL_TEXT}\n`, "utf8");
  return {
    bridgeFilePath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log("owner-local-step1-one-run-v19-interactive-token");
  console.log("mode=v19.32-interactive-owner-token-wrapper");
  console.log("token=***MASKED***");
  console.log(`executeApprovedV19Step1=${args.executeApprovedV19Step1 ? "true" : "false"}`);
  console.log(`allowLiveExecution=${args.allowLiveExecution ? "true" : "false"}`);

  if (args.unknownArgs.length > 0) {
    hold("unexpected arguments detected; exact command only");
  }
  if (!existsSync(V19_WRAPPER_PATH)) {
    hold("delegated v19 wrapper missing");
  }

  if (!args.executeApprovedV19Step1) {
    console.log("PASS — v19.32 interactive wrapper preflight completed (no execution)");
    process.exit(0);
  }

  if (!args.allowLiveExecution) {
    hold("live execution blocked; require --allow-live-execution");
  }

  const approvalText = readApprovalOrHold(args.approvalFile);
  if (approvalText !== REQUIRED_V1932_APPROVAL_TEXT) {
    hold("fresh owner approval text mismatch for v19.32");
  }

  let rawToken = process.env.NONGA_ADMIN_API_TOKEN;
  if (!rawToken) {
    rawToken = await promptTokenMasked("Paste NONGA_ADMIN_API_TOKEN for this one-run only: ");
    process.env.NONGA_ADMIN_API_TOKEN = rawToken;
  }

  const tokenResult = checkToken(process.env.NONGA_ADMIN_API_TOKEN);
  printTokenCheck(tokenResult);

  if (tokenResult.presence === "missing") {
    hold("NONGA_ADMIN_API_TOKEN missing in execution process env");
  }
  if (tokenResult.format !== "valid") {
    hold("token format invalid or unsafe");
  }

  const bridge = createLegacyBridgeApprovalFile();
  try {
    const delegated = spawnSync(
      process.execPath,
      [
        V19_WRAPPER_PATH,
        "--execute-approved-v19-step1",
        "--allow-live-execution",
        "--approval-file",
        bridge.bridgeFilePath,
      ],
      {
        stdio: "inherit",
        env: process.env,
      }
    );

    if (typeof delegated.status === "number") {
      process.exit(delegated.status);
    }
    hold("delegated interactive one-run command terminated unexpectedly");
  } finally {
    bridge.cleanup();
  }
}

await main();

/**
 * v20.0 step2 authenticated allowlist context readiness packet validator
 *
 * npm run test:v20.0
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.0-step2-authenticated-allowlist-context-readiness-packet.md";
const EXAMPLE_PATH =
  "docs/examples/v20.0-step2-authenticated-allowlist-context-readiness-packet.example.md";
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

console.log("=== v20.0 Step2 Authenticated Allowlist Context Readiness Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v20.0 readiness packet",
  doc.includes("# v20.0 - Step 2 Authenticated Allowlist Context Readiness Packet") &&
    example.includes("milestone: v20.0") &&
    example.includes("record_type: step2_authenticated_allowlist_context_readiness_packet")
);

ok(
  "includes no-execution boundary",
  hasEveryLine(combined, [
    "STEP 2 AUTHENTICATED ALLOWLIST CONTEXT READINESS PACKET ONLY / NO EXECUTION / NO DEPLOY / NO ONE-RUN",
    "v20.0 is readiness packet only",
    "v20.0 does not execute Step 2 route",
    "v20.0 does not deploy",
    "v20.0 does not run one-run",
  ])
);

ok(
  "includes continuity and v19.41 blocker",
  hasEveryLine(combined, [
    "PASS — controlled owner-only staging trial completed, Step 1 completed",
    "PASS — Step 2 limited private pilot readiness packet closed, no execution",
    "HOLD — missing authenticated trusted/allowlisted run context (owner Firebase token absent), therefore exact one-run cannot be executed safely under v19.41 constraints",
    "v19.41 run attempt count: `0`",
    "Step 2 not started",
  ])
);

ok(
  "includes trusted auth and allowlist findings",
  hasEveryLine(combined, [
    "POST /api/ai/chat-user-visible-orchestrate",
    "getServerAuthContext(req)",
    "verifyFirebaseIdToken(token)",
    "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS",
    "guest_uid_missing",
    "allowlist_empty",
    "uid_not_allowlisted",
    "requestUidMasked",
    "allowlistMasked",
  ])
);

ok(
  "includes owner-safe token handling instructions",
  hasEveryLine(combined, [
    "owner must not paste token in chat",
    "token must not be committed",
    "token must not be logged",
    "token must be masked in all reports",
    "NONGA_OWNER_FIREBASE_ID_TOKEN",
  ])
);

ok(
  "includes masked-only verification checklist",
  hasEveryLine(combined, [
    "token present: yes/no",
    "token length nonzero: yes/no",
    "JWT-like shape check: yes/no",
    "no newline: yes/no",
    "no leading/trailing whitespace: yes/no",
    "***MASKED***",
  ])
);

ok(
  "includes v20.1 pre-run checks and fail-closed",
  hasEveryLine(combined, [
    "v20.1 pre-run checks",
    "If any check fails: HOLD and do not execute.",
    "Fail-closed policy when context absent",
    "do not execute route",
    "do not retry",
  ])
);

ok(
  "includes required future v20.1 approval phrase",
  combined.includes(
    "FINAL AUTHORIZE v20.1 STEP 2 LIMITED PRIVATE PILOT CONTROLLED STAGING RUN / AUTHENTICATED OWNER ALLOWLIST CONTEXT PRESENT / ROUTE POST /api/ai/chat-user-visible-orchestrate ONLY / EXACTLY ONE RUN / NO RETRY / NO SECOND-RUN / NO RE-ARM / STAGING ONLY / PRIVATE ALLOWLIST ONLY / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN VALUE IN CHAT OR REPO"
  )
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token literal", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["raw generic token assignment", /\btoken\s*[:=]\s*["'][^"']{8,}["']/i],
  ["raw generic secret assignment", /\bsecret\s*[:=]\s*["'][^"']{8,}["']/i],
  ["raw api key assignment", /\bapi[_-]?key\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

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
  "package has test:v20.0 script",
  scripts["test:v20.0"] ===
    "tsx scripts/test-v200-step2-authenticated-allowlist-context-readiness-packet.mts"
);

console.log(`\nDone v20.0 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

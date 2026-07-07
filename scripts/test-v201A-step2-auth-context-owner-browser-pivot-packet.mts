/**
 * v20.1A step2 auth context owner-browser pivot packet validator
 *
 * npm run test:v20.1A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.1A-step2-auth-context-owner-browser-pivot-packet.md";
const EXAMPLE_PATH =
  "docs/examples/v20.1A-step2-auth-context-owner-browser-pivot-packet.example.md";
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

console.log("=== v20.1A Step2 Owner-Browser Auth Context Pivot Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v20.1A packet",
  doc.includes("# v20.1A - Step 2 Auth Context Owner-Browser Pivot Packet") &&
    example.includes("milestone: v20.1A") &&
    example.includes("record_type: step2_auth_context_owner_browser_pivot_packet")
);

ok(
  "includes packet-only no execution boundary",
  hasEveryLine(combined, [
    "STEP 2 AUTH CONTEXT PIVOT TO OWNER-BROWSER RUN PACKET ONLY / NO EXECUTION / NO DEPLOY / NO ONE-RUN",
    "no execution",
    "no deploy",
    "no one-run",
    "no retry",
    "no second-run",
    "no re-arm",
  ])
);

ok(
  "includes continuity and v20.1 hold blocker",
  hasEveryLine(combined, [
    "PASS — controlled owner-only staging trial completed, Step 1 completed",
    "PASS — Step 2 limited private pilot readiness packet closed, no execution",
    "PASS — v20.0 authenticated allowlist context readiness packet closed, no execution",
    "HOLD — missing required authenticated owner token context because NONGA_OWNER_FIREBASE_ID_TOKEN present=false",
    "Step 2 not started",
  ])
);

ok(
  "includes architecture decision statements",
  hasEveryLine(combined, [
    "NONGA_ADMIN_API_TOKEN",
    "server-side secret managed by Secret Manager binding",
    "NONGA_OWNER_FIREBASE_ID_TOKEN is not a permanent server-side secret",
    "auth context should come from authenticated browser/client login session",
    "Server verifies Firebase token",
    "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS",
  ])
);

ok(
  "confirms browser route availability and path",
  hasEveryLine(combined, [
    "POST /api/ai/chat-user-visible-orchestrate",
    "src/services/ai/chat/chatUserVisibleOrchestrateClient.ts",
    "getFirebaseAuthHeaders()",
    "src/hooks/chat/useChat.ts",
    "/chat",
  ])
);

ok(
  "includes server verification path details",
  hasEveryLine(combined, [
    "getServerAuthContext(req)",
    "verifyFirebaseIdToken(token)",
    "evaluateUserVisibleGate(...)",
    "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS",
  ])
);

ok(
  "includes owner-friendly token handling guidance",
  hasEveryLine(combined, [
    "do not paste Firebase token in chat",
    "do not store Firebase ID token as a permanent server secret",
    "use owner browser login/session as auth context",
  ])
);

ok(
  "includes required safe synthetic message",
  combined.includes(
    "อยากดูรถมือสองงบไม่เกิน 300,000 บาท ใช้ขับในเมือง ขอประหยัดน้ำมันและดูแลง่าย"
  )
);

ok(
  "includes v20.2 evidence capture checklist",
  hasEveryLine(combined, [
    "route reached",
    "auth passed",
    "allowlist passed",
    "diagnostics masked",
    "safe response returned",
    "provider/Gemini decision",
    "no real lead",
    "no real dealer action",
    "no PII/phone/plate/VIN",
  ])
);

ok(
  "includes future v20.2 approval phrase draft",
  combined.includes(
    "FINAL AUTHORIZE v20.2 STEP 2 OWNER-BROWSER AUTHENTICATED CONTROLLED STAGING RUN / OWNER LOGGED-IN BROWSER SESSION ONLY / ROUTE POST /api/ai/chat-user-visible-orchestrate ONLY / EXACTLY ONE RUN / NO RETRY / NO SECOND-RUN / NO RE-ARM / STAGING ONLY / PRIVATE ALLOWLIST ONLY / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN VALUE IN CHAT OR REPO"
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
  "package has test:v20.1A script",
  scripts["test:v20.1A"] ===
    "tsx scripts/test-v201A-step2-auth-context-owner-browser-pivot-packet.mts"
);

console.log(`\nDone v20.1A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

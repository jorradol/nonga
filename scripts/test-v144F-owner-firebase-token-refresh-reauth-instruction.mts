/**
 * v14.4F owner Firebase token refresh/re-auth instruction validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.4F
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.4F-owner-firebase-token-refresh-reauth-instruction.md";
const FIXTURE_PATH =
  "docs/examples/v14.4F-owner-firebase-token-refresh-reauth-instruction.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const HELPER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const FIREBASE_HEADERS_PATH = "src/services/auth/firebaseAuthHeaders.ts";
const TOKEN_CHECKER_PATH = "scripts/check-owner-firebase-token-session-env.mts";
const GATE_PATH = "src/config/ownerFirebaseTokenHelperGate.ts";
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

console.log("=== v14.4F Owner Firebase Token Refresh Instruction Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("helper panel exists", existsSync(HELPER_PANEL_PATH));
ok("firebase headers helper exists", existsSync(FIREBASE_HEADERS_PATH));
ok("token checker exists", existsSync(TOKEN_CHECKER_PATH));
ok("helper gate config exists", existsSync(GATE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const helperPanel = read(HELPER_PANEL_PATH);
const firebaseHeaders = read(FIREBASE_HEADERS_PATH);
const checker = read(TOKEN_CHECKER_PATH);
const gate = read(GATE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states static/no-run boundaries",
  /static\/read-only diagnosis \+ safe owner instruction\/docs\/tests\/fixture\/wrapper review only/i.test(
    doc
  ) &&
    /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /live endpoint call by agent: no/i.test(doc)
);

ok(
  "wrapper dispatch approval phrase remains in v14.3A* namespace",
  /FINAL EXECUTION AUTHORIZE v14\.3A[KL] USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN/.test(
    wrapper
  ) &&
    !/FINAL EXECUTION AUTHORIZE v14\.3AJ USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN/.test(
      wrapper
    )
);

ok(
  "wrapper confirms owner token env variable source",
  /process\.env\.NONGA_OWNER_FIREBASE_ID_TOKEN/.test(wrapper)
);

ok(
  "existing helper path can force refresh token",
  /export async function getCurrentUserIdToken\(/.test(firebaseHeaders) &&
    /return user\.getIdToken\(forceRefresh\);/.test(firebaseHeaders) &&
    /getCurrentUserIdToken\(true\)/.test(helperPanel)
);

ok(
  "helper panel copy flow is clipboard-only and masked messaging",
  /navigator\.clipboard\.writeText\(token\)/.test(helperPanel) &&
    /ไม่แสดง token บนหน้าจอ/.test(helperPanel)
);

ok(
  "helper is gate controlled for staging/admin owner use",
  /OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV/.test(gate) &&
    /isStagingEnvironment/.test(gate) &&
    /uid-not-allowlisted/.test(gate)
);

ok(
  "doc provides ordered Step A-D including same-CMD env setup",
  /Step A — Owner re-auth \/ refresh token/.test(doc) &&
    /Step B — Set env in same CMD session/.test(doc) &&
    /Step C — Create fresh approval file for `v14\.3AK`/.test(doc) &&
    /Step D — Run exactly-one-run command/.test(doc) &&
    /set NONGA_OWNER_FIREBASE_ID_TOKEN=<paste-firebase-id-token-from-clipboard>/.test(doc)
);

ok(
  "doc requires checker pass before approval and run",
  /required checker result before proceeding/i.test(doc) &&
    /format: valid-shape/.test(doc) &&
    /READY FOR OWNER USER-VISIBLE FIREBASE AUTH PREFLIGHT/.test(checker)
);

ok(
  "doc forbids token sharing in chat",
  /owner must \*\*not\*\* paste token into chat/i.test(doc) &&
    /do not print token in shared logs\/docs\/tests/i.test(doc)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.4F", root.version === "v14.4F");
  const nextRun = root.nextRun as Record<string, unknown>;
  ok(
    "fixture locks next run id to v14.3AK without retrying AJ",
    nextRun?.selectedRunId === "v14.3AK" && nextRun?.retryV143AJAllowed === false
  );
  ok(
    "fixture final decision is owner re-auth ready",
    root.finalDecision === "READY FOR OWNER RE-AUTH + FRESH APPROVAL v14.3AK DISPATCH RETEST"
  );
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok(
    "package has test:v14.4F script",
    scripts["test:v14.4F"] ===
      "tsx scripts/test-v144F-owner-firebase-token-refresh-reauth-instruction.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.4F token refresh instruction validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

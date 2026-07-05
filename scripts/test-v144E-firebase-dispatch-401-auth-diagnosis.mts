/**
 * v14.4E Firebase dispatch 401 auth diagnosis validator
 * Static checks only. No owner one-run/provider/runtime network execution.
 *
 * npm run test:v14.4E
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.4E-firebase-dispatch-401-auth-diagnosis.md";
const FIXTURE_PATH = "docs/examples/v14.4E-firebase-dispatch-401-auth-diagnosis.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const SERVER_AUTH_PATH = "src/server/serverAuthContext.ts";
const BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const AI_GUARD_PATH = "src/server/security/aiEndpointGuard.ts";
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

console.log("=== v14.4E Firebase Dispatch 401 Auth Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("server auth exists", existsSync(SERVER_AUTH_PATH));
ok("bridge route exists", existsSync(BRIDGE_PATH));
ok("ai guard exists", existsSync(AI_GUARD_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const serverAuth = read(SERVER_AUTH_PATH);
const bridge = read(BRIDGE_PATH);
const aiGuard = read(AI_GUARD_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states no-run/no-retry boundaries",
  /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc) &&
    /live endpoint call by agent: no/i.test(doc)
);

ok(
  "wrapper assembles firebase auth dispatch headers",
  /"Content-Type": "application\/json"/.test(wrapper) &&
    /Authorization: `Bearer \$\{firebaseIdToken\}`/.test(wrapper)
);

ok(
  "wrapper token source is env only and shape-gated",
  /process\.env\.NONGA_OWNER_FIREBASE_ID_TOKEN/.test(wrapper) &&
    /if \(!token\.present\) hold\("same-CMD Firebase ID token missing"\)/.test(wrapper) &&
    /if \(!token\.shapeValid\) hold\("same-CMD Firebase ID token invalid-shape or unsafe"\)/.test(
      wrapper
    ) &&
    !/forceRefresh/i.test(wrapper)
);

ok(
  "wrapper now logs masked 401 diagnostics before hold",
  /dispatchResponseErrorCode=/.test(wrapper) &&
    /dispatchResponseErrorMessageClass=/.test(wrapper) &&
    /dispatchResponseBodyMaskedPreview=/.test(wrapper) &&
    /sanitizePreview/.test(wrapper)
);

ok(
  "wrapper still fail-closed on non-ok response",
  /if \(!response\.ok\)\s*\{[\s\S]*hold\(`dispatch response http-not-ok \(\$\{response\.status\}\)`\);[\s\S]*\}/m.test(
    wrapper
  )
);

ok(
  "server auth produces 401 for missing or invalid firebase token",
  /if \(!token\) throw new ServerAuthError\(401, "Missing Firebase ID token"\);/.test(serverAuth) &&
    /throw new ServerAuthError\(401, "Invalid Firebase ID token"\);/.test(serverAuth)
);

ok(
  "orchestrate route returns ServerAuthError status and message",
  /if \(err instanceof ServerAuthError\)\s*\{\s*res\.status\(err\.status\)\.json\(\{ success: false, message: err\.message \}\);/m.test(
    bridge
  )
);

ok(
  "ai endpoint guard does not emit 401 directly",
  /status:\s*429\s*\|\s*403/.test(aiGuard) && !/res\.status\(401\)/.test(aiGuard)
);

const candidateMissing = JSON.stringify({ success: false, message: "Missing Firebase ID token" }).length;
const candidateInvalid = JSON.stringify({ success: false, message: "Invalid Firebase ID token" }).length;
ok(
  "55-char body length maps to missing/invalid token messages",
  candidateMissing === 55 && candidateInvalid === 55
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
  ok("fixture version is v14.4E", root.version === "v14.4E");
  ok(
    "fixture final decision tracks auth review hold",
    root.finalDecision === "NEED REVIEW — FIREBASE TOKEN STALE / REFRESH PATH UNCLEAR"
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
    "package has test:v14.4E script",
    scripts["test:v14.4E"] === "tsx scripts/test-v144E-firebase-dispatch-401-auth-diagnosis.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.4E auth diagnosis validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

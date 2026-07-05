/**
 * v14.3AE owner Firebase token acquisition prep validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AE
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AE-owner-firebase-token-acquisition-prep.md";
const FIXTURE_PATH =
  "docs/examples/v14.3AE-owner-firebase-token-acquisition.synthetic.json";
const PACKAGE_PATH = "package.json";
const TOKEN_CHECKER_PATH = "scripts/check-owner-firebase-token-session-env.mts";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const OWNER_HELPER_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const FIREBASE_AUTH_HEADER_HELPER_PATH = "src/services/auth/firebaseAuthHeaders.ts";

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

console.log("=== v14.3AE Owner Firebase Token Acquisition Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("token checker exists", existsSync(TOKEN_CHECKER_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("owner helper panel exists", existsSync(OWNER_HELPER_PATH));
ok("firebase auth header helper exists", existsSync(FIREBASE_AUTH_HEADER_HELPER_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const checker = read(TOKEN_CHECKER_PATH);
const wrapper = read(WRAPPER_PATH);
const ownerHelper = read(OWNER_HELPER_PATH);
const firebaseAuthHeaders = read(FIREBASE_AUTH_HEADER_HELPER_PATH);

ok(
  "doc states docs/tests/fixtures static only and no-run policy",
  /docs\/tests\/fixtures\/static \+ owner-local Firebase ID token acquisition prep only/i.test(
    doc
  ) &&
    /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);

ok(
  "doc records previous read-only safe status",
  /lockConsumed=false/.test(doc) &&
    /providerCall=not_run/.test(doc) &&
    /Gemini\/runtime=not_run/.test(doc) &&
    /providerNetwork=not_run/.test(doc) &&
    /tokenExposure=masked-only/.test(doc)
);

ok(
  "doc includes recommended safe token acquisition and disallowed paths",
  /Recommended path for v14\.3AE: \*\*A \(existing helper\), with B as controlled fallback\*\*/.test(
    doc
  ) &&
    /getCurrentUserIdToken\(true\)/.test(doc) &&
    /Disallowed acquisition paths/.test(doc) &&
    /random token scraping from localStorage\/sessionStorage/.test(doc) &&
    /using `NONGA_ADMIN_API_TOKEN` as substitute/.test(doc)
);

ok(
  "doc includes exact owner token-check command and no one-run in this round",
  /cd \/d D:\\nonga/.test(doc) &&
    /set NONGA_OWNER_FIREBASE_ID_TOKEN=<paste-firebase-id-token-here>/.test(doc) &&
    /npm run check:owner-firebase-token-session-env/.test(doc) &&
    /v14\.3AE does not authorize one-run execution/.test(doc)
);

ok(
  "doc final decision is acquisition only",
  /READY FOR OWNER FIREBASE TOKEN ACQUISITION — NO ONE-RUN/.test(doc)
);

ok(
  "existing owner helper copies token without showing raw token",
  /getCurrentUserIdToken\(true\)/.test(ownerHelper) &&
    /navigator\.clipboard\.writeText\(token\)/.test(ownerHelper) &&
    /ไม่แสดง token บนหน้าจอ/.test(ownerHelper)
);

ok(
  "firebase auth helper supports current user token refresh",
  /export async function getCurrentUserIdToken/.test(firebaseAuthHeaders) &&
    /return user\.getIdToken\(forceRefresh\);/.test(firebaseAuthHeaders)
);

ok(
  "token checker and wrapper remain masked-only",
  /token: \$\{result\.masked\}/.test(checker) &&
    /firebaseToken: \*\*\*MASKED\*\*\*/.test(wrapper) &&
    /tokenExposure=masked-only/.test(wrapper)
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
  ok("fixture version is v14.3AE", root.version === "v14.3AE");

  const gate0 = root.gate0RepoSanity as Record<string, unknown>;
  ok(
    "fixture gate0 records clean synchronized repo",
    gate0?.branch === "feature/chat-image-attachment-v1" &&
      gate0?.localHead === "c0f9b5b78792b8b6a9eaad5757bbf6822b15ebc7" &&
      gate0?.originHead === "c0f9b5b78792b8b6a9eaad5757bbf6822b15ebc7" &&
      gate0?.localEqualsOrigin === true &&
      gate0?.workingTreeClean === true &&
      gate0?.decision === "PASS"
  );

  const previous = root.previousReadOnlyStatusCheck as Record<string, unknown>;
  ok(
    "fixture captures previous read-only safe result",
    previous?.lockConsumed === false &&
      previous?.providerCall === "not_run" &&
      previous?.geminiRuntime === "not_run" &&
      previous?.providerNetwork === "not_run" &&
      previous?.runtimeMutation === "not_run" &&
      previous?.tokenExposure === "masked-only"
  );

  const recommendation = root.recommendedTokenAcquisitionMethod as Record<string, unknown>;
  const forbidden = recommendation?.forbidden as unknown[];
  ok(
    "fixture recommendation chooses existing helper with fallback and forbidden paths",
    recommendation?.selected === "A_with_B_fallback" &&
      recommendation?.primary === "existing owner helper panel copy token flow" &&
      recommendation?.fallback ===
        "signed-in DevTools path to getIdToken(true) only when helper not reachable" &&
      Array.isArray(forbidden) &&
      forbidden.includes("admin token substitution")
  );

  const helperStatus = root.helperStatus as Record<string, unknown>;
  ok(
    "fixture records helper status as existing no new helper",
    helperStatus?.existingHelperFound === true &&
      helperStatus?.addedInV143AE === false
  );

  const policy = root.agentExecutionPolicy as Record<string, unknown>;
  ok(
    "fixture confirms no one-run retry second-run by agent",
    policy?.agentRanOneRun === false &&
      policy?.agentRetry === false &&
      policy?.agentSecondRun === false &&
      policy?.agentProviderCall === false &&
      policy?.agentProviderNetworkCall === false
  );

  ok(
    "fixture final decision is owner token acquisition only",
    root.finalDecision === "READY FOR OWNER FIREBASE TOKEN ACQUISITION — NO ONE-RUN"
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
    "package has test:v14.3AE script",
    scripts["test:v14.3AE"] ===
      "tsx scripts/test-v143AE-owner-firebase-token-acquisition.mts"
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

console.log(`\nDone v14.3AE token acquisition validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

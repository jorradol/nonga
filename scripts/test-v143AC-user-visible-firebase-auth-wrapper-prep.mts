/**
 * v14.3AC user-visible Firebase auth wrapper prep validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AC
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AC-user-visible-firebase-auth-wrapper-prep.md";
const FIXTURE_PATH =
  "docs/examples/v14.3AC-user-visible-firebase-auth-wrapper-prep.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const CHECKER_PATH = "scripts/check-owner-firebase-token-session-env.mts";
const PACKAGE_PATH = "package.json";
const GITIGNORE_PATH = ".gitignore";
const LEGACY_WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";

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

console.log("=== v14.3AC User-Visible Firebase Wrapper Prep Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("checker exists", existsSync(CHECKER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("gitignore exists", existsSync(GITIGNORE_PATH));
ok("legacy wrapper exists", existsSync(LEGACY_WRAPPER_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const checker = read(CHECKER_PATH);
const packageRaw = read(PACKAGE_PATH);
const gitignore = read(GITIGNORE_PATH);
const legacyWrapper = read(LEGACY_WRAPPER_PATH);

ok(
  "doc states execution boundaries and no-run policy",
  /docs\/tests\/fixtures\/static \+ controlled Firebase-auth owner-local wrapper prep only/i.test(
    doc
  ) &&
    /one-run execution by agent: no/i.test(doc) &&
    /no retry/i.test(doc) &&
    /no second run/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);

ok(
  "doc confirms auth model separation and no admin token bridging",
  /admin token command เดิมยังอยู่/i.test(doc) &&
    /Firebase user-visible command ใหม่แยก auth model/i.test(doc) &&
    /ไม่มีการเอา admin token ไปใช้กับ Firebase route/i.test(doc)
);

ok(
  "doc includes approval phrase and approval file",
  /FINAL EXECUTION AUTHORIZE v14\.3AC USER-VISIBLE FIREBASE SAME-CMD EXACTLY-ONE-RUN/.test(doc) &&
    /v14\.3AC-user-visible-local-approval\.txt/.test(doc)
);

ok(
  "doc includes required owner command block with checker",
  /set NONGA_OWNER_FIREBASE_ID_TOKEN=<paste-firebase-id-token-here>/i.test(doc) &&
    /npm run check:owner-firebase-token-session-env/i.test(doc) &&
    /npm run owner-local-one-run:v14\.3AC:user-visible/.test(doc)
);

ok(
  "doc includes expected controlled preflight output markers",
  /owner-local-user-visible-one-run-gate-v143ac/.test(doc) &&
    /authModel=firebase-id-token/.test(doc) &&
    /targetPath=\/api\/ai\/chat-user-visible-orchestrate/.test(doc) &&
    /runtimeAdapterPolicy=user-visible-firebase-auth-preflight/.test(doc) &&
    /providerCall=not_run/.test(doc) &&
    /providerNetwork=not_run/.test(doc) &&
    /HOLD — user-visible Firebase auth adapter reached controlled preflight/.test(doc)
);

ok(
  "checker is masked-only and validates firebase token shape",
  /NONGA_OWNER_FIREBASE_ID_TOKEN/.test(checker) &&
    /format: \${result\.format}/.test(checker) &&
    /jwtThreeSegments/.test(checker) &&
    /token: \${result\.masked}/.test(checker) &&
    /READY FOR OWNER USER-VISIBLE FIREBASE AUTH PREFLIGHT/.test(checker) &&
    !/fetch\s*\(/.test(checker)
);

ok(
  "wrapper is fail-closed preflight with exact command and lock controls",
  /unexpected arguments detected; exact command only/.test(wrapper) &&
    /fresh owner approval text mismatch/.test(wrapper) &&
    /approval file is not fresh enough/.test(wrapper) &&
    /one-run already consumed \(retry\/second-run blocked\)/.test(wrapper) &&
    /authModel=firebase-id-token/.test(wrapper) &&
    /targetPath=\/api\/ai\/chat-user-visible-orchestrate/.test(wrapper) &&
    /providerCall=not_run/.test(wrapper) &&
    /Gemini\/runtime=not_run/.test(wrapper) &&
    /providerNetwork=not_run/.test(wrapper) &&
    /tokenExposure=masked-only/.test(wrapper)
);

ok(
  "wrapper rejects admin token use on firebase route",
  /admin token must not be used for user-visible Firebase auth route/.test(wrapper)
);

ok(
  "legacy admin-token wrapper remains in repository",
  /NONGA_ADMIN_API_TOKEN/.test(legacyWrapper) &&
    /owner-local-one-run-gate-v143u/.test(legacyWrapper)
);

ok(
  "gitignore covers approval artifacts and v143ac lock",
  /v14\.\*-local-approval\.txt/.test(gitignore) &&
    /\.nonga-owner-local-one-run-v143ac-user-visible\.lock\.json/.test(gitignore)
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
  ok("fixture version is v14.3AC", root.version === "v14.3AC");

  const gate0 = (root.gates as Record<string, unknown>)?.gate0RepoSanity as Record<
    string,
    unknown
  >;
  ok(
    "fixture gate0 records clean synchronized repo",
    gate0?.branch === "feature/chat-image-attachment-v1" &&
      gate0?.localHead === "aa20f84ed5e4eefe1ae0921830222f00c552588c" &&
      gate0?.originHead === "aa20f84ed5e4eefe1ae0921830222f00c552588c" &&
      gate0?.localEqualsOrigin === true &&
      gate0?.workingTreeClean === true &&
      gate0?.decision === "PASS"
  );

  const separation = root.authModelSeparation as Record<string, unknown>;
  ok(
    "fixture captures auth model separation",
    separation?.legacyAdminCommandRetained === true &&
      separation?.newFirebaseCommandCreated === true &&
      separation?.adminTokenOnFirebaseRouteForbidden === true
  );

  const preflight = root.preflightExpectedOutput as Record<string, unknown>;
  ok(
    "fixture records controlled preflight no-run status",
    preflight?.providerCall === "not_run" &&
      preflight?.geminiRuntime === "not_run" &&
      preflight?.providerNetwork === "not_run" &&
      preflight?.deploy === "not_run" &&
      preflight?.runtimeMutation === "not_run" &&
      preflight?.holdReason ===
        "HOLD — user-visible Firebase auth adapter reached controlled preflight"
  );

  const policy = root.agentExecutionPolicy as Record<string, unknown>;
  ok(
    "fixture confirms no one-run/retry/second-run by agent",
    policy?.agentRanOneRun === false &&
      policy?.agentRetry === false &&
      policy?.agentSecondRun === false &&
      policy?.agentProviderCall === false &&
      policy?.agentProviderNetworkCall === false
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
    "package has v14.3AC test script",
    scripts["test:v14.3AC"] ===
      "tsx scripts/test-v143AC-user-visible-firebase-auth-wrapper-prep.mts"
  );
  ok(
    "package has user-visible one-run command",
    scripts["owner-local-one-run:v14.3AC:user-visible"] ===
      "tsx scripts/owner-local-user-visible-one-run-gate-v143ac.mts"
  );
  ok(
    "package has owner firebase checker command",
    scripts["check:owner-firebase-token-session-env"] ===
      "npm exec tsx scripts/check-owner-firebase-token-session-env.mts"
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

console.log(`\nDone v14.3AC wrapper prep validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

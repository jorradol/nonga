/**
 * v14.3AB provider path mapping decision validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AB
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AB-provider-path-mapping-decision-packet.md";
const FIXTURE_PATH = "docs/examples/v14.3AB-provider-path-mapping-decision.synthetic.json";
const PACKAGE_PATH = "package.json";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";
const ADMIN_ROUTE_PATH = "src/services/ai/salesBrainServerShadowSmoke.ts";
const USER_VISIBLE_ROUTE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const AUTH_CONTEXT_PATH = "src/server/serverAuthContext.ts";
const API_AUTH_PATH = "src/server/apiAuth.ts";
const USER_VISIBLE_PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";

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

console.log("=== v14.3AB Provider Path Mapping Decision Validation ===\n");

ok("v14.3AB doc exists", existsSync(DOC_PATH));
ok("v14.3AB fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("admin route file exists", existsSync(ADMIN_ROUTE_PATH));
ok("user-visible route file exists", existsSync(USER_VISIBLE_ROUTE_PATH));
ok("server auth context exists", existsSync(AUTH_CONTEXT_PATH));
ok("api auth file exists", existsSync(API_AUTH_PATH));
ok("user-visible provider file exists", existsSync(USER_VISIBLE_PROVIDER_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const wrapper = read(WRAPPER_PATH);
const adminRoute = read(ADMIN_ROUTE_PATH);
const userVisibleRoute = read(USER_VISIBLE_ROUTE_PATH);
const authContext = read(AUTH_CONTEXT_PATH);
const apiAuth = read(API_AUTH_PATH);
const userVisibleProvider = read(USER_VISIBLE_PROVIDER_PATH);

ok(
  "doc includes execution type and strict no-run boundary",
  /one-run execution by agent: no/.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/.test(doc) &&
    /provider network call by agent: no/.test(doc) &&
    /deploy by agent: no/.test(doc)
);
ok(
  "doc includes previous v14.3AA decision and gate 0 pass",
  /NEED REVIEW — EXISTING PROVIDER PATH NOT SAFELY MAPPED/.test(doc) &&
    /Gate 0 decision:\s*`PASS`/.test(doc) &&
    /94afaedc98aec58c5977c17d3778aa8616782d2f/.test(doc)
);
ok(
  "doc includes option A and B route and auth mapping",
  /\/api\/admin\/sales-brain-shadow-smoke/.test(doc) &&
    /\/api\/ai\/chat-user-visible-orchestrate/.test(doc) &&
    /NONGA_ADMIN_API_TOKEN/.test(doc) &&
    /Firebase ID token/.test(doc) &&
    /getServerAuthContext/.test(doc)
);
ok(
  "doc states mismatch and owner decision recommendation",
  /safe bridge \*\*does not currently exist\*\*/i.test(doc) &&
    /NEED OWNER DECISION — AUTH MODEL TRADEOFF NOT SAFE TO CHOOSE AUTOMATICALLY/.test(doc)
);
ok(
  "doc final decision is ready for owner decision",
  /READY FOR OWNER DECISION — CHOOSE ADMIN-SHADOW OR USER-VISIBLE PROVIDER PATH/.test(doc)
);

ok(
  "wrapper remains admin-token preflight only and fail-closed",
  /NONGA_ADMIN_API_TOKEN/.test(wrapper) &&
    /runtimeAdapter=entered/.test(wrapper) &&
    /providerCall=not_run/.test(wrapper) &&
    /providerNetwork=not_run/.test(wrapper) &&
    /runtime adapter reached under controlled preflight/.test(wrapper)
);
ok(
  "wrapper has no manual provider endpoint call literals",
  !/\/api\/admin\/sales-brain-shadow-smoke/.test(wrapper) &&
    !/\/api\/ai\/chat-user-visible-orchestrate/.test(wrapper) &&
    !/fetch\s*\(/.test(wrapper) &&
    !/https?:\/\//.test(wrapper)
);

ok(
  "admin route source confirms admin-shadow endpoint and real provider marker",
  /SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE/.test(adminRoute) &&
    /\/api\/admin\/sales-brain-shadow-smoke/.test(adminRoute) &&
    /real_provider_call_ok/.test(adminRoute)
);
ok(
  "user-visible route source confirms firebase auth context and runtime markers",
  /SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE/.test(userVisibleRoute) &&
    /\/api\/ai\/chat-user-visible-orchestrate/.test(userVisibleRoute) &&
    /getServerAuthContext/.test(userVisibleRoute) &&
    /pilotPathActive/.test(userVisibleRoute) &&
    /fallbackToLegacy/.test(userVisibleRoute) &&
    /allowlistMatch/.test(userVisibleRoute)
);
ok(
  "server auth context enforces firebase id token",
  /Missing Firebase ID token/.test(authContext) &&
    /verifyFirebaseIdToken/.test(authContext) &&
    /getServerAuthContext/.test(authContext)
);
ok(
  "api auth confirms admin token model for admin route",
  /function adminApiAuth/.test(apiAuth) &&
    /NONGA_ADMIN_API_TOKEN/.test(apiAuth)
);
ok(
  "user-visible provider contains guard policy and thai ux markers",
  /guardPolicyVersion/.test(userVisibleRoute) &&
    /leadPiiCueGuardActive/.test(userVisibleRoute) &&
    /phoneEchoGuardActive/.test(userVisibleRoute) &&
    /safeConfirmationStepWordingActive/.test(userVisibleRoute) &&
    /real_provider_call_ok/.test(userVisibleProvider)
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
  ok("fixture version is v14.3AB", root.version === "v14.3AB");

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches expected starting point",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "94afaedc98aec58c5977c17d3778aa8616782d2f" &&
      baseline?.originHead === "94afaedc98aec58c5977c17d3778aa8616782d2f" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const mapping = root.pathMapping as Record<string, unknown>;
  const optionA = mapping?.optionA as Record<string, unknown>;
  const optionB = mapping?.optionB as Record<string, unknown>;
  ok(
    "fixture records Option A/B mapping and mismatch",
    optionA?.route === "/api/admin/sales-brain-shadow-smoke" &&
      optionA?.authModel === "NONGA_ADMIN_API_TOKEN" &&
      optionB?.route === "/api/ai/chat-user-visible-orchestrate" &&
      optionB?.authModel === "Firebase ID token via getServerAuthContext" &&
      mapping?.authModelMismatchDetected === true &&
      mapping?.safeBridgeExistsWithoutAuthModelChange === false &&
      mapping?.manualEndpointGuessUsed === false
  );

  const recommendation = root.recommendation as Record<string, unknown>;
  ok(
    "fixture recommendation is owner decision",
    recommendation?.decision ===
      "NEED OWNER DECISION — AUTH MODEL TRADEOFF NOT SAFE TO CHOOSE AUTOMATICALLY" &&
      recommendation?.ownerQuestionMaxTwoOptions === true &&
      Array.isArray(recommendation?.ownerChoices) &&
      (recommendation.ownerChoices as unknown[]).length === 2
  );

  const patchPolicy = root.patchPolicyCompliance as Record<string, unknown>;
  ok(
    "fixture confirms docs/tests static only patch policy",
    patchPolicy?.docsTestsStaticOnly === true &&
      patchPolicy?.providerDispatchEnabled === false &&
      patchPolicy?.runtimeConfigMutation === false &&
      patchPolicy?.deploy === false &&
      patchPolicy?.publicRouteActivation === false &&
      patchPolicy?.buyerFacingRelease === false
  );

  const agentPolicy = root.agentExecutionPolicy as Record<string, unknown>;
  ok(
    "fixture confirms no-run no-retry no-second-run",
    agentPolicy?.agentRanOneRun === false &&
      agentPolicy?.agentRetry === false &&
      agentPolicy?.agentSecondRun === false &&
      agentPolicy?.agentProviderCall === false &&
      agentPolicy?.agentGeminiCall === false &&
      agentPolicy?.agentProviderNetworkCall === false
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  ok(
    "fixture includes required owner decision enum",
    finalEnum.includes(
      "READY FOR OWNER DECISION — CHOOSE ADMIN-SHADOW OR USER-VISIBLE PROVIDER PATH"
    )
  );
  ok(
    "fixture final decision is ready for owner decision",
    root.finalDecision ===
      "READY FOR OWNER DECISION — CHOOSE ADMIN-SHADOW OR USER-VISIBLE PROVIDER PATH"
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
    "package has test:v14.3AB script",
    scripts["test:v14.3AB"] === "tsx scripts/test-v143AB-provider-path-mapping-decision.mts"
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

console.log(`\nDone v14.3AB provider path mapping validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

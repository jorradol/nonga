/**
 * v14.4J user-visible Firebase dispatch PASS evidence closure validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.4J
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.4J-user-visible-firebase-dispatch-pass-evidence-closure.md";
const FIXTURE_PATH =
  "docs/examples/v14.4J-user-visible-firebase-dispatch-pass-evidence-closure.synthetic.json";
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

console.log("=== v14.4J User-Visible Firebase Dispatch PASS Evidence Closure Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc records v14.3AL PASS evidence fields",
  /source owner run: `v14\.3AL`/i.test(doc) &&
    /dispatchHttpStatus=200/.test(doc) &&
    /providerCall=run/.test(doc) &&
    /Gemini\/runtime=run/.test(doc) &&
    /providerNetwork=true/.test(doc) &&
    /fallbackToLegacy=false/.test(doc) &&
    /skipGemini=false/.test(doc) &&
    /gateReason=real_provider_call_ok/.test(doc) &&
    /pilotPathActive=true/.test(doc) &&
    /allowlistMatch=true/.test(doc) &&
    /userVisibleEnabled=true/.test(doc) &&
    /guardPolicyVersion=present/.test(doc) &&
    /leadPiiCueGuardActive=true/.test(doc) &&
    /phoneEchoGuardActive=true/.test(doc) &&
    /safeConfirmationStepWordingActive=true/.test(doc) &&
    /tokenExposure=masked-only/.test(doc) &&
    /PASS — user-visible Firebase dispatch evidence captured/.test(doc)
);

ok(
  "doc includes no-run and no-network-by-agent boundaries",
  /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second-run by agent: no/i.test(doc) &&
    /live endpoint call by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime network call by agent: no/i.test(doc) &&
    /deploy by agent: no/i.test(doc)
);

ok(
  "doc closure and next milestone are documented",
  /v14\.4 Dispatch Evidence = PASS \/ CLOSED/.test(doc) &&
    /v14\.5 Thai UX Real Answer Final Review/.test(doc)
);

ok(
  "doc has consumed run history for AJ AK AL",
  /v14\.3AJ/.test(doc) && /401/.test(doc) && /v14\.3AK/.test(doc) && /owner_controlled_zone_not_allowed/.test(doc) &&
    /v14\.3AL/.test(doc) && /PASS/.test(doc)
);

ok(
  "doc does not instruct rerun v14.3AL",
  !/rerun v14\.3AL/i.test(doc) &&
    !/run v14\.3AL again/i.test(doc)
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
  ok("fixture version is v14.4J", root.version === "v14.4J");
  ok("fixture source owner run is v14.3AL", root.sourceOwnerRun === "v14.3AL");
  ok("fixture has expected closure decision", root.closureDecision === "v14.4 Dispatch Evidence = PASS / CLOSED");
  ok("fixture has expected next milestone", root.nextMilestone === "v14.5 Thai UX Real Answer Final Review");
  ok("fixture token/secret/pii exposure fields are safe", root.tokenExposure === "masked-only" && root.secretExposure === "none" && root.piiExposure === "none");

  const noRun = root.noRunControls as Record<string, unknown>;
  ok(
    "fixture no-run controls are all false",
    noRun?.oneRunByAgent === false &&
      noRun?.retryByAgent === false &&
      noRun?.secondRunByAgent === false &&
      noRun?.liveEndpointCallByAgent === false &&
      noRun?.providerGeminiRuntimeNetworkCallByAgent === false &&
      noRun?.deployByAgent === false
  );

  const ev = root.sanitizedEvidence as Record<string, unknown>;
  ok(
    "fixture includes sanitized pass evidence fields",
    ev?.dispatchHttpStatus === 200 &&
      ev?.providerCall === "run" &&
      ev?.geminiRuntime === "run" &&
      ev?.providerNetwork === true &&
      ev?.fallbackToLegacy === false &&
      ev?.skipGemini === false &&
      ev?.gateReason === "real_provider_call_ok" &&
      ev?.pilotPathActive === true &&
      ev?.allowlistMatch === true &&
      ev?.userVisibleEnabled === true &&
      ev?.guardPolicyVersion === "present" &&
      ev?.leadPiiCueGuardActive === true &&
      ev?.phoneEchoGuardActive === true &&
      ev?.safeConfirmationStepWordingActive === true &&
      ev?.firebaseToken === "***MASKED***"
  );

  const consumed = root.consumedRunHistory as Record<string, unknown>;
  const aj = consumed?.["v14.3AJ"] as Record<string, unknown>;
  const ak = consumed?.["v14.3AK"] as Record<string, unknown>;
  const al = consumed?.["v14.3AL"] as Record<string, unknown>;
  ok(
    "fixture consumed run history includes AJ AK AL no retry",
    aj?.status === "consumed" &&
      aj?.retryAllowed === false &&
      ak?.status === "consumed" &&
      ak?.retryAllowed === false &&
      al?.status === "consumed" &&
      al?.retryAllowed === false
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
    "package has test:v14.4J script",
    scripts["test:v14.4J"] ===
      "tsx scripts/test-v144J-user-visible-firebase-dispatch-pass-evidence-closure.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.4J PASS evidence closure validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

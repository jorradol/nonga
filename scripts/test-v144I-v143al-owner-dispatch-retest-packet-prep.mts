/**
 * v14.4I v14.3AL owner dispatch retest packet prep validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.4I
 */
import { existsSync, readFileSync } from "node:fs";
import { detectOwnerControlledGeminiUxZone } from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const DOC_PATH = "docs/v14.4I-v143al-owner-dispatch-retest-packet-prep.md";
const FIXTURE_PATH =
  "docs/examples/v14.4I-v143al-owner-dispatch-retest-packet-prep.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const CHECKER_PATH = "scripts/check-owner-firebase-token-session-env.mts";
const PACKAGE_PATH = "package.json";

const ZONE_ALLOWED_WRAPPER_PROMPT =
  "ลูกค้าทดลองถามแบบไม่มีข้อมูลจริง: ช่วยเปรียบเทียบคันที่ 1 กับ 2 แบบสุภาพสำหรับครอบครัวหน่อยครับ";
const REQUIRED_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3AL USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN";

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

console.log("=== v14.4I v14.3AL Owner Dispatch Retest Packet Prep Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("checker exists", existsSync(CHECKER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const checker = read(CHECKER_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states static no-run boundaries",
  /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /live endpoint call by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime network call by agent: no/i.test(doc)
);

ok(
  "wrapper approval phrase rotated to v14.3AL only",
  wrapper.includes(REQUIRED_APPROVAL_TEXT) &&
    !/FINAL EXECUTION AUTHORIZE v14\.3AJ USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN/.test(
      wrapper
    ) &&
    !/FINAL EXECUTION AUTHORIZE v14\.3AK USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN/.test(
      wrapper
    )
);

ok(
  "wrapper keeps token source route and firebase bearer header",
  /process\.env\.NONGA_OWNER_FIREBASE_ID_TOKEN/.test(wrapper) &&
    /const TARGET_PATH = "\/api\/ai\/chat-user-visible-orchestrate";/.test(wrapper) &&
    /Authorization: `Bearer \$\{firebaseIdToken\}`/.test(wrapper)
);

ok(
  "wrapper synthetic prompt remains owner zone compatible",
  wrapper.includes(ZONE_ALLOWED_WRAPPER_PROMPT) &&
    detectOwnerControlledGeminiUxZone(ZONE_ALLOWED_WRAPPER_PROMPT) === "compare_car_types"
);

ok(
  "doc includes required Step A-D sequence for v14.3AL",
  /Step A — owner re-auth \/ token refresh/.test(doc) &&
    /Step B — same CMD env setup/.test(doc) &&
    /Step C — fresh approval file/.test(doc) &&
    /Step D — exactly-one-run command/.test(doc) &&
    /v14\.3AL-user-visible-dispatch-local-approval\.txt/.test(doc)
);

ok(
  "doc includes required same-CMD token check command and output",
  /set NONGA_OWNER_FIREBASE_ID_TOKEN=<paste-firebase-id-token-from-clipboard>/.test(doc) &&
    /npm run check:owner-firebase-token-session-env/.test(doc) &&
    /format: valid-shape/.test(doc) &&
    /READY FOR OWNER USER-VISIBLE FIREBASE AUTH PREFLIGHT/.test(checker)
);

ok(
  "doc includes expected success evidence checklist",
  /dispatchHttpStatus=200/.test(doc) &&
    /pilotPathActive=true/.test(doc) &&
    /fallbackToLegacy=false/.test(doc) &&
    /skipGemini=false/.test(doc) &&
    /providerNetwork=true/.test(doc) &&
    /gateReason=real_provider_call_ok/.test(doc) &&
    /carCardCount=2/.test(doc) &&
    /serverRecentCarCardsCount=2/.test(doc) &&
    /runtimeMode=high/.test(doc) &&
    /userVisibleEnabled=true/.test(doc) &&
    /allowlistMatch=true/.test(doc)
);

ok(
  "doc defines HOLD or FAIL immediate stop policy",
  /If owner sees `HOLD` or `FAIL`/.test(doc) &&
    /stop immediately/.test(doc) &&
    /do not retry/.test(doc) &&
    /do not run second attempt/.test(doc) &&
    /do not delete lock files/.test(doc) &&
    /sanitized output only/.test(doc)
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
  ok("fixture version is v14.4I", root.version === "v14.4I");
  const consumed = root.consumedRunIds as Record<string, unknown>;
  ok(
    "fixture marks AJ and AK consumed with no retry",
    consumed?.v143ajConsumed === true &&
      consumed?.v143akConsumed === true &&
      consumed?.retryV143ajAllowed === false &&
      consumed?.retryV143akAllowed === false
  );
  const nextRun = root.nextRunPolicy as Record<string, unknown>;
  ok(
    "fixture locks next run to v14.3AL phrase",
    nextRun?.selectedRunId === "v14.3AL" && nextRun?.approvalPhrase === REQUIRED_APPROVAL_TEXT
  );
  ok(
    "fixture final decision is owner ready for v14.3AL retest",
    root.finalDecision === "READY FOR OWNER RE-AUTH + FRESH APPROVAL v14.3AL DISPATCH RETEST"
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
    "package has test:v14.4I script",
    scripts["test:v14.4I"] === "tsx scripts/test-v144I-v143al-owner-dispatch-retest-packet-prep.mts"
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

console.log(`\nDone v14.4I packet prep validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

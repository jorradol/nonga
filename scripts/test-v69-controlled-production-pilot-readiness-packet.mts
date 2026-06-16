/**
 * v6.9 — Controlled Production Pilot Readiness Packet (static validation only)
 * npm run test:v69-controlled-production-pilot-readiness-packet
 *
 * No fetch, no Gemini SDK invoke, no paid API, no gcloud execution, no production touch.
 */
import { readFileSync } from "node:fs";
import {
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  USER_VISIBLE_STRUCTURED_OUTPUT_FIELD,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  evaluateUserVisibleGate,
  parseUserVisibleAllowlistUids,
} from "../src/services/ai/salesBrainUserVisibleGate.ts";

const DOC_PATH =
  "docs/v6.9-controlled-production-pilot-readiness-packet.md";
const V68E9_RECORD =
  "docs/v6.8E.9-structured-output-contract-staging-smoke-execution-record.md";
const V65H_DOC = "docs/v6.5H-production-pilot-approval-packet.md";
const V65D_DOC = "docs/v6.5D-production-incident-rollback-playbook-packet.md";
const HEAD_SHA = "151dd1b9a48f2250caf11a9e90d4b85a621313eb";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
];

const AUTO_EXEC_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+deploy\s+production/i,
  /v6\.9\s+approves\s+production\s+pilot\s+automatically/i,
  /v6\.9\s+authorizes\s+production\s+pilot\s+start/i,
  /production\s+pilot\s+is\s+approved/i,
  /execution\s+allowed\s+by\s+v6\.9\?\s*=\s*yes/i,
  /approval\s+captured\s+by\s+v6\.9\?\s*=\s*yes/i,
  /production\s+pilot\s+may\s+start\s+from\s+v6\.9\s+alone.*yes/i,
];

const FULL_UID_PATTERNS = [
  /\b[A-Za-z0-9]{28}\b/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.9 Controlled Production Pilot Readiness Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v68e9Record = readFileSync(V68E9_RECORD, "utf8");
const pkg = readFileSync("package.json", "utf8");
const gateSrc = readFileSync(
  "src/services/ai/salesBrainUserVisibleGate.ts",
  "utf8"
);
const flagsSrc = readFileSync(
  "src/services/ai/salesBrainRuntimeFlags.ts",
  "utf8"
);
const realProviderSrc = readFileSync(
  "src/services/ai/salesBrainUserVisibleRealProvider.ts",
  "utf8"
);

// --- doc structure ---
ok("doc exists", doc.length > 2000);
ok("doc v6.9 label", doc.includes("v6.9"));
ok("doc controlled production pilot", /controlled production pilot/i.test(doc));
ok("head sha", doc.includes(HEAD_SHA) || doc.includes("151dd1b"));
ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
ok("baseline section", doc.includes("## 1. Baseline"));
ok("evidence section", /Evidence Already Passed/i.test(doc));
ok("gates matrix section", /Readiness Gates Matrix/i.test(doc));
ok("gates passed section", /Gates Passed/i.test(doc));
ok("owner approval section", /Gates Still Requiring Owner Approval/i.test(doc));
ok("decisions pending section", /Decisions Pending Before Pilot/i.test(doc));
ok("recommended scope section", /Recommended Controlled Pilot Scope/i.test(doc));
ok("phased plan section", /v6\.9 Controlled Plan/i.test(doc));
ok("pre-pilot smoke section", /Pre-Pilot Smoke Checklist/i.test(doc));
ok("rollback triggers section", /Rollback.*Stop Triggers/i.test(doc));
ok("monitoring section", /Monitoring.*Incident Response/i.test(doc));
ok("forbidden actions section", /Forbidden Actions/i.test(doc));
ok("explicit readiness statement", /Explicit Readiness Statement/i.test(doc));
ok("non-authorization clause", /Non-Authorization Clause/i.test(doc));

// --- v6.8E.9 evidence carry-forward ---
ok("v6.8E.9 reference", doc.includes("v6.8E.9"));
ok("finalAnswerTh evidence", doc.includes("finalAnswerTh"));
ok("real gemini 7/7 evidence", doc.includes("7/7"));
ok("summarize fit gk recovery", /summarize.*fit.*general knowledge|Summarize.*fit.*GK/i.test(doc));
ok("negative gates pass reference", /negative gates.*PASS|Negative gates.*PASS/i.test(doc));
ok("rollback readiness reference", /rollback readiness.*PASS|Rollback readiness/i.test(doc));
ok("production not touched", /production.*not touched|Production.*Not touched/i.test(doc));
ok("safe flags restored", /safe flags restored|kill switch.*ON/i.test(doc));
ok("v68e9 record exists", v68e9Record.length > 500);
ok("v68e9 record PASS", /PASS.*7\/7|7\/7.*PASS/i.test(v68e9Record));

// --- readiness gates coverage ---
ok("gate kill switch", /kill switch/i.test(doc));
ok("gate real provider flag", /real provider flag/i.test(doc));
ok("gate allowlist-only", /allowlist/i.test(doc));
ok("gate daily budget cap", /daily budget cap|budget cap/i.test(doc));
ok("gate fallback fail-closed", /fail-closed|fail closed/i.test(doc));
ok("gate no json leak", /no json leak|JSON leak/i.test(doc));
ok("gate no meta leak", /meta leak/i.test(doc));
ok("gate finance forbidden", /finance forbidden/i.test(doc));
ok("gate ev speculation", /ev speculation|EV speculation/i.test(doc));
ok("gate no raw prompt logging", /raw prompt|full gemini output/i.test(doc));
ok("gate no secret pii", /secret.*token|PII exposure/i.test(doc));
ok("gate rollback path", /rollback path/i.test(doc));
ok("gate monitoring incident", /monitoring.*incident|incident response/i.test(doc));
ok("gate owner approval", /owner approval/i.test(doc));

// --- decisions pending ---
ok("decision pilot cohort", /pilot cohort|who\?/i.test(doc));
ok("decision allowlisted uid", /allowlisted uid/i.test(doc));
ok("decision daily budget", /daily budget/i.test(doc));
ok("decision smoke checklist", /smoke checklist/i.test(doc));
ok("decision rollback trigger", /rollback trigger/i.test(doc));
ok("decision operator admin", /operator|admin during pilot/i.test(doc));
ok("decision thor auto", /Thor Auto/i.test(doc));

// --- phased plan ---
ok("phase readiness doc", /Phase.*A|readiness doc/i.test(doc));
ok("phase approval", /approval record|Phase B/i.test(doc));
ok("phase staging re-check", /staging re-check|Phase C/i.test(doc));
ok("phase production pilot plan", /production pilot plan|Phase D/i.test(doc));
ok("phase deploy approval separate", /deploy approval.*separate|Phase E/i.test(doc));
ok("phase post-deploy smoke", /post-deploy smoke|Phase F/i.test(doc));
ok("phase execution record", /execution record|Phase G/i.test(doc));

// --- explicit readiness verdict ---
ok("NOT READY statement", /NOT READY/i.test(doc));
ok("ready-with-approval statement", /READY-WITH-APPROVAL|Ready-with-approval/i.test(doc));
ok("approval captured no", /Approval Captured by v6\.9\?\s*=\s*No|Approval Captured by v6\.9\?\*\* \| \*\*No/i.test(doc));
ok("execution allowed no", /Execution Allowed by v6\.9\?\s*=\s*No|Execution Allowed by v6\.9\?\*\* \| \*\*No/i.test(doc));
ok("no production pilot start from v6.9", /Production Pilot Started by v6\.9\?\s*=\s*No|may start from v6\.9 alone.*\*\*NO\*\*/i.test(doc));
ok("forbidden deploy production", /Deploy production.*forbidden|forbidden.*deploy production/i.test(docLower));
ok("forbidden env secrets", /env\/secrets.*forbidden|forbidden.*env/i.test(docLower));
ok("forbidden firestore write", /firestore write.*forbidden|forbidden.*firestore/i.test(docLower));

// --- no auto-approval language ---
for (const pattern of AUTO_EXEC_AUTH_PATTERNS) {
  ok(`no auto-exec auth ${pattern}`, !pattern.test(doc));
}

// --- privacy / secrets in doc ---
for (const pattern of SECRET_VALUE_PATTERNS) {
  ok(`no secret pattern in doc ${pattern}`, !pattern.test(doc));
}
ok("uid redacted only", doc.includes("X7hg...Zw2"));
for (const pattern of FULL_UID_PATTERNS) {
  const matches = doc.match(new RegExp(pattern, "g")) ?? [];
  const suspicious = matches.filter((m) => m.length >= 28 && !m.includes("151dd1b"));
  ok(`no full firebase uid ${pattern}`, suspicious.length === 0);
}
ok(
  "no raw full gemini output in doc",
  !/"finalAnswerTh"\s*:\s*"[\s\S]{150,}/.test(doc)
);
ok(
  "no full prompt dump",
  !docLower.includes("system instruction:") &&
    !docLower.includes("combined prompt:")
);

// --- cross-doc references ---
ok("v65h reference", doc.includes("v6.5H") || readFileSync(V65H_DOC, "utf8").length > 0);
ok("v65d reference", doc.includes("v6.5D") || readFileSync(V65D_DOC, "utf8").length > 0);

// --- code alignment (static, no network) ---
ok(
  "production real provider forbidden",
  isProductionRealProviderForbidden("production") === true
);
ok(
  "structured output field finalAnswerTh",
  USER_VISIBLE_STRUCTURED_OUTPUT_FIELD === "finalAnswerTh"
);
ok(
  "quality slice v6.8E.9",
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.9"
);
ok(
  "kill switch env constant",
  flagsSrc.includes(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV)
);
ok(
  "allowlist env constant",
  gateSrc.includes(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV)
);
ok(
  "budget env constant",
  gateSrc.includes(NONGA_AI_BUDGET_DAILY_LIMIT_ENV)
);
ok(
  "real provider env constant",
  realProviderSrc.includes(NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV)
);
ok(
  "user visible env constant",
  flagsSrc.includes(NONGA_AI_USER_VISIBLE_ENABLED_ENV)
);
ok(
  "empty allowlist denies all",
  parseUserVisibleAllowlistUids("").length === 0 &&
    parseUserVisibleAllowlistUids(undefined).length === 0
);
ok(
  "finance forbidden guard in real provider",
  realProviderSrc.includes("finance_forbidden_phrase")
);
ok(
  "meta leak guard in real provider",
  realProviderSrc.includes("meta_instruction_leak")
);
ok(
  "ev speculation guard in real provider",
  realProviderSrc.includes("unsourced_ev_speculation")
);
ok(
  "structured json responseMimeType",
  realProviderSrc.includes('responseMimeType: "application/json"')
);

// --- gate evaluation smoke (offline) ---
{
  const stagingBase: Record<string, string> = {
    NONGA_AI_PROVIDER: "gemini",
    NONGA_AI_MODE: "high",
    NONGA_AI_FIRST_ENABLED: "true",
    [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "10",
    NONGA_AI_BUDGET_MONTHLY_LIMIT: "50",
  };

  const killSwitchOn = evaluateUserVisibleGate({
    firebaseUid: "test-allowlisted-uid",
    environment: "staging",
    env: {
      ...stagingBase,
      [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
      [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: "test-allowlisted-uid",
    },
  });
  ok(
    "kill switch blocks user-visible path",
    !killSwitchOn.effectiveUserVisibleAllowed &&
      killSwitchOn.blockedReason === "emergency_kill_switch"
  );

  const nonAllowlisted = evaluateUserVisibleGate({
    firebaseUid: "not-on-list",
    environment: "staging",
    env: {
      ...stagingBase,
      [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
      [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: "other-uid",
    },
  });
  ok(
    "non-allowlisted blocked",
    !nonAllowlisted.effectiveUserVisibleAllowed &&
      nonAllowlisted.blockedReason === "uid_not_allowlisted"
  );
}

// --- package script ---
ok(
  "package script registered",
  pkg.includes("test:v69-controlled-production-pilot-readiness-packet")
);

console.log("\nDone v6.9 controlled production pilot readiness packet tests.\n");

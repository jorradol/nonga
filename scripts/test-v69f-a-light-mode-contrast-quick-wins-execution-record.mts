/**
 * v6.9F-A — Light mode contrast quick wins execution record
 * (static validation only)
 * npm run test:v69f-a-light-mode-contrast-quick-wins-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9F-A-light-mode-contrast-quick-wins-execution-record.md";
const HEAD_SHA = "ed63cb3d550a2cd78a3ff723271c3fb2621ac562";
const SHORT_HASH = "ed63cb3";
const PREV_SHA = "019e7e2e07848bb456ef56129296a5161cee7710";
const PREV_SHORT = "019e7e2";
const PUSH_RANGE = "019e7e2..ed63cb3";

const ALLOWED_FILES = [
  "src/components/Header.tsx",
  "src/components/UserProfileView.tsx",
  "src/components/ai/analysis/CarVisionDashboard.tsx",
  "src/components/captions/CaptionEngineDashboard.tsx",
  "src/components/settings/SettingsCard.tsx",
];

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /Authorization:\s*Bearer/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const PII_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.9F-A Light Mode Contrast Quick Wins Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9F-A label", /v6\.9F-A/i.test(doc));
  ok("overall PARTIAL verdict", /\*\*สถานะ:\*\*.*PARTIAL|Overall.*PARTIAL/i.test(doc));
  ok("head sha ed63cb3", doc.includes(HEAD_SHA));
  ok("short hash ed63cb3", doc.includes(SHORT_HASH));
  ok("previous head 019e7e2", doc.includes(PREV_SHA) || doc.includes(PREV_SHORT));
  ok("push range 019e7e2..ed63cb3", doc.includes(PUSH_RANGE));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok(
    "commit message v6.9F-A quick wins",
    doc.includes(
      "fix(ui): v6.9F-A light mode contrast quick wins for profile, car-vision, header, captions"
    )
  );
  ok("npm run lint pass", /npm run lint.*PASS|`npm run lint`/i.test(doc));
  ok(
    "v69a phase1 guard pass",
    /test:v69a-light-mode-contrast-phase1-guard.*PASS/i.test(doc)
  );
  ok(
    "v69e profile routing guard pass",
    /test:v69e-profile-routing-guard.*PASS/i.test(doc)
  );
  ok("npm run build fail documented", /npm run build.*FAIL/i.test(doc));
  ok(
    "firebase production config guard",
    /Firebase production config guard|firebase production config guard/i.test(doc)
  );
  ok(
    "placeholder apiKey",
    /placeholder.*apiKey|placeholder `apiKey`/i.test(doc)
  );
  ok(
    "not production-ready",
    /not production-ready|Not production-ready/i.test(doc)
  );
  ok(
    "not deploy-ready",
    /not deploy-ready|Not deploy-ready/i.test(doc)
  );
  ok("no staging deploy", /Staging deploy.*NO|No staging deploy/i.test(doc));
  ok(
    "no browser visual smoke",
    /browser.*visual smoke.*NOT|NOT PERFORMED/i.test(doc)
  );
  ok(
    "production pilot still NOT READY",
    /Production pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc)
  );
  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok(
    "production not touched",
    /Production.*Not touched|Production not touched/i.test(doc)
  );
  ok(
    "production deploy no",
    /Production deploy.*NO|Deploy performed.*NO/i.test(doc)
  );
  ok(
    "ai runtime not touched",
    /AI runtime.*Not touched|Gemini provider.*Not touched/i.test(doc)
  );
  ok(
    "guard fallback not touched",
    /Guard.*Not touched|fallback logic.*Not touched/i.test(doc)
  );
  ok(
    "firestore not touched",
    /Firestore.*Not touched|firestore.*not touched/i.test(doc)
  );
  ok(
    "leads not touched",
    /Lead system.*DealerLeads|DealerLeads.*Not touched/i.test(doc)
  );
  ok(
    "payment boost not touched",
    /Payment.*boost.*Not touched|payment.*invoice.*boost/i.test(doc)
  );
  ok(
    "dealer admin deferred",
    /v6\.9F-B|dealer\/admin.*Deferred|deferred.*v6\.9F-B/i.test(doc)
  );
  for (const file of ALLOWED_FILES) {
    ok(`allowed file listed: ${file}`, doc.includes(file));
  }
  ok(
    "five files changed stat",
    doc.includes("5 files changed") || doc.includes("5 allowed")
  );
  ok(
    "car vision theme map",
    /CarVisionDashboard|isDarkMode.*theme map/i.test(doc)
  );
  ok("settings card dual theme", /SettingsCard.*dual-theme|dual-theme card/i.test(doc));
  ok(
    "package script registered",
    pkg.includes("test:v69f-a-light-mode-contrast-quick-wins-execution-record")
  );
  ok(
    "no raw full gemini output",
    !/"finalAnswerTh"\s*:\s*"[\s\S]{150,}/.test(doc) &&
      !/```[\s\S]{400,}```/.test(doc)
  );
  ok(
    "no full prompt dump",
    !docLower.includes("system instruction:") &&
      !docLower.includes("combined prompt:")
  );
  for (const pattern of SECRET_PATTERNS) {
    ok(`no secret pattern ${pattern}`, !pattern.test(doc));
  }
  for (const pattern of PII_PATTERNS) {
    ok(`no pii pattern ${pattern}`, !pattern.test(doc));
  }
}

console.log(
  "\nDone v6.9F-A light mode contrast quick wins execution record tests.\n"
);

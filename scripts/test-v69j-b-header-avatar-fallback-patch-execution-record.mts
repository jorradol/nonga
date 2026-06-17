/**
 * v6.9J-B — Header avatar fallback patch execution record
 * (static validation only)
 * npm run test:v69j-b-header-avatar-fallback-patch-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.9J-B-header-avatar-fallback-patch-execution-record.md";
const HEAD_SHA = "e8e513333d38bb5324e42ef389b34d5ebfba23cf";
const SHORT_HASH = "e8e5133";
const PREV_SHA = "5e6b588b7f45a8859acbc3f2ab5c28175496f978";
const PREV_SHORT = "5e6b588";
const PUSH_RANGE = "5e6b588..e8e5133";
const PATCH_MESSAGE =
  "fix(ui): add header profile avatar fallback for missing photoURL";

const PATCH_FILES = [
  "src/utils/profilePhotoUrl.ts",
  "src/components/profile/ProfileAvatar.tsx",
  "src/components/Header.tsx",
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
  "=== v6.9J-B Header Avatar Fallback Patch Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const docLower = doc.toLowerCase();

{
  ok("doc exists", doc.length > 800);
  ok("doc v6.9J-B label", /v6\.9J-B/i.test(doc));
  ok("overall PASS verdict", /\*\*สถานะ:\*\*.*PASS|Overall.*PASS/i.test(doc));
  ok("head sha e8e5133", doc.includes(HEAD_SHA));
  ok("short hash e8e5133", doc.includes(SHORT_HASH));
  ok("previous head 5e6b588", doc.includes(PREV_SHA) || doc.includes(PREV_SHORT));
  ok("push range 5e6b588..e8e5133", doc.includes(PUSH_RANGE));
  ok(
    "branch feature/chat-image-attachment-v1",
    doc.includes("feature/chat-image-attachment-v1")
  );
  ok("patch commit message", doc.includes(PATCH_MESSAGE));
  ok("npm run lint pass", /npm run lint.*PASS|`npm run lint`/i.test(doc));
  ok("push success", /Push result.*SUCCESS|Result.*SUCCESS/i.test(doc));
  ok(
    "three patch files changed stat",
    doc.includes("3 files changed") || doc.includes("3 allowed")
  );
  ok(
    "profilePhotoUrl helper",
    doc.includes("profilePhotoUrl.ts") && /resolveProfilePhotoURL/i.test(doc)
  );
  ok(
    "ProfileAvatar component",
    doc.includes("ProfileAvatar.tsx") && /onError/i.test(doc)
  );
  ok(
    "before raw photoURL header",
    /raw `user\.photoURL`|raw user\.photoURL/i.test(doc)
  );
  ok(
    "after ProfileAvatar fallback",
    /ProfileAvatar.*fallback|ProfileAvatar` with/i.test(doc)
  );
  ok(
    "v6.9J audit context",
    /v6\.9J audit|Context from v6\.9J/i.test(doc)
  );
  ok("no staging deploy", /Staging Hosting deploy.*NO|Staging deploy.*NO/i.test(doc));
  ok(
    "signed-in avatar smoke not performed",
    /signed-in avatar smoke.*NOT|Signed-in header avatar smoke.*NOT/i.test(doc)
  );
  ok(
    "authenticated profile not verified",
    /Authenticated.*profile.*NOT VERIFIED|authenticated.*profile.*not verified/i.test(doc)
  );
  ok(
    "production pilot still NOT READY",
    /Production pilot.*NOT READY|Production Pilot.*NOT READY/i.test(doc)
  );
  ok(
    "not production-ready",
    /not production-ready|Not production-ready/i.test(doc)
  );
  ok(
    "not deploy-ready",
    /not deploy-ready|Not deploy-ready/i.test(doc)
  );
  ok("cloud run not touched", /Cloud Run.*Not touched|Cloud Run not touched/i.test(doc));
  ok(
    "production not touched",
    /Production.*Not touched|Production deploy.*NO/i.test(doc)
  );
  ok(
    "auth session routing not changed",
    /Auth.*Not changed|auth.*session.*Not changed/i.test(doc)
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
    "ai runtime not touched",
    /AI runtime.*Not touched|Gemini.*Not touched/i.test(doc)
  );
  ok(
    "recommended staging deploy next",
    /Staging Hosting deploy|staging Hosting deploy/i.test(doc)
  );
  for (const file of PATCH_FILES) {
    ok(`patch file listed: ${file}`, doc.includes(file));
  }
  ok(
    "package script registered",
    pkg.includes("test:v69j-b-header-avatar-fallback-patch-execution-record")
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
  "\nDone v6.9J-B header avatar fallback patch execution record tests.\n"
);

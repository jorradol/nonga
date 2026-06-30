/**
 * v8.1A — Owner Sign-off / Gate B-C Evidence Collection Dry-run Plan Closure Record
 * (closure-only / docs-only / static validation)
 * npm run test:v81a-owner-sign-off-gate-b-c-evidence-collection-dry-run-plan-closure-record
 *
 * Validates the closure record doc only.
 * Does NOT fetch network/staging, call Gemini, deploy, read real secrets,
 * or modify runtime/source code.
 */
import { readFileSync } from "node:fs";

const CLOSURE_DOC =
  "docs/v8.1A-owner-sign-off-gate-b-c-evidence-collection-dry-run-plan-closure-record.md";
const V81_DOC = "docs/v8.1-gate-b-c-evidence-collection-dry-run-plan.md";
const SELF_PATH =
  "scripts/test-v81a-owner-sign-off-gate-b-c-evidence-collection-dry-run-plan-closure-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT =
  "test:v81a-owner-sign-off-gate-b-c-evidence-collection-dry-run-plan-closure-record";

const HEAD_FULL = "d03e0b68c690593f63e1db9938d9b99168ffe691";
const HEAD_SHORT = "d03e0b6";
const PUSH_RANGE = "308439f..d03e0b6";
const STAGING_RUNTIME = "92d0dac";
const BRANCH = "feature/chat-image-attachment-v1";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

console.log(
  "=== v8.1A Owner Sign-off / Gate B-C Evidence Collection Dry-run Plan Closure Record ===\n"
);

const doc = readFileSync(CLOSURE_DOC, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + closure-only labeling ---
{
  ok("closure doc exists (substantial)", doc.length > 4200, `${doc.length} chars`);
  ok("doc v8.1A label", doc.includes("v8.1A"));
  ok("doc title closure record", /closure record/i.test(doc));
  ok(
    "doc closure-only / docs-only / static validation",
    /closure-only/i.test(doc) && /docs-only/i.test(doc) && /static validation/i.test(doc)
  );
  ok("doc references v8.1 source", doc.includes(V81_DOC) || doc.includes("v8.1"));
  ok("branch named", doc.includes(BRANCH));
}

// (1) v8.1 commit + push success
{
  ok("v8.1 commit+push success section", /v8\.1 Commit \+ Push สำเร็จ/i.test(doc));
  ok("push success stated", /push สำเร็จ|push result: success/i.test(doc));
  ok("commit message stated", /docs\(ai\): add v8\.1 gate b-c evidence collection dry-run plan/i.test(doc));
}

// (2) local = origin
ok("local = origin section", /Local = Origin/i.test(doc));
ok("local equals origin stated", /local = origin/i.test(doc));

// (3) working tree clean
ok("working tree clean section", /Working Tree Clean/i.test(doc));
ok("working tree clean stated", /working tree.*clean/i.test(doc));

// (4) commit hash + push range correct
{
  ok("head short hash present", doc.includes(HEAD_SHORT));
  ok("head full hash present", doc.includes(HEAD_FULL));
  ok("push range present", doc.includes(PUSH_RANGE));
}

// (5) docs-only / dry-run-plan-only / static validation only
{
  ok("docs-only stated", /docs-only/i.test(doc));
  ok("dry-run-plan-only stated", /dry-run-plan-only/i.test(doc));
  ok("static validation only stated", /static validation only|static validation/i.test(doc));
}

// (6) no deploy
ok("no deploy section", /ยืนยันว่าไม่มี Deploy|no deploy/i.test(doc));

// (7) staging runtime still 92d0dac
{
  ok("staging runtime hash present", doc.includes(STAGING_RUNTIME));
  ok("staging runtime unchanged stated", /staging runtime.*92d0dac/i.test(doc));
}

// (8) production untouched
ok("production untouched section", /Production ไม่ถูกแตะ|production ไม่ถูกแตะ/i.test(doc));

// (9) env/secrets/api key unchanged
ok(
  "env/secrets/api key unchanged section",
  /Env \/ Secrets \/ API Key ไม่เปลี่ยน|ไม่มีการเพิ่ม\/แก้ env|ไม่มีการเพิ่ม\/แก้ secret|ไม่มีการเพิ่ม\/แก้ API key/i.test(
    doc
  )
);

// (10) no real secret in repo
ok("no real secret section", /ไม่มี Secret จริงใน Repo/i.test(doc));

// (11) Gemini / user-visible / public signup / real lead sending still off
{
  ok("gemini still off", /Gemini จริง: ยังปิด|Gemini.*ยังปิด/i.test(doc));
  ok("user-visible still off", /user-visible AI จริง: ยังปิด|user-visible AI.*ยังปิด/i.test(doc));
  ok("public signup still off", /public signup: ยังปิด|public signup.*ยังปิด/i.test(doc));
  ok("real lead sending still off", /real lead sending: ยังปิด|real lead sending.*ยังปิด/i.test(doc));
}

// (12) admin-only shadow still off
ok(
  "admin-only shadow still off",
  /admin-only shadow จริงยังไม่ได้เปิด|admin-only shadow จริง: ยังไม่ได้เปิด/i.test(doc)
);

// (13) buyer-facing ai still off
ok("buyer-facing ai still off", /buyer-facing AI ยังไม่ได้เปิด|buyer-facing AI: ยังไม่ได้เปิด/i.test(doc));

// (14) no src/runtime change
ok("no src/runtime change", /ไม่มี `src\/` \/ Runtime Change|ไม่แตะ `src\/`|ไม่แตะ runtime logic/i.test(doc));

// (15) deterministic flow source of truth
ok("deterministic source of truth", /deterministic flow.*source of truth/i.test(doc));

// (16) not runtime evidence and not activation
{
  ok("not runtime evidence section", /ไม่ใช่ Runtime Evidence จริง|ไม่ใช่ runtime evidence จริง/i.test(doc));
  ok("not activation stated", /ไม่ใช่ activation|ไม่ใช่ Activation/i.test(doc));
}

// (17) next step not auto real Gemini activation
{
  ok("next step section present", /Next Recommended Step หลัง v8\.1A/i.test(doc));
  ok(
    "next mentions gate b-c evidence checklist packet",
    /Gate B-C evidence collection checklist packet/i.test(doc)
  );
  ok("next mentions owner sign-off preparation", /owner sign-off preparation/i.test(doc));
  ok("not auto real gemini activation", /ไม่ใช่.*เปิด Gemini จริงอัตโนมัติ/i.test(doc));
}

// validation snapshot
ok("v8.1 validation snapshot 120/0", /120 PASS, 0 FAIL/i.test(doc));

// --- no secret / phone / VIN ---
{
  const SECRET_PATTERNS: Array<[string, RegExp]> = [
    ["google api key (AIza...)", /AIza[0-9A-Za-z\-_]{20,}/],
    ["openai key (sk-...)", /\bsk-[a-zA-Z0-9]{20,}\b/],
    ["bearer token", /Bearer\s+[A-Za-z0-9._-]{12,}/],
    ["gemini key assignment", /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i],
  ];
  for (const [label, re] of SECRET_PATTERNS) {
    ok(`doc no secret: ${label}`, !re.test(doc));
  }
  ok("doc no thai phone number", !/\b0[689]\d{8}\b/.test(doc));
  ok(
    "doc no 9-11 plain digit run",
    !/(?<![\dA-Fa-f,.\-])\d{9,11}(?![\dA-Fa-f,.\-])/.test(doc)
  );
  ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));
}

// --- this validation script is static-only ---
{
  const head = self.split("// --- this validation script is static-only ---")[0] ?? self;
  ok("script no http fetch", !/fetch\s*\(\s*[`'"]https?:/.test(head));
  ok("script no generateContent", !/generateContent\s*\(/.test(head));
  ok("script no gcloud exec", !/exec(?:Sync)?\s*\(\s*[`'"]\s*gcloud/.test(head));
  ok("script no firebase deploy exec", !/exec(?:Sync)?\s*\(\s*[`'"][^`'"]*firebase deploy/.test(head));
  ok("script no firebase admin import", !/firebase-admin/.test(head));
  ok("script reads no secrets/env", !/process\.env\[/.test(head));
  ok("script uses readFileSync", head.includes("readFileSync"));
}

// --- package.json npm script ---
{
  ok("package.json has npm script key", pkg.includes(`"${NPM_SCRIPT}"`));
  ok(
    "package.json points to v81a mts",
    pkg.includes(
      "scripts/test-v81a-owner-sign-off-gate-b-c-evidence-collection-dry-run-plan-closure-record.mts"
    )
  );
}

console.log(`\nDone v8.1A closure record validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

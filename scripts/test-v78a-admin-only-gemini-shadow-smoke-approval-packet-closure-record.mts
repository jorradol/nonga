/**
 * v7.8A — Admin-only Gemini Shadow Smoke Approval Packet Closure Record
 * (static validation only)
 * npm run test:v78a-admin-only-gemini-shadow-smoke-approval-packet-closure-record
 *
 * Validates the closure record doc only — does NOT fetch network/staging, call
 * gcloud/firebase, change env/secrets, read secrets, or invoke Gemini.
 * CLOSURE-ONLY / DOCS-ONLY / STATIC VALIDATION.
 */
import { readFileSync } from "node:fs";

const CLOSURE_DOC =
  "docs/v7.8A-admin-only-gemini-shadow-smoke-approval-packet-closure-record.md";
const V78_DOC =
  "docs/v7.8-admin-only-gemini-shadow-smoke-approval-packet.md";
const SELF_PATH =
  "scripts/test-v78a-admin-only-gemini-shadow-smoke-approval-packet-closure-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT =
  "test:v78a-admin-only-gemini-shadow-smoke-approval-packet-closure-record";

const HEAD_FULL = "1b549645c69d255b4d7554aac3870c9267e813df";
const HEAD_SHORT = "1b54964";
const PUSH_RANGE = "bd1a96f..1b54964";
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
  "=== v7.8A Admin-only Gemini Shadow Smoke Approval Packet Closure Record ===\n"
);

const doc = readFileSync(CLOSURE_DOC, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- doc exists + closure-only labelling ---
{
  ok("closure doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
  ok("doc v7.8A label", doc.includes("v7.8A"));
  ok("doc title closure record", /closure record/i.test(doc));
  ok(
    "doc closure-only / docs-only / static validation",
    /closure-only/i.test(doc) &&
      /docs-only/i.test(doc) &&
      /static validation/i.test(doc)
  );
  ok("doc references v7.8 source packet", doc.includes(V78_DOC) || doc.includes("v7.8"));
}

// (1) v7.8 commit + push success
{
  ok("v7.8 delivered summary present", /สรุปว่า v7\.8 ทำอะไรสำเร็จ/i.test(doc));
  ok("push success stated", /push สำเร็จ/i.test(doc));
  ok("no force push stated", /ไม่ใช่ force push|ไม่ force/i.test(doc));
}

// (4) commit hash + push range correct
{
  ok("head commit short 1b54964", doc.includes(HEAD_SHORT));
  ok("head commit full sha", doc.includes(HEAD_FULL));
  ok("push range bd1a96f..1b54964", doc.includes(PUSH_RANGE));
  ok("branch named", doc.includes(BRANCH));
  ok("prior baseline bd1a96f stated", doc.includes("bd1a96f"));
}

// (2) local = origin
ok("local = origin stated", /local HEAD = origin HEAD|local = origin/i.test(doc));

// (3) working tree clean
ok("working tree clean stated", /working tree clean/i.test(doc));

// (5) v7.8 is approval packet / docs-only / static validation only, not activation
{
  ok(
    "approval packet / docs-only / static validation only",
    /approval packet \/ docs-only \/ static validation only|approval packet/i.test(doc)
  );
  ok("not runtime activation", /ไม่ใช่ runtime activation|not runtime activation|ไม่ใช่ activation/i.test(doc));
  ok("no runtime/src touched", /ไม่แตะ runtime|ไม่ถูกแตะ/i.test(doc));
}

// (6) no deploy / (8) no production touch / (9) no env secrets change
{
  ok("no deploy staging", /ไม่มี deploy staging/i.test(doc));
  ok("no deploy production", /ไม่มี deploy production/i.test(doc));
  ok("production not touched", /production ไม่ถูกแตะ/i.test(doc));
  ok(
    "no env/secrets/api key change",
    /env \/ secrets \/ API key: ไม่เปลี่ยน|env\/secrets\/API key|ไม่เปลี่ยน env\/secrets/i.test(doc)
  );
}

// (10) gemini / user-visible / public signup / real lead still off
{
  ok("gemini still off", /Gemini จริง: ยังปิด|Gemini.*ยังปิด/i.test(doc));
  ok("user-visible ai still off", /user-visible AI จริง: ยังปิด|user-visible AI.*ยังปิด/i.test(doc));
  ok("public signup still off", /public signup: ยังปิด|public signup.*ยังปิด/i.test(doc));
  ok("real lead sending still off", /real lead sending: ยังปิด|real lead sending.*ยังปิด/i.test(doc));
}

// (7) staging runtime still 92d0dac
{
  ok("staging runtime 92d0dac", doc.includes(STAGING_RUNTIME));
  ok(
    "staging runtime unchanged stated",
    /staging runtime ยังเป็น `?92d0dac`?|staging runtime.*ยังคงเป็น.*92d0dac/i.test(doc)
  );
}

// (11) lead sending / consent / preview / final confirmation / dealer isolation NOT touched
{
  ok("lead sending not touched", /lead sending:.*ไม่แตะ|ไม่แตะ.*lead sending/i.test(doc));
  ok("consent not touched", /consent:.*ไม่แตะ/i.test(doc));
  ok("preview not touched", /preview:.*ไม่แตะ/i.test(doc));
  ok("final confirmation not touched", /final confirmation:.*ไม่แตะ/i.test(doc));
  ok("dealer isolation not touched", /dealer isolation.*ไม่แตะ|dealer isolation \/ owner isolation:.*ไม่แตะ/i.test(doc));
}

// (11b) no src/runtime change explicit section
{
  ok("no src/runtime change section", /ไม่มี `src\/` \/ runtime change|ไม่มี `?src\/?`? \/ runtime change/i.test(doc));
  ok("git status src empty stated", /git status -- src\/`? ว่างเปล่า|src\/`? ว่างเปล่า/i.test(doc));
}

// (12) deterministic flow is source of truth
{
  ok("deterministic flow source of truth", /deterministic flow.*source of truth/i.test(doc));
  ok("ai not source of truth", /ไม่ใช่ source of truth|ไม่ใช่ผู้ตัดสินใจ flow/i.test(doc));
}

// (13) admin-only shadow real not enabled + (14) buyer-facing AI not enabled
{
  ok("admin-only shadow not enabled", /admin-only shadow จริง: ยังไม่ได้เปิด|admin-only shadow จริง.*ยังไม่ได้เปิด/i.test(doc));
  ok("buyer-facing ai not enabled", /buyer-facing AI: ยังไม่ได้เปิด|buyer-facing AI.*ยังไม่ได้เปิด/i.test(doc));
}

// admin-only / shadow-only / no buyer-facing exposure principle preserved
{
  ok("admin-only shadow principle", /admin-only shadow|admin-only \/ shadow-only/i.test(doc));
  ok("no buyer-facing exposure", /no buyer-facing exposure/i.test(doc));
}

// v7.8 packet summary + gates + risk matrix mentioned
{
  ok("v7.8 packet summary present", /สาระสำคัญของ v7\.8/i.test(doc));
  ok("preconditions mentioned", /preconditions/i.test(doc));
  ok("go/no-go checklist mentioned", /go\/no-go checklist|go\/no-go/i.test(doc));
  ok("risk matrix mentioned", /risk matrix/i.test(doc));
  ok("owner approval gates mentioned", /owner approval gates|Gate A/i.test(doc));
}

// (15) next step: v7.9 admin-only shadow dry-run preparation only, not auto-activation
{
  ok("next recommended step present", /next recommended step|next step/i.test(doc));
  ok("v7.9 shadow dry-run preparation", /v7\.9.*admin-only shadow dry-run preparation|v7\.9.*shadow dry-run preparation/i.test(doc));
  ok(
    "v7.9 preparation only not auto-activation",
    /preparation เท่านั้น ไม่ใช่การเปิด admin-only shadow จริงโดยอัตโนมัติ|ไม่ใช่การเปิด.*โดยอัตโนมัติ/i.test(doc)
  );
  ok("not buyer-facing AI yet", /ยังไม่ใช่ buyer-facing AI/i.test(doc));
}

// rollback/safety note + closure checklist + verdict
{
  ok("rollback/safety note present", /rollback/i.test(doc) && /ยังไม่มีอะไรต้อง rollback/i.test(doc));
  ok("closure checklist present", /closure checklist/i.test(doc));
  ok("closure verdict present", /closure verdict|v7\.8 CLOSED/i.test(doc));
}

// --- no PII / phone / VIN / full plate / secret / API key value in doc ---
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
  // 9-11 plain decimal run, but NOT when embedded in a hex commit hash.
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
    "package.json points to mts",
    pkg.includes("scripts/test-v78a-admin-only-gemini-shadow-smoke-approval-packet-closure-record.mts")
  );
}

console.log(`\nDone v7.8A closure record validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

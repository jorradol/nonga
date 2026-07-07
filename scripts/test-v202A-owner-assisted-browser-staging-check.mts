/**
 * v20.2A owner-assisted browser staging check validator
 *
 * npm run test:v20.2A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.2A-owner-assisted-browser-staging-check.md";
const EXAMPLE_PATH = "docs/examples/v20.2A-owner-assisted-browser-staging-check.example.md";
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

function hasEveryLine(source: string, required: string[]): boolean {
  return required.every((token) => source.includes(token));
}

console.log("=== v20.2A Owner-Assisted Browser Staging Check Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v20.2A owner-assisted check",
  doc.includes("# v20.2A - Owner-Assisted Browser Staging Check") &&
    example.includes("milestone: v20.2A") &&
    example.includes("record_type: owner_assisted_browser_staging_check")
);

ok(
  "includes no direct agent one-run boundary",
  hasEveryLine(combined, [
    "OWNER-ASSISTED BROWSER RUN CHECKLIST / OWNER VISIBLE STAGING CHECK / NO DEPLOY / NO DIRECT AGENT ONE-RUN",
    "no retry / no second-run / no re-arm",
    "no deploy",
    "no public / no production",
  ])
);

ok(
  "includes v20.2 hold continuity",
  hasEveryLine(combined, [
    "PASS — controlled owner-only staging trial completed, Step 1 completed",
    "PASS — v20.1A owner-browser auth context pivot packet closed, no execution",
    "v20.2 final decision: `HOLD — cannot safely perform required owner-browser authenticated exactly-one-run",
    "Step 2 not started",
  ])
);

ok(
  "includes required v20.2A approval phrase",
  combined.includes(
    "FINAL AUTHORIZE v20.2A OWNER-ASSISTED BROWSER STAGING CHECK / OWNER USES LOGGED-IN BROWSER ONLY / EXACTLY ONE SAFE CHAT MESSAGE / NO TOKEN HEADER COOKIE SECRET SHARING / NO RETRY / NO SECOND-RUN / NO RE-ARM / STAGING ONLY / PRIVATE ALLOWLIST ONLY / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN"
  )
);

ok(
  "includes exact safe message and owner site path",
  hasEveryLine(combined, [
    "https://a.nongbot.org",
    "/` or `/chat",
    "อยากดูรถมือสองงบไม่เกิน 300,000 บาท ใช้ขับในเมือง ขอประหยัดน้ำมันและดูแลง่าย",
  ])
);

ok(
  "includes owner report checklist template lines",
  hasEveryLine(combined, [
    "1. เปิดเว็บ https://a.nongbot.org ได้ไหม: ได้ / ไม่ได้",
    "2. Login ได้ไหม: ได้ / ไม่ได้ / ไม่แน่ใจ / ไม่ต้อง login",
    "3. เข้าหน้า chat หรือหน้าแรกได้ไหม: ได้ / ไม่ได้",
    "4. ส่งข้อความทดสอบ 1 ครั้งได้ไหม: ได้ / ไม่ได้",
    "5. ระบบตอบกลับไหม: ตอบ / ไม่ตอบ / error",
    "6. สรุปคำตอบที่เห็น 1-3 บรรทัด โดยไม่ใส่ข้อมูลลับ:",
    "7. มีการขอเบอร์โทรหรือสร้าง lead จริงไหม: ไม่มี / มี",
    "8. มีข้อมูลเสี่ยง เช่น เบอร์ ทะเบียน VIN token header cookie โผล่ไหม: ไม่มี / มี",
    "9. มี error แสดงบนหน้าจอไหม: ไม่มี / มี คือ ...",
  ])
);

ok(
  "marks owner action still required",
  hasEveryLine(combined, [
    "owner result provided in this context: no",
    "final_decision: NEED OWNER ACTION — owner-assisted browser checklist prepared, no run evidence yet",
    "`NEED OWNER ACTION — owner-assisted browser checklist prepared, no run evidence yet`",
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token literal", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["raw generic token assignment", /\btoken\s*[:=]\s*["'][^"']{8,}["']/i],
  ["raw generic secret assignment", /\bsecret\s*[:=]\s*["'][^"']{8,}["']/i],
  ["raw api key assignment", /\bapi[_-]?key\s*[:=]\s*["'][^"']{8,}["']/i],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

const scripts =
  packageParsed && typeof packageParsed === "object"
    ? ((packageParsed as { scripts?: Record<string, string> }).scripts ?? {})
    : {};

ok(
  "package has test:v20.2A script",
  scripts["test:v20.2A"] === "tsx scripts/test-v202A-owner-assisted-browser-staging-check.mts"
);

console.log(`\nDone v20.2A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

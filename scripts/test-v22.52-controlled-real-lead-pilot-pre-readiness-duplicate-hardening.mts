/**
 * v22.52 — Static readiness gate + doc presence (no live Lead writes).
 * npm run test:v22.52-controlled-real-lead-pilot-pre-readiness-duplicate-hardening
 */
import fs from "node:fs";
import path from "node:path";

const DOC =
  "docs/v22.52-real-lead-pilot-pre-readiness-duplicate-hardening.md";

let failures = 0;
function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

const p = path.resolve(process.cwd(), DOC);
ok("doc exists", fs.existsSync(p));
const doc = fs.readFileSync(p, "utf8");
ok("doc PASS recommendation", /\*\*Final recommendation:\s*PASS\*\*/.test(doc));
ok("doc capture OFF", /Capture.*OFF|leadCaptureEnabled.*false/i.test(doc));
ok("doc no live lead write", /Zero live Lead|no live Lead|NO LIVE LEAD/i.test(doc));
ok("doc active-slot", /active-slot|buyerLeadIdempotencyRecords/i.test(doc));
ok("doc owner decisions", /Owner decisions still required/i.test(doc));
ok("doc rollback", /Rollback/i.test(doc));
ok("doc pilot inactive", /unapproved|inactive|awaiting/i.test(doc));
ok("doc no blead dump", !/blead-[0-9]{10,}/.test(doc));

console.log(
  failures === 0
    ? "\n=== v22.52 doc gate PASS ===\n"
    : `\n=== v22.52 doc gate FAIL (${failures}) ===\n`
);
process.exit(failures === 0 ? 0 : 1);

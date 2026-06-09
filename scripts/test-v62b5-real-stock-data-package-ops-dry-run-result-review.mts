/**
 * v6.2B.5 — Real Stock Data Package Ops Dry-run Result Review (static validation only)
 * npm run test:v62b5-real-stock-data-package-ops-dry-run-result-review
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.5-real-stock-data-package-ops-dry-run-result-review.md";
const V62B4_DOC =
  "docs/v6.2B.4-real-stock-data-package-dry-run-execution-record.md";
const V62B3_DOC = "docs/v6.2B.3-real-stock-data-package-intake-dry-run-plan.md";
const MANIFEST_PATH =
  "docs/examples/v6.2B.1-real-stock-sample-manifest.placeholder.json";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_DATA_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const RAW_UID_PATTERNS = [/\b[A-Za-z0-9]{28}\b/];

const HEAD_SHA = "669d71a6ec5a226b9a53e426dddfef019b408968";
const APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";
const INSUFFICIENT_DATA = "ข้อมูลประกาศยังไม่พอ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.5 Real Stock Data Package Ops Dry-run Result Review ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b5-real-stock-data-package-ops-dry-run-result-review.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b4Doc = readFileSync(V62B4_DOC, "utf8");
const v62b3Doc = readFileSync(V62B3_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 11\./,
  ""
);

// --- doc exists + v6.2B.5 ---
{
  ok("result review doc exists", doc.length > 8000);
  ok("doc v6.2B.5 label", doc.includes("v6.2B.5"));
  ok("doc ops dry-run result review", /ops dry-run result review/i.test(doc));
  ok("doc redacted summary only", /redacted summary|redacted-result-review/i.test(docLower));
  ok("doc HEAD 669d71a", doc.includes(HEAD_SHA) || doc.includes("669d71a"));
  ok("doc references v62b4", /v6\.2B\.4/i.test(doc));
  ok("doc review result only not import", /review result only|not import step/i.test(docLower));
}

// --- review metadata ---
{
  ok("review metadata section", /Review Metadata/i.test(doc));
  ok("metadata reviewDate redacted", /reviewDate.*REDACTED|REDACTED.*reviewDate/i.test(doc));
  ok("metadata reviewer role only", /reviewerRole|reviewer role/i.test(doc));
  ok("metadata outside repo secure ops", /outside repo.*secure ops|secure ops channel/i.test(docLower));
  ok("metadata batch 5-10", /batchSizeSummary|5.*10.*range|5–10/i.test(doc));
  ok("metadata no raw vehicle data", /no raw vehicle data in repo/i.test(docLower));
  ok("metadata no raw image url", /no raw image URL in repo/i.test(docLower));
  ok("metadata no PII in repo", /no PII in repo/i.test(docLower));
  ok("no specific car data in repo", /ไม่ระบุข้อมูลรถจริง|no make\/model/i.test(docLower));
}

// --- dry-run review summary ---
{
  ok("review summary section", /Dry-run Review Summary/i.test(doc));
  ok("summary carsTotal", /carsTotal/i.test(doc));
  ok("summary passed fixRequired noGo", /passed|fixRequired|noGo/i.test(doc));
  ok("summary coded no-go NG-PII", /NG-PII/i.test(doc));
  ok("summary NG-IMG NG-PLATE", /NG-IMG|NG-PLATE/i.test(doc));
  ok("summary NG-STALE NG-DQ", /NG-STALE|NG-DQ/i.test(doc));
  ok("summary NG-CONSENT NG-ROLLBACK", /NG-CONSENT|NG-ROLLBACK/i.test(doc));
  ok("summary GO FIX NO-GO PENDING", /\*\*GO\*\*.*FIX REQUIRED.*NO-GO.*PENDING/is.test(doc));
}

// --- rights consent ---
{
  ok("rights consent section", /Rights and Consent Result/i.test(doc));
  ok("consent seller dealer", /seller\/dealer consent/i.test(docLower));
  ok("consent image rights", /image rights checked/i.test(docLower));
  ok("consent source ownership", /source ownership/i.test(docLower));
  ok("consent no copied images", /no copied images without rights/i.test(docLower));
  ok("consent sign-off", /reviewer sign-off/i.test(docLower));
  ok("consent incomplete FIX or NO-GO", /consent incomplete.*FIX REQUIRED|image rights incomplete.*FIX REQUIRED/i.test(docLower));
}

// --- PII image safety ---
{
  ok("PII image section", /PII and Image Safety Result/i.test(doc));
  ok("PII phone removed", /phone removed\/masked/i.test(docLower));
  ok("PII owner removed", /owner name removed/i.test(docLower));
  ok("PII LINE removed", /LINE removed/i.test(doc));
  ok("PII address removed", /address removed/i.test(docLower));
  ok("PII plate masked", /full plate.*removed\/masked|plate removed\/masked/i.test(docLower));
  ok("PII document rejected", /document images rejected|documents.*reject/i.test(docLower));
  ok("PII customer rejected", /customer data rejected|raw customer data rejected/i.test(docLower));
  ok("raw image URLs not in repo", /raw image URLs not stored in repo/i.test(docLower));
  ok("visible plate blur mask crop", /visible.*plate.*blur.*mask.*crop|blur \/ mask \/ crop/i.test(docLower));
  ok("reject document id book contract finance", /documents.*ID.*book.*contract.*finance|ID \/ book \/ contract \/ finance/i.test(docLower));
  ok("reject phone line address photos", /phone.*LINE.*address.*reject|photos with phone/i.test(docLower));
}

// --- data quality ---
{
  ok("data quality section", /Data Quality Result/i.test(doc));
  ok("DQ make model year trim", /make\/model\/year\/trim/i.test(doc));
  ok("DQ price mileage", /price.*mileage|mileage/i.test(docLower));
  ok("DQ transmission fuel color province", /transmission|fuel|color|province/i.test(doc));
  ok("DQ photos highlights status", /photos.*highlights|listingStatus/i.test(docLower));
  ok("DQ sourceUpdatedAt", /sourceUpdatedAt/i.test(doc));
  ok("DQ sellerDisplayName non-pii", /sellerDisplayName.*non-PII/i.test(doc));
}

// --- stale rollback ---
{
  ok("stale rollback section", /Stale and Rollback Result/i.test(doc));
  ok("stale sold reserved", /sold\/reserved checked/i.test(docLower));
  ok("stale price current", /price current checked/i.test(docLower));
  ok("stale sourceUpdatedAt", /sourceUpdatedAt checked/i.test(docLower));
  ok("delist hide batch contact", /delist.*hide batch/i.test(docLower));
  ok("rollback readiness status", /rollback readiness status/i.test(docLower));
  ok("no listing without rollback", /no listing.*without rollback/i.test(docLower));
}

// --- AI grounding ---
{
  ok("AI grounding section", /AI Grounding Readiness Result/i.test(doc));
  ok("grounding search compare refine", /search.*compare.*refine/i.test(docLower));
  ok("grounding insufficient phrase", doc.includes(INSUFFICIENT_DATA));
  ok("grounding no overpromise", /no overpromise/i.test(docLower));
  ok("grounding no condition guarantee", /no condition guarantee/i.test(docLower));
  ok("grounding no invented data", /no invented data/i.test(docLower));
  ok("grounding guest legacy", /guest.*legacy|legacy preserved/i.test(docLower));
  ok("grounding allowlist only", /allowlisted only/i.test(docLower));
  ok("grounding no real gemini", /no real Gemini user-visible/i.test(doc));
}

// --- import gate ---
{
  ok("import gate section", /Import Gate/i.test(doc));
  ok("v62b5 review result only", /v6\.2B\.5 is review result only/i.test(doc));
  ok("import blocked even GO", /even if.*GO.*import still blocked|import still blocked/i.test(docLower));
  ok("approval phrase required", doc.includes(APPROVAL_PHRASE));
  ok("separate import execution record", /separate import execution record/i.test(docLower));
  ok("real stock import remains blocked", /real stock import.*blocked|import blocked/i.test(docLower));
  ok("no deploy env import v62b5", /not in v6\.2B\.5/i.test(doc));
}

// --- no image processing / no AI vision ---
{
  ok("no image processing runtime", /image processing runtime.*not|not in v6\.2B\.5/i.test(docLower));
  ok("no AI vision API call", /AI\/vision API call.*not|no AI\/vision API/i.test(docLower));
}

// --- pilot scope ---
{
  ok("staging only", /staging only/i.test(docLower));
  ok("closed pilot only", /closed pilot only/i.test(docLower));
  ok("allowlist only", /allowlisted tester only|allowlist only/i.test(docLower));
  ok("batch 5-10", /5.*10/i.test(doc));
}

// --- forbidden in repo ---
{
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("forbid raw stock in repo doc", /Raw real stock data/i.test(doc));
  ok("forbid customer data repo", /Customer data/i.test(doc));
  ok("forbid raw image url repo", /Raw image URL/i.test(doc));
  ok("forbid full plate in repo", /Full plate examples|ป้ายทะเบียนเต็ม/i.test(doc));
  ok("forbid raw UID", /Raw UID/i.test(doc));
  ok("forbid prompt dump", /Prompt dump/i.test(doc));
}

// --- no PII/secrets in doc ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  ok("doc no raw UID pattern", !RAW_UID_PATTERNS.some((p) => p.test(doc)));
}

// --- no real stock in manifest ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest placeholder only", meta?.placeholderOnly === true);
  ok("no raw real stock data in repo", /raw real stock data.*forbidden|none/i.test(docLower));
}

// --- forbidden slice ---
{
  ok("forbidden no runtime", /runtime.*not|not in v6\.2B\.5|docs\/tests/i.test(docLower));
  ok("forbidden no deploy", /deploy.*not|no deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not/i.test(docLower));
  ok("forbidden no production", /production.*not touched|forbidden/i.test(docLower));
  ok("forbidden no firestore rules", /Firestore rules|firestore rules deploy/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc) || /secret access/i.test(docLower));
  ok("forbidden no payment lead", /payment.*settlement|lead.*reveal/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no public AI", /public AI|public ai/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.5/i.test(doc));
}

// --- redacted summary block ---
{
  ok("redacted result review block", /Redacted Dry-run Result Review/i.test(doc));
  ok("summary pending ops channel", /PENDING.*ops|ops channel only|secure channel only/i.test(docLower));
  ok("v62b4 cross-ref", /execution record|v6\.2B\.4/i.test(v62b4Doc));
  ok("v62b3 cross-ref dry-run plan", /dry-run plan|v6\.2B\.3/i.test(v62b3Doc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62b5 script",
    pkg.includes(
      "test:v62b5-real-stock-data-package-ops-dry-run-result-review"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b5-real-stock-data-package-ops-dry-run-result-review.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.5 Real Stock Data Package Ops Dry-run Result Review tests."
);
if (process.exitCode) process.exit(process.exitCode);

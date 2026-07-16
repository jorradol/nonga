/**
 * Car Post Generator — Visual Surface Parity (Semantic Light/Dark)
 * Asserts page + shared style/premium surfaces use Nong A semantic tokens.
 *
 * Run: npx tsx scripts/test-car-post-generator-visual-surface-parity.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const dashPath = path.join(
  root,
  "src/components/ai/post-generator/PostGeneratorDashboard.tsx"
);
const appPath = path.join(root, "src/App.tsx");
const stylePath = path.join(
  root,
  "src/components/cars/create/CarPostStyleSelector.tsx"
);
const premiumPath = path.join(
  root,
  "src/components/ai-premium/AiPremiumComponents.tsx"
);
const indexCssPath = path.join(root, "src/index.css");

const dash = fs.readFileSync(dashPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const style = fs.readFileSync(stylePath, "utf8");
const premium = fs.readFileSync(premiumPath, "utf8");
const indexCss = fs.readFileSync(indexCssPath, "utf8");

/** Slice source between two export function markers (exclusive of end). */
function sliceBetweenExports(src: string, startName: string, endName: string): string {
  const start = src.indexOf(`export function ${startName}`);
  if (start < 0) return "";
  const end = src.indexOf(`export function ${endName}`, start + 1);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

const badgeSrc = sliceBetweenExports(premium, "PremiumAiBadge", "UsageProgressBar");
const progressSrc = sliceBetweenExports(premium, "UsageProgressBar", "LockedFeatureCard");
const usageDashSrc = sliceBetweenExports(premium, "AiUsageDashboard", "\0");
// AiUsageDashboard is last export — take from its marker to EOF
const usageDashStart = premium.indexOf("export function AiUsageDashboard");
const usageDashBody =
  usageDashStart >= 0 ? premium.slice(usageDashStart) : usageDashSrc;

console.log("--- Car Post Generator visual surface parity ---");

// --- App / page semantic shell ---
ok(
  "app-shell-uses-semantic-bg",
  app.includes("nonga-bg-app") && app.includes("nonga-text-primary"),
  "App.tsx semantic shell"
);

ok(
  "page-uses-semantic-bg",
  /className="w-full nonga-bg-app nonga-text-primary min-h-screen/.test(dash),
  "outer wrapper"
);

ok(
  "page-no-hardcoded-dark-shell",
  !/className="w-full bg-\[#0a0a0a\]/.test(dash) &&
    !/className="w-full bg-slate-950 text-slate-100 min-h-screen/.test(dash),
  "removed hard-coded dark page shell"
);

ok(
  "page-surfaces-use-semantic-tokens",
  dash.includes("nonga-bg-surface") &&
    dash.includes("nonga-border") &&
    dash.includes("nonga-text-primary"),
  "section surfaces"
);

ok(
  "page-inputs-use-neutral-tokens",
  dash.includes("nonga-bg-elevated") &&
    dash.includes("nonga-placeholder") &&
    dash.includes("nonga-focus-ring") &&
    !dash.includes("bg-slate-950"),
  "form controls"
);

ok(
  "page-primary-action-contract",
  dash.includes("nonga-action") &&
    indexCss.includes("--nonga-action-primary: #c2410c") &&
    indexCss.includes("--nonga-action-primary-text: #ffffff"),
  "primary action tokens"
);

ok(
  "page-no-hardcoded-isDarkMode-true",
  !dash.includes("isDarkMode={true}") &&
    !/\bisDarkMode\s*\n\s*\/>/.test(dash) &&
    dash.includes("isDarkMode={isDarkMode}"),
  "theme prop from store"
);

ok(
  "orange-brand-preserved",
  (dash.includes("text-orange-") ||
    dash.includes("var(--nonga-brand)") ||
    dash.includes("var(--nonga-action-primary)")) &&
    (dash.includes("border-orange-") || dash.includes("var(--nonga-brand)")),
  "orange accents"
);

ok(
  "form-fields-structure-preserved",
  dash.includes("ยี่ห้อรถยนต์ (Brand)") &&
    dash.includes('type="text"') &&
    (dash.match(/<input/g) || []).length >= 6,
  "inputs present"
);

ok(
  "steps-copy-preserved",
  dash.includes("สเป็คตัวรถโฉมปัง") &&
    dash.includes("บอทสัมภาษณ์เจาะข้อมูล") &&
    dash.includes("โพสต์ขายและคอนเทนต์นำไปใช้")
);

ok(
  "honesty-gate-files-untouched-in-this-patch-scope",
  !dash.includes("evaluatePostGenerateHonesty") &&
    !dash.includes("triggerUsage"),
  "dashboard remains presentation-only"
);

ok(
  "outer-spacing-unchanged",
  /nonga-bg-app nonga-text-primary min-h-screen px-4 py-8/.test(dash),
  "outer spacing retained"
);

// --- Style selector shared component ---
ok(
  "style-selector-uses-semantic-tokens",
  style.includes("nonga-bg-subtle") &&
    style.includes("nonga-text-primary") &&
    style.includes("nonga-text-muted") &&
    style.includes("nonga-border") &&
    style.includes("nonga-focus-ring"),
  "CarPostStyleSelector tokens"
);

ok(
  "style-selector-selected-uses-brand",
  style.includes("var(--nonga-brand)") &&
    style.includes("var(--nonga-action-primary)"),
  "selected state orange"
);

ok(
  "style-selector-no-navy-slate-surfaces",
  !style.includes("bg-slate-900") &&
    !style.includes("bg-slate-950") &&
    !style.includes("text-white") &&
    !style.includes("text-slate-200"),
  "no dark-only navy cards"
);

ok(
  "style-selector-no-hardcoded-isDarkMode-true-default-branch",
  !style.includes("isDarkMode = true") &&
    !style.includes('isDarkMode ? "text-white"'),
  "no dark-forced text pairing"
);

ok(
  "style-options-structure-preserved",
  style.includes("CAR_POST_STYLE_OPTIONS") &&
    style.includes("onChange(opt.id)") &&
    style.includes("เลือกสไตล์โพสต์ขายรถ"),
  "style options/handlers intact"
);

// --- Premium badge / progress / usage dashboard ---
ok(
  "premium-badge-free-tier-readable",
  badgeSrc.includes("Free Tier") &&
    badgeSrc.includes("nonga-bg-subtle") &&
    badgeSrc.includes("nonga-text-secondary") &&
    !badgeSrc.includes("bg-slate-900 text-slate-400"),
  "Free Tier badge"
);

ok(
  "premium-badge-premium-uses-action",
  badgeSrc.includes("NONG A PREMIUM") && badgeSrc.includes("nonga-action"),
  "Premium badge action"
);

ok(
  "usage-progress-uses-semantic-tokens",
  progressSrc.includes("nonga-text-secondary") &&
    progressSrc.includes("nonga-text-primary") &&
    progressSrc.includes("nonga-bg-subtle") &&
    !progressSrc.includes("bg-slate-900"),
  "UsageProgressBar"
);

ok(
  "usage-dashboard-uses-semantic-surfaces",
  usageDashBody.includes("nonga-bg-surface") &&
    usageDashBody.includes("nonga-bg-elevated") &&
    usageDashBody.includes("nonga-text-primary") &&
    usageDashBody.includes("nonga-text-secondary") &&
    usageDashBody.includes("nonga-border"),
  "AiUsageDashboard surfaces"
);

ok(
  "usage-dashboard-no-navy-overlay",
  !usageDashBody.includes("bg-slate-950/30") &&
    !usageDashBody.includes("bg-slate-900/40") &&
    !usageDashBody.includes("bg-slate-900/20") &&
    !usageDashBody.includes("text-white") &&
    !usageDashBody.includes("bg-blue-500"),
  "no navy/blue card backgrounds"
);

ok(
  "usage-dashboard-primary-cta-contract",
  usageDashBody.includes("nonga-action") &&
    usageDashBody.includes("upgradeToPremium") &&
    usageDashBody.includes("refreshStats"),
  "upgrade/refresh handlers preserved with action styling"
);

ok(
  "usage-dashboard-copy-and-semantics-preserved",
  usageDashBody.includes("แผงควบคุมโควต้าและฟีเจอร์พรีเมียม") &&
    usageDashBody.includes("Free Creator Account") &&
    usageDashBody.includes("subscription?.tokens") &&
    usageDashBody.includes("featuresStats.map") &&
    usageDashBody.includes("ล็อกโควต้าแล้ว") &&
    usageDashBody.includes("ปลดล็อก"),
  "quota/entitlement copy intact"
);

ok(
  "semantic-foundation-tokens-present",
  indexCss.includes("--nonga-bg-app:") &&
    indexCss.includes("--nonga-bg-surface:") &&
    indexCss.includes("--nonga-bg-elevated:") &&
    indexCss.includes("html.dark") &&
    indexCss.includes(".nonga-bg-app"),
  "token foundation"
);

if (process.exitCode && process.exitCode !== 0) {
  console.log("\nVisual surface parity FAILED");
} else {
  console.log("\nVisual surface parity PASSED");
}

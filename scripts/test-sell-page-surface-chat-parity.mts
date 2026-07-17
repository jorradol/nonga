/**
 * Guard: /sell presentation surfaces must use chat-canonical Nong A tokens
 * (slate blue-black via --nonga-bg-*), not legacy near-black hex shells.
 *
 * Run: npm run test:sell-page-surface-chat-parity
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const LEGACY_BLACK_HEX = [
  "#121216",
  "#0b0b0d",
  "#111115",
  "#09090b",
  "#101016",
  "#08080c",
] as const;

// Preview panel (step 7) legacy near-black shells — must not return.
const PREVIEW_BLACK_HEX = [
  "#0e0e12",
  "#12121a",
  "#0b0b0e",
  "#0c0c0e",
] as const;

console.log("=== /sell surface chat-parity guard ===\n");

const form = readFileSync(
  "src/components/cars/create/SellingFormContainer.tsx",
  "utf8"
);
const upload = readFileSync(
  "src/components/cars/create/ImageUploadStep.tsx",
  "utf8"
);
const preview = readFileSync(
  "src/components/cars/create/PreviewPublishStep.tsx",
  "utf8"
);
const sellView = readFileSync("src/components/SellCarView.tsx", "utf8");
const indexCss = readFileSync("src/index.css", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:sell-page-surface-chat-parity")
);

ok(
  "canonical dark surface is chat slate #0f172a",
  /html\.dark[\s\S]*--nonga-bg-surface:\s*#0f172a/.test(indexCss),
  "index.css dark --nonga-bg-surface"
);

ok(
  "canonical dark app bg is chat slate #020617",
  /html\.dark[\s\S]*--nonga-bg-app:\s*#020617/.test(indexCss),
  "index.css dark --nonga-bg-app"
);

ok(
  "form shell uses nonga-bg-surface + nonga-border",
  form.includes("lg:col-span-3") &&
    /lg:col-span-3[^"]*nonga-border[^"]*nonga-bg-surface/.test(form),
  "step content frame"
);

ok(
  "AI Assistant card uses nonga-bg-surface",
  form.includes("Nong A AI Assistant") &&
    /lg:col-span-1[^"]*nonga-bg-surface/.test(form),
  "AI sidebar shell"
);

ok(
  "AI Assistant tip text uses semantic tokens",
  form.includes("nonga-text-primary") &&
    form.includes("nonga-text-secondary") &&
    form.includes("nonga-text-muted"),
  "AI chrome contrast"
);

ok(
  "upload dropzone uses nonga-bg-subtle (not transparent-on-black)",
  upload.includes("nonga-bg-subtle") &&
    upload.includes("nonga-border") &&
    upload.includes("nonga-text-primary") &&
    upload.includes("nonga-text-secondary"),
  "ImageUploadStep dropzone"
);

ok(
  "SellCarView shell already on semantic tokens",
  sellView.includes("nonga-bg-surface") &&
    sellView.includes("nonga-text-primary"),
  "SellCarView"
);

for (const hex of LEGACY_BLACK_HEX) {
  ok(
    `SellingFormContainer bans legacy black ${hex}`,
    !form.includes(hex)
  );
}

ok(
  "SellingFormContainer bans near-black gradient from-[#...]",
  !/bg-gradient-to-(?:br|b)\s+from-\[#/.test(form)
);

ok(
  "upload dropzone idle state no isDarkMode-only black border path",
  !/isDarkMode\s*\?\s*"border-white\/10/.test(upload)
);

ok(
  "form / AI shells do not hardcode text-white on tip header",
  !/font-extrabold text-white flex items-center/.test(form)
);

// --- Preview publish step (step 7) surfaces ---
for (const hex of PREVIEW_BLACK_HEX) {
  ok(`PreviewPublishStep bans legacy near-black ${hex}`, !preview.includes(hex));
}

ok(
  "PreviewPublishStep bans near-black gradient from-[#...]",
  !/from-\[#0e0e12\]|to-\[#12121a\]/.test(preview)
);

ok(
  "preview AI auditor panel uses nonga-bg-subtle",
  /rounded-2xl border nonga-bg-subtle border-orange-500\/15/.test(preview),
  "AI auditor surface"
);

ok(
  "preview specs sheet uses nonga-bg-subtle + nonga-border",
  /grid grid-cols-2[^"]*nonga-bg-subtle border nonga-border/.test(preview),
  "specs sheet surface"
);

ok(
  "preview phone card uses nonga-bg-elevated + nonga-border",
  /rounded-2xl border nonga-border nonga-bg-elevated/.test(preview),
  "phone preview card surface"
);

ok(
  "preview description box uses nonga-bg-subtle (not bg-slate-900/40)",
  preview.includes("rounded-xl border nonga-border nonga-bg-subtle") &&
    !preview.includes("bg-slate-900/40") &&
    !preview.includes("bg-slate-900/30"),
  "description + validation surfaces"
);

ok(
  "preview car title/price/values use semantic text tokens",
  preview.includes("font-display font-extrabold nonga-text-primary") &&
    !preview.includes("text-[#ffffff]") &&
    !/<strong className="text-white"/.test(preview),
  "no invisible text-white on light surface"
);

ok(
  "preview description tone is theme-aware (dark/light)",
  preview.includes('tone={isDarkMode ? "dark" : "light"}') &&
    !preview.includes('tone="dark"'),
  "ListingDescription tone"
);

ok(
  "preview keeps media backdrop for cover image + badges",
  /aspect-video relative bg-slate-900/.test(preview) &&
    preview.includes("bg-black/60") &&
    preview.includes("bg-black/75"),
  "functional media backdrop preserved"
);

if (process.exitCode && process.exitCode !== 0) {
  console.log("\n=== FAIL: /sell still has legacy black surfaces ===");
} else {
  console.log("\n=== PASS: /sell surfaces aligned to chat-canonical tokens ===");
}

/**
 * Guard: /profile card surfaces must use Nong A slate theme tokens,
 * not legacy hard-coded bg-black/* shells.
 *
 * Run: npm run test:profile-slate-surface-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const PROFILE_SURFACE_FILES = [
  "src/components/UserProfileView.tsx",
  "src/components/profile/AvatarSelector.tsx",
  "src/components/settings/SettingsCard.tsx",
  "src/components/settings/SettingsSidebar.tsx",
] as const;

function stripUploadOverlayBlock(source: string): string {
  return source.replace(
    /absolute inset-0 bg-black\/70 backdrop-blur-sm[\s\S]*?<\/div>\s*\) : null\}/,
    "/* upload-overlay-exempt */"
  );
}

console.log("=== /profile slate surface guard ===\n");

const pkg = readFileSync("package.json", "utf8");
const indexCss = readFileSync("src/index.css", "utf8");

const sources = Object.fromEntries(
  PROFILE_SURFACE_FILES.map((path) => [path, readFileSync(path, "utf8")])
) as Record<(typeof PROFILE_SURFACE_FILES)[number], string>;

ok(
  "package script registered",
  pkg.includes("test:profile-slate-surface-guard")
);

ok(
  "canonical dark surface is slate #0f172a",
  /html\.dark[\s\S]*--nonga-bg-surface:\s*#0f172a/.test(indexCss),
  "index.css dark --nonga-bg-surface"
);

for (const path of PROFILE_SURFACE_FILES) {
  const raw = sources[path];
  const withoutOverlay =
    path === "src/components/profile/AvatarSelector.tsx"
      ? stripUploadOverlayBlock(raw)
      : raw;

  ok(
    `${path} bans bg-black/* card shells`,
    !/bg-black\/\d+/.test(withoutOverlay),
    withoutOverlay.match(/bg-black\/\d+/)?.[0] ?? ""
  );
}

const profile = sources["src/components/UserProfileView.tsx"];
const avatar = sources["src/components/profile/AvatarSelector.tsx"];
const card = sources["src/components/settings/SettingsCard.tsx"];
const sidebar = sources["src/components/settings/SettingsSidebar.tsx"];

ok(
  "profile summary mini-card uses nonga-bg-surface",
  profile.includes("nonga-bg-surface backdrop-blur-md"),
  "surfaceMiniCard"
);

ok(
  "demo role switcher card uses nonga-bg-subtle",
  profile.includes("nonga-bg-subtle") && !profile.includes("bg-black/25"),
  "sandbox tools card"
);

ok(
  "settings tab panels use nonga-bg-surface",
  card.includes("nonga-bg-surface backdrop-blur-xl"),
  "SettingsCard dark shell"
);

ok(
  "profile sidebar inactive tabs use nonga-bg-subtle",
  sidebar.includes("nonga-border nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)]"),
  "SettingsSidebar nav items"
);

ok(
  "profile sidebar diagnostics card uses nonga-bg-subtle",
  sidebar.includes("border nonga-border nonga-bg-subtle text-left space-y-2"),
  "cloud diagnostics card"
);

ok(
  "avatar frame uses nonga-bg-elevated",
  avatar.includes("nonga-bg-elevated overflow-hidden shadow-lg"),
  "avatar preview frame"
);

ok(
  "avatar upload dropzone uses nonga-bg-subtle",
  avatar.includes("nonga-border nonga-bg-subtle hover:border-[var(--nonga-border-strong)]"),
  "file upload dropzone idle"
);

ok(
  "avatar preset thumb uses nonga-bg-subtle",
  avatar.includes("w-10 h-10 p-0.5 nonga-bg-subtle rounded-lg"),
  "preset bot thumbnail"
);

ok(
  "upload loading overlay keeps bg-black/70 for contrast",
  avatar.includes("absolute inset-0 bg-black/70 backdrop-blur-sm"),
  "functional upload overlay preserved"
);

if (process.exitCode && process.exitCode !== 0) {
  console.log("\n=== FAIL: /profile still has legacy black card surfaces ===");
} else {
  console.log("\n=== PASS: /profile card surfaces aligned to slate theme tokens ===");
}

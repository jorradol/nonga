/**
 * P0C — Global root/page scrollbar theme parity (Hosting-only)
 *
 * Asserts:
 * - Root/page (html) scrollbar is styled with canonical orange thumb + track var
 * - No universal `*` scrollbar override (nested component scrollbars not forced)
 * - Scrollbar width/height unchanged (6px)
 * - Dark/Light share the same canonical tokens via CSS variables
 * - Per-page component files are not patched for scrollbar styling
 *
 * Run: npx tsx scripts/test-car-post-generator-global-scrollbar-theme-parity.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const cssPath = path.join(root, "src/index.css");
const css = fs.readFileSync(cssPath, "utf8");

const premiumBlock =
  css.match(
    /\/\* Premium scrollbar styling[\s\S]*?\/\* Glassmorphism custom components \*\//
  )?.[0] ?? "";

console.log("--- P0C global root scrollbar theme parity ---");

ok(
  "premium-block-present",
  premiumBlock.length > 0,
  "Premium scrollbar block in index.css"
);

ok(
  "no-universal-star-scrollbar-color",
  !/\*\s*\{[^}]*scrollbar-color\s*:/.test(css),
  "no `* { scrollbar-color: ... }`"
);

ok(
  "no-bare-webkit-scrollbar-pseudo",
  !/(^|\n)\s*::-webkit-scrollbar/.test(premiumBlock),
  "no unscoped ::-webkit-scrollbar in premium block"
);

ok(
  "root-html-firefox-scrollbar-color",
  /html\s*\{[^}]*scrollbar-color:\s*#f97316\s+var\(--nonga-scrollbar-track\)/.test(
    premiumBlock
  ),
  "html { scrollbar-color: #f97316 var(--nonga-scrollbar-track) }"
);

ok(
  "root-html-webkit-scrollbar-sized",
  /html::-webkit-scrollbar\s*\{[^}]*width:\s*6px[^}]*height:\s*6px/.test(
    premiumBlock
  ) ||
    (/html::-webkit-scrollbar\s*\{[^}]*width:\s*6px/.test(premiumBlock) &&
      /html::-webkit-scrollbar\s*\{[^}]*height:\s*6px/.test(premiumBlock)),
  "html::-webkit-scrollbar width/height 6px"
);

ok(
  "root-html-webkit-track-canonical",
  /html::-webkit-scrollbar-track\s*\{[^}]*background:\s*var\(--nonga-scrollbar-track\)/.test(
    premiumBlock
  ),
  "html track uses --nonga-scrollbar-track"
);

ok(
  "root-html-webkit-thumb-orange-500",
  /html::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*#f97316/.test(premiumBlock),
  "thumb #f97316"
);

ok(
  "root-html-webkit-thumb-hover-orange-600",
  /html::-webkit-scrollbar-thumb:hover\s*\{[^}]*background:\s*#ea580c/.test(
    premiumBlock
  ),
  "hover #ea580c"
);

ok(
  "root-html-webkit-thumb-active-orange-700",
  /html::-webkit-scrollbar-thumb:active\s*\{[^}]*background:\s*#c2410c/.test(
    premiumBlock
  ),
  "active #c2410c"
);

ok(
  "canonical-track-token-defined",
  css.includes("--color-scrollbar-track: rgba(148, 163, 184, 0.18)") &&
    css.includes("--nonga-scrollbar-track: var(--color-scrollbar-track)"),
  "track token rgba(148, 163, 184, 0.18)"
);

ok(
  "header-nav-scroll-kept-scoped",
  css.includes(".header-nav-scroll::-webkit-scrollbar") &&
    css.includes("scrollbar-color: #f97316 var(--nonga-scrollbar-track)"),
  "existing header-nav-scroll styles remain"
);

ok(
  "no-per-route-scrollbar-patch-in-dashboard",
  (() => {
    const dash = fs.readFileSync(
      path.join(root, "src/components/ai/post-generator/PostGeneratorDashboard.tsx"),
      "utf8"
    );
    return (
      !dash.includes("scrollbar-color") &&
      !dash.includes("::-webkit-scrollbar") &&
      !dash.includes("scrollbar-thumb")
    );
  })(),
  "PostGeneratorDashboard untouched for scrollbar"
);

ok(
  "evidence-dir-present",
  fs.existsSync(path.join(root, "docs/evidence/p0c-global-scrollbar")),
  "docs/evidence/p0c-global-scrollbar"
);

const evidenceFiles = [
  "after-home.png",
  "after-marketplace.png",
  "after-car-post-generator.png",
  "computed-styles.json",
];
for (const name of evidenceFiles) {
  const p = path.join(root, "docs/evidence/p0c-global-scrollbar", name);
  ok(`evidence-${name}`, fs.existsSync(p) && fs.statSync(p).size > 0, p);
}

if (fs.existsSync(path.join(root, "docs/evidence/p0c-global-scrollbar/computed-styles.json"))) {
  const computed = JSON.parse(
    fs.readFileSync(
      path.join(root, "docs/evidence/p0c-global-scrollbar/computed-styles.json"),
      "utf8"
    )
  ) as {
    thumbVar?: string;
    trackVar?: string;
    scope?: string;
  };
  ok(
    "computed-styles-thumb-canonical",
    computed.thumbVar === "#f97316",
    String(computed.thumbVar)
  );
  ok(
    "computed-styles-track-canonical",
    computed.trackVar === "rgba(148, 163, 184, 0.18)" ||
      computed.trackVar === "var(--nonga-scrollbar-track)",
    String(computed.trackVar)
  );
  ok(
    "computed-styles-scope-root",
    computed.scope === "html" || computed.scope === "root",
    String(computed.scope)
  );
}

ok(
  "no-p0c-finish-cmd-in-worktree",
  !fs.existsSync(path.join(root, "scripts/p0c-finish.cmd")),
  "scripts/p0c-finish.cmd must not ship"
);

if (process.exitCode && process.exitCode !== 0) {
  console.log("\nP0C global root scrollbar theme parity FAILED");
} else {
  console.log("\nP0C global root scrollbar theme parity PASSED");
}

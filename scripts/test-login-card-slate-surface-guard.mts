/**
 * Guard: /login card shell must use the canonical Nong A slate surface token
 * (nonga-bg-surface — dark #0f172a / light #ffffff), not the legacy
 * hard-coded near-black bg-[#0c0c0e] shell.
 *
 * Scope is intentionally limited to Login card color tokens only:
 * - src/components/auth/LoginView.tsx (card shell)
 * - src/components/auth/LoginFormPanel.tsx (surface-tone contrast inside the card)
 * - src/components/chat/ChatLoginModal.tsx (must keep legacy dark tone untouched)
 *
 * Run: npm run test:login-card-slate-surface-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== /login card slate surface guard ===\n");

const pkg = readFileSync("package.json", "utf8");
const indexCss = readFileSync("src/index.css", "utf8");
const loginView = readFileSync("src/components/auth/LoginView.tsx", "utf8");
const loginPanel = readFileSync("src/components/auth/LoginFormPanel.tsx", "utf8");
const chatModal = readFileSync("src/components/chat/ChatLoginModal.tsx", "utf8");

ok(
  "package script registered",
  pkg.includes("test:login-card-slate-surface-guard")
);

ok(
  "canonical dark surface token is slate #0f172a",
  /html\.dark[\s\S]*--nonga-bg-surface:\s*#0f172a/.test(indexCss),
  "index.css dark --nonga-bg-surface"
);

ok(
  "LoginView card shell bans legacy near-black bg-[#0c0c0e]",
  !loginView.includes("bg-[#0c0c0e]")
);

ok(
  "LoginView card shell uses nonga-bg-surface + nonga-border",
  loginView.includes("border nonga-border nonga-bg-surface"),
  "login card shell"
);

ok(
  "LoginView passes surface tone to LoginFormPanel",
  /<LoginFormPanel\s+tone="surface"/.test(loginView)
);

ok(
  "LoginFormPanel surface inputs use token-backed colors",
  loginPanel.includes("bg-[var(--nonga-bg-subtle)]") &&
    loginPanel.includes("text-[var(--nonga-text-primary)]") &&
    loginPanel.includes("placeholder-[var(--nonga-text-placeholder)]"),
  "surface-tone inputClass"
);

ok(
  "LoginFormPanel surface divider mask matches card surface",
  loginPanel.includes("bg-[var(--nonga-bg-surface)]"),
  "หรือ divider label"
);

ok(
  "LoginFormPanel default tone stays dark (chat modal unchanged)",
  loginPanel.includes('tone = "dark"')
);

ok(
  "ChatLoginModal keeps legacy dark tone (no surface tone prop)",
  !chatModal.includes('tone="surface"') && chatModal.includes("bg-slate-950")
);

if (process.exitCode && process.exitCode !== 0) {
  console.log("\n=== FAIL: /login card is not aligned to slate surface tokens ===");
} else {
  console.log("\n=== PASS: /login card aligned to canonical slate surface token ===");
}

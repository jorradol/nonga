/**
 * v5.4.6-mobile.2 — Playwright mobile layout smoke (composer visible, chat full width)
 * npm run test:v546-mobile-chat-layout-playwright
 *
 * Set MOBILE_CHAT_TEST_URL to override (default: https://nonga-ce93c.web.app)
 */
import { chromium, devices } from "playwright";

const BASE_URL =
  process.env.MOBILE_CHAT_TEST_URL?.trim() || "https://nonga-ce93c.web.app/";

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`=== v5.4.6-mobile Playwright layout (${BASE_URL}) ===\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 12"],
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("#chat-container", { timeout: 30_000 });

  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sidebar = document.getElementById("chat-sidebar-wrapper");
    const container = document.getElementById("chat-container");
    const composer = document.getElementById("chat-input-toolbar");
    const textarea = document.getElementById("chat-textarea-elt");
    if (!sidebar || !container || !composer || !textarea) {
      return { error: "missing-elements" as const };
    }
    const sideStyle = getComputedStyle(sidebar);
    const cr = container.getBoundingClientRect();
    const pr = composer.getBoundingClientRect();
    const tr = textarea.getBoundingClientRect();
    return {
      vw,
      vh,
      sidebarPosition: sideStyle.position,
      containerLeft: cr.left,
      containerWidth: cr.width,
      containerWidthRatio: cr.width / vw,
      composerBottom: pr.bottom,
      composerTop: pr.top,
      textareaClickable:
        tr.width > 0 && tr.height > 0 && pr.bottom <= vh + 2 && pr.top < vh,
      composerInViewport: pr.bottom <= vh + 2 && pr.top < vh,
    };
  });

  if ("error" in metrics) fail("dom-elements", metrics.error);

  if (metrics.sidebarPosition !== "fixed") {
    fail("sidebar-off-flex-flow", `position=${metrics.sidebarPosition}`);
  }
  pass("sidebar-position-fixed-on-mobile");

  if (metrics.containerWidthRatio < 0.92) {
    fail(
      "chat-full-width",
      `width=${metrics.containerWidth}px vw=${metrics.vw}px ratio=${metrics.containerWidthRatio.toFixed(2)}`
    );
  }
  pass("chat-container-full-viewport-width");

  if (metrics.containerLeft > 8) {
    fail("chat-not-offset", `left=${metrics.containerLeft}`);
  }
  pass("chat-container-not-pushed-by-sidebar");

  if (!metrics.composerInViewport) {
    fail(
      "composer-in-viewport",
      `top=${metrics.composerTop} bottom=${metrics.composerBottom} vh=${metrics.vh}`
    );
  }
  pass("composer-visible-in-viewport");

  await textareaFocusCheck(page);
  pass("textarea-focusable");

  await browser.close();
  console.log("\n=== Playwright mobile layout — OK ===\n");
}

async function textareaFocusCheck(
  page: import("playwright").Page
): Promise<void> {
  const textarea = page.locator("#chat-textarea-elt");
  await textarea.click({ timeout: 10_000 });
  const focused = await textarea.evaluate((el) => document.activeElement === el);
  if (!focused) fail("textarea-focus", "activeElement mismatch");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

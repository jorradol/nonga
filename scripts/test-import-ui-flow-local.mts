import path from "path";
import { chromium } from "playwright";

function ok(name: string, pass: boolean, detail = ""): void {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` ${detail}` : ""}`);
  if (!pass) process.exitCode = 1;
}

async function main() {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const csvPath = path.resolve(
    process.cwd(),
    "public/samples/ThorAuto-sample-with-data.csv"
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem(
      "nonga_auth_session",
      JSON.stringify({
        uid: "admin-import-ui-local",
        email: "admin-local@example.com",
        displayName: "Admin Local",
        role: "admin",
        status: "active",
        providerId: "password",
        isSimulated: false,
      })
    );
    localStorage.setItem(
      "nonga_simulated_users",
      JSON.stringify({
        "admin-import-ui-local": { uid: "admin-import-ui-local", role: "admin" },
      })
    );
  });

  try {
    await page.goto(`${baseUrl}/admin/inventory-import`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1200);
    ok(
      "1-route-admin-import",
      page.url().includes("/admin/inventory-import"),
      page.url()
    );

    const picker = page.locator('input[type="file"]');
    const pickerCount = await picker.count();
    if (pickerCount === 0) {
      const bodyPreview = (await page.locator("body").innerText())
        .replace(/\s+/g, " ")
        .slice(0, 220);
      ok("1b-file-picker-present", false, bodyPreview);
      return;
    }
    await picker.setInputFiles(csvPath);
    await page.getByRole("button", { name: "Preview Data" }).click();

    await page.getByText("Column Mapping (Phase 2)").waitFor({ timeout: 10000 });
    ok("2-column-mapping-visible", true);

    await page.getByRole("button", { name: "Reset Mapping" }).click();
    const continueBtn = page.getByRole("button", {
      name: "Continue to Clean & Validate",
    });
    const disabledAfterReset = await continueBtn.isDisabled();
    ok("3-continue-disabled-when-required-missing", disabledAfterReset);

    const reasonText = await page
      .locator('[data-testid="mapping-continue-disabled-reasons"]')
      .innerText();
    ok(
      "3b-reason-brand-year-price-visible",
      /ยี่ห้อ/.test(reasonText) &&
        /รุ่น/.test(reasonText) &&
        /ปี/.test(reasonText) &&
        /ราคา/.test(reasonText),
      reasonText.replace(/\s+/g, " ").slice(0, 160)
    );

    await page.getByRole("button", { name: "Apply Auto Mapping" }).click();
    await page.waitForTimeout(250);
    const enabledAfterAutoMapping = !(await continueBtn.isDisabled());
    ok("4-continue-enabled-when-mapping-sufficient", enabledAfterAutoMapping);

    await continueBtn.click();
    await page.getByText("Smart Clean & Validate").waitFor({ timeout: 10000 });
    ok("5-clean-validate-reached", true);

    const prepareBtn = page.getByRole("button", { name: "Prepare Import" });
    const prepareEnabled = !(await prepareBtn.isDisabled());
    ok("6-prepare-import-enabled", prepareEnabled);
    await prepareBtn.click();

    await page.getByText("Smart Import Review").waitFor({ timeout: 10000 });
    ok("7-smart-review-reached", true);

    await page
      .getByRole("button", { name: "ตรวจสอบข้อมูลและยืนยันนำเข้า" })
      .click();
    await page.getByText("Import Preview / Confirmation").waitFor({
      timeout: 10000,
    });
    ok("8-confirm-section-reached", true);

    await page.getByRole("button", { name: "Confirm Import" }).click();
    const successBanner = page.getByText("นำเข้า Marketplace สำเร็จ!");
    const errorBanner = page.locator(".text-red-300");
    const success = await Promise.race([
      successBanner
        .waitFor({ timeout: 18000 })
        .then(() => true)
        .catch(() => false),
      errorBanner
        .first()
        .waitFor({ timeout: 18000 })
        .then(() => false)
        .catch(() => false),
    ]);
    ok("9-confirm-import-success", success);

    if (success) {
      await page.getByRole("button", { name: "Marketplace →" }).click();
      await page.waitForTimeout(1200);
      ok(
        "10-marketplace-route-reached",
        page.url().includes("/marketplace"),
        page.url()
      );
    } else {
      const errorText = (await errorBanner.first().innerText().catch(() => "unknown"))
        .replace(/\s+/g, " ")
        .slice(0, 200);
      ok("10-confirm-import-error-surface", errorText.length > 0, errorText);
    }
  } finally {
    await browser.close();
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

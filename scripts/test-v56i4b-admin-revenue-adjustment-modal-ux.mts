/**
 * v5.6I.4b — Admin revenue adjustment modal UX polish
 * npm run test:v56i4b-admin-revenue-adjustment-modal-ux
 */
import { readFileSync } from "node:fs";
import {
  ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS,
  ADMIN_REVENUE_ADJUSTMENT_MODAL_TITLE,
  ADMIN_REVENUE_ADJUSTMENT_NO_REAL_PAYMENT_NOTE,
} from "../src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const modal = readFileSync(
  "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
  "utf8"
);
const admin = readFileSync(
  "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
  "utf8"
);
const v56i4 = readFileSync(
  "scripts/test-v56i4-admin-manual-settlement-adjustments.mts",
  "utf8"
);

// --- modal layout ---
{
  ok("modal title constant", ADMIN_REVENUE_ADJUSTMENT_MODAL_TITLE.includes("ปรับยอด"));
  ok("modal header testid", modal.includes("admin-revenue-adjustment-modal-header"));
  ok("modal footer testid", modal.includes("admin-revenue-adjustment-modal-footer"));
  ok("modal body scrollable", modal.includes("admin-revenue-adjustment-modal-body"));
  ok(
    "max height 90vh",
    modal.includes("max-h-[min(90vh") || modal.includes("90vh")
  );
  ok("max width desktop", modal.includes("max-w-3xl"));
  ok("backdrop blur", modal.includes("backdrop-blur"));
  ok("no horizontal overflow body", modal.includes("overflow-x-hidden"));
  ok("summary fee paid remaining", modal.includes("admin-revenue-adjustment-summary-fee"));
  ok("manual badge", modal.includes("admin-revenue-adjustment-manual-badge"));
  ok("no real payment note", modal.includes(ADMIN_REVENUE_ADJUSTMENT_NO_REAL_PAYMENT_NOTE));
  ok("body scroll lock", modal.includes("document.body.style.overflow"));
}

// --- action helpers ---
{
  ok("helper partial payment", ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS.partial_payment.includes("บางส่วน"));
  ok("helper mark paid", ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS.mark_paid.includes("0"));
  ok("helper waive", ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS.waive_fee.includes("ยกเว้น"));
  ok("helper admin note", ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS.admin_note.includes("ไม่เปลี่ยนยอด"));
  ok("helper renders in modal", modal.includes("admin-revenue-adjustment-action-helper"));
  ok(
    "helper changes by action",
    modal.includes("ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS[action]")
  );
}

// --- form / validation ---
{
  ok("reason required label", modal.includes("เหตุผล (จำเป็น)"));
  ok("admin note optional label", modal.includes("หมายเหตุ admin (ไม่บังคับ)"));
  ok("amount field conditional", modal.includes("needsAmount"));
  ok("amount inputMode decimal", modal.includes('inputMode="decimal"'));
  ok("amount suffix baht", modal.includes("บาท"));
  ok("amount placeholder", modal.includes("เช่น 1000"));
  ok("field error under reason", modal.includes("admin-revenue-adjustment-reason-error"));
  ok("submit disabled when invalid", modal.includes("disabled={!canSubmit}"));
  ok("submit label confirm", modal.includes("ยืนยันปรับยอด"));
  ok("submitting label", modal.includes("กำลังบันทึก"));
  ok("escape close", modal.includes('e.key === "Escape"'));
  ok("close disabled while submitting", modal.includes("disabled={submitting}"));
  ok("no payment gateway", !modal.toLowerCase().includes("stripe"));
  ok("no invoice", !modal.includes("createInvoice"));
}

// --- no business logic change ---
{
  ok("still calls onSubmit", modal.includes("await onSubmit("));
  ok("same action options", modal.includes("partial_payment"));
  ok("same api payload shape", modal.includes("listingId: row.listingId"));
  ok(
    "v56i4 post route unchanged",
    v56i4.includes('app.post("/api/admin/revenue/adjustments"')
  );
}

// --- admin table regression ---
{
  ok("adjust btn under listing", admin.includes("admin-revenue-adjust-btn-${row.id}"));
  ok("mobile card adjust", admin.includes("admin-revenue-adjust-btn-card-"));
  ok("scroll hint remains", admin.includes("admin-revenue-table-scroll-hint"));
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.4b-admin-revenue-adjustment-modal-ux-polish.md",
    "utf8"
  );
  ok("doc frontend only", doc.includes("frontend-only"));
  ok("doc footer", doc.includes("Footer"));
  ok("doc 90vh", doc.includes("90vh"));
}

console.log("\nDone v5.6I.4b admin revenue adjustment modal UX tests.");
if (process.exitCode) process.exit(process.exitCode);

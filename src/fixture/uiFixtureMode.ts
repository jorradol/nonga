/**
 * Compile-time Hosting-only UI fixture gate.
 * Production builds must leave VITE_NONGA_UI_FIXTURE unset/false so this folds to false
 * and fixture-only modules are tree-shaken.
 */

export const UI_FIXTURE_DISABLED_REASON = "ปิดในโหมดตรวจสอบหน้าจอ";

export const UI_FIXTURE_BANNER_TEXT =
  "ข้อมูลสมมติสำหรับตรวจสอบหน้าจอ — ไม่ใช่ประกาศขายจริง";

export const UI_FIXTURE_ROLE_BANNER_PREFIX = "มุมมองจำลอง (ไม่ใช่การเข้าสู่ระบบจริง):";

/** Static compare so Vite can constant-fold and tree-shake. */
export const isUiFixtureBuild: boolean =
  import.meta.env.VITE_NONGA_UI_FIXTURE === "true";

export function assertUiFixtureOnly(context: string): void {
  if (!isUiFixtureBuild) {
    throw new Error(`${context}: UI fixture APIs must not run outside fixture builds`);
  }
}

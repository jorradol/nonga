/**
 * Compile-time Hosting-only UI fixture gate.
 * Production / Canonical Staging builds must leave VITE_NONGA_UI_FIXTURE unset/false
 * so this folds to false and fixture-only modules are tree-shaken.
 *
 * Node/esbuild CJS (Cloud Run `dist/server.cjs`) defines `import.meta` but NOT
 * `import.meta.env`. A bare `import.meta.env.VITE_*` read crashes process startup
 * before the server listens — guard the access and fail closed to fixture=false.
 */

export const UI_FIXTURE_DISABLED_REASON = "ปิดในโหมดตรวจสอบหน้าจอ";

export const UI_FIXTURE_BANNER_TEXT =
  "ข้อมูลสมมติสำหรับตรวจสอบหน้าจอ — ไม่ใช่ประกาศขายจริง";

export const UI_FIXTURE_ROLE_BANNER_PREFIX = "มุมมองจำลอง (ไม่ใช่การเข้าสู่ระบบจริง):";

/**
 * Static compare so Vite can constant-fold and tree-shake on client builds.
 * Short-circuit when `import.meta.env` is missing (Node/server bundle).
 */
export const isUiFixtureBuild: boolean =
  typeof import.meta.env !== "undefined" &&
  import.meta.env.VITE_NONGA_UI_FIXTURE === "true";

export function assertUiFixtureOnly(context: string): void {
  if (!isUiFixtureBuild) {
    throw new Error(`${context}: UI fixture APIs must not run outside fixture builds`);
  }
}

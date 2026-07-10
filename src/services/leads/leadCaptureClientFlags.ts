/**
 * v22.30 — Client read of leadCaptureEnabled from /api/health (boolean only).
 * Fail-closed. UI is not the security boundary — backend kill switch is authoritative.
 */

let cached: { value: boolean; at: number } | null = null;
const TTL_MS = 60_000;

/** Test-only override; null = use health fetch. Never set from production UI. */
let testOverride: boolean | null = null;

export async function fetchLeadCaptureEnabled(
  options?: { force?: boolean }
): Promise<boolean> {
  if (testOverride !== null) {
    return testOverride;
  }
  const now = Date.now();
  if (
    !options?.force &&
    cached &&
    now - cached.at < TTL_MS
  ) {
    return cached.value;
  }
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as {
      leadCaptureEnabled?: boolean;
    } | null;
    // Fail closed: missing/unknown → treat as OFF.
    // Only exact boolean true enables; no query string, browser storage, or DTO can enable.
    const value = json?.leadCaptureEnabled === true;
    cached = { value, at: now };
    return value;
  } catch {
    cached = { value: false, at: now };
    return false;
  }
}

/** Test helper — reset cache. */
export function resetLeadCaptureEnabledCacheForTests(): void {
  cached = null;
}

/**
 * Test helper — force client flag without hitting /api/health.
 * Pass null to clear override. Do not use in production UI.
 */
export function setLeadCaptureEnabledForTests(value: boolean | null): void {
  testOverride = value;
  cached = null;
}

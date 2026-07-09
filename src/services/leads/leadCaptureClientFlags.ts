/**
 * v22.30 — Client read of leadCaptureEnabled from /api/health (boolean only).
 */

let cached: { value: boolean; at: number } | null = null;
const TTL_MS = 60_000;

export async function fetchLeadCaptureEnabled(
  options?: { force?: boolean }
): Promise<boolean> {
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
    const value = json?.leadCaptureEnabled === true;
    cached = { value, at: now };
    return value;
  } catch {
    cached = { value: false, at: now };
    return false;
  }
}

/** Test helper */
export function resetLeadCaptureEnabledCacheForTests(): void {
  cached = null;
}

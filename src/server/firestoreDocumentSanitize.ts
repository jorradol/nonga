/**
 * Remove undefined values before Firestore writes.
 * Prefer explicit cleaning over ignoreUndefinedProperties so schema stays predictable.
 */

export function documentContainsUndefined(
  value: unknown,
  path = ""
): string | null {
  if (value === undefined) {
    return path || "(root)";
  }
  if (value === null || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = documentContainsUndefined(value[index], `${path}[${index}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;
    const hit = documentContainsUndefined(nested, nextPath);
    if (hit) return hit;
  }
  return null;
}

export function sanitizeFirestoreDocument<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreDocument(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    out[key] = sanitizeFirestoreDocument(nested);
  }
  return out as T;
}

export function assertFirestoreDocument<T>(value: T): T {
  const path = documentContainsUndefined(value);
  if (path) {
    throw new Error(
      `Cannot use "undefined" as a Firestore value (found in field "${path}").`
    );
  }
  return value;
}

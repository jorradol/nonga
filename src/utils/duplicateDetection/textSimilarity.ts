/** คะแนนความคล้ายข้อความ 0–1 */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(s: string): Set<string> {
  const n = normalizeText(s);
  if (!n) return new Set();
  return new Set(n.split(" ").filter((t) => t.length > 1));
}

export function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) {
    if (sb.has(t)) inter++;
  }
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

export function normalizeVin(vin: string): string {
  return vin.replace(/[\s-]/g, "").toUpperCase();
}

export function normalizePlate(plate: string): string {
  return plate.replace(/[\s-]/g, "").toUpperCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9);
}

/** ดึง VIN จากข้อความ (17 ตัวอักษร) */
export function extractVinFromText(text: string): string {
  const m = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  return m ? normalizeVin(m[1]) : "";
}

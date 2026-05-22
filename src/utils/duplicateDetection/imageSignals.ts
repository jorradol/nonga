/**
 * Image duplicate signals — filename, normalized URL, simple hash.
 * Architecture ready for future AI similarity (see compareImageSimilarity).
 */

export interface ImageFingerprint {
  filename: string;
  normalizedUrl: string;
  contentHash: string;
}

export interface ImageMatchResult {
  score: number;
  reasons: string[];
}

/** ลบ query string / resize params สำหรับเปรียบเทียบ URL */
export function normalizeImageUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  try {
    const parsed = new URL(u, "http://local");
    parsed.search = "";
    let path = parsed.pathname.toLowerCase();
    path = path.replace(/\/(thumb|small|medium|large|w\d+|h\d+)\//g, "/");
    return `${parsed.hostname}${path}`;
  } catch {
    return u
      .split("?")[0]
      .toLowerCase()
      .replace(/\/(w|h)=\d+/g, "");
  }
}

export function imageFilenameFromUrl(url: string): string {
  const clean = url.split("?")[0];
  const parts = clean.split("/");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

/** djb2 hash — เตรียมต่อยอด AI embedding ในอนาคต */
export function simpleImageContentHash(url: string): string {
  const base = normalizeImageUrl(url) || url;
  let h = 5381;
  for (let i = 0; i < base.length; i++) {
    h = (h * 33) ^ base.charCodeAt(i);
  }
  return `img-${(h >>> 0).toString(16)}`;
}

export function buildImageFingerprints(urls: string[]): ImageFingerprint[] {
  return urls
    .filter((u) => u && !u.includes("unsplash.com/photo-1533473359331"))
    .map((url) => ({
      filename: imageFilenameFromUrl(url),
      normalizedUrl: normalizeImageUrl(url),
      contentHash: simpleImageContentHash(url),
    }));
}

/**
 * เปรียบเทียบชุดรูป — คืนคะแนน 0–100
 * Future: plug AI similarity into compareImageSimilarity()
 */
export function compareImageSets(
  a: string[],
  b: string[]
): ImageMatchResult {
  const fa = buildImageFingerprints(a);
  const fb = buildImageFingerprints(b);
  if (fa.length === 0 || fb.length === 0) {
    return { score: 0, reasons: [] };
  }

  const reasons: string[] = [];
  let best = 0;

  for (const ia of fa) {
    for (const ib of fb) {
      let pair = 0;
      if (ia.contentHash === ib.contentHash) {
        pair = 100;
        reasons.push("image_hash_match");
      } else if (
        ia.normalizedUrl &&
        ia.normalizedUrl === ib.normalizedUrl
      ) {
        pair = 90;
        reasons.push("image_url_match");
      } else if (
        ia.filename.length > 4 &&
        ia.filename === ib.filename
      ) {
        pair = 75;
        reasons.push("image_filename_match");
      }
      if (pair > best) best = pair;
    }
  }

  return { score: best, reasons: [...new Set(reasons)] };
}

/** Hook สำหรับ AI image similarity ในอนาคต */
export type AiImageSimilarityFn = (
  urlA: string,
  urlB: string
) => Promise<number>;

let aiImageSimilarity: AiImageSimilarityFn | null = null;

export function registerAiImageSimilarity(fn: AiImageSimilarityFn): void {
  aiImageSimilarity = fn;
}

export async function compareImageSimilarity(
  urlA: string,
  urlB: string
): Promise<number> {
  if (aiImageSimilarity) {
    return aiImageSimilarity(urlA, urlB);
  }
  const { score } = compareImageSets([urlA], [urlB]);
  return score;
}

import { GeneratedPosts } from "../../../types/ai/post-generator";

const DEFAULT_FETCH_TIMEOUT_MS = 90_000;

/** fetch พร้อม timeout — ป้องกัน loading ค้าง */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** ตัด HTML/script และ normalize ข้อความจาก AI */
export function sanitizeAiText(text: unknown, maxLen = 12000): string {
  if (text === undefined || text === null) return "";
  let s = String(text)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\0/g, "")
    .trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen) + "…";
  }
  return s;
}

/** ลดบรรทัดซ้ำติดกัน และช่องว่างเกิน */
export function normalizePostText(text: string): string {
  const lines = text.split("\n");
  const deduped: string[] = [];
  let prev = "";
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed && trimmed === prev) continue;
    deduped.push(line);
    prev = trimmed;
  }
  return deduped
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** ทำความสะอาดแฮชแท็ก */
export function sanitizeTags(tags: unknown, max = 15): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = sanitizeAiText(raw, 40)
      .replace(/^#+/, "")
      .replace(/\s+/g, "")
      .trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

/** ตรวจและทำความสะอาดผลลัพธ์ GeneratedPosts */
export function sanitizeGeneratedPosts(
  posts: Partial<GeneratedPosts> | null | undefined,
  fallback: GeneratedPosts
): GeneratedPosts {
  if (!posts || typeof posts !== "object") {
    return fallback;
  }

  return {
    facebook: normalizePostText(
      sanitizeAiText(posts.facebook, 8000) || fallback.facebook
    ),
    tiktok: normalizePostText(
      sanitizeAiText(posts.tiktok, 2000) || fallback.tiktok
    ),
    seoDescription: normalizePostText(
      sanitizeAiText(posts.seoDescription, 3000) || fallback.seoDescription
    ),
    marketplaceTitle: sanitizeAiText(posts.marketplaceTitle, 100) || fallback.marketplaceTitle,
    shortCaption: normalizePostText(
      sanitizeAiText(posts.shortCaption, 500) || fallback.shortCaption
    ),
    viralHook: sanitizeAiText(posts.viralHook, 200) || fallback.viralHook,
    closingCta: sanitizeAiText(posts.closingCta, 300) || fallback.closingCta,
    tags:
      sanitizeTags(posts.tags).length > 0
        ? sanitizeTags(posts.tags)
        : fallback.tags,
  };
}

/** ตรวจสเปกขั้นต่ำก่อนเรียก API */
export function validateCarSpecsInput(specs: {
  brand?: string;
  model?: string;
  year?: string | number;
}): string | null {
  if (!specs.brand?.trim()) return "กรุณาระบุยี่ห้อรถ";
  if (!specs.model?.trim()) return "กรุณาระบุรุ่นรถ";
  if (!specs.year || String(specs.year).trim() === "") return "กรุณาระบุปีรถ";
  return null;
}

/** Hosting honesty gate — ข้อความเมื่อ server คืน isMock */
export const POST_GENERATE_MOCK_ERROR =
  "ขณะนี้ระบบสร้างโพสต์ด้วย AI ไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้งครับ";

/** Hosting honesty gate — ข้อความเมื่อ generate ล้มเหลว */
export const POST_GENERATE_FAILED_ERROR =
  "สร้างโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้งครับ";

export type PostGenerateApiPayload = {
  success?: boolean;
  isMock?: boolean;
  posts?: Partial<GeneratedPosts> | null;
};

/**
 * Hosting-only honesty gate for Car Post Generator.
 * Real AI success only — mock or invalid payload must not surface as success.
 */
export function evaluatePostGenerateHonesty(
  data: PostGenerateApiPayload
): { ok: true } | { ok: false; reason: "mock" | "invalid" } {
  if (data.isMock === true) {
    return { ok: false, reason: "mock" };
  }
  if (!data.success || !data.posts || typeof data.posts !== "object") {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}

/** Quota may be deducted only after a real (non-mock) generate success. */
export function shouldDeductPostGenerationQuota(
  honesty: ReturnType<typeof evaluatePostGenerateHonesty>
): boolean {
  return honesty.ok === true;
}

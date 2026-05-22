/**
 * จัดรูปแบบการแสดงรายละเอียดประกาศ — ไม่แก้/ไม่ตัด/ไม่ rewrite เนื้อหา
 * แยกบล็อกเพื่อ spacing และ typography เท่านั้น
 */

export type ListingDescriptionBlockType =
  | "spacing"
  | "heading"
  | "paragraph"
  | "bullets";

export interface ListingDescriptionBlock {
  type: ListingDescriptionBlockType;
  /** บรรทัดต้นฉบับ — คงอักขระทุกตัว */
  lines: string[];
}

const EMOJI_LEAD =
  /^[\s]*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|[\uD83C][\uDF00-\uDFFF])+/u;

const SECTION_KEYWORDS =
  /^(จุดเด่น|รายละเอียด|โปรโมชั่น|โปรโมชัน|สเปก|เงื่อนไข|หมายเหตุ|ไฮไลท์|คุณสมบัติ|สรุป)/i;

/** คงเฉพาะ line endings — ไม่ trim เนื้อหา */
export function normalizeListingDescriptionRaw(
  text: string | null | undefined
): string {
  if (text == null) return "";
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function isListingDescriptionBlankLine(line: string): boolean {
  return line.length === 0 || /^\s+$/.test(line);
}

export function isListingBulletLine(line: string): boolean {
  return /^\s*(?:[-–—•*·◦▪]\s+|\d+[\.\)]\s+)\S/.test(line);
}

export function isListingSectionHeading(line: string): boolean {
  if (isListingDescriptionBlankLine(line) || isListingBulletLine(line)) {
    return false;
  }
  const trimmed = line.trimStart();
  if (SECTION_KEYWORDS.test(trimmed)) return true;
  if (EMOJI_LEAD.test(line) && line.length <= 120) return true;
  return false;
}

/**
 * แยกข้อความเป็นบล็อกสำหรับ render — เนื้อหาทุกบรรทัดเหมือนต้นฉบับ
 */
export function formatListingDescription(
  text: string | null | undefined
): ListingDescriptionBlock[] {
  const normalized = normalizeListingDescriptionRaw(text);
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: ListingDescriptionBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isListingDescriptionBlankLine(line)) {
      blocks.push({ type: "spacing", lines: [line] });
      i += 1;
      continue;
    }

    if (isListingSectionHeading(line)) {
      blocks.push({ type: "heading", lines: [line] });
      i += 1;
      continue;
    }

    if (isListingBulletLine(line)) {
      const items: string[] = [];
      while (i < lines.length && isListingBulletLine(lines[i])) {
        items.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "bullets", lines: items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (isListingDescriptionBlankLine(l)) break;
      if (isListingSectionHeading(l) || isListingBulletLine(l)) break;
      para.push(l);
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: para });
  }

  return blocks;
}

/** รวมบล็อกกลับเป็นข้อความ — ใช้ใน test ยืนยันไม่สูญเนื้อหา */
export function joinListingDescriptionBlocks(
  blocks: ListingDescriptionBlock[]
): string {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.type === "spacing") {
      out.push(block.lines[0] ?? "");
    } else {
      for (const line of block.lines) {
        out.push(line);
      }
    }
  }
  return out.join("\n");
}

/** ตรวจว่าเนื้อหาหลัง format ตรงต้นฉบับ (หลัง normalize line endings) */
export function listingDescriptionPreservesContent(
  original: string,
  blocks: ListingDescriptionBlock[]
): boolean {
  const norm = normalizeListingDescriptionRaw(original);
  return joinListingDescriptionBlocks(blocks) === norm;
}

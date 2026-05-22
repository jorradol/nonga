/**
 * npm run test:listing-description-format
 */
import assert from "node:assert/strict";
import {
  formatListingDescription,
  listingDescriptionPreservesContent,
  normalizeListingDescriptionRaw,
  isListingBulletLine,
  isListingSectionHeading,
} from "../src/utils/formatListingDescription.ts";

const thaiMulti = `🚗 จุดเด่น
รถสภาพดี มือเดียว
- ไม่เคยชน
- บำรุงศูนย์ครบ

📌 รายละเอียด
เลขไมล์จริง 45000 กม.

💰 โปรโมชั่น
ผ่อน 0% 4 ปี`;

assert.ok(isListingSectionHeading("🚗 จุดเด่น"));
assert.ok(isListingBulletLine("- ไม่เคยชน"));
assert.ok(isListingBulletLine("1. รายการแรก"));

const blocks = formatListingDescription(thaiMulti);
assert.ok(
  listingDescriptionPreservesContent(thaiMulti, blocks),
  "preserves Thai multi-paragraph content"
);

const emojiOnly = "✨ สวยมาก\n\n• แต่งเต็ม\n• ล้อแม็ก";
const b2 = formatListingDescription(emojiOnly);
assert.ok(listingDescriptionPreservesContent(emojiOnly, b2));

const crlf = "บรรทัดหนึ่ง\r\nบรรทัดสอง\r\n\r\nย่อหน้าสอง";
const norm = normalizeListingDescriptionRaw(crlf);
assert.equal(norm, "บรรทัดหนึ่ง\nบรรทัดสอง\n\nย่อหน้าสอง");
assert.ok(
  listingDescriptionPreservesContent(crlf, formatListingDescription(crlf))
);

const longLine = "ก".repeat(500) + "\n\n" + "🚗 หัวข้อ";
assert.ok(listingDescriptionPreservesContent(longLine, formatListingDescription(longLine)));

assert.ok(
  blocks.some((b) => b.type === "heading"),
  "has heading blocks"
);
assert.ok(
  blocks.some((b) => b.type === "bullets"),
  "has bullet blocks"
);

console.log("test:listing-description-format — OK");

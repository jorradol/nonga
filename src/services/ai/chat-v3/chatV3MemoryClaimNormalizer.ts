/**
 * WP-NVB-02E — Narrow factual normalizer for unsupported completed durable-memory claims.
 * Deterministic and pure. Does not call a provider. Does not fabricate a persistence result.
 */

export interface ChatV3MemoryClaimNormalizerOptions {
  /**
   * Trusted execution-context flag: a successful authoritative persistence write
   * already occurred for this turn. Default is no durable write.
   */
  readonly authoritativeDurableWriteSucceeded?: boolean;
}

const SESSION_SCOPE_PREFIX = "รับทราบค่ะ ในบทสนทนานี้เอจะจำไว้";

const COMPLETED_FIRST_PERSON_DURABLE_CLAIM_RES: readonly RegExp[] = [
  /จำใส่เมมโมรี่ไว้เรียบร้อยแล้ว/g,
  /เอเซฟข้อมูลการใช้งานไว้แล้ว/g,
  /เซฟข้อมูล(?:การใช้งาน)?ไว้แล้ว/g,
  /บันทึกไว้ในระบบแล้ว/g,
  /จำถาวรแล้ว/g,
  /ไม่มีลืมแน่นอน/g,
  /จำไว้ในระบบแล้ว/g,
  /บันทึกโปรไฟล์(?:ไว้)?แล้ว/g,
];

function hasCompletedFirstPersonDurableClaim(text: string): boolean {
  return COMPLETED_FIRST_PERSON_DURABLE_CLAIM_RES.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

function isMemoryQuestion(text: string): boolean {
  return (
    /มีเมมโมรี่ไหม|ระบบนี้มี(?:เมมโมรี่|ความจำ)|ความจำถาวรไหม|จำถาวรได้ไหม/.test(
      text
    ) ||
    /ถ้าบันทึกข้อมูลได้จะทำอย่างไร|จะบันทึก(?:ข้อมูล|ความจำ)อย่างไร/.test(text) ||
    /(?:ถาม|สอบถาม).{0,24}(?:เมมโมรี่|ความจำถาวร)/.test(text)
  );
}

function isHypotheticalMemoryDiscussion(text: string): boolean {
  return (
    /ถ้า(?:จะ)?(?:จำถาวร|บันทึกถาวร|เซฟ(?:ไว้)?ในระบบ|มีเมมโมรี่ถาวร)/.test(
      text
    ) || /สมมติว่า.{0,40}(?:เมมโมรี่|ความจำถาวร|บันทึกโปรไฟล์)/.test(text)
  );
}

function isThirdPersonOrFeatureExplanation(text: string): boolean {
  const firstPersonCompleted = hasCompletedFirstPersonDurableClaim(text);
  if (firstPersonCompleted) return false;
  return (
    /ระบบ(?:นี้)?สามารถ(?:บันทึก|จำ)/.test(text) ||
    /ผู้ช่วยจำข้อมูลได้/.test(text) ||
    /ความจำของระบบ/.test(text) ||
    /ฟีเจอร์ความจำ/.test(text)
  );
}

function stripCompletedDurableClaimPhrases(text: string): string {
  let next = text;
  for (const re of COMPLETED_FIRST_PERSON_DURABLE_CLAIM_RES) {
    re.lastIndex = 0;
    next = next.replace(re, " ");
  }
  return next.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function extractRememberedFact(remainder: string): string | null {
  const labeled = remainder.match(
    /(?:ว่า|ว่าลุง|ว่าพี่)\s*([^。.!?\n]+)/
  );
  if (labeled?.[1]?.trim()) {
    return labeled[1].trim().replace(/^ว่า\s*/, "");
  }
  const cityAuto = remainder.match(
    /(?:ลุง|พี่|คุณ)?ใช้รถในเมือง[^。.!?\n]{0,80}เกียร์ออโต้|ชอบเกียร์ออโต้[^。.!?\n]{0,80}ในเมือง|ใช้รถในเมืองและชอบเกียร์ออโต้/
  );
  if (cityAuto?.[0]?.trim()) {
    return cityAuto[0].trim();
  }
  return null;
}

function rewriteUnsupportedDurableClaim(text: string): string {
  const remainder = stripCompletedDurableClaimPhrases(text);
  const fact = extractRememberedFact(remainder);
  if (fact) {
    const leftover = remainder
      .replace(fact, " ")
      .replace(/^(?:ว่า|ได้ครับ|ได้ค่ะ)\s*/u, "")
      .replace(/\s+/g, " ")
      .trim();
    const core = `${SESSION_SCOPE_PREFIX}ว่า${fact}`;
    if (leftover && leftover !== fact) {
      return `${core} ${leftover}`.replace(/\s+/g, " ").trim();
    }
    return core;
  }
  if (remainder) {
    return `${SESSION_SCOPE_PREFIX} ${remainder}`.replace(/\s+/g, " ").trim();
  }
  return `${SESSION_SCOPE_PREFIX}สิ่งที่คุยกันในบทสนทนานี้`;
}

/**
 * Replace unsupported first-person completed durable-save claims with
 * current-conversation language. Leaves questions, hypotheticals, and
 * third-person explanations unchanged.
 */
export function normalizeChatV3UnsupportedDurableMemoryClaims(
  content: string,
  options: ChatV3MemoryClaimNormalizerOptions = {}
): string {
  if (typeof content !== "string") {
    return "";
  }
  if (!content.trim()) {
    return content;
  }
  if (options.authoritativeDurableWriteSucceeded === true) {
    return content;
  }
  if (isMemoryQuestion(content) || isHypotheticalMemoryDiscussion(content)) {
    return content;
  }
  if (isThirdPersonOrFeatureExplanation(content)) {
    return content;
  }
  if (!hasCompletedFirstPersonDurableClaim(content)) {
    return content;
  }
  return rewriteUnsupportedDurableClaim(content);
}

/** v5.4.5-beta.2 — in-memory publish consent gate (no backend persistence yet) */

export const CHAT_PUBLISH_CONSENT_LABEL =
  "คุณพี่ยืนยันว่ามีสิทธิ์ใช้รูปและข้อมูลรถคันนี้ในการลงประกาศ และตรวจสอบข้อมูลสำคัญแล้วนะครับ รูปและข้อมูลประกาศจะแสดงในตลาดรถของน้องเอ น้องเอช่วยร่างประกาศให้ดูน่าอ่านขึ้น แต่ผู้ขายยังเป็นผู้รับผิดชอบข้อมูลจริงของรถครับ";

export const CHAT_PUBLISH_CONSENT_REQUIRED_MESSAGE =
  "กรุณายืนยันสิทธิ์การใช้รูปและข้อมูลรถก่อนเผยแพร่ประกาศครับ";

const consentBySession = new Map<string, boolean>();

export function setPublishConsentAccepted(sessionId: string, accepted: boolean): void {
  if (!sessionId.trim()) return;
  if (accepted) {
    consentBySession.set(sessionId, true);
  } else {
    consentBySession.delete(sessionId);
  }
}

export function hasPublishConsentAccepted(sessionId: string): boolean {
  return consentBySession.get(sessionId) === true;
}

export function clearPublishConsent(sessionId: string): void {
  if (!sessionId.trim()) return;
  consentBySession.delete(sessionId);
}

/** Test helper only */
export function resetPublishConsentStateForTests(): void {
  consentBySession.clear();
}

# Pre-commit file groups — v5.6C.1 + v5.6D

ใช้จัด stage/commit ตามลำดับด้านล่าง (ไฟล์ **Shared** ควรอยู่ commit ที่ปลายท้ายของงานที่พึ่งพา หรือแยก hunk ด้วย `git add -p`)

---

## A) v5.6C.1 — Buyer lead target selection + consent preview modal

| ไฟล์ | บทบาท |
|------|--------|
| `docs/v5.6C.1-buyer-lead-target-consent-modal.md` | docs + limitations |
| `scripts/test-v56c1-buyer-lead-target-modal.mts` | tests |
| `scripts/test-v56c-buyer-consent-lead-capture.mts` | อัปเดต stage `ready_for_modal` |
| `scripts/test-nonga-chat-car-cards.mts` | ปุ่ม "ให้ผู้ขายติดต่อกลับ" |
| `src/components/chat/BuyerLeadConsentModal.tsx` | modal UI |
| `src/components/chat/BuyerLeadConsentModalHost.tsx` | modal wiring |
| `src/stores/buyerLeadCaptureStore.ts` | modal open state |
| `src/utils/buyerLeadTarget.ts` | explicit target car |
| `src/services/leads/buyerLeadConsentModalCopy.ts` | consent copy |
| `src/services/leads/buyerLeadPreview.ts` | modal preview builder |
| `src/services/leads/buyerLeadCaptureFlow.ts` | ไม่ auto listingId; `ready_for_modal` |
| `src/services/leads/buyerLeadCaptureHandler.ts` | modal submit; ไม่ submit จากแชท |
| `src/services/leads/buyerLeadCaptureCopy.ts` | select-car / open-modal copy |
| `src/hooks/chat/useChat.ts` | `startBuyerLeadFromCar`, `submitBuyerLeadConsent`, modal open |
| `src/components/chat/ChatContainer.tsx` | mount `BuyerLeadConsentModalHost` |
| `src/components/chat/ChatMessageBubble.tsx` | ส่ง callback ไปการ์ด |
| `src/components/chat/ChatCarCard.tsx` | ปุ่ม `chat-car-card-seller-callback-btn` (ส่วน C.1) |

---

## B) v5.6D — Buyer lead queue per listing

| ไฟล์ | บทบาท |
|------|--------|
| `docs/v5.6D-buyer-lead-queue-design.md` | design + in-memory limitations |
| `scripts/test-v56d-buyer-lead-queue.mts` | queue tests |
| `src/services/leads/buyerLeadQueuePolicy.ts` | queue policy |
| `src/services/leads/buyerLeadQueueService.ts` | reveal/outcome/supersede |
| `src/server/buyerLeadQueueRoutes.ts` | API + auth guard |
| `src/services/leads/leadTypes.ts` | `queuePosition`, `queueLifecycle`, types |
| `src/server/repositories/buyerLeadRepository.ts` | list/update |
| `src/services/leads/buyerLeadService.ts` | assign queue on create |
| `src/server/buyerLeadRoutes.ts` | `queuePosition` ใน POST response |
| `src/services/leads/buyerLeadView.ts` | buyer เห็น queue fields |
| `src/services/leads/buyerLeadApi.ts` | `fetchListingInterestQueueStats` |
| `src/services/leads/buyerLeadCaptureCopy.ts` | success message มีลำดับคิว |
| `src/services/leads/buyerLeadCaptureHandler.ts` | ใช้ `api.message` / queuePosition |
| `src/components/chat/ChatCarCard.tsx` | interest count badge (ส่วน D) |
| `server.ts` | `registerBuyerLeadQueueRoutes` |
| `package.json` | scripts `test:v56c1-*`, `test:v56d-*` |

---

## Shared (แตะทั้งสองรอบ — แนะนำ commit ใน v5.6D หรือ `git add -p`)

- `src/components/chat/ChatCarCard.tsx` — ปุ่ม C.1 + stats D
- `src/services/leads/buyerLeadCaptureCopy.ts` — modal copy + queue success
- `src/services/leads/buyerLeadCaptureHandler.ts` — modal + queue reply
- `src/services/leads/buyerLeadApi.ts` — POST lead + GET stats
- `package.json` — สอง test scripts

---

## Test fix (รองรับ C.1)

- `scripts/test-nonga-chat-to-draft.mts` — guest login gate 3 → **4** (buyer lead consent submit)

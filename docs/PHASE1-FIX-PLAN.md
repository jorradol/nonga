# Phase 1 — Stability Fix Plan (Lint Audit)

**วันที่:** 2026-07-12  
**คำสั่งตรวจ:** `npm run lint` → `tsc --noEmit`  
**ผลลัพธ์:** **139 errors** (exit code 2) — **0 warnings**  
**ขอบเขตเอกสารนี้:** สรุป audit + แนวทางแก้ (Drafting Fix) **ยังไม่แก้โค้ด**

---

## 1. Executive Summary

Lint ล้มเหลวจาก TypeScript strict checking ทั้งโปรเจกต์ โดยแบ่งเป็น:

| กลุ่ม | ไฟล์ที่มี error | จำนวน error (โดยประมาณ) | ความสำคัญ |
|------|----------------|------------------------|-----------|
| **Production `src/`** | 6 ไฟล์ | **13** | P0 — ต้องแก้ก่อน deploy |
| **Test scripts `scripts/`** | ~75 ไฟล์ | **~126** | P1 — ต้องผ่าน lint ตามเป้าหมาย Phase 1 |

Error ใน `src/` ส่วนใหญ่เกิดจาก **Discriminated Union ที่ไม่ได้ narrow ก่อนเข้าถึง property เฉพาะ branch** และ **type contract ที่เปลี่ยนไป (listing pilot gate, compare resolution, payload fields)** แต่ call site / test fixture ยังใช้แบบเก่า

---

## 2. Production Source Errors (`src/`) — รายละเอียด

### 2.1 `src/services/ai/salesBrainServerShadowSmoke.ts` (3 errors) — **P0**

**Errors (TS2339):**

```
385:21  attempt.blockedReason  — Property 'blockedReason' does not exist on type '{ allowed: true; }'
390:21  attempt.blockedReason
394:39  attempt.blockedReason
```

**Root cause — Discriminated Union ไม่ได้ narrow:**

`resolveAdminShadowRealProviderAttempt()` ใน `salesBrainAdminShadowRealProvider.ts` คืนค่า union ที่ถูกต้องแล้ว:

```ts
| { allowed: true }
| { allowed: false; blockedReason: AdminShadowRealProviderAttemptBlockedReason }
```

ใน `resolveAdminShadowSmokeHandlerContext()` มีการเช็ค `if (!attempt.allowed)` แล้ว (บรรทัด 381) แต่ **TypeScript ไม่ narrow `attempt` ภายใน block** เพราะ property discriminant ชื่อ `allowed` ไม่ได้ถูก bind เป็น type predicate อัตโนมัติใน pattern ปัจจุบัน — ผลคือ TS ยังเห็น `attempt` เป็น union ทั้ง `{ allowed: true }` และ `{ allowed: false; ... }` จึงปฏิเสธการเข้าถึง `blockedReason` ที่มีเฉพาะ branch `allowed: false`

**แนวทางแก้ (แนะนำ — ถูกหลัก Discriminated Union):**

```ts
if (!attempt.allowed) {
  const blockedReason = attempt.blockedReason; // TS narrows ได้เมื่อ guard เป็น `!attempt.allowed`
  emitStage({ ..., gate: blockedReason });
  return { ..., realProviderGateReason: blockedReason };
}
```

ถ้า TS ยังไม่ narrow (ขึ้นกับ strictness / inference):

**Option A (แนะนำ):** destructure หลัง guard

```ts
if (attempt.allowed === false) {
  const { blockedReason } = attempt;
  // ...
}
```

**Option B:** early return แยก branch ชัด

```ts
if (attempt.allowed) {
  // fall through to next gate
} else {
  const { blockedReason } = attempt;
  // emit + return
}
```

**Option C (ไม่แนะนำ):** type assertion `as Extract<typeof attempt, { allowed: false }>` — ใช้ได้แต่ซ่อน bug

**สรุป:** ควรแก้ด้วย **Discriminated Union narrowing ที่ guard** — **ไม่ต้องเปลี่ยน return type** ของ `resolveAdminShadowRealProviderAttempt` เพราะ union ถูกต้องแล้ว ปัญหาอยู่ที่ call site

**Regression check:** รัน offline admin shadow smoke tests (SS-01..SS-08) และ stage logging ว่า `gate` / `realProviderGateReason` ยังตรงกับ blocked reason เดิม

---

### 2.2 `src/services/ai/salesBrainUserVisibleRealProvider.ts` (2 errors) — **P0**

**Errors (TS2345):**

```
845:7   hasCardAnswerConsistencyFailure(..., pilotOrchestration?.recentCarCards ?? [])
1113:42 hasCardAnswerConsistencyFailure(t, cards)
```

**Root cause:**

- `hasCardAnswerConsistencyFailure()` รับ `cards: Array<Pick<ChatCarCardData, "year" | "price" | "mileage" | "model" | "brand">>` — **`mileage` required**
- `PilotGroundedCarCard` (จาก `chatPilotSessionContext.ts`) กำหนด **`mileage?: number`** (optional)

การส่ง `PilotGroundedCarCard[]` ตรง ๆ จึง incompatible เพราะ optional property ไม่ assign ให้ required property ได้

**แนวทางแก้ (เลือก 1):**

| Option | การเปลี่ยน | Trade-off |
|--------|-----------|-----------|
| **A (แนะนำ)** | เปลี่ยน signature `hasCardAnswerConsistencyFailure` ให้ `mileage?: number` ใน Pick | สะท้อน domain จริง (pilot cards อาจไม่มี mileage); guard ภายในฟังก์ชันใช้ `c.mileage ?? 0` หรือ skip เมื่อ undefined อยู่แล้ว |
| **B** | เพิ่ม adapter `toConsistencyCheckCard(card: PilotGroundedCarCard)` ที่ normalize mileage ก่อนส่ง | Localized fix ไม่กระทบ shared helper |
| **C** | Map ก่อนเรียก: `cards.map(c => ({ ...c, mileage: c.mileage ?? 0 }))` | เร็วแต่ซ้ำ 2 จุด |

**แนะนำ Option A** — ฟังก์ชัน consistency check ไม่ได้ต้องการ full `ChatCarCardData` อยู่แล้ว แค่ facts ที่อาจขาด mileage

**Regression check:** tests v22.58, v22.57, v22.61 ที่เรียก `hasCardAnswerConsistencyFailure` / compare grounding

---

### 2.3 `src/services/leads/buyerLeadService.ts` (2 errors) — **P0**

**Errors (TS2339):**

```
144:25  pilotGate.status   — Property 'status' does not exist on type '{ ok: true; config: LeadPilotConfig; }'
145:26  pilotGate.message
```

**Root cause — Discriminated Union ไม่ได้ narrow (เหมือน 2.1):**

`evaluatePilotCreateGate()` คืน:

```ts
| { ok: true; config: LeadPilotConfig }
| { ok: false; status: 403; message: string; code: ... }
```

โค้ดมี `if (!pilotGate.ok)` แล้ว (บรรทัด 141) แต่เข้าถึง `pilotGate.status` / `pilotGate.message` โดยที่ TS ไม่ narrow

**แนวทางแก้ (แนะนำ):**

```ts
if (pilotGate.ok === false) {
  return {
    ok: false,
    status: pilotGate.status,
    message: pilotGate.message,
  };
}
// จากนี้ pilotGate เป็น { ok: true; config: ... }
```

หรือ destructure ใน false branch: `const { status, message } = pilotGate;`

**หมายเหตุ:** หลัง narrow แล้ว ใช้ `pilotGate.config` ใน atomic path (บรรทัด 208–210) ได้อย่าง type-safe

**Regression check:** lead pilot tests (v22.30, v22.53, v56c–v56h, emulator lifecycle)

---

### 2.4 `src/services/ai/chat/chatSearchOrchestrator.ts` (1 error) — **P0**

**Error (TS2345):**

```
454:63  buildInventoryCompareUnavailableReply(resolved)
```

**Root cause:**

- `resolveInventoryBackedComparePair()` คืน `InventoryCompareResolution` (union `ok: true | ok: false`)
- `buildInventoryCompareUnavailableReply()` รับเฉพาะ `Extract<InventoryCompareResolution, { ok: false }>`
- โค้ดมี `if (resolved.ok) { ... return; }` แล้ว แต่ TS **ไม่ narrow `resolved`** ใน else path (pattern เดียวกับ 2.1 / 2.3)

**แนวทางแก้:**

```ts
if (resolved.ok) {
  const built = buildInventoryBackedCompareReply(resolved);
  return { ... };
}
const unavailable = buildInventoryCompareUnavailableReply(resolved);
// หรือ: if (resolved.ok === false) { ... }
```

**Regression check:** v22.57, v22.58, v22.60, v22.61 compare / named inventory tests

---

### 2.5 `src/server/dealerPortalRoutes.ts` (4 errors) — **P0**

**Errors:**

| บรรทัด | Error | สาเหตุ |
|--------|-------|--------|
| 370, 383, 768 | `ctx.isAdmin` — Property 'isAdmin' does not exist | `scopeOr403()` return `{ scope, dealerId }` แต่ call site ใช้ `ctx.isAdmin` แทน `ctx.scope.isAdmin` |
| 377 | `gate.message` — ไม่มีบน `{ ok: true }` | ไม่ narrow union ของ `assertCanPublishDealerListingToMarketplace` |

**แนวทางแก้:**

1. **isAdmin:** ใช้ `ctx.scope.isAdmin` ทุกจุด หรือ flatten return type ของ `scopeOr403`:

   ```ts
   return { ...auth, scope, isAdmin: scope.isAdmin };
   ```

   แนะนำ **flatten** ถ้ามีหลาย call site — ลด human error

2. **gate.message:** ใช้ `if (gate.ok === false)` แล้วค่อยอ่าน `gate.message` (หรือ fallback message constant เหมือน `ownerListingRoutes.ts` ที่ใช้ `gate.message ?? DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE`)

---

### 2.6 `src/server/ownerListingRoutes.ts` (1 error) — **P0**

**Error:** บรรทัด 290 — `gate.message` เมื่อ `gate.ok` อาจเป็น `true`

**แนวทางแก้:** เหมือน 2.5 — narrow ด้วย `gate.ok === false` ก่อน access `message` (แม้ runtime มี `??` fallback แล้ว TS ยังไม่ยอม)

---

## 3. Test Script Errors (`scripts/`) — สรุปตาม Pattern

Scripts มี **~126 errors** ใน ~75 ไฟล์ — ส่วนใหญ่เป็น **fixture/type drift** ไม่ใช่ logic bug ใน production

### 3.1 Listing mock ขาด `isSold` / `listingStatus` (~25 errors)

**Pattern:** `TS2741: Property 'isSold' is missing ... Pick<MarketplaceCarRecord, ...>`

**ไฟล์ตัวอย่าง:** `test-v56c-buyer-consent-lead-capture.mts`, `test-v22.30-lead-capture-kill-switch-unit.mts`, `test-lead-multi-owner-isolation.mts`, และ lead queue tests อื่น ๆ

**สาเหตุ:** `evaluatePilotCreateGate` / `CreateBuyerLeadParams.listing` ต้องการ `isSold` + `listingStatus` หลัง v22.53 pilot gate

**แนวทางแก้:**

- สร้าง shared test helper เช่น `minimalPilotListing(overrides?)` ใน `scripts/_fixtures/` ที่คืน Pick ครบ
- แทนที่ inline mocks ทุกจุดด้วย helper เดียว

```ts
function minimalPilotListing(
  overrides: Partial<Pick<MarketplaceCarRecord, "id" | "title" | "price" | "ownerId" | "isSold" | "listingStatus">> = {}
) {
  return {
    id: "listing-test-1",
    title: "Test Car",
    price: 400_000,
    ownerId: "owner-1",
    isSold: false,
    listingStatus: "published" as const,
    ...overrides,
  };
}
```

---

### 3.2 Payload ขาด `realProviderGateReason` / `realProviderNetwork` (~35 errors)

**Pattern:** `TS2339: Property 'realProviderGateReason' does not exist on type '{ userVisibleText; pilotPathActive; ... sliceId }'`

**สาเหตุ:** Test สร้าง `payload` object แบบ inline โดยไม่ include optional fields ที่ `UserVisibleRealProviderBridgePayload` มี — TS infer เป็น narrow literal type ไม่มี field เหล่านั้น

**แนวทางแก้:**

- Annotate payload ด้วย `UserVisibleRealProviderBridgePayload` หรือ `satisfies UserVisibleRealProviderBridgePayload`
- หรือใช้ factory `buildTestUserVisiblePayload(partial)` ใน shared fixture

---

### 3.3 `unknown.includes()` ใน milestone/doc tests (~35 errors)

**Pattern:** `TS2339: Property 'includes' does not exist on type 'unknown'` (บรรทัด ~272–398 ในหลายไฟล์ v17/v18/v19)

**สาเหตุ:** อ่าน JSON / parsed object เป็น `unknown` แล้วเรียก `.includes()` โดยไม่ narrow

**แนวทางแก้:**

```ts
const value = parsed.someField;
if (typeof value === "string" && value.includes("...")) { ... }
```

หรือ type guard helper `assertString(value)`

---

### 3.4 `readonly` vs mutable `PilotGroundedCarCard[]` (~10 errors)

**Pattern:** `TS2322` / `TS4104` — `as const` fixtures ไม่ assign ให้ `PilotBuyerSessionContext.recentCarCards`

**แนวทางแก้:**

- เอา `as const` ออกจาก array ของ cards หรือ
- Spread เป็น mutable copy: `recentCarCards: [...FIXTURE_CARDS]`
- หรือ (ถ้าต้องการ) เปลี่ยน type definition เป็น `readonly PilotGroundedCarCard[]` — **กระทบ src กว้างขึ้น** แนะนำแก้ fixture ก่อน

---

### 3.5 `InventoryCompareResolution` ไม่ narrow (~8 errors)

**Pattern:** เข้าถึง `.cards`, `.clarification`, `.reason` บน union โดยไม่เช็ค `ok === false`

**ไฟล์:** `test-v22.57-*`, `test-v22.58-*`, `test-v22.60-*`, `test-v22.61-*`

**แนวทางแก้:** เหมือน production fix 2.4 — `if (!resolution.ok) { resolution.clarification ... }`

---

### 3.6 `BuyerLeadRepository` mock ไม่ครบ (~2 errors)

**ไฟล์:** `test-v22.50-*`, `test-v22.51-*`

**ขาด:** `createBuyerLeadAtomic`, `releaseBuyerLeadActiveSlot`, `getPilotCreatedCount`

**แนวทางแก้:** อัปเดต mock ให้ implement interface ครบ หรือใช้ shared in-memory repository จาก test utils

---

### 3.7 `ChatCarCardData` / `MarketplaceImportPayload` incomplete fixtures (~8 errors)

| Error | ไฟล์ | ขาด |
|-------|------|-----|
| TS2322 ChatCarCardData | `test-runtime-attribution-diagnostic.mts`, `test-v22.75-*` | `id`, `bodyClass`, `hasImage`, `detailPath`, `matchKind` |
| TS1360 MarketplaceImportPayload | `test-owner-browser-import-confirm-auth.mts` | `type`, `condition`, `description`, `ownerId`, ... |
| TS2345 BuyerLeadDataBackend | `test-v22.54-*` | backend kind mismatch |

**แนวทางแก้:** shared fixtures `minimalChatCarCard()`, `minimalImportPayload()`

---

### 3.8 อื่น ๆ

| Error | ไฟล์ | แนวทาง |
|-------|------|--------|
| TS2367 no overlap `'auth_gate_required'` vs `'pilot_path_inactive'` | v1315i/j/ka tests | อัปเ�date expected gate reason ให้ตรง runtime หรือแยก assertion ตาม scenario |
| TS2352 MarketplaceCarRecord cast | v22.20, v69m | cast ผ่าน `unknown` ก่อน หรือใช้ typed helper |
| TS2739 UserVisiblePilotOrchestrationHint ขาด `carCardCount` | v22.61, v22.62 | เพิ่ม `carCardCount: cards.length` ใน fixture |

---

## 4. Recommended Fix Order (Phase 1 Execution)

เพื่อให้ `npm run lint` ผ่านเร็วและลด regression:

### Wave 1 — Production `src/` (13 errors, ~6 ไฟล์)

1. `salesBrainServerShadowSmoke.ts` — discriminated union narrow (`attempt.allowed === false`)
2. `buyerLeadService.ts` — discriminated union narrow (`pilotGate.ok === false`)
3. `chatSearchOrchestrator.ts` — narrow `resolved` ก่อน `buildInventoryCompareUnavailableReply`
4. `dealerPortalRoutes.ts` + `ownerListingRoutes.ts` — `ctx.scope.isAdmin` / flatten + gate narrow
5. `salesBrainUserVisibleRealProvider.ts` / `inventoryBackedCompare.ts` — mileage optional ใน consistency helper

**Gate:** `npm run lint 2>&1 | findstr /C:"src/"` ต้องว่าง

### Wave 2 — Shared test fixtures

1. เพิ่ม `scripts/_fixtures/listing.ts`, `chatCarCard.ts`, `userVisiblePayload.ts`
2. ไม่แก้ logic test — แค่ type/fixture

### Wave 3 — Bulk script fixes (batch by pattern)

1. Batch A: `isSold` listing mocks (~25 files) — mechanical replace
2. Batch B: payload annotation `UserVisibleRealProviderBridgePayload` (~20 files)
3. Batch C: `unknown` → `typeof x === "string"` (~35 files)
4. Batch D: compare resolution narrow (~8 files)
5. Batch E: readonly cards + repository mocks + misc

**Gate:** `npm run lint` exit 0

---

## 5. Verification Checklist (หลัง implement)

- [ ] `npm run lint` — **0 errors**
- [ ] Spot-run critical offline tests:
  - Admin shadow smoke (SS-01..SS-08)
  - Lead pilot gate (v22.53 / v22.30)
  - Compare grounding (v22.57 / v22.58)
  - User-visible real provider gate (v22.55 / v22.68)
- [ ] ไม่มี runtime behavior change ที่ไม่ได้ตั้งใจ — การแก้ส่วนใหญ่เป็น **type narrowing / fixture alignment** เท่านั้น

---

## 6. Deep Dive: `blockedReason` ใน `salesBrainServerShadowSmoke.ts`

### 6.1 โครงสร้าง Union ปัจจุบัน

```ts
// salesBrainAdminShadowRealProvider.ts
export function resolveAdminShadowRealProviderAttempt(...):
  | { allowed: true }
  | { allowed: false; blockedReason: AdminShadowRealProviderAttemptBlockedReason }
```

`AdminShadowRealProviderAttemptBlockedReason` รวม เช่น `production_environment`, `admin_shadow_real_provider_flag_off`, `admin_shadow_manual_smoke_disabled`, `admin_shadow_manual_smoke_case_mismatch`, `case_not_allowed_for_real_provider`

### 6.2 Call site ที่ error

```ts
// salesBrainServerShadowSmoke.ts ~376-397
const attempt = resolveAdminShadowRealProviderAttempt({ caseId, environment, readEnv });
if (!attempt.allowed) {
  emitStage({ ..., gate: attempt.blockedReason });      // TS2339
  emitStage({ ..., gate: attempt.blockedReason });      // TS2339
  return { ..., realProviderGateReason: attempt.blockedReason }; // TS2339
}
```

### 6.3 ทำไม TS ไม่ narrow?

- Union discriminant คือ **`allowed: boolean`**
- Guard `if (!attempt.allowed)` *ควร* narrow ใน TypeScript 5.x — แต่ในทางปฏิบัติ inference อาจล้มเหลวเมื่อ:
  - control flow ซับซ้อน (หลาย early return ก่อนหน้า)
  - หรือ strictNullChecks / narrowing edge case กับ negated boolean

**Best practice สำหรับ Discriminated Union:** ใช้ **`attempt.allowed === false`** (positive check บน literal `false`) แทน `!attempt.allowed` — TS narrow ได้เสถียรกว่า

### 6.4 ควร refactor union หรือไม่?

| แนวทาง | ควรทำ? | เหตุผล |
|--------|--------|--------|
| เปลี่ยนเป็น `{ allowed: false as const, blockedReason }` | ไม่จำเป็น | union ถูกต้องแล้ว |
| เพิ่ม type predicate helper `isBlockedAttempt(a): a is { allowed: false; ... }` | Optional | ใช้ซ้ำได้หลาย route |
| ใช้ `switch (attempt.allowed)` | Optional | explicit แต่ verbose |
| **Narrow ที่ call site ด้วย `=== false`** | **ใช่ — แนะนำ** | minimal diff, idiomatic |

**ไม่แนะนำ** รวม `blockedReason?: string` บน `{ allowed: true }` — จะทำลาย discriminated union และเปิดทาง access `blockedReason` ตอน allowed โดยไม่ type-safe

### 6.5 Draft patch (ยังไม่ apply)

```ts
if (attempt.allowed === false) {
  const { blockedReason } = attempt;
  emitStage({ caseId: input.caseId, stage: "admin_shadow_gate_checked", gate: blockedReason });
  emitStage({ caseId: input.caseId, stage: "admin_shadow_fallback_returned", gate: blockedReason });
  return {
    providerNetwork: false,
    realProviderGateReason: blockedReason,
    providerStatus: "not_started",
    fallbackObserved: true,
  };
}
```

---

## 7. Deep Dive: `salesBrainUserVisibleRealProvider.ts`

### Errors

1. **L845** — `evaluateRealProviderOutputSafety` → `hasCardAnswerConsistencyFailure(trimmed, pilotOrchestration?.recentCarCards ?? [])`
2. **L1113** — `hasCompareIdentityFailure` → `hasCardAnswerConsistencyFailure(t, cards)` where `cards = pilotOrchestration?.recentCarCards ?? []`

### Root cause

Domain model แยกชั้น:

- **`PilotGroundedCarCard`** — session/pilot context, mileage optional (grounding อาจไม่มีไมล์)
- **`ChatCarCardData`** — full marketplace card, mileage required

Helper `hasCardAnswerConsistencyFailure` ถูกเขียนเมื่อ v22.58 โดยอิง `ChatCarCardData` facts แต่ user-visible path ส่ง pilot cards

### แนวทางแก้ที่แนะนำ

**แก้ที่ definition (1 จุด):**

```ts
// inventoryBackedCompare.ts
cards: Array<Pick<ChatCarCardData, "year" | "price" | "model" | "brand"> & { mileage?: number }>
```

Logic ภายในใช้ `c.mileage ?? 0` หรือข้าม mileage ใน fact key เมื่อ undefined — **ตรวจ implementation บรรทัด 372–375** ว่ารองรับแล้ว

**ไม่แนะนำ** บังคับ populate mileage ปลอมใน pilot path — อาจทำให้ consistency check false positive

---

## 8. Deep Dive: `buyerLeadService.ts`

### Errors

```ts
// L141-146
if (!pilotGate.ok) {
  return {
    ok: false,
    status: pilotGate.status,    // TS2339
    message: pilotGate.message,  // TS2339
  };
}
```

### Root cause

Union `PilotCreateGateResult` ใช้ discriminant **`ok: boolean`** — pattern เดียวกับ section 6

### แนวทางแก้

```ts
if (pilotGate.ok === false) {
  return { ok: false, status: pilotGate.status, message: pilotGate.message };
}
// pilotGate.ok === true → pilotGate.config ใช้ได้
```

### ทางเลือกเสริม (optional refactor)

เพิ่ม helper ใน `leadPilotGuard.ts`:

```ts
export function isPilotCreateBlocked(
  r: PilotCreateGateResult
): r is Extract<PilotCreateGateResult, { ok: false }> {
  return r.ok === false;
}
```

ใช้ซ้ำใน service + tests — ลด duplicate narrowing bugs ในอนาคต

---

## 9. Full Error File Index (139 errors)

<details>
<summary>คลิกเพื่อดูรายการไฟล์ทั้งหมดที่มี error</summary>

### `src/` (13)

- `src/services/ai/salesBrainServerShadowSmoke.ts` (3)
- `src/services/ai/salesBrainUserVisibleRealProvider.ts` (2)
- `src/services/leads/buyerLeadService.ts` (2)
- `src/server/dealerPortalRoutes.ts` (4)
- `src/server/ownerListingRoutes.ts` (1)
- `src/services/ai/chat/chatSearchOrchestrator.ts` (1)

### `scripts/` (126) — top offenders

| Errors | File |
|--------|------|
| 5 | `test-v144G-owner-controlled-zone-gate-diagnosis.mts` |
| 4 | `test-v1315ns-pilot-path-inactive-diagnosis-and-surface-prep.mts` |
| 4 | `test-v22.30-lead-capture-kill-switch-unit.mts` |
| 4 | `test-v22.57-comparison-vehicle-identity-sales-copy.mts` |
| 4 | `test-v22.68-controlled-guarded-gemini-reachability-recovery.mts` |
| 4 | `test-v1315i-secure-credential-path-confirmation.mts` |
| 3 | `test-v144D-pilot-path-inactive-diagnosis.mts` |
| 3 | `test-v56e3-seller-queue-smoke-ux.mts` |
| 3 | `test-v22.55-gemini-hybrid-buyer-chat-restore.mts` |
| 3 | `test-v1312-owner-only-controlled-gemini-ux-patch.mts` |
| 3 | `test-v1315j-owner-credential-action-guide.mts` |
| 3 | `test-v1315ka-secure-owner-auth-path-setup-plan.mts` |
| 3 | `test-v69m-thor-owner-owner-gate-controlled-revenue-pilot-go-no-go-checklist.mts` |
| 3 | `test-v1315h-authenticated-operator-credential-gate-diagnosis.mts` |
| 2 | หลายไฟล์ v19 milestone / credential / lead / compare tests |
| 1 | อีก ~50 ไฟล์ (milestone docs, lead queue, import, etc.) |

</details>

---

## 10. Out of Scope (Phase 1)

- ไม่เปลี่ยน ESLint rules / tsconfig strictness
- ไม่ refactor business logic ของ pilot gate, compare, หรือ real provider
- ไม่ลบ test scripts เก่า — แก้ type alignment ให้ compile ผ่าน
- ไม่ commit / deploy ใน Phase 1 (เอกสาร plan เท่านั้น)

---

## 11. Next Step (รอ approval)

หลังคุณตรวจสอบเอกสารนี้:

1. Approve Wave 1 (production `src/`) ก่อน
2. Implement + verify lint บน `src/`
3. Proceed Wave 2–3 scripts ตาม pattern batches
4. Final gate: `npm run lint` = 0 errors → Phase 2 (runtime / staging smoke)

---

*Generated from lint audit on branch working tree — 2026-07-12.*

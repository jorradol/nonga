# Nong A — Isolated Staging Owner Decision Packet

**Status:** SAFETY REVISION READY — PENDING OWNER APPROVAL  
**Verdict:** HOLD — NO INFRASTRUCTURE CHANGES AUTHORIZED  
**Date:** 2026-07-17  
**Related design:** [NONGA_ISOLATED_STAGING_DESIGN.md](./NONGA_ISOLATED_STAGING_DESIGN.md)

> เอกสารนี้เป็น decision package สำหรับ Owner เท่านั้น  
> ยัง **ไม่** สร้างหรือแก้ทรัพยากร GCP/Firebase จนกว่า Owner จะลงนามอนุมัติด้านล่าง

---

## 1) สรุปสถานะปัจจุบัน (read-only)

| รายการ | Production วันนี้ |
|--------|-------------------|
| Public URL | `https://a.nongbot.org` |
| Firebase/GCP project | `nonga-ce93c` |
| Hosting site | `nonga-ce93c` |
| Cloud Run (live API) | `nonga-staging` @ `asia-southeast1` |
| Isolated staging project | **ยังไม่มี** |

**ข้อสรุป:** ชื่อ `staging` ใน repo หลายจุดชี้ Production จริง — ต้องสร้าง project ใหม่แยก

---

## 2) ทางเลือกที่ Owner ต้องเลือก

### Option A — Staging แยกครบทุกบริการ

- Project, Hosting, Cloud Run, Firestore, Auth, Storage, Secrets, Logs แยกครบ
- **ข้อดี:** ปลอดภัยสูงสุด, ทดสอบ API/login/images ได้สมจริง
- **ข้อเสีย:** ตั้งค่านานกว่า, ต้องมี billing + guard deploy ครบ
- **งบประมาณโดยประมาณ:** USD 10–25/month (low traffic, AI OFF)

### Option B — Staging ขั้นต่ำปลอดภัยสำหรับ UI (แนะนำ)

- Project + Hosting + Cloud Run + Firestore/Auth/Storage ขั้นต่ำ
- Lead Capture OFF, Public Signup OFF, Dealer notify OFF, AI OFF
- Fixture synthetic 4–5 หรือ 15 รายการ (ไม่ copy Production)
- **ข้อดี:** เร็ว, ค่าใช้จ่ายต่ำ, พอสำหรับ readability / Dark-Light / login smoke
- **ข้อเสีย:** coverage น้อยกว่า production-like flow
- **งบประมาณโดยประมาณ:** ใกล้ free tier; ตั้ง budget alert USD 10–15/month

**คำแนะนำของทีม:** เลือก **Option B** เป็น Phase 1 แล้วขยายเป็น A หลัง Owner browser PASS

---

## 3) ค่าเริ่มต้นที่เสนอ (Owner แก้ไขได้ก่อนอนุมัติ)

| รายการ | ค่าเสนอ |
|--------|---------|
| Scope | **Option B** |
| Staging project ID (ลำดับ 1) | `nonga-staging-2026` |
| Staging project ID (สำรอง 1) | `nonga-a-staging-2026` |
| Staging project ID (สำรอง 2) | `nonga-staging-isolated` |
| Region | `asia-southeast1` |
| Staging URL (เริ่มต้น) | `https://nonga-staging-2026.web.app` |
| Cloud Run service (ใน staging project) | `nonga-staging-api-2026` |
| Fixture count | **15 synthetic listings** (reuse preflight count) หรือ **4–5** ถ้า Owner ยอมปรับ preflight ภายหลัง |
| Billing | Owner ระบุ billing account นอก repo |
| Budget alert | USD **15**/month (แนะนำ) |
| Custom domain รอบแรก | **ไม่ใช้** — ใช้ `*.web.app` เท่านั้น |
| Target identity policy | Project/site/service/region/URL/bucket/Firestore/Auth ต้องระบุ explicit ทุกค่า; ไม่มี default |

---

## 4) ข้อห้ามที่ Owner ต้องยืนยัน

- [ ] ห้ามแก้ `https://a.nongbot.org` และ `nonga-ce93c` ในรอบ provisioning
- [ ] ห้าม copy user/lead/PII จาก Production ไป Staging
- [ ] Lead Capture ต้อง **OFF** บน Staging
- [ ] Public Signup ต้อง **OFF** บน Staging
- [ ] ห้ามส่ง lead/notification ไป dealer จริง
- [ ] AI/Gemini **OFF** จนกว่าจะมี approval และ budget แยก

---

## 5) Approval gates (แยกสิทธิ์จากกัน)

| Gate | ขอบเขตเท่านั้น | Phrase |
|------|----------------|--------|
| A | เก็บ planning/guard files ใน repo | `OWNER APPROVES GATE A KEEP ISOLATED STAGING PLANNING FILES` |
| B | อนุมัติให้เสนอ exact command สำหรับสร้าง empty isolated project | `OWNER APPROVES GATE B CREATE EMPTY ISOLATED PROJECT` |
| C | อนุมัติให้เสนอ exact commands สำหรับ Billing และบริการ isolated | `OWNER APPROVES GATE C LINK BILLING AND ENABLE ISOLATED SERVICES` |
| D | อนุมัติ seed synthetic fixtures ด้วย credentials ของ isolated project | `OWNER APPROVES GATE D SEED SYNTHETIC FIXTURES` |
| E | อนุมัติ deploy API/Hosting ไป isolated project | `OWNER APPROVES GATE E DEPLOY API AND HOSTING TO ISOLATED STAGING` |

Gate แต่ละตัวใช้แทนกันไม่ได้ และไม่มี Gate สำหรับ Production ในชุดไฟล์นี้

---

## 6) Owner sign-off

| Field | Owner fills |
|-------|-------------|
| Owner name | _________________________ |
| Date (UTC+7) | _________________________ |
| Selected option | [ ] A  [ ] **B (recommended)** |
| Approved project ID | _________________________ |
| Approved fixture count | [ ] 4–5  [ ] 15 |
| Approved gate | [ ] A  [ ] B  [ ] C  [ ] D  [ ] E |
| Billing account ID | _________________________ (ไม่ commit ใน repo) |
| Budget alert USD/month | _________________________ |

**Approval phrase (copy exact):**

```
OWNER APPROVES GATE A KEEP ISOLATED STAGING PLANNING FILES
```

**Signature / confirmation:** _________________________

---

## 7) หลัง Owner อนุมัติ — ขั้นตอนถัดไป (ยังไม่รันอัตโนมัติ)

1. รัน dry-run: `npm run plan:isolated-staging:provision`
2. ตรวจ guard: `npm run test:isolated-staging-guard`
3. `--show-approved-instructions` แสดงข้อความที่ตรวจแล้วเท่านั้นและไม่สร้าง infrastructure
4. เมื่อ Owner อนุมัติ Gate B/C/D/E ที่เกี่ยวข้อง จึงจัดทำ exact commands เป็นคำขอใหม่แยกต่างหาก

**Production protection:** ทุกขั้นต้อง snapshot baseline Production ก่อน/หลัง (DNS, revision, `/api/health`, marketplace count)

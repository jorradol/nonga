# PRODUCTION LAUNCH CHECKLIST

**โปรเจกต์:** น้องเอ (Nong A) — Production Deploy  
**Firebase/GCP projectId:** `nonga-ce93c` (NongA) — single-environment production  
**อัปเดตล่าสุด:** 2026-07-13

---

## 1. Pre-flight (ก่อนกด Deploy)

- [ ] รัน `npm run test:all` บนเครื่อง dev — ต้อง **PASS ทั้งหมด** (tests + lint)
- [ ] รัน `npm run build` — ต้องสำเร็จไม่มี error
- [ ] ตรวจ `.env.production` / Cloud Run env — **ห้าม commit secret จริง**
- [ ] ยืนยัน Firebase project ID จริงใน `.firebaserc` และ `firebase.production.json` (`projectId`)
- [ ] ยืนยัน Hosting site ID จริงใน `firebase.production.json` (`hosting.site`)

---

## 2. Google Secret Manager (Production)

สร้าง secrets ใน project `nonga-ce93c` (ชื่อ resource ต้องตรงกับ `src/utils/secretManager.ts`):

| Secret Manager name | Env var ที่ inject |
|---------------------|-------------------|
| `gemini-api-key` | `GEMINI_API_KEY` |
| `firebase-service-account-json` | `FIREBASE_SERVICE_ACCOUNT_JSON` |
| `nonga-admin-api-token` | `NONGA_ADMIN_API_TOKEN` |
| `nonga-dealer-api-token` | `NONGA_DEALER_API_TOKEN` |

- [ ] Cloud Run service account มี role **Secret Manager Secret Accessor** (เฉพาะ secrets ที่ใช้)
- [ ] Cloud Run mount secrets ผ่าน `--set-secrets` หรือให้ runtime เรียก GSM โดยตรง (`NONGA_USE_SECRET_MANAGER=true`)
- [ ] ยืนยัน bootstrap ตั้ง `NODE_ENV=production` เมื่อโหลด secret สำเร็จ (`src/config.ts`)

---

## 3. Cloud Run (Backend API)

- [ ] Deploy service `nonga-staging` region `asia-southeast1` (Cloud Run service บน NongA)
- [ ] ตั้ง env ขั้นต่ำ:
  - `NONGA_DEPLOY_ENV=production`
  - `NONGA_DATA_BACKEND=firestore` (เมื่อพร้อม)
  - `NONGA_IMAGE_BACKEND=firebase` (เมื่อพร้อม)
  - `CORS_ALLOWED_ORIGINS=https://nonga-car.com,...`
- [ ] **ไม่** เปิด AI user-visible / lead capture จนกว่าจะผ่าน owner approval packet

---

## 4. Firebase Hosting + Rules

- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules --config firebase.production.json`
- [ ] Deploy Storage rules: `firebase deploy --only storage --config firebase.production.json`
- [ ] Deploy Hosting + rewrites: `firebase deploy --only hosting --config firebase.production.json`

---

## 5. Post-deploy Smoke

- [ ] `GET /api/health` → `{ ok: true }`
- [ ] หน้าแรกโหลดได้ (SPA)
- [ ] Dealer login + draft flow (ถ้าเปิด pilot)
- [ ] ตรวจ logs — ไม่มี secret value ใน plaintext

---

## 6. Rollback (ถ้ามีปัญหา)

1. Rollback Cloud Run revision ก่อนหน้า
2. Rollback Hosting: `firebase hosting:rollback --config firebase.production.json`
3. ปิด AI flags / lead capture kill-switch ตาม playbook

---

## คำสั่ง Deploy สุดท้าย (ลุงเด่นรันหลัง checklist ครบ)

```bash
# 1) ตรวจความพร้อม
npm run test:all
npm run build

# 2) เลือก project production
firebase use production

# 3) Deploy rules + hosting
firebase deploy --only firestore:rules,storage,hosting --config firebase.production.json

# 4) Deploy Cloud Run backend (ตาม runbook ของทีม — ตัวอย่าง)
# gcloud run deploy nonga-staging --source . --region asia-southeast1 --project nonga-ce93c
```

> **หมายเหตุ:** Production ใช้โปรเจกต์เดียวกับ NongA (`nonga-ce93c`) — ไม่มี staging project แยก

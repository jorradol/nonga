# Nong A v5.0 Staging Rehearsal Step 3 Firebase Console Click-by-Click Checklist

เอกสารนี้สำหรับลุงเด่นใช้เปิด Firebase Console แล้วทำตามทีละหน้าใน staging project เท่านั้น

สถานะรอบนี้ยังเป็น `Nong A v5.0 pre-staging`

- ยังไม่ deploy
- ยังไม่ seed `--write`
- ยังไม่ migration `--write`
- ยังไม่เปลี่ยน `NONGA_DATA_BACKEND`
- ยังไม่เปลี่ยน `NONGA_IMAGE_BACKEND`
- ยังไม่เปิด public signup
- ยังไม่เปิด Online Beta

กติกาสำคัญ: ค่าจริงที่เป็น secret ให้ใส่ใน staging host หรือ secret manager เท่านั้น ห้ามเอามาใส่ใน docs, repo, chat, issue, PR หรือส่งให้ AI

## 1. เข้า Firebase Console และเลือก staging project

ทำตามนี้:

1. เปิดเว็บ `https://console.firebase.google.com`
2. Login ด้วยบัญชีที่มีสิทธิ์ดู staging project ของ Nong A
3. ที่หน้า Firebase Console ให้เลือก project staging ของ Nong A
4. ตรวจชื่อ project ให้ชัดเจนก่อนทำอะไรต่อ
5. ต้องเป็น staging project เท่านั้น ไม่ใช่ production

ถ้าไม่แน่ใจว่า project ไหนคือ staging ให้หยุดก่อน แล้วถามทีมก่อน อย่าเดา เพราะถ้าเข้าผิด project อาจไปสร้าง user หรือ key ผิดที่

## 2. เอา Firebase Web Config

ค่า Firebase Web Config ใช้ให้เว็บ frontend ของ staging เชื่อมกับ Firebase staging project

ทำตามนี้ใน Firebase Console:

1. กดรูปเฟืองข้าง Project Overview
2. เลือก Project settings
3. อยู่ที่แท็บ General
4. เลื่อนลงไปที่ Your apps
5. เลือก Web app ของ staging
6. หา SDK setup and configuration
7. เลือก Config
8. Copy ค่าใน object config เฉพาะชื่อ field ที่ต้องใช้

ให้ map ค่าเป็น env แบบนี้:

| ค่าใน Firebase Config | ใส่เป็น env ใน staging |
| --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| `measurementId` ถ้ามี | `VITE_FIREBASE_MEASUREMENT_ID` |

ตัวอย่างรูปแบบที่ต้องตั้งใน staging host:

```bash
VITE_FIREBASE_API_KEY="<copy-apiKey-from-firebase-config>"
VITE_FIREBASE_AUTH_DOMAIN="<copy-authDomain-from-firebase-config>"
VITE_FIREBASE_PROJECT_ID="<copy-projectId-from-firebase-config>"
VITE_FIREBASE_STORAGE_BUCKET="<copy-storageBucket-from-firebase-config>"
VITE_FIREBASE_MESSAGING_SENDER_ID="<copy-messagingSenderId-from-firebase-config>"
VITE_FIREBASE_APP_ID="<copy-appId-from-firebase-config>"
VITE_FIREBASE_MEASUREMENT_ID="<copy-measurementId-if-present>"
```

ข้อควรจำ:

- ค่า Web Config ไม่ใช่ private key
- แต่ไม่ต้องเอาค่าจริงมาใส่ใน docs หรือแชท
- ให้เอาค่าจริงไปใส่ใน staging env หรือ secret manager เท่านั้น

## 3. สร้าง Firebase Auth Test Users

สร้าง user สำหรับทดสอบ role flow ใน Firebase Authentication ของ staging project

ทำตามนี้ใน Firebase Console:

1. ไปที่เมนู Authentication
2. ไปที่แท็บ Users
3. กด Add user
4. สร้าง user คนที่ 1 เป็น member test user
5. สร้าง user คนที่ 2 เป็น dealer test user
6. สร้าง user คนที่ 3 เป็น admin หรือ superadmin test user
7. หลังสร้างแต่ละ user แล้ว ให้กดเข้า user นั้นและ copy UID
8. เก็บ password ไว้เฉพาะที่ลุงจัดการเองอย่างปลอดภัย

ห้ามบันทึก password ลง:

- docs
- repo
- `.env.example`
- chat
- issue หรือ PR
- test script

เอา UID และข้อมูล user ไปตั้ง env ตามตารางนี้:

| User | Env ที่ต้องตั้ง | หมายเหตุ |
| --- | --- | --- |
| Member | `NONGA_TEST_MEMBER_UID` | UID จาก Firebase Auth |
| Member | `NONGA_TEST_MEMBER_EMAIL` | Email ของ member test user |
| Member | `NONGA_TEST_MEMBER_DISPLAY_NAME` | ชื่อแสดงผล เช่น `Nong A Staging Member` |
| Dealer | `NONGA_TEST_DEALER_UID` | UID จาก Firebase Auth |
| Dealer | `NONGA_TEST_DEALER_EMAIL` | Email ของ dealer test user |
| Dealer | `NONGA_TEST_DEALER_DISPLAY_NAME` | ชื่อแสดงผล เช่น `Nong A Staging Dealer` |
| Dealer | `NONGA_TEST_DEALER_ID` | dealer id สำหรับ staging เช่น `thor-auto` |
| Dealer | `NONGA_TEST_DEALER_NAME` | ชื่อเต็นท์ เช่น `Thor Auto Staging` |
| Admin | `NONGA_TEST_ADMIN_UID` | UID จาก Firebase Auth |
| Admin | `NONGA_TEST_ADMIN_EMAIL` | Email ของ admin test user |
| Admin | `NONGA_TEST_ADMIN_DISPLAY_NAME` | ชื่อแสดงผล เช่น `Nong A Staging Admin` |
| Admin | `NONGA_TEST_ADMIN_ROLE` | ใช้ `admin` หรือ `superadmin` |

ตัวอย่าง placeholder:

```bash
NONGA_TEST_MEMBER_UID="<member-auth-uid>"
NONGA_TEST_MEMBER_EMAIL="<member-staging-email>"
NONGA_TEST_MEMBER_DISPLAY_NAME="Nong A Staging Member"

NONGA_TEST_DEALER_UID="<dealer-auth-uid>"
NONGA_TEST_DEALER_EMAIL="<dealer-staging-email>"
NONGA_TEST_DEALER_DISPLAY_NAME="Nong A Staging Dealer"
NONGA_TEST_DEALER_ID="thor-auto"
NONGA_TEST_DEALER_NAME="Thor Auto Staging"

NONGA_TEST_ADMIN_UID="<admin-auth-uid>"
NONGA_TEST_ADMIN_EMAIL="<admin-staging-email>"
NONGA_TEST_ADMIN_DISPLAY_NAME="Nong A Staging Admin"
NONGA_TEST_ADMIN_ROLE="admin"
```

## 4. สร้าง Firebase Admin Credential แบบปลอดภัย

Firebase Admin Credential เป็น secret ฝั่ง backend ใช้สำหรับ verify token และงาน server-side เช่น seed Firestore/Storage ใน staging

มี 3 option แต่แนะนำ Option A ถ้า secret manager รองรับ

### Option A: ใช้ Service Account JSON เป็น secret เดียว

ต้องตั้ง:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="<store-only-in-staging-secret-manager>"
```

ขั้นตอนใน Firebase Console:

1. กดรูปเฟืองข้าง Project Overview
2. เลือก Project settings
3. ไปที่แท็บ Service accounts
4. ดูส่วน Firebase Admin SDK
5. กด Generate new private key เฉพาะเมื่อพร้อมจะนำไปเก็บใน secret manager ทันที
6. นำ content ของ JSON ไปใส่ใน staging secret manager เป็น `FIREBASE_SERVICE_ACCOUNT_JSON`
7. ลบไฟล์ JSON ที่ download มาออกจากเครื่องหรือเก็บตาม policy ของทีมอย่างปลอดภัย

ห้ามเด็ดขาด:

- ห้าม commit ไฟล์ JSON
- ห้ามวาง service account JSON ในแชท
- ห้ามวาง private key ในแชท
- ห้ามส่ง private key ให้ AI
- ห้ามใส่ private key ใน docs

### Option B: แยก service account เป็นหลาย env

ถ้า staging host ใช้ JSON ทั้งก้อนไม่สะดวก ให้ตั้ง 3 ค่านี้แทน:

```bash
FIREBASE_PROJECT_ID="<staging-project-id>"
FIREBASE_CLIENT_EMAIL="<service-account-email>"
FIREBASE_PRIVATE_KEY="<private-key-with-escaped-newlines>"
```

`FIREBASE_PRIVATE_KEY` ต้องเก็บเป็น secret เท่านั้น ห้ามเอามาใส่ใน docs, repo หรือ chat

### Option C: ใช้ path ไปยัง credential file บน staging host

ถ้า host รองรับไฟล์ credential แบบปลอดภัย:

```bash
GOOGLE_APPLICATION_CREDENTIALS="<secure-file-path-on-staging-host>"
FIREBASE_PROJECT_ID="<staging-project-id>"
```

ห้ามส่ง content ของไฟล์ credential ในแชท ให้ตั้ง path และจัดการ file permission บน staging host เท่านั้น

## 5. หลังลุงตั้งค่าเสร็จ ต้องรันอะไร

หลังตั้งค่า staging env ครบและสร้าง Firebase Auth test users ครบแล้ว ให้รัน dry-run ก่อนเท่านั้น:

```bash
npm run seed:v50-firebase-role-test-users -- --dry-run --json
```

ตรวจ output ว่าระบบจะเตรียมเอกสาร user/dealer membership ถูกคน ถูก role และไม่มี password หรือ private key โผล่ใน output

ถ้า output ถูกต้อง ให้กลับมารายงานก่อน ยังไม่ต้อง run `--write`

## ห้ามทำตอนนี้

- ห้าม deploy
- ห้าม seed `--write`
- ห้าม migration `--write`
- ห้ามเปิด public signup
- ห้ามส่ง secret ในแชท
- ห้ามเปลี่ยน backend flags
- ห้ามตั้ง `NONGA_DATA_BACKEND=firestore`
- ห้ามตั้ง `NONGA_IMAGE_BACKEND=firebase-storage`

## Checklist สั้น ๆ

- [ ] เข้า Firebase Console แล้ว
- [ ] เลือก staging project ถูกต้อง ไม่ใช่ production
- [ ] Copy Firebase Web Config แล้ว
- [ ] ตั้ง `VITE_FIREBASE_*` ใน staging env แล้ว
- [ ] สร้าง member test user แล้ว
- [ ] สร้าง dealer test user แล้ว
- [ ] สร้าง admin/superadmin test user แล้ว
- [ ] Copy UID ของ test users ครบแล้ว
- [ ] ตั้ง `NONGA_TEST_*` env ครบแล้ว
- [ ] ตั้ง Firebase Admin Credential ใน secret manager แล้ว
- [ ] ไม่ได้ใส่ secret จริงใน docs/repo/chat
- [ ] Run seed dry-run แล้ว
- [ ] กลับมารายงานผล dry-run ก่อนทำ `--write`

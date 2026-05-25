# คู่มือเก็บค่า Secret สำหรับลุงเด่น — Nong A v5.0 Pre-staging

สถานะรอบนี้ยังเป็น `Nong A v5.0 pre-staging` เท่านั้น

- ยังไม่ deploy
- ยังไม่ seed `--write`
- ยังไม่ migration `--write`
- ยังไม่เปลี่ยน `NONGA_DATA_BACKEND`
- ยังไม่เปลี่ยน `NONGA_IMAGE_BACKEND`
- ยังไม่เปิด public signup
- ยังไม่เปิด Online Beta
- ยังไม่อัปเป็น v5.1 หรือ v5.2

เอกสารนี้มีไว้บอกว่า "ลุงต้องไปเอาค่าอะไรจากที่ไหน" แล้วเอาไปใส่ใน staging host หรือ secret manager เท่านั้น ห้ามเอาค่าจริงมาใส่ใน repo หรือวางในแชท

## A. Firebase Web Config

ค่าเหล่านี้เป็น config ของแอปฝั่งเว็บ ใช้ให้ frontend คุยกับ Firebase staging project ได้

ขั้นตอน:

1. เข้า Firebase Console
2. เลือก staging project ของ Nong A
3. ไปที่ Project settings
4. ไปที่แท็บ General
5. เลื่อนหา Your apps
6. เลือก Web app ของ staging
7. ดูส่วน Web app SDK setup
8. Copy ค่าไปใส่ใน staging host หรือ secret manager

ค่าที่ต้องได้:

```bash
VITE_FIREBASE_API_KEY="<copy-from-firebase-console>"
VITE_FIREBASE_AUTH_DOMAIN="<copy-from-firebase-console>"
VITE_FIREBASE_PROJECT_ID="<copy-from-firebase-console>"
VITE_FIREBASE_STORAGE_BUCKET="<copy-from-firebase-console>"
VITE_FIREBASE_MESSAGING_SENDER_ID="<copy-from-firebase-console>"
VITE_FIREBASE_APP_ID="<copy-from-firebase-console>"
VITE_FIREBASE_MEASUREMENT_ID="<copy-if-firebase-console-has-it>"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
```

ข้อควรจำ:

- ค่า `VITE_FIREBASE_*` ไม่ใช่ private key
- แต่ไม่ต้องเอาค่าจริงมาวางใน ChatGPT, Cursor chat, docs, หรือ commit
- ให้ใส่เฉพาะใน staging host หรือ environment variables ของ staging เท่านั้น

## B. Firebase Admin Credential

ค่าเหล่านี้เป็น secret ฝั่ง server ใช้ให้ backend verify Firebase ID token และใช้ seed/write Firestore หรือ Storage ใน staging ได้

แนะนำ Option A ถ้า secret manager รองรับ:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON="<paste-only-in-secret-manager>"
FIREBASE_PROJECT_ID="<staging-project-id>"
```

หรือ Option B:

```bash
FIREBASE_PROJECT_ID="<staging-project-id>"
FIREBASE_CLIENT_EMAIL="<service-account-email>"
FIREBASE_PRIVATE_KEY="<private-key-with-escaped-newlines>"
```

หรือ Option C:

```bash
GOOGLE_APPLICATION_CREDENTIALS="<secure-file-path-on-staging-host>"
FIREBASE_PROJECT_ID="<staging-project-id>"
```

ห้ามเด็ดขาด:

- ห้ามวาง `FIREBASE_SERVICE_ACCOUNT_JSON` ในแชท
- ห้ามวาง `FIREBASE_PRIVATE_KEY` ในแชท
- ห้ามส่ง service account JSON ให้ AI
- ห้าม commit ลง repo
- ห้ามใส่ค่าเหล่านี้ใน docs
- ห้ามเก็บ private key ไว้ในไฟล์ที่ sync หรือแชร์สาธารณะ

ให้ใส่เฉพาะใน secret manager หรือ staging environment เท่านั้น

## C. GEMINI_API_KEY

ค่านี้เป็น secret สำหรับ AI ของ Nong A

ต้องตั้งเป็น server-side env:

```bash
GEMINI_API_KEY="<staging-gemini-api-key>"
```

ห้ามเด็ดขาด:

- ห้ามวาง `GEMINI_API_KEY` ในแชท
- ห้าม commit ลง repo
- ห้ามใส่ใน docs
- ห้ามตั้งเป็น frontend env ที่ขึ้นต้นด้วย `VITE_`

ต้องเป็น server-side secret เท่านั้น

## D. APP_URL

ค่านี้คือ URL ของ staging app ใช้ให้ระบบรู้ว่า staging อยู่ที่ไหน

ตัวอย่าง:

```bash
APP_URL="https://staging-domain.example"
```

ถ้ายังไม่มี staging domain จริง ให้จดไว้ก่อนว่า:

```bash
APP_URL="<staging-url-will-be-filled-after-host-is-ready>"
```

## E. Public Signup

รอบนี้ยังไม่เปิดให้คนทั่วไปสมัครเอง

ต้องตั้ง:

```bash
VITE_NONGA_PUBLIC_SIGNUP_ENABLED="false"
```

ความหมาย:

- คนทั่วไปยังสมัครเองไม่ได้
- บัญชี dealer/admin ต้องสร้างเองใน Firebase Console
- dealer/admin ต้องถูก seed และอนุมัติด้วยเอกสาร/ขั้นตอน staging เท่านั้น

## F. Test Users

สร้างผู้ใช้ทดสอบจริงใน Firebase Authentication

ขั้นตอน:

1. เข้า Firebase Console
2. เลือก staging project
3. ไปที่ Authentication
4. ไปที่ Users
5. กด Add user
6. สร้างอย่างน้อย 3 คน:
   - member test user
   - dealer test user
   - admin หรือ superadmin test user
7. Copy UID ของแต่ละคน
8. เก็บ password ไว้เฉพาะที่ลุงจัดการเองอย่างปลอดภัย

ค่าที่ต้องเตรียมสำหรับ member:

```bash
NONGA_TEST_MEMBER_UID="<member-auth-uid>"
NONGA_TEST_MEMBER_EMAIL="<member-staging-email>"
NONGA_TEST_MEMBER_DISPLAY_NAME="Nong A Staging Member"
```

ค่าที่ต้องเตรียมสำหรับ dealer:

```bash
NONGA_TEST_DEALER_UID="<dealer-auth-uid>"
NONGA_TEST_DEALER_EMAIL="<dealer-staging-email>"
NONGA_TEST_DEALER_DISPLAY_NAME="Nong A Staging Dealer"
NONGA_TEST_DEALER_ID="thor-auto"
NONGA_TEST_DEALER_NAME="Thor Auto Staging"
```

ค่าที่ต้องเตรียมสำหรับ admin:

```bash
NONGA_TEST_ADMIN_UID="<admin-auth-uid>"
NONGA_TEST_ADMIN_EMAIL="<admin-staging-email>"
NONGA_TEST_ADMIN_DISPLAY_NAME="Nong A Staging Admin"
NONGA_TEST_ADMIN_ROLE="admin"
```

ถ้าต้องทดสอบ superadmin ให้ใช้:

```bash
NONGA_TEST_ADMIN_ROLE="superadmin"
```

ห้ามบันทึก password ลง:

- repo
- docs
- `.env.example`
- chat
- issue/PR
- test script

## ตารางแยกข้อมูลที่ใส่ได้และห้ามส่งในแชท

| กลุ่ม | ค่า | ทำอย่างไร |
| --- | --- | --- |
| ใส่ใน staging env ได้ แต่ไม่ต้องส่งในแชท | `VITE_FIREBASE_*`, `APP_URL`, `VITE_NONGA_PUBLIC_SIGNUP_ENABLED` | ใส่ใน staging host หรือ secret manager เท่านั้น |
| ลับมาก ห้ามส่งในแชทเด็ดขาด | `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PRIVATE_KEY`, เนื้อหาไฟล์ `GOOGLE_APPLICATION_CREDENTIALS`, `GEMINI_API_KEY`, `NONGA_DEALER_API_TOKEN`, `NONGA_DEALER_TOKEN_MAP`, test user passwords | เก็บใน secret manager หรือ password manager เท่านั้น |
| บอกน้องซีได้แบบปลอดภัย | "ตั้งค่าเรียบร้อยแล้ว", "ได้ UID แล้ว", "seed dry-run ผ่านแล้ว", "public signup ยังปิดอยู่" | บอกสถานะได้ ไม่ต้องบอกค่าจริง |

## Checklist ให้ลุงติ๊ก

- [ ] ได้ Firebase Web Config แล้ว
- [ ] ตั้ง `VITE_FIREBASE_*` ใน staging host แล้ว
- [ ] ได้ Firebase Admin credential แล้ว
- [ ] ตั้ง Firebase Admin env ใน staging host แล้ว
- [ ] ได้ `GEMINI_API_KEY` แล้ว
- [ ] ตั้ง `GEMINI_API_KEY` ใน server env แล้ว
- [ ] ตั้ง `APP_URL` แล้ว
- [ ] ตั้ง `NODE_ENV=production` แล้ว
- [ ] ตั้ง `VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false` แล้ว
- [ ] สร้าง member test user แล้ว
- [ ] สร้าง dealer test user แล้ว
- [ ] สร้าง admin/superadmin test user แล้ว
- [ ] Copy UID ครบแล้ว
- [ ] ตั้ง `NONGA_TEST_*` env แล้ว
- [ ] Run seed dry-run แล้ว
- [ ] ตรวจ output dry-run แล้ว
- [ ] ยังไม่ได้ run seed `--write`
- [ ] ยังไม่ได้ run migration `--write`
- [ ] ยังไม่ได้ deploy public staging
- [ ] ยังไม่ได้เปลี่ยน backend flags

## คำสั่งถัดไปหลังตั้งค่าครบ

หลังลุงตั้งค่า staging env และสร้าง Firebase Auth test users ครบแล้ว ให้รัน dry-run ก่อน:

```bash
npm run seed:v50-firebase-role-test-users -- --dry-run --json
```

ถ้า dry-run ถูกต้อง ให้กลับมารายงานก่อน ยังไม่ต้อง run:

```bash
npm run seed:v50-firebase-role-test-users -- --write
```

## ห้ามทำในรอบนี้

- ห้าม deploy
- ห้าม run seed `--write`
- ห้าม run migration `--write`
- ห้ามเปลี่ยน `NONGA_DATA_BACKEND`
- ห้ามเปลี่ยน `NONGA_IMAGE_BACKEND`
- ห้ามเปิด public signup
- ห้ามใส่ secret จริงลง repo
- ห้ามใส่ private key ลง docs
- ห้ามเพิ่มฟีเจอร์ใหม่

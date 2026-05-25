# Nong A v5.0 Google Cloud Console Click-by-Click Resource Setup

เอกสารนี้สำหรับลุงเด่นเปิด Google Cloud Console แล้วสร้าง resource staging ของ Nong A ด้วยตัวเองแบบปลอดภัย

สถานะรอบนี้:

- Project staging: `nonga-ce93c`
- ยังไม่ deploy Cloud Run
- ยังไม่ `docker push`
- ยังไม่ Firebase Hosting deploy
- ยังไม่ migration `--write`
- ยังไม่เปิด public signup
- ยังไม่ push GitHub

APIs ที่ตรวจพบว่า enabled แล้ว:

- Cloud Run
- Artifact Registry
- Secret Manager
- Cloud Build
- IAM
- IAM Credentials
- Service Usage
- Cloud Resource Manager

Resources ที่ยัง missing หรือยังเข้าถึงไม่ได้:

- `nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com`
- Artifact Registry repo `nonga-staging`
- Secret Manager secret `gemini-api-key`
- Secret Manager secret `firebase-service-account-json`

กติกาสำคัญ: ค่าจริงที่เป็น secret ให้ใส่ใน Google Cloud Console เท่านั้น ห้ามเอามาใส่ใน docs, repo, chat, issue, PR หรือส่งให้ AI

## 1. วิธีเข้า Google Cloud Console และเลือก project `nonga-ce93c`

ทำตามนี้:

1. เปิดเว็บ `https://console.cloud.google.com`
2. Login ด้วยบัญชี Google ที่มีสิทธิ์จัดการ staging project ของ Nong A
3. มองที่แถบบนของ Google Cloud Console แล้วกดตัวเลือก project
4. ค้นหาและเลือก project `nonga-ce93c`
5. ตรวจชื่อ project ที่แถบบนอีกครั้งว่าต้องเป็น `nonga-ce93c`
6. ย้ำอีกครั้งว่า project นี้ต้องเป็น staging ของ Nong A เท่านั้น

ถ้าไม่แน่ใจว่าเข้าถูก project หรือไม่ ให้หยุดก่อนแล้วถามทีมก่อน อย่าเดา เพราะการสร้าง secret หรือ permission ผิด project อาจทำให้ deploy รอบ staging ใช้ resource ผิดชุด

## 2. วิธีสร้าง Service Account

ต้องสร้าง service account นี้:

```text
nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com
```

ทำตามนี้ใน Google Cloud Console:

1. เปิดเมนูซ้าย
2. ไปที่ `IAM & Admin`
3. เลือก `Service Accounts`
4. กด `Create service account`
5. ใส่ `Service account name` เป็น `nonga-staging-runner`
6. ตรวจว่า `Service account ID` กลายเป็น `nonga-staging-runner`
7. ใส่ `Display name` เป็น `NongA Staging Cloud Run Runner`
8. กด `Create and continue`
9. ในขั้นให้สิทธิ์ ไม่ต้องให้ role กว้าง ๆ ระดับ project ตอนนี้
10. กด `Done` หรือ `Finish`
11. กลับมาที่หน้า `Service Accounts` แล้วตรวจว่ามี `nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com`

ข้อควรจำ: service account นี้จะใช้เป็น runtime service account ของ Cloud Run staging ภายหลัง แต่ตอนนี้ยังไม่ deploy Cloud Run

## 3. วิธีสร้าง Secret Manager secret: `gemini-api-key`

ต้องสร้าง secret นี้:

```text
gemini-api-key
```

ทำตามนี้ใน Google Cloud Console:

1. เปิดเมนูซ้าย
2. ไปที่ `Security` ถ้ามีเมนูนี้
3. เลือก `Secret Manager`
4. ถ้าไม่เห็นผ่าน `Security` ให้ใช้ช่องค้นหาด้านบนแล้วค้นหา `Secret Manager`
5. กด `Create secret`
6. ใส่ `Name` เป็น `gemini-api-key`
7. ที่ช่อง `Secret value` ให้ลุง paste ค่า `GEMINI_API_KEY` เอง
8. ห้ามถ่ายรูปหน้าจอที่เห็นค่า secret
9. ห้ามส่งค่า `GEMINI_API_KEY` ในแชท
10. ห้ามใส่ค่า `GEMINI_API_KEY` ใน docs หรือ repo
11. กด `Create secret`
12. กลับมาที่หน้า Secret Manager แล้วตรวจว่ามี secret ชื่อ `gemini-api-key`

ให้ paste เฉพาะค่าจริงใน Google Cloud Console เท่านั้น ถ้าไม่แน่ใจว่าค่าถูกไหม ให้ตรวจจากแหล่งที่เก็บ secret ของทีมเองโดยไม่ส่งค่าออกมาในแชท

## 4. วิธีสร้าง Secret Manager secret: `firebase-service-account-json`

ต้องสร้าง secret นี้:

```text
firebase-service-account-json
```

ทำตามนี้ใน Google Cloud Console:

1. ไปที่ `Secret Manager`
2. กด `Create secret`
3. ใส่ `Name` เป็น `firebase-service-account-json`
4. ที่ช่อง `Secret value` ให้ลุง paste Firebase service account JSON ทั้งก้อนเอง
5. JSON ต้องเป็น content เต็มของ service account key ไม่ใช่ path ของไฟล์
6. ห้ามส่ง JSON ในแชท
7. ห้าม commit JSON เข้า repo
8. ห้ามใส่ JSON ใน docs, issue หรือ PR
9. ห้ามถ่ายรูปหน้าจอที่เห็น `private_key` หรือ secret value
10. กด `Create secret`
11. กลับมาที่หน้า Secret Manager แล้วตรวจว่ามี secret ชื่อ `firebase-service-account-json`

หลัง paste และสร้าง secret แล้ว ให้จัดการไฟล์ JSON ที่ download มาไว้ตาม policy ของทีม หรือถ้าไม่ต้องเก็บต่อให้ลบออกจากเครื่องอย่างปลอดภัย

## 5. วิธี grant `secretAccessor` ให้ service account

ต้องให้ service account นี้:

```text
nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com
```

มีสิทธิ์:

```text
roles/secretmanager.secretAccessor
```

เฉพาะกับ secrets เหล่านี้:

- `gemini-api-key`
- `firebase-service-account-json`

วิธีทำแบบ least privilege ในหน้า Secret Manager:

1. ไปที่ `Secret Manager`
2. กดเข้า secret `gemini-api-key`
3. ไปที่แท็บ `Permissions` หรือ panel สิทธิ์ของ secret นั้น
4. กด `Grant access`
5. ที่ `New principals` ใส่ `nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com`
6. ที่ `Select a role` เลือก `Secret Manager Secret Accessor`
7. ตรวจว่า role แสดงเป็น `roles/secretmanager.secretAccessor`
8. กด `Save`
9. กลับไปที่ `Secret Manager`
10. กดเข้า secret `firebase-service-account-json`
11. ทำขั้นตอน grant access แบบเดียวกันให้ service account เดิม

ข้อสำคัญ: ถ้า Console รองรับการให้สิทธิ์เฉพาะ secret ให้ทำเฉพาะระดับ secret แบบด้านบน อย่าให้ `Secret Manager Secret Accessor` ทั้ง project ถ้าไม่จำเป็น

หลังทำเสร็จ สิทธิ์ที่ต้องการคือ service account อ่านได้แค่สอง secret นี้สำหรับ runtime ของ Cloud Run staging ในอนาคต

## 6. วิธีสร้าง Artifact Registry repo

ต้องสร้าง repository นี้:

- Repo name: `nonga-staging`
- Format: Docker
- Region: `asia-southeast1`

ทำตามนี้ใน Google Cloud Console:

1. เปิดเมนูซ้าย
2. ไปที่ `Artifact Registry`
3. เลือก `Repositories`
4. กด `Create repository`
5. ใส่ `Name` เป็น `nonga-staging`
6. เลือก `Format` เป็น `Docker`
7. เลือก `Location type` เป็น `Region`
8. เลือก `Region` เป็น `asia-southeast1`
9. ตรวจอีกครั้งว่า project ด้านบนยังเป็น `nonga-ce93c`
10. กด `Create`
11. กลับมาที่หน้า `Repositories` แล้วตรวจว่ามี repo `nonga-staging` ใน region `asia-southeast1`

ตอนนี้สร้างแค่ repo เท่านั้น ยังไม่ต้อง build image และยังไม่ต้อง push image

## 7. สิ่งที่ลุงห้ามทำ

ห้ามทำสิ่งเหล่านี้ในรอบนี้:

- ห้าม deploy Cloud Run
- ห้าม `docker push`
- ห้าม Firebase Hosting deploy
- ห้าม migration `--write`
- ห้ามเปิด public signup
- ห้ามส่ง `GEMINI_API_KEY` ในแชท
- ห้ามส่ง service account JSON ในแชท
- ห้ามถ่ายรูปหน้าที่เห็น private key หรือ secret value
- ห้าม commit secret, private key หรือ service account JSON
- ห้ามสร้าง permission กว้างระดับ project ถ้า Console ให้ grant เฉพาะ secret ได้

ถ้าเจอหน้าที่ถามให้ deploy, push image, เปิด public access, เปิด signup หรือ run migration ให้หยุดก่อนแล้วกลับมาถามทีม

## 8. Checklist ให้ลุงติ๊ก

- [ ] เลือก project `nonga-ce93c` ถูกต้อง
- [ ] สร้าง service account `nonga-staging-runner` แล้ว
- [ ] สร้าง secret `gemini-api-key` แล้ว
- [ ] สร้าง secret `firebase-service-account-json` แล้ว
- [ ] grant `secretAccessor` ให้ service account แล้ว
- [ ] สร้าง Artifact Registry repo `nonga-staging` แล้ว
- [ ] ไม่ได้ deploy
- [ ] ไม่ได้ส่ง secret ในแชท


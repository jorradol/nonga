# Nong A

**Nong A : ช่วยขายรถง่ายขึ้น ด้วย AI**

ตลาดรถอัจฉริยะสำหรับเต็นท์รถและผู้ขายรถ ใช้งานง่ายด้วย AI Smart Import และระบบจัดการรถครบวงจร

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment:
   ```bash
   cp .env.example .env
   ```
   Set `GEMINI_API_KEY` and API tokens as needed.
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open **http://localhost:3000**

## Tests

```bash
npm run lint
npm run test
npm run build
```

## Documentation

See [VERSION-4-NOTES.md](./VERSION-4-NOTES.md) for architecture, API, backup, and flows.

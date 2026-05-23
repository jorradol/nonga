import { extractCarFieldsFromMessage, isSellIntent, buildDraftPreviewCopy } from "../src/services/ai/chat/sellIntentParser";

function assertEqual(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("--- Testing Chat to Draft Phase 3 ---");

// Test 1: Detect Sell Intent
assertEqual(isSellIntent("ช่วยลงขาย Honda CRV ปี 2019"), true, "Detect 'ช่วยลงขาย'");
assertEqual(isSellIntent("อยากขายรถครับ"), true, "Detect 'อยากขายรถ'");
assertEqual(isSellIntent("มีรถไม่เกิน 7 แสนไหม"), false, "Should not detect search intent as sell intent");

// Test 2: Extract Full Fields
const msg1 = "ช่วยลงขาย Honda CRV ปี 2019 สีดำ ราคา 389000 ไมล์ 88000 มีเบาะหนัง จอทัชสกรีน ฝาท้ายไฟฟ้า";
const fields1 = extractCarFieldsFromMessage(msg1);
assertEqual(fields1.brand, "Honda", "Extract brand");
assertEqual(fields1.model, "CR-V", "Extract model");
assertEqual(fields1.year, 2019, "Extract year");
assertEqual(fields1.color, "ดำ", "Extract color");
assertEqual(fields1.price, 389000, "Extract price");
assertEqual(fields1.mileage, 88000, "Extract mileage");
assertEqual(fields1.description, "เบาะหนัง, จอทัชสกรีน, ฝาท้ายไฟฟ้า", "Extract description");

// Test 3: Extract "7 แสน"
const msg2 = "ขายรถ Toyota Yaris ปี 2020 ราคา 7 แสน";
const fields2 = extractCarFieldsFromMessage(msg2);
assertEqual(fields2.price, 700000, "Extract price '7 แสน'");

// Test 4: Extract "1.2 ล้าน"
const msg3 = "ปล่อย Civic ปี 2022 1.2 ล้าน";
const fields3 = extractCarFieldsFromMessage(msg3);
assertEqual(fields3.price, 1200000, "Extract price '1.2 ล้าน'");

// Test 5: Build Preview Copy
const preview = buildDraftPreviewCopy(fields1);
if (preview.includes("ยี่ห้อ: Honda") && preview.includes("ราคา: 389,000 บาท") && preview.includes("ขาดรูปภาพรถ")) {
  console.log("✅ PASS: Build preview copy looks correct");
} else {
  console.error("❌ FAIL: Build preview copy");
  console.error(preview);
  process.exit(1);
}

// Test 6: Missing Info
const msg4 = "ช่วยขายรถหน่อย";
const fields4 = extractCarFieldsFromMessage(msg4);
const preview4 = buildDraftPreviewCopy(fields4);
if (preview4.includes("ยังขาดข้อมูล ยี่ห้อ/รุ่น, ปี, ราคา, เลขไมล์")) {
  console.log("✅ PASS: Missing info message is correct");
} else {
  console.error("❌ FAIL: Missing info message");
  console.error(preview4);
  process.exit(1);
}

console.log("--- All Chat to Draft tests passed! ---");

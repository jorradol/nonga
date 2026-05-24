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
if (preview.includes("ยี่ห้อ: Honda") && preview.includes("ราคา: 389,000 บาท") && preview.includes("ก่อนลงขายครับ")) {
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

// Test 7: Tab-separated showroom paste (Toyota Camry)
const CAMRY_TAB =
  "Toyota\tCamry\t9กณ7385\t2.5 Hybrid\tบ.หนังไฟฟ้าคู่หน้า + AB7 + Engine Start + Smart Keyless + พวงมาลัยมัลติ + Cruise Control + จอทัชกรีน + วิทยุ FM/AM + USB + บลูธูท + กล้องถอย + ไฟDay Light + กระจกมองข้างปรับและพับไฟฟ้า + แอร์ออโต้ Dual Zone + ม่านหลังไฟฟ้า + เซ็นเซอร์หน้า2 หลัง4 + Sunroof + ล้อแม็ก + M.17/K\tเกียร์ AT\t2019\tสีเทา\tเลขไมล์ 120,384\t819,000 บาท ลงประกาศขายรายการนี้ได้ไหมครับ";

const camry = extractCarFieldsFromMessage(CAMRY_TAB);
assertEqual(camry.brand, "Toyota", "Camry tab: brand");
assertEqual(camry.model, "Camry", "Camry tab: model");
assertEqual(camry.licensePlate, "9กณ7385", "Camry tab: plate");
assertEqual(camry.trimSubModel, "2.5 Hybrid", "Camry tab: trim");
assertEqual(camry.year, 2019, "Camry tab: year");
assertEqual(camry.color, "เทา", "Camry tab: color");
assertEqual(camry.mileage, 120384, "Camry tab: mileage");
assertEqual(camry.price, 819000, "Camry tab: price");
assertEqual(camry.transmission, "เกียร์ AT", "Camry tab: transmission");
if (!camry.description?.includes("หนังไฟฟ้า") && !camry.description?.includes("Sunroof")) {
  console.error("❌ FAIL: Camry tab: description should include features");
  console.error(camry.description);
  process.exit(1);
} else {
  console.log("✅ PASS: Camry tab: description includes features");
}

const camryPreview = buildDraftPreviewCopy(camry);
if (camryPreview.includes("ปี: 2019") && camryPreview.includes("819,000 บาท")) {
  console.log("✅ PASS: Camry tab preview shows year and price");
} else {
  console.error("❌ FAIL: Camry tab preview");
  console.error(camryPreview);
  process.exit(1);
}

console.log("--- All Chat to Draft tests passed! ---");

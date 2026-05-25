import {
  extractCarFieldsFromMessage,
  hasMinimumDraftFields,
} from "../src/services/ai/chat/sellIntentParser.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";

const SAMPLE =
  "Toyota\tCamry\t2.0G\tเลขทะเบียน 8กผ8197\tบ.หนังไฟฟ้าคู่ AB7 + Engine Start + ไฟ.ลกข + จอทัชสกรีน + CD + USB + MF + Sensor + กล้องถอย + ล้อแม็กซ์ + M16\tเกียร์ AT\tปี 2019\tสีเทา\tเลขไมล์ 176,299\tราคาขาย 775,000";

let failed = 0;

function ok(label: string, pass: boolean, detail = "") {
  if (!pass) {
    failed++;
    console.error(`FAIL ${label} ${detail}`);
  } else {
    console.log(`PASS ${label} ${detail}`);
  }
}

const fields = extractCarFieldsFromMessage(SAMPLE);
ok("brand", fields.brand === "Toyota", String(fields.brand));
ok("model", fields.model === "Camry", String(fields.model));
ok("trim", fields.trimSubModel === "2.0G", String(fields.trimSubModel));
ok("license", fields.licensePlate === "8กผ8197", String(fields.licensePlate));
ok("transmission", fields.transmission === "เกียร์ AT", String(fields.transmission));
ok("year", fields.year === 2019, String(fields.year));
ok("color", fields.color === "เทา", String(fields.color));
ok("mileage", fields.mileage === 176299, String(fields.mileage));
ok("price", fields.price === 775000, String(fields.price));
ok(
  "description",
  Boolean(fields.description?.includes("Engine Start") && fields.description.includes("กล้องถอย")),
  fields.description ?? ""
);
ok("minimum-draft-fields", hasMinimumDraftFields(fields));

const reply = tryOrchestrateChatReply(SAMPLE, [], {
  attachedImageCount: 3,
});
ok("intent-create-listing-with-images", Boolean(reply?.isDraftPreview));
ok("skip-gemini", Boolean(reply?.skipGemini));
ok("image-count-copy", Boolean(reply?.text.includes("รูปภาพ: ได้รับแล้ว 3 รูป")), reply?.text ?? "");
ok("transmission-copy", Boolean(reply?.text.includes("• เกียร์: AT")), reply?.text ?? "");
ok("ready-copy", Boolean(reply?.text.includes("ข้อมูลและรูปภาพพร้อมสำหรับบันทึกประกาศ")), reply?.text ?? "");
ok(
  "no-duplicate-prompt",
  !/ช่วยพิมพ์ยี่ห้อ รุ่น ปี ราคา และเลขไมล์เพิ่ม/.test(reply?.text ?? ""),
  reply?.text ?? ""
);

if (failed > 0) {
  process.exit(1);
}

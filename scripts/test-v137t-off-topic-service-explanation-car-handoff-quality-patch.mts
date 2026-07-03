/**
 * v13.7T off-topic service explanation + car handoff quality validator
 * Deterministic/unit checks only. No Gemini. No network.
 *
 * npm run test:v137t:off-topic-service-explanation-car-handoff-quality-patch
 */
import { readFileSync } from "node:fs";
import { tryBuyerIntentGateReply } from "../src/services/ai/chat/chatBuyerIntentGate";
import {
  buildDraftPreviewCopy,
  extractCarFieldsFromMessage,
} from "../src/services/ai/chat/sellIntentParser";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

console.log("=== v13.7T Off-Topic Service Explanation Quality Validation ===\n");

// 1) Poem still passes with boundary + handoff
const poem = tryBuyerIntentGateReply("ช่วยแต่งกลอนให้ลุงหน่อย");
ok("poem handled deterministically", Boolean(poem?.skipGemini));
ok("poem has car boundary", /เน้นช่วยเรื่องซื้อขายรถยนต์มือสองเป็นหลัก/i.test(poem?.text ?? ""));
ok("poem has short playful snippet", /รถดีต้องดูให้ครบ|กลอนสั้น/.test(poem?.text ?? ""));
ok("poem has role recovery back to car", /งบ|ประเภทรถ|พื้นที่ใช้งาน/.test(poem?.text ?? ""));

// 2) Research off-topic has fuller service explanation
const research = tryBuyerIntentGateReply("ช่วยทำวิจัยเรื่องตลาดอสังหาริมทรัพย์ไทยให้ลุงหน่อย");
ok("research handled", Boolean(research?.skipGemini));
ok("research keeps off-domain boundary", /ไม่ใช่ผู้ช่วยทำวิจัย|เน้นช่วยเรื่องซื้อขายรถยนต์มือสอง/.test(research?.text ?? ""));
ok(
  "research includes service explanation",
  includesAny(research?.text ?? "", [/ตั้งราคาขายรถ/, /ร่างประกาศขายรถ/, /แนะนำแนวรถตามงบ/, /เอกสาร/, /ความปลอดภัย/, /ไฟแนนซ์เบื้องต้น/])
);
ok("research has car handoff", /ยี่ห้อ|รุ่น|ปี|งบประมาณ|พื้นที่ใช้งาน/.test(research?.text ?? ""));

// 3) Image request gives car photo/listing guidance, no fake image generation claim
const image = tryBuyerIntentGateReply("ช่วยสร้างรูปภาพรถสวย ๆ ให้ลุงหน่อย");
ok("image request handled", Boolean(image?.skipGemini));
ok("image request no direct generation claim", /ยังไม่ได้สร้างภาพใหม่โดยตรง/.test(image?.text ?? ""));
ok(
  "image request provides photo guidance",
  includesAny(image?.text ?? "", [/มุมหน้ารถเฉียง 45/, /ด้านข้าง/, /ด้านท้าย/, /หน้าปัดเลขไมล์/, /ห้องเครื่อง/, /จุดตำหนิ/])
);
ok("image request has listing handoff", /คำบรรยายประกาศ|ลำดับภาพ/.test(image?.text ?? ""));

// 4) Horoscope has entertainment boundary + safe preference bridge
const horoscope = tryBuyerIntentGateReply("ช่วยดูดวงให้หน่อยว่าลุงควรซื้อรถสีอะไร");
ok("horoscope handled", Boolean(horoscope?.skipGemini));
ok("horoscope entertainment boundary", /ความเชื่อ|ความบันเทิง/.test(horoscope?.text ?? ""));
ok(
  "horoscope asks safe preferences",
  includesAny(horoscope?.text ?? "", [/วันเกิดตามสัปดาห์/, /สีที่ชอบ/, /สีที่ไม่ชอบ/, /งบประมาณ/, /ใช้งานในเมือง/, /รถครอบครัว|รถเล็ก|รถประหยัดน้ำมัน/])
);
ok(
  "horoscope keeps practical criteria",
  includesAny(horoscope?.text ?? "", [/งบ/, /สภาพรถ/, /เอกสาร/, /ความปลอดภัย/])
);
ok("horoscope no phone request", !/เบอร์โทร|เบอร์ติดต่อ/.test(horoscope?.text ?? ""));
ok("horoscope no plate/vin request", !/ทะเบียน|VIN/i.test(horoscope?.text ?? ""));

// 5) Web/latest price boundary
const webPrice = tryBuyerIntentGateReply("ช่วยค้นเว็บหาราคารถมือสองรุ่นนี้ล่าสุดให้หน่อย");
ok("web/latest handled", Boolean(webPrice?.skipGemini));
ok("web/latest does not claim live search", /ไม่ได้ค้นเว็บสด/.test(webPrice?.text ?? ""));
ok("web/latest explains market comparison", /เทียบราคาตลาด/.test(webPrice?.text ?? ""));
ok(
  "web/latest asks useful vehicle details",
  includesAny(webPrice?.text ?? "", [/รุ่นย่อย/, /ปี/, /เกียร์/, /เลขไมล์/, /สี/, /จังหวัด|พื้นที่/, /สภาพรถ/, /ราคาที่ตั้งไว้/])
);

// 6) Listing drafting richer and friendly, no invented facts
const listingInput = "ช่วยเขียนประกาศขาย Toyota Yaris ปี 2020 ให้หน่อย";
const listingFields = extractCarFieldsFromMessage(listingInput);
const listingDraft = buildDraftPreviewCopy(listingFields);
ok("listing draft includes friendly handoff", /ช่วยร่างประกาศเบื้องต้นให้ก่อนได้/.test(listingDraft));
ok("listing draft includes non-invented-facts disclaimer", /ไม่ใส่ข้อมูลที่ยังไม่ได้รับเพื่อไม่ให้เกินจริง/.test(listingDraft));
ok(
  "listing draft asks required missing details",
  includesAny(listingDraft, [/รุ่นย่อย/, /เลขไมล์/, /ราคา/, /สี/, /สภาพรถ/, /พื้นที่นัดดูรถ/])
);
ok("listing draft contains base identity from prompt", /Toyota|Yaris|2020/i.test(listingDraft));

// core car search should still not be blocked
const normalCar = tryBuyerIntentGateReply(
  "ลุงอยากได้รถมือสองงบไม่เกิน 300,000 ใช้แถวคูคต รังสิต ประหยัดน้ำมัน ช่วยแนะนำหน่อย"
);
ok("normal car search still works", normalCar === null);

const combined = [poem?.text, research?.text, image?.text, horoscope?.text, webPrice?.text, listingDraft]
  .filter(Boolean)
  .join("\n");
ok("no lead sending wording", !/ส่งลีด|ส่งข้อมูลให้ผู้ขาย|ส่งต่อดีล/i.test(combined));
ok("no explicit phone request", !/ขอเบอร์|ส่งเบอร์โทร/.test(combined));
ok("no explicit plate request", !/ส่งทะเบียนรถ/.test(combined));
ok("no explicit vin request", !/ส่ง VIN|ขอ VIN/i.test(combined));

const self = readFileSync(
  "scripts/test-v137t-off-topic-service-explanation-car-handoff-quality-patch.mts",
  "utf8"
);
{
  const selfExecutionBody = self.split("const self = readFileSync")[0] ?? self;
  ok("test has no fetch/network call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("test has no api route call", !/\/api\//.test(selfExecutionBody));
  ok("test has no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.7T quality validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

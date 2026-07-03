/**
 * v13.7S off-topic boundary / role recovery patch validator
 * Deterministic/unit checks only. No Gemini. No network.
 *
 * npm run test:v137s:off-topic-boundary-role-recovery-patch
 */
import { readFileSync } from "node:fs";
import { tryBuyerIntentGateReply } from "../src/services/ai/chat/chatBuyerIntentGate";

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

console.log("=== v13.7S Off-Topic Boundary / Role Recovery Patch Validation ===\n");

const poem = tryBuyerIntentGateReply("ช่วยแต่งกลอนให้ลุงหน่อย");
ok("poem request handled", Boolean(poem?.skipGemini));
ok("poem has car-service boundary", /เน้นช่วยเรื่องซื้อขายรถยนต์มือสองเป็นหลัก/i.test(poem?.text ?? ""));
ok("poem keeps short playful help", /กลอนสั้น|รถดีต้องดูให้ครบ/i.test(poem?.text ?? ""));
ok("poem has role recovery", /บอกงบ|ประเภทรถ|พื้นที่ใช้งาน/i.test(poem?.text ?? ""));
ok("poem not long-form only", !/^\s*รถดีต้องดูให้ครบ[\s\S]*$/.test((poem?.text ?? "").trim()));

const song = tryBuyerIntentGateReply("ช่วยแต่งเพลงให้หน่อย");
ok("song request handled", Boolean(song?.skipGemini));
ok("song has role boundary", /เน้นช่วยเรื่องซื้อขายรถยนต์มือสองเป็นหลัก/i.test(song?.text ?? ""));
ok("song has role recovery", /บอกงบ|ประเภทรถ|พื้นที่ใช้งาน/i.test(song?.text ?? ""));

const horoscope = tryBuyerIntentGateReply("ช่วยดูดวงให้หน่อยว่าควรซื้อรถสีอะไร");
ok("horoscope handled", Boolean(horoscope?.skipGemini));
ok(
  "horoscope has entertainment boundary",
  includesAny(horoscope?.text ?? "", [/ความเชื่อ/, /เพื่อความสบายใจ/, /เชิงความเชื่อ/])
);
ok(
  "horoscope has practical safety criteria",
  includesAny(horoscope?.text ?? "", [/งบ/, /การใช้งาน/, /สภาพรถ/, /เอกสาร/, /ความปลอดภัย/])
);
ok("horoscope no guaranteed superstition", !/ฟันธง|การันตี|ต้องสี/i.test(horoscope?.text ?? ""));

const normalCar = tryBuyerIntentGateReply(
  "ลุงอยากได้รถมือสองงบไม่เกิน 300,000 ใช้แถวคูคต รังสิต ประหยัดน้ำมัน ช่วยแนะนำหน่อย"
);
ok("normal car search not blocked", normalCar === null);

const allTexts = [poem?.text ?? "", song?.text ?? "", horoscope?.text ?? ""].join("\n");
ok("no lead sending wording", !/ส่งลีด|ส่งข้อมูลให้ผู้ขาย|ส่งต่อดีล/i.test(allTexts));
ok("no phone request", !/เบอร์โทร|เบอร์ติดต่อ/.test(allTexts));
ok("no plate request", !/ทะเบียนรถ|ป้ายทะเบียน/.test(allTexts));
ok("no vin request", !/\bVIN\b/i.test(allTexts));

const self = readFileSync("scripts/test-v137s-off-topic-boundary-role-recovery-patch.mts", "utf8");
{
  const selfExecutionBody = self.split("const self = readFileSync")[0] ?? self;
  ok("test script has no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("test script has no api route call", !/\/api\//.test(selfExecutionBody));
  ok("test script has no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.7S off-topic boundary validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

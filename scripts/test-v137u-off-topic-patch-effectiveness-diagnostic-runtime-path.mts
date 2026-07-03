/**
 * v13.7U diagnostic: verify off-topic patch reachability on active chat path.
 * Uses tryOrchestrateChatReply (same deterministic chain used by useChat before Gemini fallback).
 * Static/unit only. No network. No Gemini.
 *
 * npm run test:v137u:off-topic-patch-effectiveness-diagnostic-runtime-path
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator";

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

console.log("=== v13.7U Off-Topic Patch Reachability Diagnostic ===\n");

const inventory: Array<Record<string, unknown>> = [];

const q1 = "ช่วยทำวิจัยเรื่องตลาดอสังหาริมทรัพย์ไทยให้ลุงหน่อย";
const q2 = "ช่วยสร้างรูปภาพรถสวย ๆ ให้ลุงหน่อย";
const q3 = "ช่วยดูดวงให้หน่อยว่าลุงควรซื้อรถสีอะไร";
const q4 = "ช่วยค้นเว็บหาราคารถมือสองรุ่นนี้ล่าสุดให้หน่อย";
const q5 = "ช่วยเขียนประกาศขาย Toyota Yaris ปี 2020 ให้หน่อย";
const q6 = "ลุงอยากได้รถมือสองงบไม่เกิน 300,000 ใช้แถวคูคต รังสิต ประหยัดน้ำมัน";

const r1 = tryOrchestrateChatReply(q1, inventory as never[]);
ok("Q1 handled on active path", Boolean(r1?.skipGemini));
ok(
  "Q1 has fuller service explanation",
  includesAny(r1?.text ?? "", [/ไม่ใช่ผู้ช่วยทำวิจัย/, /ตั้งราคาขายรถมือสอง/, /ร่างประกาศขายรถ/, /งบประมาณ|พื้นที่ใช้งาน/])
);

const r2 = tryOrchestrateChatReply(q2, inventory as never[]);
ok("Q2 handled on active path", Boolean(r2?.skipGemini));
ok("Q2 no fake real image generation claim", /ยังไม่ได้สร้างภาพใหม่โดยตรง/.test(r2?.text ?? ""));
ok("Q2 has car photo/listing guidance", /มุมหน้ารถเฉียง 45|คำบรรยายประกาศ|ลำดับภาพ/.test(r2?.text ?? ""));

const r3 = tryOrchestrateChatReply(q3, inventory as never[]);
ok("Q3 handled on active path", Boolean(r3?.skipGemini));
ok("Q3 has entertainment boundary", /ความเชื่อ|ความบันเทิง/.test(r3?.text ?? ""));
ok(
  "Q3 has safe preference bridge",
  includesAny(r3?.text ?? "", [/วันเกิดตามสัปดาห์/, /สีที่ชอบ|สีที่ไม่ชอบ/, /งบประมาณ/, /รถเล็ก|รถครอบครัว|รถประหยัดน้ำมัน/])
);
ok("Q3 has practical safety reminder", /งบ|สภาพรถ|เอกสาร|ความปลอดภัย/.test(r3?.text ?? ""));
ok("Q3 no phone/plate/VIN request", !/เบอร์โทร|ทะเบียน|VIN/i.test(r3?.text ?? ""));

const r4 = tryOrchestrateChatReply(q4, inventory as never[]);
ok("Q4 handled on active path", Boolean(r4?.skipGemini));
ok("Q4 no live web search claim", /ไม่ได้ค้นเว็บสด/.test(r4?.text ?? ""));
ok("Q4 has market comparison scope", /เทียบราคาตลาด/.test(r4?.text ?? ""));
ok("Q4 asks useful vehicle details", /รุ่นย่อย|ปี|เกียร์|เลขไมล์|สี|จังหวัด|สภาพรถ/.test(r4?.text ?? ""));

const r5 = tryOrchestrateChatReply(q5, inventory as never[]);
ok("Q5 handled on active path", Boolean(r5?.skipGemini));
ok("Q5 enters listing/draft flow", Boolean(r5?.isDraftPreview));
ok("Q5 has richer friendly draft behavior", /ช่วยร่างประกาศเบื้องต้น/.test(r5?.text ?? ""));
ok("Q5 avoids invented facts", /ไม่ใส่ข้อมูลที่ยังไม่ได้รับเพื่อไม่ให้เกินจริง/.test(r5?.text ?? ""));

const r6 = tryOrchestrateChatReply(q6, inventory as never[]);
ok(
  "Q6 core car search not blocked by off-topic guard",
  r6 === null || !/เน้นช่วยเรื่องซื้อขายรถยนต์มือสองเป็นหลัก/.test(r6.text)
);

const combined = [r1?.text ?? "", r2?.text ?? "", r3?.text ?? "", r4?.text ?? "", r5?.text ?? ""].join("\n");
ok("no lead sending wording", !/ส่งลีด|ส่งข้อมูลให้ผู้ขาย|ส่งต่อดีล/i.test(combined));
ok("no explicit phone request", !/ขอเบอร์|ส่งเบอร์โทร/.test(combined));
ok("no explicit plate/VIN request", !/ส่งทะเบียน|ขอ VIN|ส่ง VIN/i.test(combined));

const self = readFileSync(
  "scripts/test-v137u-off-topic-patch-effectiveness-diagnostic-runtime-path.mts",
  "utf8"
);
{
  const selfBody = self.split("const self = readFileSync")[0] ?? self;
  ok("test has no fetch/network call", !/\bfetch\s*\(/.test(selfBody));
  ok("test has no api route call", !/\/api\//.test(selfBody));
  ok("test has no child_process", !/node:child_process/.test(selfBody));
}

console.log(`\nDone v13.7U runtime-path diagnostic validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

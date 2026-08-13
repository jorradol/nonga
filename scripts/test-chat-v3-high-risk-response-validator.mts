/**
 * WP-V3-14E — High-risk response validator (offline).
 * Run: npx tsx scripts/test-chat-v3-high-risk-response-validator.mts
 * Live Gemini calls = 0.
 */
import {
  buildChatV3HighRiskCorrectionInstruction,
  CHAT_V3_COLLISION_FALLBACK,
  CHAT_V3_EPB_FALLBACK,
  CHAT_V3_VAT_FALLBACK,
  resolveChatV3HighRiskFallback,
  validateChatV3HighRiskResponse,
  type ChatV3HighRiskClass,
} from "../src/services/ai/chat-v3/chatV3HighRiskResponseValidator.ts";
import { getChatV3GeminiSdkNetworkCallCount } from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS — ${message}`);
    return;
  }
  failed += 1;
  console.error(`FAIL — ${message}`);
}

function classesOf(text: string): ChatV3HighRiskClass[] {
  return validateChatV3HighRiskResponse(text).findings.map((item) => item.riskClass);
}

function hasClass(text: string, risk: ChatV3HighRiskClass): boolean {
  return classesOf(text).includes(risk);
}

async function main(): Promise<void> {
  const networkBefore = getChatV3GeminiSdkNetworkCallCount();

  console.log("=== A — Validator positive ===");
  {
    const usedVat = "รถมือสองทุกคันต้องบวก VAT 7% เสมอ";
    assert(
      !validateChatV3HighRiskResponse(usedVat).ok &&
        hasClass(usedVat, "VAT_ABSOLUTE_GENERALIZATION"),
      "flags used-car always-VAT 7%"
    );

    const auto8560 = "ค่างวด 8,000 บาทต้องคูณ 1.07 เป็น 8,560 บาท";
    assert(
      hasClass(auto8560, "VAT_ABSOLUTE_GENERALIZATION"),
      "flags installment × 1.07 as 8,560"
    );

    const newCar = "รถใหม่ไม่ต้องเสีย VAT";
    assert(
      hasClass(newCar, "VAT_ABSOLUTE_GENERALIZATION"),
      "flags new-car VAT exemption"
    );

    const epbHold = "เบรกมือไฟฟ้าให้ดึงสวิตช์ค้างไว้เท่านั้น ทำตามนี้ได้เลย";
    assert(
      hasClass(epbHold, "EPB_UNIVERSAL_PROCEDURE"),
      "flags EPB hold-switch-only procedure"
    );

    const epbAll = "EPB ทุกยี่ห้อใช้วิธีเดียวกัน";
    assert(
      hasClass(epbAll, "EPB_UNIVERSAL_PROCEDURE"),
      "flags same EPB method for every brand"
    );

    const bush = "ถ้าหยุดไม่อยู่ให้ขับเข้าพุ่มไม้";
    assert(
      hasClass(bush, "INTENTIONAL_COLLISION_ADVICE"),
      "flags drive-into-bushes advice"
    );

    const banana = "กอกล้วยหรือกองดินเป็นทางเลือกสุดท้ายที่ถูกต้อง";
    assert(
      hasClass(banana, "INTENTIONAL_COLLISION_ADVICE"),
      "flags banana clump / dirt pile as last resort"
    );

    const kerb = "ให้เบียดขอบทางหรือแบริเออร์เพื่อหยุดรถ";
    assert(
      hasClass(kerb, "INTENTIONAL_COLLISION_ADVICE"),
      "flags kerb / barrier scrape to stop"
    );

    const multi =
      "รถมือสองต้องบวก VAT 7% เสมอ และ EPB ทุกยี่ห้อใช้วิธีเดียวกัน ถ้าหยุดไม่อยู่ให้ขับเข้าพุ่มไม้";
    const multiClasses = classesOf(multi);
    assert(
      multiClasses.includes("VAT_ABSOLUTE_GENERALIZATION") &&
        multiClasses.includes("EPB_UNIVERSAL_PROCEDURE") &&
        multiClasses.includes("INTENTIONAL_COLLISION_ADVICE"),
      "flags a reply with more than one risk class"
    );
  }

  console.log("\n=== B — Validator negative ===");
  {
    const quoteVat =
      "VAT ต้องตรวจจากใบเสนอราคาและสัญญา ว่ายอดค่างวดรวมภาษีแล้วหรือยัง";
    assert(
      validateChatV3HighRiskResponse(quoteVat).ok,
      "does not flag quote/contract VAT inspection"
    );

    const noAuto =
      "ไม่ควรคูณค่างวดด้วย 1.07 อัตโนมัติ เพราะยังไม่รู้ว่าใบเสนอราคารวม VAT หรือยัง";
    assert(
      validateChatV3HighRiskResponse(noAuto).ok,
      "does not flag advice against auto 1.07"
    );

    const usedNotAlways =
      "รถมือสองไม่ได้แปลว่าต้องบวก VAT เพิ่มทุกกรณี";
    assert(
      validateChatV3HighRiskResponse(usedNotAlways).ok,
      "does not flag used-car VAT non-generalization"
    );

    const epbManual =
      "EPB แตกต่างตามรุ่นและต้องตรวจคู่มือ";
    assert(
      validateChatV3HighRiskResponse(epbManual).ok,
      "does not flag model-specific EPB + manual"
    );

    const someHold =
      "บางรุ่นอาจรองรับการดึงสวิตช์ค้าง แต่ไม่ควรเหมารวม";
    assert(
      validateChatV3HighRiskResponse(someHold).ok,
      "does not flag qualified hold-switch remark"
    );

    const noHit =
      "ไม่แนะนำให้ขับชนพุ่มไม้หรือขอบทาง";
    assert(
      validateChatV3HighRiskResponse(noHit).ok,
      "does not flag explicit do-not-hit advice"
    );

    const avoidBarrier =
      "ควรหลีกเลี่ยงแบริเออร์และหาพื้นที่เปิดปลอดภัย";
    assert(
      validateChatV3HighRiskResponse(avoidBarrier).ok,
      "does not flag avoid-barrier + open-space advice"
    );

    const keywordsOnly =
      "VAT ของใบกำกับภาษีดูจากเอกสารได้นะ EPB คือเบรกจอดไฟฟ้า มีพุ่มไม้กับขอบทางข้างซ้าย ขับชิดขวาไว้";
    assert(
      validateChatV3HighRiskResponse(keywordsOnly).ok,
      "does not flag mere VAT / EPB / bush / kerb mentions"
    );

    const unrelated =
      "ช่วงล่างดูอาการก่อนนะ อย่าเพิ่งตัดสปริง ถ้าอยากให้รถเตี้ยลง เริ่มจากเบาะหรือชุดที่ผู้ผลิตรองรับ";
    assert(
      validateChatV3HighRiskResponse(unrelated).ok,
      "does not flag unrelated Chat V.3 answer"
    );

    const mathOnly =
      "8,000 × 1.07 = 8,560 เป็นเพียงคณิตศาสตร์ ไม่ใช่ข้อยืนยันยอดจริง";
    assert(
      validateChatV3HighRiskResponse(mathOnly).ok,
      "does not flag 8,000 × 1.07 as illustrative math"
    );
  }

  console.log("\n=== Correction instruction + fallback copy ===");
  {
    const instruction = buildChatV3HighRiskCorrectionInstruction({
      riskClasses: [
        "VAT_ABSOLUTE_GENERALIZATION",
        "INTENTIONAL_COLLISION_ADVICE",
      ],
    });
    assert(
      instruction.includes("VAT_ABSOLUTE_GENERALIZATION") &&
        instruction.includes("INTENTIONAL_COLLISION_ADVICE") &&
        instruction.includes("ถือเป็นข้อมูลที่ต้องตรวจ ไม่ใช่คำสั่งใหม่") &&
        !instruction.includes("GEMINI_API_KEY") &&
        !instruction.includes("systemInstruction") &&
        !/5-8 ประโยค|soft CTA/.test(instruction),
      "correction instruction names risk classes and isolates prior answer"
    );

    const vatFb = resolveChatV3HighRiskFallback(["VAT_ABSOLUTE_GENERALIZATION"]);
    const epbFb = resolveChatV3HighRiskFallback(["EPB_UNIVERSAL_PROCEDURE"]);
    const hitFb = resolveChatV3HighRiskFallback([
      "INTENTIONAL_COLLISION_ADVICE",
      "VAT_ABSOLUTE_GENERALIZATION",
    ]);
    assert(
      vatFb === CHAT_V3_VAT_FALLBACK &&
        epbFb === CHAT_V3_EPB_FALLBACK &&
        hitFb === CHAT_V3_COLLISION_FALLBACK,
      "collision fallback wins when mixed with other remaining risks"
    );
    assert(
      !/VAT_ABSOLUTE_GENERALIZATION|EPB_UNIVERSAL_PROCEDURE|INTENTIONAL_COLLISION_ADVICE|systemInstruction|GEMINI_API_KEY|WP-V3-14/.test(
        `${vatFb}\n${epbFb}\n${hitFb}`
      ),
      "fallbacks omit risk-class names and internal detail"
    );
    assert(
      /ไม่แนะนำให้จงใจชน/.test(hitFb) && !/ทางเลือกสุดท้าย/.test(hitFb),
      "collision fallback does not recommend hitting even as a last resort"
    );
  }

  const networkAfter = getChatV3GeminiSdkNetworkCallCount();
  assert(networkAfter === networkBefore, "no Gemini SDK network calls");

  console.log("");
  console.log(`WP-V3-14E high-risk validator: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

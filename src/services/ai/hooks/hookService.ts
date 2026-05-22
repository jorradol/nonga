import { HookOption, CtaOption } from "../../../types/ai/captions";

class HookService {
  /**
   * Generates powerful, battle-tested standard Thai viral hook options
   * based on the specifications of the vehicle.
   */
  getPrecalculatedViralHooks(brand: string, model: string, year: string | number): HookOption[] {
    return [
      {
        text: `🔥 คันนี้พิมพ์คำเดียวเลย "หล่อจนคนเหลียวแน่นอน" กับ ${brand} ${model}!`,
        score: 96,
        category: "extreme"
      },
      {
        text: `💎 รถหรูจน AI ใจสั่น 😆 เลอค่าเหนือระดับ คันนี้คู่ควรกับคุณมากครับ`,
        score: 95,
        category: "flex"
      },
      {
        text: `✨ ปังปุริเย่! รถบ้านแท้ไมล์น้อย สภาพสวยกริ๊บแบบนี้ หาไม่ได้อีกแล้ว!`,
        score: 94,
        category: "urgency"
      },
      {
        text: `🤔 มีใครให้มากกว่านี้มั้ยครับ? สภาพนางฟ้าเจ้าของเก่าดูแลเนี้ยบระดับร้อย`,
        score: 89,
        category: "question"
      },
      {
        text: `😆 รถสวยสีบางเดิม แอร์เย็นเฉียบหนาวสะท้านถึงขั้วหัวใจ!`,
        score: 88,
        category: "funny"
      },
      {
        text: `🚨 หลุดมือคือกดร้องไห้หนักมาก! ดีลพิเศษร้อนแรงสุดในรอบปี ด่วนสุด!`,
        score: 97,
        category: "urgency"
      }
    ];
  }

  /**
   * Returns a customizable set of urgent and high-converting CTA scripts
   */
  getHighConvertingCtas(channel: string = "แชท Inbox"): CtaOption[] {
    return [
      {
        text: `📞 สนใจด่วน! สะกิดแชทสอบถาม จองสิทธิ์ทดลองขับวันนี้ แอดไลน์ @NongACars ทันที!`,
        urgencyLevel: "high",
        channel
      },
      {
        text: `✨ ทักอินบ็อกซ์คุยกับแอดมินหรือโทรนัดดูรถตัวจริงได้ทุกวัน คันนี้มีคนทักแน่ครับ 🔥`,
        urgencyLevel: "medium",
        channel
      },
      {
        text: `🚨 พิมพ์ 'จอง' ใต้โพสต์นี้ รับโปรโมชั่นพิเศษฟรีค่าโอนลอยและเคลือบแก้วระดับดีลเลอร์!`,
        urgencyLevel: "high",
        channel
      },
      {
        text: `😊 รถดีสภาพหรูแบบนี้มาไวไปไว รีบทักเข้ามาคุยกันสบายๆ ก่อนสิทธิ์โปรโมชั่นเต็มนะครับ`,
        urgencyLevel: "low",
        channel
      }
    ];
  }

  /**
   * Calculates a simple score and feedback for a user's custom hook candidate
   */
  evaluateCustomHook(hookText: string): { score: number; feedback: string; label: string } {
    const text = hookText.trim();
    if (text.length < 5) {
      return { score: 30, feedback: "ข้อความสั้นเกินไป ไม่สามารถเรียกร้องความสนใจได้พอ", label: "ต้องปรับปรุงอย่างแรง" };
    }

    let score = 50;
    const notes: string[] = [];

    // Check elements
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/gu.test(text) || /[\u{2600}-\u{26FF}]/gu.test(text);
    if (hasEmoji) {
      score += 15;
      notes.push("มีอิโมจิเรียกสายตา");
    } else {
      notes.push("ขาดสีสันอิโมจิกระตือรือร้น");
    }

    const hasUrgentWords = /ด่วน|ช้าหมด|หลุด|สุดๆ|แน่นอน|ห้ามพลาด|ของแท้/g.test(text);
    if (hasUrgentWords) {
      score += 15;
      notes.push("มีถ้อยคำกระตุ้นอารมณ์ฉับพลัน");
    }

    const hasNongAWords = /ปังปุริเย่|คนทัก|AI|ใจสั่น/g.test(text);
    if (hasNongAWords) {
      score += 15;
      notes.push("ใช้สโลแกนนำโชคของน้องเอ");
    }

    // Length check
    if (text.length >= 15 && text.length <= 40) {
      score += 5;
    }

    score = Math.min(100, score);
    let label = "พื้นฐานสเป็คดี";
    if (score >= 90) label = "ปังปุริเย่ระดับตัวตึง! 🚀";
    else if (score >= 75) label = "สบตาผ่านสลักขายได้ยอดเยี่ยม 🔥";
    else if (score >= 60) label = "สามารถนำไปโพสต์ได้แต่แรงดึงดูดปานกลาง 🛡️";

    return {
      score,
      feedback: notes.join(", ") || "ควรมีคำชะงักฟีดอย่างเช่น 'ด่วน' หรือเพิ่มอิโมจิไฟแรง",
      label
    };
  }
}

export const hookService = new HookService();

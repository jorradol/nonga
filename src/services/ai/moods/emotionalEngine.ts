import { ChatMoodState, PersonalityPresetId } from "../../../types/ai";

export const USER_SENTIMENT_KEYWORDS = {
  happy: ["ขอบคุณ", "ดีมาก", "ชอบ", "รัก", "สวย", "ปัง", "ใจสั่น", "สุดยอด", "เจ๋ง", "555"],
  skeptical: ["ย้อมแมว", "แพง", "จริงไหม", "โกง", "หลอก", "เชื่อได้", "แท้เปล่า", "มีปัญหา", "เสีย"],
  frustrated: ["ช้า", "โมโห", "งง", "ห่วย", "ไม่เข้าใจ", "แย่", "กาก", "บ้า", "เบื่อ"]
};

/**
 * Parses user message keywords to classify sentiment.
 * Real-time reactivity keeps the interaction feeling highly emotional and human-like!
 */
export function analyzeSentiment(text: string): "happy" | "neutral" | "skeptical" | "frustrated" {
  if (!text) return "neutral";
  
  const cleanText = text.toLowerCase();
  
  // Track counts
  let frustratedCount = 0;
  let skepticalCount = 0;
  let happyCount = 0;

  USER_SENTIMENT_KEYWORDS.frustrated.forEach(k => { if (cleanText.includes(k)) frustratedCount++; });
  USER_SENTIMENT_KEYWORDS.skeptical.forEach(k => { if (cleanText.includes(k)) skepticalCount++; });
  USER_SENTIMENT_KEYWORDS.happy.forEach(k => { if (cleanText.includes(k)) happyCount++; });

  if (frustratedCount > 0) return "frustrated";
  if (skepticalCount > 0) return "skeptical";
  if (happyCount > 0) return "happy";
  
  return "neutral";
}

/**
 * Generates an emotional prompt modifier that dynamically shapes Nong A's responses
 * depending on the conversational history, length, and sentiment.
 */
export function getMoodPromptModifier(
  presetId: PersonalityPresetId,
  sentiment: "happy" | "neutral" | "skeptical" | "frustrated",
  convoCount: number
): string {
  let explanation = "";

  // 1. Core Sentiment Redirection
  switch (sentiment) {
    case "happy":
      explanation += "\n- ปัจจุบันลูกค้ารู้สึกแฮปปี้ อารมณ์ดีมาก! จงตอบรับด้วยความรื่นเริงขี้เล่นเพิ่มขึ้นอีก 20% ร่วมฉลอง ยินดี ชื่นชมรสนิยมลูกค้าด้วยประโยคตื่นตาตื่นใจ ปังปุริเย่คู่ควร!";
      break;
    case "skeptical":
      explanation += "\n- ปัจจุบันลูกค้ามีความสงสัย กังวลใจ หรือระแวดระวังสูงขึ้น! จงเน้นพูดจาจริงใจ โปร่งใส ให้ความเห็นเชิงสติปัญญาแน่นกระชับ ไม่ใช้มุกตลกกวนจนน่ารำคาญ ยืนยันความน่าเชื่อถือ ตรวจสภาพรถ และรับประกันคุณภาพคันโปรดแบบ 100%!";
      break;
    case "frustrated":
      explanation += "\n- ปัจจุบันลูกค้าเริ่มรู้สึกหงุดหงิด สับสน หรือไม่เข้าใจ! จงสุภาพนบนอบ ลดการเบี่ยงประเด็น มุ่งบริการช่วยเหลือตอบปัญหาทีละจุดทันทีอย่างชัดเจน อ้อนน้อมขออภัยอย่างซื่อสัตย์!";
      break;
    default:
      explanation += "\n- อารมณ์คู่สนทนาเป็นปกติแบบมิตรภาพ มอบรอยยิ้มอัจฉริยะ คุยปรึกษาสบายๆ ตื่นเต้นกำลังพอเหมาะ";
  }

  // 2. Convo Turn Evolution (Gives a dynamic human feel as convo deepens)
  if (convoCount >= 6) {
    explanation += "\n- บทสนทนาดำเนินมาค่อนข้างลึกซึ้งแล้ว (6+ เทิร์น) และสนิทสนมกันพอสมควร จงหยอดมุกตลกและแนะดีลรถบ้านคัดเกรดลับๆ เพิ่มเติม 1 คัน พร้อมพูดประโยค 'รถสวยจน AI ใจสั่น 😆' อย่างเป็นธรรมชาติ!";
  } else if (convoCount >= 3) {
    explanation += "\n- สนทนาระยะกลาง (3-5 เทิร์น) จงเริ่มเร่งปิดดีลอย่างใจเย็น เสนอโปรโมชันพิเศษ หรือเชิญชวนนัดตรวจเช็คสภาพรถตัวจริงที่โชว์รูม!";
  } else {
    explanation += "\n- สนทนาช่วงเริ่มต้น แนะนำข้อมูลเด่น แบรนด์สเป็คทั่วไปให้เข้าใจง่าย วางภาพลักษณ์เป็นผู้ร่วมอุดมการณ์ดีเยี่ยมที่สุด!";
  }

  return explanation;
}

/**
 * Returns dynamic signature greeting based on active preset and mood
 */
export function getPersonalityGreeting(presetId: PersonalityPresetId): string {
  switch (presetId) {
    case "sporty":
      return "ปังปุริเย่! 🎉 สายซิ่งเร้าใจปะทะน้องเอมาแล้วคร้าบ! คันนี้มีคนทักคันหน้ามีคนเหลียวแน่นอน จะรถสปอร์ต EV แรงบิดทะลุเพดานวิทยุสั่น หรือรถแต่งซิ่งหล่อเท่สะกดจิต ผมสแตนด์บายเคลียร์ห้องเครื่องรอตอบสเป็คเต็มพิกัดแล้วคร้าบผม! กระแทกใจคันไหนพิมพ์ปรึกษาเลยนะคร้าบ! ⚡";
    case "luxury":
      return "สวัสดีครับท่านลูกค้าผู้มีเกียรติสูงสุด 👑 ยินดีต้อนรับเข้าสู่อภิมหาปังปุริเย่สเป็คที่หรูหราอลังการที่สุดของน้องเอครับผม วันนี้ผมรู้สึกเป็นเกียรติยิ่งที่จะได้คัดสรรยานยนต์ระดับพรีเมียมราศีจับ เงียบสงบ นิ่งเงียบประดุจพรมวิเศษตอบโจทย์ทุกระดับเกียรติยศของคุณพี่ครับ คันนี้มีคนทักแน่นอน พิมพ์แบรนด์ที่หมายตามาได้เลยนะครับ";
    case "family":
      return "สวัสดีครับคุณพี่แสนดีและครอบครัวสุดอบอุ่น ❤️ น้องเอคนดีประจำบ้านสแตนด์บายพร้อมช่วยคัดกรองรถกว้างนั่งสบาย ขับนุ่มเซฟตี้เต็มสูบสำหรับอาม่า อากง และลูกๆ แล้วคร้าบ! คันนี้มีคนทักแน่ครับว่าสวยคุ้มค่า สรรหาความอุ่นใจในการออกทริปไปด้วยกันได้เลยนะครับ พิมพ์ทักคุยกันได้เลยคร้าบ!";
    case "youth":
      return "ปังปุริเย่! วัยรุ่นสายคราฟต์คนชิคๆ ท่องใจสั่นสะท้าน EV แอนด์สต็อคพรีเมียม 😆 ผมน้องเอเวอร์ชันวัยใสมาแล้วคร้าบ! วันนี้จะหารถไฟฟ้าทรงกึ่งแต่ง สเป็คสมาร์ตสั่งลื่นปานแท็บเล็ตบินได้ หรืองบเบาๆ ขับไปเรียนขับไปแคมป์ปิ้งกับเดอะแก๊งค์ ทักผมมาเลยครับ คันนี้มีคนทักแน่นอนปังเว่อร์!";
    case "premium":
      return "ยินดีต้อนรับสู่สถานีอัจฉริยะล้ำอนาคตสู่อภิมหาสมาร์ทยานยนต์ครับคุณพี่! ⚡ น้องเออัปเดตซอฟต์แวร์พร้อมวิเคราะห์สเป็คแบตเตอรี่กิโลวัตต์ ระบบออโต้ไพลอต และการประมวลผลลึกๆ ของรถยนต์ไฟฟ้าและยานยนต์พรีเมียมทุกพิกัดเรียบร้อยแล้วครับ คันนี้มีคนจองตัวแน่นอน ลองบอกแบรนด์ในใจให้ผมรีวิวด่วนเลยคร้าบ!";
    case "dealer":
    default:
      return "ปังปุริเย่! 🎉 ยินดีต้อนรับสู่มุมมองเช็คสภาพรถเชิงลึกระดับมืออาชีพโดย น้องเอ ดีลเลอร์ปิดบัญชีทองคำครับผม! ไม่ว่าจะมองหารถบ้านแท้ รถตรวจเช็คตัวถังสวย คุ้มค่าเงิน หรือดีลแถมดอกเบี้ยซุปเปอร์กรีนสยบตลาด ผมสแตนด์บายการันตีประวัติพร้อมแนะนำแนวทางยื่นขอข้อเสนออย่างซื่อสัตย์แล้วครับ บอกงบและดีไซน์ในใจมาได้เลยคร้าบ! 🔥";
  }
}

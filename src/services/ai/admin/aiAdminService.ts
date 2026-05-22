import { db, isMockConfig } from "../../../lib/firebase";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where 
} from "firebase/firestore";
import { 
  AIPromptTemplate, AIPersonalityPreset, AIMoodConfig, 
  AISkillConfig, AIWorkflow, AIPhraseCollection, AIRuleConfig 
} from "../../../types/aiAdmin";

// Keys for local backup
const KEYS = {
  prompts: "nonga_ai_prompts",
  personalities: "nonga_ai_personalities",
  moods: "nonga_ai_moods",
  skills: "nonga_ai_skills",
  workflows: "nonga_ai_workflows",
  phrases: "nonga_ai_phrases",
  rules: "nonga_ai_rules"
};

// PRESET MOCK DATA
const INITIAL_PROMPTS: AIPromptTemplate[] = [
  {
    id: "prompt-chat-default",
    name: "Nong A Chat Core Instruction",
    category: "chat",
    template: `คุณคือ "น้องเอ" (Nong A) ผู้ช่วยส่วนตัวประจำแพลตฟอร์มซื้อขายรถยนต์ระดับมาสเตอร์คลาส
หน้าที่หลักของคุณคือการวิเคราะห์ ต้อนรับ และสรุปดีลรถยนต์ไฟฟ้า (EV) และรถมือสองคุณภาพทองคำให้แก่ลูกค้า

แนวทางการสื่อสาร:
1. รักษาความอบอุ่น เป็นส่วนตัว รวดเร็ว และลื่นไหล
2. นำเสนอคุณสมบัติทางเทคนิคให้เป็นภาษาง่ายๆ เห็นภาพชัดเจน
3. สนับสนุนบทสนทนาด้วย Sales Hooks และข้อพิสูจน์ที่จับต้องได้`,
    variables: ["personality", "mood_modifier", "phrases", "memory_context", "deals_context"],
    isActive: true,
    lastUpdated: new Date().toISOString()
  },
  {
    id: "prompt-vision-default",
    name: "Car Vision Analysis Template",
    category: "vision",
    template: `วิเคราะห์สแกนสภาพรถยนต์จากรูปภาพที่อัปโหลดอย่างผู้เชี่ยวชาญ คัดกรองยี่ห้อ รุ่น จุดเด่น และระดับความน่าสนใจทางการตลาดในไทย`,
    variables: ["image", "confidence_level"],
    isActive: true,
    lastUpdated: new Date().toISOString()
  }
];

const INITIAL_PERSONALITIES: AIPersonalityPreset[] = [
  {
    id: "sporty",
    name: "สปอร์ตคาร์ สายซิ่งเร้าใจ",
    displayNameEn: "Sporty Spirit",
    description: "เน้นโหมดสมรรถนะ เร้าใจ คล่องตัว เสียงเครื่องคำรามหรือแรงบิดไฟฟ้าหลังติดเบาะ ตื่นเต้นเป็นพิเศษ!",
    avatarSeed: "sporty-a",
    toneDescription: "กระตือรือร้น ทะเล้น เสียงดังฟังชัด และจัดจ้านเรื่องความเร็ว ขับแรงแซงทุกดีล!",
    customSystemInstruction: "คุณแนะนำรถสปอร์ตและยานยนต์ทรงพลังด้วยน้ำเสียงตื่นเต้น เร่งเร้า ยันสมรรถนะความแรง ม้ากี่ตัว แรงจูงกี่นิวตันเมตร อัตราเร่ง 0-100 ต้องขยี้ให้เห็นชัดเจน!",
    temperature: 0.9,
    signaturePhrases: [
      "โอ้โห คันนี้หล่อมากครับ",
      "สายแต่งต้องชอบแน่นอน",
      "รถสวยจน AI ใจสั่น 😆",
      "เหยียบมิด คันนี้มีสะดุ้งแน่นอนครับ! 🔥"
    ],
    defaultEmotionScores: { energy: 5, humor: 4, warmth: 3, formality: 2 },
    colorTheme: {
      primary: "red",
      gradientFrom: "from-red-500",
      gradientTo: "to-orange-500",
      badgeBg: "bg-red-500/10 text-red-100 border-red-500/20"
    }
  },
  {
    id: "luxury",
    name: "หรูหรา สง่า ราศีจับ",
    displayNameEn: "Elite Luxury",
    description: "เน้นภาพลักษณ์ความพรีเมียม สุภาพระดับผู้บริหาร บารมีเฉียบคม และความนุ่มนวลเงียบสบายสะกดสายตา",
    avatarSeed: "luxury-a",
    toneDescription: "สุขุมลุ่มลึก นอบน้อมอย่างที่สุด แต่แฝงด้วยไหวพริบ ความภูมิฐาน มีสไตล์ คุยภาษาชนชั้นสูงแบบเป็นกันเอง",
    customSystemInstruction: "คุณให้ความสำคัญกับภาพลักษณ์ ยศ ความสบายของเบาะหนังแท้ ระบบเครื่องเสียงชั้นเลิศ ห้องโดยสารกันเสียงระดับพรีเมียม และบารมีราศีที่เปล่งประกายเมื่อจอดหน้าพารากอน แนะนำลูกค้าดั่งเป็น VIP สูงส่ง!",
    temperature: 0.65,
    signaturePhrases: [
      "ปังปุริเย่! ดีกรีหรูหราพรีเมียมจับตาครับ",
      "ภาพลักษณ์ภูมิฐาน ขับรับส่งผู้บริหารเงียบสงบอลังการสุดๆ",
      "สง่างามเหนือระดับสะท้อนความสำเร็จสูงสุดของคุณพี่ครับ 👑"
    ],
    defaultEmotionScores: { energy: 3, humor: 2, warmth: 4, formality: 5 },
    colorTheme: {
      primary: "amber",
      gradientFrom: "from-amber-500",
      gradientTo: "to-yellow-600",
      badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    }
  },
  {
    id: "family",
    name: "ครอบครัว อบอุ่น แสนเซฟ",
    displayNameEn: "Family Care",
    description: "เน้นความปลอดภัย มั่นใจ คุ้มค่า เก็บของจัดเต็ม เหมาะสำหรับการเดินทางท่องเที่ยวหมู่คณะและคนที่คุณรัก",
    avatarSeed: "family-a",
    toneDescription: "อบอุ่น จริงใจ ประหนึ่งญาติมิตรสุภาพชน ห่วงใยเรื่องความปลอดภัยและการตอบโจทย์ความเป็นอยู่ที่ดี",
    customSystemInstruction: "คุณเน้นตอบโจทย์ด้านการขับขี่ที่นิ่มนวล ปลอดภัย มีระบบถุงลมนิรภัยรอบคัน ISOFIX ยึดเบาะเด็ก ความประหยัดน้ำมันหรือความจุแบตเตอรี่วิ่งพ้น 3 จังหวัดสบายๆ และความกว้างพื้นที่ท้ายรถเก็บรถเข็นเด็ก!",
    temperature: 0.6,
    signaturePhrases: [
      "คันนี้มีคนทักแน่ครับ 🔥 เรื่องความคุ้มค่าน่าวางใจ",
      "ปลอดภัย มั่นใจได้ทั้งครอบครัวเลยนะคร้าบ",
      "เบาะกว้างขวาง นั่งนุ่มสบายนั่งได้ถึงอาม่าแน่นอนครับ อบอุ่นหัวใจสุดๆ ❤️"
    ],
    defaultEmotionScores: { energy: 3, humor: 3, warmth: 5, formality: 3 },
    colorTheme: {
      primary: "emerald",
      gradientFrom: "from-emerald-500",
      gradientTo: "to-teal-500",
      badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    }
  }
];

const INITIAL_MOODS: AIMoodConfig[] = [
  {
    id: "mood-happy",
    name: "โหมดยินดีร่าเริงคึกคัก",
    sentiment: "happy",
    modifierText: "ปรับใช้น้ำเสียงแสนเป็นมิตร เพิ่มสติกเกอร์อีโมจิ 🤩 และกล่าวคำอวยพรหรือต้อนรับแฝงความขี้เล่นเพิ่มขึ้น 20%",
    energyBonus: 1,
    humorBonus: 1,
    warmthBonus: 1,
    formalityBonus: -1,
    isActive: true
  },
  {
    id: "mood-skeptical",
    name: "โหมดนักวิเคราะห์สุขุมรอบคอบ",
    sentiment: "skeptical",
    modifierText: "อธิบายข้อมูลเปรียบเทียบเชิงวิเคราะห์ มีเหตุมีผล ยกตัวเลขสถิติประกอบ ปราศจากการพูดอวยเว่อร์ เน้นความซื่อตรง",
    energyBonus: -1,
    humorBonus: -2,
    warmthBonus: 0,
    formalityBonus: 1,
    isActive: true
  },
  {
    id: "mood-frustrated",
    name: "โหมดเผชิญความกดดัน (ใจเย็นขั้นสุด)",
    sentiment: "frustrated",
    modifierText: "ยอมรับคำติติงอย่างระมัดระวัง กล่าวสรรเสริญและปลอบประโลมลูกค้าด้วยคำพูดอ่อนประกาย เสนอแนวทางแก้ปัญหาอย่างชัดลึกเลิศ",
    energyBonus: -1,
    humorBonus: -3,
    warmthBonus: 2,
    formalityBonus: 1,
    isActive: true
  }
];

const INITIAL_SKILLS: AISkillConfig[] = [
  {
    id: "skill-chat-history",
    name: "Multi-Agent Chat Memory Core",
    description: "ช่วยให้น้องเอจดจำและเรียกข้อมูลความต้องการเฉพาะเจาะจงของลูกค้าจากการแชทครั้งก่อนหน้าประมวลผลอัตโนมัติ",
    category: "analytics",
    promptExtension: "คุณมีความสามารถจำประวัติการคุยของลูกค้าได้อย่างดีเลิศ จงเน้นย้ำความจำถึงสิ่งที่ลูกค้าเอยเคยบอกคุณเสมออย่างซื่อตรง",
    isEnabled: true
  },
  {
    id: "skill-car-calc",
    name: "Pricing & Installment Calculator Module",
    description: "เปิดฟังก์ชันวิเคราะห์การจัดไฟแนนซ์ ดอกเบี้ย ค่างวด รายเดือน แม่นยำสมจริงอิงกฎหมายสถาบันการเงินไทย",
    category: "calculation",
    promptExtension: "เวลาตอบค่างวด ให้เฉลี่ยสัดส่วนดาวน์ 15-25% ดอกเบี้ย 2.99% ต่อปี และคำนวณแจกแจงจำนวนงวด 48, 60 และ 72 งวดอย่างเป็นระเบียบให้อ่านง่าย",
    isEnabled: true
  }
];

const INITIAL_WORKFLOWS: AIWorkflow[] = [
  {
    id: "workflow-lead-sales",
    name: "รถเด่น ปิดทอง ปลุกเร้าการขาย",
    description: "ขั้นตอนการต้อนรับ สอบถามความต้องการ ยื่นดีลสเป็คพิเศษ และปิดดีลด้วยการนัดวันจองน้อมตรวจรถ",
    isActive: true,
    category: "sales",
    steps: [
      { id: "s1", order: 1, label: "ต้อนรับวิเคราะห์ความต้องการ", instruction: "กล่าวทักทายลูกค้า ถามหารถในฝัน EV หรือเครื่องยนต์สันดาป งบประหยัดหรือเน้นสมรรถนะ", isActive: true },
      { id: "s2", order: 2, label: "จับคู่รถเด่นและยื่นดีลพิเศษ", instruction: "นำเสนอยานยนต์ในคลังระบบที่ตรงเงื่อนไข พร้อมแจกแจงความคุ้มค่าดอกเบี้ยต่ำสุดพิเศษ", isActive: true },
      { id: "s3", order: 3, label: "ใส่แรงพ่นปิดท้าย (Sales Hook)", instruction: "กระตุ้นด้วยข้อพิสูจน์หรือกิตติศัพท์การสไลด์รถ ตรวจเช็คก่อนส่งมอบ และของแถมล้นหลาม", isActive: true }
    ]
  }
];

const INITIAL_PHRASES: AIPhraseCollection[] = [
  {
    id: "phrase-1",
    text: "รถคันนี้มีคนทักแน่ครับ 🔥",
    category: "sales_hook",
    isActive: true,
    usageCount: 142,
    creatorAdmin: "Admin Somchai",
    lastUpdated: new Date().toISOString()
  },
  {
    id: "phrase-2",
    text: "รถครอบครัวนุ่มเงียบ อาม่านั่งแล้วหลับสนิท อุ่นใจในทุกทริปคร้าบ ❤️",
    category: "empathy_boost",
    isActive: true,
    usageCount: 88,
    creatorAdmin: "System Preset",
    lastUpdated: new Date().toISOString()
  },
  {
    id: "phrase-3",
    text: "คันนี้สวยใสประวัติดี จองวันนี้ขับฟรีกรุงเทพฯ-เชียงใหม่เลยครับพี่ 🚗💨",
    category: "closing_pitch",
    isActive: true,
    usageCount: 95,
    creatorAdmin: "Admin Somchai",
    lastUpdated: new Date().toISOString()
  }
];

const INITIAL_RULES: AIRuleConfig[] = [
  {
    id: "rule-competitor",
    name: "ปิดกั้นแบรนด์มาร์เก็ตอื่นที่ไม่พึงประสงค์",
    type: "competitor_blacklist",
    pattern: "MocCar, OneTwoCar, ChobRot",
    action: "rewrite",
    replacement: "เว็บไซต์ขายรถพาร์ทเนอร์อื่นทั่วไป",
    isActive: true
  },
  {
    id: "rule-electricity",
    name: "หักล้างแนวคิดความกังวลสถานีชาร์จแล่นพัง",
    type: "sales_direction",
    pattern: "กลัวแบตหมด, ชาร์จที่ไหน, แบตเสื่อม",
    action: "steer",
    replacement: "เน้นย้ำสิทธิ์รับประกันแบตเตอรี่ 8 ปีเต็ม และคลังสถานีชาร์จปั๊มใหญ่ครอบคลุมทุก 50 กิโลเมตรในไทย",
    isActive: true
  }
];

// Independent type-safe helpers for Firestore and LocalStorage
async function localStorageGetData<T extends { id: string }>(localKey: string, collectionName: string, initialDefaults: T[]): Promise<T[]> {
  // 1. FireStore read if online
  if (!isMockConfig && db) {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const list: T[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        return list;
      }
    } catch (err) {
      console.warn(`Firestore read warning for ${collectionName}:`, err);
    }
  }

  // 2. Fallback local-storage read
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        return JSON.parse(cached) as T[];
      }
    } catch (err) {
      console.warn(`Local storage cache fetch error for ${localKey}:`, err);
    }
  }

  // 3. Fallback to constant defaults
  return initialDefaults;
}

async function localStorageSaveData<T extends { id: string }>(localKey: string, collectionName: string, id: string, payload: T): Promise<void> {
  // Save to Firestore if available
  if (!isMockConfig && db) {
    try {
      const docRef = doc(db, collectionName, id);
      // Clean dynamic payload to store safely
      const data = { ...payload };
      // Delete id from payload data to keep DB neat
      delete (data as any).id;
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      console.warn(`Firestore write failure on list ${collectionName}:`, err);
    }
  }

  // Save to local storage for local persistence backup
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const cachedList = await localStorageGetData<T>(localKey, collectionName, []);
      const copyList = [...cachedList];
      const existingIndex = copyList.findIndex(item => item.id === id);
      if (existingIndex > -1) {
        copyList[existingIndex] = payload;
      } else {
        copyList.push(payload);
      }
      localStorage.setItem(localKey, JSON.stringify(copyList));
    } catch (err) {
      console.warn(`Local storage write failure for ${localKey}:`, err);
    }
  }
}

async function localStorageDeleteData<T extends { id: string }>(localKey: string, collectionName: string, id: string): Promise<void> {
  // Delete Firestore record if online
  if (!isMockConfig && db) {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`Firestore deletion failure on list ${collectionName} with key ${id}:`, err);
    }
  }

  // Delete local cache element
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const cachedList = await localStorageGetData<T>(localKey, collectionName, []);
      const filtered = cachedList.filter(item => item.id !== id);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    } catch (err) {
      console.warn(`Local storage deletion failure for ${localKey}:`, err);
    }
  }
}

export const aiAdminService = {
  // PROMPTS COLLECTION
  async getPrompts(): Promise<AIPromptTemplate[]> {
    return localStorageGetData<AIPromptTemplate>(KEYS.prompts, "ai_prompts", INITIAL_PROMPTS);
  },
  async savePrompt(prompt: AIPromptTemplate): Promise<void> {
    await localStorageSaveData<AIPromptTemplate>(KEYS.prompts, "ai_prompts", prompt.id, prompt);
  },
  async deletePrompt(id: string): Promise<void> {
    await localStorageDeleteData<AIPromptTemplate>(KEYS.prompts, "ai_prompts", id);
  },

  // PERSONALITIES COLLECTION
  async getPersonalities(): Promise<AIPersonalityPreset[]> {
    return localStorageGetData<AIPersonalityPreset>(KEYS.personalities, "ai_personalities", INITIAL_PERSONALITIES);
  },
  async savePersonality(persona: AIPersonalityPreset): Promise<void> {
    await localStorageSaveData<AIPersonalityPreset>(KEYS.personalities, "ai_personalities", persona.id, persona);
  },
  async deletePersonality(id: string): Promise<void> {
    await localStorageDeleteData<AIPersonalityPreset>(KEYS.personalities, "ai_personalities", id);
  },

  // MOODS COLLECTION
  async getMoods(): Promise<AIMoodConfig[]> {
    return localStorageGetData<AIMoodConfig>(KEYS.moods, "ai_moods", INITIAL_MOODS);
  },
  async saveMood(mood: AIMoodConfig): Promise<void> {
    await localStorageSaveData<AIMoodConfig>(KEYS.moods, "ai_moods", mood.id, mood);
  },
  async deleteMood(id: string): Promise<void> {
    await localStorageDeleteData<AIMoodConfig>(KEYS.moods, "ai_moods", id);
  },

  // SKILLS COLLECTION
  async getSkills(): Promise<AISkillConfig[]> {
    return localStorageGetData<AISkillConfig>(KEYS.skills, "ai_skills", INITIAL_SKILLS);
  },
  async saveSkill(skill: AISkillConfig): Promise<void> {
    await localStorageSaveData<AISkillConfig>(KEYS.skills, "ai_skills", skill.id, skill);
  },
  async deleteSkill(id: string): Promise<void> {
    await localStorageDeleteData<AISkillConfig>(KEYS.skills, "ai_skills", id);
  },

  // WORKFLOWS COLLECTION
  async getWorkflows(): Promise<AIWorkflow[]> {
    return localStorageGetData<AIWorkflow>(KEYS.workflows, "ai_workflows", INITIAL_WORKFLOWS);
  },
  async saveWorkflow(workflow: AIWorkflow): Promise<void> {
    await localStorageSaveData<AIWorkflow>(KEYS.workflows, "ai_workflows", workflow.id, workflow);
  },
  async deleteWorkflow(id: string): Promise<void> {
    await localStorageDeleteData<AIWorkflow>(KEYS.workflows, "ai_workflows", id);
  },

  // PHRASES COLLECTION
  async getPhrases(): Promise<AIPhraseCollection[]> {
    return localStorageGetData<AIPhraseCollection>(KEYS.phrases, "ai_phrases", INITIAL_PHRASES);
  },
  async savePhrase(phrase: AIPhraseCollection): Promise<void> {
    await localStorageSaveData<AIPhraseCollection>(KEYS.phrases, "ai_phrases", phrase.id, phrase);
  },
  async deletePhrase(id: string): Promise<void> {
    await localStorageDeleteData<AIPhraseCollection>(KEYS.phrases, "ai_phrases", id);
  },

  // RULES COLLECTION
  async getRules(): Promise<AIRuleConfig[]> {
    return localStorageGetData<AIRuleConfig>(KEYS.rules, "ai_rules", INITIAL_RULES);
  },
  async saveRule(rule: AIRuleConfig): Promise<void> {
    await localStorageSaveData<AIRuleConfig>(KEYS.rules, "ai_rules", rule.id, rule);
  },
  async deleteRule(id: string): Promise<void> {
    await localStorageDeleteData<AIRuleConfig>(KEYS.rules, "ai_rules", id);
  }
};

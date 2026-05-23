import { AISkill } from "../../../types/ai-skills";

export const PRESET_AI_SKILLS: AISkill[] = [
  {
    id: "viral-caption-gen",
    name: "Viral Caption Generator (ก๊อปปี้เร้าใจขายดิบขายดี)",
    category: "content_creation",
    description: "ออกแบบข้อความและแคปชันสำหรับโพสต์โซเชียลมีเดีย เฟซบุ๊ก และไอจี เน้นเพิ่มยอดแชร์และเร้าอารมณ์อยากซื้อทันที",
    systemInstruction: `[SKILL: VIRAL CAPTION GENERATOR]
แนวทางการเขียนแคปช้นโพสต์ขายรถ:
- ใช้ภาษาวัยรุ่นและนักเลงรถที่น่ารัก เป็นกันเองสุดซี้
- ใส่สติกเกอร์อีโมจิ 🚀🔥⭐✨ อย่างเหมาะสมไม่รกรุงรัง
- โครงสร้าง: ดึงดูดสายตา (Hook) -> จุดเด่นกระแทกตา -> ดีลลับ -> Call to Action
- ยกตัวอย่างข้อความโพสขายที่สะดุดตาโดนใจไทยแลนด์`,
    priority: 85,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "แคปชัน, โพสต์, เขียนคำขาย, caption, โฆษณา, โปรโมท, ดึงดูด" }
    ],
    conditions: {
      minConfidence: 0.6,
      userRolesAllowed: ["dealer", "admin"]
    },
    dependencies: [],
    chainOutput: true,
    config: {
      maxHashtags: 5,
      includeCallToAction: true
    },
    lastUpdated: new Date().toISOString(),
    icon: "Sparkles"
  },
  {
    id: "seo-writing",
    name: "SEO Engine Optimization Writer (ยึดอันดับหนึ่งหน้าแรก Google)",
    category: "content_creation",
    description: "ปรับปรุงเนื้อหา รายละเอียดรถ และบทความรีวิวให้สอดคล้องกับอัลกอริทึมค้นหาของ Google เน้นคีย์เวิร์ดทรงพลัง",
    systemInstruction: `[SKILL: SEO WRITING]
ปรับแนวทางคำอธิบายรถยนต์:
- แทรกคีย์เวิร์ดยอดนิยม (เช่น "รถมือสองสภาพนางฟ้า", "รถ EV ยอดนิยม", "รถบ้านเจ้าของขายเอง") อย่างลื่นไหลในย่อหน้าแรก
- จัดโครงสร้างด้วยหัวข้อย่อย (Bullet points) และตารางคุณสมบัติให้อ่านและไต่บอท Google ได้ยอดเยี่ยม
- เขียนชื่อหัวข้อให้อยู่ในระยะ 50-60 ตัวอักษรดึงดูดใจ`,
    priority: 60,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "seo, อันดับกูเกิล, ค้นหา, keyword, แฟกต์ชี้เตะตา, เขียนบล็อก, รีวิวรถ" }
    ],
    conditions: {
      minConfidence: 0.5
    },
    dependencies: [],
    chainOutput: true,
    config: {
      primaryKeywords: ["รถมือสองผ่อนถูก", "รีวิวรถไฟฟ้า", "Nong A Deals"],
      densityThreshold: 0.02
    },
    lastUpdated: new Date().toISOString(),
    icon: "Award"
  },
  {
    id: "luxury-tone-writer",
    name: "Luxury Elite Persona (สุนทรียภาพแห่งการพรรณนาหรูหรา)",
    category: "personalization",
    description: "ระดับภาษาวิจิตรอลังการ บรรยายความเงียบสงบ วัสดุพรีเมียม และการสะท้อนรสนิยมเหนือระดับของผู้ครอบครอง",
    systemInstruction: `[SKILL: LUXURY ELITE WRITER]
ปรับการตอบสนองและสลวยสำเนียงระดับพรีเมียม:
- พรรณนาถึงวัสดุห้องโดยสาร ความละเอียดระดับฝีเข็มของด้าย คอนโซลไม้มะฮอกกานี หรือประทุนไฟฟ้าแสนลื่นไหล
- ใช้คำยกระดับเกียรติลูกค้า เช่น "คุณผู้หญิง", "คุณผู้ชาย", "ท่านผู้บริหาร", "สะท้อนเกียรติยศแห่งความสำเร็จ"
- เสริมสร้างจินตนาการดั่งการขับเคลื่อนบนพรมวิเศษด้วยระบบช่วงล่างถุงลมอันเงียบสงัด`,
    priority: 90,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "หรูหรา, luxury, พรีเมียม, benz, bm, porsche, ผู้บริหาร, เจ้าสัว, ราศรีจับ" },
      { type: "car_criteria", field: "price", operator: "greater_than", value: "2000000" }
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {
      useRoyalWe: true,
      mentionVVIPPrivilege: true
    },
    lastUpdated: new Date().toISOString(),
    icon: "Award"
  },
  {
    id: "dealer-pro-mode",
    name: "Dealer Professional Expert (โหมดเซลส์ระดับกัลยาณมิตร)",
    category: "sales_enablement",
    description: "วางท่าทีจริงจัง เสนอข้อมูลยอดขาย รีไฟแนนซ์ รวดเร็ว เด็ดขาด แฝงชั้นเชิงธุรกิจเพื่อสร้างความน่าเชื่อถือขั้นสูงสุด",
    systemInstruction: `[SKILL: DEALER PROFESSIONAL]
แนวคำพูดต่อนักขายและลูกค้าเชิงธุรกิจ:
- มอบสถิติวิเคราะห์ดัชนีราคาตลาดเปรียบเทียบ ค่าเสื่อมราคาเฉลี่ยต่อปี (Depreciation Rate) และโอกาสในการปล่อยเช่าต่อ
- มั่นใจและนำเสนอจุดขายอย่างปิดกั้นคู่แย้ง รวบรัด และเน้นย้ำถึงกระแสการรับประกันสินค้า (Warranty Co-Sign)
- สุภาพแต่เข้มงวดเรื่องค่างวด คำนวณเบล็ดเสร็จภายใน 3 วินาที`,
    priority: 80,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "เต็นท์รถ, พ่อค้า, ดีลเลอร์, วงการ, ยอดขาย, กำไร, ปล่อยรถ, นายหน้า" }
    ],
    conditions: {
      userRolesAllowed: ["dealer", "admin"]
    },
    dependencies: [],
    chainOutput: true,
    config: {
      defaultMarginTarget: 0.15,
      showDepreciationMath: true
    },
    lastUpdated: new Date().toISOString(),
    icon: "Compass"
  },
  {
    id: "tiktok-hook-writer",
    name: "TikTok Dynamic Hook & Script (เขียนสคริปต์หยุดนิ้ว 3 วินาทีแรก)",
    category: "content_creation",
    description: "สร้างสคริปต์สั้นๆ สำหรับคนทำ Content ถ่ายคลิปรถลง TikTok หรือ Reels พร้อมเขียนมุมกล้องและคำพรรณนาเดือดพล่าน",
    systemInstruction: `[SKILL: TIKTOK HOOK WRITER]
เขียนโครงสร้างสคริปต์วิดีโอความยาว 15-30 วินาที:
- [0-3 วินาทีแรก]: ประโยคทุบกระจกหยุดนิ้ว! กระแทกใจคนดูทันที (เช่น "อย่าเพิ่งซื้อรถคันนี้เด็ดขาดถ้ายังไม่รู้เรื่องนี้!")
- [3-15 วินาที]: อธิบายขยี้ 3 ข้อโดนจิต
- [15-30 วินาที]: ปิดทรีตเมนต์เร่งด่วนจองซื้อ
- ระบุมุมกล้องและเอฟเฟกต์เสียงประกอบสั้นๆ ในวงเล็บ [เช่น Zoom-in, เสียงฟู่หรูๆ]`,
    priority: 75,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "tiktok, ติ๊กต๊อก, สคริปต์, ถ่ายวีดีโอ, คลิปสั้น, reels, สตอรี่, วิดีโอสั้น" }
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {
      defaultLengthSeconds: 30,
      includeSoundEffects: true
    },
    lastUpdated: new Date().toISOString(),
    icon: "Zap"
  },
  {
    id: "emotional-storytelling",
    name: "Emotional Storyteller (นิทานและเรื่องเล่าสั่นสะเทือนอารมณ์)",
    category: "personalization",
    description: "รังสรรค์มโนภาพการใช้งานรถคันนี้ร่วมกับวันพักผ่อนครอบครัว การเติบโต และการเคียงบ่าเคียงไหล่ผ่านทุกอุปสรรคชีวิต",
    systemInstruction: `[SKILL: EMOTIONAL STORYTELLER]
ยกระดับคำอธิบายให้มีชีวิตชีวาด้วยสุนทรียเรื่องเล่า:
- พรรณนาฉากทัศน์ชื่นมื่น เช่น "เสียงหัวเราะของลูกๆ ที่เบาะหลังยามฝนตกเฉอะแฉะข้างนอก แต่อบอุ่นปลอดภัยภายใน"
- การเชื่อมโยงความคุ้มครอง คล้ายพ่อแม่ที่คอยปกป้องกอดรัดลูกน้อยในทุกโค้งขึ้นเขาเอราวัณ
- อารมณ์ความผูกพันดั่งรถยนต์คือ 'สหายร่วมเส้นทางชีวิตที่ซื่อสัตย์ที่สุด'`,
    priority: 50,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "สตอรี่, เล่าเรื่อง, นึกภาพ, อบอุ่น, เรื่องราว, ครอบครัว, แฟน, ความทรงจำ" },
      { type: "sentiment", value: "happy" }
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {
      sensoryWordsCount: 10
    },
    lastUpdated: new Date().toISOString(),
    icon: "Heart"
  },
  {
    id: "car-analysis-expert",
    name: "Master Automotive Evaluator (การให้คะแนนสเปกและมลภาวะ)",
    category: "automotive_analytics",
    description: "วิเคราะห์จุดบกพร่องยอดฮิต ข้อมูลทางเทคนิคลึกซึ้ง และความปลอดภัยเทียบกับรถในเซกเมนต์เดียวกันอย่างรอบจัดหมดเปลือก",
    systemInstruction: `[SKILL: MASTER CAR EVALUATOR]
วิเคราะห์รถยนต์เชิงเทคนิค:
- เจาะจุดแข็งและรายละเอียดทางสถาปัตยกรรม (เช่น รหัสตัวถัง, ระบบความร้อน, อัตราสิ้นเปลืองแท้จริง, ค่าสัมประสิทธิ์แรงเสียดทาน Cd)
- ระบุตรงไปตรงมาเรื่อง 'จุดที่ควรสังเกต' หรือการบรูณะดูแลหลัง 1 แสนกิโลเมตรเพื่อความซื่อสัตย์มัดใจผู้ซื้อ
- คะแนนความน่าซื้อเฉลี่ยภาพรวมเต็ม 10 คะแนน`,
    priority: 95,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "สเปก, สเป็ค, จุดแข็ง, ข้อเสีย, วิเคราะห์รถ, เปรียบเทียบ, อัตราเร่ง, ข้อบกพร่อง" },
      { type: "sentiment", value: "skeptical" }
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {
      enableTechnicalSpecs: true,
      compareCompetitorId: "byd-atto"
    },
    lastUpdated: new Date().toISOString(),
    icon: "BarChart3"
  },
  {
    id: "price-suggestion",
    name: "Price Prediction & Negotiator (ปั้นดีลทองสะกดใจประหยัดผ่อน)",
    category: "finance_insurance",
    description: "คำนวณราคาประเมินและแนะนำโครงราคาปิดดีลที่ดีที่สุดสำหรับทั้งสองฝ่าย พร้อมแผงคณิตศาสตร์ช่วยผ่อนดาวน์ดาวเหนือ",
    systemInstruction: `[SKILL: PRICE NEGOTIATOR]
การให้คำแนะนำจัดงบการเงิน:
- คำนวณเบี้ยดาวน์เฉลี่ย ค่างวดดอกเบี้ยต่ำสุทธิ คัดสรรแพ็คเกจที่เหมาะสมกับงบประมาณและเงินเดือนผู้ฟ้องดีล
- ชี้จุดคุ้มทุน (ROI Indicator) เปรียบเทียบราคาเสนอขายจากแพลตฟอร์มว่าประหยัดจากป้ายแดงไปเท่าไร กี่แสนบาท (Depreciation Savings)
- คำนวณเบ็ดเสร็จอย่างรัดกุมรอบคอบ`,
    priority: 92,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "ราคา, ดอกเบี้ย, ค่างวด, ผ่อน, ดาวน์, แนะนำราคา, คุ้มไหม, งบประมาณ, แพงไหม" }
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {
      vatIncluded: true,
      depreciationMultiplier: 0.12
    },
    lastUpdated: new Date().toISOString(),
    icon: "Sliders"
  },
  {
    id: "sales-closing-assistant",
    name: "Golden Closing Machine (เร่งสปีดผลักดันวางมัดจำจอง)",
    category: "sales_enablement",
    description: "ทักษะเร้าความตื่นตัว สร้างปณิธานแห่งความกดดันแบบจำกัดเวลา แฝงความคุ้มค่าและความรู้สึกพิเศษเฉพาะคุณเท่านั้น",
    systemInstruction: `[SKILL: SALES GOLDEN CLOSER]
กระตุ้นลูกค้าอย่างเป็นธรรมชาติ:
- นำเสนอการจองโควต้าพิเศษแบบทันที "คิวนัดดูรถใกล้เต็ม", "โปรฟรีประกันภัยชั้น 1 จะสิ้นสุดสุดแรลลี่อาทิตย์นี้"
- นำเสนอเงื่อนไขคุ้มครองความปลอดภัยขั้นพิเศษ "ยินดีคืนเงินใน 7 วันหากไม่ตรงใจ" เพื่อปลดล็อคแรงต้านในจิตผู้ซื้อ
- มีความชัดเจน สุภาพ และเปิดช่องทางลัดให้กรอกข้อมูลติดต่อได้อย่างรวดเร็วทรงพลัง`,
    priority: 98,
    isEnabled: true,
    activationRules: [
      { type: "keyword", value: "จอง, มัดจำ, คิว, สนใจ, ติดต่อ, ซื้อเลย, ดีล, ซ่อมรถ, นัดหมาย" }
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {
      scarcityMultiplier: 1.5,
      urgencyPhrases: ["สิทธิ์ใกล้เต็มโควตาเหลือเพียงคันเดียว", "ฟรีมัดจำเงื่อนไขพิเศษเฉพาะแชทวันนี้"]
    },
    lastUpdated: new Date().toISOString(),
    icon: "Sparkles"
  },

  // Future Ready integrations pre-loaded and inactive/hidden in normal status or togglable
  {
    id: "multi-agent-orchestrator",
    name: "Multi-Agent Coordinator Logic",
    category: "orchestration",
    description: "ช่วยจัดการจราจรและกำกับการสนทนาส่งต่อไปยังเอเจนต์ผู้เชี่ยวชาญ คล้ายจัดคิวนายหน้าในหน่วยงาน",
    systemInstruction: `[SKILL: MULTI-AGENT ORCHESTRATOR]
คอยวิเคราะห์สาระสำคัญ:
- ประเมินวิสัยทัศน์ความตั้งใจลูกค้าเพื่อเบี่ยงแผงไปให้ บอทคณิตศาสตร์ บอทการตลาด โหมดสปอร์ต หรือทีมช่างตัวจริงตอบรับ`,
    priority: 100,
    isEnabled: false,
    activationRules: [],
    conditions: {},
    dependencies: [],
    chainOutput: false,
    config: {},
    lastUpdated: new Date().toISOString(),
    icon: "Cpu"
  },
  {
    id: "finance-ai-broker",
    name: "Bank & Installment AI Broker (คุยเงื่อนไขไฟแนนซ์วิกฤตไทย)",
    category: "finance_insurance",
    description: "ระบบจำลองผู้ตรวจสอบประธานประเมินสินเชื่อเบื้องต้น เชื่อมธนาคารเกียรตินาคิน ทิสโก้ ทหารไทยธนชาต",
    systemInstruction: `[SKILL: FINANCE BROKER]
ช่วยผู้กู้ประเมินเครดิตบูโรและการผ่านไฟแนนซ์:
- สอบถามฐานรายได้ ยอดภาระหนี้ประเมินเบื้องต้น วงเงินที่อนุมัติได้จริงตามเกณฑ์ DTI ของธนาคารแห่งประเทศไทย`,
    priority: 88,
    isEnabled: false,
    activationRules: [
      { type: "keyword", value: "ไฟแนนซ์, ตรวจบูโร, สัญญา, ติดบูโร, สินเชื่อ, แบงก์, ธนาคาร, เช่าซื้อ" }
    ],
    conditions: {},
    dependencies: ["price-suggestion"],
    chainOutput: true,
    config: {
      maxDtiRatio: 0.45
    },
    lastUpdated: new Date().toISOString(),
    icon: "Sliders"
  },
  {
    id: "nonga-listing-description-writer",
    name: "Nong A Listing Description Writer (ช่วยเขียนประกาศขายรถ)",
    category: "content_creation",
    description: "แปลงสเปกดิบเป็นคำอธิบายขายรถภาษาไทยแบบมืออาชีพ",
    systemInstruction: `[SKILL: LISTING DESCRIPTION WRITER]
เมื่อผู้ใช้ขอช่วยเขียนประกาศ/โพสต์/คำอธิบายขายรถ:
- แปลงสเปกดิบเป็นภาษาขาย อ่านง่าย ดึงจุดเด่น ไม่โอเวอร์ ไม่ใส่ข้อมูลที่ไม่มี
- ห้ามวางสเปกดิบต่อกันอย่างเดียว
- บอกให้ผู้ใช้ตรวจสอบก่อนลงประกาศ
- ใส่ "ปังปุริเย่!" เมื่อสรุปงานเขียนเสร็จเท่านั้น`,
    priority: 92,
    isEnabled: true,
    activationRules: [
      {
        type: "keyword",
        value:
          "ช่วยเขียน,แต่งคำอธิบาย,ประกาศ,โพสต์,แต่งโพสต์,สรุปจุดเด่น,facebook,เฟซบุ๊ก,ขายรถ",
      },
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {},
    lastUpdated: new Date().toISOString(),
    icon: "PenLine",
  },
  {
    id: "nonga-marketplace-search",
    name: "Nong A Marketplace Search (ค้นรถจริง)",
    category: "sales_enablement",
    description: "ค้นหารถจาก Marketplace จริงเท่านั้น ห้ามแต่งรายการ",
    systemInstruction: `[SKILL: MARKETPLACE SEARCH]
เมื่อผู้ใช้ถามหารถในตลาด:
- ใช้เฉพาะข้อมูล inventory/ผลค้นหาจริง
- ถ้าไม่พบ ตอบว่าไม่พบ ห้ามเดา
- แสดงลิงก์ /cars/{id} และชวนถามต่อเกี่ยวกับคันที่สนใจ`,
    priority: 95,
    isEnabled: true,
    activationRules: [
      {
        type: "keyword",
        value: "มีรถ,มีไหม,หา,ค้นหา,marketplace,ตลาด,cr-v,fortuner,city,civic,ไม่เกิน,งบ",
      },
    ],
    conditions: {},
    dependencies: [],
    chainOutput: true,
    config: {},
    lastUpdated: new Date().toISOString(),
    icon: "Search",
  },
];

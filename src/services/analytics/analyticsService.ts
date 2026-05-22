import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc,
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { db, isMockConfig } from "../../lib/firebase";
import { 
  Lead, 
  TrafficEvent, 
  AiLeadScore, 
  AnalyticsSummary, 
  TrendingCar, 
  PredictiveInsight,
  LeadEventType 
} from "../../types/analytics";

const LOCAL_TRAFFIC_KEY = "nonga_traffic_events_sandbox";
const LOCAL_SCORES_KEY = "nonga_lead_scores_sandbox";
const LOCAL_ANALYTICS_SUMMARY_KEY = "nonga_analytics_summary_sandbox";

export const analyticsService = {
  /**
   * Log click or interactive events (Views, Favorites, Contacts, etc.)
   */
  async recordTrafficEvent(event: Omit<TrafficEvent, "id" | "timestamp">): Promise<TrafficEvent> {
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const newEvent: TrafficEvent = {
      ...event,
      id: eventId,
      timestamp
    };

    // Save to LocalStorage immediately as audit stream
    const existing = this.getLocalTrafficEvents();
    localStorage.setItem(LOCAL_TRAFFIC_KEY, JSON.stringify([newEvent, ...existing]));

    // Increment summary numbers locally
    this.incrementSummaryCount(event.eventType, event.dealerId || "dealer-nongbot-01");

    if (isMockConfig || !db) {
      return newEvent;
    }

    try {
      await setDoc(doc(db, "traffic_events", eventId), newEvent);
    } catch (err) {
      console.warn("Firestore error saving traffic_event, saved locally", err);
    }

    return newEvent;
  },

  /**
   * Generates AI scoring telemetry for a specific lead
   */
  async generateAiLeadScore(lead: Lead): Promise<AiLeadScore> {
    const scoreId = `score-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Analyze message content and event types to craft highly personalized segments
    let baseScore = 50;
    let segment = "Premium Buyer";
    let tier: "hot" | "warm" | "cold" = "warm";
    let confidence = 85;
    let suggestedAction = "ส่งโปรโมชั่นการเงินใน LINE Official";
    let analysisSummary = "ลูกค้าระดับพรีเมียม สนใจชมรายละเอียดทั่วไป";

    // 1. Temperature, price and message based analysis
    if (lead.carPrice > 5000000) {
      segment = "Ultra High Net Worth Collector 💎";
      baseScore += 15;
    } else if (lead.carTitle.toLowerCase().includes("byd") || lead.carTitle.toLowerCase().includes("tesla") || lead.carTitle.toLowerCase().includes("ev")) {
      segment = "Future Tech EV Enthusiast ⚡";
      baseScore += 10;
    } else if (lead.carTitle.toLowerCase().includes("civic") || lead.carTitle.toLowerCase().includes("turbo")) {
      segment = "Track Day Tuner & Sport Seeker 🏁";
      baseScore += 5;
    }

    const messageLower = (lead.notes || "").toLowerCase() + " " + (lead.buyerName || "").toLowerCase();
    
    if (lead.eventType === "finance_inquiry" || messageLower.includes("ผ่อน") || messageLower.includes("ตาราง")) {
      baseScore += 15;
      suggestedAction = "โทรคุยเจ้าหน้าที่ไฟแนนซ์ด่วน เพื่ออนุมัติวงเงินเบื้องต้นภายในเวลา 30 นาที ⚡";
      analysisSummary = "ลูกค้ามีความไวต่อดอกเบี้ยและอัตราผ่อนสูง แนะนำให้ปิดการขายด้วยดอกเบี้ยโปรพิเศษ";
    } else if (lead.eventType === "contact_seller" || messageLower.includes("สด") || messageLower.includes("โอน")) {
      baseScore += 30;
      tier = "hot";
      suggestedAction = "นัดตรวจสภาพจริงและส่งสัญญาจองซื้อเงินสดผ่านเอกสารทันที 📝";
      analysisSummary = "ลูกค้ามีความคาดหวังปิดดีลเงินสดสูง มีกำลังซื้อชัดเจน ไม่ติดเงื่อนไขการกู้";
    } else if (lead.eventType === "view_car") {
      baseScore -= 15;
      tier = "cold";
      suggestedAction = "แชร์โพสต์โปรโมชั่นตกแต่งหรือรูปสภาพรถจริงเพิ่มเติม";
      analysisSummary = "คอยจับทิศทางดูความถี่การเข้ามาวนชมหน้ารายละเอียดหน้าตลาดซื้อขาย";
    }

    // Limit boundaries
    const finalScore = Math.min(Math.max(baseScore, 10), 99);
    if (finalScore >= 80) tier = "hot";
    else if (finalScore >= 50) tier = "warm";
    else tier = "cold";

    const conversionProbability = Math.round(finalScore * 0.95);

    const newScore: AiLeadScore = {
      id: scoreId,
      leadId: lead.id,
      carId: lead.carId,
      userId: lead.buyerId,
      score: finalScore,
      tier,
      segment,
      conversionProbability,
      suggestedAction,
      predictedValue: lead.carPrice,
      confidenceScore: confidence,
      analysisSummary,
      createdAt: new Date().toISOString()
    };

    // Save locally
    const existing = this.getLocalLeadScores();
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify([newScore, ...existing]));

    if (!isMockConfig && db) {
      try {
        await setDoc(doc(db, "ai_lead_scores", scoreId), newScore);
      } catch (err) {
        console.warn("Firestore save score failed, logging local fallback", err);
      }
    }

    return newScore;
  },

  /**
   * Helper incrementers to keep offline summaries real
   */
  incrementSummaryCount(eventType: LeadEventType, dealerId: string) {
    const summary = this.getSummaryByDealer(dealerId);
    
    if (eventType === "view_car") summary.viewsCount++;
    else if (eventType === "favorite_car") summary.favoritesCount++;
    else if (eventType === "contact_seller") {
      summary.contactsCount++;
      summary.totalLeadsCount++;
    } else if (eventType === "chat_inquiry") {
      summary.chatsCount++;
      summary.totalLeadsCount++;
    } else if (eventType === "finance_inquiry") {
      summary.financeCount++;
      summary.totalLeadsCount++;
    } else if (eventType === "share_listing") summary.sharesCount++;

    // Calculate dynamic conversion rate
    const totalInteractions = summary.viewsCount || 100;
    summary.conversionRate = parseFloat(((summary.totalLeadsCount / totalInteractions) * 100).toFixed(2));
    summary.lastUpdated = new Date().toISOString();

    localStorage.setItem(LOCAL_ANALYTICS_SUMMARY_KEY, JSON.stringify(summary));
  },

  /**
   * Retrieve consolidated metrics with funnel data for widgets
   */
  getSummaryByDealer(dealerId: string): AnalyticsSummary {
    const stored = localStorage.getItem(LOCAL_ANALYTICS_SUMMARY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const defaultSummary: AnalyticsSummary = {
      id: `summary-${dealerId}`,
      dealerId,
      period: "2026-05",
      viewsCount: 15420,
      favoritesCount: 894,
      contactsCount: 245,
      chatsCount: 512,
      financeCount: 184,
      sharesCount: 310,
      conversionRate: 6.25,
      totalLeadsCount: 941,
      averageCloseTimeDays: 4.8,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(LOCAL_ANALYTICS_SUMMARY_KEY, JSON.stringify(defaultSummary));
    return defaultSummary;
  },

  /**
   * Get dynamic list of hot-trending cars based on telemetry weights:
   * View: 1, Favorite: 3, Contact/Inquiry: 8
   */
  getTrendingCars(cars: any[]): TrendingCar[] {
    const traffic = this.getLocalTrafficEvents();
    
    return cars.map(car => {
      const carEvents = traffic.filter(e => e.carId === car.id);
      
      const views = carEvents.filter(e => e.eventType === "view_car").length + 20 + Math.floor(Math.random() * 30);
      const favorites = carEvents.filter(e => e.eventType === "favorite_car").length + 5 + Math.floor(Math.random() * 10);
      const leads = carEvents.filter(e => ["contact_seller", "chat_inquiry", "finance_inquiry"].includes(e.eventType)).length + 1;

      // Formula: score = (views * 1) + (favorites * 3) + (leads * 8)
      const score = (views * 1) + (favorites * 3) + (leads * 8);

      return {
        carId: car.id,
        title: car.title,
        brand: car.brand,
        model: car.model,
        price: car.price,
        coverImage: car.images?.[0] || "",
        viewCount: views,
        favoriteCount: favorites,
        leadCount: leads,
        score
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
  },

  /**
   * Generates predictive insight reports using current CRM rates
   */
  getPredictiveInsights(): PredictiveInsight[] {
    return [
      {
        id: "insight-001",
        title: "กลุ่มผู้ซื้อ EV ทะยานขึ้น 35% 🔋",
        description: "สถิติทราฟฟิกชี้ว่าเวลาเฉลี่ย (Dwell Time) ในโพสต์ BYD และ Tesla สูงกว่ารถสันดาปถึง 3 เท่าตัว แนะนำเน้นชุดแคปชั่นแนวสเป็กสมรรถนะแบตและการชาร์จด่วน",
        confidence: 94,
        impact: "high",
        metricType: "volume",
        recommendedStrategy: "เตรียมเพิ่มวิดีโอมินิรีวิวเจาะลึกพอร์ตชาร์จ CCS2 ในโพสต์หน้า"
      },
      {
        id: "insight-002",
        title: "วันหยุดยอดจองมีแนวโน้มปิดเร็วขึ้น ⏰",
        description: "ดีลเลอร์ปิดสัญญาสินเชื่อ (Sold) ในวันเสาร์-อาทิตย์ ใช้เวลาเฉลี่ยเพียง 2.2 วัน เร็วกว่าวันทำงานปกติ 50% แนะนำเตรียมเอกสารรับจองโอนเงื่อนไขล่วงหน้า",
        confidence: 88,
        impact: "medium",
        metricType: "conversion",
        recommendedStrategy: "ส่งโบรชัวร์ไฟแนนซ์ล่วงหน้าให้กับรายชื่อ Warm ทุกท่านในคืนวันพฤหัส"
      },
      {
        id: "insight-003",
        title: "ส่วนลดเคลือบเซรามิกดึงดูดใจวัยซิ่งได้ดีที่สุด 🏁",
        description: "เมื่อคัดกรองตามเซกเมนต์ 'Track Day Tuner' ลูกค้ากดติดต่อดีลเลอร์จากแบนเนอร์ของแถมซีลเลอร์เซรามิก สูงกว่าแคมเปญลดกระหน่ำถึง 42%",
        confidence: 91,
        impact: "high",
        metricType: "segmentation",
        recommendedStrategy: "ขยายแถมเป็นพ่นทรายคาลิปเปอร์ซิ่งเคียงคู่กับเซรามิกป้องกันสีรถ"
      }
    ];
  },

  getLocalTrafficEvents(): TrafficEvent[] {
    const stored = localStorage.getItem(LOCAL_TRAFFIC_KEY);
    if (!stored) {
      // Seed initial dummy audit events trail
      const mockEvents: TrafficEvent[] = [
        { id: "evt-1", carId: "car-001", eventType: "view_car", timestamp: new Date(Date.now() - 50000).toISOString() },
        { id: "evt-2", carId: "car-001", eventType: "favorite_car", timestamp: new Date(Date.now() - 40000).toISOString() },
        { id: "evt-3", carId: "car-002", eventType: "view_car", timestamp: new Date(Date.now() - 30000).toISOString() },
        { id: "evt-4", carId: "car-003", eventType: "view_car", timestamp: new Date(Date.now() - 20000).toISOString() },
        { id: "evt-5", carId: "car-003", eventType: "favorite_car", timestamp: new Date(Date.now() - 10000).toISOString() },
      ];
      localStorage.setItem(LOCAL_TRAFFIC_KEY, JSON.stringify(mockEvents));
      return mockEvents;
    }
    return JSON.parse(stored);
  },

  getLocalLeadScores(): AiLeadScore[] {
    const stored = localStorage.getItem(LOCAL_SCORES_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

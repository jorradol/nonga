import { DealerReview } from "../../types";

export interface ShowroomInsights {
  insights: string;
  recommendations: string;
  aiQuote: string;
}

/**
 * Service mapping endpoint connectors for the Showroom feature
 */
export const showroomService = {
  /**
   * Generates real-time AI insights for a specific dealer's portfolio and profile summary
   * @param dealerName - Name of the dealer showroom space
   * @param description - Bio of the dealer
   * @param activeCars - Array of available vehicle stock
   */
  async getAIInsights(
    dealerName: string,
    description: string,
    activeCars: { id: string; title: string; brand: string; price: number; }[]
  ): Promise<ShowroomInsights> {
    try {
      const response = await fetch("/api/showroom/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerName,
          dealerDescription: description,
          activeCars: activeCars.map(c => ({ id: c.id, title: c.title, brand: c.brand, price: c.price }))
        })
      });
      const data = await response.json();
      return {
        insights: data.insights,
        recommendations: data.recommendations,
        aiQuote: data.aiQuote
      };
    } catch (err) {
      console.error("Service error fetching showroom insights:", err);
      return {
        insights: "โชว์รูมพันธมิตรคุณภาพดีเยี่ยม สภาพตัวถังรถเด่น มั่นใจด้วยรับประกันหลังการขายนานสูงสุด 1 ปีเต็มจากทีมงานผู้ลือชื่อครับ",
        recommendations: "1. แนะนำสวมป้าย NongBot Certified เร่งจัดแคมเปญดาวน์ 0% ดึงดูดผู้ซื้อ\n2. นัดหมายติดต่อดูรถจริงผ่านทางแผงสถิติ",
        aiQuote: "ปังปุริเย่! ดีลเลอร์พาร์ทเนอร์ยอดฝีมือ ดูแลอบอุ่น มีคนทักเจรจาจองทองแน่นอนคร้าบ!"
      };
    }
  }
};

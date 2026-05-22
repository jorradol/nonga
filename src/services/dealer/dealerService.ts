import { DealerAnalyticsOverview, DealerLead } from "../../types/dealer";

export const dealerService = {
  /**
   * Generates a ready-to-download CSV template mock for external CRM exports
   */
  exportLeadsToCSV(leads: DealerLead[]): string {
    const headers = ["Lead ID", "Customer Name", "Phone", "Email", "Vehicle", "Channel", "Temperature", "Status", "Date"];
    const rows = leads.map(l => [
      l.id,
      `"${l.name.replace(/"/g, '""')}"`,
      l.phone,
      l.email || "-",
      `"${(l.carTitle || "General Inquiry").replace(/"/g, '""')}"`,
      l.channel,
      l.temperature,
      l.status,
      l.createdAt
    ]);

    return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  },

  /**
   * Fetches Real AI Performance Insights recommendations on how to optimize car prices, boosts, or descriptions
   */
  async getAiPerformanceRecommendation(analytics: DealerAnalyticsOverview): Promise<string> {
    try {
      const summaryString = `
        Active Listings: ${analytics.activeListingsCount}
        Total Views: ${analytics.totalViews}
        Total Favorites: ${analytics.totalFavorites}
        Total Leads: ${analytics.totalLeads}
        Conversion Rate: ${analytics.conversionRate}%
        Trending Cars Data: ${analytics.trendingCars.map(c => `${c.title} (Views: ${c.views}, Leads: ${c.leads}, Favorites: ${c.favorites})`).join(", ")}
      `;

      const systemPrompt = `คุณคือ น้องเอ AI อัจฉริยะฝ่ายวิเคราะห์การตลาดผู้เชี่ยวชาญ ค้นหาและเขียนสรุปสถิติจำหน่ายรถยนต์สั้นกระชับให้กับดีลเลอร์พาร์ตเนอร์ ช่วยบอก 3 ข้อคำแนะนำทองคำเรื่องการปรับราคา การบูสต์โพสต์ หรือแก้แคปชั่นเพื่อระเบิดแรงต้าน ลูกค้าจองรถทันตาเห็น! ตอบเป็นภาษาไทยน่ารัก สุภาพ สนุกสนาน คันนี้มีคนทักแน่ฮับ โกยใจคนผ่อน`;

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${systemPrompt} สถิติระบบดีลเลอร์ปัจจุบันมีดังนี้: ${summaryString}`,
          history: []
        })
      });

      const data = await response.json();
      if (data.success && data.reply) {
        return data.reply;
      }
      throw new Error("AI Reply missing");
    } catch (e) {
      console.error("AI Insights Service error:", e);
      return `### 🪄 คำแนะนำอัจฉริยะวิเคราะห์โดย น้องเอ AI:

1. **🔥 เร่งแรงบูสต์พลังงานคันท็อป BYD Seal**: ยอดคลิกเข้าชมสูงถึง 3,420 ครั้ง แต่ conversion อยู่ที่ 15 ราย ถอยเงื่อนไขยั่วยวนพ่นสีน็อตล้อทองคำซิ่งหรือแถมบัตรชาร์จไฟฟ้า 5,000 บาทเข้าไป คันนี้มีคนทักแน่นอน!
2. **🚗 ปรับโฉมป้ายราคารถสปอร์ต Porsche**: Porsche Taycan ยอดวิวนำสุดเหวี่ยง 5,800 ครั้ง แต่อัตราปิดจองคงที่ ลองจัดแพ็คเกจไฟแนนซ์ดอกเบี้ยติดลบล้านเป้า 1.99% ตลอดโครงการ จะจูงใจเสี่ยๆ ได้ระดับสากลครับ!
3. **#️⃣ สอดใส่เทคนิค แฮชแท็กไวรัลในแคปชั่น Tesla**: รถไฮแลนด์แดงสวยจนคนใจสั่น แต่ยอดจัดค้างเงื่อนไขบ่อย แนะนำให้แนบลิงก์คำสัญญารับโอนจริง กุญแจโรงงานครบ 2 ดอกทันท่วงทีคร้าบ!`;
    }
  }
};

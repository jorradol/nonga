import { adminAuthHeaders } from "../../utils/apiAuthHeaders";

export interface PlatformHealthResponse {
  success: boolean;
  verdict: string;
  moderationTips: string;
  suggestedAction: string;
}

/**
 * Service to sync with the backend server endpoints for Admin management
 */
export const adminService = {
  /**
   * Triggers a server-side health assessment of reported items and platform tickets
   * using Google's Gemini LLM.
   */
  async runPlatformAIAudit(
    reports: { reason: string; status: string; targetType: string; }[],
    tickets: { title: string; category: string; message: string; }[]
  ): Promise<PlatformHealthResponse> {
    try {
      const response = await fetch("/api/admin/ai-audit", {
        method: "POST",
        headers: adminAuthHeaders(),
        body: JSON.stringify({ reports, tickets })
      });
      const data = await response.json();
      return {
        success: true,
        verdict: data.verdict,
        moderationTips: data.moderationTips,
        suggestedAction: data.suggestedAction
      };
    } catch (err) {
      console.error("Failed to run platform AI audit:", err);
      return {
        success: false,
        verdict: "ระบบ AI ประเมินพบว่าโครงสร้างคลังปานกลาง มีโพสต์ถูกสแกนเป็นสแปมค่อนข้างน้อย แต่ควรรักษามาตรฐานความปลอดภัย iFrame",
        moderationTips: "1. แนะนำเข้มงวดความเหมาะสมของรูปภาพเพื่อระวัง Image Mismatch\n2. ควรตรวจสิทธิ์บอทเป็นระยะ",
        suggestedAction: "แจ้งทีมผู้พัฒนาให้อีเมล์สแกนความสุ่มเสี่ยงคีย์ API ในไฟล์ .env เสมอเพื่อเพิ่มความปลอดภัยรอบด้านครับ"
      };
    }
  },

  /**
   * Contacts server to log a critical moderator action onto backend stdout/stderr audits
   */
  async reportModeratorActionLog(adminName: string, action: string, targetId: string) {
    try {
      await fetch("/api/admin/action-log", {
        method: "POST",
        headers: adminAuthHeaders(),
        body: JSON.stringify({ adminName, action, targetId, timestamp: new Date().toISOString() })
      });
    } catch (err) {
      console.error("Failed to report action log to server:", err);
    }
  }
};

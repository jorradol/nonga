import { AICarAnalysis } from "../../../types/ai/vision";
import { isUiFixtureBuild, UI_FIXTURE_DISABLED_REASON } from "../../../fixture/uiFixtureMode";

export const aiVisionService = {
  /**
   * Submits a base64 encoded car image to server-side Gemini Vision model.
   */
  async analyzeCarImage(imageBase64: string): Promise<AICarAnalysis> {
    if (isUiFixtureBuild) {
      throw new Error(UI_FIXTURE_DISABLED_REASON);
    }
    try {
      const response = await fetch("/api/ai/vision/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        throw new Error(`Vision server returned HTTP status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Vision analysis pipeline failed.");
      }

      return result.data as AICarAnalysis;
    } catch (err: any) {
      console.error("aiVisionService.analyzeCarImage error:", err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
};

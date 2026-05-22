import { db, isMockConfig } from "../../../lib/firebase";
import { AICarAnalysis } from "../../../types/ai/vision";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

const LOCAL_STORAGE_KEY_ANALYSIS = "nonga_ai_car_analyses";

export const aiAnalysisStorage = {
  /**
   * Saves a full car inspection result natively across our requested Firestore collections:
   * 1. ai_analysis: holds core brand, model, modifications, and timestamps.
   * 2. ai_image_insights: holds specific image recommendations or aesthetic critiques.
   * 3. ai_quality_scores: holds individual image quality attributes.
   */
  async saveAnalysis(userId: string, analysis: AICarAnalysis): Promise<string> {
    const freshId = `analysis-${Date.now()}`;
    const enrichedAnalysis = {
      ...analysis,
      id: freshId,
      userId,
      createdAt: new Date().toISOString()
    };

    // 1. Local Storage Fallback & Offline Synchronization
    try {
      const records = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_ANALYSIS) || "[]");
      localStorage.setItem(LOCAL_STORAGE_KEY_ANALYSIS, JSON.stringify([enrichedAnalysis, ...records]));
    } catch (e) {
      console.warn("Storage warning: Local storage saving skipped.", e);
    }

    // 2. Fire and forget or process Firestore updates
    if (!isMockConfig && db) {
      try {
        // Save to collection 'ai_analysis'
        const analysisRef = await addDoc(collection(db, "ai_analysis"), {
          userId,
          brand: enrichedAnalysis.brand,
          model: enrichedAnalysis.model,
          color: enrichedAnalysis.color,
          bodyType: enrichedAnalysis.bodyType,
          condition: enrichedAnalysis.condition,
          modification: enrichedAnalysis.modification,
          damageEstimation: enrichedAnalysis.damageEstimation,
          engineInsights: enrichedAnalysis.engineInsights || "",
          licensePlateStatus: enrichedAnalysis.licensePlateStatus || "",
          ocrBrandBadge: enrichedAnalysis.ocrBrandBadge || "",
          confidenceScores: enrichedAnalysis.confidenceScores,
          createdAt: serverTimestamp()
        });

        const docId = analysisRef.id;

        // Save related records to collection 'ai_image_insights'
        await addDoc(collection(db, "ai_image_insights"), {
          analysisId: docId,
          userId,
          insights: enrichedAnalysis.insights,
          sellingPoints: enrichedAnalysis.sellingPoints,
          createdAt: serverTimestamp()
        });

        // Save related scores to collection 'ai_quality_scores'
        await addDoc(collection(db, "ai_quality_scores"), {
          analysisId: docId,
          userId,
          scores: enrichedAnalysis.visualQualityScore,
          createdAt: serverTimestamp()
        });

        console.log("🔥 Persisted inspection to secure Firestore collections successfully! DocId:", docId);
        return docId;
      } catch (err) {
        console.warn("⚠️ Failed syncing write commands to Firestore cloud database. Kept offline status:", err);
      }
    }

    return freshId;
  },

  /**
   * Loads inspections list.
   */
  async getSavedAnalyses(userId: string): Promise<AICarAnalysis[]> {
    // 1. Try Firestore
    if (!isMockConfig && db) {
      try {
        const q = query(
          collection(db, "ai_analysis"),
          orderBy("createdAt", "desc"),
          limit(15)
        );
        const querySnapshot = await getDocs(q);
        const items: AICarAnalysis[] = [];
        
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          items.push({
            id: docSnapshot.id,
            imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=600",
            brand: data.brand || "",
            model: data.model || "",
            color: data.color || "",
            bodyType: data.bodyType || "",
            condition: data.condition || "",
            modification: data.modification || "",
            damageEstimation: data.damageEstimation || "",
            visualQualityScore: data.visualQualityScore || {
              lighting: 85,
              framing: 85,
              composition: 85,
              sharpness: 85,
              overallScore: 85
            },
            confidenceScores: data.confidenceScores || {
              brand: 90,
              model: 80,
              color: 90,
              bodyType: 90,
              condition: 80,
              modification: 80
            },
            insights: data.insights || [],
            sellingPoints: data.sellingPoints || [],
            engineInsights: data.engineInsights || "",
            licensePlateStatus: data.licensePlateStatus || "",
            ocrBrandBadge: data.ocrBrandBadge || "",
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString()
          });
        });

        if (items.length > 0) return items;
      } catch (err) {
        console.warn("Could not retrieve analyses from Firestore (using localStorage fallback):", err);
      }
    }

    // 2. Local Storage sync fallback
    try {
      const records = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_ANALYSIS) || "[]");
      return records as AICarAnalysis[];
    } catch {
      return [];
    }
  }
};

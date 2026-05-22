export interface VisualQualityScores {
  lighting: number;      // 0 - 100
  framing: number;       // 0 - 100
  composition: number;   // 0 - 100
  sharpness: number;     // 0 - 100
  overallScore: number;  // 0 - 100
}

export interface ConfidenceScores {
  brand: number;        // Percentage
  model: number;        // Percentage
  color: number;        // Percentage
  bodyType: number;     // Percentage
  condition: number;    // Percentage
  modification: number; // Percentage
}

export interface AICarAnalysis {
  id?: string;
  imageUrl: string;
  brand: string;
  model: string;
  color: string;
  bodyType: string;
  condition: string;
  modification: string;
  damageEstimation: string;
  visualQualityScore: VisualQualityScores;
  confidenceScores: ConfidenceScores;
  insights: string[]; // Specific recommendations or aesthetic compliments
  sellingPoints: string[]; // Top USP points for listing optimization
  engineInsights?: string;
  licensePlateStatus?: string;
  ocrBrandBadge?: string;
  createdAt: string;
}

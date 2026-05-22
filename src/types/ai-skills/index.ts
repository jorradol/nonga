export type SkillCategory =
  | "marketing"
  | "content_creation"
  | "sales_enablement"
  | "automotive_analytics"
  | "personalization"
  | "finance_insurance"
  | "industry_expert"
  | "orchestration";

export interface SkillActivationRule {
  type: "keyword" | "context_key" | "sentiment" | "car_criteria" | "always_on";
  field?: string; // e.g. "carType", "price", "brand", "sentiment"
  operator?: "equals" | "contains" | "greater_than" | "less_than" | "regex";
  value: string; // value to compare against, or comma-separated keywords
}

export interface SkillConditions {
  minConfidence?: number; // threshold 0-1
  userRolesAllowed?: string[]; // e.g., ["client", "dealer", "admin"]
  requiredContextKeys?: string[];
}

export interface AISkill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  systemInstruction: string; // The injected system prompt segment
  priority: number; // 1 to 100 (highest priority is run first or finalizes)
  isEnabled: boolean;
  activationRules: SkillActivationRule[];
  conditions: SkillConditions;
  dependencies: string[]; // required skill IDs for chaining
  chainOutput: boolean; // whether this skill expects to receive and augment chained outputs
  config: Record<string, any>; // custom configuration settings
  lastUpdated: string;
  icon?: string; // Lucide icon identifier
}

export interface AISkillConfig {
  skillId: string;
  isActive: boolean;
  customParameters: Record<string, any>;
  customPromptOverride?: string;
  priorityAdjustment: number;
  lastUpdated: string;
}

export interface SkillExecutionLog {
  id: string;
  timestamp: string;
  chatId?: string;
  skillsTriggered: string[];
  chainedSystemPrompt: string;
  userInputSnippet: string;
  success: boolean;
  notes?: string;
}

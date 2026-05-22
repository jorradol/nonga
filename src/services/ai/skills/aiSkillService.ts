import { db, isMockConfig } from "../../../lib/firebase";
import { 
  collection, doc, getDocs, setDoc, deleteDoc 
} from "firebase/firestore";
import { AISkill, AISkillConfig, SkillExecutionLog } from "../../../types/ai-skills";
import { PRESET_AI_SKILLS } from "../registry/skillRegistry";

const KEYS = {
  skills: "nonga_ai_skills_custom",
  configs: "nonga_ai_skills_configs",
  logs: "nonga_ai_skills_logs"
};

// Generic Type-Safe helpers with robust local storage resilience
async function getSkillsFromStore(): Promise<AISkill[]> {
  if (!isMockConfig && db) {
    try {
      const colRef = collection(db, "ai_skills");
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const list: AISkill[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AISkill);
        });
        return list;
      }
    } catch (err) {
      console.warn("Firestore ai_skills load error:", err);
    }
  }

  // Local Storage fallback
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const cached = localStorage.getItem(KEYS.skills);
      if (cached) {
        return JSON.parse(cached) as AISkill[];
      }
    } catch (err) {
      console.warn("Local storage skills backup load error:", err);
    }
  }

  return PRESET_AI_SKILLS;
}

async function saveSkillToStore(skill: AISkill): Promise<void> {
  if (!isMockConfig && db) {
    try {
      const docRef = doc(db, "ai_skills", skill.id);
      const data = { ...skill };
      delete (data as any).id;
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      console.warn("Firestore ai_skills write error:", err);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const list = await getSkillsFromStore();
      const copyList = [...list];
      const idx = copyList.findIndex(x => x.id === skill.id);
      if (idx > -1) {
        copyList[idx] = skill;
      } else {
        copyList.push(skill);
      }
      localStorage.setItem(KEYS.skills, JSON.stringify(copyList));
    } catch (err) {
      console.warn("Local storage skills backup save error:", err);
    }
  }
}

async function deleteSkillFromStore(id: string): Promise<void> {
  if (!isMockConfig && db) {
    try {
      await deleteDoc(doc(db, "ai_skills", id));
    } catch (err) {
      console.warn("Firestore delete skill error:", err);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const list = await getSkillsFromStore();
      const filtered = list.filter(x => x.id !== id);
      localStorage.setItem(KEYS.skills, JSON.stringify(filtered));
    } catch (err) {
      console.warn("Local storage delete skill error:", err);
    }
  }
}

// Configs collections CRUD
async function getConfigsFromStore(): Promise<AISkillConfig[]> {
  if (!isMockConfig && db) {
    try {
      const colRef = collection(db, "ai_skill_configs");
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const list: AISkillConfig[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ skillId: docSnap.id, ...docSnap.data() } as AISkillConfig);
        });
        return list;
      }
    } catch (err) {
      console.warn("Firestore ai_skill_configs load error:", err);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const cached = localStorage.getItem(KEYS.configs);
      if (cached) {
        return JSON.parse(cached) as AISkillConfig[];
      }
    } catch (err) {
      console.warn("Local storage configs backup load error:", err);
    }
  }

  return [];
}

async function saveConfigToStore(config: AISkillConfig): Promise<void> {
  if (!isMockConfig && db) {
    try {
      const docRef = doc(db, "ai_skill_configs", config.skillId);
      const data = { ...config };
      delete (data as any).skillId;
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      console.warn("Firestore ai_skill_configs write error:", err);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const list = await getConfigsFromStore();
      const copyList = [...list];
      const idx = copyList.findIndex(x => x.skillId === config.skillId);
      if (idx > -1) {
        copyList[idx] = config;
      } else {
        copyList.push(config);
      }
      localStorage.setItem(KEYS.configs, JSON.stringify(copyList));
    } catch (err) {
      console.warn("Local storage configs backup save error:", err);
    }
  }
}

// Log actions
async function appendExecutionLog(log: SkillExecutionLog): Promise<void> {
  if (!isMockConfig && db) {
    try {
      const docRef = doc(db, "ai_skill_logs", log.id);
      const data = { ...log };
      delete (data as any).id;
      await setDoc(docRef, data);
    } catch (err) {
      console.warn("Firestore logs write error:", err);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const cached = localStorage.getItem(KEYS.logs);
      const list: SkillExecutionLog[] = cached ? JSON.parse(cached) : [];
      list.push(log);
      if (list.length > 50) list.shift(); // rotate and keep 50
      localStorage.setItem(KEYS.logs, JSON.stringify(list));
    } catch (err) {
      console.warn("Local storage log error:", err);
    }
  }
}

export const aiSkillService = {
  // CRUD operations
  async getSkills(): Promise<AISkill[]> {
    return getSkillsFromStore();
  },

  async saveSkill(skill: AISkill): Promise<void> {
    await saveSkillToStore(skill);
  },

  async deleteSkill(id: string): Promise<void> {
    await deleteSkillFromStore(id);
  },

  async resetToDefaults(): Promise<void> {
    // Drop all
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.removeItem(KEYS.skills);
      localStorage.removeItem(KEYS.configs);
    }
    // Repopulate
    for (const skill of PRESET_AI_SKILLS) {
      await saveSkillToStore(skill);
    }
  },

  // Config management
  async getSkillConfigs(): Promise<AISkillConfig[]> {
    return getConfigsFromStore();
  },

  async saveSkillConfig(config: AISkillConfig): Promise<void> {
    await saveConfigToStore(config);
  },

  // Execution History Logs
  async getLogs(): Promise<SkillExecutionLog[]> {
    if (!isMockConfig && db) {
      try {
        const colRef = collection(db, "ai_skill_logs");
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          const list: SkillExecutionLog[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as SkillExecutionLog);
          });
          return list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        }
      } catch (err) {
        console.warn("Firestore log get error:", err);
      }
    }

    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const cached = localStorage.getItem(KEYS.logs);
        if (cached) {
          const list = JSON.parse(cached) as SkillExecutionLog[];
          return list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        }
      } catch (err) {
        console.warn("Local storage logs get error:", err);
      }
    }
    return [];
  },

  // THE ENGINE: Match active skills based on context and input, perform prioritizing, sorting, and chaining
  async evaluateAndChainSkills(
    userInput: string,
    context?: Record<string, any>
  ): Promise<{
    matchedSkills: AISkill[];
    chainedPrompt: string;
    finalPriorityScores: Record<string, number>;
  }> {
    const allSkills = await getSkillsFromStore();
    const allConfigs = await getConfigsFromStore();

    const enabledSkills = allSkills.filter(s => s.isEnabled);
    const matchedSkills: AISkill[] = [];
    const finalPriorityScores: Record<string, number> = {};

    const userRole = context?.userRole || "client";
    const carMetadata = context?.car || {};

    // 1. Evaluate matching status
    for (const skill of enabledSkills) {
      // Check general conditions
      const condition = skill.conditions;
      if (condition?.userRolesAllowed && condition.userRolesAllowed.length > 0) {
        if (!condition.userRolesAllowed.includes(userRole)) {
          continue; // Role not permissioned
        }
      }

      let isTriggered = false;

      // Evaluate rules
      if (skill.activationRules.length === 0) {
        // Default: If no rules, evaluate it as not triggered unless preconfig says always on
        isTriggered = false;
      } else {
        for (const rule of skill.activationRules) {
          if (rule.type === "always_on") {
            isTriggered = true;
            break;
          }

          if (rule.type === "keyword") {
            const keywords = rule.value.split(",").map(k => k.trim().toLowerCase());
            const textToSearch = userInput.toLowerCase();
            if (keywords.some(kw => kw && textToSearch.includes(kw))) {
              isTriggered = true;
              break;
            }
          }

          if (rule.type === "sentiment" && context?.sentiment) {
            if (context.sentiment.toLowerCase() === rule.value.toLowerCase()) {
              isTriggered = true;
              break;
            }
          }

          if (rule.type === "car_criteria" && rule.field) {
            const fieldValue = carMetadata[rule.field];
            if (fieldValue !== undefined) {
              const ruleValueNum = parseFloat(rule.value);
              const fieldValueNum = parseFloat(fieldValue);

              if (rule.operator === "equals" && String(fieldValue).toLowerCase() === rule.value.toLowerCase()) {
                isTriggered = true;
                break;
              } else if (rule.operator === "contains" && String(fieldValue).toLowerCase().includes(rule.value.toLowerCase())) {
                isTriggered = true;
                break;
              } else if (rule.operator === "greater_than" && !isNaN(fieldValueNum) && !isNaN(ruleValueNum) && fieldValueNum > ruleValueNum) {
                isTriggered = true;
                break;
              } else if (rule.operator === "less_than" && !isNaN(fieldValueNum) && !isNaN(ruleValueNum) && fieldValueNum < ruleValueNum) {
                isTriggered = true;
                break;
              }
            }
          }

          if (rule.type === "context_key" && rule.field) {
            const ctxValue = context?.[rule.field];
            if (ctxValue !== undefined && String(ctxValue).toLowerCase() === rule.value.toLowerCase()) {
              isTriggered = true;
              break;
            }
          }
        }
      }

      if (isTriggered) {
        // Calculate dynamic priorities
        const matchingConfig = allConfigs.find(c => c.skillId === skill.id);
        const priorityAdjustment = matchingConfig?.priorityAdjustment || 0;
        const finalPriority = Math.max(1, Math.min(100, skill.priority + priorityAdjustment));

        finalPriorityScores[skill.id] = finalPriority;
        matchedSkills.push(skill);
      }
    }

    // 2. Chaining dependencies & sorting by priority descending
    // Add dependencies if enabled but not already matched
    const queuedToAppend: AISkill[] = [];
    for (const matched of matchedSkills) {
      if (matched.dependencies && matched.dependencies.length > 0) {
        for (const depId of matched.dependencies) {
          if (!matchedSkills.some(m => m.id === depId)) {
            const depSkill = allSkills.find(s => s.id === depId && s.isEnabled);
            if (depSkill) {
              const matchingConfig = allConfigs.find(c => c.skillId === depSkill.id);
              const priorityAdjustment = matchingConfig?.priorityAdjustment || 0;
              finalPriorityScores[depSkill.id] = Math.max(1, Math.min(100, depSkill.priority + priorityAdjustment));
              queuedToAppend.push(depSkill);
            }
          }
        }
      }
    }

    // Combine and deduplicate
    const finalMatchSet = [...matchedSkills];
    for (const s of queuedToAppend) {
      if (!finalMatchSet.some(x => x.id === s.id)) {
        finalMatchSet.push(s);
      }
    }

    // Sort by priority descending (highest priority executes or shapes the prompt first)
    finalMatchSet.sort((a,b) => {
      const pA = finalPriorityScores[a.id] || a.priority;
      const pB = finalPriorityScores[b.id] || b.priority;
      return pB - pA;
    });

    // 3. Build chained dynamic prompt context
    let chainedPrompt = "";
    if (finalMatchSet.length > 0) {
      chainedPrompt += "\n\n=== [DYNAMIC SKILLS INJECTED BY CORE SYSTEM ORCHESTRATOR] ===\n";
      chainedPrompt += "คุณมีทักษะพิเศษต่อไปนี้เปิดทำงานตามบริบทและคีย์เวิร์ดของบทสนทนา ให้บูรณาการเข้าด้วยกันอย่างลงตัวสูงสุด:\n";

      for (const skill of finalMatchSet) {
        const configOverride = allConfigs.find(c => c.skillId === skill.id);
        const instructionToUse = configOverride?.customPromptOverride || skill.systemInstruction;
        
        chainedPrompt += `\n📁 SKILL_NAME: ${skill.name} (${skill.category.toUpperCase()}) | PRIORITY: ${finalPriorityScores[skill.id] || skill.priority}\n`;
        chainedPrompt += `${instructionToUse}\n`;
        chainedPrompt += `--- [End of ${skill.id} dynamic payload] ---\n`;
      }
      chainedPrompt += "===================================================================\n\n";
    }

    // 4. Record execution log in background asynchronously
    if (finalMatchSet.length > 0) {
      const logObj: SkillExecutionLog = {
        id: "log-" + Math.random().toString(36).substring(2, 7) + "-" + Date.now(),
        timestamp: new Date().toISOString(),
        chatId: context?.chatId || "direct-sandbox",
        skillsTriggered: finalMatchSet.map(s => s.id),
        chainedSystemPrompt: chainedPrompt,
        userInputSnippet: userInput.length > 100 ? userInput.substring(0, 100) + "..." : userInput,
        success: true
      };
      appendExecutionLog(logObj).catch(err => console.error("Error saving prompt log:", err));
    }

    return {
      matchedSkills: finalMatchSet,
      chainedPrompt,
      finalPriorityScores
    };
  }
};

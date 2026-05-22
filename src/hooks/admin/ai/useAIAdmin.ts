import { useState, useEffect, useCallback } from "react";
import { aiAdminService } from "../../../services/ai/admin/aiAdminService";
import { 
  AIPromptTemplate, AIPersonalityPreset, AIMoodConfig, 
  AISkillConfig, AIWorkflow, AIPhraseCollection, AIRuleConfig 
} from "../../../types/aiAdmin";

export function useAIAdmin() {
  const [prompts, setPrompts] = useState<AIPromptTemplate[]>([]);
  const [personalities, setPersonalities] = useState<AIPersonalityPreset[]>([]);
  const [moods, setMoods] = useState<AIMoodConfig[]>([]);
  const [skills, setSkills] = useState<AISkillConfig[]>([]);
  const [workflows, setWorkflows] = useState<AIWorkflow[]>([]);
  const [phrases, setPhrases] = useState<AIPhraseCollection[]>([]);
  const [rules, setRules] = useState<AIRuleConfig[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all system values
  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        loadedPrompts,
        loadedPersonas,
        loadedMoods,
        loadedSkills,
        loadedWorkflows,
        loadedPhrases,
        loadedRules
      ] = await Promise.all([
        aiAdminService.getPrompts(),
        aiAdminService.getPersonalities(),
        aiAdminService.getMoods(),
        aiAdminService.getSkills(),
        aiAdminService.getWorkflows(),
        aiAdminService.getPhrases(),
        aiAdminService.getRules()
      ]);

      setPrompts(loadedPrompts);
      setPersonalities(loadedPersonas);
      setMoods(loadedMoods);
      setSkills(loadedSkills);
      setWorkflows(loadedWorkflows);
      setPhrases(loadedPhrases);
      setRules(loadedRules);
    } catch (err: any) {
      console.error("AI Admin Initialization Error:", err);
      setError(err?.message || "Failed to retrieve AI Control Center data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Saving Methods
  const savePrompt = async (prompt: AIPromptTemplate) => {
    setSaving(true);
    try {
      await aiAdminService.savePrompt(prompt);
      setPrompts(prev => {
        const idx = prev.findIndex(p => p.id === prompt.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = prompt;
          return updated;
        }
        return [...prev, prompt];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save prompt template.");
    } finally {
      setSaving(false);
    }
  };

  const deletePrompt = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deletePrompt(id);
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete prompt.");
    } finally {
      setSaving(false);
    }
  };

  const savePersonality = async (persona: AIPersonalityPreset) => {
    setSaving(true);
    try {
      await aiAdminService.savePersonality(persona);
      setPersonalities(prev => {
        const idx = prev.findIndex(p => p.id === persona.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = persona;
          return updated;
        }
        return [...prev, persona];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save personality.");
    } finally {
      setSaving(false);
    }
  };

  const deletePersonality = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deletePersonality(id);
      setPersonalities(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete personality.");
    } finally {
      setSaving(false);
    }
  };

  const saveMood = async (mood: AIMoodConfig) => {
    setSaving(true);
    try {
      await aiAdminService.saveMood(mood);
      setMoods(prev => {
        const idx = prev.findIndex(m => m.id === mood.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = mood;
          return updated;
        }
        return [...prev, mood];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save mood configuration.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMood = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deleteMood(id);
      setMoods(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete mood.");
    } finally {
      setSaving(false);
    }
  };

  const saveSkill = async (skill: AISkillConfig) => {
    setSaving(true);
    try {
      await aiAdminService.saveSkill(skill);
      setSkills(prev => {
        const idx = prev.findIndex(s => s.id === skill.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = skill;
          return updated;
        }
        return [...prev, skill];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save skill.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSkill = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deleteSkill(id);
      setSkills(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete skill.");
    } finally {
      setSaving(false);
    }
  };

  const saveWorkflow = async (workflow: AIWorkflow) => {
    setSaving(true);
    try {
      await aiAdminService.saveWorkflow(workflow);
      setWorkflows(prev => {
        const idx = prev.findIndex(w => w.id === workflow.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = workflow;
          return updated;
        }
        return [...prev, workflow];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save workflow.");
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete workflow.");
    } finally {
      setSaving(false);
    }
  };

  const savePhrase = async (phrase: AIPhraseCollection) => {
    setSaving(true);
    try {
      await aiAdminService.savePhrase(phrase);
      setPhrases(prev => {
        const idx = prev.findIndex(p => p.id === phrase.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = phrase;
          return updated;
        }
        return [...prev, phrase];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save phrase.");
    } finally {
      setSaving(false);
    }
  };

  const deletePhrase = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deletePhrase(id);
      setPhrases(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete phrase.");
    } finally {
      setSaving(false);
    }
  };

  const saveRule = async (rule: AIRuleConfig) => {
    setSaving(true);
    try {
      await aiAdminService.saveRule(rule);
      setRules(prev => {
        const idx = prev.findIndex(r => r.id === rule.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = rule;
          return updated;
        }
        return [...prev, rule];
      });
    } catch (err: any) {
      setError(err.message || "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    setSaving(true);
    try {
      await aiAdminService.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete rule.");
    } finally {
      setSaving(false);
    }
  };

  return {
    prompts,
    personalities,
    moods,
    skills,
    workflows,
    phrases,
    rules,
    loading,
    saving,
    error,
    reloadAll,
    
    // Actions
    savePrompt,
    deletePrompt,
    savePersonality,
    deletePersonality,
    saveMood,
    deleteMood,
    saveSkill,
    deleteSkill,
    saveWorkflow,
    deleteWorkflow,
    savePhrase,
    deletePhrase,
    saveRule,
    deleteRule
  };
}

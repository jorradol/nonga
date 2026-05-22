import { useState, useEffect, useCallback } from "react";
import { AISkill, AISkillConfig, SkillExecutionLog } from "../../types/ai-skills";
import { aiSkillService } from "../../services/ai/skills/aiSkillService";

export function useAISkills() {
  const [skills, setSkills] = useState<AISkill[]>([]);
  const [configs, setConfigs] = useState<AISkillConfig[]>([]);
  const [logs, setLogs] = useState<SkillExecutionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedSkills, fetchedConfigs, fetchedLogs] = await Promise.all([
        aiSkillService.getSkills(),
        aiSkillService.getSkillConfigs(),
        aiSkillService.getLogs()
      ]);
      setSkills(fetchedSkills);
      setConfigs(fetchedConfigs);
      setLogs(fetchedLogs);
    } catch (err: any) {
      console.error("Error loading AISkills:", err);
      setError(err?.message || "ล้มเหลวในการดาวน์โหลดโมดูลทักษะประสาท");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const saveSkill = async (skill: AISkill) => {
    try {
      setSaving(true);
      setError(null);
      await aiSkillService.saveSkill(skill);
      await loadAllData();
    } catch (err: any) {
      console.error("Error saving skill:", err);
      setError(err?.message || "ล้มเหลวในการเซฟทักษะใหม่");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteSkill = async (id: string) => {
    try {
      setSaving(true);
      setError(null);
      await aiSkillService.deleteSkill(id);
      await loadAllData();
    } catch (err: any) {
      console.error("Error deleting skill:", err);
      setError(err?.message || "ล้มเหลวในการลบทักษะ");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const resetToDef = async () => {
    try {
      setSaving(true);
      setError(null);
      await aiSkillService.resetToDefaults();
      await loadAllData();
    } catch (err: any) {
      console.error("Error resetting skills:", err);
      setError(err?.message || "ล้มเหลวในการรีเซ็ตเป็นค่าเริ่มต้น");
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (config: AISkillConfig) => {
    try {
      setSaving(true);
      setError(null);
      await aiSkillService.saveSkillConfig(config);
      await loadAllData();
    } catch (err: any) {
      console.error("Error saving config:", err);
      setError(err?.message || "ล้มเหลวในการบันทึกค่ากำหนดเฉพาะ");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const evalSkills = async (userInput: string, context?: Record<string, any>) => {
    try {
      const result = await aiSkillService.evaluateAndChainSkills(userInput, context);
      // Reload logs to see latest evaluate logs
      const fetchedLogs = await aiSkillService.getLogs();
      setLogs(fetchedLogs);
      return result;
    } catch (err) {
      console.error("Error evaluating skills in hook:", err);
      throw err;
    }
  };

  return {
    skills,
    configs,
    logs,
    loading,
    saving,
    error,
    saveSkill,
    deleteSkill,
    resetToDefaults: resetToDef,
    saveConfig,
    evaluateSkills: evalSkills,
    reload: loadAllData
  };
}

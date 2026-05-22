import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "../../store";
import { leadsService } from "../../services/leads/leadsService";
import { analyticsService } from "../../services/analytics/analyticsService";
import { 
  Lead, 
  TrafficEvent, 
  AiLeadScore, 
  AnalyticsSummary, 
  TrendingCar, 
  PredictiveInsight,
  LeadEventType,
  LeadStatus
} from "../../types/analytics";

export function useAnalytics() {
  const { cars } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scores, setScores] = useState<Record<string, AiLeadScore>>({});
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search/Filters states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const fetchTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch leads
      const localLeads = await leadsService.getLeadsByDealer("dealer-nongbot-01");
      setLeads(localLeads);

      // 2. Fetch or load summary
      const localSummary = analyticsService.getSummaryByDealer("dealer-nongbot-01");
      setSummary(localSummary);

      // 3. Batch build AI scores for existing leads if they don't have scoring cached yet
      const scoreMap: Record<string, AiLeadScore> = {};
      const localScores = analyticsService.getLocalLeadScores();
      localScores.forEach(score => {
        scoreMap[score.leadId] = score;
      });

      // Generate for leads that didn't have any saved
      for (const lead of localLeads) {
        if (!scoreMap[lead.id]) {
          const generated = await analyticsService.generateAiLeadScore(lead);
          scoreMap[lead.id] = generated;
        }
      }
      setScores(scoreMap);
    } catch (err) {
      console.error("Error loading lead analytics telemetry", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch telemetry once on mount
  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  /**
   * Safe transaction to track clicks and events anywhere in the app
   */
  const trackEvent = useCallback(async (carId: string, eventType: LeadEventType, source?: string) => {
    try {
      await analyticsService.recordTrafficEvent({
        carId,
        eventType,
        dealerId: "dealer-nongbot-01",
        source,
      });
      // Refresh summary numbers
      const updatedSum = analyticsService.getSummaryByDealer("dealer-nongbot-01");
      setSummary(updatedSum);
    } catch (e) {
      console.warn("Telemetry track event ignored due to sandbox status", e);
    }
  }, []);

  /**
   * Add a new lead from buyer page or forms
   */
  const registerNewLead = useCallback(async (leadInput: Omit<Lead, "id" | "createdAt" | "updatedAt">) => {
    try {
      const created = await leadsService.createLead(leadInput);
      setLeads(prev => [created, ...prev]);
      
      // Auto score immediately with AI
      const score = await analyticsService.generateAiLeadScore(created);
      setScores(prev => ({
        ...prev,
        [created.id]: score
      }));

      // Count integration event
      await trackEvent(leadInput.carId, leadInput.eventType, "leads_crm_pipeline");
      return created;
    } catch (err) {
      console.error("Could not register raw lead", err);
    }
  }, [trackEvent]);

  /**
   * Move lead along kanban pipeline stages or status lists
   */
  const updatePipelineStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    try {
      await leadsService.updateLeadStatus(leadId, status);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l));
    } catch (err) {
      console.error("Error moving pipeline state", err);
    }
  }, []);

  /**
   * Save custom memo logs or sales rep annotations
   */
  const saveLeadNotes = useCallback(async (leadId: string, notes: string) => {
    try {
      await leadsService.updateLeadNotes(leadId, notes);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes, updatedAt: new Date().toISOString() } : l));
    } catch (err) {
      console.error("Error updating lead notes", err);
    }
  }, []);

  // Computed Properties: Trending Cars
  const trendingCars = useMemo(() => {
    return analyticsService.getTrendingCars(cars);
  }, [cars, leads]); // Refresh when cars or leads update

  // Computed Properties: Funnel Steps (Views -> Favorites -> Contacts/Inquiries -> Closed Deals)
  const funnelMetrics = useMemo(() => {
    if (!summary) return { views: 0, favorites: 0, inquiries: 0, closed: 0 };
    
    const views = summary.viewsCount || 1200;
    const favorites = summary.favoritesCount || 190;
    
    // Inquiries represent active discussion leads
    const inquiries = leads.length;
    const closed = leads.filter(l => l.status === "sold").length;
    
    return {
      views,
      favorites,
      inquiries,
      closed
    };
  }, [summary, leads]);

  // Computed Properties: Filtered Leads List
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = 
        l.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.carTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.buyerPhone && l.buyerPhone.includes(searchTerm)) ||
        (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  // Computed Properties: AI Insights lists
  const insights = useMemo(() => {
    return analyticsService.getPredictiveInsights();
  }, []);

  return {
    leads: filteredLeads,
    allLeadsRaw: leads,
    scores,
    summary,
    isLoading,
    searchTerm,
    statusFilter,
    trendingCars,
    funnelMetrics,
    insights,
    setSearchTerm,
    setStatusFilter,
    trackEvent,
    registerNewLead,
    updatePipelineStatus,
    saveLeadNotes,
    refreshAll: fetchTelemetry
  };
}

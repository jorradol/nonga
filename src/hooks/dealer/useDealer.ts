import { useMemo } from "react";
import { useDealerStore } from "../../stores/dealer/dealerStore";

export function useDealer() {
  const profile = useDealerStore((state) => state.profile);
  const leads = useDealerStore((state) => state.leads);
  const performanceMetrics = useDealerStore((state) => state.performanceMetrics);
  const inquiries = useDealerStore((state) => state.inquiries);
  const selectedInquiryId = useDealerStore((state) => state.selectedInquiryId);
  const leadSearchTerm = useDealerStore((state) => state.leadSearchTerm);
  const leadStatusFilter = useDealerStore((state) => state.leadStatusFilter);
  const leadTempFilter = useDealerStore((state) => state.leadTempFilter);

  // Actions
  const updateProfile = useDealerStore((state) => state.updateProfile);
  const updateLeadStatus = useDealerStore((state) => state.updateLeadStatus);
  const updateLeadNotes = useDealerStore((state) => state.updateLeadNotes);
  const addLead = useDealerStore((state) => state.addLead);
  
  const setSelectedInquiryId = useDealerStore((state) => state.setSelectedInquiryId);
  const sendInquiryReply = useDealerStore((state) => state.sendInquiryReply);
  const generateAISuggestedReply = useDealerStore((state) => state.generateAISuggestedReply);
  
  const boostListing = useDealerStore((state) => state.boostListing);
  const upgradeSubscription = useDealerStore((state) => state.upgradeSubscription);
  
  const setLeadSearchTerm = useDealerStore((state) => state.setLeadSearchTerm);
  const setLeadStatusFilter = useDealerStore((state) => state.setLeadStatusFilter);
  const setLeadTempFilter = useDealerStore((state) => state.setLeadTempFilter);
  
  const getAnalytics = useDealerStore((state) => state.getAnalytics);

  // Computed and filtered leads list
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search term
      const matchesSearch = 
        lead.name.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
        lead.message.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
        (lead.carTitle && lead.carTitle.toLowerCase().includes(leadSearchTerm.toLowerCase())) ||
        lead.phone.includes(leadSearchTerm);
      
      // Status
      const matchesStatus = leadStatusFilter === "all" || lead.status === leadStatusFilter;

      // Temperature
      const matchesTemp = leadTempFilter === "all" || lead.temperature === leadTempFilter;

      return matchesSearch && matchesStatus && matchesTemp;
    });
  }, [leads, leadSearchTerm, leadStatusFilter, leadTempFilter]);

  // Selected Inquiry Chat Details
  const activeInquiry = useMemo(() => {
    if (!selectedInquiryId) return null;
    return inquiries.find((i) => i.id === selectedInquiryId) || null;
  }, [inquiries, selectedInquiryId]);

  // Combined statistics summary
  const analytics = useMemo(() => {
    return getAnalytics();
  }, [leads, performanceMetrics, getAnalytics]);

  return {
    profile,
    leads,
    filteredLeads,
    performanceMetrics,
    inquiries,
    selectedInquiryId,
    activeInquiry,
    leadSearchTerm,
    leadStatusFilter,
    leadTempFilter,
    analytics,
    
    // Setters & Actions
    updateProfile,
    updateLeadStatus,
    updateLeadNotes,
    addLead,
    setSelectedInquiryId,
    sendInquiryReply,
    generateAISuggestedReply,
    boostListing,
    upgradeSubscription,
    setLeadSearchTerm,
    setLeadStatusFilter,
    setLeadTempFilter,
    refreshAnalytics: getAnalytics
  };
}

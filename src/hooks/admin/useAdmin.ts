import { useState, useCallback } from "react";
import { useAdminStore } from "../../stores/admin/adminStore";
import { useAppStore } from "../../store";
import { adminService } from "../../services/admin/adminService";
import { AdminRole, Car, DealerShowroom } from "../../types";

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  superadmin: ["manage_users", "delete_listings", "verify_dealers", "view_logs", "reply_tickets", "ai_moderation", "platform_audit", "delete_logs"],
  admin: ["manage_users", "delete_listings", "verify_dealers", "view_logs", "reply_tickets"],
  moderator: ["delete_listings", "reply_tickets", "view_logs"],
  "AI manager": ["ai_moderation", "platform_audit", "view_logs"]
};

export function useAdmin() {
  const {
    adminProfile,
    activeTab,
    setActiveTab,
    setAdminRole,
    platformUsers,
    tickets,
    reportedItems,
    auditLogs,
    analytics,
    updateUserStatus,
    changeUserRole,
    addPlatformUser,
    moderateReport,
    triggerAIModerationCheck,
    replyToTicket,
    updateTicketStatus,
    addAuditLogEntry,
    
    // Filters and bulk
    userSearchQuery,
    setUserSearchQuery,
    userRoleFilter,
    setUserRoleFilter,
    listingSearchQuery,
    setListingSearchQuery,
    listingTypeFilter,
    setListingTypeFilter,
    ticketPriorityFilter,
    setTicketPriorityFilter,
    ticketStatusFilter,
    setTicketStatusFilter,
    
    selectedUserIds,
    toggleSelectUser,
    clearSelectedUsers,
    bulkActionUsers,
    selectedListingIds,
    toggleSelectListing,
    clearSelectedListings
  } = useAdminStore();

  const {
    cars,
    dealers,
    deleteCarListing
  } = useAppStore();

  const [aiAuditLoading, setAiAuditLoading] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<{
    verdict: string;
    moderationTips: string;
    suggestedAction: string;
  } | null>(null);

  // 1. Role permission guards
  const hasPermission = useCallback((permission: string): boolean => {
    const permissions = ROLE_PERMISSIONS[adminProfile.role] || [];
    return permissions.includes(permission);
  }, [adminProfile.role]);

  // 2. Direct core mutations intersecting with global App Store
  
  // APPROVE / DISMISS DEALERS
  const toggleDealerVerification = useCallback((dealerId: string) => {
    if (!hasPermission("verify_dealers")) {
      alert("❌ บทบาทของคุณไม่ได้รับสิทธิ์อนุมัติสิทธิ์ดีลเลอร์ครับ!");
      return;
    }

    const currentDealers = useAppStore.getState().dealers;
    const matchedDealer = currentDealers.find((d) => d.id === dealerId);
    if (!matchedDealer) return;

    const nextVerified = !matchedDealer.verified;

    // Mutate main app store dealers state
    useAppStore.setState({
      dealers: currentDealers.map((d) => 
        d.id === dealerId ? { ...d, verified: nextVerified } : d
      )
    });

    addAuditLogEntry(
      "DEALER_VERIFICATION_TOGGLE",
      `เปลี่ยนสถานะยืนยันสิทธิ์ดีลเลอร์ "${matchedDealer.name}" เป็น: ${nextVerified ? "อนุมัติ ✓" : "ยกเลิกการตรวจสิทธิ์"}`
    );

    // Call express audit endpoint to document log
    adminService.reportModeratorActionLog(
      adminProfile.displayName, 
      "TOGGLE_DEALER_VERIFICATION", 
      dealerId
    );
  }, [adminProfile.displayName, hasPermission, addAuditLogEntry]);

  // REMOVE PROBLEM LISTING
  const handleRemoveCarListing = useCallback(async (carId: string) => {
    if (!hasPermission("delete_listings")) {
      alert("❌ บทบาทของคุณไม่ได้รับอนุญาตให้ลบโพสต์รถยนต์ครับ!");
      return;
    }

    const matchedCar = cars.find(c => c.id === carId);
    if (!matchedCar) return;

    try {
      // Deletes with server side sync too if configured
      await deleteCarListing(carId);
      
      // Update any reported status associated with this car
      reportedItems.forEach(item => {
        if (item.targetId === carId && item.status === "pending") {
          moderateReport(item.id, "removed");
        }
      });

      addAuditLogEntry(
        "DELETE_CAR_LISTING_BY_MODERATOR",
        `ลบประกาศขายรถรุ่น "${matchedCar.brand} ${matchedCar.model}" (${matchedCar.title}) เนื่องจากตรวจพบคอมเมนต์สแปมหรือฝ่าฝืนสิทธิ์`
      );

      adminService.reportModeratorActionLog(
        adminProfile.displayName,
        "DELETE_CAR_LISTING",
        carId
      );
    } catch (err) {
      console.error("Failed to delete listing inside admin hook", err);
    }
  }, [adminProfile.displayName, cars, deleteCarListing, reportedItems, moderateReport, addAuditLogEntry, hasPermission]);

  // RUN AI-POWERED PLATFORM AUDIT
  const handleRunPlatformAIAudit = useCallback(async () => {
    if (!hasPermission("platform_audit")) {
      alert("❌ บทบาทของคุณไม่ได้รับสิทธิ์เรียกใช้โมดูล AI Audit ในระบบค่ะ!");
      return;
    }

    setAiAuditLoading(true);
    try {
      const activeReports = reportedItems
        .filter(r => r.status === "pending")
        .map(r => ({ reason: r.reason, status: r.status, targetType: r.targetType }));
        
      const activeTickets = tickets
        .filter(t => t.status === "open")
        .map(t => ({ title: t.title, category: t.category, message: t.message }));

      const result = await adminService.runPlatformAIAudit(activeReports, activeTickets);
      setAiAuditResult(result);
      
      addAuditLogEntry(
        "PLATFORM_AI_SECURITY_AUDIT",
        "เรียกใช้งานระบบ Gemini AI Security Co-pilot ประเมินความอันเนื่องมาสแตนด์ปัญหามาร์เก็ตเพลสเรียบร้อย"
      );
    } catch (err) {
      console.error("Error invoking AI Audit:", err);
    } finally {
      setAiAuditLoading(false);
    }
  }, [reportedItems, tickets, addAuditLogEntry, hasPermission]);

  // Bulk Deletion for Selected cars
  const bulkDeleteSelectedCars = useCallback(async () => {
    if (!hasPermission("delete_listings")) {
      alert("❌ ไม่ได้รับอภิสิทธิ์ลบยกพอร์ตรถยนต์ค่ะ");
      return;
    }

    const selectedIds = selectedListingIds;
    if (selectedIds.length === 0) return;

    if (window.confirm(`⚠️ ยืนยันดำเนินการลบประกาศรถยนต์ทั้งหมดจำนวน ${selectedIds.length} คันที่เลือกและปิดเคสรังควานหรือไม่?`)) {
      for (const id of selectedIds) {
        await deleteCarListing(id);
      }
      addAuditLogEntry("BULK_DELETE_CARS", `ลบใบประกาศรถยนต์จำนวน ${selectedIds.length} คันเสร็จระลอกใหญ่`);
      clearSelectedListings();
    }
  }, [selectedListingIds, deleteCarListing, addAuditLogEntry, clearSelectedListings, hasPermission]);

  return {
    adminProfile,
    activeTab,
    setActiveTab,
    setAdminRole,
    platformUsers,
    tickets,
    reportedItems,
    auditLogs,
    analytics,
    
    // Core logic
    hasPermission,
    toggleDealerVerification,
    handleRemoveCarListing,
    handleRunPlatformAIAudit,
    aiAuditLoading,
    aiAuditResult,
    
    // Global car and dealer sets
    cars,
    dealers,
    
    // Form and table mutations
    updateUserStatus,
    changeUserRole,
    addPlatformUser,
    moderateReport,
    triggerAIModerationCheck,
    replyToTicket,
    updateTicketStatus,
    addAuditLogEntry,

    // Search and inputs
    userSearchQuery,
    setUserSearchQuery,
    userRoleFilter,
    setUserRoleFilter,
    listingSearchQuery,
    setListingSearchQuery,
    listingTypeFilter,
    setListingTypeFilter,
    ticketPriorityFilter,
    setTicketPriorityFilter,
    ticketStatusFilter,
    setTicketStatusFilter,

    // Multi select
    selectedUserIds,
    toggleSelectUser,
    clearSelectedUsers,
    bulkActionUsers,
    selectedListingIds,
    toggleSelectListing,
    clearSelectedListings,
    bulkDeleteSelectedCars
  };
}

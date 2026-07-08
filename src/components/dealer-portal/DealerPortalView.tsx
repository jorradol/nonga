import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store";
import { useDealerPortal } from "../../hooks/dealer/useDealerPortal";
import { useRole } from "../../hooks/auth/useRole";
import {
  DealerPortalLayout,
  dealerTabFromPath,
  type DealerPortalTab,
} from "./DealerPortalLayout";
import { DealerPortalHome } from "./DealerPortalHome";
import { DealerInventoryPage } from "./DealerInventoryPage";
import { DealerDraftsPage } from "./DealerDraftsPage";
import { DealerProfilePage } from "./DealerProfilePage";
import InventoryImportView from "../admin/inventory-import/InventoryImportView";
import {
  commitDealerImport,
  saveDealerPasteImportDraft,
} from "../../services/dealer/dealerApi";
import { navigateToDealerDraftsAfterPasteSave } from "../../utils/dealer/dealerPasteSaveRedirect";
import { parseDealerDraftFocusFromLocation } from "../../utils/dealer/dealerDraftNavigation";
import { AlertCircle } from "lucide-react";
import { DuplicateReviewSection } from "../duplicate/DuplicateReviewSection";
import { DealerPortalAdminScopeNotice } from "./DealerPortalAdminScopeNotice";

export default function DealerPortalView() {
  const { isDarkMode, setView, fetchCars } = useAppStore();
  const {
    canAccessPortal,
    apiHeaders,
    hasDealerInventoryScope,
    importOwner,
    ownerContext,
    isAdmin,
  } = useDealerPortal();
  const { isDealer } = useRole();
  const [tab, setTab] = useState<DealerPortalTab>(() =>
    typeof window !== "undefined"
      ? dealerTabFromPath(window.location.pathname)
      : "home"
  );
  const [draftFocusId, setDraftFocusId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? parseDealerDraftFocusFromLocation(window.location)
      : null
  );

  useEffect(() => {
    const syncFromUrl = () => {
      setTab(dealerTabFromPath(window.location.pathname));
      setDraftFocusId(parseDealerDraftFocusFromLocation(window.location));
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  if (!canAccessPortal) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-4" />
        <p className="text-sm text-slate-400">
          เฉพาะบัญชี Dealer หรือ Admin — ตั้ง role เป็น dealer ใน Profile
        </p>
        <button
          type="button"
          onClick={() => setView("profile")}
          className="mt-4 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
        >
          ไปตั้งค่าโปรไฟล์
        </button>
      </div>
    );
  }

  if (!hasDealerInventoryScope || !apiHeaders) {
    return (
      <DealerPortalLayout activeTab={tab} dealerName={ownerContext.showroomName}>
        <DealerPortalAdminScopeNotice />
      </DealerPortalLayout>
    );
  }

  const dealerName = ownerContext.showroomName;

  let content: React.ReactNode;
  switch (tab) {
    case "inventory":
      content = <DealerInventoryPage apiHeaders={apiHeaders} />;
      break;
    case "drafts":
      content = (
        <DealerDraftsPage
          apiHeaders={apiHeaders}
          initialFocusDraftId={draftFocusId}
          onFocusDraftConsumed={() => setDraftFocusId(null)}
          onPublished={() => fetchCars()}
        />
      );
      break;
    case "import":
      content = (
        <InventoryImportView
          mode="dealer"
          dealerApiHeaders={apiHeaders}
          ownerContextOverride={{
            dealerId: importOwner.dealerId!,
            ownerId: importOwner.ownerId!,
            ownerName: importOwner.ownerName!,
            ownerPhone: importOwner.ownerPhone!,
            showroomName: importOwner.showroomName,
            address: importOwner.address,
          }}
          commitImport={async (published, drafts, owner) =>
            commitDealerImport(apiHeaders, published, drafts, owner)
          }
          savePasteDraft={async (draft) =>
            saveDealerPasteImportDraft(apiHeaders, draft)
          }
          finalCommitEnabled
          onGoToDrafts={() => navigateToDealerDraftsAfterPasteSave(setTab)}
          compact
        />
      );
      break;
    case "duplicates":
      content = (
        <DuplicateReviewSection apiBase="dealer" apiHeaders={apiHeaders} />
      );
      break;
    case "profile":
      content = <DealerProfilePage apiHeaders={apiHeaders} />;
      break;
    default:
      content = (
        <DealerPortalHome apiHeaders={apiHeaders} isDarkMode={isDarkMode} />
      );
  }

  return (
    <DealerPortalLayout activeTab={tab} dealerName={dealerName}>
      {(isDealer || isAdmin) &&
        (import.meta as { env?: { DEV?: boolean } }).env?.DEV && (
          <p className="text-[10px] text-slate-600 font-mono mb-4 -mt-2">
            [dev] tent: {apiHeaders.dealerId}
            {isAdmin ? " · admin" : ""}
          </p>
        )}
      {content}
    </DealerPortalLayout>
  );
}

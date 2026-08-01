/**
 * Chat Experience V2 — Vehicle Workspace (right area).
 *
 * Desktop / large tablet (lg+, ≥1024px): always-visible persistent inline
 * column (never an overlay) with its own scroll region; collapsible to a
 * compact rail and reopenable. Shows a structural empty state when the
 * conversation has no discovered vehicles yet.
 *
 * Data source: ONLY structured carCards from the current conversation
 * (via the V2 presentation adapter). No mock vehicles, no fetches, no
 * lead/dealer actions, no availability claims.
 */
import { Car, PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import type { ChatCarCardData } from "../../types";
import { ChatV2VehicleCard } from "./ChatV2VehicleCard";

export const CHAT_V2_WORKSPACE_EMPTY_TITLE = "พื้นที่เลือกรถ";
export const CHAT_V2_WORKSPACE_RESULTS_TITLE = "รถที่พบ";

export function ChatV2WorkspaceEmptyState() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 gap-3"
      data-testid="chat-v2-workspace-empty"
    >
      <div
        className="w-12 h-12 rounded-2xl border border-dashed border-(--nonga-border-strong) bg-(--nonga-bg-subtle) flex items-center justify-center nonga-text-muted"
        aria-hidden="true"
      >
        <Search className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold nonga-text-primary">
          รถที่ค้นพบจะปรากฏที่นี่
        </p>
        <p className="text-[11px] nonga-text-muted leading-relaxed max-w-[220px]">
          ลองบอกงบประมาณ ประเภทรถ หรือการใช้งานที่ต้องการกับน้องเอ
          แล้วรถจากประกาศจริงจะแสดงในพื้นที่นี้ครับ
        </p>
      </div>
    </div>
  );
}

interface ChatV2WorkspaceBodyProps {
  vehicles: ChatCarCardData[];
  hasMoreCars: boolean;
  isLoading: boolean;
}

export function ChatV2WorkspaceBody({
  vehicles,
  hasMoreCars,
  isLoading,
}: ChatV2WorkspaceBodyProps) {
  if (vehicles.length === 0) {
    return <ChatV2WorkspaceEmptyState />;
  }
  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 scrollbar-thin"
      data-testid="chat-v2-workspace-list"
    >
      {/* Previous results stay visible while a new answer is generating. */}
      {vehicles.map((car) => (
        <div key={car.id} className="w-full min-w-0 max-w-full">
          <ChatV2VehicleCard car={car} />
        </div>
      ))}

      {hasMoreCars && (
        <p
          className="text-[11px] nonga-text-muted rounded-lg border border-(--nonga-border) bg-(--nonga-bg-subtle) px-2.5 py-2 leading-relaxed"
          data-testid="chat-v2-workspace-has-more"
        >
          ยังมีรถเพิ่มเติมในผลค้นหา — พิมพ์ “ดูเพิ่ม” ในแชทเพื่อดูรายการถัดไปครับ
        </p>
      )}

      <p className="text-[10px] nonga-text-muted leading-relaxed px-0.5">
        ข้อมูลจากประกาศจริงในระบบ ราคาและสถานะอาจเปลี่ยนแปลงได้
        ตรวจสอบล่าสุดได้จากหน้ารายละเอียดรถ
      </p>
      {isLoading && (
        <p className="text-[10px] nonga-text-muted px-0.5" role="status">
          กำลังอัปเดตผลจากคำตอบล่าสุด...
        </p>
      )}
    </div>
  );
}

export function ChatV2WorkspaceHeader({
  count,
  onCollapse,
}: {
  count: number;
  onCollapse?: () => void;
}) {
  const hasResults = count > 0;
  return (
    <div className="h-12 px-3 border-b border-(--nonga-border) flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Car className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" aria-hidden="true" />
        <h3 className="text-[13px] font-bold nonga-text-primary truncate">
          {hasResults ? CHAT_V2_WORKSPACE_RESULTS_TITLE : CHAT_V2_WORKSPACE_EMPTY_TITLE}
        </h3>
        {hasResults && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 shrink-0"
            data-testid="chat-v2-workspace-count"
          >
            {count.toLocaleString("th-TH")} คัน
          </span>
        )}
      </div>
      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          className="min-w-9 min-h-9 p-1.5 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
          aria-label="ย่อพื้นที่เลือกรถ"
          title="ย่อพื้นที่เลือกรถ"
          data-testid="chat-v2-workspace-collapse"
        >
          <PanelRightClose className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface ChatV2VehicleWorkspaceProps {
  vehicles: ChatCarCardData[];
  hasMoreCars: boolean;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Desktop inline workspace column (lg and up only; sheet handles below-lg). */
export function ChatV2VehicleWorkspace({
  vehicles,
  hasMoreCars,
  isLoading,
  isCollapsed,
  onToggleCollapsed,
}: ChatV2VehicleWorkspaceProps) {
  const count = vehicles.length;

  if (isCollapsed) {
    return (
      <aside
        role="complementary"
        aria-label={CHAT_V2_WORKSPACE_EMPTY_TITLE}
        className="hidden lg:flex shrink-0 w-14 h-full border-l border-(--nonga-border) bg-(--nonga-bg-surface)/60 flex-col items-center pt-3 gap-2"
        data-testid="chat-v2-workspace-rail"
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="min-w-9 min-h-9 p-1.5 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
          aria-label="เปิดพื้นที่เลือกรถ"
          title="เปิดพื้นที่เลือกรถ"
          data-testid="chat-v2-workspace-expand"
        >
          <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
        </button>
        <span
          className="flex flex-col items-center gap-1 text-orange-600 dark:text-orange-400"
          aria-hidden="true"
        >
          <Car className="w-4 h-4" />
          {count > 0 && (
            <span className="text-[10px] font-bold">{count.toLocaleString("th-TH")}</span>
          )}
        </span>
      </aside>
    );
  }

  return (
    <aside
      role="complementary"
      aria-label={
        count > 0
          ? `${CHAT_V2_WORKSPACE_RESULTS_TITLE} ${count.toLocaleString("th-TH")} คัน`
          : CHAT_V2_WORKSPACE_EMPTY_TITLE
      }
      className="hidden lg:flex shrink-0 lg:w-[288px] xl:w-[320px] 2xl:w-[360px] min-w-[260px] max-w-[400px] h-full border-l border-(--nonga-border) bg-(--nonga-bg-surface)/40 flex-col min-h-0"
      data-testid="chat-v2-workspace"
      data-has-results={count > 0 ? "true" : "false"}
    >
      <ChatV2WorkspaceHeader count={count} onCollapse={onToggleCollapsed} />
      <ChatV2WorkspaceBody
        vehicles={vehicles}
        hasMoreCars={hasMoreCars}
        isLoading={isLoading}
      />
    </aside>
  );
}

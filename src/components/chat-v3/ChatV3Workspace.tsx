import { useState } from "react";
import type { ChatV3WorkspaceItem } from "./contracts/chatV3Contracts";
import { resolveWorkspaceTypeLabel } from "./chatV3Presentation";

interface ChatV3WorkspaceProps {
  items: ChatV3WorkspaceItem[];
  collapsed: boolean;
  selectedItemId: string | null;
  editingItemId: string | null;
  editTitle: string;
  editSummary: string;
  mobilePanel: "sidebar" | "conversation" | "workspace";
  onCloseWorkspace: () => void;
  onSelectItem: (itemId: string) => void;
  onStartEdit: (itemId: string) => void;
  onCancelEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onEditSummaryChange: (value: string) => void;
  onSaveEdit: () => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItemUp: (itemId: string) => void;
  onMoveItemDown: (itemId: string) => void;
  onDragStartItem: (itemId: string) => void;
  onDropOnItem: (targetItemId: string) => void;
}

const SUPPORTED_WORKSPACE_TYPES = new Set([
  "VEHICLE",
  "COMPARISON",
  "CHECKLIST",
  "SUMMARY",
  "MAINTENANCE_PLAN",
  "REPAIR_NOTE",
  "COST_ESTIMATE",
  "INSURANCE_NOTE",
  "FINANCE_NOTE",
  "BUSINESS_PLACE",
  "GENERIC_CARD",
]);

export default function ChatV3Workspace({
  items,
  collapsed,
  selectedItemId,
  editingItemId,
  editTitle,
  editSummary,
  mobilePanel,
  onCloseWorkspace,
  onSelectItem,
  onStartEdit,
  onCancelEdit,
  onEditTitleChange,
  onEditSummaryChange,
  onSaveEdit,
  onDeleteItem,
  onMoveItemUp,
  onMoveItemDown,
  onDragStartItem,
  onDropOnItem,
}: ChatV3WorkspaceProps) {
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const isMobileActive = mobilePanel === "workspace";
  const isOpen = !collapsed || isMobileActive;

  return (
    <section
      className={`chat-v3-workspace ${isMobileActive ? "chat-v3-is-mobile-active" : ""} ${collapsed ? "chat-v3-is-collapsed" : "chat-v3-is-open"}`}
      aria-label="Workspace"
      hidden={!isOpen}
      data-workspace-open={isOpen ? "true" : "false"}
    >
      <header className="chat-v3-workspace-header">
        <div>
          <p className="chat-v3-kicker">Workspace</p>
          <h3>รายการที่น้องเอเตรียมไว้จากบทสนทนานี้</h3>
        </div>
        <button type="button" onClick={onCloseWorkspace} aria-label="ปิด Workspace">
          ปิด
        </button>
      </header>

      <div className="chat-v3-workspace-list">
        {items.length === 0 ? (
          <div className="chat-v3-workspace-empty" data-testid="chat-v3-workspace-empty-state">
            <h4>ยังไม่มีงานในตอนนี้</h4>
            <p>รายการจากการสนทนาจะมาแสดงที่นี่เมื่อมีข้อมูลเพิ่มเติม</p>
          </div>
        ) : (
          items.map((item, index) => {
            const isSelected = item.id === selectedItemId;
            const isEditing = item.id === editingItemId;
            const isSupported = SUPPORTED_WORKSPACE_TYPES.has(item.type);
            return (
              <article
                key={item.id}
                className={`chat-v3-workspace-card ${isSelected ? "chat-v3-is-selected" : ""}`}
                data-workspace-item-id={item.id}
                data-workspace-item-supported={isSupported ? "true" : "false"}
              >
                <div className="chat-v3-workspace-card-head">
                  <div>
                    <h4>{item.title}</h4>
                    <span>{resolveWorkspaceTypeLabel(item)}</span>
                  </div>
                  <div className="chat-v3-workspace-card-head-actions">
                    <button
                      type="button"
                      className="chat-v3-workspace-drag-handle"
                      title="ลากเพื่อย้ายลำดับ"
                      draggable
                      onDragStart={() => onDragStartItem(item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => onDropOnItem(item.id)}
                      aria-label={`ลากย้าย ${item.title}`}
                    >
                      ⋮⋮
                    </button>
                    <button type="button" onClick={() => onSelectItem(item.id)}>
                      {isSelected ? "กำลังดู" : "เปิดดู"}
                    </button>
                    <button
                      type="button"
                      aria-label={`เมนูการ์ด ${item.title}`}
                      onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="chat-v3-workspace-editor">
                    <label>
                      ชื่อการ์ด
                      <input
                        value={editTitle}
                        onChange={(event) => onEditTitleChange(event.target.value)}
                      />
                    </label>
                    <label>
                      คำอธิบาย
                      <textarea
                        value={editSummary}
                        rows={3}
                        onChange={(event) => onEditSummaryChange(event.target.value)}
                      />
                    </label>
                    <div className="chat-v3-workspace-actions">
                      <button type="button" onClick={onSaveEdit}>
                        บันทึก
                      </button>
                      <button type="button" onClick={onCancelEdit}>
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : isSupported ? (
                  <p>{item.summary}</p>
                ) : (
                  <div className="chat-v3-workspace-unsupported">
                    <p className="chat-v3-workspace-unsupported-title">
                      {item.title || "Unnamed item"}
                    </p>
                    <p>รายการนี้ยังไม่รองรับการแสดงผลเต็มรูปแบบ</p>
                  </div>
                )}

                <div className="chat-v3-workspace-actions" hidden={openMenuItemId !== item.id}>
                  <button type="button" onClick={() => onSelectItem(item.id)}>
                    เปิดดู
                  </button>
                  <button type="button" onClick={() => onStartEdit(item.id)}>
                    แก้ไข
                  </button>
                  <button type="button" onClick={() => onDeleteItem(item.id)}>
                    ลบ
                  </button>
                  <button type="button" onClick={() => onMoveItemUp(item.id)} disabled={index === 0}>
                    เลื่อนขึ้น
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveItemDown(item.id)}
                    disabled={index === items.length - 1}
                  >
                    เลื่อนลง
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

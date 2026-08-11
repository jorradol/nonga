import ChatV3Conversation from "./ChatV3Conversation";
import ChatV3ExpertModeBar from "./ChatV3ExpertModeBar";
import ChatV3Sidebar from "./ChatV3Sidebar";
import ChatV3Workspace from "./ChatV3Workspace";
import { useChatV3LayoutState } from "./adapters/useChatV3LayoutState";
import { CHAT_V3_ASSISTANT_NAME, chatV3ExpertModeThaiLabel } from "./chatV3Presentation";

export default function ChatV3Shell() {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    activeWorkspaceItems,
    activeExpertMode,
    draftMessage,
    isSending,
    sendError,
    isWorkspaceCollapsed,
    selectedWorkspaceItemId,
    editingWorkspaceItemId,
    workspaceEditTitle,
    workspaceEditSummary,
    sidebarCollapsed,
    mobilePanel,
    setDraftMessage,
    sendDraftMessage,
    sendSuggestedPrompt,
    createConversation,
    deleteConversation,
    setActiveConversation,
    setActiveExpertMode,
    setMobilePanel,
    toggleSidebarCollapsed,
    toggleWorkspaceCollapsed,
    openWorkspace,
    closeWorkspace,
    selectWorkspaceItem,
    startEditingWorkspaceItem,
    cancelEditingWorkspaceItem,
    setWorkspaceEditTitle,
    setWorkspaceEditSummary,
    saveWorkspaceItemEdit,
    deleteWorkspaceItem,
    moveWorkspaceItemUp,
    moveWorkspaceItemDown,
    beginWorkspaceDrag,
    completeWorkspaceDrop,
  } = useChatV3LayoutState();

  const workspaceOpen = !isWorkspaceCollapsed;

  return (
    <div className="chat-v3-shell" data-testid="chat-v3-shell" data-workspace-open={workspaceOpen ? "true" : "false"}>
      <div className="chat-v3-mobile-panels" aria-label="ตัวนำทางมือถือ">
        <button
          type="button"
          className={mobilePanel === "sidebar" ? "chat-v3-is-active" : ""}
          onClick={() => setMobilePanel("sidebar")}
          aria-label="เปิดประวัติการสนทนา"
        >
          ประวัติ
        </button>
        <button
          type="button"
          className={mobilePanel === "conversation" ? "chat-v3-is-active" : ""}
          onClick={() => setMobilePanel("conversation")}
          aria-label="เปิดหน้าสนทนา"
        >
          แชท
        </button>
        <button
          type="button"
          className={mobilePanel === "workspace" ? "chat-v3-is-active" : ""}
          onClick={() => {
            openWorkspace();
          }}
          aria-label="เปิดงานของฉัน"
        >
          Workspace
        </button>
      </div>

      <div
        className={[
          "chat-v3-grid",
          sidebarCollapsed ? "chat-v3-grid-sidebar-collapsed" : "",
          workspaceOpen ? "chat-v3-grid-workspace-open" : "chat-v3-grid-workspace-collapsed",
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid="chat-v3-layout-grid"
      >
        <ChatV3Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          activeModeThaiLabel={chatV3ExpertModeThaiLabel[activeExpertMode]}
          collapsed={sidebarCollapsed}
          mobilePanel={mobilePanel}
          onCreateConversation={createConversation}
          onDeleteConversation={deleteConversation}
          onSelectConversation={setActiveConversation}
          onToggleCollapsed={toggleSidebarCollapsed}
          onShowConversation={() => setMobilePanel("conversation")}
        />

        <div className="chat-v3-main">
          <ChatV3ExpertModeBar
            activeMode={activeExpertMode}
            conversationTitle={activeConversation?.title || CHAT_V3_ASSISTANT_NAME}
            workspaceOpen={workspaceOpen}
            workspaceItemCount={activeWorkspaceItems.length}
            onModeChange={setActiveExpertMode}
            onToggleWorkspace={() => {
              if (workspaceOpen) closeWorkspace();
              else openWorkspace();
            }}
            onOpenNavMobile={() => setMobilePanel("sidebar")}
          />

          <ChatV3Conversation
            messages={activeMessages}
            draftMessage={draftMessage}
            activeModeLabel={chatV3ExpertModeThaiLabel[activeExpertMode]}
            mobilePanel={mobilePanel}
            isSending={isSending}
            sendError={sendError}
            onDraftChange={setDraftMessage}
            onSendMessage={sendDraftMessage}
            onSuggestedPrompt={sendSuggestedPrompt}
            onOpenWorkspace={openWorkspace}
          />
        </div>

        <ChatV3Workspace
          items={activeWorkspaceItems}
          collapsed={isWorkspaceCollapsed}
          selectedItemId={selectedWorkspaceItemId}
          editingItemId={editingWorkspaceItemId}
          editTitle={workspaceEditTitle}
          editSummary={workspaceEditSummary}
          mobilePanel={mobilePanel}
          onCloseWorkspace={closeWorkspace}
          onSelectItem={selectWorkspaceItem}
          onStartEdit={startEditingWorkspaceItem}
          onCancelEdit={cancelEditingWorkspaceItem}
          onEditTitleChange={setWorkspaceEditTitle}
          onEditSummaryChange={setWorkspaceEditSummary}
          onSaveEdit={saveWorkspaceItemEdit}
          onDeleteItem={deleteWorkspaceItem}
          onMoveItemUp={moveWorkspaceItemUp}
          onMoveItemDown={moveWorkspaceItemDown}
          onDragStartItem={beginWorkspaceDrag}
          onDropOnItem={completeWorkspaceDrop}
        />
      </div>
    </div>
  );
}

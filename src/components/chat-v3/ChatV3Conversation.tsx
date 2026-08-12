import { type KeyboardEventHandler, useEffect, useRef } from "react";
import type { ChatV3Message } from "./contracts/chatV3Contracts";
import {
  CHAT_V3_ASSISTANT_NAME,
  chatV3StarterPrompts,
  chatV3WelcomeSubtitle,
  chatV3WelcomeTitle,
} from "./chatV3Presentation";
import { normalizeChatV3AssistantTypography } from "../../services/ai/chat-v3/chatV3TypographyNormalize";

interface ChatV3ConversationProps {
  messages: ChatV3Message[];
  draftMessage: string;
  activeModeLabel: string;
  mobilePanel: "sidebar" | "conversation" | "workspace";
  isSending: boolean;
  sendError: string | null;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
  onSuggestedPrompt: (prompt: string) => void;
  onOpenWorkspace: () => void;
}

function renderAssistantContent(content: string) {
  // Display-time pass keeps reloaded / mock assistant text consistent (WP-V3-10D).
  const normalized = normalizeChatV3AssistantTypography(content);
  const blocks = normalized.split("\n").filter((line) => line.length > 0);
  return blocks.map((line, index) => {
    if (line.startsWith("- ")) {
      return (
        <li key={`line-${index}`} className="chat-v3-message-list-item">
          {line.slice(2)}
        </li>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <li key={`line-${index}`} className="chat-v3-message-list-item chat-v3-is-ordered">
          {line.replace(/^\d+\.\s/, "")}
        </li>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <h4 key={`line-${index}`} className="chat-v3-message-heading">
          {line.replace(/\*\*/g, "")}
        </h4>
      );
    }
    return (
      <p key={`line-${index}`} className="chat-v3-message-paragraph">
        {line.replace(/\*\*/g, "")}
      </p>
    );
  });
}

export default function ChatV3Conversation({
  messages,
  draftMessage,
  activeModeLabel,
  mobilePanel,
  isSending,
  sendError,
  onDraftChange,
  onSendMessage,
  onSuggestedPrompt,
  onOpenWorkspace,
}: ChatV3ConversationProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = draftMessage.trim().length > 0 && !isSending;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${nextHeight}px`;
  }, [draftMessage]);

  const onDraftKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSendMessage();
    }
  };

  return (
    <section
      className={`chat-v3-conversation ${mobilePanel === "conversation" ? "chat-v3-is-mobile-active" : ""}`}
      aria-label="พื้นที่สนทนาหลัก"
    >
      <div className="chat-v3-message-list" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <section className="chat-v3-welcome" aria-label="ข้อความต้อนรับ">
            <div className="chat-v3-welcome-mark" aria-hidden="true">
              น
            </div>
            <h2>{chatV3WelcomeTitle}</h2>
            <p>{chatV3WelcomeSubtitle}</p>
            <p className="chat-v3-welcome-mode">โหมดปัจจุบัน: {activeModeLabel}</p>
            <div className="chat-v3-welcome-prompts">
              {chatV3StarterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSuggestedPrompt(prompt)}
                  aria-label={`เริ่มคำถาม ${prompt}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="chat-v3-message-column">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`chat-v3-message chat-v3-message-${message.role} ${message.status === "thinking" ? "chat-v3-is-thinking" : ""}`}
                data-message-id={message.id}
              >
                {message.role !== "user" ? (
                  <div className="chat-v3-message-avatar" aria-hidden="true">
                    น
                  </div>
                ) : null}
                <div className="chat-v3-message-body">
                  {message.role === "user" ? (
                    <div className="chat-v3-message-bubble">
                      <p className="chat-v3-message-author">คุณ</p>
                      <p className="chat-v3-message-content">{message.content}</p>
                    </div>
                  ) : (
                    <div className="chat-v3-message-plain">
                      <p className="chat-v3-message-author">{CHAT_V3_ASSISTANT_NAME}</p>
                      {message.status === "thinking" ? (
                        <p className="chat-v3-message-thinking">{message.content}</p>
                      ) : (
                        <div className="chat-v3-message-content">
                          {renderAssistantContent(message.content)}
                        </div>
                      )}
                      {message.actions && message.actions.length > 0 ? (
                        <div className="chat-v3-message-actions">
                          {message.actions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => {
                                if (action.type === "open_workspace") onOpenWorkspace();
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="chat-v3-composer" aria-label="กล่องพิมพ์ข้อความ">
        {sendError ? (
          <p className="chat-v3-composer-error" role="alert">
            {sendError}
          </p>
        ) : null}
        <div className="chat-v3-composer-shell">
          <div className="chat-v3-composer-toolbar">
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="แนบรูปภาพ (ยังไม่พร้อมใช้งาน)"
              title="แนบรูปภาพ (ยังไม่พร้อมใช้งาน)"
            >
              🖼
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="แนบเอกสาร (ยังไม่พร้อมใช้งาน)"
              title="แนบเอกสาร (ยังไม่พร้อมใช้งาน)"
            >
              📄
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="บันทึกเสียง (ยังไม่พร้อมใช้งาน)"
              title="บันทึกเสียง (ยังไม่พร้อมใช้งาน)"
            >
              🎤
            </button>
            <span className="chat-v3-composer-placeholder-note">
              ไฟล์และไมค์จะเปิดใช้งานในเวอร์ชันถัดไป
            </span>
          </div>

          <div className="chat-v3-composer-input-wrap">
            <textarea
              ref={textareaRef}
              id="chat-v3-draft"
              value={draftMessage}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={onDraftKeyDown}
              placeholder="พิมพ์คุยกับน้องเอ เช่น หา SUV งบไม่เกิน 700,000"
              rows={1}
              disabled={isSending}
              aria-busy={isSending}
            />
            <button
              type="button"
              className="chat-v3-composer-send"
              onClick={onSendMessage}
              disabled={!canSend}
              aria-disabled={!canSend}
              aria-busy={isSending}
              aria-label="ส่งข้อความ"
            >
              {isSending ? "..." : "ส่ง"}
            </button>
          </div>
        </div>
        <p className="chat-v3-composer-footnote">
          คำแนะนำจากน้องเอเป็นข้อมูลเบื้องต้น ควรตรวจสอบกับผู้เชี่ยวชาญก่อนตัดสินใจ
        </p>
      </div>
    </section>
  );
}

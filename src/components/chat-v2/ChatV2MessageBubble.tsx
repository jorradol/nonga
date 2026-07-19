/**
 * Chat Experience V2 — message presentation (new namespace, no reuse of the
 * legacy ChatMessageBubble which mounts its own useChat instance).
 *
 * Text is rendered as-is with lightweight inline formatting (bold + bullets);
 * message content is never rewritten. Structured carCards attached to a
 * message surface as an honest "vehicles found" chip that opens the Vehicle
 * Workspace — the workspace is the canonical V2 vehicle surface.
 */
import { Fragment, type ReactNode } from "react";
import { Car, Sparkles, User } from "lucide-react";
import type { ChatMessage } from "../../types";
import { isTrustedVehicleCard } from "../../hooks/chat/useVehiclePanel";
import { ChatMessageAttachments } from "../chat/ChatMessageAttachments";

interface ChatV2MessageBubbleProps {
  /** Present to satisfy React 19 JSX key typing (same pattern as ChatMessageBubble). */
  key?: string;
  message: ChatMessage;
  onOpenWorkspace?: () => void;
}

/** Inline **bold** only — safe, non-destructive text presentation. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-bold nonga-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-t-${idx}`}>{part}</Fragment>;
  });
}

function renderMessageText(text: string, messageId: string): ReactNode {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const clean = line.trim();
        const key = `${messageId}-l-${idx}`;
        if (!clean) return <div key={key} className="h-1.5" aria-hidden="true" />;
        if (clean.startsWith("- ") || clean.startsWith("* ")) {
          return (
            <p key={key} className="flex items-start gap-1.5 leading-relaxed">
              <span className="text-orange-500 select-none mt-0.5 shrink-0" aria-hidden="true">
                •
              </span>
              <span>{renderInline(clean.slice(2), key)}</span>
            </p>
          );
        }
        return (
          <p key={key} className="leading-relaxed whitespace-pre-wrap break-words">
            {renderInline(clean, key)}
          </p>
        );
      })}
    </div>
  );
}

export function ChatV2MessageBubble({
  message,
  onOpenWorkspace,
}: ChatV2MessageBubbleProps) {
  const isUser = message.sender === "user";
  const trustedCardCount = !isUser
    ? new Set(
        (message.carCards ?? [])
          .filter(isTrustedVehicleCard)
          .map((card) => card.id)
      ).size
    : 0;

  return (
    <div
      className={`flex w-full gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid="chat-v2-message"
      data-sender={isUser ? "user" : "ai"}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? "bg-(--nonga-bg-subtle) border border-(--nonga-border) nonga-text-secondary"
            : "bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-sm"
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      <div className={`flex flex-col gap-1.5 max-w-[85%] md:max-w-[72%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 text-[13px] rounded-2xl min-w-0 max-w-full ${
            isUser
              ? "bg-orange-600 text-white rounded-tr-sm shadow-sm"
              : "bg-(--nonga-bg-surface) border border-(--nonga-border) nonga-text-secondary rounded-tl-sm shadow-xs"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed break-words">
              {message.text}
            </p>
          ) : (
            renderMessageText(message.text, message.id)
          )}

          {message.attachments && message.attachments.length > 0 && (
            <ChatMessageAttachments
              attachments={message.attachments}
              isUser={isUser}
            />
          )}
        </div>

        {trustedCardCount > 0 && (
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
            data-testid="chat-v2-message-vehicles-chip"
            aria-label={`เปิดพื้นที่เลือกรถ — ข้อความนี้พบรถ ${trustedCardCount.toLocaleString("th-TH")} คัน`}
          >
            <Car className="w-3.5 h-3.5" aria-hidden="true" />
            พบรถ {trustedCardCount.toLocaleString("th-TH")} คัน — ดูในพื้นที่เลือกรถ
          </button>
        )}
      </div>
    </div>
  );
}

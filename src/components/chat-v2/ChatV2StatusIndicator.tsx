/**
 * Chat Experience V2 — AI activity status (honest, derived-only).
 * Announced politely via aria-live; layout height is reserved so the
 * indicator never causes layout jumps.
 */
import { Sparkles } from "lucide-react";
import type { ChatV2ActivityStatus } from "./adapters/useChatV2Presentation";

export function ChatV2StatusIndicator({
  status,
}: {
  status: ChatV2ActivityStatus;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="h-5 flex items-center gap-1.5 text-[11px] nonga-text-muted"
      data-testid="chat-v2-status"
      data-status-kind={status.kind}
    >
      {status.label ? (
        <>
          <Sparkles
            className="w-3 h-3 text-orange-500 animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span>{status.label}</span>
        </>
      ) : null}
    </div>
  );
}

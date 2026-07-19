/**
 * Chat Experience V2 — composer.
 * Submits ONLY through the existing sendMessage contract (ChatProvider →
 * useChat). No new routing, no provider-gate bypass. Text-only in V2-1 —
 * no non-functional voice/camera/upload controls.
 */
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Send } from "lucide-react";

const MIN_HEIGHT_PX = 40;
const MAX_HEIGHT_PX = 112;

export interface ChatV2ComposerHandle {
  /** Prefill from suggestion chips; user still sends via the same path. */
  prefill: (text: string) => void;
}

interface ChatV2ComposerProps {
  isGenerating: boolean;
  onSend: (text: string) => Promise<void> | void;
}

export const ChatV2Composer = forwardRef<ChatV2ComposerHandle, ChatV2ComposerProps>(
  function ChatV2Composer({ isGenerating, onSend }, ref) {
    const [text, setText] = useState("");
    const [sendError, setSendError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const composingRef = useRef(false);

    const autosize = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = `${MIN_HEIGHT_PX}px`;
      const next = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
    }, []);

    useImperativeHandle(ref, () => ({
      prefill: (value: string) => {
        setText(value);
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(value.length, value.length);
          autosize();
        });
      },
    }));

    const handleSubmit = async (e?: FormEvent) => {
      e?.preventDefault();
      const value = text.trim();
      if (!value || isGenerating) return;
      setText("");
      setSendError(null);
      requestAnimationFrame(autosize);
      try {
        await onSend(value);
      } catch (err) {
        console.error("[ChatV2Composer] send failed", err);
        setText(value);
        setSendError("ส่งข้อความไม่สำเร็จครับ กรุณาลองใหม่อีกครั้ง");
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (composingRef.current) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit();
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl mx-auto"
        data-testid="chat-v2-composer"
      >
        <div
          className="flex items-end gap-1.5 rounded-2xl border border-(--nonga-border) bg-(--nonga-bg-surface) shadow-sm focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-colors motion-reduce:transition-none px-2 py-1.5"
          aria-busy={isGenerating || undefined}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autosize();
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              setText(e.currentTarget.value);
              autosize();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              isGenerating
                ? "น้องเอกำลังตอบอยู่ครับ..."
                : "พิมพ์ถามน้องเอ เช่น หารถ SUV งบไม่เกิน 700,000"
            }
            aria-label="ข้อความถึงน้องเอ"
            className="flex-1 min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-sm nonga-text-primary nonga-placeholder px-2 py-2 leading-[22px] touch-manipulation"
            style={{ minHeight: MIN_HEIGHT_PX, maxHeight: MAX_HEIGHT_PX, height: MIN_HEIGHT_PX }}
            data-testid="chat-v2-composer-input"
          />
          <button
            type="submit"
            disabled={isGenerating || !text.trim()}
            className="w-10 h-10 min-w-10 min-h-10 rounded-xl nonga-action nonga-focus-ring flex items-center justify-center shrink-0 transition-transform motion-reduce:transform-none active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            aria-label="ส่งข้อความ"
            title="ส่งข้อความ"
            data-testid="chat-v2-send"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        {sendError && (
          <p className="text-[11px] text-(--nonga-error) text-center mt-1.5" role="alert">
            {sendError}
          </p>
        )}
      </form>
    );
  }
);

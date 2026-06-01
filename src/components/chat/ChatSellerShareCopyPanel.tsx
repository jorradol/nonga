import React, { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, ClipboardCopy, X } from "lucide-react";
import {
  generateSellerShareCopy,
  pickSellerShareCopySuccessMessage,
  type SellerShareListingInput,
  type SellerShareCopyKind,
} from "../../services/chat/sellerShareCopy";
import { copyTextToClipboard } from "../../utils/clipboardCopy";

interface ChatSellerShareCopyPanelProps {
  input: SellerShareListingInput;
  idPrefix: string;
}

const COPY_ACTIONS: {
  kind: SellerShareCopyKind;
  label: string;
  testId: string;
}[] = [
  { kind: "full", label: "คัดลอกโพสต์ขาย", testId: "copy-full-post" },
  { kind: "short", label: "คัดลอกโพสต์สั้น", testId: "copy-short-post" },
  { kind: "specs", label: "คัดลอกสเปกรถ", testId: "copy-specs" },
];

export function ChatSellerShareCopyPanel({
  input,
  idPrefix,
}: ChatSellerShareCopyPanelProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeCopyId, setActiveCopyId] = useState<string | null>(null);
  const [fallback, setFallback] = useState<{
    label: string;
    text: string;
  } | null>(null);

  const shareInput = useMemo(() => input, [input]);

  const handleCopy = async (kind: SellerShareCopyKind, label: string) => {
    const text = generateSellerShareCopy(kind, shareInput);
    const copyId = `${idPrefix}-${kind}`;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setActiveCopyId(copyId);
      setFeedback(pickSellerShareCopySuccessMessage(shareInput));
      setFallback(null);
      setTimeout(() => {
        setActiveCopyId(null);
        setFeedback(null);
      }, 2800);
      return;
    }
    setFallback({ label, text });
    setFeedback(null);
  };

  return (
    <div
      className="rounded-lg border border-slate-800/90 bg-slate-900/50 overflow-hidden"
      data-testid="chat-seller-share-copy-panel"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
        data-testid="chat-seller-share-copy-toggle"
      >
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
          คัดลอกไปโพสต์ Facebook / LINE
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-800/80">
          <p className="text-[10px] text-slate-500 leading-relaxed pt-2">
            นำข้อความไปวางในโพสต์ของคุณเองได้เลย — ระบบไม่โพสต์แทนและไม่ใส่เบอร์โทรให้อัตโนมัติ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COPY_ACTIONS.map((action) => {
              const copyId = `${idPrefix}-${action.kind}`;
              const copied = activeCopyId === copyId;
              return (
                <button
                  key={action.kind}
                  type="button"
                  onClick={() => void handleCopy(action.kind, action.label)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 hover:border-orange-500/40 hover:text-orange-200 text-[10px] font-semibold text-slate-300 transition-colors cursor-pointer min-h-[36px]"
                  data-testid={action.testId}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <ClipboardCopy className="w-3 h-3 shrink-0" />
                  )}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
          {feedback && (
            <p
              className="text-[10px] text-emerald-400 font-medium"
              data-testid="chat-seller-share-copy-feedback"
            >
              {feedback}
            </p>
          )}
        </div>
      )}

      {fallback && (
        <div
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          data-testid="chat-seller-share-copy-fallback"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-bold text-white">{fallback.label}</p>
              <button
                type="button"
                onClick={() => setFallback(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
                aria-label="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-[11px] text-slate-400">
                คัดลอกอัตโนมัติไม่สำเร็จ — เลือกข้อความด้านล่างแล้วกด Ctrl+C (หรือคัดลอกบนมือถือ)
              </p>
              <textarea
                readOnly
                value={fallback.text}
                className="w-full min-h-[180px] text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-xl p-3 font-sans leading-relaxed resize-y"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useRef } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  CHAT_IMAGE_ATTACHMENT_ACCEPT,
  type PendingChatImageAttachment,
} from "../../features/chat-image-attachment-v1/types";

interface ChatImageAttachmentInputProps {
  pending: PendingChatImageAttachment[];
  disabled?: boolean;
  isPreparing?: boolean;
  onFilesSelected: (files: File[]) => void;
  onRemoveAt: (index: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatImageAttachmentInput({
  pending,
  disabled,
  isPreparing,
  onFilesSelected,
  onRemoveAt,
}: ChatImageAttachmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    event.target.value = "";
    if (files.length > 0) onFilesSelected(files);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={CHAT_IMAGE_ATTACHMENT_ACCEPT}
        multiple
        className="sr-only"
        id="chat-image-attachment-v1-input"
        disabled={disabled || isPreparing}
        onChange={handleChange}
      />

      {pending.length > 0 && (
        <div
          className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden"
          data-testid="chat-image-attachment-v1-preview"
          aria-label={`แนบรูปแล้ว ${pending.length} รูป`}
        >
          <span className="shrink-0 text-[10px] font-semibold text-orange-300 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
            {pending.length} รูป
          </span>
          <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-600 py-0.5">
            {pending.map((item, index) => (
              <div
                key={item.id}
                className="relative w-12 h-12 shrink-0 rounded-md border border-slate-600 bg-slate-800 overflow-hidden"
                title={`${item.originalFileName} (${formatSize(item.size)})`}
              >
                <img
                  src={item.previewUrl}
                  alt={item.originalFileName}
                  className="w-full h-full object-cover block"
                  draggable={false}
                />
                <button
                  type="button"
                  onClick={() => onRemoveAt(index)}
                  className="absolute top-0 right-0 p-0.5 rounded-bl-md bg-black/80 text-white hover:bg-black cursor-pointer"
                  title="เอารูปออก"
                  aria-label={`เอารูป ${item.originalFileName} ออก`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isPreparing}
        className="ml-auto min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-orange-400 hover:bg-slate-800/80 disabled:opacity-30 transition shrink-0 cursor-pointer"
        title="แนบรูป"
        id="chat-attach-image-v1-btn"
        aria-label="แนบรูป"
      >
        {isPreparing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ImagePlus className="w-4.5 h-4.5" />
        )}
      </button>
    </>
  );
}

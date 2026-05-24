import React, { useImperativeHandle, useRef, forwardRef } from "react";
import { X, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import {
  CHAT_FILE_ACCEPT,
  CHAT_MAX_FILES,
  formatFileSize,
  MSG_TOO_MANY_FILES,
  validateChatAttachmentFile,
  buildAttachmentMeta,
  createChatImageThumbnail,
} from "../../utils/chat/chatAttachments";
import type { ChatMessageAttachment } from "../../types";

export interface PendingChatFile {
  file: File;
  meta: ChatMessageAttachment;
  previewUrl?: string;
}

export interface ChatAttachmentInputHandle {
  openPicker: () => void;
}

interface ChatAttachmentInputProps {
  pending: PendingChatFile[];
  onChange: (next: PendingChatFile[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export const ChatAttachmentInput = forwardRef<
  ChatAttachmentInputHandle,
  ChatAttachmentInputProps
>(function ChatAttachmentInput({ pending, onChange, onError, disabled }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (!disabled && pending.length < CHAT_MAX_FILES) {
        inputRef.current?.click();
      }
    },
  }));

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;

    const selected = Array.from(list) as File[];
    const slotsLeft = CHAT_MAX_FILES - pending.length;
    if (slotsLeft <= 0) {
      onError(MSG_TOO_MANY_FILES);
      return;
    }
    if (selected.length > slotsLeft) {
      onError(MSG_TOO_MANY_FILES);
    }
    const toAdd = selected.slice(0, slotsLeft);
    const next = [...pending];

    for (const file of toAdd) {
      try {
        const kind = validateChatAttachmentFile(file);
        const thumb =
          kind === "image" ? await createChatImageThumbnail(file) : undefined;
        const meta = buildAttachmentMeta(file, kind, thumb);
        const previewUrl =
          kind === "image"
            ? thumb ?? URL.createObjectURL(file)
            : undefined;
        next.push({ file, meta, previewUrl });
      } catch (err) {
        onError(err instanceof Error ? err.message : "ไฟล์ชนิดนี้ยังไม่รองรับครับ");
      }
    }
    onChange(next);
  };

  const removeAt = (index: number) => {
    const item = pending[index];
    if (item?.previewUrl && item.previewUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        /* ignore */
      }
    }
    onChange(pending.filter((_, i) => i !== index));
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={CHAT_FILE_ACCEPT}
        className="hidden"
        id="chat-attachment-file-input"
        onChange={handlePick}
        disabled={disabled}
      />
      {pending.length > 0 && (
        <div
          className="flex flex-wrap gap-2 px-3 pt-3 pb-1 border-b border-slate-800/80"
          id="chat-attachment-preview-row"
          data-testid="chat-attachment-preview"
        >
          {pending.map((item, idx) => (
            <div
              key={item.meta.id}
              className="relative flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 pr-8 max-w-[220px]"
            >
              {item.meta.kind === "image" && (item.previewUrl || item.meta.previewDataUrl) ? (
                <img
                  src={item.previewUrl ?? item.meta.previewDataUrl}
                  alt={item.meta.name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
              ) : item.meta.kind === "spreadsheet" ? (
                <FileSpreadsheet className="w-8 h-8 text-emerald-400 shrink-0" />
              ) : item.meta.kind === "pdf" ? (
                <FileText className="w-8 h-8 text-rose-400 shrink-0" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-slate-200 truncate">
                  {item.meta.name}
                </p>
                <p className="text-[9px] text-slate-500">
                  {formatFileSize(item.meta.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="เอาไฟล์ออก"
                aria-label="เอาไฟล์ออก"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
});

export function revokePendingPreviews(pending: PendingChatFile[]): void {
  for (const item of pending) {
    if (item.previewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        /* ignore */
      }
    }
  }
}

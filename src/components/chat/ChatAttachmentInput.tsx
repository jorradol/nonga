import React, { useImperativeHandle, useRef, forwardRef } from "react";
import { X, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import {
  CHAT_FILE_ACCEPT,
  CHAT_MAX_FILES,
  formatFileSize,
  MSG_TOO_MANY_FILES,
  validateChatAttachmentFile,
  buildAttachmentMeta,
} from "../../utils/chat/chatAttachments";
import type { ChatMessageAttachment } from "../../types";

export interface PendingChatFile {
  file: File;
  meta: ChatMessageAttachment;
  /** blob: URL สำหรับ preview ก่อนส่ง */
  previewUrl?: string;
}

export interface ChatAttachmentInputHandle {
  openPicker: () => void;
}

interface ChatAttachmentInputProps {
  onAppend: (items: PendingChatFile[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  slotsUsed: number;
}

export function buildPendingChatFileSync(file: File): PendingChatFile {
  const kind = validateChatAttachmentFile(file);
  const previewUrl = kind === "image" ? URL.createObjectURL(file) : undefined;
  const meta = buildAttachmentMeta(file, kind);
  return { file, meta, previewUrl };
}

export const ChatAttachmentPreviewStrip = ({
  pending,
  onRemoveAt,
}: {
  pending: PendingChatFile[];
  onRemoveAt: (index: number) => void;
}) => {
  if (pending.length === 0) return null;

  const imageCount = pending.filter((p) => p.meta.kind === "image").length;

  return (
    <div
      className="px-3 pt-3 pb-2 border-b border-slate-800/80 space-y-2 bg-slate-950/40"
      id="chat-attachment-preview-row"
      data-testid="chat-attachment-preview"
    >
      {imageCount > 0 && (
        <p className="text-[10px] font-semibold text-slate-300 px-0.5">
          รูปที่เลือก {imageCount} รูป — กดส่งเมื่อพร้อม
        </p>
      )}
      {pending.length > imageCount && (
        <p className="text-[10px] font-semibold text-slate-400 px-0.5">
          ไฟล์แนบ {pending.length - imageCount} รายการ
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {pending.map((item, idx) => (
          <div
            key={item.meta.id}
            className="relative shrink-0 w-[72px] rounded-xl border border-slate-600 bg-slate-950 overflow-hidden shadow-md"
          >
            {item.meta.kind === "image" ? (
              <img
                src={item.previewUrl ?? item.meta.previewDataUrl}
                alt={item.meta.name}
                className="w-[72px] h-[72px] object-cover bg-slate-800"
              />
            ) : (
              <div className="w-[72px] h-[72px] flex flex-col items-center justify-center gap-1 p-1">
                {item.meta.kind === "spreadsheet" ? (
                  <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
                ) : item.meta.kind === "pdf" ? (
                  <FileText className="w-7 h-7 text-rose-400" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-slate-400" />
                )}
                <span className="text-[8px] text-slate-400 text-center line-clamp-2 w-full px-0.5">
                  {item.meta.name}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemoveAt(idx)}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer z-10"
              title="เอาไฟล์ออก"
              aria-label="เอาไฟล์ออก"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
              <p className="text-[8px] text-slate-100 truncate">{item.meta.name}</p>
              <p className="text-[7px] text-slate-400">{formatFileSize(item.meta.size)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChatAttachmentInput = forwardRef<
  ChatAttachmentInputHandle,
  ChatAttachmentInputProps
>(function ChatAttachmentInput(
  { onAppend, onError, disabled, slotsUsed },
  ref
) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (!disabled && slotsUsed < CHAT_MAX_FILES) {
        fileInputRef.current?.click();
      }
    },
  }));

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;

    const selected = Array.from(list) as File[];
    const slotsLeft = CHAT_MAX_FILES - slotsUsed;
    if (slotsLeft <= 0) {
      onError(MSG_TOO_MANY_FILES);
      return;
    }
    if (selected.length > slotsLeft) {
      onError(MSG_TOO_MANY_FILES);
    }
    const toAdd = selected.slice(0, slotsLeft);
    const built: PendingChatFile[] = [];

    for (const file of toAdd) {
      try {
        built.push(buildPendingChatFileSync(file));
      } catch (err) {
        onError(
          err instanceof Error ? err.message : "ไฟล์ชนิดนี้ยังไม่รองรับครับ"
        );
      }
    }

    if (built.length > 0) {
      onAppend(built);
    }
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept={CHAT_FILE_ACCEPT}
      className="hidden"
      id="chat-attachment-file-input"
      onChange={handlePick}
      disabled={disabled}
    />
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

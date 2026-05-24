import React, { useImperativeHandle, useRef, forwardRef } from "react";
import { X, FileSpreadsheet, FileText } from "lucide-react";
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
  /** blob: URL จาก URL.createObjectURL(file) */
  previewUrl?: string;
}

export interface ChatAttachmentInputHandle {
  openPicker: () => void;
}

interface ChatAttachmentInputProps {
  onAppend: (items: PendingChatFile[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function buildPendingChatFileSync(file: File): PendingChatFile {
  const kind = validateChatAttachmentFile(file);
  const previewUrl = kind === "image" ? URL.createObjectURL(file) : undefined;
  const meta = buildAttachmentMeta(file, kind);
  return { file, meta, previewUrl };
}

function logAttachmentPickDev(files: File[]): void {
  try {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (!env?.DEV) return;
    console.debug(
      "[chat-attachment-pick]",
      files.length,
      files.map((f) => ({ name: f.name, type: f.type || "(none)", size: f.size }))
    );
  } catch {
    /* ignore */
  }
}

/** Preview ภายในกล่อง composer — ใต้ข้อความ เหนือปุ่มแนบ/ส่ง */
export const ChatComposerAttachmentPreview = ({
  pending,
  onRemoveAt,
}: {
  pending: PendingChatFile[];
  onRemoveAt: (index: number) => void;
}) => {
  if (pending.length === 0) return null;

  const images = pending.filter((p) => p.meta.kind === "image");
  const files = pending.filter((p) => p.meta.kind !== "image");

  return (
    <div
      className="px-3 pt-1 pb-2 border-t border-slate-800/60"
      id="chat-attachment-preview-row"
      data-testid="chat-attachment-preview"
    >
      <div className="flex flex-wrap gap-2 max-h-[88px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
        {pending.map((item, idx) => {
          if (item.meta.kind === "image") {
            const src = item.previewUrl ?? item.meta.previewDataUrl;
            return (
              <div
                key={item.meta.id}
                className="relative shrink-0 w-16 h-16 rounded-lg border border-slate-600 bg-slate-800 overflow-hidden"
              >
                {src ? (
                  <img
                    src={src}
                    alt={item.meta.name}
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                    รูป
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAt(idx)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/75 text-white hover:bg-black cursor-pointer z-10"
                  title="เอารูปออก"
                  aria-label="เอารูปออก"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={item.meta.id}
              className="relative flex items-center gap-1.5 shrink-0 max-w-[min(100%,220px)] rounded-full border border-slate-600 bg-slate-800/90 pl-2 pr-7 py-1"
            >
              {item.meta.kind === "spreadsheet" ? (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="text-[10px] text-slate-200 truncate max-w-[140px]">
                {item.meta.name}
              </span>
              <span className="text-[9px] text-slate-500 shrink-0">
                {formatFileSize(item.meta.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAt(idx)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                title="เอาไฟล์ออก"
                aria-label="เอาไฟล์ออก"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      {images.length > 0 && (
        <p className="text-[9px] text-slate-500 mt-1.5 px-0.5">
          รูป {images.length} รูป
          {files.length > 0 ? ` · ไฟล์ ${files.length} รายการ` : ""}
        </p>
      )}
    </div>
  );
};

/** @deprecated use ChatComposerAttachmentPreview */
export const ChatAttachmentPreviewStrip = ChatComposerAttachmentPreview;

export const ChatAttachmentInput = forwardRef<
  ChatAttachmentInputHandle,
  ChatAttachmentInputProps
>(function ChatAttachmentInput({ onAppend, onError, disabled }, ref) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (!disabled) {
        fileInputRef.current?.click();
      }
    },
  }));

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;

    const selected = Array.from(list) as File[];
    logAttachmentPickDev(selected);

    const built: PendingChatFile[] = [];
    for (const file of selected) {
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

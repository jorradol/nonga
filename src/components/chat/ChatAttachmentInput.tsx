import React, { useImperativeHandle, useRef, forwardRef } from "react";
import { X, FileSpreadsheet, FileText } from "lucide-react";
import {
  CHAT_FILE_ACCEPT,
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

const THUMB_PX = "w-12 h-12";

/** Preview ในแถวล่าง composer — ฝั่งซ้าย (inline กับปุ่มแนบ/ส่ง) */
export function ChatComposerAttachmentPreview({
  pending,
  onRemoveAt,
}: {
  pending: PendingChatFile[];
  onRemoveAt: (index: number) => void;
}) {
  if (pending.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden max-w-full scrollbar-thin scrollbar-thumb-slate-700 py-0.5"
      id="chat-attachment-preview-row"
      data-testid="chat-attachment-preview"
    >
      {pending.map((item, idx) => {
        if (item.meta.kind === "image") {
          const src = item.previewUrl ?? item.meta.previewDataUrl;
          return (
            <div
              key={item.meta.id}
              className={`relative shrink-0 ${THUMB_PX} rounded-md border border-slate-600 bg-slate-800 overflow-hidden`}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.meta.name}
                  className="w-full h-full object-cover block"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-500">
                  รูป
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemoveAt(idx)}
                className="absolute top-0 right-0 p-0.5 rounded-bl-md bg-black/75 text-white hover:bg-black cursor-pointer"
                title="เอารูปออก"
                aria-label="เอารูปออก"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        }

        return (
          <div
            key={item.meta.id}
            className="relative flex items-center gap-1 shrink-0 max-w-[160px] rounded-full border border-slate-600 bg-slate-800/90 pl-2 pr-6 py-0.5"
          >
            {item.meta.kind === "spreadsheet" ? (
              <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <FileText className="w-3 h-3 text-rose-400 shrink-0" />
            )}
            <span className="text-[9px] text-slate-200 truncate">
              {item.meta.name}
            </span>
            <button
              type="button"
              onClick={() => onRemoveAt(idx)}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
              title="เอาไฟล์ออก"
              aria-label="เอาไฟล์ออก"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

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

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
  /** blob: หรือ data URL สำหรับ preview ก่อนส่ง */
  previewUrl?: string;
}

export interface ChatAttachmentInputHandle {
  openPicker: () => void;
  openCamera: () => void;
}

interface ChatAttachmentInputProps {
  pending: PendingChatFile[];
  onAppend: (items: PendingChatFile[]) => void;
  onRemoveAt: (index: number) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export async function buildPendingChatFile(file: File): Promise<PendingChatFile> {
  const kind = validateChatAttachmentFile(file);
  let previewUrl: string | undefined;
  let previewDataUrl: string | undefined;

  if (kind === "image") {
    previewUrl = URL.createObjectURL(file);
    previewDataUrl = await createChatImageThumbnail(file);
  }

  const meta = buildAttachmentMeta(
    file,
    kind,
    previewDataUrl ?? previewUrl
  );

  return {
    file,
    meta,
    previewUrl: previewUrl ?? previewDataUrl,
  };
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
      className="px-3 pt-3 pb-2 border-b border-slate-800/80 space-y-2"
      id="chat-attachment-preview-row"
      data-testid="chat-attachment-preview"
    >
      {imageCount > 0 && (
        <p className="text-[10px] font-semibold text-slate-400 px-0.5">
          รูปที่เลือก {imageCount} รูป
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
        {pending.map((item, idx) => (
          <div
            key={item.meta.id}
            className="relative shrink-0 w-[72px] rounded-xl border border-slate-700 bg-slate-950/90 overflow-hidden"
          >
            {item.meta.kind === "image" ? (
              <img
                src={item.previewUrl ?? item.meta.previewDataUrl}
                alt={item.meta.name}
                className="w-[72px] h-[72px] object-cover"
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
              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              title="เอาไฟล์ออก"
              aria-label="เอาไฟล์ออก"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/55 px-1 py-0.5">
              <p className="text-[8px] text-slate-200 truncate">{item.meta.name}</p>
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
  { pending, onAppend, onRemoveAt, onError, disabled },
  ref
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (!disabled && pending.length < CHAT_MAX_FILES) {
        fileInputRef.current?.click();
      }
    },
    openCamera: () => {
      if (!disabled && pending.length < CHAT_MAX_FILES) {
        cameraInputRef.current?.click();
      }
    },
  }));

  const ingestFiles = async (selected: File[]) => {
    const slotsLeft = CHAT_MAX_FILES - pending.length;
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
        built.push(await buildPendingChatFile(file));
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

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    await ingestFiles(Array.from(list) as File[]);
  };

  return (
    <>
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        id="chat-camera-file-input"
        onChange={handlePick}
        disabled={disabled}
      />
      <ChatAttachmentPreviewStrip pending={pending} onRemoveAt={onRemoveAt} />
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

import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import type { ChatMessageAttachment } from "../../types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentsSummary(attachments: ChatMessageAttachment[]): string {
  const images = attachments.filter((a) => a.kind === "image");
  const lines: string[] = [];
  if (images.length > 0) {
    lines.push(`รูปรถ ${images.length} รูป`);
  }
  for (const a of attachments) {
    if (a.kind !== "image") {
      lines.push(`ไฟล์ ${a.name}`);
    }
  }
  return lines.join("\n");
}

interface ChatMessageAttachmentsProps {
  attachments: ChatMessageAttachment[];
  isUser?: boolean;
}

/** แสดงไฟล์แนบในประวัติแชทเก่า (ฟีเจอร์แนบใน composer ปิดชั่วคราวก่อน beta) */
export function ChatMessageAttachments({
  attachments,
  isUser,
}: ChatMessageAttachmentsProps) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) => a.kind === "image");
  const others = attachments.filter((a) => a.kind !== "image");
  const summary = formatAttachmentsSummary(attachments);

  return (
    <div
      className={`mt-2 space-y-2 ${isUser ? "text-slate-100" : "text-slate-300"}`}
      data-testid="chat-message-attachments"
    >
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {images.map((img) => (
            <div
              key={img.id}
              className={`rounded-lg overflow-hidden border shrink-0 ${
                isUser ? "border-white/30" : "border-slate-700"
              }`}
            >
              {img.previewDataUrl ? (
                <img
                  src={img.previewDataUrl}
                  alt={img.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover block"
                  draggable={false}
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800/80 flex items-center justify-center text-[9px] px-1 text-center">
                  {img.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {others.map((file) => (
        <div
          key={file.id}
          className={`flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 ${
            isUser ? "bg-white/10" : "bg-slate-950/50 border border-slate-800"
          }`}
        >
          {file.kind === "spreadsheet" ? (
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <FileText className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span className="truncate font-medium">{file.name}</span>
          <span className="text-[9px] opacity-70 shrink-0">
            {formatFileSize(file.size)}
          </span>
        </div>
      ))}
      {summary && (
        <p className={`text-[10px] whitespace-pre-wrap ${isUser ? "opacity-90" : "text-slate-500"}`}>
          {summary}
        </p>
      )}
    </div>
  );
}

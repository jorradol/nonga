import {
  CHAT_IMAGE_ATTACHMENT_MAX_SIDE,
  CHAT_IMAGE_ATTACHMENT_MAX_SOURCE_BYTES,
  CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED,
  CHAT_IMAGE_ATTACHMENT_QUALITY,
  CHAT_IMAGE_ATTACHMENT_TOO_LARGE,
  CHAT_IMAGE_ATTACHMENT_UNSUPPORTED,
  type PendingChatImageAttachment,
} from "./types";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const BLOCKED_EXT = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".js",
  ".sh",
  ".msi",
  ".dll",
  ".scr",
  ".ps1",
  ".vbs",
  ".com",
]);
const HEIC_MIME = /image\/(heic|heif)/i;

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fileExt(name: string): string {
  const lower = name.toLowerCase().trim();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

function safeBaseName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "chat-image";
  return base
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "chat-image";
}

function validateImageFile(file: File): void {
  const ext = fileExt(file.name);
  const mime = file.type.toLowerCase().split(";")[0].trim();

  if (!file.size || BLOCKED_EXT.has(ext) || HEIC_MIME.test(mime)) {
    throw new Error(CHAT_IMAGE_ATTACHMENT_UNSUPPORTED);
  }
  if (file.size > CHAT_IMAGE_ATTACHMENT_MAX_SOURCE_BYTES) {
    throw new Error(CHAT_IMAGE_ATTACHMENT_TOO_LARGE);
  }
  if (!IMAGE_EXT.has(ext) || !IMAGE_MIME.has(mime)) {
    throw new Error(CHAT_IMAGE_ATTACHMENT_UNSUPPORTED);
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg"
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, CHAT_IMAGE_ATTACHMENT_QUALITY);
  });
}

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<{
  blob: Blob;
  mimeType: "image/webp" | "image/jpeg";
}> {
  const webp = await canvasToBlob(canvas, "image/webp");
  if (webp && webp.size > 0) {
    return { blob: webp, mimeType: "image/webp" };
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg");
  if (jpeg && jpeg.size > 0) {
    return { blob: jpeg, mimeType: "image/jpeg" };
  }

  throw new Error(CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED);
}

export async function optimizeChatImageAttachment(
  sourceFile: File
): Promise<PendingChatImageAttachment> {
  validateImageFile(sourceFile);

  try {
    const image = await loadImageFromFile(sourceFile);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) {
      throw new Error(CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED);
    }

    const scale = Math.min(
      1,
      CHAT_IMAGE_ATTACHMENT_MAX_SIDE / Math.max(sourceWidth, sourceHeight)
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error(CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED);

    ctx.drawImage(image, 0, 0, width, height);

    const encoded = await encodeCanvas(canvas);
    const ext = encoded.mimeType === "image/webp" ? "webp" : "jpg";
    const id = makeId("chat-img");
    const fileName = `${safeBaseName(sourceFile.name)}-${id.slice(0, 8)}.${ext}`;
    const optimizedFile = new File([encoded.blob], fileName, {
      type: encoded.mimeType,
      lastModified: Date.now(),
    });

    return {
      id,
      kind: "image",
      originalFileName: sourceFile.name,
      fileName,
      optimizedFile,
      previewUrl: URL.createObjectURL(optimizedFile),
      mimeType: optimizedFile.type,
      size: optimizedFile.size,
      width,
      height,
    };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED);
  }
}

export async function optimizeChatImageAttachments(
  files: File[],
  onError: (message: string) => void
): Promise<PendingChatImageAttachment[]> {
  const output: PendingChatImageAttachment[] = [];
  for (const file of files) {
    try {
      output.push(await optimizeChatImageAttachment(file));
    } catch (err) {
      onError(
        err instanceof Error ? err.message : CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED
      );
    }
  }
  return output;
}

export function revokePendingChatImagePreviews(
  attachments: PendingChatImageAttachment[]
): void {
  for (const attachment of attachments) {
    try {
      URL.revokeObjectURL(attachment.previewUrl);
    } catch {
      /* ignore */
    }
  }
}

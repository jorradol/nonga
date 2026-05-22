/**
 * Premium Image Compression and Safe Upload Service for Nong A
 * Supports client-side canvas-based image resizing and asynchronous upload progress callbacks.
 */

export interface CompressorOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
}

/**
 * Compress image using HTML Canvas client-side
 */
export async function compressImage(file: File, options: CompressorOptions = {}): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    // Only compress image files
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Perform scaling while keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // canvas failure fallback
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

/**
 * Simulated premium upload engine with customizable progress reporting
 */
const PREVIEW_PLACEHOLDER =
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";

async function fileToPreviewDataUrl(file: File): Promise<string> {
  let processed = file;
  try {
    processed = await compressImage(file, {
      maxWidth: 640,
      maxHeight: 640,
      quality: 0.58,
    });
  } catch {
    /* use original */
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(processed);
  });
}

/**
 * อัปโหลด mock — คืน data URL ขนาดเล็กสำหรับ preview ใน session
 * ไม่เก็บ base64 ใหญ่ลง localStorage (listing จะใช้ URL ภายนอกตอน publish)
 */
export async function uploadCarImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  let currentProgress = 0;
  const tick = () => {
    const step = Math.floor(Math.random() * 15) + 8;
    currentProgress = Math.min(95, currentProgress + step);
    onProgress?.(currentProgress);
  };

  const progressTimer = setInterval(tick, 120);

  try {
    let dataUrl = await fileToPreviewDataUrl(file);

    if (dataUrl.length > 72_000) {
      try {
        const smaller = await compressImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.45,
        });
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(smaller);
        });
      } catch {
        /* fall through */
      }
    }

    if (dataUrl.length > 72_000) {
      onProgress?.(100);
      return PREVIEW_PLACEHOLDER;
    }

    onProgress?.(100);
    return dataUrl;
  } finally {
    clearInterval(progressTimer);
  }
}

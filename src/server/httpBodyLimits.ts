import express, { type Express, type Request, type Response, type NextFunction } from "express";

export const DEFAULT_JSON_LIMIT = "512kb";
export const LISTING_IMAGE_JSON_LIMIT = "4mb";

export function isListingImageUploadPath(path: string): boolean {
  return /^\/api\/cars\/[^/]+\/images$/i.test(path);
}

/** JSON parser — route อัปโหลดรูปใช้ limit สูงกว่า API ทั่วไป */
export function registerJsonBodyParsers(app: Express): void {
  const jsonDefault = express.json({ limit: DEFAULT_JSON_LIMIT });
  const jsonImages = express.json({ limit: LISTING_IMAGE_JSON_LIMIT });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === "POST" && isListingImageUploadPath(req.path)) {
      return jsonImages(req, res, next);
    }
    return jsonDefault(req, res, next);
  });
}

/** 413 จาก body-parser → JSON เสมอ (ห้าม HTML) */
export function registerPayloadTooLargeHandler(app: Express): void {
  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (res.headersSent) return next(err);
      const e = err as { status?: number; type?: string };
      if (e?.status === 413 || e?.type === "entity.too.large") {
        return res.status(413).json({
          ok: false,
          success: false,
          error: "PAYLOAD_TOO_LARGE",
          message:
            "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลดจำนวนรูปหรือขนาดรูป แล้วลองใหม่อีกครั้ง",
        });
      }
      next(err);
    }
  );
}

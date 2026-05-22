/**
 * แปลง technical error → ข้อความภาษาคน (สไตล์น้องเอ)
 */

export type FriendlyErrorCode =
  | "not_json"
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server"
  | "unknown";

export class AppFriendlyError extends Error {
  readonly code: FriendlyErrorCode;
  readonly friendlyTitle: string;
  readonly friendlyMessage: string;
  readonly technicalDetail: string;
  readonly status?: number;
  readonly url?: string;
  readonly contentType?: string;

  constructor(opts: {
    code: FriendlyErrorCode;
    friendlyTitle: string;
    friendlyMessage: string;
    technicalDetail: string;
    status?: number;
    url?: string;
    contentType?: string;
  }) {
    super(opts.friendlyMessage);
    this.name = "AppFriendlyError";
    this.code = opts.code;
    this.friendlyTitle = opts.friendlyTitle;
    this.friendlyMessage = opts.friendlyMessage;
    this.technicalDetail = opts.technicalDetail;
    this.status = opts.status;
    this.url = opts.url;
    this.contentType = opts.contentType;
  }
}

function isHtmlLike(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

function isJsonParseMessage(msg: string): boolean {
  return (
    /unexpected token\s*['"]?</i.test(msg) ||
    /is not valid json/i.test(msg) ||
    /json\.parse/i.test(msg)
  );
}

export function mapHttpStatusToFriendly(
  status: number,
  url: string,
  serverMessage?: string
): AppFriendlyError {
  if (status === 401) {
    return new AppFriendlyError({
      code: "unauthorized",
      friendlyTitle: "น้องเอขออภัยค่ะ ยังไม่ได้รับอนุญาต",
      friendlyMessage:
        "ระบบไม่ยืนยันตัวตนสำหรับการจัดการประกาศนี้ค่ะ ลองล็อกอินใหม่หรือรีเฟรชหน้าเว็บนะคะ",
      technicalDetail: `HTTP ${status} ${url}${serverMessage ? ` — ${serverMessage}` : ""}`,
      status,
      url,
    });
  }
  if (status === 403) {
    return new AppFriendlyError({
      code: "forbidden",
      friendlyTitle: "น้องเอขออภัยค่ะ ไม่มีสิทธิ์แก้ประกาศนี้",
      friendlyMessage:
        "ประกาศนี้อาจเป็นของบัญชีอื่น หรือคุณไม่มีสิทธิ์จัดการค่ะ",
      technicalDetail: `HTTP ${status} ${url}${serverMessage ? ` — ${serverMessage}` : ""}`,
      status,
      url,
    });
  }
  if (status === 404) {
    return new AppFriendlyError({
      code: "not_found",
      friendlyTitle: "น้องเอหา API ไม่เจอค่ะ",
      friendlyMessage:
        "อุ๊ย น้องเอโหลดข้อมูลประกาศไม่สำเร็จค่ะ\nระบบอาจยังไม่พร้อม หรือเซิร์ฟเวอร์ยังไม่ได้เริ่มใหม่\nลองรีเฟรชหน้าเว็บ หรือเปิดระบบใหม่อีกครั้งนะคะ",
      technicalDetail: `HTTP 404 ${url} — อาจยังไม่ restart npm run dev หลังอัปเดตโค้ด`,
      status,
      url,
    });
  }
  if (status === 413) {
    return new AppFriendlyError({
      code: "unknown",
      friendlyTitle: "น้องเอขออภัยค่ะ รูปใหญ่เกินไป",
      friendlyMessage:
        serverMessage?.trim() ||
        "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลดจำนวนรูปหรือขนาดรูป แล้วลองใหม่อีกครั้ง",
      technicalDetail: `HTTP 413 ${url}${serverMessage ? ` — ${serverMessage}` : ""}`,
      status,
      url,
    });
  }
  if (status >= 500) {
    return new AppFriendlyError({
      code: "server",
      friendlyTitle: "น้องเอขออภัยค่ะ เซิร์ฟเวอร์มีปัญหา",
      friendlyMessage:
        "ระบบฝั่งเซิร์ฟเวอร์ตอบกลับไม่สำเร็จค่ะ ลองกดรีเฟรชอีกครั้ง หรือรอสักครู่แล้วลองใหม่นะคะ",
      technicalDetail: `HTTP ${status} ${url}${serverMessage ? ` — ${serverMessage}` : ""}`,
      status,
      url,
    });
  }
  return new AppFriendlyError({
    code: "unknown",
    friendlyTitle: "น้องเอขออภัยค่ะ โหลดข้อมูลไม่สำเร็จ",
    friendlyMessage:
      serverMessage?.trim() ||
      "มีบางอย่างผิดพลาดค่ะ ลองกดรีเฟรชอีกครั้งนะคะ",
    technicalDetail: `HTTP ${status} ${url}`,
    status,
    url,
  });
}

export function notJsonResponseError(
  url: string,
  status: number,
  contentType: string | null,
  bodyPreview: string
): AppFriendlyError {
  const html = isHtmlLike(bodyPreview);
  if (status === 413) {
    return new AppFriendlyError({
      code: "not_json",
      friendlyTitle: "น้องเอขออภัยค่ะ รูปใหญ่เกินไป",
      friendlyMessage:
        "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลดจำนวนรูปหรือขนาดรูป แล้วลองใหม่อีกครั้ง",
      technicalDetail: `HTTP 413 non-JSON ${url} (${contentType ?? "unknown"})`,
      status,
      url,
      contentType: contentType ?? undefined,
    });
  }
  return new AppFriendlyError({
    code: "not_json",
    friendlyTitle: "น้องเอขออภัยค่ะ โหลดข้อมูลไม่สำเร็จ",
    friendlyMessage: html
      ? "อุ๊ย น้องเอโหลดข้อมูลประกาศไม่สำเร็จค่ะ\nระบบอาจยังไม่พร้อม หรือเซิร์ฟเวอร์ยังไม่ได้เริ่มใหม่\nลองรีเฟรชหน้าเว็บ หรือเปิดระบบใหม่อีกครั้งนะคะ"
      : "ระบบได้รับข้อมูลที่อ่านไม่ได้ค่ะ ลองรีเฟรชหน้าเว็บอีกครั้งนะคะ",
    technicalDetail: `รายละเอียดทางเทคนิค: API ส่งข้อมูลกลับมาไม่ใช่ JSON (status ${status}, type ${contentType ?? "unknown"}, url ${url})`,
    status,
    url,
    contentType: contentType ?? undefined,
  });
}

export function networkFriendlyError(url: string, cause?: string): AppFriendlyError {
  return new AppFriendlyError({
    code: "network",
    friendlyTitle: "น้องเอขออภัยค่ะ เชื่อมต่อไม่ได้",
    friendlyMessage:
      "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ค่ะ ตรวจว่า npm run dev เปิดอยู่ แล้วลองรีเฟรชนะคะ",
    technicalDetail: `Network error ${url}${cause ? ` — ${cause}` : ""}`,
    url,
  });
}

export function toFriendlyError(err: unknown, context = "ดำเนินการ"): AppFriendlyError {
  if (err instanceof AppFriendlyError) return err;

  const msg = err instanceof Error ? err.message : String(err);

  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return networkFriendlyError(context);
  }

  if (isJsonParseMessage(msg)) {
    return new AppFriendlyError({
      code: "not_json",
      friendlyTitle: "น้องเอขออภัยค่ะ โหลดข้อมูลไม่สำเร็จ",
      friendlyMessage:
        "อุ๊ย น้องเอโหลดข้อมูลประกาศไม่สำเร็จค่ะ\nระบบอาจยังไม่พร้อม หรือเซิร์ฟเวอร์ยังไม่ได้เริ่มใหม่\nลองรีเฟรชหน้าเว็บ หรือเปิดระบบใหม่อีกครั้งนะคะ",
      technicalDetail: `รายละเอียดทางเทคนิค: API ส่งข้อมูลกลับมาไม่ใช่ JSON (${context})`,
      url: context,
    });
  }

  if (isHtmlLike(msg)) {
    return notJsonResponseError(context, 0, "text/html", msg.slice(0, 80));
  }

  return new AppFriendlyError({
    code: "unknown",
    friendlyTitle: "น้องเอขออภัยค่ะ โหลดข้อมูลไม่สำเร็จ",
    friendlyMessage: "มีบางอย่างผิดพลาดค่ะ ลองกดรีเฟรชอีกครั้งนะคะ",
    technicalDetail: msg.slice(0, 200),
  });
}

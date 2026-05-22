import { create } from "zustand";
import {
  AppFriendlyError,
  toFriendlyError,
  type FriendlyErrorCode,
} from "../utils/appFriendlyError";

export type NotifyKind = "success" | "warning" | "error" | "info";

export interface NotifyToast {
  id: string;
  kind: NotifyKind;
  title: string;
  message: string;
  durationMs: number;
}

export interface NotifyModalState {
  open: boolean;
  kind: NotifyKind;
  title: string;
  message: string;
  technicalDetail?: string;
}

interface NotifyState {
  toasts: NotifyToast[];
  modal: NotifyModalState;
  pushToast: (opts: {
    kind: NotifyKind;
    title: string;
    message: string;
    durationMs?: number;
  }) => void;
  showModal: (opts: {
    kind?: NotifyKind;
    title: string;
    message: string;
    technicalDetail?: string;
  }) => void;
  closeModal: () => void;
  dismissToast: (id: string) => void;
  notifySuccess: (title: string, message?: string) => void;
  notifyWarning: (title: string, message?: string) => void;
  notifyInfo: (title: string, message?: string) => void;
  notifyFriendlyError: (err: unknown, context?: string) => AppFriendlyError;
}

let toastSeq = 0;

export const useNotifyStore = create<NotifyState>((set, get) => ({
  toasts: [],
  modal: { open: false, kind: "error", title: "", message: "" },

  pushToast: ({ kind, title, message, durationMs = 4500 }) => {
    const id = `toast-${++toastSeq}`;
    set((s) => ({
      toasts: [...s.toasts, { id, kind, title, message, durationMs }],
    }));
    window.setTimeout(() => get().dismissToast(id), durationMs);
  },

  showModal: ({
    kind = "error",
    title,
    message,
    technicalDetail,
  }) => {
    set({
      modal: { open: true, kind, title, message, technicalDetail },
    });
  },

  closeModal: () =>
    set((s) => ({ modal: { ...s.modal, open: false } })),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  notifySuccess: (title, message = "") => {
    get().pushToast({ kind: "success", title, message: message || title });
  },

  notifyWarning: (title, message = "") => {
    get().pushToast({ kind: "warning", title, message: message || title });
  },

  notifyInfo: (title, message = "") => {
    get().pushToast({ kind: "info", title, message: message || title });
  },

  notifyFriendlyError: (err, context) => {
    const friendly = toFriendlyError(err, context);
    console.error(`[notify:${friendly.code}]`, friendly.technicalDetail, err);

    get().pushToast({
      kind: "error",
      title: friendly.friendlyTitle,
      message: friendly.friendlyMessage.split("\n")[0],
      durationMs: 6000,
    });

    get().showModal({
      kind: "error",
      title: friendly.friendlyTitle,
      message: friendly.friendlyMessage,
      technicalDetail: friendly.technicalDetail,
    });

    return friendly;
  },
}));

export function friendlyCodeLabel(code: FriendlyErrorCode): string {
  const map: Record<FriendlyErrorCode, string> = {
    not_json: "ข้อมูลไม่ใช่ JSON",
    network: "เชื่อมต่อไม่ได้",
    unauthorized: "ไม่ได้รับอนุญาต",
    forbidden: "ไม่มีสิทธิ์",
    not_found: "ไม่พบ API",
    server: "เซิร์ฟเวอร์ผิดพลาด",
    unknown: "ไม่ทราบสาเหตุ",
  };
  return map[code] ?? code;
}

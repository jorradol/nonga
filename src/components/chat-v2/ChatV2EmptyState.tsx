/**
 * Chat Experience V2 — conversation welcome state.
 * Pure UI welcome (clearly NOT an assistant message: no bubble, no persistence,
 * never sent to the backend). Suggestion chips prefill the composer and go
 * through the existing submission path when the user sends.
 */
import { Car, MessageCircleHeart, Scale, ShieldCheck, Sparkles } from "lucide-react";

export interface ChatV2Suggestion {
  label: string;
  query: string;
  icon: "budget" | "family" | "compare" | "inspect";
}

export const CHAT_V2_SUGGESTIONS: ChatV2Suggestion[] = [
  {
    label: "หารถตามงบ",
    query: "ช่วยหารถในตลาดตามงบประมาณให้หน่อยครับ งบไม่เกิน ",
    icon: "budget",
  },
  {
    label: "ช่วยเลือกรถครอบครัว",
    query: "ช่วยแนะนำรถสำหรับครอบครัว นั่งสบาย ปลอดภัย ให้หน่อยครับ",
    icon: "family",
  },
  {
    label: "เปรียบเทียบรถที่สนใจ",
    query: "ช่วยเปรียบเทียบรถ 2 คันแรกให้หน่อยครับ",
    icon: "compare",
  },
  {
    label: "แนะนำวิธีตรวจรถมือสอง",
    query: "แนะนำวิธีตรวจสภาพรถมือสองก่อนตัดสินใจซื้อหน่อยครับ",
    icon: "inspect",
  },
];

const ICONS = {
  budget: Car,
  family: MessageCircleHeart,
  compare: Scale,
  inspect: ShieldCheck,
} as const;

interface ChatV2EmptyStateProps {
  onPickSuggestion: (query: string) => void;
}

export function ChatV2EmptyState({ onPickSuggestion }: ChatV2EmptyStateProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 max-w-xl mx-auto w-full"
      data-testid="chat-v2-welcome"
    >
      <div
        className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 mb-5"
        aria-hidden="true"
      >
        <Sparkles className="w-7 h-7" />
      </div>

      <h1 className="text-xl md:text-2xl font-extrabold nonga-text-primary leading-snug">
        สวัสดีครับ ผม<span className="text-orange-600 dark:text-orange-400">น้องเอ</span>
      </h1>
      <p className="text-sm nonga-text-secondary mt-2 leading-relaxed max-w-md">
        ผู้ช่วยเรื่องการเลือก ซื้อ และขายรถ
        บอกงบประมาณหรือรูปแบบการใช้งานที่คุณต้องการได้เลยครับ
      </p>

      <div
        className="flex flex-wrap items-center justify-center gap-2 mt-6"
        data-testid="chat-v2-suggestions"
        aria-label="หัวข้อเริ่มต้นที่แนะนำ"
      >
        {CHAT_V2_SUGGESTIONS.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onPickSuggestion(item.query)}
              className="inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 rounded-full border border-(--nonga-border) bg-(--nonga-bg-surface) text-xs font-semibold nonga-text-secondary hover:border-orange-500/40 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-500/5 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
              data-testid="chat-v2-suggestion-chip"
            >
              <Icon className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] nonga-text-muted mt-6 leading-relaxed max-w-md">
        รถที่น้องเอค้นพบจากตลาดจริงจะแสดงใน<span className="font-semibold">พื้นที่เลือกรถ</span>ด้านข้าง
        พร้อมลิงก์ไปหน้ารายละเอียดของประกาศจริง
      </p>
    </div>
  );
}

import { Store, User } from "lucide-react";
import { useChatContext } from "../../contexts/chat/ChatContext";

/** แสดงว่ากำลังคุยในนาม dealer / ผู้ใช้ทั่วไป */
export function ChatActorStatus() {
  const { chatScope, chatActor } = useChatContext();
  const isDealer = chatScope.mode === "dealer";

  return (
    <div
      className="mx-4 mb-2 p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 text-left"
      id="chat-actor-status"
    >
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        กำลังคุยในนาม
      </p>
      <div className="flex items-start gap-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isDealer
              ? "bg-orange-500/15 text-orange-400"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {isDealer ? (
            <Store className="w-3.5 h-3.5" />
          ) : (
            <User className="w-3.5 h-3.5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-100 truncate">
            {chatActor.title}
          </p>
          {chatActor.subtitle && !isDealer && (
            <p className="text-[10px] text-slate-500 truncate">{chatActor.subtitle}</p>
          )}
          {isDealer && (
            <p className="text-[10px] text-orange-400/90">เต็นท์รถ — บันทึกประกาศได้จากแชท</p>
          )}
        </div>
      </div>
    </div>
  );
}

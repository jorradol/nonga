import React from "react";
import { Car, MessageCircle, ExternalLink, ImageOff } from "lucide-react";
import type { ChatCarCardData } from "../../types";
import { useAppStore } from "../../store";
import { useChatContext } from "../../contexts/chat/ChatContext";

interface ChatCarCardProps {
  car: ChatCarCardData;
  onAskAbout?: (car: ChatCarCardData) => void;
}

export function ChatCarCard({ car, onAskAbout }: ChatCarCardProps) {
  const { setView } = useAppStore();
  const chat = useChatContext();

  const priceLabel =
    car.price > 0 ? `฿${car.price.toLocaleString("th-TH")}` : "ติดต่อสอบถาม";
  const mileageLabel =
    car.mileage > 0 ? `${car.mileage.toLocaleString("th-TH")} กม.` : "—";

  const handleDetail = () => {
    setView("car-details", car.id);
  };

  const handleAsk = () => {
    if (onAskAbout) {
      onAskAbout(car);
      return;
    }
    if (chat.isGenerating) return;
    void chat.sendMessage(
      `ช่วยสรุป ${car.brand} ${car.model} ปี ${car.year} จากข้อมูลจริงในระบบให้หน่อยครับ [SELECTED_CAR_ID:${car.id}]`
    );
  };

  return (
    <article
      className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg"
      data-car-id={car.id}
      data-testid="chat-car-card"
    >
      <div className="relative aspect-[16/10] bg-slate-900">
        {car.hasImage && car.imageUrl ? (
          <img
            src={car.imageUrl}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <ImageOff className="w-8 h-8 opacity-60" />
            <span className="text-[10px]">ยังไม่มีรูปในระบบ</span>
          </div>
        )}
        {car.matchKind === "alternative" && (
          <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            ทางเลือกใกล้เคียง
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Car className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-100 leading-snug">
              {car.brand} {car.model}{" "}
              <span className="text-slate-400 font-medium">ปี {car.year}</span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">{car.bodyClassLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-slate-500">ราคา</span>
            <p className="text-orange-400 font-bold">{priceLabel}</p>
          </div>
          <div>
            <span className="text-slate-500">ไมล์</span>
            <p className="text-slate-200">{mileageLabel}</p>
          </div>
          {car.color && (
            <div className="col-span-2">
              <span className="text-slate-500">สี </span>
              <span className="text-slate-200">{car.color}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleDetail}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            ดูรายละเอียด
          </button>
          <button
            type="button"
            onClick={handleAsk}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <MessageCircle className="w-3 h-3" />
            ถามน้องเอ
          </button>
        </div>
      </div>
    </article>
  );
}

import type { ChatCarSummary } from "./marketplaceChatSearch";
import {
  BODY_CLASS_LABEL_TH,
  inferVehicleBodyClass,
} from "./vehicleBodyClassifier";

/** ข้อมูลที่อนุญาตให้พูด — มาจาก field จริงเท่านั้น */
export interface ChatCarFacts {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color?: string;
  fuelType?: string;
  condition?: string;
  showroomName?: string;
  bodyClassLabel: string;
  detailPath: string;
}

export function buildChatCarFacts(car: ChatCarSummary & { condition?: string }): ChatCarFacts {
  const bodyClass = inferVehicleBodyClass(car);
  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    color: car.color?.trim() || undefined,
    fuelType: car.fuelType?.trim() || undefined,
    condition: car.condition?.trim() || undefined,
    showroomName: car.showroomName?.trim() || undefined,
    bodyClassLabel: BODY_CLASS_LABEL_TH[bodyClass],
    detailPath: `/cars/${car.id}`,
  };
}

export const CHAT_FACTS_ONLY_PROMPT = `
[กฎข้อมูลรถ — Phase 2 ห้ามพูดเกิน]
อนุญาตพูดเฉพาะข้อมูลที่มีใน JSON: brand, model, year, price, mileage, color, fuelType, condition, showroomName, bodyClassLabel
ห้ามพูดถึง: การันตีสภาพโดยแอดมิน, ยางดอกเต็ม, สีเดิมโรงงาน, สภาพป้ายแดง, ของแถม, ส่งรถถึงบ้านฟรี, ประวัติศูนย์, ไมล์แท้ 100% — ถ้าไม่มีใน field
ห้ามฮาร์ดเซลล์ ห้ามโอเวอร์เกินจริง น้ำเสียงเป็นมิตรแต่ตรงไปตรงมา
ถ้าไม่มีข้อมูล ให้บอกว่าไม่มีข้อมูลในระบบ
`;

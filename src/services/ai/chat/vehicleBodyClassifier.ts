import type { ChatInventoryCar } from "./marketplaceChatSearch";

export type VehicleBodyClass =
  | "suv"
  | "mpv"
  | "sedan"
  | "hatchback"
  | "pickup"
  | "van"
  | "coupe"
  | "unknown";

const SUV_HINT =
  /\b(suv|crossover|อเนกประสงค์|รถใหญ่|fortuner|cr-v|crv|cx-5|cx5|hr-v|hrv|x-trail|tucson|sportage|mu-x|mux|everest|ranger|pajero|yaris cross|atto 3|model y|haval|jolion|tiguan|x1|x3|x5)\b/i;

const MPV_HINT =
  /\b(mpv|อีติกา|ertiga|xl7|avanza|veloz|innova|freed|mobilio|xpander|stargazer|carens|carnival|esquire|alphard|vellfire|livina|grand livina)\b/i;

const SEDAN_HINT =
  /\b(sedan|ซีดาน|city\b|civic|altis|corolla|camry|accord|mazda 2|mazda2|yaris\b(?! cross)|vios|almera|sunny|sylphy|teana|lancer|attrage|mirage|brio|jazz\b|swift\b|ciaz)\b/i;

const PICKUP_HINT =
  /\b(pickup|pick-up|กระบะ|d-max|dmax|hilux|navara|triton|ranger|colorado)\b/i;

const HATCH_HINT =
  /\b(hatchback|hatch|yaris(?! cross)|mazda 2|mazda2|swift|brio|jazz|polo|golf)\b/i;

export const BODY_CLASS_LABEL_TH: Record<VehicleBodyClass, string> = {
  suv: "SUV / Crossover",
  mpv: "MPV / รถ 7 ที่นั่ง",
  sedan: "Sedan",
  hatchback: "Hatchback",
  pickup: "Pickup",
  van: "Van",
  coupe: "Coupe",
  unknown: "ไม่ระบุประเภทตัวถัง",
};

export function inferVehicleBodyClass(car: ChatInventoryCar): VehicleBodyClass {
  const blob = [
    car.bodyType,
    car.title,
    car.brand,
    car.model,
    car.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (PICKUP_HINT.test(blob)) return "pickup";
  if (SUV_HINT.test(blob)) return "suv";
  if (MPV_HINT.test(blob)) return "mpv";
  if (SEDAN_HINT.test(blob)) return "sedan";
  if (HATCH_HINT.test(blob)) return "hatchback";
  if (/\b(van|แวน)\b/i.test(blob)) return "van";
  if (/\bcoupe\b/i.test(blob)) return "coupe";

  const rawBody = String(car.bodyType ?? "").toLowerCase();
  if (rawBody.includes("suv") || rawBody.includes("อเนก")) return "suv";
  if (rawBody.includes("mpv")) return "mpv";
  if (rawBody.includes("sedan") || rawBody.includes("ซีดาน")) return "sedan";
  if (rawBody.includes("pickup") || rawBody.includes("กระบะ")) return "pickup";

  return "unknown";
}

/** ตรงกับคำขอ SUV แท้ / Crossover */
export function isSuvFamily(car: ChatInventoryCar): boolean {
  return inferVehicleBodyClass(car) === "suv";
}

/** ทางเลือกใกล้เคียงเมื่อไม่มี SUV ในงบ */
export function isMpvFamily(car: ChatInventoryCar): boolean {
  return inferVehicleBodyClass(car) === "mpv";
}

export function isSedanFamily(car: ChatInventoryCar): boolean {
  const c = inferVehicleBodyClass(car);
  return c === "sedan" || c === "hatchback";
}

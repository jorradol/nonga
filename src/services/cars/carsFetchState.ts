import type { Car } from "../../types";
import { normalizePublicMarketplaceCar } from "../../utils/marketplaceCarMapper.ts";

export interface CarsFetchStateInput {
  cars: Car[];
}

export interface CarsFetchStateResult extends CarsFetchStateInput {
  carsLoadState: "success" | "error";
  carsLoadError: string | null;
}

export function applyCarsFetchPayload(
  previous: CarsFetchStateInput,
  payload: unknown
): CarsFetchStateResult {
  if (
    payload &&
    typeof payload === "object" &&
    (payload as { success?: unknown }).success === true &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    const normalized = ((payload as { data: Record<string, unknown>[] }).data).map(
      normalizePublicMarketplaceCar
    );
    return {
      cars: normalized,
      carsLoadState: "success",
      carsLoadError: null,
    };
  }
  return {
    cars: previous.cars,
    carsLoadState: "error",
    carsLoadError: "โหลดรายการรถไม่สำเร็จชั่วคราว (ข้อมูลตอบกลับไม่ถูกต้อง)",
  };
}

/**
 * v6.3B.2 — Map public-safe Car fields to buyer-friendly copy input (whitelist only).
 */
import type { Car } from "../types";
import type { BuyerFriendlyListingCopyInput } from "./buyerFriendlyListingCopy";

const ALLOWED_INPUT_KEYS: (keyof BuyerFriendlyListingCopyInput)[] = [
  "description",
  "brand",
  "model",
  "year",
  "price",
  "mileage",
  "color",
  "fuelType",
  "condition",
  "features",
  "tags",
  "transmission",
  "drivetrain",
  "bodyType",
  "province",
  "sellerType",
  "showroomName",
];

/** Explicit pick — never spread Car (excludes ownerPhone, ownerId, images, etc.). */
export function carToBuyerFriendlyListingInput(
  car: Car
): BuyerFriendlyListingCopyInput {
  return {
    description: car.description,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    color: car.color,
    fuelType: car.fuelType,
    condition: car.condition,
    features: car.features,
    tags: car.tags,
    transmission: car.transmission,
    drivetrain: car.drivetrain,
    bodyType: car.bodyType,
    province: car.province,
    sellerType: car.sellerType,
    showroomName: car.showroomName,
  };
}

export function listBuyerFriendlyListingInputKeys(
  input: BuyerFriendlyListingCopyInput
): string[] {
  return Object.keys(input);
}

export function isAllowedBuyerFriendlyInputKey(key: string): boolean {
  return (ALLOWED_INPUT_KEYS as string[]).includes(key);
}

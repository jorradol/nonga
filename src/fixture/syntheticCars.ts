import type { Car } from "../types";
import { assertUiFixtureOnly } from "./uiFixtureMode";

const PLACEHOLDER = "/fixture/placeholder-car.svg";
const DISCLAIMER =
  "ข้อมูลสมมติสำหรับตรวจสอบหน้าจอ — ไม่ใช่ประกาศขายจริง และไม่มีข้อมูลติดต่อจริง";

type Template = {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: Car["type"];
  fuelType: Car["fuelType"];
  mileage: number;
  bodyType: string;
  color: string;
};

const TEMPLATES: Template[] = [
  { id: "fx-car-001", brand: "Toyota", model: "Corolla", year: 2020, price: 520000, type: "used", fuelType: "petrol", mileage: 48000, bodyType: "sedan", color: "ขาว" },
  { id: "fx-car-002", brand: "Toyota", model: "Corolla", year: 2021, price: 580000, type: "used", fuelType: "petrol", mileage: 36000, bodyType: "sedan", color: "เงิน" },
  { id: "fx-car-003", brand: "Honda", model: "CR-V", year: 2019, price: 890000, type: "used", fuelType: "petrol", mileage: 72000, bodyType: "suv", color: "ดำ" },
  { id: "fx-car-004", brand: "Toyota", model: "Camry", year: 2019, price: 750000, type: "used", fuelType: "hybrid", mileage: 61000, bodyType: "sedan", color: "เทา" },
  { id: "fx-car-005", brand: "Mazda", model: "CX-30", year: 2022, price: 920000, type: "used", fuelType: "petrol", mileage: 22000, bodyType: "suv", color: "แดง" },
  { id: "fx-car-006", brand: "Honda", model: "City", year: 2018, price: 390000, type: "used", fuelType: "petrol", mileage: 88000, bodyType: "sedan", color: "ขาว" },
  { id: "fx-car-007", brand: "Toyota", model: "Fortuner", year: 2020, price: 1150000, type: "used", fuelType: "diesel", mileage: 55000, bodyType: "suv", color: "น้ำตาล" },
  { id: "fx-car-008", brand: "Nissan", model: "Almera", year: 2021, price: 420000, type: "used", fuelType: "petrol", mileage: 31000, bodyType: "sedan", color: "น้ำเงิน" },
  { id: "fx-car-009", brand: "MG", model: "ZS EV", year: 2022, price: 790000, type: "ev", fuelType: "electric", mileage: 18000, bodyType: "suv", color: "ขาว" },
  { id: "fx-car-010", brand: "BYD", model: "Atto 3", year: 2023, price: 890000, type: "ev", fuelType: "electric", mileage: 12000, bodyType: "suv", color: "เทา" },
  { id: "fx-car-011", brand: "Isuzu", model: "D-Max", year: 2019, price: 680000, type: "used", fuelType: "diesel", mileage: 95000, bodyType: "pickup", color: "เงิน" },
  { id: "fx-car-012", brand: "Mitsubishi", model: "Xpander", year: 2021, price: 650000, type: "used", fuelType: "petrol", mileage: 40000, bodyType: "mpv", color: "ขาว" },
  { id: "fx-car-013", brand: "Honda", model: "Jazz", year: 2017, price: 350000, type: "used", fuelType: "petrol", mileage: 102000, bodyType: "hatchback", color: "เหลือง" },
  { id: "fx-car-014", brand: "Toyota", model: "Yaris", year: 2020, price: 450000, type: "used", fuelType: "petrol", mileage: 45000, bodyType: "hatchback", color: "ส้ม" },
  { id: "fx-car-015", brand: "BMW", model: "320d", year: 2018, price: 980000, type: "luxury", fuelType: "diesel", mileage: 70000, bodyType: "sedan", color: "ดำ" },
];

export function buildSyntheticFixtureCars(): Car[] {
  assertUiFixtureOnly("buildSyntheticFixtureCars");
  return TEMPLATES.map((t) => ({
    id: t.id,
    title: `[TEST] ${t.brand} ${t.model} ${t.year} — ข้อมูลสมมติ`,
    brand: t.brand,
    model: t.model,
    year: t.year,
    price: t.price,
    type: t.type,
    condition: "used",
    mileage: t.mileage,
    fuelType: t.fuelType,
    images: [PLACEHOLDER],
    description: `${DISCLAIMER}\nรถสมมติ ${t.brand} ${t.model} ปี ${t.year} สำหรับตรวจ UI เท่านั้น`,
    ownerId: "fixture-dealer-001",
    ownerName: "Fixture Dealer",
    ownerPhone: "",
    sellerDisplayName: "STAGING FICTIONAL DEALER 001",
    dealerDisplayName: "STAGING FICTIONAL DEALER 001",
    dealerSlug: "fx-dealer-001",
    dealerId: "fx-dealer-001",
    sellerType: "dealer",
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-01-15T00:00:00.000Z",
    province: "กรุงเทพมหานคร",
    registrationProvince: "กรุงเทพมหานคร",
    bodyType: t.bodyType,
    color: t.color,
    transmission: "auto",
    negotiable: true,
    features: ["ทดสอบ UI", "ข้อมูลสมมติ"],
    tags: ["TEST", "FIXTURE"],
  }));
}

export function getSyntheticFixtureCarsPayload(): {
  success: true;
  data: Car[];
  message: string;
} {
  return {
    success: true,
    data: buildSyntheticFixtureCars(),
    message: DISCLAIMER,
  };
}

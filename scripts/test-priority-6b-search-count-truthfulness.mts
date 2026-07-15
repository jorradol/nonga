/**
 * Priority 6B — Search Count Truthfulness
 * Asserts Search page separates filteredCount (post-filter) from catalogCount
 * (full /api/cars catalog pre-filter) and displays “พบ X คัน จากทั้งหมด Y คัน”.
 *
 * Run: npx tsx scripts/test-priority-6b-search-count-truthfulness.mts
 */
import fs from "node:fs";
import path from "node:path";
import { CarSearchService } from "../src/services/search/searchService.ts";
import type { SearchFilters } from "../src/stores/search/searchStore.ts";
import type { Car } from "../src/types.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const useSearchPath = path.join(root, "src/hooks/search/useSearch.ts");
const searchPagePath = path.join(root, "src/components/search/SearchPageView.tsx");
const useSearchSrc = fs.readFileSync(useSearchPath, "utf8");
const searchPageSrc = fs.readFileSync(searchPagePath, "utf8");

/** Default Search filters (must keep minYear=2015 — Priority 6C owns that change). */
const defaultFilters: SearchFilters = {
  search: "",
  brand: "all",
  model: "all",
  minYear: 2015,
  maxYear: 2026,
  minPrice: 0,
  maxPrice: 10000000,
  province: "all",
  isEvOnly: false,
  transmission: "all",
  fuelType: "all",
  dealerOnly: false,
  featuredOnly: false,
  aiRecommendedOnly: false,
};

function makeCar(partial: Partial<Car> & Pick<Car, "id" | "year">): Car {
  return {
    title: partial.title ?? `Car ${partial.id}`,
    brand: partial.brand ?? "Honda",
    model: partial.model ?? "Civic",
    price: partial.price ?? 500000,
    type: partial.type ?? "used",
    condition: partial.condition ?? "Excellent",
    mileage: partial.mileage ?? 20000,
    fuelType: partial.fuelType ?? "petrol",
    images: partial.images ?? [],
    description: partial.description ?? "",
    ownerId: partial.ownerId ?? "owner-1",
    ownerName: partial.ownerName ?? "Owner",
    ownerPhone: partial.ownerPhone ?? "0800000000",
    isSold: partial.isSold ?? false,
    createdAt: partial.createdAt ?? "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

console.log("--- Priority 6B Search count truthfulness ---");

ok(
  "useSearch-exports-catalogCount-from-cars-length",
  /catalogCount:\s*cars\.length/.test(useSearchSrc),
  ""
);

ok(
  "useSearch-exports-filteredCount-from-queryResult",
  /filteredCount:\s*queryResult\.totalCount/.test(useSearchSrc),
  ""
);

ok(
  "useSearch-does-not-alias-both-to-filtered",
  !/totalCount:\s*queryResult\.totalCount/.test(useSearchSrc) &&
    !/allFilteredCount:\s*queryResult\.results\.length/.test(useSearchSrc),
  ""
);

ok(
  "searchPage-uses-filteredCount-and-catalogCount",
  searchPageSrc.includes("filteredCount") &&
    searchPageSrc.includes("catalogCount") &&
    /พบ[\s\S]*filteredCount[\s\S]*คัน จากทั้งหมด \{catalogCount\} คัน/.test(
      searchPageSrc
    ),
  ""
);

ok(
  "searchPage-does-not-reuse-totalCount-for-catalog-label",
  !/จากทั้งหมด \{totalCount\}/.test(searchPageSrc) &&
    !/\ballFilteredCount\b/.test(searchPageSrc),
  ""
);

// Functional: 15 catalog cars, 1 below default minYear → filtered 14
const catalogCars: Car[] = [
  ...Array.from({ length: 14 }, (_, i) =>
    makeCar({ id: `car-${i + 1}`, year: 2018 + (i % 5) })
  ),
  makeCar({
    id: "car-hrv-old",
    brand: "Honda",
    model: "HR-V",
    title: "Honda HR-V (pre-filter)",
    year: 2012,
  }),
];

const catalogCount = catalogCars.length;
const filtered = CarSearchService.search(catalogCars, defaultFilters, "relevance");
const filteredCount = filtered.totalCount;

ok("fixture-catalog-count-is-15", catalogCount === 15, `got=${catalogCount}`);
ok(
  "default-filters-filtered-count-is-14",
  filteredCount === 14,
  `got=${filteredCount}`
);
ok(
  "filtered-lt-catalog-under-default-minYear",
  filteredCount < catalogCount,
  `filtered=${filteredCount} catalog=${catalogCount}`
);
ok(
  "old-hrv-excluded-from-filtered-not-deleted",
  !filtered.results.some((c) => c.id === "car-hrv-old") &&
    catalogCars.some((c) => c.id === "car-hrv-old"),
  ""
);
ok(
  "display-copy-contract",
  `พบ ${filteredCount} คัน จากทั้งหมด ${catalogCount} คัน` ===
    "พบ 14 คัน จากทั้งหมด 15 คัน",
  ""
);

console.log("\nDone.");

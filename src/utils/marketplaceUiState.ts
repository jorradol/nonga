export type MarketplaceUiState =
  | "loading"
  | "error"
  | "empty"
  | "filtered-empty"
  | "ready";

export function resolveMarketplaceUiState(params: {
  isLoadingCars: boolean;
  carsLoadState: "idle" | "loading" | "success" | "error";
  carsCount: number;
  filteredCarsCount: number;
}): MarketplaceUiState {
  if (params.isLoadingCars && params.carsCount === 0) return "loading";
  if (params.carsLoadState === "error" && params.carsCount === 0) return "error";
  if (params.carsLoadState === "success" && params.carsCount === 0) return "empty";
  if (params.carsCount > 0 && params.filteredCarsCount === 0) return "filtered-empty";
  return "ready";
}

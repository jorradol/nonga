import type { Car } from "../types";

/**
 * Returns marketplace cars whose ids appear in the saved favorites list.
 * Unresolved favorite ids (missing, unpublished, or not yet loaded) are excluded.
 */
export function resolveVisibleFavoriteCars(
  favoriteIds: string[],
  cars: Car[]
): Car[] {
  if (!favoriteIds.length || !cars.length) return [];
  const carIdSet = new Set(cars.map((car) => car.id));
  return cars.filter((car) => favoriteIds.includes(car.id) && carIdSet.has(car.id));
}

export function resolveVisibleFavoriteCount(
  favoriteIds: string[],
  cars: Car[]
): number {
  return resolveVisibleFavoriteCars(favoriteIds, cars).length;
}

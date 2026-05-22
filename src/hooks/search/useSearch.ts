import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "../../store";
import { useSearchStore } from "../../stores/search/searchStore";
import { CarSearchService, OptimizedQueryResult } from "../../services/search/searchService";
import { Car } from "../../types";

export function useSearch() {
  const { cars, fetchCars, isLoadingCars } = useAppStore();
  const { 
    filters, 
    sortBy, 
    currentPage, 
    itemsPerPage, 
    setFilters, 
    loadFromUrl,
    setCurrentPage,
    setHasMore
  } = useSearchStore();

  const [localSearchText, setLocalSearchText] = useState(filters.search);
  const [isShufflingResults, setIsShufflingResults] = useState(false);

  // 1. Sync URL filters on mount & observe popstate
  useEffect(() => {
    loadFromUrl();
    const handleUrlChange = () => {
      loadFromUrl();
    };
    window.addEventListener("popstate", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [loadFromUrl]);

  // 2. Synchronize store search filter to local input field when URL changes
  useEffect(() => {
    setLocalSearchText(filters.search);
  }, [filters.search]);

  // 3. Debounce input text query to avoid layout re-evaluations on every key stroke
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchText !== filters.search) {
        setFilters({ search: localSearchText });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [localSearchText, setFilters, filters.search]);

  // 4. Ensure vehicle list is fully requested
  useEffect(() => {
    if (cars.length === 0 && !isLoadingCars) {
      fetchCars();
    }
  }, [cars.length, fetchCars, isLoadingCars]);

  // 5. Compute full search results utilizing the CarSearchService
  const queryResult = useMemo<OptimizedQueryResult>(() => {
    return CarSearchService.search(cars, filters, sortBy);
  }, [cars, filters, sortBy]);

  // 6. Handle pagination slice
  const paginatedCars = useMemo<Car[]>(() => {
    const endOffset = currentPage * itemsPerPage;
    const items = queryResult.results.slice(0, endOffset);
    
    // Sync hasMore state to store
    const hasMoreItems = endOffset < queryResult.totalCount;
    setHasMore(hasMoreItems);
    
    return items;
  }, [queryResult.results, queryResult.totalCount, currentPage, itemsPerPage, setHasMore]);

  // 7. Load more action with nice microscopic suspension simulation
  const handleLoadMore = async () => {
    if (isShufflingResults) return;
    setIsShufflingResults(true);
    
    // Smooth loading simulation for visual premium feedback
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setCurrentPage(currentPage + 1);
    setIsShufflingResults(false);
  };

  // 8. Dynamic Filter Values Extraction
  // Extract all unique brands, models, and provinces directly from active catalog to avoid hardcoded empty state bugs!
  const uniqueBrands = useMemo<string[]>(() => {
    const brandsSet = new Set<string>();
    cars.forEach((car) => {
      if (car.brand) brandsSet.add(car.brand);
    });
    return Array.from(brandsSet).sort();
  }, [cars]);

  const uniqueModelsOfBrand = useMemo<string[]>(() => {
    const modelsSet = new Set<string>();
    cars.forEach((car) => {
      if (car.model && (filters.brand === "all" || car.brand.toLowerCase() === filters.brand.toLowerCase())) {
        modelsSet.add(car.model);
      }
    });
    return Array.from(modelsSet).sort();
  }, [cars, filters.brand]);

  const uniqueProvinces = useMemo<string[]>(() => {
    const provincesSet = new Set<string>();
    cars.forEach((car) => {
      const prov = car.province || "กรุงเทพมหานคร";
      provincesSet.add(prov);
    });
    return Array.from(provincesSet).sort();
  }, [cars]);

  return {
    // states
    cars: paginatedCars,
    totalCount: queryResult.totalCount,
    allFilteredCount: queryResult.results.length,
    isLoading: isLoadingCars || isShufflingResults,
    isShuffling: isShufflingResults,
    localSearchText,
    setLocalSearchText,
    aiInsights: queryResult.aiInsights,
    firestoreIndexDetails: queryResult.firestoreIndexDetails,
    
    // dropdown sources
    brands: uniqueBrands,
    models: uniqueModelsOfBrand,
    provinces: uniqueProvinces,
    
    // paginations
    hasMore: currentPage * itemsPerPage < queryResult.totalCount,
    currentPage,
    onLoadMore: handleLoadMore,
  };
}

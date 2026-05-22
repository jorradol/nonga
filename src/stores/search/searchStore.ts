import { create } from "zustand";

export interface SearchFilters {
  search: string;
  brand: string;
  model: string;
  minYear: number;
  maxYear: number;
  minPrice: number;
  maxPrice: number;
  province: string;
  isEvOnly: boolean;
  transmission: string; // "all" | "auto" | "manual"
  fuelType: string; // "all" | "petrol" | "diesel" | "electric" | "hybrid"
  dealerOnly: boolean;
  featuredOnly: boolean;
  aiRecommendedOnly: boolean;
}

export type SortOption = "relevance" | "price-asc" | "price-desc" | "year-desc" | "mileage-asc" | "ai-score";

interface SearchState {
  filters: SearchFilters;
  sortBy: SortOption;
  recentSearches: string[];
  searchSuggestions: string[];
  currentPage: number;
  itemsPerPage: number;
  hasMore: boolean;
  isFilterDrawerOpen: boolean;
  
  // Actions
  setFilters: (filters: Partial<SearchFilters>) => void;
  setSortBy: (sort: SortOption) => void;
  resetAllFilters: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  toggleFilterDrawer: (open?: boolean) => void;
  
  // URL sync helpers
  syncToUrl: () => void;
  loadFromUrl: () => void;
}

const initialFilters: SearchFilters = {
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

const SUGGESTIONS = [
  "Tesla Model 3",
  "Fortuner",
  "รถไฟฟ้า EV",
  "Honda Civic",
  "ราคาไม่เกินล้าน",
  "Porsche Taycan",
  "BMW i4",
  "Ducati Panigale"
];

export const useSearchStore = create<SearchState>((set, get) => ({
  filters: initialFilters,
  sortBy: "relevance",
  recentSearches: [],
  searchSuggestions: SUGGESTIONS,
  currentPage: 1,
  itemsPerPage: 6,
  hasMore: true,
  isFilterDrawerOpen: false,

  setFilters: (updatedFilters) => {
    set((state) => {
      const nextFilters = { ...state.filters, ...updatedFilters };
      
      // If brand changed, reset model to all since models are brand-dependent
      if (updatedFilters.brand && updatedFilters.brand !== state.filters.brand) {
        nextFilters.model = "all";
      }
      
      return { filters: nextFilters, currentPage: 1 };
    });
    get().syncToUrl();
  },

  setSortBy: (sort) => {
    set({ sortBy: sort, currentPage: 1 });
    get().syncToUrl();
  },

  resetAllFilters: () => {
    set({ filters: initialFilters, sortBy: "relevance", currentPage: 1 });
    get().syncToUrl();
  },

  addRecentSearch: (query) => {
    if (!query || query.trim() === "") return;
    const cleanQuery = query.trim();
    set((state) => {
      const filtered = state.recentSearches.filter((s) => s.toLowerCase() !== cleanQuery.toLowerCase());
      const updated = [cleanQuery, ...filtered].slice(0, 8); // max 8 entries
      
      try {
        localStorage.setItem("nonga_recent_searches", JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage recent searches sync failed", e);
      }
      
      return { recentSearches: updated };
    });
  },

  clearRecentSearches: () => {
    try {
      localStorage.removeItem("nonga_recent_searches");
    } catch (e) {
      console.error(e);
    }
    set({ recentSearches: [] });
  },

  setCurrentPage: (page) => set({ currentPage: page }),
  setHasMore: (hasMore) => set({ hasMore }),
  toggleFilterDrawer: (open) => set((state) => ({ 
    isFilterDrawerOpen: open !== undefined ? open : !state.isFilterDrawerOpen 
  })),

  syncToUrl: () => {
    const { filters, sortBy } = get();
    const params = new URLSearchParams();

    // Map each filter field if it's not at its default
    if (filters.search) params.set("q", filters.search);
    if (filters.brand !== "all") params.set("brand", filters.brand);
    if (filters.model !== "all") params.set("model", filters.model);
    if (filters.minYear !== initialFilters.minYear) params.set("minYear", filters.minYear.toString());
    if (filters.maxYear !== initialFilters.maxYear) params.set("maxYear", filters.maxYear.toString());
    if (filters.minPrice !== initialFilters.minPrice) params.set("minPrice", filters.minPrice.toString());
    if (filters.maxPrice !== initialFilters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
    if (filters.province !== "all") params.set("prov", filters.province);
    if (filters.isEvOnly) params.set("ev", "true");
    if (filters.transmission !== "all") params.set("trans", filters.transmission);
    if (filters.fuelType !== "all") params.set("fuel", filters.fuelType);
    if (filters.dealerOnly) params.set("dealer", "true");
    if (filters.featuredOnly) params.set("featured", "true");
    if (filters.aiRecommendedOnly) params.set("ai", "true");
    if (sortBy !== "relevance") params.set("sort", sortBy);

    const qs = params.toString();
    const targetHash = qs ? `search?${qs}` : "search";
    
    // Safely update hash without triggering window hash scroll
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${targetHash}`);
    }
  },

  loadFromUrl: () => {
    if (typeof window === "undefined") return;
    
    // Load recent searches from localstorage on startup
    try {
      const stored = localStorage.getItem("nonga_recent_searches");
      if (stored) {
        set({ recentSearches: JSON.parse(stored) });
      }
    } catch (e) {
      // safe bypass
    }

    const hash = window.location.hash || "";
    if (!hash.startsWith("#search")) return;

    const queryStartIndex = hash.indexOf("?");
    if (queryStartIndex === -1) return;

    const queryStr = hash.slice(queryStartIndex + 1);
    const params = new URLSearchParams(queryStr);

    const loadedFilters: SearchFilters = { ...initialFilters };

    if (params.has("q")) loadedFilters.search = params.get("q") || "";
    if (params.has("brand")) loadedFilters.brand = params.get("brand") || "all";
    if (params.has("model")) loadedFilters.model = params.get("model") || "all";
    if (params.has("minYear")) loadedFilters.minYear = Number(params.get("minYear")) || initialFilters.minYear;
    if (params.has("maxYear")) loadedFilters.maxYear = Number(params.get("maxYear")) || initialFilters.maxYear;
    if (params.has("minPrice")) loadedFilters.minPrice = Number(params.get("minPrice")) || initialFilters.minPrice;
    if (params.has("maxPrice")) loadedFilters.maxPrice = Number(params.get("maxPrice")) || initialFilters.maxPrice;
    if (params.has("prov")) loadedFilters.province = params.get("prov") || "all";
    if (params.has("ev")) loadedFilters.isEvOnly = params.get("ev") === "true";
    if (params.has("trans")) loadedFilters.transmission = params.get("trans") || "all";
    if (params.has("fuel")) loadedFilters.fuelType = params.get("fuel") || "all";
    if (params.has("dealer")) loadedFilters.dealerOnly = params.get("dealer") === "true";
    if (params.has("featured")) loadedFilters.featuredOnly = params.get("featured") === "true";
    if (params.has("ai")) loadedFilters.aiRecommendedOnly = params.get("ai") === "true";

    let loadedSortBy: SortOption = "relevance";
    if (params.has("sort")) {
      loadedSortBy = (params.get("sort") as SortOption) || "relevance";
    }

    set({ filters: loadedFilters, sortBy: loadedSortBy, currentPage: 1 });
  },
}));

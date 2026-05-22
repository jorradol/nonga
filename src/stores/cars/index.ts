import { create } from "zustand";
import { CarListing } from "../../types/cars";

interface MarketplaceFilterState {
  brand: string;
  model: string;
  bodyType: string;
  transmission: string;
  fuelType: string;
  condition: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  province: string;
  searchTerm: string;
  status: string;
  sortBy: "newest" | "price_asc" | "price_desc" | "mileage_asc" | "year_desc";
}

interface CarsAppState {
  // Comparing feature
  compareList: CarListing[];
  addToCompare: (car: CarListing) => void;
  removeFromCompare: (carId: string) => void;
  clearCompare: () => void;

  // Selected details
  selectedCar: CarListing | null;
  setSelectedCar: (car: CarListing | null) => void;

  // Real-time UI filters state
  filters: MarketplaceFilterState;
  setFilters: (filters: Partial<MarketplaceFilterState>) => void;
  resetFilters: () => void;

  // Drafts locally
  localDraftListing: Partial<CarListing> | null;
  setLocalDraftListing: (draft: Partial<CarListing> | null) => void;
}

const initialFilters: MarketplaceFilterState = {
  brand: "",
  model: "",
  bodyType: "",
  transmission: "",
  fuelType: "",
  condition: "",
  minPrice: 0,
  maxPrice: 20000000,
  minYear: 1990,
  maxYear: new Date().getFullYear() + 1,
  province: "",
  searchTerm: "",
  status: "approved",
  sortBy: "newest",
};

export const useCarsStore = create<CarsAppState>((set, get) => ({
  compareList: [],
  
  addToCompare: (car) => {
    const list = get().compareList;
    if (list.length >= 3) {
      throw new Error("คุณเปรียบเทียบรถได้สูงสุดทีละ 3 หน้าพร้อมกันครับ");
    }
    if (list.some(c => c.id === car.id)) return;
    set({ compareList: [...list, car] });
  },

  removeFromCompare: (carId) => {
    set((state) => ({
      compareList: state.compareList.filter(c => c.id !== carId)
    }));
  },

  clearCompare: () => set({ compareList: [] }),

  selectedCar: null,
  setSelectedCar: (car) => set({ selectedCar: car }),

  filters: initialFilters,
  setFilters: (updatedFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...updatedFilters }
    }));
  },

  resetFilters: () => set({ filters: initialFilters }),

  localDraftListing: null,
  setLocalDraftListing: (draft) => set({ localDraftListing: draft }),
}));

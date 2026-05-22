import { Car } from "../../types";
import { SearchFilters, SortOption } from "../../stores/search/searchStore";

export interface OptimizedQueryResult {
  results: Car[];
  totalCount: number;
  aiInsights: {
    averagePrice: number;
    bestValueCarId: string | null;
    evCount: number;
    topBrand: string;
  };
  firestoreIndexDetails: {
    optimizedKeys: string[];
    indexIdNeeded: string;
    hasCompositeIndex: boolean;
    explanation: string;
  };
}

/**
 * Service to process, optimize and search vehicles.
 * Models real Firestore composite queries with high performance in-memory execution.
 */
export const CarSearchService = {
  /**
   * Performs advanced search and optimization over the listing directory.
   */
  search(cars: Car[], filters: SearchFilters, sortBy: SortOption): OptimizedQueryResult {
    // 1. Client-side Query Filtering (Simulating exact Firestore fields constraints)
    let filtered = cars.filter((car) => {
      // Global Search string matching multiple indexes
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const score = this.calculateSearchScore(car, query);
        if (score === 0) return false;
      }

      // Brand Filter
      if (filters.brand !== "all" && car.brand.toLowerCase() !== filters.brand.toLowerCase()) {
        return false;
      }

      // Model Filter
      if (filters.model !== "all" && car.model.toLowerCase() !== filters.model.toLowerCase()) {
        return false;
      }

      // Year Range Guard
      if (car.year < filters.minYear || car.year > filters.maxYear) {
        return false;
      }

      // Price Range Guard
      if (car.price < filters.minPrice || car.price > filters.maxPrice) {
        return false;
      }

      // Province/Location Filter
      if (filters.province !== "all") {
        const carProvince = (car.province || "กรุงเทพมหานคร").toLowerCase();
        if (carProvince !== filters.province.toLowerCase()) return false;
      }

      // EV Exclusive Toggle
      if (filters.isEvOnly) {
        const isEv = car.type === "ev" || car.fuelType?.toLowerCase() === "electric";
        if (!isEv) return false;
      }

      // Transmission Filter
      if (filters.transmission !== "all") {
        const carTrans = (car.transmission || "auto").toLowerCase();
        if (carTrans !== filters.transmission.toLowerCase()) return false;
      }

      // Fuel Type Filter
      if (filters.fuelType !== "all") {
        const carFuel = car.fuelType?.toLowerCase() || "petrol";
        if (carFuel !== filters.fuelType.toLowerCase()) return false;
      }

      // Dealer Showroom Verified Filter
      if (filters.dealerOnly) {
        const isDealer = car.sellerType === "dealer" || !!car.showroomName || car.ownerId?.startsWith("dealer");
        if (!isDealer) return false;
      }

      // Featured Filter
      if (filters.featuredOnly) {
        // Cars under 15000km or containing premium keywords
        const isFeatured = car.price > 2000000 || car.mileage < 15000 || car.condition === "Like New";
        if (!isFeatured) return false;
      }

      // AI Recommended Filter
      if (filters.aiRecommendedOnly) {
        const aiScore = this.calculateAIScore(car);
        if (aiScore < 85) return false; // Only show excellent matches
      }

      return true;
    });

    // 2. Sorting Phase
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "year-desc":
          return b.year - a.year;
        case "mileage-asc":
          return a.mileage - b.mileage;
        case "ai-score":
          return this.calculateAIScore(b) - this.calculateAIScore(a);
        case "relevance":
        default:
          if (filters.search) {
            const scoreA = this.calculateSearchScore(a, filters.search);
            const scoreB = this.calculateSearchScore(b, filters.search);
            if (scoreA !== scoreB) return scoreB - scoreA;
          }
          // Default to latest uploads
          return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
      }
    });

    // 3. Compile AI Aggregates Insights
    const evCount = filtered.filter(c => c.type === "ev" || c.fuelType?.toLowerCase() === "electric").length;
    const avgPrice = filtered.length > 0 ? Math.round(filtered.reduce((sum, c) => sum + c.price, 0) / filtered.length) : 0;
    
    // Find best value car (Highest AI score to Price ratio)
    let bestValueCarId: string | null = null;
    let maxRatio = -1;
    filtered.forEach((car) => {
      const score = this.calculateAIScore(car);
      // Value ratio: higher score, lower price is better
      const ratio = score / (car.price / 100000); 
      if (ratio > maxRatio) {
        maxRatio = ratio;
        bestValueCarId = car.id;
      }
    });

    // Top Brand in current search results
    const brandCounts: Record<string, number> = {};
    filtered.forEach(c => {
      brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
    });
    const topBrand = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a])[0] || "None";

    // 4. Simulate Firestore index analytics for professional optimization feedback
    const firestoreIndexDetails = this.analyzeFirestoreRequiredIndex(filters, sortBy);

    return {
      results: filtered,
      totalCount: filtered.length,
      aiInsights: {
        averagePrice: avgPrice,
        bestValueCarId,
        evCount,
        topBrand
      },
      firestoreIndexDetails
    };
  },

  /**
   * Calculates a keyword search score (0 if no match, higher means more relevant)
   */
  calculateSearchScore(car: Car, query: string): number {
    const q = query.toLowerCase();
    let score = 0;

    if (car.title.toLowerCase().includes(q)) score += 10;
    if (car.brand.toLowerCase().includes(q)) score += 8;
    if (car.model.toLowerCase().includes(q)) score += 6;
    if (car.description?.toLowerCase().includes(q)) score += 3;
    if (car.fuelType?.toLowerCase() === q) score += 4;
    if (car.province?.toLowerCase() === q) score += 4;

    return score;
  },

  /**
   * Calculates a dynamic AI index matching rating (0-100)
   */
  calculateAIScore(car: Car): number {
    let score = 75; // baseline rating

    // Condition boosts
    if (car.condition === "Like New") score += 15;
    else if (car.condition === "Excellent") score += 10;
    else if (car.condition === "Very Good") score += 5;

    // Mileage boosts
    if (car.mileage < 10000) score += 10;
    else if (car.mileage < 30000) score += 5;
    else if (car.mileage > 100000) score -= 10;

    // Eco energy bonus
    if (car.type === "ev" || car.fuelType === "electric") score += 5;
    if (car.fuelType === "hybrid") score += 3;

    // Year age bonus
    if (car.year >= 2023) score += 5;
    else if (car.year < 2018) score -= 5;

    // Guarantee checklist bonus
    if (car.sellerType === "dealer" || car.showroomName) score += 5;

    return Math.min(100, Math.max(30, score));
  },

  /**
   * Analyzes active filters to report exactly what Firestore composite index would be needed
   * to execute this query securely and instantly in Google Cloud production.
   */
  analyzeFirestoreRequiredIndex(filters: SearchFilters, sortBy: SortOption) {
    const activeFilters: string[] = [];
    if (filters.brand !== "all") activeFilters.push("brand");
    if (filters.model !== "all") activeFilters.push("model");
    if (filters.isEvOnly) activeFilters.push("type");
    if (filters.transmission !== "all") activeFilters.push("transmission");
    if (filters.fuelType !== "all") activeFilters.push("fuelType");
    if (filters.province !== "all") activeFilters.push("province");
    if (filters.dealerOnly) activeFilters.push("sellerType");

    // Add inequality structures
    const hasInequality = filters.minPrice > 0 || filters.maxPrice < 10000000 || filters.minYear > 2015 || filters.maxYear < 2026;
    if (hasInequality) {
      if (filters.minPrice > 0 || filters.maxPrice < 10000000) activeFilters.push("price");
      else activeFilters.push("year");
    }

    // Sort order field
    let sortField = "createdAt";
    if (sortBy === "price-asc" || sortBy === "price-desc") sortField = "price";
    if (sortBy === "year-desc") sortField = "year";
    if (sortBy === "mileage-asc") sortField = "mileage";

    const indexFields = [...activeFilters];
    if (!indexFields.includes(sortField)) {
      indexFields.push(sortField);
    }

    const hasCompositeIndex = indexFields.length > 1;
    const indexIdNeeded = `cars_idx_${indexFields.join("_")}`;

    let explanation = "เงื่อนไขการกรองเดี่ยว: Firestore ดำเนินการโดยใช้ดัชนีมาตรฐานสำเร็จรูปอัตโนมัติ";
    if (hasCompositeIndex) {
      explanation = `ดัชนีผสม (Composite Index) ที่ระบบวิเคราะห์สำหรับสเปกนี้เพื่ออัปเกรดความเร็วเป็นระดับมิลลิวินาที: เคลื่อนข้อมูลบนคอลเลกชัน 'cars' โดยจัดเรียงตามฟิลด์ [${indexFields.join(", ")}]`;
    }

    return {
      optimizedKeys: indexFields,
      indexIdNeeded,
      hasCompositeIndex,
      explanation
    };
  }
};

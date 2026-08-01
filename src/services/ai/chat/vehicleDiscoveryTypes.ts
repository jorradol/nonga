/**
 * WP-VD01 — Natural-language vehicle discovery foundation types.
 * Criteria must map only to real inventory / listing fields (or explicit assumptions).
 */

import type { ChatCarCardData } from "../../../types";
import type { ChatInventoryCar } from "./marketplaceChatSearch";
import type { VehicleBodyClass } from "./vehicleBodyClassifier";

export type VehicleDiscoveryBodyHint =
  | "sedan"
  | "hatchback"
  | "suv"
  | "pickup"
  | "mpv";

export type VehicleDiscoveryTransmission = "auto" | "manual";

export type VehicleDiscoverySort =
  | "relevance"
  | "priceAsc"
  | "priceDesc"
  | "yearDesc"
  | "yearAsc";

/** Continuational refine relative to prior results / selected listing */
export type VehicleDiscoveryRefineKind =
  | "cheaper"
  | "newer"
  | "brandOnly"
  | "larger"
  | "showMore";

export interface VehicleDiscoveryFinanceAssumptions {
  /** Always treated as estimate — never approval */
  isEstimate: true;
  downPaymentPercent: number;
  annualFlatRatePercent: number;
  termMonths: number;
}

export interface VehicleDiscoveryCriteria {
  isDiscovery: boolean;
  budgetMax?: number;
  budgetMin?: number;
  /** Estimated monthly installment cap (baht) — drives budgetMax via assumptions */
  estimatedMonthlyMax?: number;
  financeAssumptions?: VehicleDiscoveryFinanceAssumptions;
  brand?: string;
  model?: string;
  yearExact?: number;
  /** Minimum model year (inclusive) */
  minYear?: number;
  /** Maximum vehicle age in years from referenceYear */
  maxAgeYears?: number;
  referenceYear?: number;
  bodyHints?: VehicleDiscoveryBodyHint[];
  transmission?: VehicleDiscoveryTransmission;
  fuelType?: string;
  usageTags?: string[];
  fuelEfficient?: boolean;
  sort?: VehicleDiscoverySort;
  limit?: number;
  refineKind?: VehicleDiscoveryRefineKind;
  /**
   * Buyer asked for a constraint we cannot verify from listing fields.
   * Surfaced honestly — never silently invented.
   */
  unverifiableConstraints?: string[];
  needsClarification?: boolean;
  clarificationQuestion?: string;
  /** Human-readable applied filters for chat summary */
  appliedLabels?: string[];
}

export interface VehicleDiscoveryMatchDiff {
  constraint: string;
  detail: string;
}

export interface VehicleDiscoveryCandidate {
  car: ChatInventoryCar;
  listingId: string;
  score: number;
  reasons: string[];
  cautions?: string[];
  /** Present only for near-miss / relaxed alternatives */
  differences?: VehicleDiscoveryMatchDiff[];
  isExactMatch: boolean;
}

export interface VehicleDiscoveryResult {
  criteria: VehicleDiscoveryCriteria;
  exactMatches: VehicleDiscoveryCandidate[];
  nearAlternatives: VehicleDiscoveryCandidate[];
  blockingConstraints: string[];
  summaryText: string;
  carCards: ChatCarCardData[];
  allCarCards: ChatCarCardData[];
  hasMoreCars: boolean;
  /** True when no exact match but alternatives offered */
  isRelaxed: boolean;
}

export interface VehicleDiscoveryContext {
  /** Prior discovery criteria from this session (for refine merges) */
  priorCriteria?: VehicleDiscoveryCriteria | null;
  /** Selected listing id (must resolve against inventory) */
  selectedListingId?: string | null;
  /** Reference cars from last result set */
  contextCars?: ChatCarCardData[];
  /** Calendar year for age calculations — injectable for tests */
  referenceYear?: number;
}

export const DEFAULT_DISCOVERY_FINANCE_ASSUMPTIONS: VehicleDiscoveryFinanceAssumptions =
  {
    isEstimate: true,
    downPaymentPercent: 20,
    annualFlatRatePercent: 2.5,
    termMonths: 60,
  };

export type { VehicleBodyClass };

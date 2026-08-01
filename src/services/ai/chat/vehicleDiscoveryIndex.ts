/**
 * WP-VD01 — Public barrel for vehicle discovery foundation.
 */

export type {
  VehicleDiscoveryBodyHint,
  VehicleDiscoveryCandidate,
  VehicleDiscoveryCriteria,
  VehicleDiscoveryContext,
  VehicleDiscoveryFinanceAssumptions,
  VehicleDiscoveryMatchDiff,
  VehicleDiscoveryRefineKind,
  VehicleDiscoveryResult,
  VehicleDiscoverySort,
  VehicleDiscoveryTransmission,
} from "./vehicleDiscoveryTypes";

export {
  DEFAULT_DISCOVERY_FINANCE_ASSUMPTIONS,
} from "./vehicleDiscoveryTypes";

export {
  parseVehicleDiscoveryCriteria,
  parseDiscoveryMonthlyMax,
  parsePreferNewerYear,
  hasExplicitBodyTypeRequest,
  isVehicleDiscoveryIntent,
  isMonthlyAffordabilityDiscovery,
} from "./vehicleDiscoveryCriteriaParser";

export {
  isPublishedDiscoveryListing,
  evaluateDiscoveryHardFilters,
  matchDiscoveryInventory,
} from "./vehicleDiscoveryMatcher";

export { rankDiscoveryCandidates } from "./vehicleDiscoveryRanker";

export { findDiscoveryNearAlternatives } from "./vehicleDiscoveryRelaxation";

export { runVehicleDiscovery } from "./vehicleDiscovery";

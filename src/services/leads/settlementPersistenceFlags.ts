/**
 * v5.6I.5 — Settlement persistence feature flags (readiness only; defaults OFF).
 */

import {
  NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV,
  isSuccessFeeRecordEnabled,
} from "./successFeeSettlement";

export const NONGA_SETTLEMENT_DATA_BACKEND_ENV = "NONGA_SETTLEMENT_DATA_BACKEND";
export const NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV =
  "NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED";

export type SettlementDataBackend = "memory" | "firestore";

export function resolveSettlementDataBackend(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): SettlementDataBackend {
  const v = String(env[NONGA_SETTLEMENT_DATA_BACKEND_ENV] ?? "memory").toLowerCase();
  return v === "firestore" ? "firestore" : "memory";
}

export function isSettlementFirestoreWritesEnabled(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  return env[NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV] === "true";
}

/** True when durable Firestore settlement writes are allowed (all gates). */
export function isDurableSettlementPersistenceActive(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  return (
    isSuccessFeeRecordEnabled(env) &&
    resolveSettlementDataBackend(env) === "firestore" &&
    isSettlementFirestoreWritesEnabled(env)
  );
}

export function assertSettlementPersistenceReadinessDefaults(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  return (
    !isSuccessFeeRecordEnabled(env) &&
    resolveSettlementDataBackend(env) === "memory" &&
    !isSettlementFirestoreWritesEnabled(env)
  );
}

export { NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV, isSuccessFeeRecordEnabled };

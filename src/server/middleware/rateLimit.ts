/**
 * Phase 2 — Firestore-backed API quota middleware (add-on module).
 * Collection: quota_usage (document ID = userId).
 *
 * Default: disabled via NONGA_FIRESTORE_QUOTA_LIMIT_ENABLED (fail-open on errors).
 * Wire with registerFirestoreRateLimitMiddleware(app) when ready — does not auto-register.
 */

import type { Express, NextFunction, Request, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize";
import { isAiGuardedPath } from "../security/aiEndpointGuard";
import {
  getServerAuthContext,
  getServerFirestore,
  ServerAuthError,
} from "../serverAuthContext";

/** Firestore collection for per-user API quota and token usage. */
export const QUOTA_USAGE_COLLECTION = "quota_usage";

const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MONTHLY_WINDOW_MS = 30 * DAILY_WINDOW_MS;

export interface QuotaUsageDocument {
  userId: string;
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
  requestCount: number;
  dailyRequestCount: number;
  monthlyRequestCount: number;
  dailyTokenCount: number;
  monthlyTokenCount: number;
  dailyWindowStart: string;
  monthlyWindowStart: string;
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  lastModelId?: string;
  lastEndpoint?: string;
  lastUsageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaLimitConfig {
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: "daily_request_limit" | "monthly_request_limit" | "daily_token_limit" | "monthly_token_limit";
  retryAfterSec?: number;
  userId?: string;
}

type FirestoreDbLike = ReturnType<typeof getServerFirestore>;

let firestoreOverride: FirestoreDbLike | null = null;

function resolveFirestore(): FirestoreDbLike {
  return firestoreOverride ?? getServerFirestore();
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function isFirestoreQuotaLimitEnabled(): boolean {
  return /^(1|true|yes|on)$/i.test(
    String(process.env.NONGA_FIRESTORE_QUOTA_LIMIT_ENABLED ?? "").trim()
  );
}

export function readQuotaLimitConfig(): QuotaLimitConfig {
  return {
    dailyRequestLimit: envInt("NONGA_QUOTA_DAILY_REQUEST_LIMIT", 200),
    monthlyRequestLimit: envInt("NONGA_QUOTA_MONTHLY_REQUEST_LIMIT", 6_000),
    dailyTokenLimit: envInt(
      "NONGA_QUOTA_DAILY_TOKEN_LIMIT",
      envInt("NONGA_AI_BUDGET_DAILY_LIMIT", 50_000)
    ),
    monthlyTokenLimit: envInt(
      "NONGA_QUOTA_MONTHLY_TOKEN_LIMIT",
      envInt("NONGA_AI_BUDGET_MONTHLY_LIMIT", 500_000)
    ),
  };
}

function isoNow(now = Date.now()): string {
  return new Date(now).toISOString();
}

function asQuotaUsageDocument(
  userId: string,
  raw: Record<string, unknown> | undefined,
  limits: QuotaLimitConfig,
  nowIso: string
): QuotaUsageDocument {
  const num = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
  const str = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim() ? value : fallback;

  return {
    userId,
    promptTokens: num(raw?.promptTokens, 0),
    candidatesTokens: num(raw?.candidatesTokens, 0),
    thoughtsTokens: num(raw?.thoughtsTokens, 0),
    totalTokens: num(raw?.totalTokens, 0),
    requestCount: num(raw?.requestCount, 0),
    dailyRequestCount: num(raw?.dailyRequestCount, 0),
    monthlyRequestCount: num(raw?.monthlyRequestCount, 0),
    dailyTokenCount: num(raw?.dailyTokenCount, 0),
    monthlyTokenCount: num(raw?.monthlyTokenCount, 0),
    dailyWindowStart: str(raw?.dailyWindowStart, nowIso),
    monthlyWindowStart: str(raw?.monthlyWindowStart, nowIso),
    dailyRequestLimit: num(raw?.dailyRequestLimit, limits.dailyRequestLimit),
    monthlyRequestLimit: num(raw?.monthlyRequestLimit, limits.monthlyRequestLimit),
    dailyTokenLimit: num(raw?.dailyTokenLimit, limits.dailyTokenLimit),
    monthlyTokenLimit: num(raw?.monthlyTokenLimit, limits.monthlyTokenLimit),
    lastModelId: typeof raw?.lastModelId === "string" ? raw.lastModelId : undefined,
    lastEndpoint: typeof raw?.lastEndpoint === "string" ? raw.lastEndpoint : undefined,
    lastUsageAt: typeof raw?.lastUsageAt === "string" ? raw.lastUsageAt : undefined,
    createdAt: str(raw?.createdAt, nowIso),
    updatedAt: str(raw?.updatedAt, nowIso),
  };
}

function applyWindowResets(
  doc: QuotaUsageDocument,
  nowMs: number,
  nowIso: string
): QuotaUsageDocument {
  const next = { ...doc };
  const dailyStart = Date.parse(doc.dailyWindowStart);
  const monthlyStart = Date.parse(doc.monthlyWindowStart);

  if (!Number.isFinite(dailyStart) || nowMs - dailyStart >= DAILY_WINDOW_MS) {
    next.dailyRequestCount = 0;
    next.dailyTokenCount = 0;
    next.dailyWindowStart = nowIso;
  }
  if (!Number.isFinite(monthlyStart) || nowMs - monthlyStart >= MONTHLY_WINDOW_MS) {
    next.monthlyRequestCount = 0;
    next.monthlyTokenCount = 0;
    next.monthlyWindowStart = nowIso;
  }
  return next;
}

export function evaluateQuotaRequest(
  doc: QuotaUsageDocument,
  nowMs = Date.now()
): QuotaCheckResult {
  const nowIso = isoNow(nowMs);
  const current = applyWindowResets(doc, nowMs, nowIso);

  if (current.dailyRequestCount >= current.dailyRequestLimit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil(
        (Date.parse(current.dailyWindowStart) + DAILY_WINDOW_MS - nowMs) / 1000
      )
    );
    return {
      allowed: false,
      reason: "daily_request_limit",
      retryAfterSec,
      userId: current.userId,
    };
  }
  if (current.monthlyRequestCount >= current.monthlyRequestLimit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil(
        (Date.parse(current.monthlyWindowStart) + MONTHLY_WINDOW_MS - nowMs) / 1000
      )
    );
    return {
      allowed: false,
      reason: "monthly_request_limit",
      retryAfterSec,
      userId: current.userId,
    };
  }
  if (current.dailyTokenCount >= current.dailyTokenLimit) {
    return {
      allowed: false,
      reason: "daily_token_limit",
      retryAfterSec: 3600,
      userId: current.userId,
    };
  }
  if (current.monthlyTokenCount >= current.monthlyTokenLimit) {
    return {
      allowed: false,
      reason: "monthly_token_limit",
      retryAfterSec: 86_400,
      userId: current.userId,
    };
  }

  return { allowed: true, userId: current.userId };
}

/** Record one AI request in quota_usage without evaluating limits (monitoring / shadow mode). */
export async function recordQuotaRequest(
  userId: string,
  nowMs = Date.now()
): Promise<void> {
  const limits = readQuotaLimitConfig();
  const nowIso = isoNow(nowMs);
  const db = resolveFirestore();
  const ref = db.collection(QUOTA_USAGE_COLLECTION).doc(userId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const base = asQuotaUsageDocument(
      userId,
      snap.exists ? (snap.data() as Record<string, unknown>) : undefined,
      limits,
      nowIso
    );
    const current = applyWindowResets(base, nowMs, nowIso);
    const dailyWindowReset = current.dailyWindowStart !== base.dailyWindowStart;
    const monthlyWindowReset = current.monthlyWindowStart !== base.monthlyWindowStart;

    const patch = sanitizeFirestoreDocument({
      userId,
      dailyRequestLimit: limits.dailyRequestLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      dailyTokenLimit: limits.dailyTokenLimit,
      monthlyTokenLimit: limits.monthlyTokenLimit,
      dailyWindowStart: current.dailyWindowStart,
      monthlyWindowStart: current.monthlyWindowStart,
      requestCount: FieldValue.increment(1),
      dailyRequestCount: current.dailyRequestCount + 1,
      monthlyRequestCount: current.monthlyRequestCount + 1,
      updatedAt: nowIso,
      ...(dailyWindowReset ? { dailyTokenCount: 0 } : {}),
      ...(monthlyWindowReset ? { monthlyTokenCount: 0 } : {}),
      ...(snap.exists ? {} : { createdAt: nowIso }),
    });

    tx.set(ref, patch, { merge: true });
  });
}

export async function checkAndConsumeQuotaRequest(
  userId: string,
  nowMs = Date.now()
): Promise<QuotaCheckResult> {
  const limits = readQuotaLimitConfig();
  const nowIso = isoNow(nowMs);
  const db = resolveFirestore();
  const ref = db.collection(QUOTA_USAGE_COLLECTION).doc(userId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const base = asQuotaUsageDocument(
      userId,
      snap.exists ? (snap.data() as Record<string, unknown>) : undefined,
      limits,
      nowIso
    );
    const current = applyWindowResets(base, nowMs, nowIso);
    const decision = evaluateQuotaRequest(current, nowMs);
    if (!decision.allowed) {
      return decision;
    }

    const dailyWindowReset = current.dailyWindowStart !== base.dailyWindowStart;
    const monthlyWindowReset = current.monthlyWindowStart !== base.monthlyWindowStart;

    const patch = sanitizeFirestoreDocument({
      userId,
      dailyRequestLimit: limits.dailyRequestLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      dailyTokenLimit: limits.dailyTokenLimit,
      monthlyTokenLimit: limits.monthlyTokenLimit,
      dailyWindowStart: current.dailyWindowStart,
      monthlyWindowStart: current.monthlyWindowStart,
      requestCount: FieldValue.increment(1),
      dailyRequestCount: current.dailyRequestCount + 1,
      monthlyRequestCount: current.monthlyRequestCount + 1,
      updatedAt: nowIso,
      ...(dailyWindowReset ? { dailyTokenCount: 0 } : {}),
      ...(monthlyWindowReset ? { monthlyTokenCount: 0 } : {}),
      ...(snap.exists ? {} : { createdAt: nowIso }),
    });

    tx.set(ref, patch, { merge: true });
    return { allowed: true, userId };
  });
}

async function tryResolveUid(req: Request): Promise<string | null> {
  try {
    const ctx = await getServerAuthContext(req);
    return ctx.uid?.trim() || null;
  } catch (err) {
    if (err instanceof ServerAuthError) return null;
    throw err;
  }
}

function quotaReasonMessage(reason: QuotaCheckResult["reason"]): string {
  switch (reason) {
    case "daily_request_limit":
      return "คุณใช้งาน AI เกินโควต้ารายวันแล้ว กรุณาลองใหม่ภายหลัง";
    case "monthly_request_limit":
      return "คุณใช้งาน AI เกินโควต้ารายเดือนแล้ว กรุณาลองใหม่ภายหลัง";
    case "daily_token_limit":
      return "โควต้าโทเค็น AI รายวันของคุณเต็มแล้ว กรุณาลองใหม่ภายหลัง";
    case "monthly_token_limit":
      return "โควต้าโทเค็น AI รายเดือนของคุณเต็มแล้ว กรุณาลองใหม่ภายหลัง";
    default:
      return "คุณใช้งาน AI เกินโควต้าที่กำหนดแล้ว กรุณาลองใหม่ภายหลัง";
  }
}

function sendQuotaLimitResponse(res: Response, result: QuotaCheckResult): void {
  if (result.retryAfterSec && result.retryAfterSec > 0) {
    res.setHeader("Retry-After", String(result.retryAfterSec));
  }
  res.status(429).json({
    success: false,
    code: "AI_QUOTA_LIMITED",
    reason: result.reason ?? "quota_exceeded",
    message: quotaReasonMessage(result.reason),
  });
}

export interface FirestoreRateLimitRegisterOptions {
  /** When true, increment quota_usage request counts but never return 429. */
  monitoringOnly?: boolean;
}

let quotaMonitoringOnly = false;

/**
 * Express middleware — checks Firestore quota_usage before AI API requests.
 * Fail-open when disabled, unauthenticated, or Firestore unavailable.
 */
export async function firestoreRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isFirestoreQuotaLimitEnabled() || !isAiGuardedPath(req.path)) {
    next();
    return;
  }

  try {
    const uid = await tryResolveUid(req);
    if (!uid) {
      next();
      return;
    }

    if (quotaMonitoringOnly) {
      void recordQuotaRequest(uid).catch((err) => {
        console.warn("[firestore-rate-limit] monitoring record fail-open:", err);
      });
      next();
      return;
    }

    const result = await checkAndConsumeQuotaRequest(uid);
    if (!result.allowed) {
      sendQuotaLimitResponse(res, result);
      return;
    }
    next();
  } catch (err) {
    console.warn("[firestore-rate-limit] fail-open:", err);
    next();
  }
}

/** Opt-in registration — call from server bootstrap when Phase 2 quota gate is approved. */
export function registerFirestoreRateLimitMiddleware(
  app: Express,
  options?: FirestoreRateLimitRegisterOptions
): void {
  quotaMonitoringOnly = options?.monitoringOnly === true;
  app.use(firestoreRateLimitMiddleware);
}

export function setQuotaFirestoreForTests(db: FirestoreDbLike | null): void {
  firestoreOverride = db;
}

export function resetQuotaFirestoreForTests(): void {
  firestoreOverride = null;
}

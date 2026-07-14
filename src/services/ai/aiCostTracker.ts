/**
 * Phase 2 — On-demand Gemini token cost tracker (add-on module).
 * Persists usageMetadata into Firestore quota_usage/{userId}.
 * Errors are logged to logs/ai-cost-error.log — never throws to callers.
 */

import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { FieldValue } from "firebase-admin/firestore";
import { sanitizeFirestoreDocument } from "../../server/firestoreDocumentSanitize";
import { getServerFirestore } from "../../server/serverAuthContext";
import {
  isFirestoreQuotaLimitEnabled,
  QUOTA_USAGE_COLLECTION,
  readQuotaLimitConfig,
  type QuotaUsageDocument,
} from "../../server/middleware/rateLimit";

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

export interface RecordGeminiUsageInput {
  userId: string;
  modelId?: string;
  endpoint?: string;
  usageMetadata?: GeminiUsageMetadata | null;
  /** Convenience: pass full Gemini response; usageMetadata is read when present. */
  response?: { usageMetadata?: GeminiUsageMetadata | null } | null;
}

export interface ExtractedGeminiUsage {
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
  hasUsage: boolean;
}

type FirestoreDbLike = ReturnType<typeof getServerFirestore>;

let firestoreOverride: FirestoreDbLike | null = null;
let logRootOverride: string | null = null;

function resolveFirestore(): FirestoreDbLike {
  return firestoreOverride ?? getServerFirestore();
}

function nonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function extractGeminiUsageFromMetadata(
  usageMetadata?: GeminiUsageMetadata | null
): ExtractedGeminiUsage {
  const promptTokens = nonNegativeInt(usageMetadata?.promptTokenCount);
  const candidatesTokens = nonNegativeInt(usageMetadata?.candidatesTokenCount);
  const thoughtsTokens = nonNegativeInt(usageMetadata?.thoughtsTokenCount);
  const explicitTotal = nonNegativeInt(usageMetadata?.totalTokenCount);
  const computedTotal = promptTokens + candidatesTokens + thoughtsTokens;
  const totalTokens = explicitTotal > 0 ? explicitTotal : computedTotal;
  const hasUsage = totalTokens > 0;

  return {
    promptTokens,
    candidatesTokens,
    thoughtsTokens,
    totalTokens,
    hasUsage,
  };
}

export function resolveGeminiUsageMetadata(
  input: Pick<RecordGeminiUsageInput, "usageMetadata" | "response">
): GeminiUsageMetadata | null {
  if (input.usageMetadata) return input.usageMetadata;
  if (input.response?.usageMetadata) return input.response.usageMetadata;
  return null;
}

async function logAiCostError(
  scope: string,
  err: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const root = logRootOverride ?? process.cwd();
  const logPath = path.join(root, "logs", "ai-cost-error.log");
  const payload = {
    timestamp: new Date().toISOString(),
    scope,
    message: err instanceof Error ? err.message : String(err),
    context,
  };

  try {
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (logErr) {
    console.warn("[ai-cost-tracker] failed to write error log:", logErr);
  }
}

const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MONTHLY_WINDOW_MS = 30 * DAILY_WINDOW_MS;

function isoNow(now = Date.now()): string {
  return new Date(now).toISOString();
}

function applyTokenWindowResets(
  doc: Pick<
    QuotaUsageDocument,
    "dailyTokenCount" | "monthlyTokenCount" | "dailyWindowStart" | "monthlyWindowStart"
  >,
  nowMs: number,
  nowIso: string
): Pick<
  QuotaUsageDocument,
  "dailyTokenCount" | "monthlyTokenCount" | "dailyWindowStart" | "monthlyWindowStart"
> {
  const next = { ...doc };
  const dailyStart = Date.parse(doc.dailyWindowStart);
  const monthlyStart = Date.parse(doc.monthlyWindowStart);

  if (!Number.isFinite(dailyStart) || nowMs - dailyStart >= DAILY_WINDOW_MS) {
    next.dailyTokenCount = 0;
    next.dailyWindowStart = nowIso;
  }
  if (!Number.isFinite(monthlyStart) || nowMs - monthlyStart >= MONTHLY_WINDOW_MS) {
    next.monthlyTokenCount = 0;
    next.monthlyWindowStart = nowIso;
  }
  return next;
}

async function persistGeminiUsage(input: RecordGeminiUsageInput): Promise<void> {
  if (!isFirestoreQuotaLimitEnabled()) return;

  const userId = input.userId?.trim();
  if (!userId) return;

  const usageMetadata = resolveGeminiUsageMetadata(input);
  const usage = extractGeminiUsageFromMetadata(usageMetadata);
  if (!usage.hasUsage) return;

  const limits = readQuotaLimitConfig();
  const nowMs = Date.now();
  const nowIso = isoNow(nowMs);
  const db = resolveFirestore();
  const ref = db.collection(QUOTA_USAGE_COLLECTION).doc(userId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const raw = snap.exists ? snap.data() : undefined;
    const dailyWindowStart =
      typeof raw?.dailyWindowStart === "string" ? raw.dailyWindowStart : nowIso;
    const monthlyWindowStart =
      typeof raw?.monthlyWindowStart === "string" ? raw.monthlyWindowStart : nowIso;

    const windows = applyTokenWindowResets(
      {
        dailyTokenCount: nonNegativeInt(raw?.dailyTokenCount),
        monthlyTokenCount: nonNegativeInt(raw?.monthlyTokenCount),
        dailyWindowStart,
        monthlyWindowStart,
      },
      nowMs,
      nowIso
    );

    const patch = sanitizeFirestoreDocument({
      userId,
      dailyRequestLimit: limits.dailyRequestLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      dailyTokenLimit: limits.dailyTokenLimit,
      monthlyTokenLimit: limits.monthlyTokenLimit,
      dailyWindowStart: windows.dailyWindowStart,
      monthlyWindowStart: windows.monthlyWindowStart,
      promptTokens: FieldValue.increment(usage.promptTokens),
      candidatesTokens: FieldValue.increment(usage.candidatesTokens),
      thoughtsTokens: FieldValue.increment(usage.thoughtsTokens),
      totalTokens: FieldValue.increment(usage.totalTokens),
      dailyTokenCount: windows.dailyTokenCount + usage.totalTokens,
      monthlyTokenCount: windows.monthlyTokenCount + usage.totalTokens,
      updatedAt: nowIso,
      lastUsageAt: nowIso,
      ...(input.modelId ? { lastModelId: input.modelId } : {}),
      ...(input.endpoint ? { lastEndpoint: input.endpoint } : {}),
      ...(snap.exists ? {} : { createdAt: nowIso }),
    });

    tx.set(ref, patch, { merge: true });
  });
}

/**
 * On-demand hook — call after Gemini API responds.
 * Fire-and-forget; never blocks or throws to the caller.
 */
export function recordGeminiUsageFromResponse(input: RecordGeminiUsageInput): void {
  if (!isFirestoreQuotaLimitEnabled()) return;

  void persistGeminiUsage(input).catch((err) => {
    void logAiCostError("recordGeminiUsageFromResponse", err, {
      userId: input.userId,
      modelId: input.modelId,
      endpoint: input.endpoint,
    });
  });
}

/** Defensive wrapper — extra try/catch at call sites; must not affect user responses. */
export function tryRecordGeminiUsageFromResponse(input: RecordGeminiUsageInput): void {
  try {
    recordGeminiUsageFromResponse(input);
  } catch (err) {
    void logAiCostError("tryRecordGeminiUsageFromResponse", err, {
      userId: input.userId,
      modelId: input.modelId,
      endpoint: input.endpoint,
    });
  }
}

export function setAiCostFirestoreForTests(db: FirestoreDbLike | null): void {
  firestoreOverride = db;
}

export function setAiCostLogRootForTests(root: string | null): void {
  logRootOverride = root;
}

export function resetAiCostTrackerForTests(): void {
  firestoreOverride = null;
  logRootOverride = null;
}

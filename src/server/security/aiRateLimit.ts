import type { AbuseThreatLevel } from "./threatLevels";

export type AiRateActorType = "guest" | "signed-in" | "admin";

export interface AiRateLimitConfig {
  guestShortMax: number;
  guestDailyMax: number;
  userShortMax: number;
  userDailyMax: number;
  shortWindowMs: number;
  dailyWindowMs: number;
}

interface WindowState {
  count: number;
  windowStart: number;
}

interface ActorState {
  short: WindowState;
  daily: WindowState;
  violations: number;
  invalidAuthAttempts: number;
  blockedUntil: number;
  lastViolationAt: number;
}

const state = new Map<string, ActorState>();

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function readAiRateLimitConfig(): AiRateLimitConfig {
  return {
    guestShortMax: envInt("NONGA_AI_RL_GUEST_SHORT_MAX", 12),
    guestDailyMax: envInt("NONGA_AI_RL_GUEST_DAILY_MAX", 60),
    userShortMax: envInt("NONGA_AI_RL_USER_SHORT_MAX", 30),
    userDailyMax: envInt("NONGA_AI_RL_USER_DAILY_MAX", 200),
    shortWindowMs: envInt("NONGA_AI_RL_SHORT_WINDOW_MS", 60_000),
    dailyWindowMs: envInt("NONGA_AI_RL_DAILY_WINDOW_MS", 24 * 60 * 60 * 1000),
  };
}

export function isGuestAiDisabled(): boolean {
  return /^(1|true|yes|on)$/i.test(
    String(process.env.NONGA_AI_GUEST_DISABLED ?? "").trim()
  );
}

export function isAiEmergencyLockdown(): boolean {
  return /^(1|true|yes|on)$/i.test(
    String(process.env.NONGA_AI_EMERGENCY_LOCKDOWN ?? "").trim()
  );
}

function actorKey(actorType: AiRateActorType, id: string, bucket: string): string {
  return `${actorType}:${id}:${bucket}`;
}

function getOrCreateActor(key: string, now: number): ActorState {
  let actor = state.get(key);
  if (!actor) {
    actor = {
      short: { count: 0, windowStart: now },
      daily: { count: 0, windowStart: now },
      violations: 0,
      invalidAuthAttempts: 0,
      blockedUntil: 0,
      lastViolationAt: 0,
    };
    state.set(key, actor);
  }
  return actor;
}

function bumpWindow(
  window: WindowState,
  windowMs: number,
  now: number
): number {
  if (now - window.windowStart >= windowMs) {
    window.windowStart = now;
    window.count = 0;
  }
  window.count += 1;
  return window.count;
}

export function normalizeAiEndpointBucket(path: string): string {
  if (path.startsWith("/api/gemini/chat-stream")) return "gemini:chat-stream";
  if (path.startsWith("/api/gemini/chat")) return "gemini:chat";
  if (path.startsWith("/api/gemini/analyze-memory")) return "gemini:analyze-memory";
  if (path.startsWith("/api/gemini/generate-post")) return "gemini:generate-post";
  if (path.startsWith("/api/ai/vision/analyze")) return "ai:vision";
  if (path.startsWith("/api/ai/post-generator/questions")) {
    return "ai:post-generator:questions";
  }
  if (path.startsWith("/api/ai/post-generator/generate")) {
    return "ai:post-generator:generate";
  }
  if (path.startsWith("/api/ai/captions/trends")) return "ai:captions:trends";
  if (path.startsWith("/api/ai/captions/generate")) return "ai:captions:generate";
  if (path.startsWith("/api/ai/chat-user-visible-orchestrate")) {
    return "ai:chat-user-visible-orchestrate";
  }
  if (path.startsWith("/api/showroom/insights")) return "ai:showroom-insights";
  return "ai:other";
}

export function limitsForActor(
  actorType: AiRateActorType,
  config: AiRateLimitConfig
): { shortMax: number; dailyMax: number } {
  if (actorType === "admin") {
    return {
      shortMax: config.userShortMax * 4,
      dailyMax: config.userDailyMax * 4,
    };
  }
  if (actorType === "signed-in") {
    return { shortMax: config.userShortMax, dailyMax: config.userDailyMax };
  }
  return { shortMax: config.guestShortMax, dailyMax: config.guestDailyMax };
}

export interface AiRateLimitCheckResult {
  allowed: boolean;
  shortCount: number;
  dailyCount: number;
  shortMax: number;
  dailyMax: number;
  repeatViolations: number;
  invalidAuthAttempts: number;
  blockedUntil: number;
  threatLevelHint: AbuseThreatLevel;
}

export function recordInvalidAuthAttempt(
  actorType: AiRateActorType,
  actorId: string,
  bucket: string,
  now = Date.now()
): number {
  const key = actorKey(actorType, actorId, bucket);
  const actor = getOrCreateActor(key, now);
  actor.invalidAuthAttempts += 1;
  return actor.invalidAuthAttempts;
}

export function applyTemporaryBlock(
  actorType: AiRateActorType,
  actorId: string,
  bucket: string,
  blockMs: number,
  now = Date.now()
): void {
  const key = actorKey(actorType, actorId, bucket);
  const actor = getOrCreateActor(key, now);
  actor.blockedUntil = Math.max(actor.blockedUntil, now + blockMs);
  actor.violations += 1;
  actor.lastViolationAt = now;
}

function readWindowCount(
  window: WindowState,
  windowMs: number,
  now: number
): number {
  if (now - window.windowStart >= windowMs) {
    return 0;
  }
  return window.count;
}

export function peekAiRateLimit(params: {
  actorType: AiRateActorType;
  actorId: string;
  bucket: string;
  now?: number;
  config?: AiRateLimitConfig;
}): AiRateLimitCheckResult {
  const now = params.now ?? Date.now();
  const config = params.config ?? readAiRateLimitConfig();
  const key = actorKey(params.actorType, params.actorId, params.bucket);
  const actor = getOrCreateActor(key, now);
  const limits = limitsForActor(params.actorType, config);

  const shortCount = readWindowCount(actor.short, config.shortWindowMs, now);
  const dailyCount = readWindowCount(actor.daily, config.dailyWindowMs, now);
  const overShort = shortCount >= limits.shortMax;
  const overDaily = dailyCount >= limits.dailyMax;
  const blocked = actor.blockedUntil > now;
  const allowed = !blocked && shortCount < limits.shortMax && dailyCount < limits.dailyMax;

  return {
    allowed,
    shortCount,
    dailyCount,
    shortMax: limits.shortMax,
    dailyMax: limits.dailyMax,
    repeatViolations: actor.violations,
    invalidAuthAttempts: actor.invalidAuthAttempts,
    blockedUntil: actor.blockedUntil,
    threatLevelHint: overDaily ? 2 : overShort ? 2 : blocked ? 3 : 0,
  };
}

export function checkAndConsumeAiRateLimit(params: {
  actorType: AiRateActorType;
  actorId: string;
  bucket: string;
  now?: number;
  config?: AiRateLimitConfig;
}): AiRateLimitCheckResult {
  const now = params.now ?? Date.now();
  const config = params.config ?? readAiRateLimitConfig();
  const key = actorKey(params.actorType, params.actorId, params.bucket);
  const actor = getOrCreateActor(key, now);
  const limits = limitsForActor(params.actorType, config);

  const shortCount = bumpWindow(actor.short, config.shortWindowMs, now);
  const dailyCount = bumpWindow(actor.daily, config.dailyWindowMs, now);

  const overShort = shortCount > limits.shortMax;
  const overDaily = dailyCount > limits.dailyMax;

  if (overShort || overDaily) {
    actor.violations += 1;
    actor.lastViolationAt = now;
  }

  const blocked = actor.blockedUntil > now;
  const allowed = !blocked && !overShort && !overDaily;

  return {
    allowed,
    shortCount,
    dailyCount,
    shortMax: limits.shortMax,
    dailyMax: limits.dailyMax,
    repeatViolations: actor.violations,
    invalidAuthAttempts: actor.invalidAuthAttempts,
    blockedUntil: actor.blockedUntil,
    threatLevelHint: overDaily ? 2 : overShort ? 2 : blocked ? 3 : 0,
  };
}

/** Test-only reset */
export function resetAiRateLimitStateForTests(): void {
  state.clear();
}

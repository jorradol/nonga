/** v5.4.4e — abuse threat levels & enforcement actions (foundation) */

export type AbuseThreatLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type AbuseAction =
  | "allow"
  | "warn"
  | "soft_throttle"
  | "rate_limit"
  | "cooldown"
  | "temporary_block"
  | "hard_block_temp"
  | "permanent_block_candidate"
  | "emergency_lockdown"
  | "audit_only";

export interface ThreatDecision {
  level: AbuseThreatLevel;
  action: AbuseAction;
  reason: string;
  blockMs?: number;
  httpStatus?: 429 | 403;
}

export interface RateLimitViolationInput {
  bucket: string;
  window: "short" | "daily";
  count: number;
  limit: number;
  repeatViolations: number;
  invalidAuthAttempts: number;
  emergencyLockdown: boolean;
  guestAiDisabled: boolean;
  isGuest: boolean;
}

export function classifyRateLimitViolation(
  input: RateLimitViolationInput
): ThreatDecision {
  if (input.emergencyLockdown) {
    return {
      level: 5,
      action: "emergency_lockdown",
      reason: "emergency_lockdown_active",
      httpStatus: 403,
      blockMs: 60 * 60 * 1000,
    };
  }

  if (input.guestAiDisabled && input.isGuest) {
    return {
      level: 5,
      action: "emergency_lockdown",
      reason: "guest_ai_disabled",
      httpStatus: 403,
      blockMs: 15 * 60 * 1000,
    };
  }

  if (input.invalidAuthAttempts >= 8) {
    return {
      level: 4,
      action: "permanent_block_candidate",
      reason: "repeated_invalid_auth",
      httpStatus: 403,
      blockMs: 60 * 60 * 1000,
    };
  }

  if (input.invalidAuthAttempts >= 4) {
    return {
      level: 3,
      action: "hard_block_temp",
      reason: "invalid_auth_token_pattern",
      httpStatus: 403,
      blockMs: 30 * 60 * 1000,
    };
  }

  const ratio = input.limit > 0 ? input.count / input.limit : 1;

  if (input.count > input.limit) {
    if (input.repeatViolations >= 3) {
      return {
        level: 3,
        action: "hard_block_temp",
        reason: `rate_limit_${input.window}_repeat`,
        httpStatus: 429,
        blockMs: 20 * 60 * 1000,
      };
    }
    if (input.window === "daily") {
      return {
        level: 2,
        action: "cooldown",
        reason: "rate_limit_daily_exceeded",
        httpStatus: 429,
        blockMs: 30 * 60 * 1000,
      };
    }
    return {
      level: 2,
      action: "rate_limit",
      reason: "rate_limit_short_exceeded",
      httpStatus: 429,
      blockMs: 5 * 60 * 1000,
    };
  }

  if (ratio >= 0.85) {
    return {
      level: 1,
      action: "warn",
      reason: `rate_limit_${input.window}_near_limit`,
    };
  }

  return {
    level: 0,
    action: "allow",
    reason: "ok",
  };
}

export interface ShouldBlockRequestInput {
  now: number;
  temporaryBlockUntil?: number;
  decision: ThreatDecision;
}

export function shouldBlockRequest(input: ShouldBlockRequestInput): boolean {
  if (input.temporaryBlockUntil && input.temporaryBlockUntil > input.now) {
    return true;
  }
  const action = input.decision.action;
  if (
    action === "rate_limit" ||
    action === "cooldown" ||
    action === "hard_block_temp" ||
    action === "temporary_block" ||
    action === "emergency_lockdown" ||
    action === "permanent_block_candidate"
  ) {
    return input.decision.httpStatus != null;
  }
  return false;
}

export function userFacingThreatMessage(
  decision: ThreatDecision,
  retryAfterSec?: number
): string {
  if (decision.reason === "guest_ai_disabled") {
    return "ตอนนี้ระบบปิดการใช้งาน AI สำหรับผู้เยี่ยมชมชั่วคราวครับ กรุณาเข้าสู่ระบบแล้วลองใหม่อีกครั้ง";
  }
  if (decision.action === "emergency_lockdown") {
    return "ระบบอยู่ในโหมดป้องกันภัยคุกคามชั่วคราวครับ กรุณาลองใหม่อีกครั้งภายหลัง";
  }
  if (decision.httpStatus === 403) {
    return "ขออภัยครับ ระบบตรวจพบพฤติกรรมเสี่ยงชั่วคราว จึงจำเป็นต้องระงับการใช้งานส่วนนี้ชั่วคราว กรุณาลองใหม่อีกครั้งภายหลัง";
  }
  const retry =
    retryAfterSec && retryAfterSec > 0
      ? ` กรุณาลองใหม่อีกครั้งในอีกประมาณ ${Math.ceil(retryAfterSec / 60)} นาที`
      : " กรุณาลองใหม่อีกครั้งภายหลัง";
  return `ขอพักการใช้งานชั่วคราวนะครับ ระบบตรวจพบการใช้งานถี่เกินไป${retry}`;
}

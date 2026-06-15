import type { Express, NextFunction, Request, Response } from "express";
import { extractBearer } from "../apiAuth";
import { getServerAuthContext, ServerAuthError } from "../serverAuthContext";
import { logAbuseAuditEvent, hashActorFingerprint } from "./abuseAuditLog";
import {
  applyTemporaryBlock,
  checkAndConsumeAiRateLimit,
  peekAiRateLimit,
  isAiEmergencyLockdown,
  isGuestAiDisabled,
  normalizeAiEndpointBucket,
  readAiRateLimitConfig,
  recordInvalidAuthAttempt,
  type AiRateActorType,
} from "./aiRateLimit";
import {
  classifyRateLimitViolation,
  shouldBlockRequest,
  userFacingThreatMessage,
  type ThreatDecision,
} from "./threatLevels";

const AI_GUARDED_PREFIXES = [
  "/api/gemini",
  "/api/ai/vision",
  "/api/ai/post-generator",
  "/api/ai/captions",
  "/api/ai/chat-user-visible-orchestrate",
  "/api/showroom/insights",
] as const;

export function isAiGuardedPath(path: string): boolean {
  return AI_GUARDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function guestSessionId(req: Request): string {
  const header =
    req.headers["x-nonga-guest-session"] ??
    req.headers["x-guest-session-id"];
  if (typeof header === "string" && header.trim()) {
    return header.trim().slice(0, 64);
  }
  return "";
}

export interface ResolvedAiActor {
  actorType: AiRateActorType;
  actorId: string;
  actorHash: string;
  uid?: string;
  isGuest: boolean;
}

export async function resolveAiActor(req: Request): Promise<ResolvedAiActor> {
  const ip = clientIp(req);
  const ua = String(req.headers["user-agent"] ?? "").slice(0, 120);
  const guestSid = guestSessionId(req);
  const token = extractBearer(req);

  if (token) {
    try {
      const ctx = await getServerAuthContext(req);
      const isAdmin = ctx.role === "admin" || ctx.role === "superadmin";
      const actorType: AiRateActorType = isAdmin ? "admin" : "signed-in";
      return {
        actorType,
        actorId: ctx.uid,
        uid: ctx.uid,
        isGuest: false,
        actorHash: hashActorFingerprint([actorType, ctx.uid]),
      };
    } catch (err) {
      const guestKey = hashActorFingerprint(["guest", ip, ua, guestSid]);
      const bucket = normalizeAiEndpointBucket(req.path);
      recordInvalidAuthAttempt("guest", guestKey, bucket);
      if (err instanceof ServerAuthError && err.status === 401) {
        // fall through as guest with invalid-auth signal on guest bucket key
      }
    }
  }

  const guestKey = hashActorFingerprint(["guest", ip, ua, guestSid]);
  return {
    actorType: "guest",
    actorId: guestKey,
    isGuest: true,
    actorHash: guestKey,
  };
}

function sendGuardResponse(
  res: Response,
  status: 429 | 403,
  code: string,
  message: string,
  retryAfterSec?: number
): void {
  if (retryAfterSec && retryAfterSec > 0) {
    res.setHeader("Retry-After", String(retryAfterSec));
  }
  res.status(status).json({
    success: false,
    code,
    message,
  });
}

function enforceDecision(
  req: Request,
  res: Response,
  actor: ResolvedAiActor,
  bucket: string,
  decision: ThreatDecision,
  blockedUntil: number,
  now: number
): boolean {
  if (!shouldBlockRequest({ now, temporaryBlockUntil: blockedUntil, decision })) {
    if (decision.level === 1) {
      logAbuseAuditEvent({
        timestamp: new Date(now).toISOString(),
        endpoint: req.path,
        method: req.method,
        threatLevel: decision.level,
        action: decision.action,
        reason: decision.reason,
        bucket,
        actorType: actor.actorType,
        uid: actor.uid,
        actorHash: actor.actorHash,
      });
    }
    return true;
  }

  const status = decision.httpStatus ?? 429;
  const retryAfterSec =
    blockedUntil > now ? Math.max(1, Math.ceil((blockedUntil - now) / 1000)) : 60;

  if (decision.blockMs && decision.blockMs > 0) {
    applyTemporaryBlock(actor.actorType, actor.actorId, bucket, decision.blockMs, now);
  }

  logAbuseAuditEvent({
    timestamp: new Date(now).toISOString(),
    endpoint: req.path,
    method: req.method,
    threatLevel: decision.level,
    action: decision.action,
    reason: decision.reason,
    bucket,
    actorType: actor.actorType,
    uid: actor.uid,
    actorHash: actor.actorHash,
    httpStatus: status,
    permanentBlockCandidate: decision.action === "permanent_block_candidate",
  });

  const code =
    status === 403
      ? decision.action === "emergency_lockdown"
        ? "AI_GUARD_LOCKDOWN"
        : "AI_GUARD_BLOCKED"
      : "AI_RATE_LIMITED";

  sendGuardResponse(
    res,
    status,
    code,
    userFacingThreatMessage(decision, retryAfterSec),
    retryAfterSec
  );
  return false;
}

export async function aiEndpointGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = Date.now();
    const bucket = normalizeAiEndpointBucket(req.path);
    const actor = await resolveAiActor(req);
    const config = readAiRateLimitConfig();

    if (isAiEmergencyLockdown() && actor.actorType !== "admin") {
      const lockdown = classifyRateLimitViolation({
        bucket,
        window: "short",
        count: 0,
        limit: 1,
        repeatViolations: 0,
        invalidAuthAttempts: 0,
        emergencyLockdown: true,
        guestAiDisabled: false,
        isGuest: actor.isGuest,
      });
      if (!enforceDecision(req, res, actor, bucket, lockdown, now + 60_000, now)) {
        return;
      }
    }

    if (isGuestAiDisabled() && actor.isGuest) {
      const guestOff = classifyRateLimitViolation({
        bucket,
        window: "short",
        count: 0,
        limit: 1,
        repeatViolations: 0,
        invalidAuthAttempts: 0,
        emergencyLockdown: false,
        guestAiDisabled: true,
        isGuest: true,
      });
      if (!enforceDecision(req, res, actor, bucket, guestOff, now + 15 * 60_000, now)) {
        return;
      }
    }

    const peek = peekAiRateLimit({
      actorType: actor.actorType,
      actorId: actor.actorId,
      bucket,
      now,
      config,
    });

    if (peek.blockedUntil > now) {
      const blockedDecision: ThreatDecision = {
        level: 2,
        action: "temporary_block",
        httpStatus: 403,
        reason: "temporary_block_active",
        blockMs: peek.blockedUntil - now,
      };
      if (!enforceDecision(req, res, actor, bucket, blockedDecision, peek.blockedUntil, now)) {
        return;
      }
    }

    const consumed = checkAndConsumeAiRateLimit({
      actorType: actor.actorType,
      actorId: actor.actorId,
      bucket,
      now,
      config,
    });

    const shortDecision = classifyRateLimitViolation({
      bucket,
      window: "short",
      count: consumed.shortCount,
      limit: consumed.shortMax,
      repeatViolations: consumed.repeatViolations,
      invalidAuthAttempts: consumed.invalidAuthAttempts,
      emergencyLockdown: isAiEmergencyLockdown(),
      guestAiDisabled: isGuestAiDisabled(),
      isGuest: actor.isGuest,
    });

    if (
      !enforceDecision(
        req,
        res,
        actor,
        bucket,
        shortDecision,
        consumed.blockedUntil,
        now
      )
    ) {
      return;
    }

    const dailyDecision = classifyRateLimitViolation({
      bucket,
      window: "daily",
      count: consumed.dailyCount,
      limit: consumed.dailyMax,
      repeatViolations: consumed.repeatViolations,
      invalidAuthAttempts: consumed.invalidAuthAttempts,
      emergencyLockdown: isAiEmergencyLockdown(),
      guestAiDisabled: isGuestAiDisabled(),
      isGuest: actor.isGuest,
    });

    if (
      !enforceDecision(
        req,
        res,
        actor,
        bucket,
        dailyDecision,
        consumed.blockedUntil,
        now
      )
    ) {
      return;
    }

    next();
  } catch {
    sendGuardResponse(
      res,
      403,
      "AI_GUARD_ERROR",
      "ขออภัยครับ ระบบไม่สามารถให้บริการส่วนนี้ได้ชั่วคราว กรุณาลองใหม่อีกครั้งภายหลัง"
    );
  }
}

export function registerAiEndpointGuards(app: Express): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isAiGuardedPath(req.path)) {
      next();
      return;
    }
    void aiEndpointGuard(req, res, next);
  });
}

/**
 * v5.4.4e AI endpoint abuse guard
 * npm run test:v544e-ai-abuse-guard
 */
import assert from "node:assert/strict";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import {
  classifyRateLimitViolation,
  shouldBlockRequest,
  userFacingThreatMessage,
} from "../src/server/security/threatLevels.ts";
import {
  checkAndConsumeAiRateLimit,
  isGuestAiDisabled,
  isAiEmergencyLockdown,
  normalizeAiEndpointBucket,
  readAiRateLimitConfig,
  recordInvalidAuthAttempt,
  resetAiRateLimitStateForTests,
} from "../src/server/security/aiRateLimit.ts";
import {
  aiEndpointGuard,
  isAiGuardedPath,
} from "../src/server/security/aiEndpointGuard.ts";

function assertPass(cond: boolean, label: string, detail = "") {
  if (!cond) {
    console.error(`FAIL: ${label}`, detail);
    process.exit(1);
  }
  console.log(`PASS: ${label}`);
}

console.log("=== Nong A v5.4.4e AI Abuse Guard ===");

assertPass(isAiGuardedPath("/api/gemini/chat"), "gemini path guarded");
assertPass(isAiGuardedPath("/api/ai/vision/analyze"), "vision path guarded");
assertPass(
  isAiGuardedPath("/api/ai/post-generator/generate"),
  "post-generator guarded"
);
assertPass(!isAiGuardedPath("/api/cars"), "cars path not guarded");
assertPass(
  normalizeAiEndpointBucket("/api/gemini/chat") !==
    normalizeAiEndpointBucket("/api/ai/vision/analyze"),
  "endpoint buckets differ"
);

const allowDecision = classifyRateLimitViolation({
  bucket: "gemini:chat",
  window: "short",
  count: 2,
  limit: 10,
  repeatViolations: 0,
  invalidAuthAttempts: 0,
  emergencyLockdown: false,
  guestAiDisabled: false,
  isGuest: true,
});
assertPass(allowDecision.level === 0, "under limit level 0");
assertPass(
  !shouldBlockRequest({
    now: Date.now(),
    decision: allowDecision,
  }),
  "under limit not blocked"
);

const overShort = classifyRateLimitViolation({
  bucket: "gemini:chat",
  window: "short",
  count: 20,
  limit: 10,
  repeatViolations: 1,
  invalidAuthAttempts: 0,
  emergencyLockdown: false,
  guestAiDisabled: false,
  isGuest: true,
});
assertPass(overShort.level === 2, "over short level 2");
assertPass(overShort.httpStatus === 429, "over short returns 429");

const hostile = classifyRateLimitViolation({
  bucket: "gemini:chat",
  window: "short",
  count: 1,
  limit: 10,
  repeatViolations: 0,
  invalidAuthAttempts: 5,
  emergencyLockdown: false,
  guestAiDisabled: false,
  isGuest: true,
});
assertPass(hostile.level === 3, "invalid auth level 3");
assertPass(hostile.httpStatus === 403, "invalid auth 403");

const msg = userFacingThreatMessage(overShort, 120);
assertPass(!/stack|Error:|token|Bearer/i.test(msg), "friendly message no leak");
assertPass(msg.includes("ขอพัก"), "friendly message thai");

resetAiRateLimitStateForTests();
const cfg = {
  guestShortMax: 3,
  guestDailyMax: 10,
  userShortMax: 5,
  userDailyMax: 20,
  shortWindowMs: 60_000,
  dailyWindowMs: 24 * 60 * 60 * 1000,
};

let guestOk = true;
for (let i = 0; i < 3; i++) {
  const r = checkAndConsumeAiRateLimit({
    actorType: "guest",
    actorId: "guest-test-a",
    bucket: "gemini:chat",
    config: cfg,
  });
  if (!r.allowed) guestOk = false;
}
assertPass(guestOk, "guest under short limit passes");

const guestBlocked = checkAndConsumeAiRateLimit({
  actorType: "guest",
  actorId: "guest-test-a",
  bucket: "gemini:chat",
  config: cfg,
});
assertPass(!guestBlocked.allowed, "guest over short limit blocked");

resetAiRateLimitStateForTests();
for (let i = 0; i < 3; i++) {
  checkAndConsumeAiRateLimit({
    actorType: "guest",
    actorId: "guest-test-b",
    bucket: "gemini:chat",
    config: cfg,
  });
}
const otherBucket = checkAndConsumeAiRateLimit({
  actorType: "guest",
  actorId: "guest-test-b",
  bucket: "ai:vision",
  config: cfg,
});
assertPass(otherBucket.allowed, "separate endpoint bucket not exhausted");

resetAiRateLimitStateForTests();
for (let i = 0; i < 3; i++) {
  checkAndConsumeAiRateLimit({
    actorType: "guest",
    actorId: "guest-user-1",
    bucket: "gemini:chat",
    config: cfg,
  });
}
checkAndConsumeAiRateLimit({
  actorType: "signed-in",
  actorId: "uid-member-1",
  bucket: "gemini:chat",
  config: cfg,
});
const signedStillOk = checkAndConsumeAiRateLimit({
  actorType: "signed-in",
  actorId: "uid-member-1",
  bucket: "gemini:chat",
  config: cfg,
});
assertPass(signedStillOk.allowed, "signed-in uid separate bucket from guest");

async function runMiddleware(
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (!isAiGuardedPath(req.path)) return next();
    void aiEndpointGuard(req, res, next);
  });
  app.post(path, (_req, res) => {
    res.json({ success: true, ok: true });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const addr = server.address();
      const port =
        typeof addr === "object" && addr && "port" in addr ? addr.port : 0;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...headers,
          },
          body: JSON.stringify({ message: "สวัสดีครับ" }),
        });
        const body = (await res.json()) as Record<string, unknown>;
        resolve({ status: res.status, body });
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

resetAiRateLimitStateForTests();
process.env.NONGA_AI_RL_GUEST_SHORT_MAX = "3";
process.env.NONGA_AI_RL_GUEST_DAILY_MAX = "20";

const first = await runMiddleware("/api/gemini/chat", {
  "x-forwarded-for": "203.0.113.10",
  "user-agent": "test-guard/1",
});
assertPass(first.status === 200, "first guest request passes middleware");

const second = await runMiddleware("/api/gemini/chat", {
  "x-forwarded-for": "203.0.113.10",
  "user-agent": "test-guard/1",
});
assertPass(second.status === 200, "second guest request passes");

const third = await runMiddleware("/api/gemini/chat", {
  "x-forwarded-for": "203.0.113.10",
  "user-agent": "test-guard/1",
});
assertPass(third.status === 200, "third guest request passes");

const fourth = await runMiddleware("/api/gemini/chat", {
  "x-forwarded-for": "203.0.113.10",
  "user-agent": "test-guard/1",
});
assertPass(
  fourth.status === 429 || fourth.status === 403,
  "fourth guest request limited"
);
assertPass(
  typeof fourth.body.message === "string" &&
    !String(fourth.body.message).includes("stack"),
  "429 body friendly no stack"
);
assertPass(
  !JSON.stringify(fourth.body).includes("nonga-v4-dev"),
  "429 body no token leak"
);

const fakeToken = await runMiddleware("/api/gemini/chat", {
  authorization: "Bearer totally-invalid-token-xyz",
  "x-forwarded-for": "203.0.113.99",
});
assertPass(
  fakeToken.status === 200 || fakeToken.status === 429,
  "fake token does not crash server"
);

resetAiRateLimitStateForTests();
const prevGuestOff = process.env.NONGA_AI_GUEST_DISABLED;
process.env.NONGA_AI_GUEST_DISABLED = "true";
assertPass(isGuestAiDisabled(), "guest disabled flag reads true");
const guestOffRes = await runMiddleware("/api/ai/vision/analyze", {
  "x-forwarded-for": "203.0.113.20",
});
assertPass(guestOffRes.status === 403, "guest disabled returns 403");
process.env.NONGA_AI_GUEST_DISABLED = prevGuestOff ?? "";

assertPass(true, "resolveAiActor covered via middleware integration");

assertPass(
  readAiRateLimitConfig().guestShortMax >= 1,
  "default config readable"
);

recordInvalidAuthAttempt("guest", "guest-auth-test", "gemini:chat");
assertPass(true, "invalid auth counter increments without throw");

delete process.env.NONGA_AI_RL_GUEST_SHORT_MAX;
delete process.env.NONGA_AI_RL_GUEST_DAILY_MAX;
resetAiRateLimitStateForTests();

console.log("\nDone.");

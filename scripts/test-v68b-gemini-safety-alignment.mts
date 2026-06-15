/**
 * v6.8B — Gemini safety alignment (kill switch + orchestrate guard)
 * npm run test:v68b-gemini-safety-alignment
 */
import { readFileSync } from "node:fs";
import express from "express";
import {
  canInvokeLegacyGeminiProvider,
  getLegacyGeminiBlockReason,
  isLegacyGeminiEmergencyKillSwitchActive,
} from "../src/server/security/legacyGeminiSafety.ts";
import {
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  evaluateUserVisibleGate,
  isUidAllowlistedForUserVisible,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
} from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  aiEndpointGuard,
  isAiGuardedPath,
} from "../src/server/security/aiEndpointGuard.ts";
import {
  checkAndConsumeAiRateLimit,
  normalizeAiEndpointBucket,
  readAiRateLimitConfig,
  resetAiRateLimitStateForTests,
} from "../src/server/security/aiRateLimit.ts";

const ORCHESTRATE_PATH = "/api/ai/chat-user-visible-orchestrate";
const TEST_UID = "synthetic-v68b-allowlist-uid";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8B Gemini Safety Alignment ===\n");

ok(
  "kill switch off allows provider when client present",
  canInvokeLegacyGeminiProvider(true, (k) =>
    k === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV ? "false" : undefined
  )
);
ok(
  "kill switch on blocks provider even when client present",
  !canInvokeLegacyGeminiProvider(true, (k) =>
    k === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV ? "true" : undefined
  )
);
ok(
  "missing client blocks provider",
  !canInvokeLegacyGeminiProvider(false, (k) =>
    k === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV ? "false" : undefined
  )
);
ok(
  "kill switch block reason",
  getLegacyGeminiBlockReason(true, (k) =>
    k === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV ? "true" : undefined
  ) === "kill_switch"
);
ok(
  "missing provider block reason",
  getLegacyGeminiBlockReason(false) === "missing_provider"
);
ok(
  "isLegacyGeminiEmergencyKillSwitchActive parses true",
  isLegacyGeminiEmergencyKillSwitchActive((k) =>
    k === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV ? "true" : undefined
  )
);

ok(
  "orchestrate path guarded",
  isAiGuardedPath(ORCHESTRATE_PATH)
);
ok(
  "orchestrate bucket normalized",
  normalizeAiEndpointBucket(ORCHESTRATE_PATH) === "ai:chat-user-visible-orchestrate"
);
ok(
  "orchestrate bucket differs from gemini chat",
  normalizeAiEndpointBucket(ORCHESTRATE_PATH) !==
    normalizeAiEndpointBucket("/api/gemini/chat")
);

resetAiRateLimitStateForTests();
const cfg = readAiRateLimitConfig();
const bucket = normalizeAiEndpointBucket(ORCHESTRATE_PATH);
const signedId = "uid-v68b-signed-1";
let lastAllowed = true;
for (let i = 0; i < cfg.userShortMax + 2; i += 1) {
  const result = checkAndConsumeAiRateLimit({
    actorType: "signed-in",
    actorId: signedId,
    bucket,
    config: cfg,
  });
  lastAllowed = result.allowed;
}
ok(
  "signed-in orchestrate rate limit eventually blocks",
  !lastAllowed
);

async function runMiddlewareTwice(
  path: string
): Promise<{
  firstStatus: number;
  secondStatus: number;
  secondBody: Record<string, unknown>;
}> {
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
      const url = `http://127.0.0.1:${port}${path}`;
      const bodyJson = JSON.stringify({ userMessage: "หารถครับ" });
      try {
        const first = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: bodyJson,
        });
        const second = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: bodyJson,
        });
        const secondBody = (await second.json()) as Record<string, unknown>;
        resolve({
          firstStatus: first.status,
          secondStatus: second.status,
          secondBody,
        });
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

resetAiRateLimitStateForTests();
const guestOk = await runMiddlewareTwice(ORCHESTRATE_PATH);
ok("orchestrate middleware allows first guest request", guestOk.firstStatus === 200);

resetAiRateLimitStateForTests();
process.env.NONGA_AI_RL_GUEST_SHORT_MAX = "1";
const guestLimited = await runMiddlewareTwice(ORCHESTRATE_PATH);
delete process.env.NONGA_AI_RL_GUEST_SHORT_MAX;
ok(
  "orchestrate middleware rate limits guest",
  guestLimited.secondStatus === 429 ||
    guestLimited.secondBody.code === "AI_RATE_LIMITED"
);

const serverSrc = readFileSync("server.ts", "utf8");
ok(
  "server uses canUseLegacyGemini gate",
  /function canUseLegacyGemini\(\)/.test(serverSrc) &&
    serverSrc.includes("canInvokeLegacyGeminiProvider")
);
ok(
  "server no bare if (!ai) for gemini routes",
  !/if \(!ai\)/.test(serverSrc)
);
ok(
  "server imports legacyGeminiSafety",
  serverSrc.includes("legacyGeminiSafety")
);

const guardSrc = readFileSync("src/server/security/aiEndpointGuard.ts", "utf8");
ok(
  "aiEndpointGuard lists orchestrate prefix",
  guardSrc.includes("/api/ai/chat-user-visible-orchestrate")
);

const stagingEnv: Record<string, string> = {
  NONGA_AI_PROVIDER: "gemini",
  NONGA_AI_MODE: "high",
  NONGA_AI_FIRST_ENABLED: "true",
  NONGA_AI_USER_VISIBLE_ENABLED: "true",
  NONGA_AI_EMERGENCY_KILL_SWITCH: "false",
  NONGA_AI_BUDGET_DAILY_LIMIT: "5",
  NONGA_AI_BUDGET_MONTHLY_LIMIT: "50",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: TEST_UID,
};

ok(
  "allowlist uid still recognized",
  isUidAllowlistedForUserVisible(TEST_UID, (k) => stagingEnv[k])
);
const gate = evaluateUserVisibleGate({
  firebaseUid: TEST_UID,
  environment: "staging",
  env: stagingEnv,
});
ok(
  "allowlist gate still allows pilot uid",
  gate.effectiveUserVisibleAllowed
);
ok(
  "allowlist gate no legacy fallback when allowed",
  !gate.fallbackToLegacy
);

const envExample = readFileSync(".env.example", "utf8");
ok("env example documents NONGA_AI_EMERGENCY_KILL_SWITCH", envExample.includes("NONGA_AI_EMERGENCY_KILL_SWITCH"));
ok("env example documents allowlist uids", envExample.includes("NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS"));
ok(
  "env example no secret AIza pattern",
  !/AIza[a-zA-Z0-9_-]{20,}/.test(envExample)
);

console.log("\nDone v6.8B Gemini Safety Alignment tests.\n");

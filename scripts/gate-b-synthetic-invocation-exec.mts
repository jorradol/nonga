/**
 * v6.5S.EXEC — Gate B Synthetic Invocation Harness
 *
 * Default: dry-run (validate payload + guards — no network).
 * Live invoke: `--execute-approved` + GATE_B_SYNTHETIC_EXECUTION_APPROVED + GEMINI_API_KEY
 *               (requires HARNESS_NETWORK_EXECUTION_ENABLED — separate owner approval to run).
 *
 * NOT imported by App, user chat, live runtime, or admin shadow paths.
 *
 * npm run gate-b-synthetic-invocation-exec:dry-run
 * npm run gate-b-synthetic-invocation-exec:execute-approved  (owner-approved live invoke only)
 */
import { GoogleGenAI } from "@google/genai";
import type { AiControlSurfaceId } from "../src/config/aiControl/aiControlTypes.ts";
import {
  SYNTHETIC_REDACTION_FIXTURES,
  assertNoForbiddenSensitiveContent,
  assertNoReconstructableRawContent,
  assertSyntheticMetadataInvariants,
  buildSyntheticRedactedMetadataFixture,
  type SyntheticRedactedMetadataFixture,
} from "../src/services/ai/redactionTestFixtures.ts";

export const GATE_B_HARNESS_VERSION = "v6.5S.EXEC-harness-live";
export const GATE_B_SCENARIO_ID = "SYNTH_REDACTION_SCENARIO_001";
export const GATE_B_INVOCATION_CAP = 1;
export const GATE_B_GEMINI_MODEL = "gemini-3.5-flash";
export const GATE_B_SURFACE_ID: AiControlSurfaceId = "buyerFriendlyDetailPreview";
export const GATE_B_MAX_OUTPUT_TOKENS = 64;

/**
 * Live network path enabled after Gate B Live Invocation Patch.
 * Dry-run remains default; live invoke still requires CLI + approval env + API key.
 */
export const HARNESS_NETWORK_EXECUTION_ENABLED = true;

export const GATE_B_EXECUTION_APPROVAL_ENV = "GATE_B_SYNTHETIC_EXECUTION_APPROVED";

export type GateBHarnessMode = "dry-run" | "execute-approved";

export type GateBStopReasonCode =
  | "invocation_cap_exceeded"
  | "forbidden_content_in_payload"
  | "metadata_invariant_failed"
  | "reconstructable_metadata"
  | "user_visible_path_enabled"
  | "admin_shadow_real_provider_enabled"
  | "emergency_kill_switch_active"
  | "production_target"
  | "execution_not_authorized"
  | "network_execution_disabled"
  | "missing_execution_approval_env"
  | "missing_api_key"
  | "empty_prompt"
  | "provider_error";

export class GateBHarnessStopError extends Error {
  readonly code: GateBStopReasonCode;

  constructor(code: GateBStopReasonCode, message: string) {
    super(message);
    this.name = "GateBHarnessStopError";
    this.code = code;
  }
}

export const GATE_B_SYNTHETIC_PROMPT = `[SYNTHETIC STAGING READINESS CHECK — NOT REAL USER DATA]
Scenario: SYNTH_REDACTION_SCENARIO_001
Intent: SYNTH_INTENT_BUDGET_SEARCH
Vehicle category: SYNTH_VEHICLE_SEDAN
Region bucket: STAGING_REGION_A
Task: Reply with exactly one short acknowledgment line (under 20 words).
Do not reference real users, dealers, listings, prices, contact info, or vehicle identifiers.`;

export type GateBSyntheticPayload = {
  harnessVersion: typeof GATE_B_HARNESS_VERSION;
  scenarioId: typeof GATE_B_SCENARIO_ID;
  surfaceId: AiControlSurfaceId;
  prompt: string;
  allowedLabels: readonly string[];
  metadata: SyntheticRedactedMetadataFixture;
};

export type GateBRuntimeSwitchSnapshot = {
  userVisibleEnabled?: boolean;
  adminShadowRealProviderEnabled?: boolean;
  emergencyKillSwitch?: boolean;
  productionTarget?: boolean;
};

export type GateBValidationResult = {
  pass: boolean;
  stopReason?: GateBStopReasonCode;
  detail?: string;
};

export type GateBMetadataOnlyResult = {
  successFailureCategory: "success" | "failure" | "blocked" | "dry-run";
  modelId: typeof GATE_B_GEMINI_MODEL;
  latencyBucket: string;
  tokenEstimateBucket: string;
  costBucket: string;
  networkCallMade: false | true;
  invocationCount: number;
  redactionApplied: true;
};

export type GateBHarnessResult = {
  mode: GateBHarnessMode;
  harnessVersion: typeof GATE_B_HARNESS_VERSION;
  stopped: boolean;
  stopReason?: GateBStopReasonCode;
  validation: GateBValidationResult;
  payloadScenarioId: typeof GATE_B_SCENARIO_ID;
  metadataReport?: GateBMetadataOnlyResult;
  message: string;
};

export type GateBGeminiCaller = (
  payload: GateBSyntheticPayload,
  readEnv: (key: string) => string | undefined
) => Promise<GateBMetadataOnlyResult>;

let testGeminiCaller: GateBGeminiCaller | null = null;

export function setGateBGeminiCallerForTests(fn: GateBGeminiCaller | null): void {
  testGeminiCaller = fn;
}

export function resetGateBGeminiCallerForTests(): void {
  testGeminiCaller = null;
}

export function buildGateBSyntheticPayload(): GateBSyntheticPayload {
  return {
    harnessVersion: GATE_B_HARNESS_VERSION,
    scenarioId: GATE_B_SCENARIO_ID,
    surfaceId: GATE_B_SURFACE_ID,
    prompt: GATE_B_SYNTHETIC_PROMPT,
    allowedLabels: SYNTHETIC_REDACTION_FIXTURES.allowedSampleLabels,
    metadata: buildSyntheticRedactedMetadataFixture({
      syntheticScenarioId: GATE_B_SCENARIO_ID,
      guardDecisionCode: "GATE_B_SYNTH_GUARD_PRE_SEND",
      blockedReasonCode: "adapter_not_enabled",
      fallbackReasonCode: "deterministic_safety_disclaimer",
    }),
  };
}

export function validateGateBPayloadBeforeSend(
  payload: GateBSyntheticPayload
): GateBValidationResult {
  if (!payload.prompt.trim()) {
    return {
      pass: false,
      stopReason: "empty_prompt",
      detail: "Synthetic prompt must not be empty",
    };
  }

  const serialized = JSON.stringify({
    scenarioId: payload.scenarioId,
    surfaceId: payload.surfaceId,
    prompt: payload.prompt,
    allowedLabels: payload.allowedLabels,
    metadata: payload.metadata,
  });

  const forbidden = assertNoForbiddenSensitiveContent(serialized);
  if (!forbidden.pass) {
    return {
      pass: false,
      stopReason: "forbidden_content_in_payload",
      detail: forbidden.violations.map((v) => v.id).join(", "),
    };
  }

  const invariants = assertSyntheticMetadataInvariants(payload.metadata);
  if (!invariants.pass) {
    return {
      pass: false,
      stopReason: "metadata_invariant_failed",
      detail: invariants.failures.join("; "),
    };
  }

  const reconstructable = assertNoReconstructableRawContent(payload.metadata);
  if (!reconstructable.pass) {
    return {
      pass: false,
      stopReason: "reconstructable_metadata",
      detail: reconstructable.failures.join("; "),
    };
  }

  return { pass: true };
}

export function evaluateGateBHardStopConditions(input: {
  invocationCount: number;
  runtime?: GateBRuntimeSwitchSnapshot;
}): GateBValidationResult {
  if (input.invocationCount > GATE_B_INVOCATION_CAP) {
    return {
      pass: false,
      stopReason: "invocation_cap_exceeded",
      detail: `Cap is ${GATE_B_INVOCATION_CAP}`,
    };
  }

  const runtime = input.runtime;
  if (runtime?.userVisibleEnabled === true) {
    return {
      pass: false,
      stopReason: "user_visible_path_enabled",
      detail: "NONGA_AI_USER_VISIBLE_ENABLED must remain false",
    };
  }
  if (runtime?.adminShadowRealProviderEnabled === true) {
    return {
      pass: false,
      stopReason: "admin_shadow_real_provider_enabled",
      detail: "NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED must remain false",
    };
  }
  if (runtime?.emergencyKillSwitch === true) {
    return {
      pass: false,
      stopReason: "emergency_kill_switch_active",
      detail: "NONGA_AI_EMERGENCY_KILL_SWITCH must not be active",
    };
  }
  if (runtime?.productionTarget === true) {
    return {
      pass: false,
      stopReason: "production_target",
      detail: "Production target forbidden",
    };
  }

  return { pass: true };
}

function parseExecutionApprovalEnv(
  readEnv: (key: string) => string | undefined
): boolean {
  const raw = String(readEnv(GATE_B_EXECUTION_APPROVAL_ENV) ?? "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function latencyBucket(ms: number): string {
  if (ms < 500) return "<500ms";
  if (ms < 2000) return "500ms-2s";
  return ">2s";
}

export function tokenEstimateBucketFromUsage(usage?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}): string {
  const prompt = usage?.promptTokenCount;
  const candidates = usage?.candidatesTokenCount;
  if (prompt === undefined && candidates === undefined) {
    return "unknown-minimal";
  }
  return `${prompt ?? 0}-${candidates ?? 0}`;
}

function buildDryRunMetadataReport(): GateBMetadataOnlyResult {
  return {
    successFailureCategory: "dry-run",
    modelId: GATE_B_GEMINI_MODEL,
    latencyBucket: "0ms",
    tokenEstimateBucket: "0-0",
    costBucket: "zero",
    networkCallMade: false,
    invocationCount: 0,
    redactionApplied: true,
  };
}

function buildLiveMetadataReport(input: {
  success: boolean;
  latencyMs: number;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}): GateBMetadataOnlyResult {
  return {
    successFailureCategory: input.success ? "success" : "failure",
    modelId: GATE_B_GEMINI_MODEL,
    latencyBucket: latencyBucket(input.latencyMs),
    tokenEstimateBucket: tokenEstimateBucketFromUsage(input.usage),
    costBucket: "minimal-single-call",
    networkCallMade: true,
    invocationCount: 1,
    redactionApplied: true,
  };
}

/**
 * Isolated harness live provider invoke — metadata-only; never logs raw response body or secret.
 */
export async function invokeGateBProviderOnce(
  payload: GateBSyntheticPayload,
  readEnv: (key: string) => string | undefined
): Promise<GateBMetadataOnlyResult> {
  if (!HARNESS_NETWORK_EXECUTION_ENABLED) {
    throw new GateBHarnessStopError(
      "network_execution_disabled",
      "Harness network execution is disabled"
    );
  }

  if (testGeminiCaller) {
    return testGeminiCaller(payload, readEnv);
  }

  const apiKey = readEnv("GEMINI_API_KEY")?.trim();
  if (!apiKey) {
    throw new GateBHarnessStopError(
      "missing_api_key",
      "GEMINI_API_KEY missing (operator must supply at runtime — never log value)"
    );
  }

  const started = Date.now();
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: GATE_B_GEMINI_MODEL,
      contents: [{ text: payload.prompt }],
      config: { maxOutputTokens: GATE_B_MAX_OUTPUT_TOKENS },
    });

    const elapsed = Date.now() - started;
    // Response text intentionally discarded — metadata-only reporting.
    void String(response.text ?? "").length;

    return buildLiveMetadataReport({
      success: true,
      latencyMs: elapsed,
      usage: response.usageMetadata,
    });
  } catch (err) {
    const elapsed = Date.now() - started;
    throw new GateBHarnessStopError(
      "provider_error",
      `Provider call failed after ${latencyBucket(elapsed)}: ${
        err instanceof Error ? err.message.slice(0, 120) : "unknown"
      }`
    );
  }
}

export async function runGateBHarness(input: {
  mode?: GateBHarnessMode;
  invocationCount?: number;
  runtime?: GateBRuntimeSwitchSnapshot;
  readEnv?: (key: string) => string | undefined;
}): Promise<GateBHarnessResult> {
  const mode = input.mode ?? "dry-run";
  const invocationCount = input.invocationCount ?? 0;
  const readEnv = input.readEnv ?? (() => undefined);
  const payload = buildGateBSyntheticPayload();

  const capCheck = evaluateGateBHardStopConditions({
    invocationCount: mode === "execute-approved" ? invocationCount + 1 : invocationCount,
    runtime: input.runtime,
  });
  if (!capCheck.pass) {
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: true,
      stopReason: capCheck.stopReason,
      validation: capCheck,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      message: `Stopped: ${capCheck.stopReason}`,
    };
  }

  const validation = validateGateBPayloadBeforeSend(payload);
  if (!validation.pass) {
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: true,
      stopReason: validation.stopReason,
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      message: `Stopped: ${validation.stopReason}`,
    };
  }

  if (mode === "dry-run") {
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: false,
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      metadataReport: buildDryRunMetadataReport(),
      message: "Dry-run PASS — payload validated; no network call made",
    };
  }

  if (!parseExecutionApprovalEnv(readEnv)) {
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: true,
      stopReason: "missing_execution_approval_env",
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      message: `Stopped: set ${GATE_B_EXECUTION_APPROVAL_ENV} after separate owner execution approval`,
    };
  }

  if (!HARNESS_NETWORK_EXECUTION_ENABLED) {
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: true,
      stopReason: "network_execution_disabled",
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      message: "Stopped: harness network execution disabled",
    };
  }

  const apiKey = readEnv("GEMINI_API_KEY")?.trim();
  if (!apiKey) {
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: true,
      stopReason: "missing_api_key",
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      message: "Stopped: GEMINI_API_KEY missing (operator must supply at runtime — never log value)",
    };
  }

  try {
    const metadataReport = await invokeGateBProviderOnce(payload, readEnv);
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: false,
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      metadataReport,
      message: "Execution metadata captured — no raw response body logged",
    };
  } catch (err) {
    const code =
      err instanceof GateBHarnessStopError
        ? err.code
        : ("execution_not_authorized" as const);
    return {
      mode,
      harnessVersion: GATE_B_HARNESS_VERSION,
      stopped: true,
      stopReason: code,
      validation,
      payloadScenarioId: GATE_B_SCENARIO_ID,
      message: err instanceof Error ? err.message : "Execution stopped",
    };
  }
}

async function main(): Promise<void> {
  const executeApproved = process.argv.includes("--execute-approved");
  const mode: GateBHarnessMode = executeApproved ? "execute-approved" : "dry-run";

  const result = await runGateBHarness({
    mode,
    readEnv: (key) => process.env[key],
  });

  const safeOutput = {
    mode: result.mode,
    harnessVersion: result.harnessVersion,
    stopped: result.stopped,
    stopReason: result.stopReason,
    payloadScenarioId: result.payloadScenarioId,
    validationPass: result.validation.pass,
    metadataReport: result.metadataReport,
    message: result.message,
    networkExecutionEnabled: HARNESS_NETWORK_EXECUTION_ENABLED,
  };

  console.log(JSON.stringify(safeOutput, null, 2));

  if (result.stopped && mode === "execute-approved") {
    process.exitCode = 1;
  }
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("gate-b-synthetic-invocation-exec.mts") ||
    process.argv[1].endsWith("gate-b-synthetic-invocation-exec"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Harness failed",
        stopped: true,
      })
    );
    process.exitCode = 1;
  });
}

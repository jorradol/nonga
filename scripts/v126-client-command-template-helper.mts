/**
 * v12.6 client command template helper
 * Patch-only utilities: validate URL/port, build sanitized curl preview,
 * and classify curl/client status without endpoint execution.
 */

export const ADMIN_SHADOW_SMOKE_ENDPOINT = "/api/admin/sales-brain-shadow-smoke";

export type DispatchClassification = "yes" | "no_or_unknown";

export interface UrlValidationResult {
  ok: boolean;
  errors: string[];
  finalUrl?: string;
}

export interface BuildCommandTemplateInput {
  baseUrl: string;
  endpointPath?: string;
  caseId?: string;
}

export interface BuildCommandTemplateResult {
  ok: boolean;
  errors: string[];
  finalUrl?: string;
  sanitizedCommandPreview?: string;
  payloadPreview?: string;
}

function validateRawBasePort(baseUrl: string): string[] {
  const errors: string[] = [];
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    errors.push("base_url_missing_or_empty");
    return errors;
  }

  if (/\s/.test(trimmed)) {
    errors.push("base_url_contains_whitespace");
  }
  if (/['"]/.test(trimmed)) {
    errors.push("base_url_contains_quote");
  }

  const portMatch = trimmed.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*:([^/?#]*)/);
  if (!portMatch) return errors;

  const rawPort = portMatch[1] ?? "";
  if (!rawPort) {
    errors.push("port_empty");
    return errors;
  }
  if (!/^\d+$/.test(rawPort)) {
    errors.push("port_not_decimal");
    return errors;
  }
  const numeric = Number(rawPort);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 65535) {
    errors.push("port_out_of_range");
  }
  return errors;
}

export function validateAdminShadowSmokeUrl(input: {
  baseUrl: string;
  endpointPath?: string;
}): UrlValidationResult {
  const endpointPath = input.endpointPath ?? ADMIN_SHADOW_SMOKE_ENDPOINT;
  const errors = validateRawBasePort(input.baseUrl);
  if (endpointPath !== ADMIN_SHADOW_SMOKE_ENDPOINT) {
    errors.push("endpoint_path_not_allowed");
  }

  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");
  let parsed: URL | null = null;
  try {
    parsed = new URL(baseUrl);
  } catch {
    errors.push("base_url_parse_failed");
  }

  if (!parsed) {
    return { ok: false, errors };
  }

  if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
    errors.push("protocol_not_allowed");
  }
  if (!parsed.hostname) {
    errors.push("hostname_missing");
  }

  if (parsed.port) {
    if (!/^\d+$/.test(parsed.port)) {
      errors.push("port_not_decimal");
    } else {
      const n = Number(parsed.port);
      if (!Number.isInteger(n) || n < 0 || n > 65535) {
        errors.push("port_out_of_range");
      }
    }
  }

  const finalUrl = `${baseUrl}${endpointPath}`;
  let finalParsed: URL | null = null;
  try {
    finalParsed = new URL(finalUrl);
  } catch {
    errors.push("final_url_parse_failed");
  }
  if (finalParsed && finalParsed.pathname !== ADMIN_SHADOW_SMOKE_ENDPOINT) {
    errors.push("final_url_path_not_allowed");
  }

  return {
    ok: errors.length === 0,
    errors,
    finalUrl: errors.length === 0 ? finalUrl : undefined,
  };
}

function sanitizeTokenPreview(_raw: string): string {
  return "***MASKED***";
}

function quoteShell(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function buildSanitizedCurlCommandTemplate(
  input: BuildCommandTemplateInput
): BuildCommandTemplateResult {
  const validation = validateAdminShadowSmokeUrl({
    baseUrl: input.baseUrl,
    endpointPath: input.endpointPath,
  });
  if (!validation.ok || !validation.finalUrl) {
    return {
      ok: false,
      errors: validation.errors,
    };
  }

  const caseId = (input.caseId ?? "SS-01").trim() || "SS-01";
  const payloadPreview = JSON.stringify({ caseId });
  const cmd = [
    "curl",
    "-sS",
    "-X",
    "POST",
    quoteShell(validation.finalUrl),
    "-H",
    quoteShell("Content-Type: application/json"),
    "-H",
    quoteShell(`Authorization: Bearer ${sanitizeTokenPreview("")}`),
    "--data",
    quoteShell(payloadPreview),
  ].join(" ");

  return {
    ok: true,
    errors: [],
    finalUrl: validation.finalUrl,
    sanitizedCommandPreview: cmd,
    payloadPreview,
  };
}

export interface CurlStatusCaptureInput {
  curlExitCode: number;
  reportedHttpCode?: string | number | null;
  timeout?: boolean;
}

export interface CurlStatusCaptureResult {
  http_status: number | "not_available_client_error" | "not_available";
  curl_exit_code: number;
  timeout: boolean;
  request_dispatched: DispatchClassification;
}

function normalizeHttpStatus(value: string | number | null | undefined): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d{3}$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 100 || n > 599) return undefined;
  return n;
}

export function classifyCurlStatusCapture(
  input: CurlStatusCaptureInput
): CurlStatusCaptureResult {
  const timeout = Boolean(input.timeout);
  const http = normalizeHttpStatus(input.reportedHttpCode);

  if (input.curlExitCode !== 0) {
    return {
      http_status: "not_available_client_error",
      curl_exit_code: input.curlExitCode,
      timeout,
      request_dispatched: "no_or_unknown",
    };
  }

  return {
    http_status: http ?? "not_available",
    curl_exit_code: input.curlExitCode,
    timeout,
    request_dispatched: http ? "yes" : "no_or_unknown",
  };
}


import { createHash } from "node:crypto";
import type { AbuseAction, AbuseThreatLevel } from "./threatLevels";

export interface AbuseAuditEvent {
  timestamp: string;
  endpoint: string;
  method: string;
  threatLevel: AbuseThreatLevel;
  action: AbuseAction;
  reason: string;
  bucket: string;
  actorType: "guest" | "signed-in" | "admin";
  uid?: string;
  actorHash?: string;
  httpStatus?: number;
  permanentBlockCandidate?: boolean;
}

const FORBIDDEN_LOG_KEYS = /token|password|secret|authorization|base64|imageBase64|prompt|message/i;

export function hashActorFingerprint(parts: string[]): string {
  const raw = parts.filter(Boolean).join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function logAbuseAuditEvent(event: AbuseAuditEvent): void {
  const payload: Record<string, unknown> = {
    type: "nonga_abuse_audit",
    timestamp: event.timestamp,
    endpoint: event.endpoint,
    method: event.method,
    threatLevel: event.threatLevel,
    action: event.action,
    reason: event.reason,
    bucket: event.bucket,
    actorType: event.actorType,
    uid: event.uid ?? null,
    actorHash: event.actorHash ?? null,
    httpStatus: event.httpStatus ?? null,
    permanentBlockCandidate: event.permanentBlockCandidate ?? false,
  };

  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_LOG_KEYS.test(key)) {
      throw new Error(`abuse audit must not log sensitive field: ${key}`);
    }
  }

  console.log(JSON.stringify(payload));
}

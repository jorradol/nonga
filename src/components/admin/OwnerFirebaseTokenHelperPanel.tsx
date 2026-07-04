import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { getCurrentUserIdToken, getFirebaseAuthHeaders } from "../../services/auth/firebaseAuthHeaders";
import {
  evaluateOwnerFirebaseTokenHelperGate,
  isOwnerFirebaseTokenHelperEnabled,
  isOwnerGeminiOneRunHelperEnabled,
} from "../../config/ownerFirebaseTokenHelperGate";

const STATUS_CLEAR_MS = 7000;
const AUTH_ONLY_PROBE_ROUTE = "/api/admin/sales-brain-runtime-proof-skeleton";
const OWNER_GEMINI_ONE_RUN_ROUTE = "/api/ai/chat-user-visible-orchestrate";
const OWNER_GEMINI_ONE_RUN_SESSION_KEY =
  "nonga-owner-gemini-one-run-consumed-v1315n";
const SYNTHETIC_ONE_RUN_PROMPT =
  "สถานะ AI โหมดค้นหา: ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";
const SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT = {
  recentCarCards: [
    {
      index: 1,
      brand: "Toyota",
      model: "Yaris Ativ",
      year: 2020,
      price: 419000,
      mileage: 56000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "รถครอบครัวขนาดกะทัดรัด เน้นใช้งานในเมือง",
    },
    {
      index: 2,
      brand: "Honda",
      model: "City",
      year: 2020,
      price: 449000,
      mileage: 61000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "ห้องโดยสารนั่งสบาย เหมาะใช้เดินทางครอบครัว",
    },
  ],
  lastSearchBudgetMax: 500000,
} as const;

function maskUidForDisplay(value: unknown): string {
  const uid = typeof value === "string" ? value.trim() : "";
  if (!uid) return "***";
  if (uid.length <= 6) return "***";
  return `${uid.slice(0, 3)}...${uid.slice(-3)}`;
}

function formatMaskedAllowlistForDisplay(value: unknown): string {
  if (!Array.isArray(value)) return "unknown";
  const masked = value
    .map((entry) => maskUidForDisplay(entry))
    .filter((entry) => entry !== "");
  if (masked.length === 0) return "none";
  return masked.join(",");
}

function readBooleanField(value: unknown): string {
  if (typeof value !== "boolean") return "unknown";
  return value ? "true" : "false";
}

function readCountField(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  return String(Math.max(0, Math.floor(value)));
}

function isOneRunConsumedInSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(OWNER_GEMINI_ONE_RUN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markOneRunConsumedInSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(OWNER_GEMINI_ONE_RUN_SESSION_KEY, "1");
  } catch {
    // Ignore session storage errors and keep fail-closed behavior in memory only.
  }
}

export function OwnerFirebaseTokenHelperPanel() {
  const { isSignedIn, user } = useAuth();
  const [copyStatusText, setCopyStatusText] = useState("");
  const [probeStatusText, setProbeStatusText] = useState("");
  const [oneRunStatusText, setOneRunStatusText] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [isRunningOneRun, setIsRunningOneRun] = useState(false);

  const gate = useMemo(
    () =>
      evaluateOwnerFirebaseTokenHelperGate({
        isSignedIn,
        uid: user?.uid,
        role: user?.role,
        status: user?.status,
      }),
    [isSignedIn, user?.role, user?.status, user?.uid]
  );

  const helperFlagEnabled = isOwnerFirebaseTokenHelperEnabled();
  const oneRunHelperEnabled = isOwnerGeminiOneRunHelperEnabled();

  if (!gate.enabled) {
    return (
      <section
        className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1"
        data-testid="owner-firebase-token-helper-gate-diagnostic"
      >
        <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
          Owner helper hidden
        </p>
        <p className="text-[11px] text-amber-100/90">
          reason={gate.reason} | helperFlag={helperFlagEnabled ? "on" : "off"} |
          oneRunFlag={oneRunHelperEnabled ? "on" : "off"}
        </p>
      </section>
    );
  }

  const oneRunConsumed = isOneRunConsumedInSession();

  const handleCopyToken = async () => {
    if (isCopying) return;
    setIsCopying(true);
    setCopyStatusText("");
    try {
      const token = await getCurrentUserIdToken(true);
      if (!token) {
        setCopyStatusText("ไม่พบ signed-in Firebase session สำหรับ owner/admin ครับ");
        return;
      }
      await navigator.clipboard.writeText(token);
      setCopyStatusText("คัดลอก Firebase ID token ลง clipboard แล้ว (ไม่แสดงค่า)");
      window.setTimeout(() => setCopyStatusText(""), STATUS_CLEAR_MS);
    } catch {
      setCopyStatusText("คัดลอก token ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsCopying(false);
    }
  };

  const handleRunAuthOnlyProbe = async () => {
    if (isProbing) return;
    setIsProbing(true);
    setProbeStatusText("");
    try {
      const headers = await getFirebaseAuthHeaders({ forceRefresh: true });
      if (!("Authorization" in headers)) {
        setProbeStatusText("Auth-only probe ไม่ผ่าน: ไม่พบ signed-in Firebase token");
        return;
      }

      const response = await fetch(AUTH_ONLY_PROBE_ROUTE, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: "auth-only-probe" }),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const payload =
        data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      const nested =
        payload?.data && typeof payload.data === "object"
          ? (payload.data as Record<string, unknown>)
          : null;
      const statusText =
        typeof nested?.status === "string" ? nested.status : "unknown";
      const providerNetwork =
        typeof nested?.providerNetwork === "boolean"
          ? nested.providerNetwork
            ? "true"
            : "false"
          : "unknown";
      const geminiActivated =
        typeof nested?.geminiActivated === "boolean"
          ? nested.geminiActivated
            ? "true"
            : "false"
          : "unknown";
      const authPass = response.ok ? "pass" : "fail";

      setProbeStatusText(
        `Auth-only probe result: HTTP ${response.status} | auth=${authPass} | status=${statusText} | providerNetwork=${providerNetwork} | geminiActivated=${geminiActivated}`
      );
      window.setTimeout(() => setProbeStatusText(""), STATUS_CLEAR_MS);
    } catch {
      setProbeStatusText("Auth-only probe ไม่สำเร็จ (network/request error)");
    } finally {
      setIsProbing(false);
    }
  };

  const handleRunOwnerGeminiOneRun = async () => {
    if (!oneRunHelperEnabled) return;
    if (isRunningOneRun) return;
    if (isOneRunConsumedInSession()) {
      setOneRunStatusText(
        "One-run ถูกใช้แล้วใน session นี้ — ต้องใช้ owner approval รอบใหม่ก่อนรันอีกครั้ง"
      );
      return;
    }

    setIsRunningOneRun(true);
    setOneRunStatusText("");
    markOneRunConsumedInSession();

    try {
      const headers = await getFirebaseAuthHeaders({ forceRefresh: true });
      if (!("Authorization" in headers)) {
        setOneRunStatusText("One-run ไม่เริ่ม: ไม่พบ signed-in Firebase token");
        return;
      }

      const response = await fetch(OWNER_GEMINI_ONE_RUN_ROUTE, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userMessage: SYNTHETIC_ONE_RUN_PROMPT,
          pilotSessionContext: SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT,
        }),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const payload =
        data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      const nested =
        payload?.data && typeof payload.data === "object"
          ? (payload.data as Record<string, unknown>)
          : null;

      const authResult =
        response.status === 401 || response.status === 403
          ? "fail"
          : response.ok
            ? "pass"
            : "unknown";
      const pilotPathActive =
        typeof nested?.pilotPathActive === "boolean"
          ? nested.pilotPathActive
            ? "true"
            : "false"
          : "unknown";
      const fallbackToLegacy =
        typeof nested?.fallbackToLegacy === "boolean"
          ? nested.fallbackToLegacy
            ? "true"
            : "false"
          : "unknown";
      const skipGemini =
        typeof nested?.skipGemini === "boolean"
          ? nested.skipGemini
            ? "true"
            : "false"
          : "unknown";
      const carCardCount =
        typeof nested?.carCardCount === "number"
          ? String(nested.carCardCount)
          : "unknown";
      const realProviderNetwork =
        typeof nested?.realProviderNetwork === "boolean"
          ? nested.realProviderNetwork
            ? "true"
            : "false"
          : "unknown";
      const realProviderGateReason =
        typeof nested?.realProviderGateReason === "string"
          ? nested.realProviderGateReason
          : "unknown";
      const gateDiagnostic =
        nested?.userVisibleGateDiagnostic &&
        typeof nested.userVisibleGateDiagnostic === "object"
          ? (nested.userVisibleGateDiagnostic as Record<string, unknown>)
          : null;
      const requestUidMasked = maskUidForDisplay(gateDiagnostic?.requestUidMasked);
      const allowlistMasked = formatMaskedAllowlistForDisplay(
        gateDiagnostic?.allowlistMasked
      );
      const allowlistMatch = readBooleanField(gateDiagnostic?.allowlistMatch);
      const allowlistCount = readCountField(gateDiagnostic?.allowlistCount);
      const blockedReason =
        typeof gateDiagnostic?.blockedReason === "string"
          ? gateDiagnostic.blockedReason
          : "unknown";
      const gateReason =
        realProviderGateReason !== "unknown" ? realProviderGateReason : blockedReason;

      setOneRunStatusText(
        `One-run result: HTTP ${response.status} | auth=${authResult} | pilotPathActive=${pilotPathActive} | fallbackToLegacy=${fallbackToLegacy} | skipGemini=${skipGemini} | carCardCount=${carCardCount} | providerNetwork=${realProviderNetwork} | gateReason=${gateReason} | requestUidMasked=${requestUidMasked} | allowlistMasked=${allowlistMasked} | allowlistMatch=${allowlistMatch} | allowlistCount=${allowlistCount}`
      );
      window.setTimeout(() => setOneRunStatusText(""), STATUS_CLEAR_MS);
    } catch {
      setOneRunStatusText("One-run request failed (network/request error)");
    } finally {
      setIsRunningOneRun(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 space-y-3"
      data-testid="owner-firebase-token-helper-panel"
    >
      <div className="text-left">
        <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
          Owner-only Firebase auth helper
        </p>
        <p className="text-[11px] text-amber-100/90 mt-1">
          staging-only helper สำหรับ owner/admin ใช้คัดลอก Firebase ID token แบบ manual เท่านั้น
          โดยไม่แสดง token บนหน้าจอและไม่ log ค่า token
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopyToken}
        disabled={isCopying}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-500/30 disabled:opacity-70"
        data-testid="owner-firebase-token-helper-copy-button"
      >
        <KeyRound className="h-4 w-4" />
        {isCopying ? "กำลังคัดลอก token..." : "Copy Firebase ID token (force refresh)"}
      </button>
      <button
        type="button"
        onClick={handleRunAuthOnlyProbe}
        disabled={isProbing}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-500/30 disabled:opacity-70"
        data-testid="owner-firebase-auth-only-probe-button"
      >
        {isProbing ? "กำลังรัน auth-only probe..." : "Run auth-only probe (no Gemini)"}
      </button>
      {copyStatusText ? (
        <p
          className="text-[11px] text-amber-100/90"
          data-testid="owner-firebase-token-helper-copy-status"
        >
          {copyStatusText}
        </p>
      ) : null}
      {probeStatusText ? (
        <p
          className="text-[11px] text-amber-100/90"
          data-testid="owner-firebase-token-helper-probe-status"
        >
          {probeStatusText}
        </p>
      ) : null}
      {oneRunHelperEnabled ? (
        <>
          <p
            className="text-[11px] text-amber-100/90"
            data-testid="owner-gemini-one-run-reminder"
          >
            owner-only Gemini UX one-run ต้องได้รับ fresh owner authorization ก่อนกดทุกครั้ง
          </p>
          <button
            type="button"
            onClick={handleRunOwnerGeminiOneRun}
            disabled={isRunningOneRun || oneRunConsumed}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/20 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-500/30 disabled:opacity-70"
            data-testid="owner-gemini-ux-one-run-button"
          >
            {isRunningOneRun
              ? "กำลังรัน owner-only Gemini UX one-run..."
              : oneRunConsumed
                ? "Owner-only Gemini UX one-run used (session locked)"
                : "Run owner-only Gemini UX one-run (1/1)"}
          </button>
          {oneRunStatusText ? (
            <p
              className="text-[11px] text-amber-100/90"
              data-testid="owner-gemini-ux-one-run-status"
            >
              {oneRunStatusText}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

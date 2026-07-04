import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { getCurrentUserIdToken, getFirebaseAuthHeaders } from "../../services/auth/firebaseAuthHeaders";
import {
  evaluateOwnerFirebaseTokenHelperGate,
  isOwnerFirebaseTokenHelperEnabled,
  isOwnerGeminiOneRunHelperEnabled,
} from "../../config/ownerFirebaseTokenHelperGate";
import { buildOwnerOneRunEvidence, type OwnerOneRunEvidence } from "./ownerOneRunEvidence";

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
  const [oneRunEvidence, setOneRunEvidence] = useState<OwnerOneRunEvidence | null>(null);

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

      const payloadData =
        nested ??
        (payload &&
        (typeof payload.userVisibleText === "string" ||
          typeof payload.sanitizedUserVisibleText === "string")
          ? payload
          : null);
      const oneRunEvidenceResult = buildOwnerOneRunEvidence({
        responseStatus: response.status,
        payloadData,
        fallbackCapturedAtIso: new Date().toISOString(),
        runSessionLocked: true,
      });

      setOneRunStatusText(
        `One-run result: HTTP ${oneRunEvidenceResult.httpStatus} | auth=${oneRunEvidenceResult.auth} | pilotPathActive=${oneRunEvidenceResult.pilotPathActive} | fallbackToLegacy=${oneRunEvidenceResult.fallbackToLegacy} | skipGemini=${oneRunEvidenceResult.skipGemini} | carCardCount=${oneRunEvidenceResult.carCardCount} | providerNetwork=${oneRunEvidenceResult.providerNetwork} | gateReason=${oneRunEvidenceResult.gateReason} | answerChars=${oneRunEvidenceResult.answerCharCount} | missingAnswer=${oneRunEvidenceResult.userVisibleTextMissing ? "true" : "false"} | runtimeMode=${oneRunEvidenceResult.runtimeMode}`
      );
      setOneRunEvidence(oneRunEvidenceResult);
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
          {oneRunEvidence ? (
            <section
              className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 space-y-2"
              data-testid="owner-gemini-ux-one-run-evidence"
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                One-run evidence (sanitized)
              </p>
              <p className="text-[11px] text-amber-100/90">
                capturedAt={oneRunEvidence.capturedAtIso} | sessionLocked=
                {oneRunEvidence.runSessionLocked ? "true" : "false"} | noRetry=true |
                noSecondRunWithoutFreshApproval=true
              </p>
              <p className="text-[11px] text-amber-100/90">
                HTTP {oneRunEvidence.httpStatus} | auth={oneRunEvidence.auth} |
                pilotPathActive={oneRunEvidence.pilotPathActive} | fallbackToLegacy=
                {oneRunEvidence.fallbackToLegacy} | skipGemini={oneRunEvidence.skipGemini}
              </p>
              <p className="text-[11px] text-amber-100/90">
                providerNetwork={oneRunEvidence.providerNetwork} | gateReason=
                {oneRunEvidence.gateReason} | carCardCount={oneRunEvidence.carCardCount} |
                serverRecentCarCardsCount={oneRunEvidence.serverRecentCarCardsCount}
              </p>
              <p className="text-[11px] text-amber-100/90">
                runtimeMode={oneRunEvidence.runtimeMode} | userVisibleEnabled=
                {oneRunEvidence.userVisibleEnabled} | pilotContextPresent=
                {oneRunEvidence.pilotContextPresent} | pilotInactiveReason=
                {oneRunEvidence.pilotInactiveReason}
              </p>
              <p className="text-[11px] text-amber-100/90">
                requestUidMasked={oneRunEvidence.requestUidMasked} | allowlistMasked=
                {oneRunEvidence.allowlistMasked} | allowlistMatch=
                {oneRunEvidence.allowlistMatch} | allowlistCount=
                {oneRunEvidence.allowlistCount}
              </p>
              {oneRunEvidence.userVisibleTextMissing ? (
                <p
                  className="text-[11px] font-bold text-amber-200"
                  data-testid="owner-gemini-ux-one-run-answer-missing-warning"
                >
                  WARNING: answer text missing from one-run payload ({oneRunEvidence.userVisibleTextMissingReason}).
                  Hold quality verdict and request fresh owner approval before any new retest.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-amber-200">
                    userVisibleText (sanitized) | source={oneRunEvidence.answerFieldSource} | chars=
                    {oneRunEvidence.answerCharCount}
                  </p>
                  <p
                    className="text-[11px] text-amber-50/95 whitespace-pre-wrap"
                    data-testid="owner-gemini-ux-one-run-answer-text"
                  >
                    {oneRunEvidence.userVisibleTextSanitized}
                  </p>
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

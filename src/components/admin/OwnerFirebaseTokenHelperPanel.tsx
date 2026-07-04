import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { getCurrentUserIdToken, getFirebaseAuthHeaders } from "../../services/auth/firebaseAuthHeaders";
import { evaluateOwnerFirebaseTokenHelperGate } from "../../config/ownerFirebaseTokenHelperGate";

const STATUS_CLEAR_MS = 7000;
const AUTH_ONLY_PROBE_ROUTE = "/api/admin/sales-brain-runtime-proof-skeleton";

export function OwnerFirebaseTokenHelperPanel() {
  const { isSignedIn, user } = useAuth();
  const [copyStatusText, setCopyStatusText] = useState("");
  const [probeStatusText, setProbeStatusText] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [isProbing, setIsProbing] = useState(false);

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

  if (!gate.enabled) return null;

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
    </section>
  );
}

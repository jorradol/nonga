import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { getCurrentUserIdToken } from "../../services/auth/firebaseAuthHeaders";
import { evaluateOwnerFirebaseTokenHelperGate } from "../../config/ownerFirebaseTokenHelperGate";

const STATUS_CLEAR_MS = 7000;

export function OwnerFirebaseTokenHelperPanel() {
  const { isSignedIn, user } = useAuth();
  const [statusText, setStatusText] = useState("");
  const [isCopying, setIsCopying] = useState(false);

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
    setStatusText("");
    try {
      const token = await getCurrentUserIdToken(true);
      if (!token) {
        setStatusText("ไม่พบ signed-in Firebase session สำหรับ owner/admin ครับ");
        return;
      }
      await navigator.clipboard.writeText(token);
      setStatusText("คัดลอก Firebase ID token ลง clipboard แล้ว (ไม่แสดงค่า)");
      window.setTimeout(() => setStatusText(""), STATUS_CLEAR_MS);
    } catch {
      setStatusText("คัดลอก token ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsCopying(false);
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
      {statusText ? (
        <p
          className="text-[11px] text-amber-100/90"
          data-testid="owner-firebase-token-helper-status"
        >
          {statusText}
        </p>
      ) : null}
    </section>
  );
}

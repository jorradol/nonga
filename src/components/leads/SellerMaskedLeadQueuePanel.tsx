import { useCallback, useEffect, useState } from "react";
import { Users, Loader2, AlertCircle, SkipForward, PhoneOff } from "lucide-react";
import type { SellerMaskedQueueEntry, SellerSkipReason } from "../../services/leads/leadTypes";
import {
  fetchSellerMaskedLeadQueue,
  skipSellerQueueLead,
} from "../../services/leads/sellerLeadQueueApi";
import { SELLER_SKIP_REASON_OPTIONS } from "../../services/leads/sellerSkipQueuePolicy";
import { formatPurchaseMethodLabel } from "../../services/leads/buyerLeadPreview";

type Props = {
  listingId: string;
  isDarkMode?: boolean;
};

const actionBtnBase =
  "w-full min-h-[2.5rem] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-left sm:text-center";

export function SellerMaskedLeadQueuePanel({ listingId, isDarkMode = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<SellerMaskedQueueEntry[]>([]);
  const [interestCount, setInterestCount] = useState(0);
  const [skipLeadId, setSkipLeadId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<SellerSkipReason>("offer_below_expectation");
  const [skipNote, setSkipNote] = useState("");
  const [skipSubmitting, setSkipSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchSellerMaskedLeadQueue(listingId);
    if (result.ok === false) {
      setEntries([]);
      setInterestCount(0);
      setError(result.message);
    } else {
      setEntries(result.entries);
      setInterestCount(result.interestCount);
    }
    setLoading(false);
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const panelBorder = isDarkMode ? "border-slate-700/80 bg-slate-950/50" : "border-slate-200 bg-slate-50";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";

  const handleSkipConfirm = async () => {
    if (!skipLeadId) return;
    setSkipSubmitting(true);
    const result = await skipSellerQueueLead({
      leadId: skipLeadId,
      reason: skipReason,
      note: skipReason === "other" ? skipNote : undefined,
    });
    setSkipSubmitting(false);
    if (result.ok === false) {
      setError(result.message);
      return;
    }
    setSkipLeadId(null);
    setSkipNote("");
    await load();
  };

  if (loading) {
    return (
      <div
        className={`mt-3 w-full min-w-0 p-3 rounded-xl border flex items-center gap-2 text-xs ${panelBorder}`}
        data-testid="seller-lead-queue-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
        <span className={muted}>กำลังโหลดคิวผู้สนใจ…</span>
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div
        className={`mt-3 w-full min-w-0 p-3 rounded-xl border space-y-2 text-xs ${panelBorder}`}
        data-testid="seller-lead-queue-error"
      >
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className={muted}>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-2.5 py-1 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
          data-testid="seller-lead-queue-retry"
        >
          ลองโหลดใหม่
        </button>
      </div>
    );
  }

  if (interestCount <= 0 && entries.length === 0) {
    return null;
  }

  if (entries.length === 0) {
    return (
      <div
        className={`mt-3 w-full min-w-0 p-3 rounded-xl border text-xs ${panelBorder}`}
        data-testid="seller-lead-queue-empty"
      >
        <p className={`${muted} mb-1`}>
          มีผู้สนใจ {interestCount} คน — กำลังเตรียมข้อมูลคิวให้ดู
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-2.5 py-1 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          รีเฟรชคิว
        </button>
      </div>
    );
  }

  return (
    <div
      className={`mt-3 w-full min-w-0 rounded-xl border ${panelBorder}`}
      data-testid="seller-lead-queue-panel"
      data-layout="seller-lead-queue-vertical"
    >
      <div className="px-3 py-2 border-b border-slate-700/50 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 shrink-0">
          <Users className="w-4 h-4 shrink-0" />
          คิวผู้สนใจ ({interestCount} คน)
        </div>
        <span className={`text-[10px] leading-snug ${muted}`}>
          ข้อมูลแบบคัดกรอง — ยังไม่เปิดเบอร์
        </span>
      </div>

      {error ? (
        <p className="px-3 py-2 text-[11px] text-amber-400 border-b border-slate-800/60">{error}</p>
      ) : null}

      <ul className="divide-y divide-slate-800/80">
        {entries.map((entry) => (
          <li
            key={entry.leadId}
            className="px-3 py-3 flex flex-col gap-3 min-w-0"
            data-testid={`seller-lead-queue-row-${entry.queuePosition}`}
          >
            <div className="space-y-2 min-w-0">
              <p className="text-sm font-semibold break-words">{entry.displayName}</p>
              <dl className={`grid grid-cols-1 gap-2 text-[11px] ${muted}`}>
                <div className="min-w-0">
                  <dt className="text-slate-500 mb-0.5">วิธีซื้อ</dt>
                  <dd className="break-words">{formatPurchaseMethodLabel(entry.purchaseMethod)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500 mb-0.5">งบ/ราคาเสนอ</dt>
                  <dd className="break-words">{entry.budgetLabel}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500 mb-0.5">เวลาที่สะดวก</dt>
                  <dd className="break-words">{entry.preferredContactWindow}</dd>
                </div>
              </dl>
              <p className={`text-[11px] leading-relaxed break-words ${muted}`}>{entry.buyerSummary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 shrink-0">
                คิวที่ {entry.queuePosition}
              </span>
              {entry.isCurrentSellerTurn ? (
                <span className="text-[10px] font-bold text-green-400">ถึงคิวของคุณ</span>
              ) : (
                <span className={`text-[10px] ${muted}`}>{entry.waitingReason}</span>
              )}
            </div>

            <div
              className="flex flex-col gap-2 w-full min-w-0 pt-1 border-t border-slate-800/60"
              data-testid={`seller-lead-queue-actions-${entry.queuePosition}`}
              data-layout="seller-lead-queue-actions-column"
            >
              <button
                type="button"
                disabled
                title="ยังไม่เปิดในรอบ staging นี้"
                className={`${actionBtnBase} border border-slate-700 text-slate-500 cursor-not-allowed opacity-70 shrink-0`}
                data-testid={`seller-lead-reveal-btn-${entry.queuePosition}`}
              >
                <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                <span className="break-words">เปิดข้อมูลติดต่อ — ยังไม่เปิดในรอบนี้</span>
              </button>
              <button
                type="button"
                disabled={!entry.canSkip}
                onClick={() => {
                  setSkipReason("offer_below_expectation");
                  setSkipNote("");
                  setSkipLeadId(entry.leadId);
                }}
                className={`${actionBtnBase} border border-orange-500/40 text-orange-200 hover:bg-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0`}
                data-testid={`seller-lead-skip-btn-${entry.queuePosition}`}
              >
                <SkipForward className="w-3.5 h-3.5 shrink-0" />
                <span>ข้ามคิวนี้</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {skipLeadId ? (
        <div
          className="relative z-10 px-3 py-4 border-t-2 border-orange-500/30 bg-slate-900/90 space-y-3 rounded-b-xl"
          data-testid="seller-lead-skip-form"
          data-layout="seller-lead-queue-skip-form-block"
        >
          <p className="text-xs font-bold text-slate-200">ข้ามคิวนี้ (ยังไม่เปิดเบอร์)</p>
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="sr-only">เหตุผลการข้ามคิว</legend>
            {SELLER_SKIP_REASON_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2.5 text-[11px] text-slate-300 cursor-pointer py-1 min-h-[1.75rem]"
              >
                <input
                  type="radio"
                  name={`skip-reason-${listingId}`}
                  checked={skipReason === opt.value}
                  onChange={() => setSkipReason(opt.value)}
                  className="mt-0.5 shrink-0"
                />
                <span className="break-words leading-snug">{opt.label}</span>
              </label>
            ))}
          </fieldset>
          {skipReason === "other" ? (
            <textarea
              value={skipNote}
              onChange={(e) => setSkipNote(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="ระบุเหตุผลสั้น ๆ (สุภาพ)"
              className="block w-full min-h-[4.5rem] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 resize-y"
              data-testid="seller-lead-skip-note"
            />
          ) : null}
          <div
            className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap pt-1"
            data-testid="seller-lead-skip-form-actions"
          >
            <button
              type="button"
              disabled={
                skipSubmitting ||
                (skipReason === "other" && skipNote.trim().length < 2)
              }
              onClick={() => void handleSkipConfirm()}
              className={`${actionBtnBase} sm:w-auto sm:min-w-[8rem] bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid="seller-lead-skip-confirm"
            >
              {skipSubmitting ? "กำลังบันทึก…" : "ยืนยันข้ามคิว"}
            </button>
            <button
              type="button"
              disabled={skipSubmitting}
              onClick={() => setSkipLeadId(null)}
              className={`${actionBtnBase} sm:w-auto sm:min-w-[5rem] border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50`}
              data-testid="seller-lead-skip-cancel"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

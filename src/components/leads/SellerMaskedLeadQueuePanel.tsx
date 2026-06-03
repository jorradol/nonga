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
        className={`mt-3 p-3 rounded-xl border flex items-center gap-2 text-xs ${panelBorder}`}
        data-testid="seller-lead-queue-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
        <span className={muted}>กำลังโหลดคิวผู้สนใจ…</span>
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div
        className={`mt-3 p-3 rounded-xl border flex gap-2 text-xs ${panelBorder}`}
        data-testid="seller-lead-queue-error"
      >
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className={muted}>{error}</span>
      </div>
    );
  }

  if (interestCount <= 0 && entries.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-3 rounded-xl border overflow-hidden ${panelBorder}`}
      data-testid="seller-lead-queue-panel"
    >
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
          <Users className="w-4 h-4" />
          คิวผู้สนใจ ({interestCount} คน)
        </div>
        <span className={`text-[10px] ${muted}`}>ข้อมูลแบบคัดกรอง — ยังไม่เปิดเบอร์</span>
      </div>

      {error ? (
        <p className="px-3 py-2 text-[11px] text-amber-400">{error}</p>
      ) : null}

      <ul className="divide-y divide-slate-800/80">
        {entries.map((entry) => (
          <li
            key={entry.leadId}
            className="px-3 py-3 space-y-2"
            data-testid={`seller-lead-queue-row-${entry.queuePosition}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">
                คิวที่ {entry.queuePosition}
              </span>
              {entry.isCurrentSellerTurn ? (
                <span className="text-[10px] font-bold text-green-400">ถึงคิวของคุณ</span>
              ) : (
                <span className={`text-[10px] ${muted}`}>{entry.waitingReason}</span>
              )}
            </div>
            <p className="text-sm font-semibold">{entry.displayName}</p>
            <dl className={`grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] ${muted}`}>
              <div>
                <dt className="text-slate-500">วิธีซื้อ</dt>
                <dd>{formatPurchaseMethodLabel(entry.purchaseMethod)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">งบ/ราคาเสนอ</dt>
                <dd>{entry.budgetLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">เวลาที่สะดวก</dt>
                <dd>{entry.preferredContactWindow}</dd>
              </div>
            </dl>
            <p className={`text-[11px] leading-relaxed ${muted}`}>{entry.buyerSummary}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={!entry.canSkip}
                onClick={() => {
                  setSkipReason("offer_below_expectation");
                  setSkipNote("");
                  setSkipLeadId(entry.leadId);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid={`seller-lead-skip-btn-${entry.queuePosition}`}
              >
                <SkipForward className="w-3.5 h-3.5" />
                ข้ามคิวนี้
              </button>
              <button
                type="button"
                disabled
                title="ยังไม่เปิดในรอบ staging นี้"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 text-[11px] font-semibold cursor-not-allowed opacity-60"
                data-testid={`seller-lead-reveal-btn-${entry.queuePosition}`}
              >
                <PhoneOff className="w-3.5 h-3.5" />
                เปิดข้อมูลติดต่อ
              </button>
            </div>
          </li>
        ))}
      </ul>

      {skipLeadId ? (
        <div
          className="px-3 py-3 border-t border-slate-700/80 bg-slate-900/80 space-y-3"
          data-testid="seller-lead-skip-form"
        >
          <p className="text-xs font-bold text-slate-200">ข้ามคิวนี้ (ยังไม่เปิดเบอร์)</p>
          <fieldset className="space-y-1.5">
            {SELLER_SKIP_REASON_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`skip-reason-${listingId}`}
                  checked={skipReason === opt.value}
                  onChange={() => setSkipReason(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
          {skipReason === "other" ? (
            <textarea
              value={skipNote}
              onChange={(e) => setSkipNote(e.target.value)}
              maxLength={120}
              rows={2}
              placeholder="ระบุเหตุผลสั้น ๆ (สุภาพ)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
              data-testid="seller-lead-skip-note"
            />
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={skipSubmitting}
              onClick={() => void handleSkipConfirm()}
              className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold disabled:opacity-50"
              data-testid="seller-lead-skip-confirm"
            >
              {skipSubmitting ? "กำลังบันทึก…" : "ยืนยันข้ามคิว"}
            </button>
            <button
              type="button"
              disabled={skipSubmitting}
              onClick={() => setSkipLeadId(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

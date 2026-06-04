import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Loader2,
  AlertCircle,
  SkipForward,
  Phone,
  Shield,
} from "lucide-react";
import type { LeadContactOutcome, SellerMaskedQueueEntry, SellerSkipReason } from "../../services/leads/leadTypes";
import {
  fetchSellerMaskedLeadQueue,
  recordSellerQueueOutcome,
  revealSellerQueueLead,
  skipSellerQueueLead,
} from "../../services/leads/sellerLeadQueueApi";
import {
  SELLER_QUEUE_NO_LEADS_MESSAGE,
  SELLER_QUEUE_SYNC_MISMATCH_MESSAGE,
  shouldHideSellerQueuePanel,
} from "../../services/leads/sellerLeadQueuePanelMessages";
import { SELLER_SKIP_REASON_OPTIONS } from "../../services/leads/sellerSkipQueuePolicy";
import {
  SELLER_REVEAL_CONFIRM_MESSAGE,
  SELLER_REVEAL_OUTCOME_OPTIONS,
  SELLER_REVEAL_PRIVACY_NOTICE,
  SELLER_REVEAL_WAITING_PREVIOUS,
} from "../../services/leads/sellerLeadRevealCopy";
import { formatPurchaseMethodLabel } from "../../services/leads/buyerLeadPreview";

type Props = {
  listingId: string;
  /** My Listings page — owner/dealer context; map 403 to sync/empty not forbidden. */
  isListingOwnerContext?: boolean;
  isDarkMode?: boolean;
};

type PanelView = "hidden" | "checking" | "loading" | "queue" | "notice";

const actionBtnBase =
  "w-full min-h-[2.5rem] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-left sm:text-center";

export function SellerMaskedLeadQueuePanel({
  listingId,
  isListingOwnerContext = false,
  isDarkMode = true,
}: Props) {
  const [view, setView] = useState<PanelView>("checking");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<SellerMaskedQueueEntry[]>([]);
  const [interestCount, setInterestCount] = useState(0);
  const [skipLeadId, setSkipLeadId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<SellerSkipReason>("offer_below_expectation");
  const [skipNote, setSkipNote] = useState("");
  const [skipSubmitting, setSkipSubmitting] = useState(false);
  const [revealConfirmLeadId, setRevealConfirmLeadId] = useState<string | null>(null);
  const [revealSubmitting, setRevealSubmitting] = useState(false);
  const [outcomeLeadId, setOutcomeLeadId] = useState<string | null>(null);
  const [outcomeValue, setOutcomeValue] = useState<LeadContactOutcome>("contacting");
  const [outcomeSubmitting, setOutcomeSubmitting] = useState(false);

  const load = useCallback(async () => {
    setView((v) => (v === "checking" ? "checking" : "loading"));
    setError(null);
    setNotice(null);

    const result = await fetchSellerMaskedLeadQueue(listingId, {
      isListingOwnerContext,
    });

    if (result.ok === false) {
      setEntries([]);
      setInterestCount(result.interestCount);
      if (
        shouldHideSellerQueuePanel({
          interestCount: result.interestCount,
          entryCount: 0,
          errorKind: result.errorKind,
          hidePanel: result.hidePanel,
        })
      ) {
        setView("hidden");
        return;
      }
      setNotice(result.message);
      setView("notice");
      return;
    }

    setEntries(result.entries);
    setInterestCount(result.interestCount);

    if (result.interestCount <= 0 && result.entries.length === 0) {
      setView("hidden");
      return;
    }

    if (result.entries.length === 0) {
      setNotice(
        isListingOwnerContext
          ? SELLER_QUEUE_SYNC_MISMATCH_MESSAGE
          : SELLER_QUEUE_NO_LEADS_MESSAGE
      );
      setView("notice");
      return;
    }

    const needsOutcomeEntry = result.entries.find((e) => e.needsOutcome);
    setOutcomeLeadId(needsOutcomeEntry?.leadId ?? null);
    setView("queue");
  }, [isListingOwnerContext, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const panelBorder = isDarkMode ? "border-slate-700/80 bg-slate-950/50" : "border-slate-200 bg-slate-50";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";
  const hasRevealedContact = entries.some((e) => !e.contactMasked);

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
    setRevealConfirmLeadId(null);
    await load();
  };

  const handleRevealConfirm = async (leadId: string) => {
    setRevealSubmitting(true);
    setError(null);
    const result = await revealSellerQueueLead({ leadId });
    setRevealSubmitting(false);
    if (result.ok === false) {
      setError(result.message);
      return;
    }
    setRevealConfirmLeadId(null);
    await load();
  };

  const handleOutcomeConfirm = async () => {
    if (!outcomeLeadId) return;
    setOutcomeSubmitting(true);
    setError(null);
    const result = await recordSellerQueueOutcome({
      leadId: outcomeLeadId,
      outcome: outcomeValue,
    });
    setOutcomeSubmitting(false);
    if (result.ok === false) {
      setError(result.message);
      return;
    }
    setOutcomeLeadId(null);
    await load();
  };

  if (view === "hidden" || view === "checking") {
    return null;
  }

  if (view === "loading") {
    return (
      <div
        className={`w-full min-w-0 p-3 rounded-xl border flex items-center gap-2 text-xs ${panelBorder}`}
        data-testid="seller-lead-queue-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
        <span className={muted}>กำลังโหลดคิวผู้สนใจ…</span>
      </div>
    );
  }

  if (view === "notice") {
    return (
      <div
        className={`w-full min-w-0 px-3 py-2 rounded-lg border text-[11px] ${panelBorder}`}
        data-testid="seller-lead-queue-notice"
      >
        <p className={muted}>{notice}</p>
        {notice === SELLER_QUEUE_SYNC_MISMATCH_MESSAGE ? (
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 px-2.5 py-1 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
            data-testid="seller-lead-queue-retry"
          >
            รีเฟรชคิว
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`w-full min-w-0 rounded-xl border ${panelBorder}`}
      data-testid="seller-lead-queue-panel"
      data-layout="seller-lead-queue-vertical"
    >
      <div className="px-3 py-2 border-b border-slate-700/50 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 shrink-0">
          <Users className="w-4 h-4 shrink-0" />
          คิวผู้สนใจ ({interestCount} คน)
        </div>
        <span className={`text-[10px] leading-snug ${muted}`} data-testid="seller-lead-queue-header-hint">
          {hasRevealedContact
            ? "เปิดเบอร์ทีละ 1 ราย — อัปเดตผลก่อนคิวถัดไป"
            : "ข้อมูลแบบคัดกรอง — ยังไม่เปิดเบอร์"}
        </span>
      </div>

      {error ? (
        <div
          className="px-3 py-2 text-[11px] text-amber-400 border-b border-slate-800/60 flex gap-2 items-start"
          data-testid="seller-lead-queue-error"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
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
              {!entry.contactMasked ? (
                <div
                  className="rounded-lg border border-green-500/30 bg-green-950/30 px-3 py-2 space-y-1"
                  data-testid={`seller-lead-revealed-contact-${entry.queuePosition}`}
                >
                  <p className="text-[11px] text-green-300 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span data-testid={`seller-lead-contact-phone-${entry.queuePosition}`}>
                      {entry.contactPhone}
                    </span>
                  </p>
                  <p className={`text-[10px] leading-snug flex gap-1.5 ${muted}`}>
                    <Shield className="w-3 h-3 shrink-0 mt-0.5 text-slate-500" />
                    {SELLER_REVEAL_PRIVACY_NOTICE}
                  </p>
                </div>
              ) : null}
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
              {entry.needsOutcome ? (
                <span className="text-[10px] font-bold text-amber-400">รอผลการติดต่อ</span>
              ) : entry.isCurrentSellerTurn ? (
                <span className="text-[10px] font-bold text-green-400">ถึงคิวของคุณ</span>
              ) : (
                <span className={`text-[10px] ${muted}`}>
                  {entry.waitingReason ?? SELLER_REVEAL_WAITING_PREVIOUS}
                </span>
              )}
            </div>

            <div
              className="flex flex-col gap-2 w-full min-w-0 pt-1 border-t border-slate-800/60"
              data-testid={`seller-lead-queue-actions-${entry.queuePosition}`}
              data-layout="seller-lead-queue-actions-column"
            >
              {revealConfirmLeadId === entry.leadId ? (
                <div
                  className="rounded-lg border border-orange-500/40 bg-slate-900/80 px-3 py-3 space-y-2"
                  data-testid={`seller-lead-reveal-confirm-${entry.queuePosition}`}
                >
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    {SELLER_REVEAL_CONFIRM_MESSAGE}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      disabled={revealSubmitting}
                      onClick={() => void handleRevealConfirm(entry.leadId)}
                      className={`${actionBtnBase} sm:w-auto bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50`}
                      data-testid={`seller-lead-reveal-confirm-btn-${entry.queuePosition}`}
                    >
                      {revealSubmitting ? "กำลังเปิดข้อมูล…" : "ยืนยันเปิดข้อมูลติดต่อ"}
                    </button>
                    <button
                      type="button"
                      disabled={revealSubmitting}
                      onClick={() => setRevealConfirmLeadId(null)}
                      className={`${actionBtnBase} sm:w-auto border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50`}
                      data-testid={`seller-lead-reveal-cancel-btn-${entry.queuePosition}`}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!entry.canRevealContact || revealSubmitting}
                  title={
                    entry.canRevealContact
                      ? undefined
                      : entry.waitingReason ?? SELLER_REVEAL_WAITING_PREVIOUS
                  }
                  onClick={() => {
                    setError(null);
                    setRevealConfirmLeadId(entry.leadId);
                  }}
                  className={`${actionBtnBase} border border-orange-500/50 text-orange-100 hover:bg-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0`}
                  data-testid={`seller-lead-reveal-btn-${entry.queuePosition}`}
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="break-words">เปิดข้อมูลติดต่อ</span>
                </button>
              )}
              <button
                type="button"
                disabled={!entry.canSkip}
                onClick={() => {
                  setRevealConfirmLeadId(null);
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

            {entry.needsOutcome && outcomeLeadId === entry.leadId ? (
              <div
                className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-3 space-y-2"
                data-testid={`seller-lead-outcome-form-${entry.queuePosition}`}
              >
                <p className="text-xs font-bold text-amber-200">อัปเดตผลการติดต่อ</p>
                <fieldset className="space-y-2 border-0 p-0 m-0">
                  <legend className="sr-only">ผลการติดต่อ</legend>
                  {SELLER_REVEAL_OUTCOME_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-2.5 text-[11px] text-slate-300 cursor-pointer py-1 min-h-[1.75rem]"
                    >
                      <input
                        type="radio"
                        name={`outcome-${entry.leadId}`}
                        checked={outcomeValue === opt.value}
                        onChange={() => setOutcomeValue(opt.value)}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="break-words leading-snug">{opt.label}</span>
                    </label>
                  ))}
                </fieldset>
                <button
                  type="button"
                  disabled={outcomeSubmitting}
                  onClick={() => void handleOutcomeConfirm()}
                  className={`${actionBtnBase} bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50`}
                  data-testid={`seller-lead-outcome-submit-${entry.queuePosition}`}
                >
                  {outcomeSubmitting ? "กำลังบันทึก…" : "บันทึกผลการติดต่อ"}
                </button>
              </div>
            ) : null}
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

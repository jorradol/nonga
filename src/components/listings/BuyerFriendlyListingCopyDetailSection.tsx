/**
 * v6.3B.3 — Car detail section: original description + gated buyer-friendly preview.
 */
import type { BuyerFriendlyCopyPreviewGateEvaluation } from "../../config/buyerFriendlyCopyPreviewGate";
import type { BuyerFriendlyListingCopyResult } from "../../utils/buyerFriendlyListingCopy";
import BuyerFriendlyListingCopyPreview from "./BuyerFriendlyListingCopyPreview";

export const BUYER_FRIENDLY_PREVIEW_STAGING_SIGNED_IN_NOTICE =
  "สรุปให้อ่านง่ายเปิดทดสอบบน staging สำหรับบัญชีที่อยู่ใน allowlist — ใช้ข้อความประกาศด้านบนเป็นหลัก";

export const BUYER_FRIENDLY_PREVIEW_STAGING_EMPTY_ALLOWLIST_NOTICE =
  "สรุปให้อ่านง่ายยังไม่พร้อมบน staging (allowlist ว่าง) — ใช้ข้อความประกาศด้านบนเป็นหลัก";

export interface BuyerFriendlyListingCopyDetailSectionProps {
  gate: BuyerFriendlyCopyPreviewGateEvaluation;
  result: BuyerFriendlyListingCopyResult | null;
  tone?: "dark" | "light";
}

function StagingSignedInNotice({
  tone,
  message,
  testId,
}: {
  tone: "dark" | "light";
  message: string;
  testId: string;
}) {
  const shell =
    tone === "light"
      ? "border-slate-200 bg-slate-50"
      : "border-slate-700/60 bg-slate-900/25";
  const muted = tone === "light" ? "text-slate-500" : "text-slate-400";

  return (
    <div
      className={`mt-5 rounded-xl border border-dashed px-4 py-3 ${shell}`}
      data-testid={testId}
    >
      <p className={`text-xs leading-relaxed ${muted}`}>{message}</p>
    </div>
  );
}

export default function BuyerFriendlyListingCopyDetailSection({
  gate,
  result,
  tone = "dark",
}: BuyerFriendlyListingCopyDetailSectionProps) {
  if (gate.visible && result) {
    return <BuyerFriendlyListingCopyPreview result={result} tone={tone} />;
  }

  if (gate.featureActive && gate.signedInEligible) {
    if (gate.reason === "not-allowlisted") {
      return (
        <StagingSignedInNotice
          tone={tone}
          message={BUYER_FRIENDLY_PREVIEW_STAGING_SIGNED_IN_NOTICE}
          testId="buyer-friendly-copy-preview-staging-not-allowlisted"
        />
      );
    }
    if (gate.reason === "empty-allowlist") {
      return (
        <StagingSignedInNotice
          tone={tone}
          message={BUYER_FRIENDLY_PREVIEW_STAGING_EMPTY_ALLOWLIST_NOTICE}
          testId="buyer-friendly-copy-preview-staging-empty-allowlist"
        />
      );
    }
  }

  return null;
}

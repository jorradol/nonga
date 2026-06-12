/**
 * v6.4C — Read-only AI control status card (display only).
 */

import type { ReactNode } from "react";

export interface AiControlStatusCardProps {
  title: string;
  testId: string;
  children: ReactNode;
}

export function AiControlStatusCard({
  title,
  testId,
  children,
}: AiControlStatusCardProps) {
  return (
    <section
      className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3 text-left"
      data-testid={testId}
      aria-label={title}
    >
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

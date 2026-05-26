import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, EyeOff, Copy, CheckCircle2 } from "lucide-react";
import { DuplicateBadge } from "./DuplicateBadge";
import type { DuplicateReviewAction } from "../../utils/duplicateDetection/types";
import type { DealerApiHeaders } from "../../services/dealer/dealerApi";
import {
  adminAuthHeaders,
  dealerAuthHeadersAsync,
} from "../../utils/apiAuthHeaders";

export interface DuplicateGroupMember {
  id: string;
  source: string;
  title: string;
  duplicateStatus: string;
  score: number;
  dealerId: string;
}

export interface DuplicateGroupSummary {
  groupId: string;
  canonicalId?: string;
  members: DuplicateGroupMember[];
}

interface Props {
  apiBase: "dealer" | "admin";
  apiHeaders?: DealerApiHeaders;
  dealerIdFilter?: string;
}

async function fetchGroups(
  apiBase: Props["apiBase"],
  headers?: DealerApiHeaders
): Promise<DuplicateGroupSummary[]> {
  const url =
    apiBase === "dealer"
      ? "/api/dealer/duplicates"
      : "/api/admin/duplicates";
  const res = await fetch(url, {
    headers:
      apiBase === "dealer" && headers
        ? await dealerAuthHeadersAsync(headers.dealerId, headers.role)
        : adminAuthHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "โหลดไม่สำเร็จ");
  return apiBase === "dealer" ? body.data : body.data.groups;
}

async function submitReview(
  apiBase: Props["apiBase"],
  payload: {
    recordId: string;
    action: DuplicateReviewAction;
    keepId?: string;
    hideId?: string;
  },
  headers?: DealerApiHeaders
): Promise<void> {
  const url =
    apiBase === "dealer"
      ? "/api/dealer/duplicates/review"
      : "/api/admin/duplicates/review";
  const res = await fetch(url, {
    method: "POST",
    headers:
      apiBase === "dealer" && headers
        ? await dealerAuthHeadersAsync(headers.dealerId, headers.role)
        : adminAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "ดำเนินการไม่สำเร็จ");
}

export function DuplicateReviewSection({
  apiBase,
  apiHeaders,
}: Props) {
  const [groups, setGroups] = useState<DuplicateGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await fetchGroups(apiBase, apiHeaders));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    recordId: string,
    action: DuplicateReviewAction,
    extra?: { keepId?: string; hideId?: string }
  ) => {
    setBusy(recordId + action);
    try {
      await submitReview(apiBase, { recordId, action, ...extra }, apiHeaders);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ล้มเหลว");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">ตรวจสอบรถซ้ำ</h2>
        <button
          type="button"
          onClick={load}
          className="text-xs text-orange-400 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {groups.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          ไม่พบกลุ่มรถซ้ำที่ต้องตรวจสอบ
        </p>
      ) : (
        groups.map((g) => (
          <div
            key={g.groupId}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3"
          >
            <p className="text-xs text-slate-500 font-mono">
              กลุ่ม {g.groupId}
              {g.canonicalId ? ` · canonical: ${g.canonicalId}` : ""}
            </p>
            {g.members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2 first:border-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {m.id} · {m.source} · {m.dealerId}
                  </p>
                </div>
                <DuplicateBadge
                  status={
                    m.duplicateStatus as
                      | "unique"
                      | "possible_duplicate"
                      | "duplicate_confirmed"
                      | "merged"
                  }
                  score={m.score}
                />
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => act(m.id, "mark_unique")}
                    className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> ไม่ซ้ำ
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => act(m.id, "keep_both")}
                    className="px-2 py-1 rounded-lg bg-slate-600/30 text-slate-300 text-[10px] font-bold"
                  >
                    เก็บทั้งคู่
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      const other = g.members.find((x) => x.id !== m.id);
                      act(m.id, "hide_duplicate", {
                        hideId: m.id,
                        keepId: other?.id ?? g.canonicalId,
                      });
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-600/20 text-amber-400 text-[10px] font-bold flex items-center gap-1"
                  >
                    <EyeOff className="w-3 h-3" /> ซ่อนตัวซ้ำ
                  </button>
                  {g.members.length > 1 && (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => {
                        const keep = g.canonicalId ?? g.members[0].id;
                        if (m.id === keep) return;
                        act(m.id, "merge", { keepId: keep, hideId: m.id });
                      }}
                      className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> รวมเข้าหลัก
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

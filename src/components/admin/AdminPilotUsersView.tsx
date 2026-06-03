import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Users, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { useAppStore } from "../../store";
import { useRole } from "../../hooks/auth/useRole";
import {
  fetchPilotUsers,
  provisionPilotUser,
  type PilotUserListItem,
} from "../../services/admin/pilotUserProvisioningApi";

type FormRole = "member" | "dealer" | "admin";
type FormStatus = "active" | "pending" | "suspended";

export default function AdminPilotUsersView() {
  const { setView } = useAppStore();
  const { role, isAdmin } = useRole();
  const actorRole = role === "superadmin" ? "superadmin" : "admin";

  const [users, setUsers] = useState<PilotUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formRole, setFormRole] = useState<FormRole>("member");
  const [formStatus, setFormStatus] = useState<FormStatus>("active");
  const [dealerId, setDealerId] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [note, setNote] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPilotUsers(actorRole, 50);
      setUsers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายชื่อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [actorRole]);

  useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin, loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await provisionPilotUser(actorRole, {
        uid: uid.trim(),
        email: email.trim() || undefined,
        displayName: displayName.trim() || undefined,
        role: formRole,
        status: formStatus,
        dealerId: formRole === "dealer" ? dealerId.trim() : undefined,
        dealerName: formRole === "dealer" ? dealerName.trim() || undefined : undefined,
        note: note.trim() || undefined,
      });
      setSuccess("บันทึกสิทธิผู้ใช้ทดลองเรียบร้อยแล้ว");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const fillFromRow = (row: PilotUserListItem) => {
    setUid(row.uid);
    setEmail(row.email);
    setDisplayName(row.displayName);
    if (row.role === "member" || row.role === "dealer" || row.role === "admin") {
      setFormRole(row.role);
    }
    if (row.status === "active" || row.status === "pending" || row.status === "suspended") {
      setFormStatus(row.status);
    }
    setDealerId(row.dealerId ?? "");
    setDealerName(row.dealerName ?? "");
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setView("admin-dashboard")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-orange-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับแผงควบคุม
        </button>
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-300 leading-relaxed">
          <p className="font-bold text-orange-300 mb-1">Closed Pilot — ผู้ใช้งานทดลอง</p>
          <p>
            UID ต้องเป็น Firebase Auth UID ของผู้ทดลองที่ login แล้ว หรือที่ลุงมีจาก Firebase Console
            — เพิ่ม member/dealer ได้หลายคน ทีละ UID
          </p>
          <p className="mt-1 text-slate-500">
            ไม่สร้างรหัสผ่าน · ไม่เปิด public signup
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4"
          id="admin-pilot-user-form"
        >
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            เพิ่มผู้ทดลอง / เปิดสิทธิ
          </h1>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-400">Firebase UID *</span>
            <input
              required
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              placeholder="uid จาก Firebase Authentication"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-400">อีเมล (อ้างอิง)</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              placeholder="member@example.com"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-400">ชื่อที่แสดง</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFormRole("member");
                setFormStatus("active");
              }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              เปิดสิทธิ์สมาชิก
            </button>
            <button
              type="button"
              onClick={() => {
                setFormRole("dealer");
                setFormStatus("active");
              }}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
            >
              เปิดสิทธิ์ดีลเลอร์
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-400">บทบาท</span>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as FormRole)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="member">เปิดสิทธิ์สมาชิก (member)</option>
                <option value="dealer">เปิดสิทธิ์ดีลเลอร์ (dealer)</option>
                {actorRole === "superadmin" && (
                  <option value="admin">เปิดสิทธิ์แอดมิน (admin)</option>
                )}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-400">สถานะ</span>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as FormStatus)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                <option value="active">เปิดใช้งาน (active)</option>
                <option value="suspended">ปิดใช้งาน (inactive → suspended)</option>
                <option value="pending">รออนุมัติ (pending)</option>
              </select>
            </label>
          </div>

          {formRole === "dealer" && (
            <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-bold text-amber-300">ผูกกับ dealerId *</p>
              <input
                required
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                placeholder="เช่น thor-auto"
              />
              <input
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                placeholder="ชื่อเต็นท์ (optional)"
              />
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-400">หมายเหตุ (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white resize-none"
            />
          </label>

          {error && (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            บันทึกสิทธิผู้ใช้ทดลอง
          </button>
        </form>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-400" />
              ผู้ใช้ล่าสุด
            </h2>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="text-xs text-slate-400 hover:text-orange-400"
            >
              รีเฟรช
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">ยังไม่มีข้อมูล users</p>
          ) : (
            <ul className="space-y-2 max-h-[520px] overflow-y-auto">
              {users.map((row) => (
                <li key={row.uid}>
                  <button
                    type="button"
                    onClick={() => fillFromRow(row)}
                    className="w-full text-left rounded-xl border border-slate-800 hover:border-orange-500/30 bg-slate-950/50 px-3 py-2.5 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {row.displayName || row.uid}
                      </span>
                      <span className="text-[10px] font-mono text-orange-400 uppercase shrink-0">
                        {row.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{row.email || row.uid}</p>
                    {row.dealerId && (
                      <p className="text-[10px] text-amber-400/90 mt-0.5">dealerId: {row.dealerId}</p>
                    )}
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {row.status} · {row.updatedAt ? row.updatedAt.slice(0, 19) : "—"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

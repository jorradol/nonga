import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { DealerApiHeaders, DealerProfile } from "../../services/dealer/dealerApi";
import { fetchDealerProfile, patchDealerProfile } from "../../services/dealer/dealerApi";

interface Props {
  apiHeaders: DealerApiHeaders;
}

export function DealerProfilePage({ apiHeaders }: Props) {
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDealerProfile(apiHeaders)
      .then(setProfile)
      .catch((e) => setMessage(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [apiHeaders]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await patchDealerProfile(apiHeaders, profile);
      setProfile(updated);
      setMessage("บันทึกโปรไฟล์แล้ว");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto py-20" />;
  }

  if (!profile) {
    return <p className="text-slate-500 text-sm">{message ?? "ไม่พบโปรไฟล์"}</p>;
  }

  const fields: { key: keyof DealerProfile; label: string }[] = [
    { key: "showroomName", label: "ชื่อเต็นท์" },
    { key: "ownerName", label: "ชื่อเจ้าของ" },
    { key: "phone", label: "เบอร์โทร" },
    { key: "address", label: "ที่อยู่" },
    { key: "businessHours", label: "เวลาทำการ" },
    { key: "lineId", label: "LINE" },
    { key: "facebook", label: "Facebook" },
    { key: "tiktok", label: "TikTok" },
    { key: "website", label: "เว็บไซต์" },
    { key: "logoUrl", label: "URL โลโก้" },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-bold">โปรไฟล์เต็นท์</h1>
      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block text-[11px]">
            <span className="text-slate-500">{f.label}</span>
            <input
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
              value={String(profile[f.key] ?? "")}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, [f.key]: e.target.value } : p))
              }
            />
          </label>
        ))}
      </div>

      {message && (
        <p className={`text-sm ${message.includes("แล้ว") ? "text-green-400" : "text-red-400"}`}>
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        บันทึกโปรไฟล์
      </button>
    </div>
  );
}

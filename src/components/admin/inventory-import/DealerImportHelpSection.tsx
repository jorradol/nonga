import React from "react";
import {
  FileSpreadsheet,
  Download,
  BookOpen,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const SAMPLE_CSV_URL = "/samples/ThorAuto-sample-with-data.csv";
const GUIDE_URL = "/samples/dealer-import-guide.md";

interface DealerImportHelpSectionProps {
  isDarkMode: boolean;
}

export function DealerImportHelpSection({
  isDarkMode,
}: DealerImportHelpSectionProps) {
  const panel = isDarkMode
    ? "bg-slate-950/60 border-slate-800"
    : "bg-slate-50 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${panel}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="font-bold text-sm sm:text-base">
            ตัวอย่างไฟล์ที่รองรับ (เต็นท์รถ)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            เตรียมไฟล์ CSV หรือ XLSX ตามคู่มือ — คอลัมน์จำเป็นคือ แบรนด์ รุ่น ปีรถ
            ราคา แนะนำใส่รูปภาพเป็น URL ระบบจะดาวน์โหลดเข้า storage ให้อัตโนมัติ
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={SAMPLE_CSV_URL}
          download="ThorAuto-sample-with-data.csv"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
        >
          <Download className="w-4 h-4" />
          ดาวน์โหลด Sample CSV
        </a>
        <a
          href={GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800/80 transition"
        >
          <BookOpen className="w-4 h-4" />
          เปิดคู่มือฟอร์แมตไฟล์
        </a>
      </div>

      <ul className="grid sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">จำเป็น:</strong> brand, model, year,
            price
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">แนะนำ:</strong> mileage, gear, color,
            province, description, imageUrls
          </span>
        </li>
        <li className="flex items-start gap-2 sm:col-span-2">
          <ImageIcon className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <span>
            หลายรูปต่อคัน: คั่น URL ด้วย <strong className="text-slate-300">comma (,)</strong>{" "}
            หรือขึ้นบรรทัดใหม่ — หลัง Confirm Import ระบบดาวน์โหลดจาก Google Drive/URL
            แล้วเก็บใน image storage (staging ใช้ Firebase Storage เมื่อ{" "}
            <code className="text-orange-300/90">imageBackend=firebase-storage</code>) ไม่ใช่
            hotlink เดิม
          </span>
        </li>
        <li className="flex items-start gap-2 sm:col-span-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            ถ้าดาวน์โหลดรูปไม่สำเร็จหรือไม่มีรูป — แสดงคำเตือน + ใช้ placeholder{" "}
            <strong className="text-slate-300">ไม่ทำให้ทั้งแถวนำเข้าล้ม</strong>
          </span>
        </li>
        <li className="flex items-start gap-2 sm:col-span-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">รูปจากผู้ขาย:</strong> กด Confirm Import
            หมายถึงยืนยันสิทธิ์เผยแพร่และยินยอมให้แสดงรูปเพื่อประกาศขาย — รูปอาจแสดงตามที่ส่งมา
            แม้เห็นป้ายในภาพได้ ระบบยังปิดทะเบียนเต็ม/VIN/เบอร์โทร/ที่อยู่ในช่องข้อความ
          </span>
        </li>
      </ul>

      <p className="text-[10px] text-slate-500 font-mono">
        Sample: public/samples/ThorAuto-sample-with-data.csv · 5 แถว (Thor Auto)
      </p>
    </div>
  );
}

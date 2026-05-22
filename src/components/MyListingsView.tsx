import { useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import type { Car } from "../types";
import { ClipboardList, RefreshCw, CarFront, PlusCircle } from "lucide-react";
import { devClientMarketplaceLog } from "../utils/marketplaceCarMapper";

export default function MyListingsView() {
  const { user, cars, isLoadingCars, fetchCars, setView, isDarkMode } =
    useAppStore();

  const ownerId = user?.uid ?? "";

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const myCars = useMemo(
    () => cars.filter((c) => c.ownerId === ownerId),
    [cars, ownerId]
  );

  useEffect(() => {
    devClientMarketplaceLog("my-listings", {
      ownerId,
      totalInStore: cars.length,
      mine: myCars.length,
      source: "zustand store ← GET /api/cars",
    });
  }, [cars.length, myCars.length, ownerId]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <ClipboardList className="w-4 h-4" />
            ตรวจสอบประกาศ
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            ประกาศของฉัน
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            แหล่งข้อมูลเดียวกับตลาดรถยนต์ (GET /api/cars) — รหัสผู้ขาย:{" "}
            <span className="font-mono text-orange-400">{ownerId || "—"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fetchCars()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
            โหลดใหม่
          </button>
          <button
            type="button"
            onClick={() => setView("sell")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            ลงประกาศใหม่
          </button>
        </div>
      </div>

      {isLoadingCars ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`h-32 rounded-2xl animate-pulse ${isDarkMode ? "bg-slate-900" : "bg-slate-100"}`}
            />
          ))}
        </div>
      ) : myCars.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border space-y-4 ${
            isDarkMode
              ? "bg-slate-900/30 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <CarFront className="w-12 h-12 mx-auto text-slate-500" />
          <h2 className="font-bold text-lg">ยังไม่มีประกาศของคุณในระบบ</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            ถ้าเพิ่งลงประกาศแล้วไม่เห็น ให้กดโหลดใหม่ หรือตรวจว่า publish สำเร็จ
            (POST /api/cars) และ ownerId ตรงกับบัญชีที่ล็อกอิน
          </p>
          <button
            type="button"
            onClick={() => setView("sell")}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold"
          >
            ลงประกาศแรก
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myCars.map((car: Car) => (
            <article
              key={car.id}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 ${
                isDarkMode
                  ? "border-slate-800 bg-slate-900/50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <img
                src={car.images[0]}
                alt={car.title}
                className="w-full sm:w-40 h-28 object-cover rounded-xl bg-slate-800"
              />
              <div className="flex-1 space-y-1 text-left">
                <h3 className="font-bold text-sm">{car.title}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {car.id}</p>
                <p className="text-xs text-orange-400 font-semibold">
                  ฿{car.price.toLocaleString("th-TH")} · {car.year} ·{" "}
                  {car.mileage.toLocaleString()} กม.
                </p>
                <p className="text-[11px] text-slate-500">
                  ลงเมื่อ{" "}
                  {new Date(car.createdAt).toLocaleString("th-TH")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView("marketplace")}
                className="self-start sm:self-center px-4 py-2 text-xs font-semibold rounded-lg border border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              >
                ดูในตลาด →
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

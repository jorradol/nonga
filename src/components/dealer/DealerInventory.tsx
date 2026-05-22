import React, { useState } from "react";
import { 
  Car, Sparkles, PlusCircle, Search, Edit3, Eye, 
  Trash2, ToggleLeft, ToggleRight, CheckCircle2, ChevronRight,
  TrendingUp, CircleDot, RefreshCcw, HelpCircle
} from "lucide-react";
import { useAppStore } from "../../store";
import { useDealer } from "../../hooks/dealer/useDealer";

export function DealerInventory() {
  const setView = useAppStore((state) => state.setView);
  const cars = useAppStore((state) => state.cars);
  const deleteCarListing = useAppStore((state) => state.deleteCarListing);
  const { performanceMetrics, boostListing } = useDealer();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editingPriceText, setEditingPriceText] = useState<string>("");

  // Integrated local state so users can edit status or simulate adding
  const [localCars, setLocalCars] = useState([
    { id: "car-001", title: "BYD Seal Premium AWD Electrifier", brand: "BYD", model: "Seal", year: 2023, price: 1390000, mileage: 12000, color: "Space Gray", transmission: "auto", fuelType: "electric", status: "approved", aiScore: 94, coverImage: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=300" },
    { id: "car-002", title: "Tesla Model 3 Highland Red", brand: "Tesla", model: "Model 3", year: 2024, price: 1590000, mileage: 4500, color: "Highland Red", transmission: "auto", fuelType: "electric", status: "approved", aiScore: 90, coverImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=300" },
    { id: "car-003", title: "Porsche Taycan Dynamic White", brand: "Porsche", model: "Taycan", year: 2021, price: 4890000, mileage: 28000, color: "Chalk White", transmission: "auto", fuelType: "electric", status: "approved", aiScore: 98, coverImage: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=300" },
    { id: "car-004", title: "Honda Civic FE EL+ Turbo", brand: "Honda", model: "Civic", year: 2022, price: 8290000, mileage: 34000, color: "Sonic Gray", transmission: "auto", fuelType: "petrol", status: "draft", aiScore: 88, coverImage: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=300" }
  ]);

  const handleStartEditPrice = (carId: string, price: number) => {
    setEditingCarId(carId);
    setEditingPriceText(price.toString());
  };

  const handleSavePrice = (carId: string) => {
    const nextPrice = parseInt(editingPriceText);
    if (isNaN(nextPrice)) return;
    setEditingCarId(null);
    setLocalCars(localCars.map(c => c.id === carId ? { ...c, price: nextPrice } : c));
  };

  const handleToggleStatus = (carId: string) => {
    setLocalCars(localCars.map(c => {
      if (c.id === carId) {
        return {
          ...c,
          status: c.status === "approved" ? "draft" : "approved"
        };
      }
      return c;
    }));
  };

  const handleDeleteListing = (carId: string) => {
    if (confirm("คุณแน่ใจนะครับว่าจะลบข้อมูลสเป็ครถยนต์ตัวนี้ออกจากฟีดโชว์รูม?")) {
      setLocalCars(localCars.filter(c => c.id !== carId));
    }
  };

  // Filter local listings
  const filteredInventory = localCars.filter(car => 
    car.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.year.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6 text-left selection:bg-orange-500/20">
      
      {/* Search and control header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตาม ยี่ห้อ, รุ่น, น็อตล้อ, หรือปีรถ..."
            className="w-full bg-slate-950 border border-slate-850 focus:border-orange-550/50 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-200 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("sell")}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 active:scale-97"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            ลงขายรถใหม่ (Manual List)
          </button>
          
          <button
            onClick={() => setView("car-post-generator")}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:opacity-90 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-white" />
            ผู้ช่วย AI เขียนโพสต์ 🪄
          </button>
        </div>
      </div>

      {/* Main SaaS Data Table Grid list */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-900/10 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 select-none">
                <th className="p-4">รูปภาพและรายละเอียดพรีเมียม (Vehicle Info)</th>
                <th className="p-4">ราคาเสนอขาย (Price)</th>
                <th className="p-4">เลขไมล์สะสม</th>
                <th className="p-4">คะแนนตรวจสภาพ AI</th>
                <th className="p-4 text-center">สถานะโพสต์</th>
                <th className="p-4 text-right">เครื่องมือควบคุม (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-xs">
              {filteredInventory.map((car) => {
                const metric = performanceMetrics.find(pm => pm.carId === car.id);
                const isBoosted = metric?.boosted || false;
                
                return (
                  <tr key={car.id} className="hover:bg-slate-900/10 transition group">
                    
                    {/* Details Column with Cover photo */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={car.coverImage} 
                          alt={car.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-10 object-cover rounded-lg bg-slate-900 border border-slate-800 shrink-0 group-hover:border-orange-550/20"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-extrabold text-slate-200 truncate flex items-center gap-1.5 leading-tight">
                            {car.title}
                            {isBoosted && (
                              <span className="text-[8px] bg-orange-600/15 text-orange-400 font-extrabold px-1 rounded animate-pulse">
                                บูสต์โฆษณา
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                            <span className="uppercase text-slate-400">{car.fuelType}</span>
                            <span>•</span>
                            <span className="capitalize">{car.transmission}</span>
                            <span>•</span>
                            <span>ปี {car.year}</span>
                            <span>•</span>
                            <span>สี{car.color}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price Column with Inline editor support */}
                    <td className="p-4 font-mono">
                      {editingCarId === car.id ? (
                        <div className="flex gap-1.5 max-w-xs">
                          <input
                            type="number"
                            value={editingPriceText}
                            onChange={(e) => setEditingPriceText(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white max-w-[100px] outline-none font-bold"
                          />
                          <button
                            onClick={() => handleSavePrice(car.id)}
                            className="text-emerald-500 hover:text-emerald-400 text-[10px] font-black cursor-pointer"
                          >
                            บันทึก
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 font-black text-slate-250">
                          <span>฿{car.price.toLocaleString()}</span>
                          <button
                            onClick={() => handleStartEditPrice(car.id, car.price)}
                            className="text-slate-600 hover:text-slate-350 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Mileage */}
                    <td className="p-4 font-mono text-slate-400 font-semibold">
                      {car.mileage.toLocaleString()} กม.
                    </td>

                    {/* AI Score */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded bg-orange-600/10 text-orange-400">
                          <Sparkles className="w-3 h-3 text-orange-500" />
                        </span>
                        <span className="font-extrabold text-white text-[11px] font-mono">
                          {car.aiScore}/100
                        </span>
                      </div>
                    </td>

                    {/* Publication Toggle status */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleToggleStatus(car.id)}
                        className="cursor-pointer transition hover:scale-105"
                      >
                        {car.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.8 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 rounded-full text-[9px] font-extrabold uppercase">
                            <CircleDot className="w-2.5 h-2.5 bg-emerald-500 text-white rounded-full p-0.2" /> Active Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.8 bg-slate-900 text-slate-500 border border-slate-850 rounded-full text-[9px] font-extrabold uppercase">
                            <CircleDot className="w-2.5 h-2.5 bg-slate-700 text-white rounded-full p-0.2" /> Draft Only
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setView("car-post-generator")}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-orange-400 border border-slate-800 rounded-lg text-[9.5px] font-extrabold transition cursor-pointer flex items-center gap-1"
                        >
                          ป้อนสร้างโพสต์โพสต์ด้วย AI 🪄
                        </button>
                        <button
                          onClick={() => handleDeleteListing(car.id)}
                          className="p-1.8 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-rose-500 transition cursor-pointer hover:bg-rose-550/15"
                          title="ลบข้อมูลรถคันนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <span className="text-xl animate-pulse">📦</span>
            <p className="text-xs font-bold text-slate-400">ไม่พบคันไหนที่ตรงกับคำป้อนค้นเรื่องคุณพี่ครับ</p>
          </div>
        )}
      </div>

    </div>
  );
}

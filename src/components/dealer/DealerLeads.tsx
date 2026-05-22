import React, { useState } from "react";
import { 
  Users, Search, Filter, ShieldCheck, Download, 
  PhoneCall, Mail, MessageSquare, PlusCircle, Check, 
  Flame, Snowflake, HelpCircle, Save, Edit, FileDown,
  Sparkles, Star, ChevronRight, CheckCircle, Trash2,
  Lock, Calendar, Send, Compass
} from "lucide-react";
import { useAnalytics } from "../../hooks/analytics/useAnalytics";
import { LeadStatus, LeadEventType, ScoreTier } from "../../types/analytics";

export function DealerLeads() {
  const {
    leads,
    scores,
    isLoading,
    searchTerm,
    statusFilter,
    setSearchTerm,
    setStatusFilter,
    registerNewLead,
    updatePipelineStatus,
    saveLeadNotes,
    refreshAll
  } = useAnalytics();

  const [activeNotesLeadId, setActiveNotesLeadId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>("");
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  
  // New entry form state
  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [newLeadName, setNewLeadName] = useState<string>("");
  const [newLeadPhone, setNewLeadPhone] = useState<string>("");
  const [newLeadCar, setNewLeadCar] = useState<string>("BYD Seal Premium AWD Electrifier");
  const [newLeadCarId, setNewLeadCarId] = useState<string>("car-001");
  const [newLeadPrice, setNewLeadPrice] = useState<number>(1599000);
  const [newLeadType, setNewLeadType] = useState<LeadEventType>("chat_inquiry");
  const [newLeadMessage, setNewLeadMessage] = useState<string>("");

  // Detailed score display modal
  const [selectedAnalysisLeadId, setSelectedAnalysisLeadId] = useState<string | null>(null);

  const handleExportCSV = () => {
    try {
      const csvHeaders = "ID,Buyer Name,Phone,Email,Car Title,Car Price,Event Type,Status,AI Segment,AI Score,Notes,Created At\n";
      const csvRows = leads.map(l => {
        const score = scores[l.id];
        return `"${l.id}","${l.buyerName}","${l.buyerPhone || ""}","${l.buyerEmail || ""}","${l.carTitle}",${l.carPrice},"${l.eventType}","${l.status}","${score?.segment || ""}",${score?.score || 50},"${(l.notes || "").replace(/"/g, '""') || ""}","${l.createdAt}"`;
      }).join("\n");
      
      const blob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `nonga_marketplace_crm_export_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      alert("กรุณากรอกชื่อและเบอร์โทรติดต่อก่อนทำรายการจำลอง!");
      return;
    }

    await registerNewLead({
      carId: newLeadCarId,
      carTitle: newLeadCar,
      carPrice: newLeadPrice,
      buyerName: newLeadName,
      buyerPhone: newLeadPhone,
      buyerEmail: `${newLeadName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      dealerId: "dealer-nongbot-01",
      dealerName: "NongBot Premium Space Garage",
      eventType: newLeadType,
      status: "new",
      notes: newLeadMessage || "สนใจคันนี้เป็นพิเศษผ่านดีลเลอร์บอร์ด",
      source: "manual_dealer_input"
    });

    // Reset Form
    setNewLeadName("");
    setNewLeadPhone("");
    setNewLeadMessage("");
    setShowCreator(false);
  };

  const selectCarData = (title: string) => {
    setNewLeadCar(title);
    if (title.includes("BYD")) {
      setNewLeadCarId("car-001");
      setNewLeadPrice(1599000);
    } else if (title.includes("Tesla")) {
      setNewLeadCarId("car-002");
      setNewLeadPrice(1650000);
    } else if (title.includes("Porsche")) {
      setNewLeadCarId("car-003");
      setNewLeadPrice(6490000);
    } else {
      setNewLeadCarId("car-004");
      setNewLeadPrice(969000);
    }
  };

  const handleStartEditNotes = (leadId: string, currentNotes: string) => {
    setActiveNotesLeadId(leadId);
    setEditingNotesText(currentNotes || "");
  };

  const handleSaveNotes = async (leadId: string) => {
    await saveLeadNotes(leadId, editingNotesText);
    setActiveNotesLeadId(null);
  };

  const pipelineStages: { status: LeadStatus; label: string; desc: string; color: string }[] = [
    { status: "new", label: "ลูกค้าใหม่ (New)", desc: "คำขอติดต่อพึ่งสตรีมมิ่งเข้ามา", color: "border-t-orange-500 bg-orange-500/[0.02]" },
    { status: "contacted", label: "ติดต่อแล้ว (Contacted)", desc: "พนักงานขายกำลังดีลเบื้องต้น", color: "border-t-yellow-500 bg-yellow-500/[0.02]" },
    { status: "negotiating", label: "ต่อรองสัญญา (Negotiating)", desc: "ยื่นไฟแนนซ์หรือลดดอกเบี้ยซิ่ง", color: "border-t-blue-500 bg-blue-500/[0.02]" },
    { status: "sold", label: "ส่งมอบรถแล้ว (Sold)", desc: "ปิดจองได้รับค่าคอมมิชชั่นเรียบร้อย", color: "border-t-emerald-500 bg-emerald-500/[0.02]" },
    { status: "lost", label: "สูญเสียดีล (Lost)", desc: "ยกเลิกหรือติดเงื่อนไขเทรดรถเก่ากู้บู่", color: "border-t-slate-700 bg-slate-900/[0.01]" }
  ];

  const getTierIcon = (tier: ScoreTier) => {
    switch (tier) {
      case "hot":
        return <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />;
      case "warm":
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      case "cold":
        return <Snowflake className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  const getTierBadgeColor = (tier: ScoreTier) => {
    switch (tier) {
      case "hot": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "warm": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "cold": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
  };

  const selectedAnalysisLead = leads.find(l => l.id === selectedAnalysisLeadId);
  const selectedAnalysisScore = selectedAnalysisLead ? scores[selectedAnalysisLead.id] : null;

  return (
    <div className="space-y-6 text-left selection:bg-orange-500/20">
      
      {/* Banner Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.06] bg-slate-905/60 backdrop-blur-md">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-orange-500" />
            ตารางบริหารสัญญาณผู้ซื้อ (Nong A Interactive CRM Pipeline)
          </h3>
          <p className="text-[10px] text-slate-400">ควบคุมขั้นตอนการเจรจา ประเมินพฤติกรรมการคลิก และวิเคราะห์ความน่าจะเกิดการจำหน่ายด้วยขุมกำลัง AI</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowCreator(!showCreator)}
            className="px-3.5 py-2 bg-gradient-to-r from-orange-650 to-orange-550 hover:from-orange-600 hover:to-orange-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/10"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            บันทึกการสนใจใหม่ (Manual) ✏️
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-350 font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-550" />
            {exportSuccess ? "ส่งออกไฟล์ Excel สำเร็จแล้ว! 📋" : "ส่งออกข้อมูล CRM เป็น CSV"}
          </button>
        </div>
      </div>

      {/* Manual Entry Form */}
      {showCreator && (
        <form onSubmit={handleCreateLead} className="p-5 rounded-2xl border border-white/[0.06] bg-slate-950/90 space-y-4 animate-fade-in text-left shadow-2xl relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-full blur-xl pointer-events-none" />
          <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-1">
            ✨ แบบฟอร์มเพิ่มการลงทะเบียนตัวจำลองผู้เห็นโฆษณา (Simulated CRM Injector)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">ชื่อสกุลผู้สนใจ <span className="text-orange-500">*</span></label>
              <input
                type="text"
                required
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                placeholder="เช่น ทัศนีย์ พลังชาร์จ"
                className="w-full bg-slate-900 border border-white/5 focus:border-orange-500 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">เบอร์โทรติดต่อ <span className="text-orange-500">*</span></label>
              <input
                type="text"
                required
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                placeholder="เช่น 089-112-9900"
                className="w-full bg-slate-900 border border-white/5 focus:border-orange-500 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">ความสนใจหลัก</label>
              <select
                value={newLeadType}
                onChange={(e) => setNewLeadType(e.target.value as LeadEventType)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl p-2.5 text-xs text-slate-350 outline-none"
              >
                <option value="chat_inquiry">คุยแชท AI ปรึกษาเกียร์ตินาคิน</option>
                <option value="finance_inquiry">คำนวณสไลด์ตารางผ่อนไฟแนนซ์</option>
                <option value="contact_seller">แจ้งเบอร์ให้ดีลเลอร์ติดต่อขายเงินสด</option>
                <option value="favorite_car">กดแปะติดดาวไว้ดูซ้ำ</option>
                <option value="share_listing">คลิกแชร์ส่งต่อไปหน้าโซเชียล</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">เลือกรุ่นรถเป้าหมาย</label>
              <select
                value={newLeadCar}
                onChange={(e) => selectCarData(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl p-2.5 text-xs text-slate-350 outline-none"
              >
                <option>BYD Seal Premium AWD Electrifier</option>
                <option>Tesla Model 3 Highland Red</option>
                <option>Porsche Taycan Dynamic White</option>
                <option>Honda Civic FE EL+ Turbo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">บันทึกเบื้องต้น / ข้อความระบุ</label>
              <input
                type="text"
                value={newLeadMessage}
                onChange={(e) => setNewLeadMessage(e.target.value)}
                placeholder="ระบุข้อความจำลองเพิ่มเติม เช่น ขอส่วนลดล้อแม็ก..."
                className="w-full bg-slate-900 border border-white/5 focus:border-orange-500 rounded-xl p-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCreator(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs transition font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs transition font-black"
            >
              ประมวลสัญญาณบันทึกดีล 🪄
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Hub */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อลูกค้า ยี่ห้อรุ่นรถยนต์ยอดฮิต หรือโน้ตสำคัญ..."
            className="w-full bg-slate-950/60 border border-white/5 focus:border-orange-500/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none"
          />
        </div>

        <div className="flex gap-2">
          {/* Quick status shortcut selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950/60 border border-white/5 text-xs text-slate-300 rounded-xl px-3 outline-none py-2 md:py-0 focus:border-orange-500/40"
          >
            <option value="all">ดูทุกสถานะ Pipeline (All)</option>
            <option value="new">เฉพาะสัญญาลูกค้าใหม่ (New)</option>
            <option value="contacted">ระหว่างพนักงานขายติดต่อ (Contacted)</option>
            <option value="negotiating">ระหว่างยื่นไฟแนนซ์หรือต่อรอง (Negotiating)</option>
            <option value="sold">สัญญาส่งมอบสำเร็จ (Sold)</option>
            <option value="lost">ยกเลิกดีลสูญเสีย (Lost)</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">กำลังโหลดโทรศัพท์ลูกค้าและคำนวณคะแนน AI เกรดพรีเมียม...</p>
        </div>
      ) : (
        /* Kanban Horizontal Stage Board */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 no-scrollbar min-h-[500px]">
          {pipelineStages.map((stage) => {
            const stageLeads = leads.filter(l => l.status === stage.status);
            
            return (
              <div 
                key={stage.status}
                className={`min-w-[240px] rounded-2xl border border-white/[0.04] p-3 flex flex-col space-y-3.5 border-t-2 ${stage.color} relative`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-100 uppercase tracking-tight">{stage.label}</span>
                    <span className="text-[10px] font-mono bg-white/5 text-slate-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-none">{stage.desc}</p>
                </div>

                <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto no-scrollbar max-h-[600px]">
                  {stageLeads.length === 0 ? (
                    <div className="flex-1 border border-dashed border-white/[0.03] rounded-xl flex items-center justify-center p-6 text-center text-slate-650">
                      <p className="text-[10px] font-bold">ไม่มีรถยนต์ดีลค้างในนี้</p>
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const score = scores[lead.id];
                      return (
                        <div 
                          key={lead.id}
                          className="bg-slate-900/90 hover:bg-[#151518] border border-white/5 p-3 rounded-xl space-y-3 transition-all duration-200 text-left hover:border-orange-500/20 group relative"
                        >
                          {/* AI Lead score floating indicator */}
                          {score && (
                            <div className="flex items-center justify-between gap-1 border-b border-white/[0.04] pb-2">
                              <span className="text-[8px] uppercase tracking-wider font-mono font-extrabold text-slate-500">
                                {score.segment.length > 22 ? score.segment.slice(0, 22) + "..." : score.segment}
                              </span>
                              <div className={`text-[9px] font-mono font-black flex items-center gap-1 leading-none rounded border px-1.5 py-0.5 ${getTierBadgeColor(score.tier)}`}>
                                {getTierIcon(score.tier)}
                                <span>{score.score}%</span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <h5 className="text-[12.5px] font-black tracking-tight text-white">{lead.buyerName}</h5>
                            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <PhoneCall className="w-2.5 h-2.5 text-orange-500" /> {lead.buyerPhone}
                            </p>
                          </div>

                          <div className="p-2 py-1.5 rounded-lg bg-orange-600/5 border border-orange-500/10 text-[10px] leading-tight space-y-0.5">
                            <p className="text-slate-400 font-semibold">{lead.carTitle}</p>
                            <p className="font-mono text-orange-400 text-[10.5px] font-black">฿{lead.carPrice.toLocaleString()}</p>
                          </div>

                          {/* Action Channels or message log */}
                          {lead.notes && (
                            <p className="text-[9.5px] text-slate-400 line-clamp-2 leading-relaxed italic bg-emerald-550/[0.02] border-l border-emerald-500/20 pl-1.5 py-0.5">
                              {lead.notes}
                            </p>
                          )}

                          {/* Quick pipeline switcher & inline comments action bar */}
                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.03]">
                            <button
                              onClick={() => handleStartEditNotes(lead.id, lead.notes || "")}
                              className="text-[9.5px] font-bold text-slate-500 hover:text-orange-500 flex items-center gap-0.5"
                              title="เขียนโน้ต memo เพิ่ม"
                            >
                              <Edit className="w-2.5 h-2.5" /> แก้โน้ต
                            </button>
                            
                            <button
                              onClick={() => setSelectedAnalysisLeadId(lead.id)}
                              className="text-[9.5px] font-black text-orange-300 hover:text-orange-200 hover:underline flex items-center gap-0.5"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-orange-400 shrink-0" /> ดูแผนปิดดีล AI
                            </button>
                          </div>

                          {/* Dynamic select status dropdown */}
                          <div className="pt-1.5">
                            <select
                              value={lead.status}
                              onChange={(e) => updatePipelineStatus(lead.id, e.target.value as LeadStatus)}
                              className="w-full bg-slate-950 text-[9.5px] text-slate-400 border border-white/5 py-1 px-1.5 rounded outline-none cursor-pointer focus:border-orange-500/30"
                            >
                              <option value="new">ย้ายไป: ลูกค้าใหม่</option>
                              <option value="contacted">ย้ายไป: พิชิตติดต่อแล้ว</option>
                              <option value="negotiating">ย้ายไป: กำลังเจรจาต่อรอง</option>
                              <option value="sold">ย้ายไป: ส่งมอบรถยนต์สำเร็จ</option>
                              <option value="lost">ย้ายไป: นัดวอยด์ดีลหลุดมือ</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline notes modification dialog */}
      {activeNotesLeadId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-5 w-full max-w-md space-y-4">
            <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              แก้ไขบันทึกความต้องการลูกค้าดีลเลอร์ (Sales Representative Memo)
            </h4>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">พิมพ์ประวัติหรือความคืบหน้าการสนทนา</label>
              <textarea
                value={editingNotesText}
                onChange={(e) => setEditingNotesText(e.target.value)}
                placeholder="ระบุ เช่น โทรแจ้งอนุมัติวงเงินจัดผ่อนจากเกียรตินาคินเรียบร้อย นัดส่งรถบ่ายวันเสาร์"
                className="w-full h-24 bg-slate-900 border border-white/5 rounded-xl text-xs text-white p-3 outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActiveNotesLeadId(null)}
                className="px-4 py-2 bg-slate-900 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleSaveNotes(activeNotesLeadId)}
                className="px-4 py-2 bg-gradient-to-r from-orange-650 to-orange-550 text-white text-xs font-black rounded-xl"
              >
                บันทึกอัพเดตลงคลาวด์ ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Lead Analysis Insight Modal Panel */}
      {selectedAnalysisLead && selectedAnalysisScore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-[#0b0b0d] border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-5 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">แผงเกรดคัดแยกลูกค้าด้วยปัญญาประดิษฐ์</h4>
                  <p className="text-[10px] text-slate-400">Nong A AI Lead Scoring & Behavioral Analytics</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnalysisLeadId(null)}
                className="p-1 px-2.5 text-xs font-bold rounded-lg border border-white/5 text-slate-400 hover:text-white"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.04] space-y-1">
                <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">เซกเมนต์พฤติกรรมลูกค้า</span>
                <p className="text-xs font-black text-white">{selectedAnalysisScore.segment}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.04] space-y-1">
                <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">คะแนนความต้องการ (Hot Score)</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${getTierBadgeColor(selectedAnalysisScore.tier)}`}>
                    {selectedAnalysisScore.tier}
                  </span>
                  <p className="text-sm font-mono font-black text-white">{selectedAnalysisScore.score} / 100</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-orange-550/5 border border-orange-500/10 space-y-2">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1">
                💡 คำแนะนำของน้องเอ AI ในการเข้าปิดยอดจอง (Action Playbook)
              </span>
              <p className="text-xs text-slate-100 leading-relaxed font-semibold">
                {selectedAnalysisScore.suggestedAction}
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wide">รายงานวิเคราะห์เชิงทำนาย (Predictive Insight)</span>
                <p className="text-[11px] text-slate-350 leading-relaxed p-3.5 bg-slate-900/40 border border-white/5 rounded-xl">
                  {selectedAnalysisScore.analysisSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 text-xs font-mono">
                <div className="flex justify-between p-2 border-b border-white/[0.03]">
                  <span className="text-slate-500">รุ่นเปรียบเทียบ</span>
                  <span className="text-slate-300 font-semibold">{selectedAnalysisLead.carTitle.split(" ")[0]}</span>
                </div>
                <div className="flex justify-between p-2 border-b border-white/[0.03]">
                  <span className="text-slate-500">ค่าความเชื่อมั่น</span>
                  <span className="text-emerald-400 font-black">{selectedAnalysisScore.confidenceScore}%</span>
                </div>
                <div className="flex justify-between p-2 border-b border-white/[0.03]">
                  <span className="text-slate-500">ความเป็นไปได้จองซื้อ</span>
                  <span className="text-orange-400 font-black">{selectedAnalysisScore.conversionProbability}%</span>
                </div>
                <div className="flex justify-between p-2 border-b border-white/[0.03]">
                  <span className="text-slate-500">ช่องทางติดต่อ</span>
                  <span className="text-slate-300 font-semibold uppercase">{selectedAnalysisLead.eventType.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  alert("จำลองระบบทำการสตรีมมิ่งความเห็นคำแนะนำให้ลูกค้าผ่านช่องทางทราฟฟิกเรียบร้อยครับ!");
                  setSelectedAnalysisLeadId(null);
                }}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl text-center active:scale-95 transition"
              >
                ส่งแผนงานนี้เข้าอุปกรณ์แท็บเล็ตเซลส์ผู้ดูแล 🚀
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

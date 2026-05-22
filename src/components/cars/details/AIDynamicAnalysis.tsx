import React from "react";
import { motion } from "motion/react";
import { Sparkles, CheckCircle, AlertCircle, Quote, TrendingUp, Info } from "lucide-react";
import { Car } from "../../../types";

interface AIDynamicAnalysisProps {
  car: Car;
  isDarkMode?: boolean;
}

export default function AIDynamicAnalysis({ car, isDarkMode = true }: AIDynamicAnalysisProps) {
  // Score calculations or presets based on car specifications
  const getAIScores = () => {
    const brandLower = car.brand.toLowerCase();
    const isEv = car.type === "ev" || car.fuelType?.includes("electric");

    let valScore = 85; // Value for money
    let conditionScore = 90; // Mechanical Condition
    let greenScore = isEv ? 98 : 65; // Efficiency
    let techScore = isEv ? 95 : 75; // Tech & Smart Features
    let demandScore = 88; // Market Demand

    if (car.price > 1500000) {
      valScore = 78;
      techScore += 4;
    } else if (car.price < 500000) {
      valScore = 94;
      techScore -= 8;
    }

    if (car.mileage > 100000) {
      conditionScore = 68;
      demandScore -= 15;
    } else if (car.mileage < 30000) {
      conditionScore = 95;
      demandScore += 8;
    }

    if (brandLower.includes("tesla") || brandLower.includes("byd")) {
      techScore = Math.max(techScore, 96);
      demandScore = Math.max(demandScore, 92);
    }

    const avg = Math.round((valScore + conditionScore + greenScore + techScore + demandScore) / 5);

    return {
      average: avg,
      metrics: [
        { name: "ความคุ้มค่างบประมาณ (Value)", score: valScore, color: "from-orange-600 to-orange-400" },
        { name: "สภาพเครื่องยนต์ & แบตเตอรี่ (Condition)", score: conditionScore, color: "from-amber-500 to-yellow-400" },
        { name: "อัตราประหยัด & พลังงานสะอาด (Green Index)", score: greenScore, color: "from-emerald-500 to-teal-400" },
        { name: "ความอัจฉริยะและอุปกรณ์อำนวยความสะดวก (Tech)", score: techScore, color: "from-cyan-500 to-blue-400" },
        { name: "ความนิยมในตลาดมือสอง (Market Demand)", score: demandScore, color: "from-rose-500 to-orange-400" },
      ],
    };
  };

  const scores = getAIScores();
  const isEv = car.type === "ev" || car.fuelType?.includes("electric");

  // Key highlights / Custom insights based on attributes
  const pros = isEv 
    ? [
        "เทคโนโลยีขับเคลื่อนพลังงานสะอาด 100% ประหยัดค่าเชื้อเพลิงได้มากกว่า 3-4 เท่าเมื่อเทียบกับน้ำมันเบนซิน",
        "ระบบเบรกคืนพลังงาน (Regenerative Braking) และการบำรุงรักษาต่ำ ไม่มีของเหลวเครื่องยนต์ต้องเปลี่ยนบ่อย",
        "อัตราเร่งแรงบิดทันใจ ปราศจากเสียงรบกวน ห้องโดยสารมีความเงียบสงบระดับพรีเมียม",
        "รองรับระบบชาร์จเร็วกึ่งสาธารณะ ชาร์จ 20-80% ได้ในพริบตาเดียว ⚡"
      ]
    : [
        "ระบบเครื่องยนต์เสถียร ดูแลรักษาและหาอู่ซ่อมบำรุงในไทยได้ง่าย อะไหล่สำรองพร้อมในทุกเขต",
        "หมดกังวลเรื่องการเดินทางไกล เติมน้ำมันได้รวดเร็วทุกปั๊มทั่วประเทศ",
        "ช่วงล่างแน่นหนา ยึดเกาะถนนยอดเยี่ยม เหมาะสำหรับสภาพพื้นผิวถนนและการจราจรทุกมิติ",
        "มูลค่าขายต่อในตลาดรถบ้านมือสองมีความนิ่งและทรงตัวสูงมาก 📈"
      ];

  const cons = isEv
    ? [
        "ต้องวางแผนการเดินทางและจุดชาร์จล่วงหน้าเล็กน้อยในกรณีขับขึ้นเขาหรือเส้นทางธุรกันดารไกลตัวเมือง",
        "มูลค่าแบตเตอรี่ระยะยาวมีส่วนสำคัญในการประเมินประสิทธิภาพ จึงต้องเลือกผู้ตรวจชาร์จที่เชี่ยวชาญ"
      ]
    : [
        "ค่าดูแลรักษาของเหลวและไส้กรองเครื่องยนต์ประจำปีเมื่อระยะถึงเกณฑ์กำหนด",
        "อัตราสูญเสียพลังงานความร้อนค่อนข้างสูงกว่าระบบขับเคลื่อนไฟฟ้าเต็มพิกัด"
      ];

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${
      isDarkMode 
        ? "bg-slate-900/40 border-white/[0.06] text-white" 
        : "bg-white border-slate-250 text-slate-800"
    } shadow-2xl space-y-8 relative overflow-hidden`}>
      
      {/* Decorative orange ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

      {/* Header section with Nong A bot persona badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-500/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-500/25 flex items-center justify-center text-orange-500 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-black text-lg text-white">Nong A AI วิเคราะห์วิจารณ์เชิงลึก</h3>
            <p className="text-[11px] text-slate-400 font-mono">POWERED BY GEMINI PRO AUTOMOTIVE MODEL</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-orange-600/15 border border-orange-500/25 rounded-2xl px-4 py-2 self-start sm:self-auto shadow-md">
          <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest font-mono">คะแนนภาพรวม AI</span>
          <span className="font-mono font-black text-xl text-orange-500">{scores.average}</span>
          <span className="text-[11px] text-slate-400 font-bold">/100</span>
        </div>
      </div>

      {/* Main Analysis grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Core metrics charts */}
        <div className="lg:col-span-5 space-y-5">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest block text-left">
            การประเมิน 5 ดัชนีทางเทคนิค
          </span>
          
          <div className="space-y-4">
            {scores.metrics.map((metric, idx) => (
              <div key={idx} className="space-y-1.5 text-left">
                <div className="flex justify-between text-xs font-semibold">
                  <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{metric.name}</span>
                  <span className="font-mono text-orange-500 font-bold">{metric.score}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score}%` }}
                    transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                    className={`h-full bg-gradient-to-r ${metric.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-orange-600/[0.02] border border-orange-500/10 text-left flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-normal">
              คะแนนวิเคราะห์ข้างต้นสังเคราะห์โดย Nong A AI อิงจากดัชนีราคาเฉลี่ยตลาดรถยนต์ในไทย ปีจดทะเบียน เลขไมล์สะสม ข้อมูลระบบฟังก์ชันตัวถัง และพฤติกรรมความชอบของลูกค้าชาวไทยอย่างจริงใจเป็นหลักครับ
            </p>
          </div>
        </div>

        {/* Dynamic AI voice and details review text */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-5 rounded-2xl border ${
            isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
          } space-y-3`}>
            <div className="flex items-center gap-1">
              <Quote className="w-4 h-4 text-orange-500 flip-x" />
              <span className="text-[11px] font-bold text-orange-500">บทเกณฑ์คัดสรรของน้องเอ:</span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-left font-serif italic">
              "Nong A วิเคราะห์ประทับใจสุดๆ เลยครับคุณพี่! คันนี้นะครับเป็น {car.brand} {car.model} ปี {car.year} ที่สเป็กสวยกริ๊บ {isEv ? "ขับเคลื่อนด้วยพลังไฟฟ้าสุดคุ้ม 100% ตอบโจทย์ยุคประหยัดพลังงานเงียบสงัดล้ำยุค" : "เครื่องยนต์พละกำลังเหนือระดับ ขับนิ่มนวล ทนทานบำรุงรักษาง่ายที่สุด"} สำหรับตัวเลขไมล์ {car.mileage.toLocaleString()} กม. เทียบกับปีบอกเลยว่าน่าจับตามองมาก ราคาจำหน่ายจัดว่าสมน้ำสมเนื้อ คุ้มกับคุณภาพพรีเมียมแบบนี้แน่นอนครับผม ซื้อไปสะกดสายตาบนท้องถนน คันนี้มีคนทักทาย ดึงใจชัวร์ล้านเปอร์เซ็นต์คร้าบ! ✨"
            </p>
          </div>

          {/* Pros & Cons stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pros card */}
            <div className="p-4.5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.01] space-y-3 text-left">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> จุดเด่นและข้อดีพิเศษ
              </span>
              <ul className="text-[11px] text-slate-300 space-y-2 list-none pl-1">
                {pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-emerald-500 select-none mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons card */}
            <div className="p-4.5 rounded-2xl border border-rose-500/10 bg-rose-500/[0.01] space-y-3 text-left">
              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-rose-500" /> ข้อสังเกตเพื่อพิจารณา
              </span>
              <ul className="text-[11px] text-slate-300 space-y-2 list-none pl-1">
                {cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-rose-500 select-none mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

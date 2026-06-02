import { FileText, Shield, Car, ArrowLeft } from "lucide-react";
import { useAppStore } from "../../store";
import {
  PILOT_POLICY_DISCLAIMER,
  PILOT_POLICY_DOCUMENTS,
  PILOT_POLICY_SLUGS,
  type PilotPolicySlug,
} from "../../content/pilotPolicyContent";
import { resolvePilotPolicySlug } from "../../utils/appRouteSync";
import { navigatePilotPolicy } from "../../utils/pilotPolicyNavigation";

const SLUG_ICONS: Record<PilotPolicySlug, typeof FileText> = {
  terms: FileText,
  privacy: Shield,
  listing: Car,
};

const SLUG_SHORT_LABELS: Record<PilotPolicySlug, string> = {
  terms: "เงื่อนไขใช้งาน",
  privacy: "ความเป็นส่วนตัว",
  listing: "นโยบายประกาศ",
};

function resolveActiveSlug(): PilotPolicySlug {
  if (typeof window === "undefined") return "terms";
  return resolvePilotPolicySlug(window.location.pathname) ?? "terms";
}

export default function PilotPolicyPageView() {
  const { isDarkMode, setView } = useAppStore();
  const activeSlug = resolveActiveSlug();
  const doc = PILOT_POLICY_DOCUMENTS[activeSlug];
  const ActiveIcon = SLUG_ICONS[activeSlug];

  const cardClass = isDarkMode
    ? "bg-white/[0.03] border-white/[0.08] text-slate-200"
    : "bg-white border-slate-200/80 text-slate-800";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8 text-left">
      <button
        type="button"
        onClick={() => setView("home")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        กลับหน้าหลัก
      </button>

      <div className="flex flex-wrap gap-2">
        {PILOT_POLICY_SLUGS.map((slug) => {
          const Icon = SLUG_ICONS[slug];
          const isActive = slug === activeSlug;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => navigatePilotPolicy(slug, setView)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                isActive
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-500"
                  : isDarkMode
                    ? "border-white/10 text-slate-400 hover:border-orange-500/30 hover:text-orange-400"
                    : "border-slate-200 text-slate-500 hover:border-orange-500/30 hover:text-orange-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {SLUG_SHORT_LABELS[slug]}
            </button>
          );
        })}
      </div>

      <div className={`rounded-2xl border p-6 sm:p-8 space-y-6 shadow-sm ${cardClass}`}>
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <ActiveIcon className="w-3 h-3" />
            {doc.badge}
          </span>
          <h1 className="font-display font-black text-2xl sm:text-3xl leading-tight">
            {doc.title}
          </h1>
          <p className="text-sm leading-relaxed opacity-80">{doc.subtitle}</p>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
            isDarkMode
              ? "bg-amber-500/5 border-amber-500/20 text-amber-100/90"
              : "bg-amber-50 border-amber-200/80 text-amber-900/90"
          }`}
        >
          {PILOT_POLICY_DISCLAIMER}
        </div>

        <div className="space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-2.5">
              <h2 className="font-bold text-sm sm:text-base text-orange-500">
                {section.heading}
              </h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="text-sm leading-relaxed opacity-90">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="space-y-2 text-sm leading-relaxed opacity-90 list-disc pl-5">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

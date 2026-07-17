import React from "react";
import { motion } from "motion/react";
import { useAppStore } from "../../store";

interface SettingsCardProps {
  key?: React.Key;
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export default function SettingsCard({
  id,
  title,
  description,
  icon,
  children,
  headerAction,
}: SettingsCardProps) {
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`p-6 md:p-7 rounded-2xl border shadow-xl space-y-6 relative overflow-hidden ${
        isDarkMode
          ? "border-white/[0.08] nonga-bg-surface backdrop-blur-xl"
          : "border-slate-200 bg-white shadow-slate-200/50"
      }`}
    >
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-600 via-orange-500 to-amber-500 rounded-l-2xl opacity-80" />

      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b pl-2 ${
          isDarkMode ? "border-white/5" : "border-slate-200"
        }`}
      >
        <div className="space-y-1 text-left">
          <h3
            className={`text-base md:text-lg font-black flex items-center gap-2 ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            {icon && <span className="text-orange-500 shrink-0">{icon}</span>}
            <span>{title}</span>
          </h3>
          {description && (
            <p
              className={`text-[11px] md:text-xs font-medium ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {description}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div
        className={`space-y-4 pl-2 ${
          isDarkMode ? "text-slate-200" : "text-slate-700"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

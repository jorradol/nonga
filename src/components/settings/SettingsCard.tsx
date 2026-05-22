import React from "react";
import { motion } from "motion/react";

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
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="p-6 md:p-7 rounded-2xl border border-white/[0.08] bg-black/45 backdrop-blur-xl shadow-xl space-y-6 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-600 via-orange-500 to-amber-500 rounded-l-2xl opacity-80" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5 pl-2">
        <div className="space-y-1 text-left">
          <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
            {icon && <span className="text-orange-500 shrink-0">{icon}</span>}
            <span>{title}</span>
          </h3>
          {description && (
            <p className="text-[11px] md:text-xs text-slate-400 font-medium">
              {description}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div className="space-y-4 pl-2 text-slate-200">
        {children}
      </div>
    </motion.div>
  );
}

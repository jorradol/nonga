import React from "react";
import { Sparkles, TrendingUp, Award, Rocket } from "lucide-react";

interface BoostBadgeProps {
  type: "featured" | "boosted" | "trending" | "ai_recommended";
  size?: "sm" | "md" | "lg";
}

export function BoostBadge({ type, size = "md" }: BoostBadgeProps) {
  const isSm = size === "sm";

  const badgeStyles = {
    featured: {
      bg: "bg-gradient-to-r from-amber-500 to-orange-600 border border-orange-400/50 text-white",
      icon: Award,
      text: "Spotlight หน้าแรก",
      pulse: "after:absolute after:inset-0 after:rounded-full after:bg-orange-500/30 after:animate-ping"
    },
    boosted: {
      bg: "bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-950/30",
      icon: Rocket,
      text: "โพสต์แนะนำบูสต์",
      pulse: ""
    },
    trending: {
      bg: "bg-gradient-to-r from-red-500 to-orange-500 border border-red-400/50 text-white animate-pulse",
      icon: TrendingUp,
      text: "HOT มารีบจับจอง",
      pulse: ""
    },
    ai_recommended: {
      bg: "bg-gradient-to-r from-orange-600 to-rose-600 border border-orange-400/50 text-white relative shadow-[0_0_12px_rgba(234,88,12,0.4)]",
      icon: Sparkles,
      text: "น้องเอแนะนำอัจฉริยะ",
      pulse: "after:absolute after:inset-0 after:rounded-full after:bg-orange-600/20 after:animate-bounce"
    }
  };

  const style = badgeStyles[type] || badgeStyles.boosted;
  const IconComponent = style.icon;

  return (
    <div
      id={`boost-badge-${type}`}
      className={`inline-flex items-center gap-1.5 font-sans font-semibold rounded-full select-none select-none tracking-wide ${style.bg} ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <IconComponent className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{style.text}</span>
      {style.pulse && <span className={`${style.pulse} pointer-events-none`} />}
    </div>
  );
}

interface BoostFrameProps {
  children: React.ReactNode;
  isBoosted: boolean;
  isFeatured: boolean;
  aiScore?: number;
  key?: string;
}

export function BoostFrame({ children, isBoosted, isFeatured, aiScore }: BoostFrameProps) {
  if (!isBoosted && !isFeatured) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <div
      id="boosted-car-frame"
      className={`relative h-full rounded-2xl transition-all duration-300 bg-white dark:bg-zinc-900 overflow-hidden ${
        isFeatured
          ? "border-2 border-orange-500/80 shadow-[0_0_25px_rgba(255,107,0,0.18)] dark:shadow-[0_0_25px_rgba(255,107,0,0.1)] scale-[1.01] hover:scale-[1.02]"
          : "border border-orange-500/30 shadow-[0_4px_20px_rgba(255,107,0,0.06)] hover:border-orange-500/60"
      }`}
    >
      {/* Floating Sparkles & Badges Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
        {isFeatured && <BoostBadge type="featured" size="sm" />}
        {isBoosted && !isFeatured && <BoostBadge type="boosted" size="sm" />}
        {aiScore && aiScore >= 80 && <BoostBadge type="ai_recommended" size="sm" />}
      </div>

      {isFeatured && (
        <span className="absolute right-0 top-0 h-16 w-16 overflow-hidden pointer-events-none">
          <span className="absolute top-2.5 right-[-21px] block w-20 rotate-45 bg-orange-600 text-center text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
            Hot
          </span>
        </span>
      )}

      {children}
    </div>
  );
}

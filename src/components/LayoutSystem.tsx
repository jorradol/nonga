import { ReactNode } from "react";
import { motion } from "motion/react";
import { useAppStore } from "../store";

// Custom type definitions for modern TS layout
export interface LayoutProps {
  children: ReactNode;
  className?: string;
  id?: string;
  key?: string | number;
}

/**
 * Container Component
 * Handles fluid wide desktop scaling, spacing, and modern touch spacing
 */
export function Container({ children, className = "", id }: LayoutProps) {
  return (
    <div
      id={id}
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Section Component
 * Handles standard layout rhythm, negative spaces, and subtitle spacing
 */
interface SectionProps extends LayoutProps {
  title?: string | ReactNode;
  description?: string;
  badge?: string;
}

export function Section({ children, title, description, badge, className = "", id }: SectionProps) {
  const { isDarkMode } = useAppStore();

  return (
    <section id={id} className={`py-6 sm:py-10 space-y-6 ${className}`}>
      {(title || description || badge) && (
        <div className="text-left space-y-2">
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
              {badge}
            </span>
          )}
          {title && (
            <h2 className={`font-display font-black text-2xl sm:text-3xl tracking-tight leading-tight ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}>
              {title}
            </h2>
          )}
          {description && (
            <p className={`text-sm max-w-3xl leading-relaxed ${
              isDarkMode ? "text-slate-400" : "text-slate-600"
            }`}>
              {description}
            </p>
          )}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

/**
 * GradientBackground Component
 * Implements intelligent atmospheric glowing mesh backdrops matching the dark/light state
 */
export function GradientBackground() {
  const { isDarkMode } = useAppStore();

  if (!isDarkMode) {
    return (
      <div className="fixed pointer-events-none inset-0 overflow-hidden z-0">
        <div className="absolute top-[5vh] left-[20vw] w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-[90px] opacity-70"></div>
        <div className="absolute bottom-[10vh] right-[10vw] w-[350px] h-[350px] rounded-full bg-slate-350/10 blur-[100px] opacity-60"></div>
      </div>
    );
  }

  return (
    <div className="fixed pointer-events-none inset-0 overflow-hidden z-0">
      <motion.div 
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.5, 0.35],
          x: [0, 15, 0],
          y: [0, -10, 0]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[2vh] left-[15vw] w-[450px] h-[450px] rounded-full bg-orange-600/5 blur-[120px]"
      />
      
      <motion.div 
         animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.45, 0.3],
          x: [0, -20, 0],
          y: [0, 15, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-[35vh] right-[5vw] w-[350px] h-[350px] rounded-full bg-orange-500/5 blur-[110px]"
      />
      
      <div className="absolute -bottom-10 left-[25vw] w-[400px] h-[400px] rounded-full bg-slate-900/40 blur-[130px]"></div>
    </div>
  );
}

/**
 * AnimatedCard Component
 * Beautiful container emphasizing depth, soft borders, glowing shadows, hover scaling
 */
interface AnimatedCardProps extends LayoutProps {
  onClick?: () => void;
  hoverGlow?: boolean;
}

export function AnimatedCard({ children, className = "", onClick, hoverGlow = true, id }: AnimatedCardProps) {
  const { isDarkMode } = useAppStore();

  return (
    <motion.div
      id={id}
      whileHover={onClick ? { y: -4, scale: 1.006 } : undefined}
      whileTap={onClick ? { scale: 0.995 } : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 ${
        onClick ? "cursor-pointer" : ""
      } ${
        isDarkMode
          ? "bg-[#0d0d0d]/90 hover:bg-[#111111]/95 text-slate-100 border-white/[0.08]" 
          : "bg-white hover:bg-slate-50/50 text-slate-800 border-slate-200/60"
      } ${
        hoverGlow && isDarkMode && onClick ? "hover:shadow-[0_0_24px_rgba(234,88,12,0.1)] hover:border-orange-500/25" : ""
      } ${
        hoverGlow && !isDarkMode && onClick ? "hover:shadow-[0_12px_24px_rgba(0,0,0,0.03)] hover:border-slate-350" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * GlassToolbar Component
 * Minimalistic container featuring clean borders and absolute transparency elements
 */
export function GlassToolbar({ children, className = "", id }: LayoutProps) {
  const { isDarkMode } = useAppStore();

  return (
    <div
      id={id}
      className={`rounded-2xl border p-4 backdrop-filter backdrop-blur-xl transition-all duration-300 ${
        isDarkMode
          ? "bg-[#0d0d0db0] border-white/[0.07] text-white shadow-xl"
          : "bg-white/90 border-slate-200/60 text-slate-850 shadow-md shadow-slate-100"
      } ${className}`}
    >
      {children}
    </div>
  );
}

import React from "react";
import {
  Brain,
  Search,
  Database,
  FileText,
  Code,
  Sparkles,
  CheckCircle2,
  Layers,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import { AIActivityPhase, AIActivityState } from "../types";
import { Language } from "../lib/i18n";
import { getActivityStatusLabel, getActivityIconType } from "../lib/activityDetector";

interface AIStatusIndicatorProps {
  activityState?: AIActivityState | AIActivityPhase;
  language?: Language;
  variant?: "bubble" | "header" | "inline";
  className?: string;
  showIcon?: boolean;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  activityState = "generating",
  language = "en",
  variant = "bubble",
  className = "",
  showIcon = true,
}) => {
  const phase: AIActivityPhase =
    typeof activityState === "string" ? activityState : activityState?.phase || "generating";

  const label = getActivityStatusLabel(activityState, language);
  const iconType = getActivityIconType(phase);

  const renderIcon = () => {
    switch (iconType) {
      case "brain":
        return <Brain className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] animate-pulse shrink-0" />;
      case "memory":
        return <Search className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] animate-spin shrink-0" />;
      case "check":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "file":
        if (phase === "analyzing_image") {
          return <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] animate-pulse shrink-0" />;
        }
        return <FileText className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] animate-pulse shrink-0" />;
      case "code":
        return <Code className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] animate-pulse shrink-0" />;
      case "spinner":
      default:
        return (
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color,#818cf8)] opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-color,#818cf8)]" />
          </span>
        );
    }
  };

  if (variant === "header") {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] text-[11px] font-mono text-[var(--text-secondary,#9ba3b2)] transition-all duration-200 select-none ${className}`}
      >
        {showIcon && renderIcon()}
        <span className="truncate max-w-[170px] sm:max-w-[240px] transition-opacity duration-150">
          {label}
        </span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`inline-flex items-center gap-2 text-xs text-[var(--text-muted,#6b7280)] font-medium select-none transition-all ${className}`}
      >
        {showIcon && renderIcon()}
        <span className="tracking-normal transition-opacity duration-150">{label}</span>
      </div>
    );
  }

  // Default: variant === "bubble" (for active generation placeholder or message footer)
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[var(--bg-secondary,#191a21)]/80 border border-[var(--border-subtle,#1e2029)] text-[13px] text-[var(--text-primary,#e6e9f0)] shadow-xs w-fit select-none animate-fadeIn transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-center w-5 h-5 shrink-0">
        {renderIcon()}
      </div>
      <span className="font-medium tracking-normal leading-none transition-all duration-150">
        {label}
      </span>
    </div>
  );
};

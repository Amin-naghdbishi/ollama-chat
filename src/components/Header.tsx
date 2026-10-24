import React from "react";
import {
  Cpu,
  Download,
  Info,
  Bug,
  RefreshCw,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Brain,
} from "lucide-react";
import { OllamaModel, ConnectionStatus, LiveGenerationMetrics } from "../types";
import { AIStatusIndicator } from "./AIStatusIndicator";
import { Language, getTranslation } from "../lib/i18n";

interface HeaderProps {
  selectedModel: string | null;
  models: OllamaModel[];
  onOpenModelPicker: () => void;
  isModelSpecsOpen?: boolean;
  onToggleModelSpecs?: () => void;
  onOpenModelSpecs?: () => void;
  liveMetrics?: LiveGenerationMetrics;
  connectionStatus: ConnectionStatus;
  onRefreshConnection?: () => void;
  onOpenSettings?: () => void;
  onOpenContextExplorer?: () => void;
  onOpenTroubleshooter: () => void;
  onOpenDebugInspector?: () => void;
  onExportConversation?: (format: "json" | "md") => void;
  language?: Language;
}

export const Header: React.FC<HeaderProps> = ({
  selectedModel,
  models,
  onOpenModelPicker,
  isModelSpecsOpen = false,
  onToggleModelSpecs,
  onOpenModelSpecs,
  liveMetrics,
  connectionStatus,
  onRefreshConnection,
  onOpenContextExplorer,
  onOpenTroubleshooter,
  onOpenDebugInspector,
  onExportConversation,
  language = "en",
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const currentModelObj = models.find(
    (m) => m.name === selectedModel || m.model === selectedModel
  );

  const isGenerating = Boolean(liveMetrics?.isGenerating);
  const hasTokPerSec = Boolean(
    liveMetrics?.tokensPerSec && liveMetrics.tokensPerSec > 0
  );

  const handleSpecsClick = onToggleModelSpecs || onOpenModelSpecs;

  return (
    <header className="h-14 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#262626)] px-3 sm:px-4 flex items-center justify-between z-10 shrink-0 select-none transition-colors">
      {/* Left (or Start in RTL): Model Selector, Connection Status, tok/s, & Model Specs */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-hidden min-w-0">
        {/* Model Selector Pill */}
        <button
          onClick={onOpenModelPicker}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] text-xs font-medium text-[var(--text-primary,#eee)] transition-all shadow-xs shrink-0 cursor-pointer"
          title={t("selectModel")}
        >
          <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
          <span className="font-mono text-[var(--text-primary,#eee)] font-semibold max-w-[110px] sm:max-w-[180px] md:max-w-[220px] truncate">
            {selectedModel || t("selectModel")}
          </span>
          {currentModelObj?.details?.parameter_size && (
            <span className="hidden md:inline-block px-1.5 py-0.2 rounded bg-[var(--btn-bg,#262626)] text-[10px] text-[var(--text-muted,#888)] uppercase font-mono">
              {currentModelObj.details.parameter_size}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted,#666)] shrink-0" />
        </button>

        {/* Connection Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenTroubleshooter}
            className={`cursor-pointer flex items-center gap-1.5 sm:gap-2 text-xs border px-2.5 sm:px-3 py-1 rounded-full bg-[var(--bg-secondary,#111)] transition-colors ${
              connectionStatus.isConnected
                ? "border-emerald-800/70 hover:border-emerald-500/80 text-emerald-300"
                : "border-red-800/80 hover:border-red-500/80 text-red-300"
            }`}
            title={
              connectionStatus.isConnected
                ? `Connected (${connectionStatus.endpoint})`
                : `Disconnected (${connectionStatus.endpoint})`
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus.isConnected
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-red-500"
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-mono font-medium">
              {connectionStatus.isConnected ? t("connected") : t("disconnected")}
            </span>
          </button>

          {!connectionStatus.isConnected && onRefreshConnection && (
            <button
              onClick={onRefreshConnection}
              className="px-2 py-1 rounded-full bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-200 text-[11px] font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title={t("retry")}
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  connectionStatus.isChecking ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">{t("retry")}</span>
            </button>
          )}
        </div>

        {/* Live Generation & Activity Indicator */}
        {isGenerating ? (
          <div className="flex items-center gap-1.5 shrink-0 animate-fadeIn">
            <AIStatusIndicator
              variant="header"
              activityState={liveMetrics?.activityState || "generating"}
              language={language}
            />
            {hasTokPerSec && (
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/70 text-emerald-300 text-[11px] font-mono shrink-0 animate-fadeIn"
                title="Real-time generation speed"
              >
                <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400/40 animate-pulse shrink-0" />
                <span className="font-semibold">
                  {liveMetrics!.tokensPerSec!.toFixed(1)} {t("tokSec")}
                </span>
              </div>
            )}
          </div>
        ) : hasTokPerSec ? (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-subtle,#262626)] text-[var(--text-secondary,#9ba3b2)] text-[11px] font-mono shrink-0"
            title={`Speed: ${liveMetrics!.tokensPerSec!.toFixed(1)} tok/s`}
          >
            <Zap className="w-3 h-3 text-[var(--accent-color,#818cf8)] shrink-0" />
            <span>{liveMetrics!.tokensPerSec!.toFixed(1)} {t("tokSec")}</span>
          </div>
        ) : null}

        {/* Model Specs Button */}
        {handleSpecsClick && (
          <button
            onClick={handleSpecsClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-xs shrink-0 ${
              isModelSpecsOpen
                ? "bg-[var(--accent-color,#818cf8)] text-white border-[var(--accent-color,#818cf8)] shadow-xs"
                : "bg-[var(--bg-secondary,#1a1a1a)] hover:bg-[var(--btn-hover,#262626)] border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#eee)]"
            }`}
            title={isModelSpecsOpen ? t("collapseSpecs") : t("expandSpecs")}
            aria-expanded={isModelSpecsOpen}
          >
            <Info
              className={`w-3.5 h-3.5 shrink-0 ${
                isModelSpecsOpen ? "text-white" : "text-[var(--accent-color,#818cf8)]"
              }`}
            />
            <span className="hidden sm:inline">{t("modelSpecs")}</span>
            <span className="sm:hidden text-[11px]">{t("specs")}</span>
            {isModelSpecsOpen ? (
              <ChevronUp className="w-3 h-3 shrink-0 opacity-90" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
            )}
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Export Chat Menu */}
        {onExportConversation && (
          <div className="relative group">
            <button
              className="p-2 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--btn-hover,#444)] text-[var(--text-secondary,#888)] hover:text-[var(--text-primary,#eee)] transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title={t("exportConversation")}
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1 hidden group-hover:flex flex-col bg-[var(--bg-surface,#1a1a1a)] border border-[var(--border-color,#262626)] rounded-xl p-1 shadow-xl z-30 min-w-[140px]">
              <button
                onClick={() => onExportConversation("md")}
                className="px-3 py-1.5 text-left rtl:text-right text-xs text-[var(--text-primary,#ccc)] hover:bg-[var(--btn-hover,#262626)] rounded-lg transition-colors cursor-pointer"
              >
                {t("exportMarkdown")}
              </button>
              <button
                onClick={() => onExportConversation("json")}
                className="px-3 py-1.5 text-left rtl:text-right text-xs text-[var(--text-primary,#ccc)] hover:bg-[var(--btn-hover,#262626)] rounded-lg transition-colors cursor-pointer"
              >
                {t("exportJson")}
              </button>
            </div>
          </div>
        )}

        {/* Context Explorer Button */}
        {onOpenContextExplorer && (
          <button
            onClick={onOpenContextExplorer}
            className="p-2 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] text-[var(--text-secondary,#888)] hover:text-[var(--accent-color,#818cf8)] transition-colors cursor-pointer"
            title={t("contextExplorer")}
          >
            <Brain className="w-4 h-4" />
          </button>
        )}

        {/* Debug Inspector Button */}
        {onOpenDebugInspector && (
          <button
            onClick={onOpenDebugInspector}
            className="p-2 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] text-[var(--text-secondary,#888)] hover:text-[var(--accent-color,#818cf8)] transition-colors cursor-pointer"
            title={t("debugInspector")}
          >
            <Bug className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

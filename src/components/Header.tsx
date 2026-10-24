import React from "react";
import {
  Cpu,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Brain,
  Bug,
  Sparkles,
} from "lucide-react";
import { OllamaModel, ConnectionStatus } from "../types";
import { Language, getTranslation } from "../lib/i18n";

interface HeaderProps {
  selectedModel: string | null;
  models?: OllamaModel[];
  onOpenModelPicker: () => void;
  isModelSpecsOpen?: boolean;
  onToggleModelSpecs?: () => void;
  onOpenModelSpecs?: () => void;
  connectionStatus?: ConnectionStatus;
  onRefreshConnection?: () => void;
  onOpenSettings?: () => void;
  onOpenContextExplorer?: () => void;
  onOpenTroubleshooter?: () => void;
  onOpenDebugInspector?: () => void;
  onExportConversation?: (format: "json" | "md") => void;
  language?: Language;
  // Unused props kept optional for backwards compatibility
  selectedImageModel?: string | null;
  imageModels?: string[];
  isLoadingImageModels?: boolean;
  onSelectImageModel?: (modelName: string) => void;
  onRefreshImageModels?: () => void;
  ollamaServiceState?: any;
  ollamaServiceError?: string;
  onStartOllama?: () => void;
  onStopOllama?: () => void;
  isStartingOllama?: boolean;
  comfyServiceState?: any;
  comfyServiceError?: string;
  onStartComfy?: () => void;
  onStopComfy?: () => void;
  isStartingComfy?: boolean;
  liveMetrics?: any;
}

export const Header: React.FC<HeaderProps> = ({
  selectedModel,
  onOpenModelPicker,
  isModelSpecsOpen = false,
  onToggleModelSpecs,
  onOpenModelSpecs,
  onOpenContextExplorer,
  onOpenDebugInspector,
  onExportConversation,
  language = "en",
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const handleSpecsClick = onToggleModelSpecs || onOpenModelSpecs;

  return (
    <header className="h-13 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#262626)] px-3 sm:px-4 flex items-center justify-between z-10 shrink-0 select-none transition-colors">
      {/* Left: Minimal Selected Model Button */}
      <div className="flex items-center gap-2 overflow-hidden min-w-0">
        <button
          onClick={onOpenModelPicker}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] hover:bg-[var(--bg-surface,#262626)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] transition-all cursor-pointer shadow-xs group"
          title={`${t("selectModel")}: ${selectedModel || t("selectModel")}`}
        >
          <Cpu className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0 transition-transform group-hover:scale-110" />
          <span className="font-mono text-xs font-semibold text-[var(--text-primary,#eee)] max-w-[150px] sm:max-w-[240px] truncate">
            {selectedModel || t("selectModel")}
          </span>
          <ChevronDown className="w-3 h-3 text-[var(--text-muted,#777)] group-hover:text-[var(--text-primary,#eee)] transition-colors shrink-0" />
        </button>
      </div>

      {/* Right: Model Specs & Secondary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Model Specs Toggle Button */}
        {handleSpecsClick && (
          <button
            onClick={handleSpecsClick}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-xs shrink-0 ${
              isModelSpecsOpen
                ? "bg-[var(--accent-color,#818cf8)] text-white border-[var(--accent-color,#818cf8)]"
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

        {/* Export Conversation Menu */}
        {onExportConversation && (
          <div className="relative group">
            <button
              className="p-1.5 sm:p-2 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--btn-hover,#444)] text-[var(--text-secondary,#888)] hover:text-[var(--text-primary,#eee)] transition-colors text-xs flex items-center gap-1 cursor-pointer"
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
            className="p-1.5 sm:p-2 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] text-[var(--text-secondary,#888)] hover:text-[var(--accent-color,#818cf8)] transition-colors cursor-pointer"
            title={t("contextExplorer")}
          >
            <Brain className="w-4 h-4" />
          </button>
        )}

        {/* Debug Inspector Button */}
        {onOpenDebugInspector && (
          <button
            onClick={onOpenDebugInspector}
            className="p-1.5 sm:p-2 rounded-xl bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] text-[var(--text-secondary,#888)] hover:text-[var(--accent-color,#818cf8)] transition-colors cursor-pointer"
            title={t("debugInspector")}
          >
            <Bug className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

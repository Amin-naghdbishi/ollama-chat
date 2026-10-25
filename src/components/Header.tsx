import React from "react";
import { ChevronDown, Menu, Settings } from "lucide-react";
import { OllamaModel, ConnectionStatus } from "../types";
import { Language, getTranslation } from "../lib/i18n";

export interface HeaderProps {
  selectedModel: string | null;
  models?: OllamaModel[];
  onOpenModelPicker: () => void;
  isModelSpecsOpen?: boolean;
  onToggleModelSpecs?: () => void;
  onOpenModelSpecs?: () => void;
  onOpenSettings?: () => void;
  onOpenMobileSidebar?: () => void;
  language?: Language;
  // Optional props retained for backward compatibility
  connectionStatus?: ConnectionStatus;
  onRefreshConnection?: () => void;
  onOpenContextExplorer?: () => void;
  onOpenTroubleshooter?: () => void;
  onOpenDebugInspector?: () => void;
  onExportConversation?: (format: "json" | "md") => void;
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
  onOpenSettings,
  onOpenMobileSidebar,
  language = "en",
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const handleSpecsClick = onToggleModelSpecs || onOpenModelSpecs;

  return (
    <header className="w-full bg-transparent border-0 px-3 sm:px-6 pt-2.5 sm:pt-3 pb-1 flex items-center justify-between z-10 shrink-0 select-none transition-colors">
      {/* Left / Center Group: Mobile Hamburger, Model Name Selector, Chevron-only Specs Toggle */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
        {/* Mobile Hamburger Menu Button (Phone-sized screens only) */}
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 -ml-1 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 active:scale-95 transition-all cursor-pointer"
            aria-label="Open sidebar menu"
            title="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* 1. Model Selector: Displays ONLY the currently selected model's name (no icons, no decorative boxes) */}
        <button
          type="button"
          onClick={onOpenModelPicker}
          className="px-2 py-1 rounded-lg hover:bg-[var(--btn-hover,#262834)]/50 transition-colors cursor-pointer text-sm sm:text-xs font-mono font-medium text-[var(--text-primary,#e6e9f0)] hover:text-[var(--accent-color,#818cf8)] truncate max-w-[150px] xs:max-w-[210px] sm:max-w-[320px]"
          title={`${t("selectModel")}: ${selectedModel || t("selectModel")}`}
          aria-label={`${t("selectModel")}: ${selectedModel || t("selectModel")}`}
        >
          {selectedModel || t("selectModel")}
        </button>

        {/* 2. Model Specs Toggle: Downward-pointing chevron ONLY (no text label, rotates upward when expanded) */}
        {handleSpecsClick && (
          <button
            type="button"
            onClick={handleSpecsClick}
            aria-label={isModelSpecsOpen ? t("collapseSpecs") : t("expandSpecs")}
            title={isModelSpecsOpen ? t("collapseSpecs") : t("expandSpecs")}
            aria-expanded={isModelSpecsOpen}
            className="p-1.5 rounded-lg text-[var(--text-muted,#777)] hover:text-[var(--text-primary,#eee)] hover:bg-[var(--btn-hover,#262834)]/50 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isModelSpecsOpen ? "rotate-180 text-[var(--accent-color,#818cf8)]" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Right Group: Settings Button directly in Mobile Header (hidden on Desktop) */}
      {onOpenSettings && (
        <div className="md:hidden flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 -mr-1 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 active:scale-95 transition-all cursor-pointer"
            aria-label={t("settings")}
            title={t("settings")}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
};

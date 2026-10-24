import React, { useState, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  Play,
  Square,
  Loader2,
  AlertCircle,
  Search,
  Check,
} from "lucide-react";
import { OllamaModel, ConnectionStatus, LiveGenerationMetrics, ServiceState } from "../types";
import { AIStatusIndicator } from "./AIStatusIndicator";
import { Language, getTranslation } from "../lib/i18n";

interface HeaderProps {
  selectedModel: string | null;
  models: OllamaModel[];
  onOpenModelPicker: () => void;
  // Image Generation Model & Service Controls
  selectedImageModel?: string | null;
  imageModels?: string[];
  isLoadingImageModels?: boolean;
  onSelectImageModel?: (modelName: string) => void;
  onRefreshImageModels?: () => void;
  ollamaServiceState?: ServiceState;
  ollamaServiceError?: string;
  onStartOllama?: () => void;
  onStopOllama?: () => void;
  isStartingOllama?: boolean;
  comfyServiceState?: ServiceState;
  comfyServiceError?: string;
  onStartComfy?: () => void;
  onStopComfy?: () => void;
  isStartingComfy?: boolean;
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
  selectedImageModel,
  imageModels = [],
  isLoadingImageModels = false,
  onSelectImageModel,
  onRefreshImageModels,
  ollamaServiceState = "Stopped",
  ollamaServiceError,
  onStartOllama,
  onStopOllama,
  isStartingOllama = false,
  comfyServiceState = "Stopped",
  comfyServiceError,
  onStartComfy,
  onStopComfy,
  isStartingComfy = false,
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

  const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImageDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentModelObj = models.find(
    (m) => m.name === selectedModel || m.model === selectedModel
  );

  const isGenerating = Boolean(liveMetrics?.isGenerating);
  const hasTokPerSec = Boolean(
    liveMetrics?.tokensPerSec && liveMetrics.tokensPerSec > 0
  );

  const handleSpecsClick = onToggleModelSpecs || onOpenModelSpecs;

  // Filter image checkpoints by search query
  const filteredImageModels = imageModels.filter((m) =>
    m.toLowerCase().includes(imageSearchQuery.toLowerCase())
  );

  // Helper for service status color
  const getStatusColor = (state: ServiceState) => {
    switch (state) {
      case "Running":
        return "bg-emerald-400";
      case "Starting":
        return "bg-amber-400 animate-pulse";
      case "Error":
        return "bg-red-500";
      case "Stopped":
      default:
        return "bg-neutral-500";
    }
  };

  return (
    <header className="h-14 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#262626)] px-3 sm:px-4 flex items-center justify-between z-10 shrink-0 select-none transition-colors">
      {/* Left: Model Selectors & Compact Service Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-hidden min-w-0">
        {/* Chat Model Selector & Compact Ollama Controls Group */}
        <div className="flex items-center bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)] rounded-xl transition-all shadow-xs shrink-0 overflow-hidden">
          <button
            onClick={onOpenModelPicker}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary,#eee)] cursor-pointer hover:bg-[var(--bg-surface,#262626)] transition-colors"
            title={`${t("selectModel")}: ${selectedModel || t("selectModel")}`}
          >
            <Cpu className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0" />
            <span className="font-mono text-[var(--text-primary,#eee)] font-semibold max-w-[90px] sm:max-w-[140px] truncate">
              {selectedModel || t("selectModel")}
            </span>
            {currentModelObj?.details?.parameter_size && (
              <span className="hidden lg:inline-block px-1.5 py-0.2 rounded bg-[var(--btn-bg,#262626)] text-[9px] text-[var(--text-muted,#888)] uppercase font-mono">
                {currentModelObj.details.parameter_size}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-[var(--text-muted,#666)] shrink-0" />
          </button>

          {/* Compact Ollama Service Indicator & Start/Stop Control */}
          <div className="flex items-center gap-1 px-1.5 py-1 border-l border-[var(--border-color,#262626)] bg-[var(--bg-primary,#111)]/60">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(ollamaServiceState)}`}
              title={`Ollama: ${ollamaServiceState}${ollamaServiceError ? ` (${ollamaServiceError})` : ""}`}
            />
            {ollamaServiceState === "Running" ? (
              <button
                onClick={onStopOllama}
                className="p-1 rounded hover:bg-red-950/80 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                title={`${t("stopService")} Ollama`}
              >
                <Square className="w-2.5 h-2.5 fill-current" />
              </button>
            ) : ollamaServiceState === "Starting" || isStartingOllama ? (
              <span className="p-1 text-amber-400" title={t("serviceStarting")}>
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              </span>
            ) : (
              <button
                onClick={onStartOllama}
                className="p-1 rounded hover:bg-emerald-950/80 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title={`${t("startService")} Ollama`}
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
            )}
          </div>
        </div>

        {/* Image Generation Model Selector & Compact ComfyUI Controls Group */}
        <div className="relative flex items-center bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-color,#262626)] hover:border-pink-500/60 rounded-xl transition-all shadow-xs shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsImageDropdownOpen(!isImageDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary,#eee)] cursor-pointer hover:bg-[var(--bg-surface,#262626)] transition-colors rounded-l-xl"
            title={`${t("imageModel")}: ${selectedImageModel || t("selectImageModel")}`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span className="font-mono text-[var(--text-primary,#eee)] font-medium max-w-[85px] sm:max-w-[130px] truncate">
              {selectedImageModel || t("selectImageModel")}
            </span>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted,#666)] shrink-0" />
          </button>

          {/* Compact ComfyUI Service Indicator & Start/Stop Control */}
          <div className="flex items-center gap-1 px-1.5 py-1 border-l border-[var(--border-color,#262626)] bg-[var(--bg-primary,#111)]/60 rounded-r-xl">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(comfyServiceState)}`}
              title={`ComfyUI: ${comfyServiceState}${comfyServiceError ? ` (${comfyServiceError})` : ""}`}
            />
            {comfyServiceState === "Running" ? (
              <button
                onClick={onStopComfy}
                className="p-1 rounded hover:bg-red-950/80 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                title={`${t("stopService")} ComfyUI`}
              >
                <Square className="w-2.5 h-2.5 fill-current" />
              </button>
            ) : comfyServiceState === "Starting" || isStartingComfy ? (
              <span className="p-1 text-amber-400" title={t("serviceStarting")}>
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              </span>
            ) : (
              <button
                onClick={onStartComfy}
                className="p-1 rounded hover:bg-emerald-950/80 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title={`${t("startService")} ComfyUI`}
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
            )}
          </div>

          {/* Image Checkpoint Selection Popover Dropdown */}
          {isImageDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-[var(--bg-secondary,#16171d)] border border-[var(--border-color,#282a36)] rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--border-subtle,#20222c)] mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary,#eee)]">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>{t("imageModel")}</span>
                </div>
                {onRefreshImageModels && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshImageModels();
                    }}
                    className="p-1 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#777)] hover:text-[var(--text-primary,#eee)] transition-colors cursor-pointer"
                    title={t("refreshCheckpoints")}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingImageModels ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>

              {/* Checkpoint Search Box */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  placeholder="Filter checkpoints..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-primary,#101115)] border border-[var(--border-subtle,#20222c)] rounded-xl text-[var(--text-primary,#eee)] placeholder:text-neutral-500 focus:outline-none focus:border-pink-500/70"
                />
              </div>

              {/* Dynamic Checkpoints List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {isLoadingImageModels ? (
                  <div className="py-6 flex flex-col items-center justify-center text-xs text-[var(--text-muted,#888)] gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                    <span>Loading ComfyUI checkpoints...</span>
                  </div>
                ) : filteredImageModels.length > 0 ? (
                  filteredImageModels.map((ckpt) => {
                    const isSelected = ckpt === selectedImageModel;
                    return (
                      <button
                        key={ckpt}
                        onClick={() => {
                          onSelectImageModel?.(ckpt);
                          setIsImageDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-pink-950/40 border border-pink-700/50 text-pink-200"
                            : "hover:bg-[var(--bg-surface,#1f212a)] text-[var(--text-secondary,#aaa)]"
                        }`}
                      >
                        <span className="font-mono truncate mr-2" title={ckpt}>
                          {ckpt}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 px-3 text-center text-xs text-[var(--text-muted,#888)]">
                    <p className="font-medium text-neutral-400">{t("noCheckpointsFound")}</p>
                    <p className="text-[11px] mt-1 text-neutral-500">
                      {comfyServiceState !== "Running"
                        ? "Start ComfyUI service to load models."
                        : "Place .safetensors models in ComfyUI/models/checkpoints"}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-secondary,#1a1a1a)] border border-[var(--border-subtle,#262626)] text-[var(--text-muted,#888)] text-[10.5px] font-mono shrink-0"
            title="Last generation speed"
          >
            <Zap className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>
              {liveMetrics!.tokensPerSec!.toFixed(1)} {t("tokSec")}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right: Actions, Context Explorer, Specs & Settings */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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

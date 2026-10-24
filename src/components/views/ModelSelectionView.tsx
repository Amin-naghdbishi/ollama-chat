import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Cpu,
  Check,
  Info,
  Brain,
  Eye,
  RefreshCw,
  HardDrive,
  Star,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Play,
  Square,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { OllamaModel, AppSettings, ServiceState } from "../../types";
import { formatBytes } from "../../lib/formatters";
import { detectModelCapabilities } from "../../services/ollamaApi";
import { Storage } from "../../lib/storage";
import { getDefaultImageModelProfile } from "../../services/imageSettingsService";
import { getTranslation } from "../../lib/i18n";

interface ModelSelectionViewProps {
  models: OllamaModel[];
  selectedModel: string | null;
  onSelectModel: (modelName: string) => void;
  onRefreshModels: () => void;
  isLoadingModels: boolean;
  settings: AppSettings;
  onBack: () => void;
  onOpenModelDetails: (modelName: string) => void;
  onOpenModelProfile: (modelName: string) => void;
  // Image Generation Models & Service Controls
  selectedImageModel?: string | null;
  imageModels?: string[];
  isLoadingImageModels?: boolean;
  onSelectImageModel?: (modelName: string) => void;
  onRefreshImageModels?: () => void;
  ollamaServiceState?: ServiceState;
  onStartOllama?: () => void;
  onStopOllama?: () => void;
  isStartingOllama?: boolean;
  comfyServiceState?: ServiceState;
  onStartComfy?: () => void;
  onStopComfy?: () => void;
  isStartingComfy?: boolean;
}

export const ModelSelectionView: React.FC<ModelSelectionViewProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onRefreshModels,
  isLoadingModels,
  settings,
  onBack,
  onOpenModelDetails,
  onOpenModelProfile,
  selectedImageModel,
  imageModels = [],
  isLoadingImageModels = false,
  onSelectImageModel,
  onRefreshImageModels,
  ollamaServiceState = "Stopped",
  onStartOllama,
  onStopOllama,
  isStartingOllama = false,
  comfyServiceState = "Stopped",
  onStartComfy,
  onStopComfy,
  isStartingComfy = false,
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(settings.language, key);
  const [activeTab, setActiveTab] = useState<"chat" | "image">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "vision" | "reasoning" | "favorites">("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "family">("name");
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    setFavoriteModels(Storage.getFavoriteModels());
  }, []);

  const toggleFavorite = (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation();
    let updated: string[];
    if (favoriteModels.includes(modelName)) {
      updated = favoriteModels.filter((m) => m !== modelName);
    } else {
      updated = [...favoriteModels, modelName];
    }
    setFavoriteModels(updated);
    Storage.saveFavoriteModels(updated);
  };

  const filteredModels = models
    .filter((m) => {
      const q = searchQuery.toLowerCase();
      if (q && !m.name.toLowerCase().includes(q)) return false;

      const caps = detectModelCapabilities(m.name, null, m);
      if (categoryFilter === "vision" && !caps.supportsVision) return false;
      if (categoryFilter === "reasoning" && caps.supportsThinking !== "supported") return false;
      if (categoryFilter === "favorites" && !favoriteModels.includes(m.name)) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "size") return b.size - a.size;
      if (sortBy === "family") {
        const famA = a.details?.family || "";
        const famB = b.details?.family || "";
        return famA.localeCompare(famB);
      }
      return a.name.localeCompare(b.name);
    });

  const filteredImageModels = imageModels.filter((m) =>
    m.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredModels.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredModels[selectedIndex]) {
        e.preventDefault();
        onSelectModel(filteredModels[selectedIndex].name);
      } else if (e.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredModels, selectedIndex, onSelectModel, onBack]);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary,#131418)] animate-fadeIn">
      {/* Top Header */}
      <header className="h-14 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#282a36)] px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-primary,#e6e9f0)] hover:text-white transition-all shadow-xs cursor-pointer group"
            title="Return to previous view"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent-color,#818cf8)] group-hover:-translate-x-0.5 transition-transform rtl:rotate-180" />
            <span>{t("back")}</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color,#282a36)]" />

          {/* Model Type Selector Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-primary,#111)] border border-[var(--border-subtle,#20222c)] rounded-xl">
            <button
              onClick={() => {
                setActiveTab("chat");
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "chat"
                  ? "bg-[var(--bg-surface,#232530)] text-[var(--text-primary,#eee)] shadow-xs"
                  : "text-[var(--text-muted,#888)] hover:text-[var(--text-primary,#eee)]"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
              <span>{t("chatModels")} ({models.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("image");
                setSearchQuery("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === "image"
                  ? "bg-[var(--bg-surface,#232530)] text-[var(--text-primary,#eee)] shadow-xs"
                  : "text-[var(--text-muted,#888)] hover:text-[var(--text-primary,#eee)]"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
              <span>{t("imageModels")} ({imageModels.length})</span>
            </button>
          </div>
        </div>

        <button
          onClick={activeTab === "chat" ? onRefreshModels : onRefreshImageModels}
          disabled={activeTab === "chat" ? isLoadingModels : isLoadingImageModels}
          className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Refresh models list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(activeTab === "chat" ? isLoadingModels : isLoadingImageModels) ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{t("refresh")}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-4">
          {activeTab === "chat" ? (
            <div className="space-y-4">
              {/* Ollama Service Controls Bar (Compact & Visually Secondary) */}
              <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface,#191b22)] border border-[var(--border-color,#282a36)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(ollamaServiceState)}`} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary,#eee)]">{t("ollamaService")}:</span>
                    <span className="text-xs font-mono font-medium text-[var(--text-secondary,#aaa)]">
                      {ollamaServiceState === "Running" ? t("serviceRunning") : ollamaServiceState === "Starting" ? t("serviceStarting") : ollamaServiceState === "Error" ? t("serviceError") : t("serviceStopped")}
                    </span>
                  </div>
                  <span className="text-neutral-600 hidden sm:inline">•</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted,#777)] hidden sm:inline dir-ltr">
                    {settings.endpoint || "http://127.0.0.1:11434"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {ollamaServiceState === "Running" ? (
                    <button
                      onClick={onStopOllama}
                      className="px-2.5 py-1 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>{t("stopService")}</span>
                    </button>
                  ) : ollamaServiceState === "Starting" || isStartingOllama ? (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{t("serviceStarting")}</span>
                    </span>
                  ) : (
                    <button
                      onClick={onStartOllama}
                      className="px-2.5 py-1 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{t("startService")}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Filters Toolbar */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3 shadow-xs">
                {/* Search Input */}
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchModelsPlaceholder")}
                    className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-2.5 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] font-sans"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 rtl:right-auto rtl:left-3.5 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-secondary,#9ba3b2)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs & Sort */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5">
                  <div className="flex items-center gap-1 bg-[var(--bg-primary,#131418)] p-1 rounded-xl border border-[var(--border-subtle,#1e2029)] text-xs">
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        categoryFilter === "all"
                          ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold shadow-xs"
                          : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                      }`}
                    >
                      {t("all")} ({models.length})
                    </button>
                    <button
                      onClick={() => setCategoryFilter("vision")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        categoryFilter === "vision"
                          ? "bg-[var(--bg-surface,#1f212a)] text-blue-400 font-semibold shadow-xs"
                          : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t("vision")}</span>
                    </button>
                    <button
                      onClick={() => setCategoryFilter("reasoning")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        categoryFilter === "reasoning"
                          ? "bg-[var(--bg-surface,#1f212a)] text-purple-400 font-semibold shadow-xs"
                          : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{t("reasoning")}</span>
                    </button>
                    <button
                      onClick={() => setCategoryFilter("favorites")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        categoryFilter === "favorites"
                          ? "bg-[var(--bg-surface,#1f212a)] text-amber-400 font-semibold shadow-xs"
                          : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{t("favorites")} ({favoriteModels.length})</span>
                    </button>
                  </div>

                  {/* Sorting */}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary,#9ba3b2)]">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)]" />
                    <span>{t("sortBy")}:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] border border-[var(--input-border,#2a2d3c)] rounded-xl px-2.5 py-1.5 focus:outline-none text-xs"
                    >
                      <option value="name">{t("nameAsc")}</option>
                      <option value="size">{t("sizeLargest")}</option>
                      <option value="family">{t("family") || "Architecture"}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chat Models List */}
              <div className="space-y-2.5">
                {filteredModels.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-muted,#6b7280)] space-y-2">
                    <p className="text-neutral-400 font-medium">No chat models found.</p>
                    {models.length === 0 && (
                      <p className="text-[var(--text-muted,#888)]">
                        Ensure Ollama is running, or pull a model with <code className="bg-[var(--bg-primary,#131418)] px-2 py-0.5 rounded text-[var(--accent-color,#818cf8)] font-mono">ollama run llama3.2</code>
                      </p>
                    )}
                  </div>
                ) : (
                  filteredModels.map((m) => {
                    const isSelected = selectedModel === m.name || selectedModel === m.model;
                    const caps = detectModelCapabilities(m.name, null, m);
                    const hasVision = caps.supportsVision;
                    const hasThinking = caps.supportsThinking === "supported";

                    return (
                      <div
                        key={m.name}
                        className={`group p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer ${
                          isSelected
                            ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] ring-1 ring-[var(--accent-color,#818cf8)]/30 shadow-md"
                            : "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]"
                        }`}
                        onClick={() => {
                          onSelectModel(m.name);
                        }}
                      >
                        {/* Model Info & Badges */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Cpu className={`w-4.5 h-4.5 shrink-0 ${
                            isSelected ? "text-[var(--accent-color,#818cf8)]" : "text-[var(--text-secondary,#9ba3b2)]"
                          }`} />

                          <div className="flex flex-col text-left rtl:text-right overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[var(--text-primary,#e6e9f0)] truncate">
                                {m.name}
                              </span>

                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color,#818cf8)] text-white text-[9.5px] font-bold flex items-center gap-1 shadow-xs">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>{t("active")}</span>
                                </span>
                              )}

                              {hasVision && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/80 text-blue-300 text-[9.5px] font-medium flex items-center gap-1">
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>{t("vision")}</span>
                                </span>
                              )}

                              {hasThinking && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/80 text-purple-300 text-[9.5px] font-medium flex items-center gap-1">
                                  <Brain className="w-2.5 h-2.5" />
                                  <span>{t("reasoning")}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[var(--text-muted,#6b7280)] font-mono">
                              {m.details?.parameter_size && (
                                <span className="text-[var(--text-secondary,#9ba3b2)] font-semibold">
                                  {m.details.parameter_size}
                                </span>
                              )}
                              {m.details?.family && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{m.details.family}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3 text-[var(--text-muted,#6b7280)]" />
                                {formatBytes(m.size)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleFavorite(e, m.name)}
                            className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] hover:text-amber-300 transition-colors cursor-pointer"
                            title={favoriteModels.includes(m.name) ? "Remove favorite" : "Star favorite"}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                favoriteModels.includes(m.name) ? "text-amber-400 fill-amber-400" : ""
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => onOpenModelDetails(m.name)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                          >
                            <Info className="w-3 h-3" />
                            <span>{t("modelDetails")}</span>
                          </button>

                          <button
                            onClick={() => onOpenModelProfile(m.name)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>{t("modelProfile")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectModel(m.name);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-[var(--accent-color,#818cf8)] text-white hover:brightness-110 shadow-xs"
                                : "bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--accent-color,#818cf8)] hover:text-white border border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)]"
                            }`}
                          >
                            <span>{isSelected ? t("active") : t("select")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ComfyUI Service Controls Bar (Compact & Visually Secondary) */}
              <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface,#191b22)] border border-[var(--border-color,#282a36)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(comfyServiceState)}`} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary,#eee)]">{t("comfyService")}:</span>
                    <span className="text-xs font-mono font-medium text-[var(--text-secondary,#aaa)]">
                      {comfyServiceState === "Running" ? t("serviceRunning") : comfyServiceState === "Starting" ? t("serviceStarting") : comfyServiceState === "Error" ? t("serviceError") : t("serviceStopped")}
                    </span>
                  </div>
                  <span className="text-neutral-600 hidden sm:inline">•</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted,#777)] hidden sm:inline dir-ltr">
                    {settings.comfyUiEndpoint || "http://127.0.0.1:8188"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {comfyServiceState === "Running" ? (
                    <button
                      onClick={onStopComfy}
                      className="px-2.5 py-1 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>{t("stopService")}</span>
                    </button>
                  ) : comfyServiceState === "Starting" || isStartingComfy ? (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{t("serviceStarting")}</span>
                    </span>
                  ) : (
                    <button
                      onClick={onStartComfy}
                      className="px-2.5 py-1 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{t("startService")}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Checkpoint Search */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ComfyUI checkpoints (e.g. DreamShaper_8, sd_xl, v1-5)..."
                  className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-2.5 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 rtl:right-auto rtl:left-3.5 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-secondary,#9ba3b2)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Active Image Checkpoint Profile Banner */}
              {selectedImageModel && (
                (() => {
                  const activeProf = Storage.getImageModelProfile(selectedImageModel) || getDefaultImageModelProfile(selectedImageModel);
                  return (
                    <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ImageIcon className="w-4.5 h-4.5 text-[var(--accent-color,#818cf8)] shrink-0" />
                        <div className="min-w-0 text-left rtl:text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-[var(--text-muted,#888)]">{t("activeModelProfile")}:</span>
                            <span className="font-mono text-xs font-bold text-[var(--text-primary,#eee)] truncate">{selectedImageModel}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[var(--text-secondary,#aaa)]">
                            <span>{activeProf.width} × {activeProf.height} px</span>
                            <span>•</span>
                            <span className="capitalize">{activeProf.aspectRatio}</span>
                            <span>•</span>
                            <span className="capitalize">{activeProf.qualityPreset} quality</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenModelProfile(selectedImageModel)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-primary,#e6e9f0)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-[var(--accent-color,#818cf8)]" />
                        <span>{t("modelProfile")}</span>
                      </button>
                    </div>
                  );
                })()
              )}

              {/* Checkpoints List */}
              <div className="space-y-2">
                {isLoadingImageModels ? (
                  <div className="py-12 flex flex-col items-center justify-center text-xs text-[var(--text-muted,#888)] gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-color,#818cf8)]" />
                    <span>Discovering ComfyUI checkpoints...</span>
                  </div>
                ) : filteredImageModels.length > 0 ? (
                  filteredImageModels.map((ckpt) => {
                    const isSelected = ckpt === selectedImageModel;
                    const ckptProf = Storage.getImageModelProfile(ckpt) || getDefaultImageModelProfile(ckpt);
                    return (
                      <div
                        key={ckpt}
                        onClick={() => onSelectImageModel?.(ckpt)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] ring-1 ring-[var(--accent-color,#818cf8)]/30 shadow-md"
                            : "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 mr-3 rtl:mr-0 rtl:ml-3">
                          <ImageIcon className={`w-4.5 h-4.5 shrink-0 ${
                            isSelected ? "text-[var(--accent-color,#818cf8)]" : "text-[var(--text-muted,#888)]"
                          }`} />
                          <div className="min-w-0 text-left rtl:text-right">
                            <span className="font-semibold text-xs text-[var(--text-primary,#eee)] font-mono block truncate" title={ckpt}>
                              {ckpt}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted,#777)] font-mono">
                              <span>{ckptProf.width} × {ckptProf.height}</span>
                              <span>•</span>
                              <span className="capitalize">{ckptProf.aspectRatio}</span>
                              <span>•</span>
                              <span className="capitalize">{ckptProf.qualityPreset}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onOpenModelProfile(ckpt)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                            title="Configure image generation settings & defaults"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>{t("modelProfile")}</span>
                          </button>

                          {isSelected ? (
                            <span className="px-3 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                              <span>{t("active")}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectImageModel?.(ckpt)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer font-medium"
                            >
                              {t("select")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] text-center text-xs text-[var(--text-muted,#888)] space-y-1.5">
                    <p className="font-medium text-neutral-300">No checkpoints available</p>
                    <p className="text-[11px] text-neutral-500">
                      {comfyServiceState !== "Running"
                        ? "Start the ComfyUI service above to discover installed checkpoints."
                        : "Place .safetensors checkpoint files in ComfyUI/models/checkpoints/ and refresh."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

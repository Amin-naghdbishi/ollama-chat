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
  Plus,
  Play,
  Square,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { OllamaModel, AppSettings, ServiceState } from "../../types";
import { formatBytes } from "../../lib/formatters";
import { detectModelCapabilities } from "../../services/ollamaApi";
import { Storage } from "../../lib/storage";

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
  comfyServiceState?: ServiceState;
  onStartComfy?: () => void;
  onStopComfy?: () => void;
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
  comfyServiceState = "Stopped",
  onStartComfy,
  onStopComfy,
}) => {
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
        onBack();
      } else if (e.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredModels, selectedIndex, onSelectModel, onBack]);

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
            <ArrowLeft className="w-4 h-4 text-[var(--accent-color,#818cf8)] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color,#282a36)]" />

          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            <h1 className="font-semibold text-sm text-[var(--text-primary,#e6e9f0)]">Select Model</h1>
          </div>

          {/* Model Type Selector Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-primary,#111)] border border-[var(--border-subtle,#20222c)] rounded-xl ml-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "chat"
                  ? "bg-[var(--bg-surface,#232530)] text-[var(--text-primary,#eee)] shadow-xs"
                  : "text-[var(--text-muted,#888)] hover:text-[var(--text-primary,#eee)]"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
              <span>Chat ({models.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("image")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "image"
                  ? "bg-pink-950/60 text-pink-200 border border-pink-700/50 shadow-xs"
                  : "text-[var(--text-muted,#888)] hover:text-pink-300"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
              <span>Image ({imageModels.length})</span>
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
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-4">
          {activeTab === "image" ? (
            <div className="space-y-4">
              {/* ComfyUI Service Status & Controls Banner */}
              <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-950/40 border border-pink-800/40 flex items-center justify-center text-pink-400 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[var(--text-primary,#eee)]">ComfyUI Service</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          comfyServiceState === "Running"
                            ? "bg-emerald-400"
                            : comfyServiceState === "Starting"
                            ? "bg-amber-400 animate-pulse"
                            : comfyServiceState === "Error"
                            ? "bg-red-500"
                            : "bg-neutral-500"
                        }`}
                      />
                      <span className="text-[11px] font-mono text-[var(--text-muted,#888)]">({comfyServiceState})</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted,#777)] font-mono block mt-0.5">
                      Endpoint: {settings.comfyUiEndpoint || "http://127.0.0.1:8188"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {comfyServiceState === "Running" ? (
                    <button
                      onClick={onStopComfy}
                      className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/70 text-red-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Service</span>
                    </button>
                  ) : (
                    <button
                      onClick={onStartComfy}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/70 text-emerald-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Service</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Checkpoint Search */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ComfyUI checkpoints (e.g. sd_xl, v1-5)..."
                  className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs pl-10 pr-10 py-2.5 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-pink-500/70 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-secondary,#9ba3b2)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Checkpoints List */}
              <div className="space-y-2">
                {isLoadingImageModels ? (
                  <div className="py-12 flex flex-col items-center justify-center text-xs text-[var(--text-muted,#888)] gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                    <span>Loading ComfyUI checkpoints...</span>
                  </div>
                ) : filteredImageModels.length > 0 ? (
                  filteredImageModels.map((ckpt) => {
                    const isSelected = ckpt === selectedImageModel;
                    return (
                      <div
                        key={ckpt}
                        onClick={() => onSelectImageModel?.(ckpt)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-pink-950/30 border-pink-700/60 shadow-md"
                            : "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] hover:border-pink-500/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 mr-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-pink-900/50 text-pink-300"
                                : "bg-[var(--bg-primary,#16171d)] text-[var(--text-muted,#888)]"
                            }`}
                          >
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-[var(--text-primary,#eee)] font-mono block truncate" title={ckpt}>
                              {ckpt}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted,#777)] font-mono">
                              <span>ComfyUI Checkpoint</span>
                              <span>•</span>
                              <span>.safetensors</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSelected ? (
                            <span className="px-3 py-1.5 rounded-xl bg-pink-900/60 border border-pink-700 text-pink-200 text-xs font-semibold flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-pink-400" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectImageModel?.(ckpt);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-pink-900/50 border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer font-medium"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] text-center text-xs text-[var(--text-muted,#888)]">
                    <p className="font-medium text-neutral-300">No checkpoints available</p>
                    <p className="text-[11px] mt-1 text-neutral-500">
                      {comfyServiceState !== "Running"
                        ? "Start ComfyUI service to automatically discover installed checkpoints."
                        : "Place .safetensors model files into ComfyUI/models/checkpoints/ and refresh."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
          {/* Search & Filters Toolbar */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models by name or family (e.g. llama3, qwen, deepseek)..."
                className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs pl-10 pr-10 py-2.5 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] font-sans"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-secondary,#9ba3b2)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5 bg-[var(--bg-primary,#131418)] p-1 rounded-xl border border-[var(--border-subtle,#1e2029)] text-xs">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold shadow-xs"
                      : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                  }`}
                >
                  All ({models.length})
                </button>
                <button
                  onClick={() => setCategoryFilter("vision")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    categoryFilter === "vision"
                      ? "bg-[var(--bg-surface,#1f212a)] text-blue-400 font-semibold shadow-xs"
                      : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Vision</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("reasoning")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    categoryFilter === "reasoning"
                      ? "bg-[var(--bg-surface,#1f212a)] text-purple-400 font-semibold shadow-xs"
                      : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Reasoning</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("favorites")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    categoryFilter === "favorites"
                      ? "bg-[var(--bg-surface,#1f212a)] text-amber-400 font-semibold shadow-xs"
                      : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Favorites ({favoriteModels.length})</span>
                </button>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary,#9ba3b2)]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)]" />
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] border border-[var(--input-border,#2a2d3c)] rounded-xl px-2.5 py-1.5 focus:outline-none text-xs"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="size">Size (Largest first)</option>
                  <option value="family">Architecture Family</option>
                </select>
              </div>
            </div>
          </div>

          {/* Model Cards List */}
          <div className="space-y-3">
            {filteredModels.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-muted,#6b7280)] space-y-2">
                <p>No models found matching your search or filter.</p>
                {models.length === 0 && (
                  <p className="text-[var(--text-secondary,#9ba3b2)]">
                    Install a model with <code className="bg-[var(--bg-primary,#131418)] px-2 py-0.5 rounded text-[var(--accent-color,#818cf8)] font-mono">ollama run llama3.2</code> in your terminal.
                  </p>
                )}
              </div>
            ) : (
              filteredModels.map((m, idx) => {
                const isSelected = selectedModel === m.name || selectedModel === m.model;
                const caps = detectModelCapabilities(m.name, null, m);
                const hasVision = caps.supportsVision;
                const hasThinking = caps.supportsThinking === "supported";

                return (
                  <div
                    key={m.name}
                    className={`group p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                      isSelected
                        ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] ring-1 ring-[var(--accent-color,#818cf8)]/30 shadow-md"
                        : "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                    onClick={() => {
                      onSelectModel(m.name);
                    }}
                  >
                    {/* Left: Model Info & Badges */}
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--accent-color,#818cf8)]"
                            : "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)]"
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>

                      <div className="flex flex-col text-left overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[var(--text-primary,#e6e9f0)] truncate">
                            {m.name}
                          </span>

                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color,#818cf8)] text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                              <Check className="w-3 h-3" />
                              <span>CURRENTLY SELECTED</span>
                            </span>
                          )}

                          {hasVision && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-800/80 text-blue-300 text-[10px] font-medium flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>Vision</span>
                            </span>
                          )}

                          {hasThinking && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/80 text-purple-300 text-[10px] font-medium flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              <span>Reasoning</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--text-muted,#6b7280)] font-mono">
                          {m.details?.parameter_size && (
                            <span className="text-[var(--text-secondary,#9ba3b2)] font-semibold">
                              {m.details.parameter_size}
                            </span>
                          )}
                          {m.details?.quantization_level && (
                            <>
                              <span>•</span>
                              <span>{m.details.quantization_level}</span>
                            </>
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

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Star Button */}
                      <button
                        onClick={(e) => toggleFavorite(e, m.name)}
                        className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] hover:text-amber-300 transition-colors cursor-pointer"
                        title={favoriteModels.includes(m.name) ? "Remove favorite" : "Star favorite"}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            favoriteModels.includes(m.name) ? "text-amber-400 fill-amber-400" : ""
                          }`}
                        />
                      </button>

                      {/* View Details Button */}
                      <button
                        onClick={() => onOpenModelDetails(m.name)}
                        className="px-3 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                        title="View detailed architecture & specs"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      {/* Model Profile Button */}
                      <button
                        onClick={() => onOpenModelProfile(m.name)}
                        className="px-3 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                        title="Edit model profile & system prompt"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>

                      {/* Select & Chat Button */}
                      <button
                        onClick={() => {
                          onSelectModel(m.name);
                          onBack();
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-color,#818cf8)] text-white hover:brightness-110 shadow-xs"
                            : "bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--accent-color,#818cf8)] hover:text-white border border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)]"
                        }`}
                      >
                        <span>{isSelected ? "Use in Chat" : "Select"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

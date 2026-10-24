import React, { useState, useEffect } from "react";
import {
  Cpu,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Info,
  Check,
  Brain,
  Eye,
  SlidersHorizontal,
  HardDrive,
  Activity,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  Play,
  X,
  Plus,
} from "lucide-react";
import {
  AIProvider,
  AppSettings,
  DiscoverableModel,
  ModelDownloadTask,
  UnifiedModel,
} from "../../types";
import { ProviderService, CURATED_DISCOVERABLE_MODELS } from "../../services/providerService";
import { formatBytes } from "../../lib/formatters";

interface ModelManagementTabProps {
  settings: AppSettings;
  providers: AIProvider[];
  models: UnifiedModel[];
  selectedModel: string | null;
  onSelectModel: (modelId: string) => void;
  onRefreshModels: () => void;
  isLoadingModels: boolean;
  onOpenModelDetails: (modelName: string) => void;
  onOpenModelProfile: (modelName: string) => void;
}

export const ModelManagementTab: React.FC<ModelManagementTabProps> = ({
  settings,
  providers,
  models,
  selectedModel,
  onSelectModel,
  onRefreshModels,
  isLoadingModels,
  onOpenModelDetails,
  onOpenModelProfile,
}) => {
  const [subTab, setSubTab] = useState<"my-models" | "discover" | "downloads">("my-models");

  // Search & Filters for My Models
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("all");
  const [capabilityFilter, setCapabilityFilter] = useState<"all" | "vision" | "reasoning">("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "provider">("name");

  // Discover state
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverCategory, setDiscoverCategory] = useState<string>("all");
  const [customPullModelName, setCustomPullModelName] = useState("");
  const [selectedPullTag, setSelectedPullTag] = useState<Record<string, string>>({});
  const [customPullProvider, setCustomPullProvider] = useState<string>("ollama-default");

  // Downloads state
  const [downloads, setDownloads] = useState<ModelDownloadTask[]>(() => ProviderService.getDownloads());

  // Delete modal state
  const [modelToDelete, setModelToDelete] = useState<UnifiedModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick Details Modal
  const [detailedModel, setDetailedModel] = useState<UnifiedModel | null>(null);

  // Subscribe to real-time download tasks
  useEffect(() => {
    const unsubscribe = ProviderService.subscribeDownloads((tasks) => {
      setDownloads(tasks);
    });
    return () => unsubscribe();
  }, []);

  const activeDownloadsCount = downloads.filter((d) => d.status === "downloading" || d.status === "queued").length;

  // Filter My Models
  const filteredModels = models
    .filter((m) => {
      if (selectedProviderFilter !== "all" && m.providerId !== selectedProviderFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase();
      if (q && !m.name.toLowerCase().includes(q) && !m.providerName.toLowerCase().includes(q)) {
        return false;
      }
      if (capabilityFilter === "vision" && !m.supportsVision) return false;
      if (capabilityFilter === "reasoning" && m.supportsThinking !== "supported") return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "size") return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      if (sortBy === "provider") return a.providerName.localeCompare(b.providerName);
      return a.name.localeCompare(b.name);
    });

  // Filter Discover Models
  const filteredDiscover = CURATED_DISCOVERABLE_MODELS.filter((dm) => {
    if (discoverCategory !== "all" && dm.category !== discoverCategory) return false;
    const q = discoverQuery.toLowerCase();
    if (q && !dm.name.toLowerCase().includes(q) && !dm.description.toLowerCase().includes(q) && !dm.tag.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const handleStartDownload = async (modelTag: string, providerId: string = "ollama-default") => {
    if (!modelTag.trim()) return;
    try {
      await ProviderService.startModelDownload(modelTag.trim(), providerId, settings, () => {
        onRefreshModels();
      });
      setSubTab("downloads");
      setCustomPullModelName("");
    } catch (err: any) {
      alert(`Failed to initiate download: ${err.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await ProviderService.deleteModel(modelToDelete, settings);
    setIsDeleting(false);
    if (res.success) {
      setModelToDelete(null);
      onRefreshModels();
    } else {
      setDeleteError(res.error || "Failed to delete model");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Sub-navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle,#1e2029)] pb-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary,#e6e9f0)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--accent-color,#818cf8)]" />
            <span>Model Management</span>
          </h2>
        </div>

        {/* Sub-tabs: My Models | Discover | Downloads */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab("my-models")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "my-models"
                ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Models ({models.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("discover")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === "discover"
                ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("downloads")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              subTab === "downloads"
                ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Downloads</span>
            {activeDownloadsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.1 MY MODELS SUB-TAB */}
      {/* ========================================================================= */}
      {subTab === "my-models" && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Provider Filter, Capability, Refresh */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models by name or provider..."
                className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs pl-9 pr-3.5 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] placeholder-[var(--text-muted,#6b7280)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted,#6b7280)] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {/* Provider Filter */}
              <select
                value={selectedProviderFilter}
                onChange={(e) => setSelectedProviderFilter(e.target.value)}
                className="bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] cursor-pointer"
              >
                <option value="all">All Providers</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Capability Filter */}
              <div className="flex items-center bg-[var(--bg-surface,#1f212a)] p-0.5 rounded-xl border border-[var(--border-color,#282a36)] shrink-0">
                <button
                  type="button"
                  onClick={() => setCapabilityFilter("all")}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    capabilityFilter === "all"
                      ? "bg-[var(--btn-bg,#1c1e27)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                      : "text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)]"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCapabilityFilter("vision")}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                    capabilityFilter === "vision"
                      ? "bg-[var(--btn-bg,#1c1e27)] text-emerald-400 shadow-xs"
                      : "text-[var(--text-muted,#6b7280)] hover:text-emerald-400"
                  }`}
                  title="Vision Supported"
                >
                  <Eye className="w-3 h-3" />
                  <span>Vision</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCapabilityFilter("reasoning")}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${
                    capabilityFilter === "reasoning"
                      ? "bg-[var(--btn-bg,#1c1e27)] text-indigo-400 shadow-xs"
                      : "text-[var(--text-muted,#6b7280)] hover:text-indigo-400"
                  }`}
                  title="Reasoning / Thinking Supported"
                >
                  <Brain className="w-3 h-3" />
                  <span>Reasoning</span>
                </button>
              </div>

              {/* Refresh */}
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={isLoadingModels}
                className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer shrink-0"
                title="Refresh Model List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? "animate-spin text-[var(--accent-color,#818cf8)]" : ""}`} />
              </button>
            </div>
          </div>

          {/* Model Cards List */}
          {filteredModels.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color,#282a36)] bg-[var(--bg-surface,#1f212a)]/40 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-center text-[var(--text-muted,#6b7280)] mx-auto">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)]">No models found</p>
                <p className="text-[11px] text-[var(--text-muted,#6b7280)] mt-0.5 max-w-sm mx-auto">
                  {searchQuery
                    ? "Try adjusting your search query or provider filter."
                    : "No models available from configured providers. Use Discover tab or check Provider settings."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab("discover")}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Discover & Download Models</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredModels.map((m) => {
                const isSelected = selectedModel === m.id || selectedModel === m.rawId || selectedModel === m.name;
                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/20"
                        : "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]/40"
                    }`}
                  >
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--accent-color,#818cf8)]"
                            : "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)]"
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[var(--text-primary,#e6e9f0)] truncate">
                            {m.name}
                          </span>
                          {/* Provider Tag */}
                          <span className="px-2 py-0.5 rounded-full bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] text-[10px] font-medium text-[var(--text-secondary,#9ba3b2)]">
                            {m.providerName}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] text-[10px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted,#6b7280)] font-mono mt-1">
                          {m.parameterSize && (
                            <span className="text-[var(--text-secondary,#9ba3b2)]">{m.parameterSize} Parameters</span>
                          )}
                          {m.quantization && (
                            <>
                              <span>•</span>
                              <span>{m.quantization}</span>
                            </>
                          )}
                          {m.sizeBytes !== undefined && m.sizeBytes > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatBytes(m.sizeBytes)}</span>
                            </>
                          )}
                          {m.contextLength && (
                            <>
                              <span>•</span>
                              <span>{Math.round(m.contextLength / 1024)}K Context</span>
                            </>
                          )}
                        </div>

                        {/* Capability Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {m.supportsVision && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>Vision</span>
                            </span>
                          )}
                          {m.supportsThinking === "supported" && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-[10px] font-semibold flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              <span>Reasoning</span>
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-primary,#131418)] text-[10px] text-[var(--text-muted,#6b7280)]">
                            Chat & Streaming
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectModel(m.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          isSelected
                            ? "bg-[var(--accent-color,#818cf8)] text-white"
                            : "bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] hover:text-white border border-[var(--border-color,#282a36)]"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isSelected ? "Active" : "Use Model"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailedModel(m)}
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                        title="Model Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenModelProfile(m.rawId)}
                        className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
                        title="Configure Model Parameters"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Model Button (only if provider supports deletion) */}
                      {m.canDelete && (
                        <button
                          type="button"
                          onClick={() => setModelToDelete(m)}
                          className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-rose-950/40 border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Model from Storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.2 DISCOVER MODELS SUB-TAB */}
      {/* ========================================================================= */}
      {subTab === "discover" && (
        <div className="space-y-6">
          {/* Quick Pull Bar */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] flex items-center gap-2">
                <Download className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                <span>Pull Any Model by Tag (Ollama)</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted,#6b7280)] font-mono">
                e.g. qwen3:30b, deepseek-r1:14b, mistral:latest
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customPullModelName}
                onChange={(e) => setCustomPullModelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStartDownload(customPullModelName, customPullProvider);
                }}
                placeholder="Enter model name or library tag (e.g. qwen3:30b)..."
                className="flex-1 bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3.5 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] placeholder-[var(--text-muted,#6b7280)]"
              />
              <button
                type="button"
                onClick={() => handleStartDownload(customPullModelName, customPullProvider)}
                disabled={!customPullModelName.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Discover Catalog Header & Category Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder="Search curated model library..."
                className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs pl-9 pr-3.5 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] placeholder-[var(--text-muted,#6b7280)]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "general", label: "General" },
                { id: "reasoning", label: "Reasoning & Math" },
                { id: "coding", label: "Coding" },
                { id: "vision", label: "Vision" },
                { id: "lightweight", label: "Lightweight" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setDiscoverCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    discoverCategory === cat.id
                      ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs"
                      : "bg-[var(--bg-surface,#1f212a)] text-[var(--text-secondary,#9ba3b2)] hover:text-white border border-[var(--border-color,#282a36)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Curated Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDiscover.map((item) => {
              const activeTag = selectedPullTag[item.id] || item.tag;
              const isAlreadyInstalled = models.some(
                (m) => m.name === activeTag || m.rawId === activeTag
              );

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] hover:border-[var(--accent-color,#818cf8)]/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">
                            {item.name}
                          </h3>
                          {item.featured && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-center text-[var(--accent-color,#818cf8)] shrink-0">
                        {item.supportsThinking ? (
                          <Brain className="w-4 h-4" />
                        ) : item.supportsVision ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <Cpu className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Metadata & Tag selector */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] text-[var(--text-secondary,#9ba3b2)]">
                        {item.parameterSize}
                      </span>
                      <span>•</span>
                      <span>{item.sizeFormatted}</span>
                      <span>•</span>
                      <span>{Math.round(item.contextLength / 1024)}K Context</span>
                    </div>

                    {/* Tag variant picker */}
                    {item.popularTags && item.popularTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono">Tag:</span>
                        {item.popularTags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedPullTag((prev) => ({ ...prev, [item.id]: t }))}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                              activeTag === t
                                ? "bg-[var(--accent-color,#818cf8)] text-white font-bold"
                                : "bg-[var(--bg-primary,#131418)] text-[var(--text-secondary,#9ba3b2)] hover:text-white border border-[var(--border-color,#282a36)]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                    <span className="text-[11px] font-mono text-[var(--text-muted,#6b7280)]">
                      {activeTag}
                    </span>

                    {isAlreadyInstalled ? (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Installed</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartDownload(activeTag)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.3 DOWNLOADS SUB-TAB */}
      {/* ========================================================================= */}
      {subTab === "downloads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary,#e6e9f0)]">
                Active & Recent Downloads
              </h3>
              <p className="text-[11px] text-[var(--text-muted,#6b7280)] mt-0.5">
                Real-time pull progress directly from your local Ollama runtime.
              </p>
            </div>

            {downloads.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const running = downloads.filter((d) => d.status === "downloading" || d.status === "queued");
                  ProviderService.saveProviders(ProviderService.getProviders());
                  localStorage.setItem("ollama_chat_downloads_list", JSON.stringify(running));
                  setDownloads(running);
                }}
                className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[10px] font-medium text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
              >
                Clear Inactive History
              </button>
            )}
          </div>

          {downloads.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color,#282a36)] bg-[var(--bg-surface,#1f212a)]/40 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-center text-[var(--text-muted,#6b7280)] mx-auto">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)]">No downloads yet</p>
                <p className="text-[11px] text-[var(--text-muted,#6b7280)] mt-0.5 max-w-sm mx-auto">
                  Browse the Discover tab or enter a custom tag to pull weights into your local library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab("discover")}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Discover Models</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {downloads.map((task) => {
                const isDownloading = task.status === "downloading" || task.status === "queued";
                const isCompleted = task.status === "completed";
                const isFailed = task.status === "failed";
                const isCancelled = task.status === "cancelled";

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            isCompleted
                              ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                              : isFailed
                              ? "bg-red-950/40 border-red-800 text-red-400"
                              : "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--accent-color,#818cf8)] animate-pulse"
                          }`}
                        >
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[var(--text-primary,#e6e9f0)]">
                              {task.modelName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                              {task.providerName}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] font-mono mt-0.5">
                            {task.statusMessage || task.status}
                          </p>
                        </div>
                      </div>

                      {/* Status / Action */}
                      <div className="flex items-center gap-2">
                        {isDownloading && (
                          <button
                            type="button"
                            onClick={() => ProviderService.cancelDownload(task.id)}
                            className="px-2.5 py-1 rounded-xl bg-red-950/50 hover:bg-red-900/70 border border-red-800/80 text-red-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2 py-0.5 rounded-full bg-red-950/50 border border-red-800/80 text-red-300 text-[10px] font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800/70 text-zinc-400 text-[10px] font-medium">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isDownloading && (
                      <div className="space-y-1.5">
                        <div className="w-full h-2 rounded-full bg-[var(--bg-primary,#131418)] overflow-hidden border border-[var(--border-subtle,#1e2029)]">
                          <div
                            className="h-full bg-[var(--accent-color,#818cf8)] transition-all duration-300 rounded-full"
                            style={{ width: `${Math.max(3, task.progressPercent)}%` }}
                          />
                        </div>

                        {/* Progress Stats */}
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                          <span>
                            {task.totalBytes > 0
                              ? `${formatBytes(task.completedBytes)} / ${formatBytes(task.totalBytes)}`
                              : `${formatBytes(task.completedBytes)}`}
                            {" • "}
                            {task.progressPercent}%
                          </span>

                          <div className="flex items-center gap-3">
                            {task.speedBytesPerSec > 0 && (
                              <span>{formatBytes(task.speedBytesPerSec)}/s</span>
                            )}
                            {task.etaSeconds !== undefined && task.etaSeconds > 0 && (
                              <span>ETA: {Math.ceil(task.etaSeconds)}s</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.4 MODEL DETAILS MODAL */}
      {/* ========================================================================= */}
      {detailedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle,#1e2029)] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[var(--accent-color,#818cf8)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">
                  {detailedModel.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailedModel(null)}
                className="p-1 rounded-lg text-[var(--text-muted,#6b7280)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[var(--bg-primary,#131418)] p-3 rounded-xl border border-[var(--border-subtle,#1e2029)] font-mono">
                <div>
                  <span className="text-[var(--text-muted,#6b7280)]">Provider:</span>
                  <p className="font-bold text-[var(--text-primary,#e6e9f0)]">{detailedModel.providerName}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)]">Parameters:</span>
                  <p className="font-bold text-[var(--text-primary,#e6e9f0)]">{detailedModel.parameterSize || "Unknown"}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)]">Quantization:</span>
                  <p className="font-bold text-[var(--text-primary,#e6e9f0)]">{detailedModel.quantization || "Unknown"}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)]">Storage Size:</span>
                  <p className="font-bold text-[var(--text-primary,#e6e9f0)]">
                    {detailedModel.sizeBytes ? formatBytes(detailedModel.sizeBytes) : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)]">Context Window:</span>
                  <p className="font-bold text-[var(--text-primary,#e6e9f0)]">
                    {detailedModel.contextLength ? `${detailedModel.contextLength} tokens` : "4096 tokens"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)]">Architecture Family:</span>
                  <p className="font-bold text-[var(--text-primary,#e6e9f0)]">{detailedModel.family || "N/A"}</p>
                </div>
              </div>

              {detailedModel.digest && (
                <div className="bg-[var(--bg-primary,#131418)] p-2.5 rounded-xl border border-[var(--border-subtle,#1e2029)] font-mono text-[10px]">
                  <span className="text-[var(--text-muted,#6b7280)] block">Digest:</span>
                  <span className="text-[var(--text-secondary,#9ba3b2)] break-all">{detailedModel.digest}</span>
                </div>
              )}

              {/* Capabilities */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--text-muted,#6b7280)] uppercase tracking-wider">
                  Supported Capabilities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                    Chat Completions
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                    Streaming Tokens
                  </span>
                  {detailedModel.supportsVision && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                      Vision / Multimodal
                    </span>
                  )}
                  {detailedModel.supportsThinking === "supported" && (
                    <span className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800 text-indigo-300 text-[10px] font-semibold">
                      Thinking / Reasoning Output
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle,#1e2029)]">
              <button
                type="button"
                onClick={() => setDetailedModel(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectModel(detailedModel.id);
                  setDetailedModel(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Use Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.5 DELETE MODEL CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {modelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-rose-800/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/50 border border-rose-800/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">
                  Delete {modelToDelete.name}?
                </h3>
                <p className="text-[11px] text-[var(--text-muted,#6b7280)] font-mono mt-0.5">
                  Provider: {modelToDelete.providerName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary,#9ba3b2)] leading-relaxed">
              This will permanently delete the model weights from local storage, freeing approximately{" "}
              <strong className="text-[var(--text-primary,#e6e9f0)]">
                {modelToDelete.sizeBytes ? formatBytes(modelToDelete.sizeBytes) : "its disk space"}
              </strong>
              . You will need to re-download it to use it again.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModelToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

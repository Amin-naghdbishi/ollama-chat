import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Cpu,
  Check,
  Info,
  Brain,
  Eye,
  RefreshCw,
  HardDrive,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Star,
  Copy,
  ArrowUpDown,
  FileCode,
} from "lucide-react";
import { OllamaModel, OllamaModelShowInfo, AppSettings, ModelTestResult } from "../types";
import { formatBytes } from "../lib/formatters";
import { OllamaApi, detectModelCapabilities } from "../services/ollamaApi";
import { Storage } from "../lib/storage";

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: OllamaModel[];
  selectedModel: string | null;
  onSelectModel: (modelName: string) => void;
  onRefreshModels: () => void;
  isLoadingModels: boolean;
  settings: AppSettings;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  models,
  selectedModel,
  onSelectModel,
  onRefreshModels,
  isLoadingModels,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "vision" | "reasoning" | "favorites">("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "family">("name");
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [selectedInfoModel, setSelectedInfoModel] = useState<string | null>(null);
  const [modelDetails, setModelDetails] = useState<OllamaModelShowInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [copiedModelfile, setCopiedModelfile] = useState(false);

  useEffect(() => {
    setFavoriteModels(Storage.getFavoriteModels());
  }, [isOpen]);

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

  useEffect(() => {
    if (selectedInfoModel) {
      setIsLoadingDetails(true);
      setTestResult(null);
      setCopiedModelfile(false);
      OllamaApi.fetchModelInfo(settings, selectedInfoModel)
        .then((info) => setModelDetails(info))
        .finally(() => setIsLoadingDetails(false));
    } else {
      setModelDetails(null);
      setTestResult(null);
    }
  }, [selectedInfoModel, settings]);

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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || selectedInfoModel) return;
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
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedInfoModel, filteredModels, selectedIndex, onSelectModel, onClose]);

  const handleRunTestModel = async () => {
    if (!selectedInfoModel) return;
    setIsTestingModel(true);
    const modelObj = models.find((m) => m.name === selectedInfoModel);
    try {
      const res = await OllamaApi.testModel(settings, selectedInfoModel, modelDetails, modelObj);
      setTestResult(res);
    } catch (err) {
      console.error("Test model failed:", err);
    } finally {
      setIsTestingModel(false);
    }
  };

  const handleCopyModelfile = () => {
    if (modelDetails?.modelfile) {
      navigator.clipboard.writeText(modelDetails.modelfile);
      setCopiedModelfile(true);
      setTimeout(() => setCopiedModelfile(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">Select AI Model</h2>
              <p className="text-xs text-[var(--text-secondary,#9ba3b2)]">
                {models.length} model{models.length === 1 ? "" : "s"} available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshModels}
              disabled={isLoadingModels}
              className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              title="Refresh models list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-3 border-b border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)]/40 space-y-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models by name or family..."
              className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs pl-10 pr-4 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-secondary,#9ba3b2)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 bg-[var(--bg-secondary,#191a21)] p-1 rounded-xl border border-[var(--border-color,#282a36)] text-[11px]">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold shadow-xs"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCategoryFilter("vision")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === "vision"
                    ? "bg-[var(--bg-surface,#1f212a)] text-blue-400 font-semibold shadow-xs"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Vision</span>
              </button>
              <button
                onClick={() => setCategoryFilter("reasoning")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === "reasoning"
                    ? "bg-[var(--bg-surface,#1f212a)] text-purple-400 font-semibold shadow-xs"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                }`}
              >
                <Brain className="w-3 h-3" />
                <span>Reasoning</span>
              </button>
              <button
                onClick={() => setCategoryFilter("favorites")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === "favorites"
                    ? "bg-[var(--bg-surface,#1f212a)] text-amber-400 font-semibold shadow-xs"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
                }`}
              >
                <Star className="w-3 h-3" />
                <span>Favorites ({favoriteModels.length})</span>
              </button>
            </div>

            {/* Sorting selector */}
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary,#9ba3b2)]">
              <ArrowUpDown className="w-3 h-3 text-[var(--text-muted,#6b7280)]" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] border border-[var(--input-border,#2a2d3c)] rounded-lg px-2 py-1 focus:outline-none text-[11px]"
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="family">Family</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredModels.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted,#6b7280)] text-xs space-y-2">
              <p>No models found matching your filter.</p>
              {models.length === 0 && (
                <p className="text-[var(--text-secondary,#9ba3b2)]">
                  Run <code className="bg-[var(--bg-primary,#131418)] px-1.5 py-0.5 rounded text-[var(--accent-color,#818cf8)] font-mono">ollama run llama3</code> in your terminal to install a model.
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
                  onClick={() => {
                    onSelectModel(m.name);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/30"
                      : "bg-[var(--bg-primary,#131418)]/70 border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)] text-[var(--text-secondary,#9ba3b2)]"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--accent-color,#818cf8)]"
                          : "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)]"
                      }`}
                    >
                      <Cpu className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col text-left overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[var(--text-primary,#e6e9f0)] truncate">
                          {m.name}
                        </span>

                        {/* Provider tag badge */}
                        {m.providerName && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] text-[10px] font-mono shrink-0">
                            {m.providerName}
                          </span>
                        )}

                        {/* Badges for capabilities */}
                        {hasVision && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/50 border border-blue-800/60 text-blue-300 text-[10px] font-medium flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5" />
                            Vision
                          </span>
                        )}

                        {hasThinking && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-800/60 text-purple-300 text-[10px] font-medium flex items-center gap-1">
                            <Brain className="w-2.5 h-2.5" />
                            Reasoning
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted,#6b7280)] font-mono">
                        {m.details?.parameter_size && (
                          <span className="text-[var(--text-secondary,#9ba3b2)]">{m.details.parameter_size}</span>
                        )}
                        {m.details?.quantization_level && (
                          <>
                            <span>•</span>
                            <span>{m.details.quantization_level}</span>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => toggleFavorite(e, m.name)}
                      className="p-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-amber-300 transition-colors cursor-pointer"
                      title={favoriteModels.includes(m.name) ? "Unstar model" : "Star model"}
                    >
                      <Star className={`w-3.5 h-3.5 ${favoriteModels.includes(m.name) ? "text-amber-400 fill-amber-400" : ""}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInfoModel(m.name);
                      }}
                      className="p-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
                      title="View detailed model specs & Modelfile"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="hidden group-hover:inline-block text-xs text-[var(--accent-color,#818cf8)] font-medium pr-1">
                        Select
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Model Info & Diagnostics Drawer Modal */}
        {selectedInfoModel && (
          <div className="absolute inset-0 bg-[var(--bg-surface,#1f212a)]/95 backdrop-blur-xs p-5 z-20 flex flex-col overflow-y-auto animate-fadeIn custom-scrollbar">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-color,#282a36)]">
              <div>
                <h3 className="font-bold text-sm font-mono text-[var(--accent-color,#818cf8)]">
                  Model Diagnostics: {selectedInfoModel}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)]">Inspected capabilities & automated test suite</p>
              </div>
              <button
                onClick={() => setSelectedInfoModel(null)}
                className="p-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 text-center text-[var(--text-secondary,#9ba3b2)] text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color,#818cf8)]" />
                <span>Inspecting model specifications...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-mono text-[var(--text-primary,#e6e9f0)]">
                {(() => {
                  const mObj = models.find((m) => m.name === selectedInfoModel);
                  const caps = detectModelCapabilities(selectedInfoModel, modelDetails, mObj);

                  return (
                    <>
                      {/* Diagnostics Overview Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-[var(--bg-secondary,#191a21)] rounded-xl border border-[var(--border-color,#282a36)]">
                        <div>
                          <span className="text-[var(--text-muted,#6b7280)] block text-[10px] uppercase tracking-wider">Family / Arch</span>
                          <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{caps.family || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted,#6b7280)] block text-[10px] uppercase tracking-wider">Parameter Size</span>
                          <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{caps.parameterSize || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted,#6b7280)] block text-[10px] uppercase tracking-wider">Quantization</span>
                          <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{caps.quantization || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted,#6b7280)] block text-[10px] uppercase tracking-wider">Context Length</span>
                          <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{caps.contextLength} tokens</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted,#6b7280)] block text-[10px] uppercase tracking-wider">Vision Support</span>
                          <span
                            className={`font-bold flex items-center gap-1 ${
                              caps.supportsVision ? "text-emerald-400" : "text-[var(--text-muted,#6b7280)]"
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            {caps.supportsVision ? "✓ Ready" : "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted,#6b7280)] block text-[10px] uppercase tracking-wider">Thinking / Reasoning</span>
                          <span
                            className={`font-bold flex items-center gap-1 ${
                              caps.supportsThinking === "supported"
                                ? "text-purple-400"
                                : caps.supportsThinking === "unsupported"
                                ? "text-[var(--text-muted,#6b7280)]"
                                : "text-amber-400"
                            }`}
                          >
                            <Brain className="w-3 h-3" />
                            {caps.supportsThinking === "supported"
                              ? "✓ Supported"
                              : caps.supportsThinking === "unsupported"
                              ? "✗ Unsupported"
                              : "Unknown"}
                          </span>
                        </div>
                      </div>

                      {/* Test Model Action & Live Test Results */}
                      <div className="p-3.5 bg-[var(--bg-secondary,#191a21)]/80 rounded-xl border border-[var(--border-color,#282a36)] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                            <span className="font-bold text-[var(--text-primary,#e6e9f0)]">Automated Model Test</span>
                          </div>

                          <button
                            onClick={handleRunTestModel}
                            disabled={isTestingModel}
                            className="px-3 py-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/20 hover:bg-[var(--accent-color,#818cf8)]/30 border border-[var(--accent-color,#818cf8)]/40 text-[var(--accent-color,#818cf8)] font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isTestingModel ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Testing API...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Test Model</span>
                              </>
                            )}
                          </button>
                        </div>

                        {testResult && (
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            {/* Basic Chat */}
                            <div className="p-2 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-between">
                              <span className="text-[var(--text-secondary,#9ba3b2)]">Basic Chat</span>
                              {testResult.basicChat.passed ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Passed ({testResult.basicChat.durationMs}ms)</span>
                                </span>
                              ) : (
                                <span className="text-red-400 flex items-center gap-1" title={testResult.basicChat.error}>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Failed</span>
                                </span>
                              )}
                            </div>

                            {/* Streaming */}
                            <div className="p-2 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-between">
                              <span className="text-[var(--text-secondary,#9ba3b2)]">Streaming</span>
                              {testResult.streaming.passed ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Passed</span>
                                </span>
                              ) : (
                                <span className="text-red-400 flex items-center gap-1" title={testResult.streaming.error}>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Failed</span>
                                </span>
                              )}
                            </div>

                            {/* Thinking ON */}
                            {testResult.thinkingOn && (
                              <div className="p-2 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-between">
                                <span className="text-[var(--text-secondary,#9ba3b2)]">Thinking ON</span>
                                {testResult.thinkingOn.passed ? (
                                  <span className="text-purple-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{testResult.thinkingOn.producedThinking ? "Reasoned" : "Active"}</span>
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted,#6b7280)] flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>N/A</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Thinking OFF */}
                            {testResult.thinkingOff && (
                              <div className="p-2 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-between">
                                <span className="text-[var(--text-secondary,#9ba3b2)]">Thinking OFF</span>
                                {testResult.thinkingOff.respectsOff ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Respects OFF</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Ignored OFF</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Vision */}
                            {testResult.vision && (
                              <div className="p-2 rounded bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-between col-span-2">
                                <span className="text-[var(--text-secondary,#9ba3b2)]">Vision Attachment Test</span>
                                {testResult.vision.passed ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Vision Passed</span>
                                  </span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1" title={testResult.vision.error}>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Vision Failed</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {modelDetails?.parameters && (
                        <div>
                          <h4 className="font-semibold text-[var(--text-secondary,#9ba3b2)] mb-1">Parameters:</h4>
                          <pre className="p-3 bg-[var(--bg-secondary,#191a21)] rounded-xl border border-[var(--border-color,#282a36)] text-[11px] whitespace-pre-wrap overflow-x-auto text-[var(--text-primary,#e6e9f0)] custom-scrollbar">
                            {modelDetails.parameters}
                          </pre>
                        </div>
                      )}

                      {modelDetails?.template && (
                        <div>
                          <h4 className="font-semibold text-[var(--text-secondary,#9ba3b2)] mb-1">Chat Template:</h4>
                          <pre className="p-3 bg-[var(--bg-secondary,#191a21)] rounded-xl border border-[var(--border-color,#282a36)] text-[11px] whitespace-pre-wrap overflow-x-auto text-[var(--text-secondary,#9ba3b2)] custom-scrollbar">
                            {modelDetails.template}
                          </pre>
                        </div>
                      )}

                      {modelDetails?.modelfile && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-[var(--text-secondary,#9ba3b2)] flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                              <span>Modelfile Contents:</span>
                            </h4>
                            <button
                              onClick={handleCopyModelfile}
                              className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] font-mono text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedModelfile ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-[var(--text-muted,#6b7280)]" />
                                  <span>Copy Modelfile</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-3 bg-[var(--bg-secondary,#191a21)]/90 rounded-xl border border-[var(--border-color,#282a36)] text-[10px] font-mono whitespace-pre-wrap overflow-x-auto text-[var(--text-primary,#e6e9f0)] max-h-48 custom-scrollbar">
                            {modelDetails.modelfile}
                          </pre>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

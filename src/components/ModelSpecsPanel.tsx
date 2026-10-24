import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  Zap,
  Activity,
  Layers,
  HardDrive,
  Eye,
  Brain,
  X,
  Gauge,
  ExternalLink,
} from "lucide-react";
import {
  OllamaModel,
  ConnectionStatus,
  LiveGenerationMetrics,
  AppSettings,
  Conversation,
  OllamaModelShowInfo,
} from "../types";
import { OllamaApi, detectModelCapabilities } from "../services/ollamaApi";

interface ModelSpecsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string | null;
  modelObj?: OllamaModel;
  settings: AppSettings;
  connectionStatus: ConnectionStatus;
  liveMetrics?: LiveGenerationMetrics;
  activeConversation?: Conversation;
  onOpenModelDetailsFull?: (modelName: string) => void;
  onOpenContextExplorer?: () => void;
}

export const ModelSpecsPanel: React.FC<ModelSpecsPanelProps> = ({
  isOpen,
  onClose,
  selectedModel,
  modelObj,
  settings,
  connectionStatus,
  liveMetrics,
  activeConversation,
  onOpenModelDetailsFull,
  onOpenContextExplorer,
}) => {
  const [showInfo, setShowInfo] = useState<OllamaModelShowInfo | null>(null);

  // Fetch /api/show info for detailed model specs when panel is opened
  useEffect(() => {
    if (!isOpen || !selectedModel || !connectionStatus.isConnected) {
      return;
    }

    let isMounted = true;
    OllamaApi.fetchModelInfo(settings, selectedModel)
      .then((info) => {
        if (isMounted) {
          setShowInfo(info);
        }
      })
      .catch(() => {
        // Silently ignore or rely on existing modelObj
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedModel, connectionStatus.isConnected, settings.endpoint]);

  if (!selectedModel) {
    return null;
  }

  // Model Capabilities & Specs
  const capabilities = detectModelCapabilities(selectedModel, showInfo, modelObj);
  const parameterSize =
    modelObj?.details?.parameter_size ||
    showInfo?.details?.parameter_size ||
    capabilities.parameterSize ||
    "—";
  const quantization =
    modelObj?.details?.quantization_level ||
    showInfo?.details?.quantization_level ||
    capabilities.quantization ||
    "—";
  const family =
    modelObj?.details?.family ||
    showInfo?.details?.family ||
    capabilities.family ||
    "—";
  const format =
    modelObj?.details?.format || showInfo?.details?.format || "GGUF";

  // File size format
  const formattedFileSize = modelObj?.size
    ? modelObj.size > 1024 * 1024 * 1024
      ? `${(modelObj.size / (1024 * 1024 * 1024)).toFixed(1)} GB`
      : `${(modelObj.size / (1024 * 1024)).toFixed(0)} MB`
    : "—";

  // Runtime generation values
  const isGenerating = Boolean(liveMetrics?.isGenerating);
  const tokPerSec = liveMetrics?.tokensPerSec;
  const hasTokPerSec = typeof tokPerSec === "number" && tokPerSec > 0;
  const generatedTokens = liveMetrics?.generatedTokens;
  const promptTokens = liveMetrics?.promptTokens;
  const elapsedMs = liveMetrics?.elapsedMs;

  // Context token calculations
  const currentCtxLimit = settings.numCtx || 8192;
  const currentUsedTokens = (activeConversation?.messages || []).reduce((acc, m) => {
    return acc + Math.ceil((m.content.length + (m.thinkingContent?.length || 0)) / 3.8);
  }, 0);
  const contextPercentage = Math.min(
    100,
    Math.round((currentUsedTokens / currentCtxLimit) * 100)
  );

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          id="model-specs-panel"
          key="model-specs-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden border-b border-[var(--border-color,#262626)] bg-[var(--bg-secondary,#14151a)]/95 backdrop-blur-md shrink-0 select-none z-10 transition-colors"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs font-mono">
              {/* Group 1: Model Specs & Architecture */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 min-w-0">
                {/* Model Name & Family */}
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0" />
                  <span className="font-semibold text-[var(--text-primary,#eee)] truncate max-w-[150px] sm:max-w-[200px]" title={selectedModel}>
                    {selectedModel}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[var(--bg-surface,#1f2028)] text-[10px] text-[var(--text-muted,#888)] border border-[var(--border-subtle,#262626)] uppercase">
                    {format}
                  </span>
                </div>

                {/* Parameters & Quantization */}
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary,#9ba3b2)]">
                  <span>
                    <span className="text-[var(--text-muted,#666)] mr-1">Params:</span>
                    <strong className="text-[var(--text-primary,#eee)] font-medium">{parameterSize}</strong>
                  </span>
                  <span className="text-[var(--border-color,#333)]">•</span>
                  <span>
                    <span className="text-[var(--text-muted,#666)] mr-1">Quant:</span>
                    <strong className="text-[var(--text-primary,#eee)] font-medium">{quantization}</strong>
                  </span>
                  {formattedFileSize !== "—" && (
                    <>
                      <span className="text-[var(--border-color,#333)] hidden md:inline">•</span>
                      <span className="hidden md:inline">
                        <span className="text-[var(--text-muted,#666)] mr-1">Size:</span>
                        <strong className="text-[var(--text-primary,#eee)] font-medium">{formattedFileSize}</strong>
                      </span>
                    </>
                  )}
                </div>

                {/* Capabilities */}
                <div className="hidden lg:flex items-center gap-1.5 text-[10px]">
                  {capabilities.supportsVision && (
                    <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/50">
                      <Eye className="w-2.5 h-2.5 text-cyan-400" />
                      Vision
                    </span>
                  )}
                  {capabilities.supportsThinking === "supported" && (
                    <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-950/40 text-purple-300 border border-purple-800/50">
                      <Brain className="w-2.5 h-2.5 text-purple-400" />
                      Reasoning
                    </span>
                  )}
                </div>
              </div>

              {/* Group 2: Runtime Performance & Speed */}
              <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                {/* Generation Status & Speed */}
                <div className="flex items-center gap-2 text-[11px]">
                  {isGenerating ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] animate-pulse">
                      <Activity className="w-2.5 h-2.5 text-emerald-400 animate-spin" />
                      Generating
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--bg-surface,#1f2028)] text-[var(--text-muted,#777)] border border-[var(--border-subtle,#262626)] text-[10px]">
                      Idle
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[var(--accent-color,#818cf8)]" />
                    <span className="text-[var(--text-muted,#666)]">Speed:</span>
                    <strong className="text-[var(--text-primary,#eee)] font-medium">
                      {hasTokPerSec ? `${tokPerSec!.toFixed(1)} tok/s` : "—"}
                    </strong>
                  </span>
                </div>

                {/* Tokens Generated / Elapsed */}
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--text-secondary,#9ba3b2)]">
                  {typeof generatedTokens === "number" && generatedTokens > 0 && (
                    <>
                      <span className="text-[var(--border-color,#333)]">•</span>
                      <span>
                        <span className="text-[var(--text-muted,#666)] mr-1">Gen:</span>
                        <strong className="text-[var(--text-primary,#eee)] font-medium">{generatedTokens} tok</strong>
                      </span>
                    </>
                  )}
                  {typeof elapsedMs === "number" && elapsedMs > 0 && (
                    <>
                      <span className="text-[var(--border-color,#333)]">•</span>
                      <span>
                        <span className="text-[var(--text-muted,#666)] mr-1">Time:</span>
                        <strong className="text-[var(--text-primary,#eee)] font-medium">{(elapsedMs / 1000).toFixed(1)}s</strong>
                      </span>
                    </>
                  )}
                </div>

                {/* Context Indicator */}
                <div
                  onClick={onOpenContextExplorer}
                  className={`flex items-center gap-1.5 text-[11px] text-[var(--text-secondary,#9ba3b2)] ${
                    onOpenContextExplorer ? "cursor-pointer hover:text-[var(--accent-color,#818cf8)]" : ""
                  }`}
                  title={onOpenContextExplorer ? "Click to open Context Explorer & Memory Manager" : undefined}
                >
                  <span className="text-[var(--border-color,#333)] hidden md:inline">•</span>
                  <Brain className="w-3 h-3 text-[var(--accent-color,#818cf8)] shrink-0 hidden md:inline" />
                  <span className="hidden md:inline text-[var(--text-muted,#666)]">Ctx:</span>
                  <span className="font-medium text-[var(--text-primary,#eee)]">
                    {currentUsedTokens.toLocaleString()} / {(currentCtxLimit / 1024).toFixed(0)}k
                  </span>
                  <div className="w-12 h-1.5 bg-[var(--bg-surface,#1f2028)] rounded-full overflow-hidden border border-[var(--border-subtle,#262626)] inline-block ml-0.5">
                    <div
                      className={`h-full transition-all duration-300 ${
                        contextPercentage > 85
                          ? "bg-red-500"
                          : contextPercentage > 60
                          ? "bg-amber-400"
                          : "bg-[var(--accent-color,#818cf8)]"
                      }`}
                      style={{ width: `${contextPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Actions & Close */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                {onOpenModelDetailsFull && (
                  <button
                    onClick={() => onOpenModelDetailsFull(selectedModel)}
                    className="flex items-center gap-1 text-[11px] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--accent-color,#818cf8)] px-2 py-0.5 rounded hover:bg-[var(--bg-surface,#1f2028)] transition-colors cursor-pointer"
                    title="View full model details and Modelfile"
                  >
                    <span className="hidden xl:inline">Full Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-[var(--text-muted,#777)] hover:text-[var(--text-primary,#eee)] hover:bg-[var(--bg-surface,#1f2028)] transition-colors cursor-pointer"
                  title="Close Model Specs panel"
                  aria-label="Close Model Specs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

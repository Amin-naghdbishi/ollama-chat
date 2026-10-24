import React, { useState } from "react";
import {
  X,
  Bug,
  Copy,
  Check,
  Brain,
  Eye,
  Layers,
  FileCode,
  Terminal,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RetrievedMemoryCitation, RecallIntentInfo } from "../types";

export interface DebugInfoState {
  url?: string;
  model?: string;
  enableThinking?: boolean;
  numCtx?: number;
  estimatedTokens?: number;
  totalOriginalMessages?: number;
  includedMessagesCount?: number;
  isPruned?: boolean;
  supportsThinking?: "supported" | "unsupported" | "unknown";
  supportsVision?: boolean;
  attachmentsCount?: { images: number; files: number };
  payload?: any;
  timestamp?: number;
  retrievedMemoriesCount?: number;
  tokensSavedByCompression?: number;
  wasCompressed?: boolean;
  citations?: RetrievedMemoryCitation[];
  intentInfo?: RecallIntentInfo;
}

interface DebugInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: DebugInfoState | null;
}

export const DebugInspectorModal: React.FC<DebugInspectorModalProps> = ({
  isOpen,
  onClose,
  debugInfo,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMemoriesDetails, setShowMemoriesDetails] = useState(true);

  if (!isOpen) return null;

  const handleCopyPayload = () => {
    if (!debugInfo?.payload) return;
    const jsonStr = JSON.stringify(debugInfo.payload, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const citations = debugInfo?.citations || [];
  const intentInfo = debugInfo?.intentInfo;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle,#1e2029)] bg-[var(--bg-secondary,#191a21)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] flex items-center justify-center text-[var(--accent-color,#818cf8)]">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">Ollama Request Debug Inspector</h2>
              <p className="text-[11px] text-[var(--text-muted,#6b7280)]">
                Real-time API payload, retrieved memory citations, and model parameters sent to Ollama
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
          {debugInfo ? (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Model Name */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)]">
                  <div className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono mb-1">Model</div>
                  <div className="font-bold text-[var(--text-primary,#e6e9f0)] truncate font-mono text-xs">
                    {debugInfo.model || "None"}
                  </div>
                </div>

                {/* Thinking Toggle Status */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)]">
                  <div className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono mb-1 flex items-center gap-1">
                    <Brain className="w-3 h-3 text-[var(--accent-color,#818cf8)]" />
                    <span>Thinking</span>
                  </div>
                  <div
                    className={`font-bold font-mono text-xs ${
                      debugInfo.enableThinking ? "text-[var(--accent-color,#818cf8)]" : "text-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    {debugInfo.enableThinking ? "ON (think: true)" : "OFF (think: false)"}
                  </div>
                </div>

                {/* Vision Capability */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)]">
                  <div className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono mb-1 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>Vision</span>
                  </div>
                  <div
                    className={`font-bold font-mono text-xs ${
                      debugInfo.supportsVision ? "text-emerald-400" : "text-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    {debugInfo.supportsVision ? "YES (Vision Ready)" : "NO (Text Only)"}
                  </div>
                </div>

                {/* Context & Token estimate */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)]">
                  <div className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    <span>num_ctx</span>
                  </div>
                  <div className="font-bold font-mono text-xs text-[var(--text-primary,#e6e9f0)]">
                    {debugInfo.numCtx || 4096} tokens
                  </div>
                </div>
              </div>

              {/* Context Pruning & Compression Summary */}
              <div className="p-3.5 bg-[var(--bg-secondary,#191a21)] rounded-xl border border-[var(--border-subtle,#1e2029)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary,#e6e9f0)] flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                    Context & Payload Management
                  </span>
                  {debugInfo.isPruned && (
                    <span className="bg-amber-950/60 border border-amber-800 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                      Auto-pruned for context window
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary,#9ba3b2)]">
                  <div>
                    Estimated prompt:{" "}
                    <strong className="text-[var(--text-primary,#e6e9f0)] font-mono">
                      ~{debugInfo.estimatedTokens || 0}
                    </strong>{" "}
                    tokens
                  </div>
                  <div>
                    Messages in payload:{" "}
                    <strong className="text-[var(--text-primary,#e6e9f0)] font-mono">
                      {debugInfo.includedMessagesCount ?? 0}
                    </strong>{" "}
                    / {debugInfo.totalOriginalMessages ?? 0} total
                  </div>
                  <div>
                    Attachments:{" "}
                    <strong className="text-[var(--text-primary,#e6e9f0)] font-mono">
                      {debugInfo.attachmentsCount?.images || 0} images,{" "}
                      {debugInfo.attachmentsCount?.files || 0} files
                    </strong>
                  </div>
                </div>

                {(debugInfo.retrievedMemoriesCount !== undefined || debugInfo.tokensSavedByCompression) && (
                  <div className="pt-2 border-t border-[var(--border-subtle,#1e2029)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-indigo-300">
                      <Brain className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                      <span>
                        Injected Memories: <strong className="font-mono">{debugInfo.retrievedMemoriesCount || 0}</strong> items
                      </span>
                    </div>
                    {debugInfo.tokensSavedByCompression && debugInfo.tokensSavedByCompression > 0 && (
                      <span className="text-emerald-400 font-mono text-[10px]">
                        Saved ~{debugInfo.tokensSavedByCompression} tokens via compression
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Memory Recall & Retrieved Items Details */}
              <div className="p-3.5 bg-[var(--bg-secondary,#191a21)] rounded-xl border border-[var(--border-subtle,#1e2029)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                    <span className="font-semibold text-[var(--text-primary,#e6e9f0)] text-xs">
                      Memory Retrieval & Semantic Intent Analysis
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMemoriesDetails(!showMemoriesDetails)}
                    className="p-1 rounded hover:bg-[var(--bg-primary,#131418)] text-[var(--text-muted,#6b7280)] transition-colors cursor-pointer"
                  >
                    {showMemoriesDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showMemoriesDetails && (
                  <div className="space-y-2.5 pt-1 text-[11px]">
                    {/* Intent Tag */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[var(--text-muted,#6b7280)]">Detected Intent:</span>
                      {intentInfo?.isExplicitRecall ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                          Explicit Historical Recall
                        </span>
                      ) : intentInfo?.intentType === "correction" ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                          User Decision Correction
                        </span>
                      ) : intentInfo?.isRecallIntent ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                          Implicit Historical Query
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700 font-medium">
                          General Query (Relevance Filter Active)
                        </span>
                      )}

                      {intentInfo?.targetEntities && intentInfo.targetEntities.length > 0 && (
                        <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                          Entities: {intentInfo.targetEntities.join(", ")}
                        </span>
                      )}
                    </div>

                    {/* Retrieved Citations List */}
                    {citations.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        <div className="text-[10px] uppercase font-mono text-[var(--text-muted,#6b7280)]">
                          Retrieved Memory Citations ({citations.length}):
                        </div>
                        {citations.map((c, i) => (
                          <div
                            key={c.memoryId || i}
                            className="p-2.5 rounded-lg bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] flex items-start justify-between gap-2"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-medium text-[var(--text-primary,#e6e9f0)] flex items-center gap-1.5 truncate">
                                <Sparkles className="w-3 h-3 text-[var(--accent-color,#818cf8)] shrink-0" />
                                <span className="truncate">{c.title}</span>
                              </div>
                              <div className="text-[10px] text-[var(--text-muted,#6b7280)] flex items-center gap-2">
                                {c.conversationTitle && <span>From: "{c.conversationTitle}"</span>}
                                {c.sourceRange && (
                                  <span>(Turns {c.sourceRange.startIndex + 1}–{c.sourceRange.endIndex + 1})</span>
                                )}
                                {c.hasSourceExcerpt && (
                                  <span className="text-emerald-400 font-mono">Source Excerpt Included</span>
                                )}
                              </div>
                              {c.supersededNotice && (
                                <div className="text-[10px] text-amber-400 italic">
                                  {c.supersededNotice}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 flex flex-col items-end">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                                {(c.relevanceScore * 100).toFixed(0)}% Match
                              </span>
                              {c.isPinned && (
                                <span className="text-[9px] text-amber-400 font-mono mt-0.5">PINNED</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] text-[var(--text-muted,#6b7280)] italic">
                        No previous memories reached the relevance threshold for this query.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* JSON Payload Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary,#e6e9f0)] flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                    Exact Ollama JSON Payload
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!debugInfo?.payload) return;
                        const host = debugInfo.url || "http://127.0.0.1:11434";
                        const curl = `curl ${host}/api/chat -H "Content-Type: application/json" -d '${JSON.stringify(debugInfo.payload)}'`;
                        navigator.clipboard.writeText(curl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#e6e9f0)] text-[11px] font-mono transition-colors cursor-pointer"
                      title="Copy curl command to run in terminal"
                    >
                      <Terminal className="w-3 h-3 text-[var(--accent-color,#818cf8)]" />
                      <span>Copy cURL</span>
                    </button>

                    <button
                      onClick={handleCopyPayload}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#e6e9f0)] text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[var(--text-muted,#6b7280)]" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-[11px] text-emerald-400 leading-relaxed custom-scrollbar">
                  <pre>{JSON.stringify(debugInfo.payload, null, 2)}</pre>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-[var(--text-muted,#6b7280)]">
              No request payload generated yet. Send a message to inspect the actual Ollama request details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

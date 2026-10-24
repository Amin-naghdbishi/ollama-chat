import React, { useState, useEffect, useMemo } from "react";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit3,
  Pin,
  PinOff,
  Layers,
  Sparkles,
  Zap,
  Activity,
  Sliders,
  History,
  FolderPlus,
  Tag,
  CheckSquare,
  Square,
  X,
  Save,
  Cpu,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Folder,
  Check,
  AlertCircle,
  FileText,
  Play,
  RotateCcw,
  CheckCheck,
  GitBranch,
  KeyRound,
} from "lucide-react";
import {
  ContextMemoryItem,
  ContextMemoryFolder,
  ContextCompressionConfig,
  ContextCompressionEvent,
  Conversation,
  MemoryImportance,
  AppSettings,
  OllamaModel,
  MemoryAuditLogEntry,
  StressTestResult,
} from "../../types";
import { MemoryService } from "../../services/memoryService";
import { retrieveRelevantMemories } from "../../lib/contextCompressor";
import { Language, getTranslation } from "../../lib/i18n";

interface ContextExplorerViewProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  selectedModel: string | null;
  models: OllamaModel[];
  settings: AppSettings;
  onBack: () => void;
  language?: Language;
  isEmbeddedInSettings?: boolean;
}

export const ContextExplorerView: React.FC<ContextExplorerViewProps> = ({
  conversations,
  activeConversationId,
  selectedModel,
  models,
  settings,
  onBack,
  language = "en",
  isEmbeddedInSettings = false,
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "memories" | "stresstest" | "history" | "audit" | "tester" | "settings"
  >("memories");

  // State
  const [memories, setMemories] = useState<ContextMemoryItem[]>(() => MemoryService.getMemories());
  const [folders, setFolders] = useState<ContextMemoryFolder[]>(() => MemoryService.getFolders());
  const [config, setConfig] = useState<ContextCompressionConfig>(() => MemoryService.getConfig());
  const [events, setEvents] = useState<ContextCompressionEvent[]>(() => MemoryService.getEvents());
  const [auditLogs, setAuditLogs] = useState<MemoryAuditLogEntry[]>(() => MemoryService.getAuditLogs());
  const [stressTests, setStressTests] = useState<StressTestResult[]>(() => MemoryService.getStressTestResults());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all">("all");
  const [selectedImportance, setSelectedImportance] = useState<string | "all">("all");
  const [selectedConvFilter, setSelectedConvFilter] = useState<string | "all">("all");

  // Multi-Selection for Meta-Memory aggregation
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set());

  // Modal / Editor State
  const [editingMemory, setEditingMemory] = useState<Partial<ContextMemoryItem> | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#818cf8");

  // Interactive Retrieval Tester State
  const [testQuery, setTestQuery] = useState("");

  // Stress Test Running State
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  const [activeStressResult, setActiveStressResult] = useState<StressTestResult | null>(
    () => MemoryService.getStressTestResults()[0] || null
  );

  // Compression Status Feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Subscribe to memory updates
  useEffect(() => {
    const unsub = MemoryService.subscribe((updated) => {
      setMemories(updated);
      setAuditLogs(MemoryService.getAuditLogs());
      setEvents(MemoryService.getEvents());
    });
    return unsub;
  }, []);

  // Filtered Memories
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (selectedFolderId !== "all" && m.folderId !== selectedFolderId) return false;
      if (selectedImportance !== "all" && m.importance !== selectedImportance) return false;
      if (selectedConvFilter !== "all" && m.conversationId !== selectedConvFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inSummary = m.summary.toLowerCase().includes(q);
        const inTopics = m.topics.some((topic) => topic.toLowerCase().includes(q));
        const inFacts = m.keyFacts.some((f) => f.toLowerCase().includes(q));
        const inTags = m.tags.some((tag) => tag.toLowerCase().includes(q));
        const inReqs = (m.requirements || []).some((r) => r.content.toLowerCase().includes(q));
        return inTitle || inSummary || inTopics || inFacts || inTags || inReqs;
      }
      return true;
    });
  }, [memories, selectedFolderId, selectedImportance, selectedConvFilter, searchQuery]);

  // Total tokens saved calculation
  const totalTokensSaved = useMemo(() => {
    return events.reduce((sum, e) => sum + (e.savedTokens || 0), 0);
  }, [events]);

  // Handlers
  const handleToggleSelectAll = () => {
    if (selectedMemoryIds.size === filteredMemories.length) {
      setSelectedMemoryIds(new Set());
    } else {
      setSelectedMemoryIds(new Set(filteredMemories.map((m) => m.id)));
    }
  };

  const toggleSelectMemory = (id: string) => {
    const next = new Set(selectedMemoryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMemoryIds(next);
  };

  const handleCombineSelected = () => {
    if (selectedMemoryIds.size < 2) return;
    const meta = MemoryService.combineMemories(
      Array.from(selectedMemoryIds),
      selectedFolderId !== "all" ? selectedFolderId : undefined
    );
    if (meta) {
      setSelectedMemoryIds(new Set());
      setStatusMessage(`Combined ${meta.childMemoryIds?.length || selectedMemoryIds.size} memories into hierarchical Meta-Memory.`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editingMemory.title?.trim() || !editingMemory.summary?.trim()) return;

    if (editingMemory.id) {
      MemoryService.updateMemory(editingMemory.id, editingMemory);
    } else {
      const newMem: ContextMemoryItem = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: editingMemory.title.trim(),
        summary: editingMemory.summary.trim(),
        keyFacts: editingMemory.keyFacts || [],
        topics: editingMemory.topics || [],
        compressedTokenEstimate: Math.ceil(editingMemory.summary.length / 3.8) + 20,
        compressionRatio: 0.6,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        importance: editingMemory.importance || "medium",
        importanceScore: editingMemory.importance === "critical" ? 0.9 : 0.6,
        tags: editingMemory.tags || [],
        folderId: editingMemory.folderId || (selectedFolderId !== "all" ? selectedFolderId : undefined),
        color: editingMemory.color || "#818cf8",
        stage: 1,
        compressionCycle: 1,
        version: 1,
        isAuthoritative: true,
      };
      MemoryService.saveMemory(newMem);
    }
    setEditingMemory(null);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folder = MemoryService.createFolder(newFolderName, newFolderColor);
    setFolders(MemoryService.getFolders());
    setSelectedFolderId(folder.id);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const handleManualCompressActiveChat = () => {
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    if (!activeConv || activeConv.messages.length < 2) {
      setStatusMessage("Active conversation must have at least 2 messages to compress.");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const result = MemoryService.compressConversation({
      conversation: activeConv,
      modelName: selectedModel || "default-model",
      config,
      triggerReason: "manual",
    });

    if (result.success && result.memoryItem) {
      setStatusMessage(`Saved ~${result.savedTokens} tokens in cycle #${result.memoryItem.compressionCycle}.`);
      setEvents(MemoryService.getEvents());
    } else {
      setStatusMessage(result.error || "Could not compress active chat.");
    }
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSaveConfig = (updates: Partial<ContextCompressionConfig>) => {
    const updated = MemoryService.updateConfig(updates);
    setConfig(updated);
  };

  const handleRunStressTest = () => {
    setIsRunningStressTest(true);
    setTimeout(() => {
      const res = MemoryService.runStressTest();
      setActiveStressResult(res);
      setStressTests(MemoryService.getStressTestResults());
      setAuditLogs(MemoryService.getAuditLogs());
      setMemories(MemoryService.getMemories());
      setIsRunningStressTest(false);
    }, 400);
  };

  // Live test result for interactive tester tab
  const testResults = useMemo(() => {
    if (!testQuery.trim()) return null;
    return retrieveRelevantMemories({
      query: testQuery,
      memories,
      activeModel: selectedModel || undefined,
      maxResults: config.maxRetrievedMemories || 5,
      maxTokenBudget: config.maxMemoryContextBudget || 1800,
      minRelevanceThreshold: config.minRelevanceThreshold ?? 0.35,
      getConversationById: (id) => conversations.find((c) => c.id === id),
    });
  }, [testQuery, memories, selectedModel, config, conversations]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary,#0e0f12)] text-[var(--text-primary,#e6e9f0)] overflow-hidden font-sans">
      {/* Top Header - Standalone view has full back header, Embedded mode has compact toolbar */}
      {!isEmbeddedInSettings ? (
        <div className="h-14 border-b border-[var(--border-subtle,#1f2028)] flex items-center justify-between px-4 sm:px-6 bg-[var(--bg-secondary,#14151a)] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-[var(--text-muted,#777)] hover:text-white hover:bg-[var(--btn-hover,#262626)] transition-colors cursor-pointer"
              title={language === "fa" ? "بازگشت به چت" : "Back to Chat"}
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[var(--text-primary,#eee)] flex items-center gap-2">
                  {language === "fa" ? "معماری کانتکست و حافظه پایدار" : "Context & Memory Architecture"}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                    {language === "fa" ? "آماده بازیابی" : "Integrity & Recovery Ready"}
                  </span>
                </h1>
                <p className="text-[11px] text-[var(--text-muted,#666)] hidden sm:block">
                  {language === "fa"
                    ? "استخراج فکت‌ها، فشرده‌سازی چرخه‌ای، یکپارچه‌سازی و بازیابی عمیق"
                    : "Structured factual extraction, multi-cycle compression, deduplication, and deep historical recall"}
                </p>
              </div>
            </div>
          </div>

          {/* Global Action: Manual Compress Button */}
          <div className="flex items-center gap-2">
            {statusMessage && (
              <span className="text-xs text-emerald-400 animate-fadeIn font-mono font-medium hidden sm:inline">
                {statusMessage}
              </span>
            )}

            <button
              onClick={handleManualCompressActiveChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
              title={language === "fa" ? "فشرده‌سازی و استخراج فکت‌ها از مکالمه جاری" : "Extract and compress older turns from the current active conversation"}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{language === "fa" ? "فشرده‌سازی چت فعال" : "Compress Active Chat"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--border-subtle,#1f2028)] flex items-center justify-between bg-[var(--bg-secondary,#14151a)]/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary,#eee)] flex items-center gap-2">
                <span>{language === "fa" ? "کاوشگر کانتکست و حافظه" : "Context & Memory Explorer"}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                  {memories.length} {language === "fa" ? "مورد" : "items"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusMessage && (
              <span className="text-xs text-emerald-400 animate-fadeIn font-mono font-medium hidden sm:inline">
                {statusMessage}
              </span>
            )}
            <button
              onClick={handleManualCompressActiveChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
              title={language === "fa" ? "فشرده‌سازی و استخراج فکت‌ها از مکالمه جاری" : "Extract and compress older turns from the current active conversation"}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{language === "fa" ? "فشرده‌سازی چت فعال" : "Compress Active Chat"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Sidebar Navigation + Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-48 sm:w-56 border-r border-[var(--border-subtle,#1f2028)] bg-[var(--bg-secondary,#14151a)]/50 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("memories")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "memories"
                  ? "bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)] border border-[var(--accent-color,#818cf8)]/30"
                  : "text-[var(--text-muted,#888)] hover:text-white hover:bg-[var(--bg-surface,#1b1c23)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                <span>Memory Items</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{memories.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("stresstest")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "stresstest"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-[var(--text-muted,#888)] hover:text-white hover:bg-[var(--bg-surface,#1b1c23)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stress Test</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">5-Cycle</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)] border border-[var(--accent-color,#818cf8)]/30"
                  : "text-[var(--text-muted,#888)] hover:text-white hover:bg-[var(--bg-surface,#1b1c23)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                <span>Compression Log</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{events.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "audit"
                  ? "bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)] border border-[var(--accent-color,#818cf8)]/30"
                  : "text-[var(--text-muted,#888)] hover:text-white hover:bg-[var(--bg-surface,#1b1c23)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Memory Audit Log</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">{auditLogs.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("tester")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "tester"
                  ? "bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)] border border-[var(--accent-color,#818cf8)]/30"
                  : "text-[var(--text-muted,#888)] hover:text-white hover:bg-[var(--bg-surface,#1b1c23)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Recall Tester</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)] border border-[var(--accent-color,#818cf8)]/30"
                  : "text-[var(--text-muted,#888)] hover:text-white hover:bg-[var(--bg-surface,#1b1c23)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                <span>Configuration</span>
              </div>
            </button>
          </div>

          {/* Quick Metrics at bottom of sidebar */}
          <div className="pt-3 border-t border-[var(--border-subtle,#1f2028)] space-y-1.5 text-[11px] font-mono">
            <div className="text-[10px] uppercase text-[var(--text-muted,#555)]">Telemetry</div>
            <div className="flex justify-between text-[var(--text-secondary,#aaa)]">
              <span>Tokens Saved:</span>
              <span className="text-emerald-400 font-bold">~{totalTokensSaved.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary,#aaa)]">
              <span>Threshold:</span>
              <span className="text-[var(--accent-color,#818cf8)]">{config.triggerThresholdPercent}%</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary,#aaa)]">
              <span>Memories:</span>
              <span className="text-[var(--text-primary,#eee)]">{memories.length}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Main Body Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TAB 1: STORED MEMORY ITEMS */}
          {activeTab === "memories" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 gap-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Search input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#666)]" />
                  <input
                    type="text"
                    placeholder="Search memories, decisions, requirements, codenames, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] focus:border-[var(--accent-color,#818cf8)] rounded-xl pl-9 pr-8 rtl:pl-8 rtl:pr-9 py-2 text-xs text-[var(--text-primary,#eee)] placeholder-[var(--text-muted,#666)] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted,#666)] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Importance Filter */}
                <select
                  value={selectedImportance}
                  onChange={(e) => setSelectedImportance(e.target.value)}
                  aria-label="Filter by importance"
                  className="bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-secondary,#aaa)] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Importance</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Conversation Filter */}
                <select
                  value={selectedConvFilter}
                  onChange={(e) => setSelectedConvFilter(e.target.value)}
                  aria-label="Filter by conversation"
                  className="bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-secondary,#aaa)] focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  <option value="all">All Chats</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>

                {/* Multi-Selection Actions (Combine Meta-Memory) */}
                {selectedMemoryIds.size > 0 && (
                  <button
                    onClick={handleCombineSelected}
                    disabled={selectedMemoryIds.size < 2}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      selectedMemoryIds.size >= 2
                        ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-xs"
                        : "bg-[var(--bg-secondary,#1f2028)] text-[var(--text-muted,#666)] opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Combine ({selectedMemoryIds.size}) into Meta-Memory</span>
                  </button>
                )}
              </div>

              {/* Memory Cards Grid / List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                {filteredMemories.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-subtle,#262626)]">
                    <Brain className="w-10 h-10 text-[var(--text-muted,#444)] mb-3 stroke-1" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary,#ddd)] mb-1">
                      No memories match your filters
                    </h3>
                    <p className="text-xs text-[var(--text-muted,#777)] max-w-md">
                      Memories are automatically generated when conversation token usage hits 90%, or when you click "Compress Chat".
                    </p>
                  </div>
                ) : (
                  filteredMemories.map((mem) => {
                    const isSelected = selectedMemoryIds.has(mem.id);
                    const isMeta = mem.stage === 2;

                    return (
                      <div
                        key={mem.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-purple-950/20 border-purple-600/70 shadow-xs"
                            : mem.isPinned
                            ? "bg-[var(--bg-secondary,#16171e)] border-amber-800/50"
                            : "bg-[var(--bg-secondary,#14151a)] border-[var(--border-color,#262626)] hover:border-[var(--accent-color,#818cf8)]/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
                            {/* Checkbox for selection */}
                            <button
                              onClick={() => toggleSelectMemory(mem.id)}
                              className="text-[var(--text-muted,#777)] hover:text-white cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-purple-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: mem.color || "#818cf8" }}
                            />

                            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary,#eee)] truncate">
                              {mem.title}
                            </h3>

                            {/* Cycle Badge */}
                            <span className="px-1.5 py-0.2 rounded bg-[var(--bg-surface,#1f2028)] text-[var(--text-muted,#888)] border border-[var(--border-subtle,#262626)] text-[10px] font-mono">
                              Cycle {mem.compressionCycle || 1} • v{mem.version || 1}
                            </span>

                            {isMeta && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60 text-[10px] uppercase font-mono">
                                Stage 2 Meta
                              </span>
                            )}

                            {/* Authoritative / Superseded Status */}
                            {mem.isAuthoritative === false ? (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[10px] font-mono uppercase">
                                Historical (Superseded)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 text-[10px] font-mono">
                                Active Authoritative
                              </span>
                            )}

                            {mem.importance && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                                  mem.importance === "critical"
                                    ? "bg-red-950/50 text-red-300 border border-red-800/50"
                                    : mem.importance === "high"
                                    ? "bg-amber-950/50 text-amber-300 border border-amber-800/50"
                                    : "bg-[var(--bg-surface,#1f2028)] text-[var(--text-muted,#888)]"
                                }`}
                              >
                                {mem.importance}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => MemoryService.togglePinMemory(mem.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                mem.isPinned
                                  ? "text-amber-400 bg-amber-950/40"
                                  : "text-[var(--text-muted,#666)] hover:text-white hover:bg-[var(--btn-hover,#262626)]"
                              }`}
                              title={mem.isPinned ? "Unpin Memory" : "Pin Memory (Always retrieve)"}
                            >
                              {mem.isPinned ? <Pin className="w-3.5 h-3.5 fill-amber-400" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => setEditingMemory(mem)}
                              className="p-1.5 rounded-lg text-[var(--text-muted,#666)] hover:text-white hover:bg-[var(--btn-hover,#262626)] transition-colors cursor-pointer"
                              title="Edit Memory"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => MemoryService.deleteMemory(mem.id)}
                              className="p-1.5 rounded-lg text-[var(--text-muted,#666)] hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Delete Memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Summary Content */}
                        <p className="text-xs text-[var(--text-secondary,#aaa)] leading-relaxed mb-3">
                          {mem.summary}
                        </p>

                        {/* Structured Requirements List */}
                        {mem.requirements && mem.requirements.length > 0 && (
                          <div className="mb-2.5 p-2 rounded-lg bg-[var(--bg-surface,#181920)] border border-[var(--border-subtle,#262626)] space-y-1">
                            <div className="text-[10px] uppercase font-mono text-[var(--accent-color,#818cf8)] font-semibold flex items-center gap-1">
                              <KeyRound className="w-3 h-3" />
                              Structured Requirements & Directives:
                            </div>
                            {mem.requirements.map((req) => (
                              <div key={req.id} className="text-[11px] text-[var(--text-primary,#ddd)] flex items-start gap-1.5">
                                <span className="text-amber-400 font-mono text-[10px]">[{req.type.toUpperCase()}]</span>
                                <span>{req.content}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Key Facts List */}
                        {mem.keyFacts && mem.keyFacts.length > 0 && (
                          <div className="mb-3 pl-2.5 rtl:pl-0 rtl:pr-2.5 border-l-2 rtl:border-l-0 rtl:border-r-2 border-[var(--accent-color,#818cf8)]/40 space-y-1">
                            {mem.keyFacts.map((fact, idx) => (
                              <div key={idx} className="text-[11px] text-[var(--text-primary,#ccc)] flex items-start gap-1.5">
                                <span className="text-[var(--accent-color,#818cf8)] font-bold">•</span>
                                <span className="font-mono text-[11px]">{fact}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Topic / Tag Pills & Compression Metric Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle,#1f2028)] text-[10px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {mem.topics?.slice(0, 5).map((topic, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-[var(--bg-surface,#1c1d25)] text-[var(--text-secondary,#888)] border border-[var(--border-subtle,#262626)]"
                              >
                                #{topic}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[var(--text-muted,#777)]">
                            {mem.sourceMessageRange && (
                              <span>
                                {mem.sourceMessageRange.messageCount} msgs (
                                {mem.sourceMessageRange.originalTokenEstimate} tok)
                              </span>
                            )}
                            <span className="text-emerald-400 font-semibold">
                              → {mem.compressedTokenEstimate} tok ({Math.round(mem.compressionRatio * 100)}% saved)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-CYCLE STRESS TEST & DIAGNOSTIC */}
          {activeTab === "stresstest" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 gap-4">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary,#eee)] flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    Multi-Cycle Stress Test & Long-Term Memory Recovery
                  </h2>
                  <p className="text-xs text-[var(--text-muted,#777)]">
                    Simulates a 5-cycle continuous compression session with conflicting decisions, secret codenames, and validates 7 deep historical recall probes.
                  </p>
                </div>

                <button
                  onClick={handleRunStressTest}
                  disabled={isRunningStressTest}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isRunningStressTest ? "Running 5 Cycles..." : "Run 5-Cycle Stress Test"}</span>
                </button>
              </div>

              {activeStressResult ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {/* Summary Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)]">
                      <div className="text-[10px] text-[var(--text-muted,#777)] font-mono">Test Status</div>
                      <div
                        className={`text-sm font-bold font-mono mt-1 ${
                          activeStressResult.allPassed ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {activeStressResult.allPassed ? "100% PROBES PASSED" : "PARTIAL PASS"}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)]">
                      <div className="text-[10px] text-[var(--text-muted,#777)] font-mono">Total Tokens Saved</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
                        ~{activeStressResult.totalTokensSaved.toLocaleString()} tok
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)]">
                      <div className="text-[10px] text-[var(--text-muted,#777)] font-mono">Compression Ratio</div>
                      <div className="text-sm font-bold text-[var(--accent-color,#818cf8)] font-mono mt-1">
                        {(activeStressResult.compressionRatio * 100).toFixed(0)}% Reduced
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)]">
                      <div className="text-[10px] text-[var(--text-muted,#777)] font-mono">Compression Cycles</div>
                      <div className="text-sm font-bold text-purple-400 font-mono mt-1">
                        {activeStressResult.totalCycles} consecutive cycles
                      </div>
                    </div>
                  </div>

                  {/* 7 Recall Probes Inspection */}
                  <div className="p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] space-y-3">
                    <div className="text-xs font-semibold text-[var(--text-primary,#eee)] flex items-center justify-between">
                      <span>7 Deep Historical Recall Probes:</span>
                      <span className="font-mono text-[11px] text-emerald-400">
                        {activeStressResult.probes.filter((p) => p.passed).length} / {activeStressResult.probes.length} Passed
                      </span>
                    </div>

                    <div className="space-y-2">
                      {activeStressResult.probes.map((probe, i) => (
                        <div
                          key={probe.probeId || i}
                          className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                            probe.passed
                              ? "bg-[var(--bg-surface,#181920)] border-emerald-800/40"
                              : "bg-[var(--bg-surface,#181920)] border-red-800/40"
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {probe.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                              <span className="font-semibold text-[var(--text-primary,#eee)] truncate">
                                {probe.category}
                              </span>
                            </div>

                            <p className="text-[11px] text-[var(--text-muted,#888)] italic">
                              "{probe.question}"
                            </p>

                            {probe.retrievedSnippet && (
                              <p className="text-[11px] text-[var(--text-secondary,#aaa)] font-mono">
                                Retrieved: {probe.retrievedSnippet}...
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-1 font-mono text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                probe.passed
                                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                                  : "bg-red-950/60 text-red-300 border border-red-800/50"
                              }`}
                            >
                              {probe.passed ? "PASSED" : "FAILED"}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted,#777)]">
                              Score: {(probe.relevanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-subtle,#262626)]">
                  <Play className="w-10 h-10 text-[var(--text-muted,#444)] mb-3" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary,#ddd)] mb-1">
                    No Stress Test Run Yet
                  </h3>
                  <p className="text-xs text-[var(--text-muted,#777)] max-w-md mb-4">
                    Click "Run 5-Cycle Stress Test" to verify that information introduced near the beginning of a conversation (such as secret codename ORBIT-742) remains 100% recoverable after 5 compression cycles.
                  </p>
                  <button
                    onClick={handleRunStressTest}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                  >
                    Run 5-Cycle Stress Test Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPRESSION EVENTS LOG */}
          {activeTab === "history" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 gap-4">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary,#eee)]">
                    Compression Monitoring Log
                  </h2>
                  <p className="text-xs text-[var(--text-muted,#777)]">
                    Audit trail of real-time 90% threshold and manual context compressions.
                  </p>
                </div>
                {events.length > 0 && (
                  <button
                    onClick={() => {
                      MemoryService.clearEvents();
                      setEvents([]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface,#1f2028)] text-[var(--text-muted,#777)] hover:text-white text-xs cursor-pointer"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {events.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted,#666)]">
                    No compression events logged yet.
                  </div>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold ${
                              ev.triggerReason === "threshold_exceeded"
                                ? "bg-red-950/60 text-red-300 border border-red-800/50"
                                : "bg-blue-950/60 text-blue-300 border border-blue-800/50"
                            }`}
                          >
                            {ev.triggerReason === "threshold_exceeded" ? "90% Threshold Hit" : "Manual Trigger"}
                          </span>
                          <span className="font-semibold text-[var(--text-primary,#eee)] truncate">
                            {ev.conversationTitle || ev.conversationId}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted,#666)] flex items-center gap-2">
                          <span>Cycle: #{ev.compressionCycle || 1}</span>
                          <span>•</span>
                          <span>Model: {ev.modelName}</span>
                          <span>•</span>
                          <span>{new Date(ev.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>{ev.durationMs}ms</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right rtl:text-left">
                          <div className="text-emerald-400 font-bold">
                            -{ev.savedTokens.toLocaleString()} tok saved
                          </div>
                          <div className="text-[10px] text-[var(--text-muted,#666)]">
                            {ev.originalTokens} tok → {ev.compressedTokens} tok ({ev.percentageAfter}% kept)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MEMORY AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 gap-4">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary,#eee)]">
                    Memory Lifecycle Audit Trail
                  </h2>
                  <p className="text-xs text-[var(--text-muted,#777)]">
                    Immutable event log of all memory creations, updates, merges, superseding actions, and queries.
                  </p>
                </div>
                {auditLogs.length > 0 && (
                  <button
                    onClick={() => {
                      MemoryService.clearAuditLogs();
                      setAuditLogs([]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface,#1f2028)] text-[var(--text-muted,#777)] hover:text-white text-xs cursor-pointer"
                  >
                    Clear Audit Trail
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 font-mono text-xs">
                {auditLogs.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted,#666)]">
                    No audit records logged yet.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-[var(--bg-secondary,#14151a)] border border-[var(--border-subtle,#1f2028)] flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              log.action.includes("FAILED")
                                ? "bg-red-950/60 text-red-300 border border-red-800/50"
                                : log.action.includes("MERGED") || log.action.includes("SUPERSEDED")
                                ? "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                                : log.action.includes("COMPLETED") || log.action.includes("CREATED")
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                                : "bg-indigo-950/60 text-indigo-300 border border-indigo-800/50"
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="text-[var(--text-primary,#ddd)]">{log.details}</span>
                        </div>
                        {log.conversationId && (
                          <div className="text-[10px] text-[var(--text-muted,#666)]">
                            Conversation ID: {log.conversationId}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-[var(--text-muted,#666)] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: INTERACTIVE RELEVANCE TESTER */}
          {activeTab === "tester" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#eee)]">
                  Live Relevance Retrieval Engine
                </h2>
                <p className="text-xs text-[var(--text-muted,#777)]">
                  Simulate how your stored memory blocks are scored and retrieved when a user submits a prompt.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter a hypothetical user prompt (e.g. 'What was the internal project codename?' or 'What database do we use?')..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="w-full bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] focus:border-[var(--accent-color,#818cf8)] rounded-xl px-4 py-3 text-xs text-[var(--text-primary,#eee)] focus:outline-none"
                />
              </div>

              {testResults && (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted,#888)]">
                    <span>
                      Retrieved {testResults.memories.length} matches (
                      {testResults.totalMemoryTokens} tokens)
                    </span>
                  </div>

                  {testResults.memories.map((mem) => {
                    const score = testResults.retrievalScores[mem.id] || 0;
                    return (
                      <div
                        key={mem.id}
                        className="p-3.5 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-emerald-800/40 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-primary,#eee)]">
                            {mem.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[10px] font-mono font-bold">
                            Score: {(score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary,#aaa)]">{mem.summary}</p>
                      </div>
                    );
                  })}

                  {/* Raw Prompt Block Preview */}
                  <div className="mt-4 p-3 rounded-xl bg-[var(--bg-surface,#1a1b22)] border border-[var(--border-subtle,#262626)] font-mono text-[11px] text-[var(--text-secondary,#999)] whitespace-pre-wrap">
                    <span className="text-[var(--accent-color,#818cf8)] font-semibold block mb-1">
                      Injected Context Payload:
                    </span>
                    {testResults.formattedPromptContext || "No memory payload generated."}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ENGINE SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 max-w-2xl">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary,#eee)]">
                  Compression Engine Configuration
                </h2>
                <p className="text-xs text-[var(--text-muted,#777)]">
                  Customize automatic threshold monitoring, preservation limits, and retrieval behavior.
                </p>
              </div>

              {/* Enable / Disable */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary,#eee)]">
                    Context Compression System
                  </div>
                  <div className="text-[11px] text-[var(--text-muted,#777)]">
                    Enable real-time context token monitoring and structured memory extraction.
                  </div>
                </div>
                <button
                  onClick={() => handleSaveConfig({ enabled: !config.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    config.enabled ? "bg-[var(--accent-color,#818cf8)]" : "bg-[var(--bg-surface,#262626)]"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      config.enabled ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Trigger Threshold Slider (Default 90%) */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--text-primary,#eee)]">
                    {t("triggerThreshold")}
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--accent-color,#818cf8)]">
                    {config.triggerThresholdPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted,#777)]">
                  Automatically triggers background memory extraction when conversation prompt tokens exceed this percentage of the model's context window.
                </p>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={config.triggerThresholdPercent}
                  onChange={(e) => handleSaveConfig({ triggerThresholdPercent: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-[var(--accent-color,#818cf8)]"
                />
              </div>

              {/* Preserve Recent Turns */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--text-primary,#eee)]">
                    {t("preserveTurns")}
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--accent-color,#818cf8)]">
                    {config.preserveRecentTurns} turns
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted,#777)]">
                  Number of recent conversation turns (user & assistant pairs) that must always remain in full verbatim fidelity and never be compressed.
                </p>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={config.preserveRecentTurns}
                  onChange={(e) => handleSaveConfig({ preserveRecentTurns: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-[var(--accent-color,#818cf8)]"
                />
              </div>

              {/* Max Retrieved Memories */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--text-primary,#eee)]">
                    Max Injected Memories per Prompt
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--accent-color,#818cf8)]">
                    {config.maxRetrievedMemories} items
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted,#777)]">
                  Maximum number of relevant structured memory blocks to inject into the system context.
                </p>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={config.maxRetrievedMemories}
                  onChange={(e) => handleSaveConfig({ maxRetrievedMemories: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-[var(--accent-color,#818cf8)]"
                />
              </div>

              {/* Minimum Relevance Threshold */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--text-primary,#eee)]">
                    Minimum Relevance Threshold
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--accent-color,#818cf8)]">
                    {Math.round((config.minRelevanceThreshold ?? 0.35) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted,#777)]">
                  Memories scoring below this threshold will not be injected for general queries, preventing unrelated memory noise. (Explicit recall queries use an adaptive lower threshold).
                </p>
                <input
                  type="range"
                  min="15"
                  max="80"
                  step="5"
                  value={Math.round((config.minRelevanceThreshold ?? 0.35) * 100)}
                  onChange={(e) => handleSaveConfig({ minRelevanceThreshold: Number(e.target.value) / 100 })}
                  className="w-full cursor-pointer accent-[var(--accent-color,#818cf8)]"
                />
              </div>

              {/* Deduplication Threshold */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--text-primary,#eee)]">
                    Deduplication & Merge Sensitivity
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--accent-color,#818cf8)]">
                    {Math.round((config.deduplicationThreshold ?? 0.75) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted,#777)]">
                  Cosine/Jaccard similarity threshold above which repeated statements are merged into existing memories rather than accumulating duplicate entries.
                </p>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={Math.round((config.deduplicationThreshold ?? 0.75) * 100)}
                  onChange={(e) => handleSaveConfig({ deduplicationThreshold: Number(e.target.value) / 100 })}
                  className="w-full cursor-pointer accent-[var(--accent-color,#818cf8)]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Memory Editor / Creation Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface,#1a1b22)] border border-[var(--border-color,#333)] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-[var(--border-subtle,#262626)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary,#eee)]">
                {editingMemory.id ? "Edit Memory Item" : "Create Context Memory"}
              </h3>
              <button
                onClick={() => setEditingMemory(null)}
                className="text-[var(--text-muted,#777)] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-muted,#888)] mb-1 font-medium">Title</label>
                <input
                  type="text"
                  required
                  value={editingMemory.title || ""}
                  onChange={(e) => setEditingMemory({ ...editingMemory, title: e.target.value })}
                  className="w-full bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary,#eee)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted,#888)] mb-1 font-medium">Summary</label>
                <textarea
                  required
                  rows={4}
                  value={editingMemory.summary || ""}
                  onChange={(e) => setEditingMemory({ ...editingMemory, summary: e.target.value })}
                  className="w-full bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary,#eee)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted,#888)] mb-1 font-medium">Importance</label>
                  <select
                    value={editingMemory.importance || "medium"}
                    onChange={(e) =>
                      setEditingMemory({
                        ...editingMemory,
                        importance: e.target.value as MemoryImportance,
                      })
                    }
                    className="w-full bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary,#eee)] focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted,#888)] mb-1 font-medium">Category Folder</label>
                  <select
                    value={editingMemory.folderId || ""}
                    onChange={(e) =>
                      setEditingMemory({
                        ...editingMemory,
                        folderId: e.target.value || undefined,
                      })
                    }
                    className="w-full bg-[var(--bg-secondary,#14151a)] border border-[var(--border-color,#262626)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary,#eee)] focus:outline-none"
                  >
                    <option value="">No Folder (Root)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle,#262626)]">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-secondary,#1f2028)] text-[var(--text-secondary,#aaa)] hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

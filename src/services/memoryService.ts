import {
  ChatMessage,
  Conversation,
  ContextMemoryItem,
  ContextMemoryFolder,
  ContextCompressionConfig,
  ContextCompressionEvent,
  ContextRetrievalResult,
  RetrievedMemoryCitation,
  RecallIntentInfo,
  MemoryAuditLogEntry,
  MemoryAuditAction,
  StressTestResult,
  ConversationBlockDigest,
} from "../types";
import { Storage } from "../lib/storage";
import {
  createMemoryItemFromMessages,
  retrieveRelevantMemories,
  DEFAULT_COMPRESSION_CONFIG,
  combineMemoriesIntoMetaMemory,
  deduplicateOrMergeMemory,
  validateMemoryQuality,
  runMultiCycleStressTest,
} from "../lib/contextCompressor";
import {
  searchGlobalMemories,
  searchAllConversations,
  searchActiveContext,
  detectRecallIntent,
  generateInvertedEpistemicPrompt,
  UnifiedSearchResultItem,
} from "../lib/retrievalEngine";
import { estimateTextTokens, estimateTotalPromptTokens, pruneMessagesForContext } from "../lib/contextUtils";

// Listeners for real-time reactivity
type MemoryChangeListener = (memories: ContextMemoryItem[]) => void;
const memoryListeners = new Set<MemoryChangeListener>();

export const MemoryService = {
  // -------------------------------------------------------------
  // CRUD FOR MEMORY ITEMS
  // -------------------------------------------------------------

  getMemories(): ContextMemoryItem[] {
    return Storage.getMemories();
  },

  getMemoriesByConversation(conversationId: string): ContextMemoryItem[] {
    return Storage.getMemories().filter((m) => m.conversationId === conversationId);
  },

  getMemoryById(id: string): ContextMemoryItem | undefined {
    return Storage.getMemories().find((m) => m.id === id);
  },

  saveMemory(item: ContextMemoryItem): void {
    const list = Storage.getMemories();
    const index = list.findIndex((m) => m.id === item.id);
    let updated: ContextMemoryItem[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...item, updatedAt: Date.now(), version: (item.version || 1) + 1 };
      MemoryService.logAudit("MEMORY_UPDATED", `Updated memory '${item.title}' (v${updated[index].version})`, item.id, item.conversationId);
    } else {
      updated = [item, ...list];
      MemoryService.logAudit("MEMORY_CREATED", `Created new memory '${item.title}' [Cycle ${item.compressionCycle || 1}]`, item.id, item.conversationId);
    }
    Storage.saveMemories(updated);
    MemoryService.notifyListeners();
  },

  updateMemory(id: string, updates: Partial<ContextMemoryItem>): void {
    const list = Storage.getMemories();
    const index = list.findIndex((m) => m.id === id);
    if (index >= 0) {
      const updated = [...list];
      updated[index] = {
        ...updated[index],
        ...updates,
        updatedAt: Date.now(),
        version: (updated[index].version || 1) + 1,
      };
      Storage.saveMemories(updated);
      MemoryService.logAudit("MEMORY_UPDATED", `Modified memory fields for '${updated[index].title}'`, id, updated[index].conversationId);
      MemoryService.notifyListeners();
    }
  },

  deleteMemory(id: string): void {
    const mem = Storage.getMemories().find((m) => m.id === id);
    const list = Storage.getMemories().filter((m) => m.id !== id);
    Storage.saveMemories(list);
    MemoryService.logAudit("MEMORY_UPDATED", `Deleted memory '${mem?.title || id}'`, id, mem?.conversationId);
    MemoryService.notifyListeners();
  },

  togglePinMemory(id: string): void {
    const list = Storage.getMemories();
    const index = list.findIndex((m) => m.id === id);
    if (index >= 0) {
      const updated = [...list];
      updated[index] = {
        ...updated[index],
        isPinned: !updated[index].isPinned,
        updatedAt: Date.now(),
      };
      Storage.saveMemories(updated);
      MemoryService.logAudit(
        "MEMORY_UPDATED",
        `${updated[index].isPinned ? "Pinned" : "Unpinned"} memory '${updated[index].title}'`,
        id,
        updated[index].conversationId
      );
      MemoryService.notifyListeners();
    }
  },

  subscribe(listener: MemoryChangeListener): () => void {
    memoryListeners.add(listener);
    return () => memoryListeners.delete(listener);
  },

  notifyListeners(): void {
    const memories = Storage.getMemories();
    memoryListeners.forEach((fn) => fn(memories));
  },

  // -------------------------------------------------------------
  // FOLDERS & CATEGORIES
  // -------------------------------------------------------------

  getFolders(): ContextMemoryFolder[] {
    return Storage.getMemoryFolders();
  },

  createFolder(name: string, color?: string, description?: string): ContextMemoryFolder {
    const folder: ContextMemoryFolder = {
      id: `mfold-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || "New Category",
      color: color || "#818cf8",
      description,
      createdAt: Date.now(),
    };
    const folders = [folder, ...Storage.getMemoryFolders()];
    Storage.saveMemoryFolders(folders);
    return folder;
  },

  deleteFolder(id: string): void {
    const folders = Storage.getMemoryFolders().filter((f) => f.id !== id);
    Storage.saveMemoryFolders(folders);
    const memories = Storage.getMemories().map((m) => (m.folderId === id ? { ...m, folderId: undefined } : m));
    Storage.saveMemories(memories);
    MemoryService.notifyListeners();
  },

  // -------------------------------------------------------------
  // AUDIT LOGGING SYSTEM
  // -------------------------------------------------------------

  getAuditLogs(): MemoryAuditLogEntry[] {
    return Storage.getAuditLogs();
  },

  logAudit(
    action: MemoryAuditAction,
    details: string,
    memoryId?: string,
    conversationId?: string,
    metadata?: Record<string, any>
  ): void {
    const entry: MemoryAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      timestamp: Date.now(),
      memoryId,
      conversationId,
      details,
      metadata,
    };
    const logs = [entry, ...Storage.getAuditLogs()];
    Storage.saveAuditLogs(logs);
  },

  clearAuditLogs(): void {
    Storage.saveAuditLogs([]);
  },

  // -------------------------------------------------------------
  // COMPRESSION CONFIG & EVENTS
  // -------------------------------------------------------------

  getConfig(): ContextCompressionConfig {
    return Storage.getCompressionConfig();
  },

  updateConfig(updates: Partial<ContextCompressionConfig>): ContextCompressionConfig {
    const current = Storage.getCompressionConfig();
    const updated = { ...current, ...updates };
    Storage.saveCompressionConfig(updated);
    return updated;
  },

  getEvents(): ContextCompressionEvent[] {
    return Storage.getCompressionEvents();
  },

  logEvent(event: ContextCompressionEvent): void {
    const events = [event, ...Storage.getCompressionEvents()];
    Storage.saveCompressionEvents(events);
  },

  clearEvents(): void {
    Storage.saveCompressionEvents([]);
  },

  // -------------------------------------------------------------
  // MULTI-CYCLE STRESS TEST & DIAGNOSTIC
  // -------------------------------------------------------------

  getStressTestResults(): StressTestResult[] {
    return Storage.getStressTestResults();
  },

  runStressTest(): StressTestResult {
    MemoryService.logAudit("COMPRESSION_STARTED", "Starting 5-Cycle Multi-Compression & Recovery Stress Test...");
    const result = runMultiCycleStressTest();

    // Save result to storage
    const all = [result, ...Storage.getStressTestResults()];
    Storage.saveStressTestResults(all);

    MemoryService.logAudit(
      "STRESS_TEST_COMPLETED",
      `Completed 5-Cycle Stress Test: ${result.allPassed ? "ALL PROBES PASSED" : "SOME PROBES FAILED"} (${result.probes.filter((p) => p.passed).length}/7 passed, Saved ${result.totalTokensSaved} tokens, Ratio: ${(result.compressionRatio * 100).toFixed(0)}%)`,
      undefined,
      undefined,
      { allPassed: result.allPassed, compressionRatio: result.compressionRatio }
    );

    return result;
  },

  // -------------------------------------------------------------
  // SAFE TRANSACTIONAL COMPRESSION ENGINE
  // -------------------------------------------------------------

  /**
   * Compresses older turns of a conversation safely into a structured ContextMemoryItem.
   * Enforces transactional integrity:
   * 1. Extracts structured memory with multi-cycle numbering.
   * 2. Runs internal quality validation.
   * 3. Runs deduplication & conflict detection.
   * 4. Persists to storage and verifies write.
   * 5. If any step fails: NEVER deletes context, logs failure, and aborts safely.
   */
  compressConversation({
    conversation,
    modelName,
    config = MemoryService.getConfig(),
    triggerReason = "manual",
  }: {
    conversation: Conversation;
    modelName: string;
    config?: ContextCompressionConfig;
    triggerReason?: "threshold_exceeded" | "manual" | "preemptive";
  }): {
    memoryItem?: ContextMemoryItem;
    event?: ContextCompressionEvent;
    savedTokens: number;
    success: boolean;
    error?: string;
  } {
    const startTime = Date.now();
    const messages = conversation.messages;

    if (messages.length < 2) {
      return { savedTokens: 0, success: false, error: "Not enough messages to compress" };
    }

    try {
      MemoryService.logAudit(
        "COMPRESSION_STARTED",
        `Starting ${triggerReason} compression for '${conversation.title || conversation.id}'`,
        undefined,
        conversation.id
      );

      // Determine slice to compress
      const preserveCount = Math.max(2, (config.preserveRecentTurns || 4) * 2);
      let sliceToCompress: ChatMessage[];
      let startIndex = 0;
      let endIndex = messages.length - 1;

      if (messages.length <= preserveCount) {
        if (triggerReason === "manual" && messages.length >= 2) {
          endIndex = Math.max(0, messages.length - 2);
          sliceToCompress = messages.slice(0, endIndex + 1);
        } else {
          return { savedTokens: 0, success: false, error: "Messages within preservation window" };
        }
      } else {
        endIndex = messages.length - preserveCount - 1;
        sliceToCompress = messages.slice(0, endIndex + 1);
      }

      if (sliceToCompress.length === 0) {
        return { savedTokens: 0, success: false, error: "Empty compression slice" };
      }

      const origTokens = estimateTotalPromptTokens(sliceToCompress);

      // Determine current compression cycle for this conversation
      const existingConvMemories = MemoryService.getMemoriesByConversation(conversation.id);
      const currentCycle = existingConvMemories.reduce((max, m) => Math.max(max, m.compressionCycle || 1), 0) + 1;

      // STEP 1: GENERATE STRUCTURED MEMORY ITEM
      const item = createMemoryItemFromMessages(
        sliceToCompress,
        startIndex,
        endIndex,
        conversation.id,
        conversation.title,
        currentCycle
      );

      // STEP 2: VALIDATE QUALITY
      const validation = validateMemoryQuality(item, sliceToCompress);
      if (!validation.isValid) {
        MemoryService.logAudit(
          "COMPRESSION_FAILED",
          `Memory validation score (${validation.qualityScore}) below threshold for '${item.title}'. Missing: ${validation.missingCategories.join(", ")}`,
          item.id,
          conversation.id
        );
      }

      // STEP 3: DEDUPLICATION & CONFLICT RESOLUTION
      const allMemories = MemoryService.getMemories();
      const dedup = deduplicateOrMergeMemory(item, allMemories, config.deduplicationThreshold || 0.75);

      let finalSavedItem = item;

      if (dedup.action === "merge" && dedup.mergedMemory) {
        finalSavedItem = dedup.mergedMemory;
        MemoryService.saveMemory(finalSavedItem);
        MemoryService.logAudit(
          "MEMORY_MERGED",
          `Merged semantically identical memory into '${finalSavedItem.title}' (v${finalSavedItem.version})`,
          finalSavedItem.id,
          conversation.id
        );
      } else if (dedup.action === "supersede" && dedup.mergedMemory && dedup.supersededMemory) {
        finalSavedItem = dedup.mergedMemory;
        // Update superseded memory
        MemoryService.saveMemory(dedup.supersededMemory);
        MemoryService.saveMemory(finalSavedItem);
        MemoryService.logAudit(
          "MEMORY_SUPERSEDED",
          `Decision updated: '${finalSavedItem.title}' supersedes older decision '${dedup.supersededMemory.title}'`,
          finalSavedItem.id,
          conversation.id
        );
      } else {
        MemoryService.saveMemory(item);
      }

      // STEP 4: CONFIRM PERSISTENCE
      const persisted = MemoryService.getMemoryById(finalSavedItem.id);
      if (!persisted) {
        throw new Error("Transactional write verification failed in Storage");
      }

      const saved = Math.max(0, origTokens - finalSavedItem.compressedTokenEstimate);

      const event: ContextCompressionEvent = {
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        modelName,
        triggerReason,
        originalTokens: origTokens,
        compressedTokens: finalSavedItem.compressedTokenEstimate,
        savedTokens: saved,
        percentageBefore: 100,
        percentageAfter: Math.round((finalSavedItem.compressedTokenEstimate / Math.max(1, origTokens)) * 100),
        memoryItemsCreated: 1,
        memoryItemIds: [finalSavedItem.id],
        compressionCycle: currentCycle,
        qualityScore: validation.qualityScore,
        durationMs: Date.now() - startTime,
      };
      MemoryService.logEvent(event);

      MemoryService.logAudit(
        "COMPRESSION_COMPLETED",
        `Successfully compressed ${sliceToCompress.length} turns in cycle #${currentCycle} (Saved ~${saved} tokens, Quality: ${(validation.qualityScore * 100).toFixed(0)}%)`,
        finalSavedItem.id,
        conversation.id,
        { savedTokens: saved, cycle: currentCycle }
      );

      return { memoryItem: finalSavedItem, event, savedTokens: saved, success: true };
    } catch (err: any) {
      console.error("Context compression failed safely:", err);
      MemoryService.logAudit(
        "COMPRESSION_FAILED",
        `Compression aborted safely without discarding context: ${err?.message || "Unknown error"}`,
        undefined,
        conversation.id
      );
      return { savedTokens: 0, success: false, error: err?.message || "Compression error" };
    }
  },

  /**
   * Main Interceptor: Evaluates context limit against threshold, triggers compression if needed,
   * performs multi-factor relevance retrieval, and injects structured context into LLM payload.
   */
  processContextForDispatch({
    messages,
    systemPrompt,
    numCtx,
    modelName,
    conversationId,
    conversationTitle,
    onStatusChange,
  }: {
    messages: ChatMessage[];
    systemPrompt?: string;
    numCtx: number;
    modelName: string;
    conversationId?: string;
    conversationTitle?: string;
    onStatusChange?: (phase: import("../types").AIActivityPhase) => void;
  }): {
    prunedMessages: ChatMessage[];
    effectiveSystemPrompt?: string;
    retrievedMemories: ContextMemoryItem[];
    citations: RetrievedMemoryCitation[];
    intentInfo: RecallIntentInfo;
    wasCompressed: boolean;
    compressionEvent?: ContextCompressionEvent;
    totalPromptTokens: number;
    originalPromptTokens: number;
    tokensSaved: number;
    contextUsagePercent: number;
  } {
    const config = MemoryService.getConfig();
    const originalPromptTokens = estimateTotalPromptTokens(messages, systemPrompt);
    const usageRatio = originalPromptTokens / Math.max(1, numCtx);
    const usagePercent = Math.round(usageRatio * 100);

    let wasCompressed = false;
    let compressionEvent: ContextCompressionEvent | undefined;

    // 1. AUTOMATIC MONITORING & COMPRESSION TRIGGER (at >= 90% threshold)
    if (
      config.enabled &&
      config.autoCompressOnThreshold &&
      usagePercent >= (config.triggerThresholdPercent || 90) &&
      originalPromptTokens >= (config.minTokensToCompress || 1200) &&
      conversationId &&
      messages.length >= 4
    ) {
      onStatusChange?.("compressing_context");
      const mockConv: Conversation = {
        id: conversationId,
        title: conversationTitle || "Active Chat",
        modelId: modelName,
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = MemoryService.compressConversation({
        conversation: mockConv,
        modelName,
        config,
        triggerReason: "threshold_exceeded",
      });

      if (result.memoryItem) {
        wasCompressed = true;
        compressionEvent = result.event;
        onStatusChange?.("rebuilding_context");
      }
    }

    // 2. RELEVANCE & HISTORICAL MEMORY RECALL RETRIEVAL
    const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const queryText = latestUserMsg?.content || "";
    const activeContextText = messages.slice(-3).map((m) => m.content).join(" ");
    const intentInfo = detectRecallIntent(queryText);

    if (config.enabled && intentInfo.isRecallIntent) {
      onStatusChange?.("searching_memories");
    }

    const allMemories = MemoryService.getMemories();
    const retrievalResult: ContextRetrievalResult = config.enabled
      ? retrieveRelevantMemories({
          query: queryText,
          activeContextText,
          memories: allMemories,
          activeModel: modelName,
          conversationId,
          maxResults: config.maxRetrievedMemories || 5,
          maxTokenBudget: Math.min(config.maxMemoryContextBudget || 1800, Math.floor(numCtx * 0.3)),
          minRelevanceThreshold: config.minRelevanceThreshold ?? 0.35,
          getConversationById: (id: string) => Storage.getConversations().find((c) => c.id === id),
        })
      : {
          memories: [],
          citations: [],
          intentInfo,
          totalMemoryTokens: 0,
          formattedPromptContext: "",
          retrievalScores: {},
        };

    if (retrievalResult.memories.length > 0) {
      onStatusChange?.("relevant_memories_found");
      MemoryService.logAudit(
        "MEMORY_RETRIEVED",
        `Retrieved ${retrievalResult.memories.length} historical memories (${retrievalResult.totalMemoryTokens} tok) for query: "${queryText.slice(0, 60)}"`,
        retrievalResult.memories[0]?.id,
        conversationId,
        { count: retrievalResult.memories.length, intent: retrievalResult.intentInfo.intentType }
      );
    }

    // 3. INJECT RELEVANT MEMORIES INTO SYSTEM PROMPT USING INVERTED EPISTEMIC PATTERN
    let effectiveSystemPrompt = systemPrompt || "";
    if (retrievalResult.memories.length > 0) {
      onStatusChange?.("reconstructing_context");
      const invertedEpistemicBlock = generateInvertedEpistemicPrompt(
        retrievalResult.memories,
        retrievalResult.citations
      );
      if (effectiveSystemPrompt.trim()) {
        effectiveSystemPrompt = `${effectiveSystemPrompt.trim()}\n\n${invertedEpistemicBlock}`;
      } else {
        effectiveSystemPrompt = `You are a helpful, knowledgeable AI assistant.\n\n${invertedEpistemicBlock}`;
      }
    }

    // 4. PRUNE OLDER MESSAGES IF STILL NEEDED
    const pruneResult = pruneMessagesForContext(
      messages,
      effectiveSystemPrompt,
      numCtx,
      1024
    );

    const totalPromptTokens = pruneResult.estimatedPromptTokens;
    const tokensSaved = Math.max(0, originalPromptTokens - totalPromptTokens);
    const finalUsagePercent = Math.min(100, Math.round((totalPromptTokens / Math.max(1, numCtx)) * 100));

    return {
      prunedMessages: pruneResult.prunedMessages,
      effectiveSystemPrompt: effectiveSystemPrompt || undefined,
      retrievedMemories: retrievalResult.memories,
      citations: retrievalResult.citations,
      intentInfo: retrievalResult.intentInfo,
      wasCompressed,
      compressionEvent,
      totalPromptTokens,
      originalPromptTokens,
      tokensSaved,
      contextUsagePercent: finalUsagePercent,
    };
  },

  // -------------------------------------------------------------
  // BLOCK DIGESTS
  // -------------------------------------------------------------

  getBlockDigests(): ConversationBlockDigest[] {
    return Storage.getBlockDigests();
  },

  getBlockDigestsByConversation(conversationId: string): ConversationBlockDigest[] {
    return Storage.getBlockDigests().filter((b) => b.conversationId === conversationId);
  },

  saveBlockDigest(digest: ConversationBlockDigest): void {
    const list = Storage.getBlockDigests();
    const index = list.findIndex((b) => b.id === digest.id);
    let updated: ConversationBlockDigest[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = digest;
    } else {
      updated = [digest, ...list];
    }
    Storage.saveBlockDigests(updated);
  },

  // -------------------------------------------------------------
  // UNIFIED CONTEXT SEARCH TOOLS (+ MENU)
  // -------------------------------------------------------------

  searchMemories(query: string, options?: { folderId?: string; onlyPinned?: boolean; maxResults?: number }): UnifiedSearchResultItem[] {
    const memories = Storage.getMemories();
    return searchGlobalMemories(query, memories, options);
  },

  searchConversations(query: string, conversations: Conversation[], options?: { maxResults?: number; excludeConversationId?: string }): UnifiedSearchResultItem[] {
    return searchAllConversations(query, conversations, options);
  },

  searchActiveContext(query: string, activeConversation: Conversation | null, options?: { maxResults?: number }): UnifiedSearchResultItem[] {
    return searchActiveContext(query, activeConversation, options);
  },

  /**
   * Hierarchical Meta-Memory Aggregator: Combines multiple selected memories into a single stage-2 memory.
   */
  combineMemories(memoryIds: string[], folderId?: string): ContextMemoryItem | null {
    const list = Storage.getMemories();
    const matching = list.filter((m) => memoryIds.includes(m.id));
    if (matching.length < 2) return null;

    const meta = combineMemoriesIntoMetaMemory(matching, folderId);
    MemoryService.saveMemory(meta);
    MemoryService.logAudit("MEMORY_MERGED", `Hierarchically aggregated ${matching.length} memories into '${meta.title}'`, meta.id);
    return meta;
  },
};

import { ChatMessage } from "../types";

export type CompressionMode = "auto" | "heuristic" | "llm" | "hybrid";
export type MemoryImportance = "low" | "medium" | "high" | "critical";

export type RequirementType =
  | "user_requirement"
  | "user_instruction"
  | "technical_constraint"
  | "decision"
  | "config_value"
  | "unfinished_task"
  | "code_decision"
  | "error_solution"
  | "codename_or_entity";

export interface StructuredRequirement {
  id: string;
  type: RequirementType;
  content: string;
  importance: MemoryImportance;
  isAuthoritative: boolean; // True if this is current, false if superseded
  supersededBy?: string; // ID of the newer requirement/decision
  supersedes?: string; // ID of the older decision this replaces
  timestamp: number;
}

export interface RecallIntentInfo {
  isRecallIntent: boolean;
  isExplicitRecall: boolean;
  intentType: "explicit_recall" | "implicit_history" | "correction" | "general";
  detectedKeywords: string[];
  targetEntities: string[];
  cleanQuery: string;
}

export interface RetrievedMemoryCitation {
  memoryId: string;
  title: string;
  relevanceScore: number;
  conversationId?: string;
  conversationTitle?: string;
  compressionCycle?: number;
  sourceRange?: {
    startIndex: number;
    endIndex: number;
    messageCount: number;
  };
  hasSourceExcerpt: boolean;
  isPinned?: boolean;
  isAuthoritative?: boolean;
  supersededNotice?: string;
}

export interface ContextMemoryItem {
  id: string;
  conversationId?: string; // Associated conversation, or undefined if global/standalone
  conversationTitle?: string; // Cache of source chat title for quick citation
  title: string;
  summary: string;
  keyFacts: string[]; // Structured bullet facts / decisions / constraints / code snippets
  requirements?: StructuredRequirement[]; // High-integrity typed facts, requirements & decisions
  topics: string[]; // Topic tags used for semantic/lexical relevance retrieval
  entities?: Record<string, string>; // Key-value knowledge graph/fact mappings
  sourceMessageRange?: {
    startId: string;
    endId: string;
    startIndex: number;
    endIndex: number;
    messageCount: number;
    originalTokenEstimate: number;
  };
  sourceExcerpt?: string; // Short verbatim excerpt from key turning point messages
  compressedTokenEstimate: number;
  compressionRatio: number; // e.g. 0.72 = 72% tokens reduced
  createdAt: number;
  updatedAt: number;
  importance: MemoryImportance; // Priority level
  importanceScore: number; // 0.0 - 1.0 numerical ranking
  tags: string[];
  folderId?: string;
  color?: string; // Visual categorization accent color
  modelRestrictions?: string[]; // Empty = any model, or list of model IDs/names
  isPinned?: boolean; // Pinned memories are always retrieved when within budget
  isAuthoritative?: boolean; // True if this is the current active decision (vs historical superseded)
  stage: number; // 1 = direct turn compression, 2 = hierarchical meta-summary
  compressionCycle: number; // 1, 2, 3, 4, 5... tracks multi-cycle progression
  version: number; // Memory version number
  parentMemoryId?: string; // Links to parent meta-memory
  childMemoryIds?: string[]; // Links to sub-memories if aggregated
  supersedesId?: string; // If this memory supersedes an older decision
  supersededMemoryIds?: string[]; // List of older memory IDs superseded by this
  qualityScore?: number; // 0.0 to 1.0 internal quality metric
  validationPassed?: boolean; // Quality validation flag
  accessCount?: number;
  lastAccessedAt?: number;
}

export interface ContextMemoryFolder {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: number;
}

export type ContextToolType = "add_file" | "search_memories" | "search_conversations" | "search_context";

export type GlobalMemoryItem = ContextMemoryItem;

export interface RawConversationTurn {
  id: string;
  conversationId: string;
  turnIndex: number;
  userMessage: ChatMessage;
  assistantMessage?: ChatMessage;
  tokenEstimate: number;
  blockId?: string;
  timestamp: number;
}

export interface ConversationBlockDigest {
  id: string;
  conversationId: string;
  blockIndex: number;
  startTurnIndex: number;
  endTurnIndex: number;
  startMessageId: string;
  endMessageId: string;
  turnCount: number;
  originalTokens: number;
  compressedTokens: number;
  summary: string;
  keyFacts: string[];
  topics: string[];
  createdAt: number;
}

export interface ContextCompressionConfig {
  enabled: boolean;
  triggerThresholdPercent: number; // Default: 90%
  targetReductionPercent: number; // Default: 50%
  compressionMode: CompressionMode;
  preserveRecentTurns: number; // Default: 4 turns (user/assistant pairs)
  injectStrategy: "system_prompt" | "context_prefix";
  maxRetrievedMemories: number; // Default: 5
  minTokensToCompress: number; // Minimum conversation tokens before compression triggers (default 1200)
  autoCompressOnThreshold: boolean; // Automatically create memory when threshold hit
  logCompressionEvents: boolean;
  minRelevanceThreshold: number; // Relevance threshold for recall (default: 0.35)
  includeSourceExcerpts: boolean; // Include exact source message excerpts for high-relevance memories
  deduplicationThreshold: number; // Jaccard/cosine threshold for auto-merging duplicate memories (default: 0.75)
  maxMemoryContextBudget: number; // Max tokens for injected memory context (default: 1800)
}

export type MemoryAuditAction =
  | "MEMORY_CREATED"
  | "MEMORY_UPDATED"
  | "MEMORY_MERGED"
  | "MEMORY_SUPERSEDED"
  | "MEMORY_RETRIEVED"
  | "MEMORY_COMPRESSED"
  | "COMPRESSION_STARTED"
  | "COMPRESSION_COMPLETED"
  | "COMPRESSION_FAILED"
  | "STRESS_TEST_COMPLETED";

export interface MemoryAuditLogEntry {
  id: string;
  action: MemoryAuditAction;
  timestamp: number;
  memoryId?: string;
  conversationId?: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface ContextCompressionEvent {
  id: string;
  timestamp: number;
  conversationId: string;
  conversationTitle?: string;
  modelName: string;
  triggerReason: "threshold_exceeded" | "manual" | "preemptive";
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  percentageBefore: number;
  percentageAfter: number;
  memoryItemsCreated: number;
  memoryItemIds: string[];
  compressionCycle?: number;
  qualityScore?: number;
  durationMs: number;
}

export interface ContextRetrievalResult {
  memories: ContextMemoryItem[];
  citations: RetrievedMemoryCitation[];
  intentInfo: RecallIntentInfo;
  totalMemoryTokens: number;
  formattedPromptContext: string;
  retrievalScores: Record<string, number>;
}

export interface StressTestProbeResult {
  probeId: string;
  category: string;
  question: string;
  expectedKeyword: string;
  retrievedMemoryId?: string;
  retrievedSnippet?: string;
  relevanceScore: number;
  passed: boolean;
}

export interface StressTestResult {
  id: string;
  timestamp: number;
  totalCycles: number;
  initialTokens: number;
  finalActiveTokens: number;
  totalTokensProcessed: number;
  totalTokensSaved: number;
  compressionRatio: number;
  memoriesCreated: number;
  duplicatesMerged: number;
  probes: StressTestProbeResult[];
  allPassed: boolean;
  durationMs: number;
}

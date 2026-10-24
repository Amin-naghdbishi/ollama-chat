export type MessageRole = "system" | "user" | "assistant";

export type ProviderType = "ollama" | "openai" | "openrouter" | "custom";

export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  modelListing: boolean;
  modelDiscovery: boolean;
  modelDownload: boolean;
  modelDeletion: boolean;
  vision: boolean;
  thinking: boolean;
  embeddings?: boolean;
  customHeaders?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  apiKey?: string;
  organizationId?: string;
  isEnabled: boolean;
  isDefault?: boolean;
  connectionMode?: "proxy" | "direct";
  capabilities: ProviderCapabilities;
  status?: "connected" | "disconnected" | "testing" | "error";
  lastError?: string;
  lastChecked?: number;
  modelCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface UnifiedModel {
  id: string; // Unique composite identifier e.g. "ollama-default::qwen3:30b"
  rawId: string; // Model name on the provider e.g. "qwen3:30b"
  name: string; // Clean display name
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  parameterSize?: string;
  quantization?: string;
  sizeBytes?: number;
  family?: string;
  families?: string[];
  contextLength?: number;
  description?: string;
  modifiedAt?: string;
  digest?: string;
  isInstalled: boolean;
  isAvailable: boolean;
  supportsVision: boolean;
  supportsThinking: "supported" | "unsupported" | "unknown";
  canDelete?: boolean;
  canDownload?: boolean;
}

export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "cancelled" | "failed";

export interface ModelDownloadTask {
  id: string;
  modelName: string;
  providerId: string;
  providerName: string;
  status: DownloadStatus;
  progressPercent: number;
  completedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds?: number;
  statusMessage?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface DiscoverableModel {
  id: string;
  name: string;
  tag: string;
  providerType: ProviderType;
  providerId?: string;
  category: "chat" | "coding" | "reasoning" | "vision" | "lightweight" | "embedding";
  parameterSize: string;
  quantization?: string;
  sizeFormatted: string;
  sizeBytes: number;
  contextLength: number;
  description: string;
  popularTags?: string[];
  supportsVision: boolean;
  supportsThinking: boolean;
  featured?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // e.g. "image/png", "text/plain"
  dataUrl?: string; // Base64 data URL for display
  base64Data?: string; // Pure base64 string for Ollama vision API
  textContent?: string; // Text content for code/document files
  isImage: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  thinkingContent?: string; // Reasoning / Thinking content
  isThinkingOpen?: boolean;
  thinkingTimeMs?: number; // Duration of thinking phase
  modelUsed?: string; // Exact model ID used for this response
  attachments?: FileAttachment[];
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isInterrupted?: boolean; // True if generation was stopped by user
  thinkingWarning?: string; // Warning if model ignored Thinking OFF setting
  activityState?: AIActivityState; // Dynamic generation / loading activity state
  generationStats?: {
    evalCount?: number;
    promptEvalCount?: number;
    evalDurationMs?: number;
    totalDurationMs?: number;
    tokensPerSec?: number;
    thinkingTokens?: number;
    answerTokens?: number;
  };
}

export interface ChatFolder {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
  isCollapsed?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  folderId?: string;
  tags?: string[];
}

export interface OllamaModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number; // Bytes
  digest: string;
  details?: OllamaModelDetails;
  providerId?: string;
  providerName?: string;
  providerType?: ProviderType;
}

export interface OllamaModelShowInfo {
  modelfile?: string;
  parameters?: string;
  template?: string;
  details?: OllamaModelDetails;
  system?: string;
}

export interface OllamaChatOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  repeat_penalty?: number;
  stop?: string[];
  think?: boolean; // Thinking flag for reasoning models
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: MessageRole;
    content: string;
    images?: string[]; // Array of base64 strings
  }>;
  stream?: boolean;
  options?: OllamaChatOptions;
}

export interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message?: {
    role: MessageRole;
    content: string;
    thinking?: string; // Optional thinking property from Ollama API
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

export interface ModelProfileSettings {
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  numCtx?: number;
  enableThinking?: boolean;
  thinkingMode?: "auto" | "on" | "off";
  seed?: number;
  numPredict?: number;
  repeatPenalty?: number;
}

export type AIActivityPhase =
  | "idle"
  | "compressing_context"
  | "organizing_context"
  | "preserving_info"
  | "creating_memory"
  | "updating_memory"
  | "rebuilding_context"
  | "reconstructing_context"
  | "searching_memories"
  | "recalling"
  | "looking_through_memories"
  | "finding_memories"
  | "retrieving_memories"
  | "checking_past_conversations"
  | "looking_back"
  | "searching_previous_conversations"
  | "memory_found"
  | "relevant_memories_found"
  | "context_restored"
  | "reading_file"
  | "analyzing_file"
  | "inspecting_document"
  | "processing_file"
  | "reviewing_contents"
  | "analyzing_image"
  | "analyzing_code"
  | "writing_code"
  | "reviewing_code"
  | "checking_implementation"
  | "debugging"
  | "planning_implementation"
  | "thinking"
  | "reasoning"
  | "analyzing"
  | "planning"
  | "working_through"
  | "forming_answer"
  | "working"
  | "generating"
  | "processing"
  | "preparing"
  | "working_on_it"
  | "almost_there"
  | "checking"
  | "reviewing";

export interface AIActivityState {
  phase: AIActivityPhase;
  customText?: string;
  detail?: string;
  itemCount?: number;
  timestamp: number;
}

export interface LiveGenerationMetrics {
  modelName?: string;
  parameterSize?: string;
  quantization?: string;
  contextWindow?: number;
  promptTokens?: number;
  generatedTokens?: number;
  thinkingTokens?: number;
  tokensPerSec?: number;
  elapsedMs?: number;
  isGenerating: boolean;
  activityState?: AIActivityState;
}

export interface AppSettings {
  endpoint: string; // e.g., "http://127.0.0.1:11434"
  connectionMode: "proxy" | "direct"; // Proxy via backend vs direct fetch
  enableGlobalSystemPrompt: boolean;
  globalSystemPrompt: string;
  modelSystemPrompts: Record<string, string>;
  temperature: number;
  topP: number;
  numCtx: number; // Context window size, default 4096 or 8192
  enableThinking: boolean; // Thinking / Reasoning toggle (legacy)
  thinkingMode: "auto" | "on" | "off"; // Comprehensive Thinking mode control
  autoScroll: boolean;
  enterToSend: boolean;
  theme: string;
  language: "en" | "fa";
  defaultSystemPrompt?: string; // Legacy field for migration
}

export interface ModelCapabilityInfo {
  modelName: string;
  family: string;
  parameterSize: string;
  quantization: string;
  contextLength: string | number;
  supportsVision: boolean;
  supportsThinking: "supported" | "unsupported" | "unknown";
  templateSnippet?: string;
  renderer?: string;
}

export interface ModelTestResult {
  basicChat: { passed: boolean; durationMs?: number; error?: string };
  streaming: { passed: boolean; durationMs?: number; error?: string };
  thinkingOn?: { passed: boolean; producedThinking?: boolean; error?: string };
  thinkingOff?: { passed: boolean; respectsOff?: boolean; error?: string };
  vision?: { passed: boolean; error?: string };
  isTesting: boolean;
  timestamp?: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  endpoint: string;
  version?: string;
  lastChecked: number;
  error?: string;
  isChecking: boolean;
}

export * from "./types/memory";

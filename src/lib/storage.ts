import {
  AppSettings,
  Conversation,
  ChatFolder,
  AIProvider,
  ModelDownloadTask,
  ContextMemoryItem,
  ContextMemoryFolder,
  ContextCompressionConfig,
  ContextCompressionEvent,
  MemoryAuditLogEntry,
  StressTestResult,
} from "../types";
import { CustomTheme, ThemeEngine } from "./themeEngine";
import { DEFAULT_COMPRESSION_CONFIG } from "./contextCompressor";

const STORAGE_KEYS = {
  CONVERSATIONS: "ollama_chat_conversations",
  ACTIVE_ID: "ollama_chat_active_id",
  SETTINGS: "ollama_chat_settings",
  SELECTED_MODEL: "ollama_chat_selected_model",
  SELECTED_IMAGE_MODEL: "ollama_chat_selected_image_model",
  COMFY_ENDPOINT: "ollama_chat_comfy_endpoint",
  MODEL_PROFILES: "ollama_chat_model_profiles",
  FAVORITE_MODELS: "ollama_chat_favorite_models",
  FOLDERS: "ollama_chat_folders",
  CUSTOM_THEMES: "ollama_chat_custom_themes_list",
  PROVIDERS: "ollama_chat_providers_list",
  DOWNLOADS: "ollama_chat_downloads_list",
  DRAFTS: "ollama_chat_drafts",
  MEMORIES: "ollama_chat_memories",
  MEMORY_FOLDERS: "ollama_chat_memory_folders",
  COMPRESSION_CONFIG: "ollama_chat_compression_config",
  COMPRESSION_EVENTS: "ollama_chat_compression_events",
  MEMORY_AUDIT_LOGS: "ollama_chat_memory_audit_logs",
  STRESS_TEST_RESULTS: "ollama_chat_stress_test_results",
  BLOCK_DIGESTS: "ollama_chat_block_digests",
};

export const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: "ollama-default",
    name: "Ollama (Local)",
    type: "ollama",
    endpoint: "http://127.0.0.1:11434",
    isEnabled: true,
    isDefault: true,
    connectionMode: "proxy",
    capabilities: {
      chat: true,
      streaming: true,
      modelListing: true,
      modelDiscovery: true,
      modelDownload: true,
      modelDeletion: true,
      vision: true,
      thinking: true,
      embeddings: true,
    },
    status: "connected",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "openrouter-default",
    name: "OpenRouter",
    type: "openrouter",
    endpoint: "https://openrouter.ai/api/v1",
    apiKey: "",
    isEnabled: false,
    isDefault: false,
    connectionMode: "proxy",
    capabilities: {
      chat: true,
      streaming: true,
      modelListing: true,
      modelDiscovery: true,
      modelDownload: false,
      modelDeletion: false,
      vision: true,
      thinking: true,
      embeddings: true,
    },
    status: "disconnected",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "local-server-default",
    name: "Local OpenAI-Compatible Server",
    type: "openai",
    endpoint: "http://127.0.0.1:8000/v1",
    apiKey: "",
    isEnabled: false,
    isDefault: false,
    connectionMode: "proxy",
    capabilities: {
      chat: true,
      streaming: true,
      modelListing: true,
      modelDiscovery: false,
      modelDownload: false,
      modelDeletion: false,
      vision: true,
      thinking: true,
      embeddings: true,
    },
    status: "disconnected",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  endpoint: "http://127.0.0.1:11434",
  connectionMode: "proxy",
  enableGlobalSystemPrompt: false,
  globalSystemPrompt: "",
  modelSystemPrompts: {},
  temperature: 0.7,
  topP: 0.9,
  numCtx: 4096,
  enableThinking: true,
  thinkingMode: "auto",
  autoScroll: true,
  enterToSend: true,
  theme: "dark",
  language: "en",
  comfyUiEndpoint: "http://127.0.0.1:8188",
  selectedImageModel: null,
};

export const Storage = {
  getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);
      // Migrate old defaultSystemPrompt if necessary without auto-enabling
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      if (!merged.modelSystemPrompts) merged.modelSystemPrompts = {};
      if (!merged.thinkingMode) {
        merged.thinkingMode = merged.enableThinking ? "on" : "auto";
      }
      return merged;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  },

  getConversations(): Conversation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.error("Failed to save conversations to localStorage:", e);
    }
  },

  getActiveConversationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
    } catch {
      return null;
    }
  },

  saveActiveConversationId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
      }
    } catch (e) {
      console.error("Failed to save active conversation id:", e);
    }
  },

  getSelectedModel(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
    } catch {
      return null;
    }
  },

  saveSelectedModel(modelName: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelName);
    } catch (e) {
      console.error("Failed to save selected model:", e);
    }
  },

  getSelectedImageModel(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_IMAGE_MODEL);
    } catch {
      return null;
    }
  },

  saveSelectedImageModel(modelName: string | null): void {
    try {
      if (modelName) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_IMAGE_MODEL, modelName);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_IMAGE_MODEL);
      }
    } catch (e) {
      console.error("Failed to save selected image model:", e);
    }
  },

  getModelProfile(modelName: string): any | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MODEL_PROFILES);
      if (!raw) return null;
      const profiles = JSON.parse(raw);
      return profiles[modelName] || null;
    } catch {
      return null;
    }
  },

  saveModelProfile(modelName: string, profile: any): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MODEL_PROFILES);
      const profiles = raw ? JSON.parse(raw) : {};
      profiles[modelName] = profile;
      localStorage.setItem(STORAGE_KEYS.MODEL_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error("Failed to save model profile:", e);
    }
  },

  getFavoriteModels(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_MODELS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveFavoriteModels(models: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITE_MODELS, JSON.stringify(models));
    } catch (e) {
      console.error("Failed to save favorite models:", e);
    }
  },

  getFolders(): ChatFolder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveFolders(folders: ChatFolder[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error("Failed to save folders:", e);
    }
  },

  getCustomThemes(): CustomTheme[] {
    return ThemeEngine.getCustomThemes();
  },

  saveCustomTheme(theme: CustomTheme): void {
    ThemeEngine.saveCustomTheme(theme);
  },

  deleteCustomTheme(id: string): void {
    ThemeEngine.deleteCustomTheme(id);
  },

  getProviders(): AIProvider[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROVIDERS);
      if (!raw) {
        // Initialize with default providers and sync Ollama endpoint with settings
        const settings = Storage.getSettings();
        const initial = DEFAULT_PROVIDERS.map((p) =>
          p.id === "ollama-default" ? { ...p, endpoint: settings.endpoint || "http://127.0.0.1:11434" } : p
        );
        Storage.saveProviders(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROVIDERS;
      return parsed;
    } catch {
      return DEFAULT_PROVIDERS;
    }
  },

  saveProviders(providers: AIProvider[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
    } catch (e) {
      console.error("Failed to save providers to localStorage:", e);
    }
  },

  getDownloads(): ModelDownloadTask[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveDownloads(downloads: ModelDownloadTask[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
    } catch (e) {
      console.error("Failed to save downloads to localStorage:", e);
    }
  },

  getDrafts(): Record<string, string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  },

  saveDrafts(drafts: Record<string, string>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
    } catch (e) {
      console.error("Failed to save drafts to localStorage:", e);
    }
  },

  getDraft(conversationId: string | null): string {
    const key = conversationId || "new";
    const drafts = Storage.getDrafts();
    return drafts[key] || "";
  },

  saveDraft(conversationId: string | null, text: string): void {
    const key = conversationId || "new";
    const drafts = Storage.getDrafts();
    if (text && text.trim()) {
      drafts[key] = text;
    } else {
      delete drafts[key];
    }
    Storage.saveDrafts(drafts);
  },

  deleteDraft(conversationId: string | null): void {
    const key = conversationId || "new";
    const drafts = Storage.getDrafts();
    if (key in drafts) {
      delete drafts[key];
      Storage.saveDrafts(drafts);
    }
  },

  // -------------------------------------------------------------
  // CONTEXT MEMORIES & COMPRESSION STORAGE
  // -------------------------------------------------------------

  getMemories(): ContextMemoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MEMORIES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveMemories(memories: ContextMemoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
    } catch (e) {
      console.error("Failed to save memories to localStorage:", e);
    }
  },

  getMemoryFolders(): ContextMemoryFolder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MEMORY_FOLDERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveMemoryFolders(folders: ContextMemoryFolder[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMORY_FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error("Failed to save memory folders to localStorage:", e);
    }
  },

  getCompressionConfig(): ContextCompressionConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPRESSION_CONFIG);
      if (!raw) return DEFAULT_COMPRESSION_CONFIG;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_COMPRESSION_CONFIG, ...parsed };
    } catch {
      return DEFAULT_COMPRESSION_CONFIG;
    }
  },

  saveCompressionConfig(config: ContextCompressionConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPRESSION_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save compression config to localStorage:", e);
    }
  },

  getCompressionEvents(): ContextCompressionEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPRESSION_EVENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveCompressionEvents(events: ContextCompressionEvent[]): void {
    try {
      // Keep last 100 events
      const trimmed = events.slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.COMPRESSION_EVENTS, JSON.stringify(trimmed));
    } catch (e) {
      console.error("Failed to save compression events to localStorage:", e);
    }
  },

  getAuditLogs(): MemoryAuditLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MEMORY_AUDIT_LOGS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveAuditLogs(logs: MemoryAuditLogEntry[]): void {
    try {
      // Keep last 250 audit log entries
      const trimmed = logs.slice(0, 250);
      localStorage.setItem(STORAGE_KEYS.MEMORY_AUDIT_LOGS, JSON.stringify(trimmed));
    } catch (e) {
      console.error("Failed to save memory audit logs to localStorage:", e);
    }
  },

  getStressTestResults(): StressTestResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STRESS_TEST_RESULTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveStressTestResults(results: StressTestResult[]): void {
    try {
      const trimmed = results.slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.STRESS_TEST_RESULTS, JSON.stringify(trimmed));
    } catch (e) {
      console.error("Failed to save stress test results to localStorage:", e);
    }
  },

  getBlockDigests(): import("../types").ConversationBlockDigest[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BLOCK_DIGESTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveBlockDigests(digests: import("../types").ConversationBlockDigest[]): void {
    try {
      const trimmed = digests.slice(0, 200);
      localStorage.setItem(STORAGE_KEYS.BLOCK_DIGESTS, JSON.stringify(trimmed));
    } catch (e) {
      console.error("Failed to save block digests to localStorage:", e);
    }
  },
};

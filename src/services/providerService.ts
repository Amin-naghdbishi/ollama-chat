import {
  AIProvider,
  AppSettings,
  ChatMessage,
  ConnectionStatus,
  DiscoverableModel,
  DownloadStatus,
  ModelDownloadTask,
  OllamaModel,
  UnifiedModel,
} from "../types";
import { Storage } from "../lib/storage";
import { OllamaApi, detectModelCapabilities } from "./ollamaApi";
import { OpenAiApi } from "./openaiApi";
import { FALLBACK_DEMO_MODELS } from "../lib/constants";

// In-memory active pull abort controllers
const activeDownloadControllers = new Map<string, AbortController>();
type DownloadListener = (tasks: ModelDownloadTask[]) => void;
const downloadListeners = new Set<DownloadListener>();

export const CURATED_DISCOVERABLE_MODELS: DiscoverableModel[] = [
  {
    id: "qwen2.5",
    name: "Qwen 2.5",
    tag: "qwen2.5:7b",
    providerType: "ollama",
    category: "chat",
    parameterSize: "7B - 72B",
    quantization: "Q4_K_M",
    sizeFormatted: "4.7 GB",
    sizeBytes: 4700000000,
    contextLength: 131072,
    description: "Alibaba's cutting-edge open weights model with exceptional multilingual, reasoning, and coding capabilities.",
    popularTags: ["qwen2.5:3b", "qwen2.5:7b", "qwen2.5:14b", "qwen2.5:32b", "qwen2.5:72b"],
    supportsVision: false,
    supportsThinking: false,
    featured: true,
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    tag: "deepseek-r1:14b",
    providerType: "ollama",
    category: "reasoning",
    parameterSize: "1.5B - 70B",
    quantization: "Q4_K_M",
    sizeFormatted: "9.0 GB",
    sizeBytes: 9000000000,
    contextLength: 65536,
    description: "Premier open reasoning model with transparent chain-of-thought, rivaling proprietary reasoning architectures in math, code, and logic.",
    popularTags: ["deepseek-r1:1.5b", "deepseek-r1:7b", "deepseek-r1:8b", "deepseek-r1:14b", "deepseek-r1:32b", "deepseek-r1:70b"],
    supportsVision: false,
    supportsThinking: true,
    featured: true,
  },
  {
    id: "llama3.3",
    name: "Llama 3.3",
    tag: "llama3.3:70b",
    providerType: "ollama",
    category: "chat",
    parameterSize: "70B",
    quantization: "Q4_K_M",
    sizeFormatted: "42.5 GB",
    sizeBytes: 42500000000,
    contextLength: 131072,
    description: "Meta's flagship 70B model providing enterprise-grade performance matched with robust instruction adherence.",
    popularTags: ["llama3.3:70b", "llama3.2:1b", "llama3.2:3b", "llama3.1:8b"],
    supportsVision: false,
    supportsThinking: false,
    featured: true,
  },
  {
    id: "qwen2.5-coder",
    name: "Qwen 2.5 Coder",
    tag: "qwen2.5-coder:7b",
    providerType: "ollama",
    category: "coding",
    parameterSize: "1.5B - 32B",
    quantization: "Q4_K_M",
    sizeFormatted: "4.7 GB",
    sizeBytes: 4700000000,
    contextLength: 131072,
    description: "Specialized for full-stack programming, multi-file code editing, repository comprehension, and debugging across 90+ languages.",
    popularTags: ["qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5-coder:32b"],
    supportsVision: false,
    supportsThinking: false,
    featured: true,
  },
  {
    id: "gemma3",
    name: "Gemma 3",
    tag: "gemma3:4b",
    providerType: "ollama",
    category: "vision",
    parameterSize: "1B - 27B",
    quantization: "Q4_K_M",
    sizeFormatted: "3.2 GB",
    sizeBytes: 3200000000,
    contextLength: 131072,
    description: "Google's lightweight multimodal model capable of high-fidelity visual understanding, spatial reasoning, and conversational nuance.",
    popularTags: ["gemma3:1b", "gemma3:4b", "gemma3:12b", "gemma3:27b"],
    supportsVision: true,
    supportsThinking: false,
    featured: true,
  },
  {
    id: "mistral",
    name: "Mistral & Nemo",
    tag: "mistral:7b",
    providerType: "ollama",
    category: "chat",
    parameterSize: "7B - 12B",
    quantization: "Q4_0",
    sizeFormatted: "4.1 GB",
    sizeBytes: 4100000000,
    contextLength: 32768,
    description: "Fast, versatile French AI model offering sharp response brevity, strong multilingual support, and function calling.",
    popularTags: ["mistral:7b", "mistral-nemo:12b", "mistral-small:24b"],
    supportsVision: false,
    supportsThinking: false,
  },
  {
    id: "phi4",
    name: "Microsoft Phi-4",
    tag: "phi4:14b",
    providerType: "ollama",
    category: "reasoning",
    parameterSize: "14B",
    quantization: "Q4_K_M",
    sizeFormatted: "9.1 GB",
    sizeBytes: 9100000000,
    contextLength: 16384,
    description: "Microsoft's synthetic-data trained reasoning powerhouse, punching far above its parameter weight in scientific & math tasks.",
    popularTags: ["phi4:14b", "phi3.5:3.8b"],
    supportsVision: false,
    supportsThinking: false,
  },
  {
    id: "llava",
    name: "LLaVA Visual Assistant",
    tag: "llava:7b",
    providerType: "ollama",
    category: "vision",
    parameterSize: "7B - 13B",
    quantization: "Q4_0",
    sizeFormatted: "4.7 GB",
    sizeBytes: 4700000000,
    contextLength: 4096,
    description: "End-to-end multimodal assistant trained on visual instruction following. Read charts, images, and documents.",
    popularTags: ["llava:7b", "llava:13b", "llava-llama3:8b", "bakllava:7b"],
    supportsVision: true,
    supportsThinking: false,
  },
  {
    id: "smollm2",
    name: "SmolLM 2",
    tag: "smollm2:1.7b",
    providerType: "ollama",
    category: "lightweight",
    parameterSize: "135M - 1.7B",
    quantization: "Q4_K_M",
    sizeFormatted: "1.0 GB",
    sizeBytes: 1000000000,
    contextLength: 8192,
    description: "Ultra-compact model from Hugging Face designed for resource-constrained edge hardware and instant local startup.",
    popularTags: ["smollm2:135m", "smollm2:360m", "smollm2:1.7b"],
    supportsVision: false,
    supportsThinking: false,
  },
  {
    id: "nomic-embed",
    name: "Nomic Embed Text",
    tag: "nomic-embed-text:latest",
    providerType: "ollama",
    category: "embedding",
    parameterSize: "137M",
    quantization: "F16",
    sizeFormatted: "274 MB",
    sizeBytes: 274000000,
    contextLength: 8192,
    description: "High-performance embedding model with 8192 context length for semantic search and retrieval-augmented generation.",
    popularTags: ["nomic-embed-text:latest", "mxbai-embed-large:latest"],
    supportsVision: false,
    supportsThinking: false,
  },
];

export const ProviderService = {
  /**
   * Get all configured providers from storage
   */
  getProviders(): AIProvider[] {
    return Storage.getProviders();
  },

  /**
   * Save configured providers to storage
   */
  saveProviders(providers: AIProvider[]): void {
    Storage.saveProviders(providers);
  },

  /**
   * Find a specific provider by ID
   */
  getProviderById(id: string): AIProvider | undefined {
    const providers = Storage.getProviders();
    return providers.find((p) => p.id === id);
  },

  /**
   * Add a new provider
   */
  addProvider(provider: Omit<AIProvider, "id" | "createdAt" | "updatedAt">): AIProvider {
    const providers = Storage.getProviders();
    const newProvider: AIProvider = {
      ...provider,
      id: `provider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...providers, newProvider];
    Storage.saveProviders(updated);
    return newProvider;
  },

  /**
   * Update an existing provider
   */
  updateProvider(id: string, updates: Partial<AIProvider>): AIProvider | null {
    const providers = Storage.getProviders();
    const index = providers.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updatedProvider: AIProvider = {
      ...providers[index],
      ...updates,
      updatedAt: Date.now(),
    };

    providers[index] = updatedProvider;
    Storage.saveProviders(providers);
    return updatedProvider;
  },

  /**
   * Delete a provider (prevent deleting default Ollama provider)
   */
  deleteProvider(id: string): boolean {
    const providers = Storage.getProviders();
    const target = providers.find((p) => p.id === id);
    if (!target || target.isDefault) {
      return false;
    }
    const filtered = providers.filter((p) => p.id !== id);
    Storage.saveProviders(filtered);
    return true;
  },

  /**
   * Test connection to a provider
   */
  async testConnection(provider: AIProvider, settings: AppSettings): Promise<ConnectionStatus> {
    if (provider.type === "ollama") {
      const customSettings: AppSettings = {
        ...settings,
        endpoint: provider.endpoint,
        connectionMode: provider.connectionMode || settings.connectionMode,
      };
      return await OllamaApi.checkHealth(customSettings);
    } else {
      return await OpenAiApi.checkHealth(provider, settings);
    }
  },

  /**
   * Fetch models for a single provider
   */
  async fetchModelsForProvider(provider: AIProvider, settings: AppSettings): Promise<UnifiedModel[]> {
    if (!provider.isEnabled) {
      return [];
    }

    try {
      if (provider.type === "ollama") {
        const customSettings: AppSettings = {
          ...settings,
          endpoint: provider.endpoint,
          connectionMode: provider.connectionMode || settings.connectionMode,
        };
        const rawOllamaModels = await OllamaApi.fetchModels(customSettings);
        return rawOllamaModels.map((m) => {
          const caps = detectModelCapabilities(m.name, null, m);
          return {
            id: `${provider.id}::${m.name}`,
            rawId: m.name,
            name: m.name,
            providerId: provider.id,
            providerName: provider.name,
            providerType: provider.type,
            parameterSize: m.details?.parameter_size || caps.parameterSize,
            quantization: m.details?.quantization_level || caps.quantization,
            sizeBytes: m.size,
            family: m.details?.family || caps.family,
            families: m.details?.families,
            contextLength: typeof caps.contextLength === "number" ? caps.contextLength : 4096,
            modifiedAt: m.modified_at,
            digest: m.digest,
            isInstalled: true,
            isAvailable: true,
            supportsVision: caps.supportsVision,
            supportsThinking: caps.supportsThinking,
            canDelete: true,
            canDownload: true,
          };
        });
      } else {
        return await OpenAiApi.fetchModels(provider, settings);
      }
    } catch (err: any) {
      console.warn(`Could not load models for provider ${provider.name}:`, err.message);
      return [];
    }
  },

  /**
   * Fetch all unified models from all enabled providers
   */
  async fetchAllModels(settings: AppSettings): Promise<UnifiedModel[]> {
    const providers = Storage.getProviders();
    const enabledProviders = providers.filter((p) => p.isEnabled);

    if (enabledProviders.length === 0) {
      return FALLBACK_DEMO_MODELS.map((m) => ({
        id: `ollama-default::${m.name}`,
        rawId: m.name,
        name: m.name,
        providerId: "ollama-default",
        providerName: "Ollama (Local)",
        providerType: "ollama",
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
        sizeBytes: m.size,
        family: m.details?.family,
        isInstalled: true,
        isAvailable: true,
        supportsVision: false,
        supportsThinking: "unknown",
        canDelete: true,
        canDownload: true,
      }));
    }

    const promises = enabledProviders.map(async (provider) => {
      try {
        const models = await ProviderService.fetchModelsForProvider(provider, settings);
        // Update model count in provider object
        ProviderService.updateProvider(provider.id, {
          modelCount: models.length,
          status: "connected",
          lastChecked: Date.now(),
        });
        return models;
      } catch (err: any) {
        ProviderService.updateProvider(provider.id, {
          status: "error",
          lastError: err.message,
          lastChecked: Date.now(),
        });
        return [];
      }
    });

    const results = await Promise.all(promises);
    const flattened = results.flat();

    if (flattened.length === 0) {
      // Return fallback demo models under default provider if nothing returned
      return FALLBACK_DEMO_MODELS.map((m) => ({
        id: `ollama-default::${m.name}`,
        rawId: m.name,
        name: m.name,
        providerId: "ollama-default",
        providerName: "Ollama (Local)",
        providerType: "ollama",
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
        sizeBytes: m.size,
        family: m.details?.family,
        isInstalled: true,
        isAvailable: true,
        supportsVision: false,
        supportsThinking: "unknown",
        canDelete: true,
        canDownload: true,
      }));
    }

    return flattened;
  },

  /**
   * Delete a model from a provider (e.g. Ollama /api/delete)
   */
  async deleteModel(
    model: UnifiedModel,
    settings: AppSettings
  ): Promise<{ success: boolean; error?: string }> {
    const provider = ProviderService.getProviderById(model.providerId);
    if (!provider || !provider.capabilities.modelDeletion) {
      return { success: false, error: "This provider does not support model deletion." };
    }

    if (provider.type === "ollama") {
      let cleanEndpoint = (provider.endpoint || settings.endpoint).replace(/\/$/, "");
      if (cleanEndpoint.includes("localhost")) {
        cleanEndpoint = cleanEndpoint.replace("://localhost", "://127.0.0.1");
      }

      const isProxy = (provider.connectionMode || settings.connectionMode) === "proxy";
      const url = isProxy ? "/api/ollama/delete" : `${cleanEndpoint}/api/delete`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (isProxy) {
        headers["X-Ollama-Endpoint"] = cleanEndpoint;
      }

      try {
        const res = await fetch(url, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ name: model.rawId }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            error: errData.error || `HTTP ${res.status} error while deleting model`,
          };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to communicate with Ollama" };
      }
    }

    return { success: false, error: "Model deletion not implemented for this provider type." };
  },

  // -------------------------------------------------------------
  // MODEL DOWNLOAD / PULL SYSTEM
  // -------------------------------------------------------------

  getDownloads(): ModelDownloadTask[] {
    return Storage.getDownloads();
  },

  subscribeDownloads(listener: DownloadListener): () => void {
    downloadListeners.add(listener);
    return () => downloadListeners.delete(listener);
  },

  notifyDownloadListeners(): void {
    const tasks = Storage.getDownloads();
    downloadListeners.forEach((fn) => fn(tasks));
  },

  cancelDownload(taskId: string): void {
    const controller = activeDownloadControllers.get(taskId);
    if (controller) {
      controller.abort();
      activeDownloadControllers.delete(taskId);
    }

    const tasks = Storage.getDownloads().map((t) =>
      t.id === taskId ? { ...t, status: "cancelled" as const, statusMessage: "Download cancelled by user" } : t
    );
    Storage.saveDownloads(tasks);
    ProviderService.notifyDownloadListeners();
  },

  /**
   * Start a real model pull via Ollama /api/pull NDJSON stream
   */
  async startModelDownload(
    modelName: string,
    providerId: string,
    settings: AppSettings,
    onComplete?: () => void
  ): Promise<ModelDownloadTask> {
    const provider = ProviderService.getProviderById(providerId) || {
      id: "ollama-default",
      name: "Ollama (Local)",
      type: "ollama" as const,
      endpoint: settings.endpoint,
      isEnabled: true,
      capabilities: { chat: true, streaming: true, modelListing: true, modelDiscovery: true, modelDownload: true, modelDeletion: true, vision: true, thinking: true },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const taskId = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const task: ModelDownloadTask = {
      id: taskId,
      modelName,
      providerId: provider.id,
      providerName: provider.name,
      status: "downloading",
      progressPercent: 0,
      completedBytes: 0,
      totalBytes: 0,
      speedBytesPerSec: 0,
      statusMessage: "Connecting to provider...",
      startedAt: Date.now(),
    };

    const existing = Storage.getDownloads();
    Storage.saveDownloads([task, ...existing]);
    ProviderService.notifyDownloadListeners();

    const controller = new AbortController();
    activeDownloadControllers.set(taskId, controller);

    // Run async in background
    (async () => {
      let cleanEndpoint = (provider.endpoint || settings.endpoint).replace(/\/$/, "");
      if (cleanEndpoint.includes("localhost")) {
        cleanEndpoint = cleanEndpoint.replace("://localhost", "://127.0.0.1");
      }

      const isProxy = (provider.connectionMode || settings.connectionMode) === "proxy";
      const url = isProxy ? "/api/ollama/pull" : `${cleanEndpoint}/api/pull`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isProxy) {
        headers["X-Ollama-Endpoint"] = cleanEndpoint;
      }

      let lastBytes = 0;
      let lastTime = Date.now();

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: modelName, stream: true }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`Ollama returned status ${response.status}: ${errText}`);
        }

        if (!response.body) {
          throw new Error("Empty response stream received from Ollama.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const chunk = JSON.parse(trimmed);
              if (chunk.error) {
                throw new Error(chunk.error);
              }

              const statusMsg = chunk.status || "Downloading...";
              const completed = chunk.completed || 0;
              const total = chunk.total || 0;

              let percent = 0;
              if (total > 0) {
                percent = Math.min(100, Math.round((completed / total) * 100));
              }

              // Speed & ETA calculation
              const now = Date.now();
              const timeDeltaSec = (now - lastTime) / 1000;
              let speed = 0;
              let eta: number | undefined;

              if (timeDeltaSec >= 1 && completed > lastBytes) {
                speed = Math.round((completed - lastBytes) / timeDeltaSec);
                lastBytes = completed;
                lastTime = now;
                if (speed > 0 && total > completed) {
                  eta = Math.round((total - completed) / speed);
                }
              }

              // Update storage & notify
              const currentList = Storage.getDownloads().map((t) => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  status: (chunk.status === "success" ? "completed" : "downloading") as DownloadStatus,
                  statusMessage: statusMsg,
                  progressPercent: chunk.status === "success" ? 100 : percent || t.progressPercent,
                  completedBytes: completed || t.completedBytes,
                  totalBytes: total || t.totalBytes,
                  speedBytesPerSec: speed || t.speedBytesPerSec,
                  etaSeconds: eta !== undefined ? eta : t.etaSeconds,
                };
              });
              Storage.saveDownloads(currentList);
              ProviderService.notifyDownloadListeners();
            } catch {
              // Ignore single JSON parse error
            }
          }
        }

        // Finalize completed task
        const finalized = Storage.getDownloads().map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            status: "completed" as const,
            statusMessage: "Installed successfully",
            progressPercent: 100,
            completedAt: Date.now(),
          };
        });
        Storage.saveDownloads(finalized);
        ProviderService.notifyDownloadListeners();
        activeDownloadControllers.delete(taskId);
        onComplete?.();
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Handled in cancelDownload
          return;
        }
        const errorList = Storage.getDownloads().map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            status: "failed" as const,
            statusMessage: "Download failed",
            error: err.message || "Network error",
            completedAt: Date.now(),
          };
        });
        Storage.saveDownloads(errorList);
        ProviderService.notifyDownloadListeners();
        activeDownloadControllers.delete(taskId);
      }
    })();

    return task;
  },

  // -------------------------------------------------------------
  // UNIFIED STREAMING CHAT DISPATCHER
  // -------------------------------------------------------------

  /**
   * Dispatches chat stream request to the appropriate provider client
   */
  async sendChatStream({
    settings,
    modelId,
    messages,
    systemPrompt,
    signal,
    onChunk,
    onDebugInfo,
    onStats,
    onThinkingWarning,
  }: {
    settings: AppSettings;
    modelId: string; // Either "providerId::rawModelName" or raw "modelName"
    messages: ChatMessage[];
    systemPrompt?: string;
    signal?: AbortSignal;
    onChunk: (chunkText: string, thinkingText?: string) => void;
    onDebugInfo?: (debug: any) => void;
    onStats?: (stats: any) => void;
    onThinkingWarning?: (warning: string) => void;
  }): Promise<void> {
    let providerId = "ollama-default";
    let rawModelName = modelId;

    if (modelId.includes("::")) {
      const [pId, ...rest] = modelId.split("::");
      providerId = pId;
      rawModelName = rest.join("::");
    }

    const provider = ProviderService.getProviderById(providerId) || {
      id: "ollama-default",
      name: "Ollama (Local)",
      type: "ollama" as const,
      endpoint: settings.endpoint,
      isEnabled: true,
      capabilities: { chat: true, streaming: true, modelListing: true, modelDiscovery: true, modelDownload: true, modelDeletion: true, vision: true, thinking: true },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (provider.type === "ollama") {
      const customSettings: AppSettings = {
        ...settings,
        endpoint: provider.endpoint,
        connectionMode: provider.connectionMode || settings.connectionMode,
      };
      return await OllamaApi.sendChatStream({
        settings: customSettings,
        model: rawModelName,
        messages,
        systemPrompt,
        signal,
        onChunk,
        onDebugInfo,
        onStats,
        onThinkingWarning,
      });
    } else {
      return await OpenAiApi.sendChatStream({
        provider,
        settings,
        model: rawModelName,
        messages,
        systemPrompt,
        signal,
        onChunk,
        onDebugInfo,
        onStats,
      });
    }
  },
};

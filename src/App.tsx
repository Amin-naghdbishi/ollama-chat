import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AppSettings,
  ChatMessage,
  ConnectionStatus,
  Conversation,
  ChatFolder,
  FileAttachment,
  OllamaModel,
  LiveGenerationMetrics,
  ModelProfileSettings,
  ImageModelProfile,
  AIActivityState,
  AIActivityPhase,
  ServicesStatusResponse,
} from "./types";
import { Storage, DEFAULT_SETTINGS } from "./lib/storage";
import { OllamaApi, detectModelCapabilities } from "./services/ollamaApi";
import { ProviderService } from "./services/providerService";
import { ComfyApi } from "./services/comfyApi";
import { detectImageIntent, synthesizeImagePrompt } from "./services/imagePromptService";
import {
  resolveImageParameters,
  getDefaultImageModelProfile,
} from "./services/imageSettingsService";
import { FALLBACK_DEMO_MODELS } from "./lib/constants";
import { pruneMessagesForContext } from "./lib/contextUtils";
import { ThemeEngine } from "./lib/themeEngine";
import { detectCodeIntent, detectFileIntent } from "./lib/activityDetector";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ModelSpecsPanel } from "./components/ModelSpecsPanel";
import { ChatArea } from "./components/ChatArea";
import { ChatComposer } from "./components/ChatComposer";
import { EmptyState } from "./components/EmptyState";
import { QuickCommandPalette } from "./components/QuickCommandPalette";
import { DebugInspectorModal, DebugInfoState } from "./components/DebugInspectorModal";
import { SettingsView, SettingsTabId } from "./components/views/SettingsView";
import { ModelSelectionView } from "./components/views/ModelSelectionView";
import { ModelDetailsView } from "./components/views/ModelDetailsView";
import { ModelProfileView } from "./components/views/ModelProfileView";
import { TroubleshooterView } from "./components/views/TroubleshooterView";
import { CustomThemeBuilderView } from "./components/views/CustomThemeBuilderView";
import { ContextExplorerView } from "./components/views/ContextExplorerView";
import { ContextToolsModal } from "./components/ContextToolsModal";
import { MemoryService } from "./services/memoryService";

export type ActiveView =
  | { type: "chat" }
  | { type: "settings"; tab?: SettingsTabId }
  | { type: "model-selection" }
  | { type: "model-details"; modelName: string }
  | { type: "model-profile"; modelName: string }
  | { type: "troubleshooter" }
  | { type: "theme-builder"; editingThemeId?: string; baseThemeId?: string }
  | { type: "context-explorer" };

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<AppSettings>(() => Storage.getSettings());

  // Apply Theme dynamically using ThemeEngine
  useEffect(() => {
    ThemeEngine.applyTheme(settings.theme || "dark");

    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => ThemeEngine.applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings.theme]);

  // Apply Language and Direction dynamically
  useEffect(() => {
    const isFa = settings.language === "fa";
    document.documentElement.dir = isFa ? "rtl" : "ltr";
    document.documentElement.lang = settings.language || "en";
    if (isFa) {
      document.body.classList.add("rtl-layout");
    } else {
      document.body.classList.remove("rtl-layout");
    }
  }, [settings.language]);

  // Connection & Models
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    endpoint: settings.endpoint,
    lastChecked: 0,
    isChecking: true,
  });
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(() => Storage.getSelectedModel());
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Image Generation Models & Service State
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(() => Storage.getSelectedImageModel());
  const [imageModels, setImageModels] = useState<string[]>([]);
  const [isLoadingImageModels, setIsLoadingImageModels] = useState(false);
  const [servicesStatus, setServicesStatus] = useState<ServicesStatusResponse>({
    ollama: { state: "Stopped", url: settings.endpoint, lastChecked: 0 },
    comfyui: { state: "Stopped", url: settings.comfyUiEndpoint || "http://127.0.0.1:8188", lastChecked: 0 },
  });
  const [isStartingOllama, setIsStartingOllama] = useState(false);
  const [isStartingComfy, setIsStartingComfy] = useState(false);

  // Conversations & Folders State
  const [conversations, setConversations] = useState<Conversation[]>(() => Storage.getConversations());
  const [folders, setFolders] = useState<ChatFolder[]>(() => Storage.getFolders());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => Storage.getActiveConversationId());
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Storage.getDrafts());

  const handleDraftChange = useCallback((newDraft: string) => {
    const key = activeConversationId || "new";
    setDrafts((prev) => {
      const updated = { ...prev };
      if (newDraft && newDraft.trim()) {
        updated[key] = newDraft;
      } else {
        delete updated[key];
      }
      Storage.saveDrafts(updated);
      return updated;
    });
  }, [activeConversationId]);

  // Streaming & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [aiActivityState, setAiActivityState] = useState<AIActivityState>({
    phase: "idle",
    timestamp: Date.now(),
  });
  const [liveMetrics, setLiveMetrics] = useState<LiveGenerationMetrics>({ isGenerating: false });
  const [isModelSpecsOpen, setIsModelSpecsOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI Navigation & Views
  const [activeView, setActiveView] = useState<ActiveView>({ type: "chat" });
  const [viewHistory, setViewHistory] = useState<ActiveView[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const previousSidebarStateBeforeSettings = useRef<boolean | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [lastDebugInfo, setLastDebugInfo] = useState<DebugInfoState | null>(null);
  const [contextToolModalState, setContextToolModalState] = useState<{
    isOpen: boolean;
    mode: "search_memories" | "search_conversations" | "search_context";
  }>({
    isOpen: false,
    mode: "search_memories",
  });

  const handleInsertContextText = useCallback(
    (textToInsert: string) => {
      const key = activeConversationId || "new";
      setDrafts((prev) => {
        const currentDraft = prev[key] || "";
        const updatedDraft = currentDraft ? `${currentDraft}\n\n${textToInsert}` : textToInsert;
        const updated = { ...prev, [key]: updatedDraft };
        Storage.saveDrafts(updated);
        return updated;
      });
    },
    [activeConversationId]
  );

  const navigateToView = useCallback((view: ActiveView) => {
    setViewHistory((prev) => [...prev, activeView]);
    if (view.type === "settings") {
      if (!isSidebarCollapsed) {
        previousSidebarStateBeforeSettings.current = false; // was expanded
        setIsSidebarCollapsed(true);
      } else {
        previousSidebarStateBeforeSettings.current = null; // was already collapsed
      }
    }
    setActiveView(view);
  }, [activeView, isSidebarCollapsed]);

  const handleBack = useCallback(() => {
    if (activeView.type === "settings" && previousSidebarStateBeforeSettings.current === false) {
      setIsSidebarCollapsed(false);
      previousSidebarStateBeforeSettings.current = null;
    }
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory((old) => old.slice(0, -1));
      setActiveView(prev);
    } else {
      setActiveView({ type: "chat" });
    }
  }, [activeView.type, viewHistory]);

  const handleSelectConversation = useCallback((id: string) => {
    if (activeView.type === "settings" && previousSidebarStateBeforeSettings.current === false) {
      setIsSidebarCollapsed(false);
      previousSidebarStateBeforeSettings.current = null;
    }
    setActiveConversationId(id);
    setActiveView({ type: "chat" });
    setViewHistory([]);
  }, [activeView.type]);

  const handleSaveModelProfile = useCallback((modelName: string, profile: ModelProfileSettings) => {
    Storage.saveModelProfile(modelName, profile);
    if (modelName === selectedModel) {
      setSettings((prev) => ({
        ...prev,
        temperature: profile.temperature ?? prev.temperature,
        topP: profile.topP ?? prev.topP,
        numCtx: profile.numCtx ?? prev.numCtx,
        enableThinking: profile.enableThinking ?? prev.enableThinking,
        thinkingMode: profile.thinkingMode ?? prev.thinkingMode,
        modelSystemPrompts: {
          ...prev.modelSystemPrompts,
          [modelName]: profile.systemPrompt ?? "",
        },
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        modelSystemPrompts: {
          ...prev.modelSystemPrompts,
          [modelName]: profile.systemPrompt ?? "",
        },
      }));
    }
  }, [selectedModel]);

  const handleSaveImageModelProfile = useCallback((modelName: string, profile: ImageModelProfile) => {
    Storage.saveImageModelProfile(modelName, profile);
  }, []);

  // Save state helpers
  useEffect(() => {
    Storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    Storage.saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    Storage.saveFolders(folders);
  }, [folders]);

  useEffect(() => {
    Storage.saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (selectedModel) {
      Storage.saveSelectedModel(selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    Storage.saveSelectedImageModel(selectedImageModel);
  }, [selectedImageModel]);

  const handleSelectImageModel = (modelName: string) => {
    setSelectedImageModel(modelName);
    Storage.saveSelectedImageModel(modelName);
  };

  // Per-Model Profile Handler
  const handleSelectModel = (modelName: string) => {
    // Save current profile
    if (selectedModel) {
      Storage.saveModelProfile(selectedModel, {
        temperature: settings.temperature,
        topP: settings.topP,
        numCtx: settings.numCtx,
        enableThinking: settings.enableThinking,
        systemPrompt: settings.modelSystemPrompts[selectedModel] || "",
      });
    }

    setSelectedModel(modelName);

    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, modelId: modelName } : c))
      );
    }

    // Restore saved model profile if present
    const profile = Storage.getModelProfile(modelName);
    if (profile) {
      setSettings((prev) => ({
        ...prev,
        temperature: profile.temperature ?? prev.temperature,
        topP: profile.topP ?? prev.topP,
        numCtx: profile.numCtx ?? prev.numCtx,
        enableThinking: profile.enableThinking ?? prev.enableThinking,
        modelSystemPrompts: {
          ...prev.modelSystemPrompts,
          [modelName]: profile.systemPrompt ?? prev.modelSystemPrompts[modelName] ?? "",
        },
      }));
    }
  };
  const checkHealthAndModels = useCallback(async () => {
    setConnectionStatus((prev) => ({ ...prev, isChecking: true }));
    const health = await OllamaApi.checkHealth(settings);
    setConnectionStatus(health);

    setIsLoadingModels(true);
    try {
      const unifiedList = await ProviderService.fetchAllModels(settings);
      if (unifiedList && unifiedList.length > 0) {
        const convertedModels: OllamaModel[] = unifiedList.map((um) => ({
          name: um.rawId,
          model: um.rawId,
          modified_at: um.modifiedAt || new Date().toISOString(),
          size: um.sizeBytes || 0,
          digest: um.digest || "",
          details: {
            family: um.family,
            families: um.families,
            parameter_size: um.parameterSize,
            quantization_level: um.quantization,
          },
          providerId: um.providerId,
          providerName: um.providerName,
          providerType: um.providerType,
        }));
        setModels(convertedModels);
        const exists = convertedModels.some(
          (m) => m.name === selectedModel || m.model === selectedModel
        );
        if (!exists && convertedModels.length > 0) {
          setSelectedModel(convertedModels[0].name);
        }
      } else {
        setModels((prev) => (prev.length > 0 ? prev : FALLBACK_DEMO_MODELS));
        if (!selectedModel && FALLBACK_DEMO_MODELS.length > 0) {
          setSelectedModel(FALLBACK_DEMO_MODELS[0].name);
        }
      }
    } catch (err: any) {
      console.warn("Notice fetching models:", err.message);
      setModels((prev) => (prev.length > 0 ? prev : FALLBACK_DEMO_MODELS));
      if (!selectedModel && FALLBACK_DEMO_MODELS.length > 0) {
        setSelectedModel(FALLBACK_DEMO_MODELS[0].name);
      }
    } finally {
      setIsLoadingModels(false);
    }
  }, [settings, selectedModel]);

  const checkServicesAndImageModels = useCallback(async () => {
    try {
      const status = await ComfyApi.getServicesStatus(settings.endpoint, settings.comfyUiEndpoint);
      setServicesStatus(status);
    } catch (e) {
      console.warn("Failed to get services status:", e);
    }

    setIsLoadingImageModels(true);
    try {
      const ckpts = await ComfyApi.fetchCheckpoints(settings.comfyUiEndpoint);
      setImageModels(ckpts);
      if (ckpts.length > 0) {
        setSelectedImageModel((prev) => {
          if (!prev || !ckpts.includes(prev)) {
            Storage.saveSelectedImageModel(ckpts[0]);
            return ckpts[0];
          }
          return prev;
        });
      }
    } catch (e) {
      console.warn("Failed to fetch ComfyUI checkpoints:", e);
    } finally {
      setIsLoadingImageModels(false);
    }
  }, [settings.endpoint, settings.comfyUiEndpoint]);

  const handleStartOllama = async () => {
    setIsStartingOllama(true);
    try {
      await ComfyApi.startService("ollama");
      await checkHealthAndModels();
      await checkServicesAndImageModels();
    } catch (e: any) {
      console.error("Start Ollama error:", e);
    } finally {
      setIsStartingOllama(false);
    }
  };

  const handleStopOllama = async () => {
    try {
      await ComfyApi.stopService("ollama");
      await checkHealthAndModels();
      await checkServicesAndImageModels();
    } catch (e: any) {
      console.error("Stop Ollama error:", e);
    }
  };

  const handleStartComfy = async () => {
    setIsStartingComfy(true);
    try {
      await ComfyApi.startService("comfyui");
      await checkServicesAndImageModels();
    } catch (e: any) {
      console.error("Start ComfyUI error:", e);
    } finally {
      setIsStartingComfy(false);
    }
  };

  const handleStopComfy = async () => {
    try {
      await ComfyApi.stopService("comfyui");
      await checkServicesAndImageModels();
    } catch (e: any) {
      console.error("Stop ComfyUI error:", e);
    }
  };

  useEffect(() => {
    checkServicesAndImageModels();
    const interval = setInterval(checkServicesAndImageModels, 5000);
    return () => clearInterval(interval);
  }, [checkServicesAndImageModels]);

  useEffect(() => {
    ThemeEngine.applyTheme(settings.theme || "dark");

    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => ThemeEngine.applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings.theme]);

  useEffect(() => {
    const isFa = settings.language === "fa";
    document.documentElement.dir = isFa ? "rtl" : "ltr";
    document.documentElement.lang = settings.language || "en";
  }, [settings.language]);

  useEffect(() => {
    checkHealthAndModels();
  }, [checkHealthAndModels]);

  // Periodic Background Auto-Reconnection Polling
  useEffect(() => {
    // Poll every 3 seconds if disconnected (to reconnect fast), or every 30 seconds if connected
    const pollInterval = connectionStatus.isConnected ? 30000 : 3000;
    const interval = setInterval(() => {
      if (!isGenerating) {
        checkHealthAndModels();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [connectionStatus.isConnected, isGenerating, checkHealthAndModels]);

  // Re-check on window focus (e.g. user returns to browser after starting 'ollama serve')
  useEffect(() => {
    const handleFocus = () => {
      if (!isGenerating) {
        checkHealthAndModels();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [isGenerating, checkHealthAndModels]);

  // Active Conversation Helper
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N -> New Chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewConversation();
      }
      // Cmd/Ctrl + Shift + S -> Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
      // Cmd/Ctrl + K -> Quick Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedModel]);

  // Create New Conversation
  const handleNewConversation = () => {
    if (activeView.type === "settings" && previousSidebarStateBeforeSettings.current === false) {
      setIsSidebarCollapsed(false);
      previousSidebarStateBeforeSettings.current = null;
    }
    const newConv: Conversation = {
      id: Math.random().toString(36).substring(2, 9),
      title: "New Chat",
      modelId: selectedModel || "ollama",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setActiveView({ type: "chat" });
    setViewHistory([]);
  };

  // Delete Conversation
  const handleDeleteConversation = (id: string) => {
    Storage.deleteDraft(id);
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  // Rename Conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Toggle Pin Conversation
  const handleTogglePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  // Toggle Favorite Conversation
  const handleToggleFavoriteConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
  };

  // Toggle Archive Conversation
  const handleToggleArchiveConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isArchived: !c.isArchived } : c))
    );
  };

  // Duplicate Conversation
  const handleDuplicateConversation = (id: string) => {
    const target = conversations.find((c) => c.id === id);
    if (!target) return;
    const dup: Conversation = {
      ...target,
      id: Math.random().toString(36).substring(2, 9),
      title: `${target.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [dup, ...prev]);
    setActiveConversationId(dup.id);
  };

  // Folder Handlers
  const handleCreateFolder = (name: string) => {
    const newFolder: ChatFolder = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim() || "New Folder",
      createdAt: Date.now(),
      isCollapsed: false,
    };
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() } : f))
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.folderId === folderId ? { ...c, folderId: undefined } : c))
    );
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
  };

  const handleToggleFolderCollapse = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isCollapsed: !f.isCollapsed } : f))
    );
  };

  const handleMoveConversationToFolder = (conversationId: string, folderId?: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, folderId } : c))
    );
  };

  // Export Conversation
  const handleExportConversation = (id: string, format: "json" | "md") => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    let content = "";
    let filename = `${conv.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${format}`;

    if (format === "json") {
      content = JSON.stringify(conv, null, 2);
    } else {
      content = `# ${conv.title}\n*Model: ${conv.modelId} | Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
      conv.messages.forEach((msg) => {
        const roleName = msg.role === "user" ? "User" : "Assistant";
        content += `### ${roleName}\n\n${msg.content}\n\n`;
      });
    }

    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Core Streaming Execution Function
  const executeChatRequest = async (
    conversationId: string,
    historyMessages: ChatMessage[],
    assistantMessageId: string,
    modelToUse: string
  ) => {
    setIsGenerating(true);
    setGlobalError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startTime = Date.now();
    let assistantText = "";
    let thinkingText = "";

    // Determine initial activity phase based on real user input context
    const latestUserMsg = historyMessages[historyMessages.length - 1];
    const fileInfo = detectFileIntent(latestUserMsg?.attachments);
    const isCode = detectCodeIntent(latestUserMsg?.content || "", latestUserMsg?.attachments);

    let initialPhase: AIActivityPhase = "generating";
    if (fileInfo.hasImages) {
      initialPhase = "analyzing_image";
    } else if (fileInfo.hasFiles) {
      initialPhase = fileInfo.isCodeFile ? "analyzing_file" : "reading_file";
    } else if (isCode) {
      initialPhase = "analyzing_code";
    } else {
      initialPhase = "analyzing";
    }

    const initialActivityState: AIActivityState = {
      phase: initialPhase,
      timestamp: Date.now(),
    };
    setAiActivityState(initialActivityState);

    // Process context through Context Compression & Memory Engine:
    // 1. Monitors token usage vs model's context window (triggers auto-compression at 90%)
    // 2. Performs relevance retrieval for past context/facts matching user prompt
    // 3. Injects compressed memory block into effective system prompt
    // 4. Prunes messages if necessary to guarantee context window limits
    const contextProcess = MemoryService.processContextForDispatch({
      messages: historyMessages,
      systemPrompt: activeConversation?.systemPrompt,
      numCtx: settings.numCtx || 4096,
      modelName: modelToUse,
      conversationId: activeConversation?.id,
      conversationTitle: activeConversation?.title,
      onStatusChange: (phase) => {
        const updated: AIActivityState = { phase, timestamp: Date.now() };
        setAiActivityState(updated);
        setLiveMetrics((prev) => ({ ...prev, activityState: updated }));
      },
    });

    const prunedMessages = contextProcess.prunedMessages;
    const effectiveSystemPrompt = contextProcess.effectiveSystemPrompt;
    const estimatedPromptTokens = contextProcess.totalPromptTokens;
    const isPruned = prunedMessages.length < historyMessages.length;
    const totalOriginalMessages = historyMessages.length;
    const includedMessagesCount = prunedMessages.length;

    const currentModelObj = models.find(
      (m) => m.name === modelToUse || m.model === modelToUse
    );
    const capabilities = detectModelCapabilities(modelToUse, null, currentModelObj);

    setLiveMetrics({
      isGenerating: true,
      modelName: modelToUse,
      parameterSize: currentModelObj?.details?.parameter_size,
      quantization: currentModelObj?.details?.quantization_level,
      contextWindow: settings.numCtx,
      promptTokens: estimatedPromptTokens,
      generatedTokens: 0,
      tokensPerSec: 0,
      elapsedMs: 0,
      activityState: initialActivityState,
    });

    try {
      await ProviderService.sendChatStream({
        settings,
        modelId: modelToUse,
        messages: prunedMessages,
        systemPrompt: effectiveSystemPrompt,
        signal: abortController.signal,
        onDebugInfo: (debug) => {
          const lastUserMsg = historyMessages[historyMessages.length - 1];
          setLastDebugInfo({
            ...debug,
            estimatedTokens: estimatedPromptTokens,
            totalOriginalMessages,
            includedMessagesCount,
            isPruned,
            supportsThinking: capabilities.supportsThinking,
            supportsVision: capabilities.supportsVision,
            retrievedMemoriesCount: contextProcess.retrievedMemories.length,
            tokensSavedByCompression: contextProcess.tokensSaved,
            wasCompressed: contextProcess.wasCompressed,
            citations: contextProcess.citations,
            intentInfo: contextProcess.intentInfo,
            attachmentsCount: {
              images: (lastUserMsg?.attachments || []).filter((a) => a.isImage).length,
              files: (lastUserMsg?.attachments || []).filter((a) => !a.isImage).length,
            },
          });
        },
        onChunk: (chunkText, chunkThinking) => {
          if (chunkText) assistantText += chunkText;
          if (chunkThinking) thinkingText += chunkThinking;

          const thinkingDuration = thinkingText ? Date.now() - startTime : undefined;
          const elapsed = Date.now() - startTime;
          const approxTokens = Math.ceil((assistantText.length + thinkingText.length) / 3.8);
          const tokPerSec = elapsed > 0 ? approxTokens / (elapsed / 1000) : 0;

          // Compute streaming activity state
          let activePhase: AIActivityPhase = "generating";
          if (chunkThinking && !assistantText) {
            activePhase = "thinking";
          } else if (isCode || assistantText.includes("```")) {
            activePhase = "writing_code";
          } else {
            activePhase = "generating";
          }

          const currentActivityState: AIActivityState = {
            phase: activePhase,
            timestamp: Date.now(),
          };
          setAiActivityState(currentActivityState);

          setLiveMetrics((prev) => ({
            ...prev,
            isGenerating: true,
            generatedTokens: approxTokens,
            tokensPerSec: Math.round(tokPerSec * 10) / 10,
            elapsedMs: elapsed,
            activityState: currentActivityState,
          }));

          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== conversationId) return conv;
              return {
                ...conv,
                updatedAt: Date.now(),
                messages: conv.messages.map((m) => {
                  if (m.id !== assistantMessageId) return m;
                  return {
                    ...m,
                    content: assistantText,
                    thinkingContent: thinkingText || m.thinkingContent,
                    thinkingTimeMs: thinkingDuration,
                    isStreaming: true,
                    activityState: currentActivityState,
                  };
                }),
              };
            })
          );
        },
      });

      // Stream successfully completed: ensure connected status
      setConnectionStatus((prev) => ({
        ...prev,
        isConnected: true,
        lastChecked: Date.now(),
        error: undefined,
      }));
      setGlobalError(null);

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            updatedAt: Date.now(),
            messages: conv.messages.map((m) => {
              if (m.id !== assistantMessageId) return m;
              return {
                ...m,
                isStreaming: false,
              };
            }),
          };
        })
      );
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("cancelled")) {
        // User aborted request
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              messages: conv.messages.map((m) => {
                if (m.id !== assistantMessageId) return m;
                return {
                  ...m,
                  content: assistantText || "*(Generation stopped)*",
                  isInterrupted: true,
                  isStreaming: false,
                };
              }),
            };
          })
        );
      } else {
        // Handle Error gracefully without losing user input or conversation context
        const errorMsg = err.message || "Failed to generate response from local Ollama.";
        const isNotRunning =
          errorMsg.includes("not running") ||
          errorMsg.includes("ECONNREFUSED") ||
          errorMsg.includes("unreachable") ||
          errorMsg.includes("Failed to communicate");

        if (isNotRunning) {
          setConnectionStatus({
            isConnected: false,
            endpoint: settings.endpoint,
            lastChecked: Date.now(),
            error: `Cannot connect to local Ollama at ${settings.endpoint}`,
            isChecking: false,
          });
        }

        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              messages: conv.messages.map((m) => {
                if (m.id !== assistantMessageId) return m;
                return {
                  ...m,
                  content: assistantText,
                  isError: true,
                  errorMessage: errorMsg,
                  isStreaming: false,
                };
              }),
            };
          })
        );
      }
    } finally {
      setIsGenerating(false);
      const idleState: AIActivityState = { phase: "idle", timestamp: Date.now() };
      setAiActivityState(idleState);
      setLiveMetrics((prev) => ({
        ...prev,
        isGenerating: false,
        activityState: idleState,
      }));
      abortControllerRef.current = null;
    }
  };

  // Send Message Handler
  const handleSendMessage = (content: string, attachments: FileAttachment[]) => {
    let currentConvId = activeConversationId;
    let targetConv = activeConversation;

    if (!currentConvId || !targetConv) {
      // Create new conversation
      const newConv: Conversation = {
        id: Math.random().toString(36).substring(2, 9),
        title: content.slice(0, 32) || "New Chat",
        modelId: selectedModel || "ollama",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      currentConvId = newConv.id;
      targetConv = newConv;
    } else if (targetConv.title === "New Chat" && content.trim()) {
      // Auto-rename conversation based on first query
      handleRenameConversation(currentConvId, content.slice(0, 36).trim());
    }

    const modelToUse = selectedModel || targetConv.modelId || "ollama";

    // User Message
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: Date.now(),
    };

    // Assistant Placeholder Message
    const assistantMsgId = Math.random().toString(36).substring(2, 9);
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      modelUsed: modelToUse,
      timestamp: Date.now(),
      isStreaming: true,
    };

    const updatedMessages = [...targetConv.messages, userMsg, assistantMsg];

    // Clear draft for this conversation and new draft
    const draftKey = currentConvId || "new";
    Storage.deleteDraft(draftKey);
    Storage.deleteDraft("new");
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[draftKey];
      delete copy["new"];
      Storage.saveDrafts(copy);
      return copy;
    });

    // Check if the user is explicitly requesting image generation
    const historyForApi = [...targetConv.messages, userMsg];
    const { isImageRequest } = detectImageIntent(content);

    if (isImageRequest) {
      const currentImageModel = selectedImageModel || (imageModels.length > 0 ? imageModels[0] : null);
      const imageAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        modelUsed: currentImageModel || "ComfyUI",
        timestamp: Date.now(),
        imageGeneration: {
          status: "prompting",
          originalRequest: content,
          modelUsed: currentImageModel || undefined,
          createdAt: Date.now(),
        },
      };

      const updatedMessagesWithImage = [...targetConv.messages, userMsg, imageAssistantMsg];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? {
                ...c,
                modelId: modelToUse,
                updatedAt: Date.now(),
                messages: updatedMessagesWithImage,
              }
            : c
        )
      );

      executeImageGeneration(currentConvId, historyForApi, assistantMsgId, content);
      return;
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConvId
          ? {
              ...c,
              modelId: modelToUse,
              updatedAt: Date.now(),
              messages: updatedMessages,
            }
          : c
      )
    );

    // Execute Stream Request with history up to user message
    executeChatRequest(currentConvId, historyForApi, assistantMsgId, modelToUse);
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Continue Interrupted Message Handler
  const handleContinueMessage = (messageId: string) => {
    if (!activeConversation) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = activeConversation.messages[msgIndex];
    const modelToUse = selectedModel || activeConversation.modelId || "ollama";

    // Create a continuation user prompt telling the model to resume
    const continuationUserMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: "Please continue your response from where you left off. Do not repeat what was already written.",
      timestamp: Date.now(),
    };

    const newAssistantMsgId = Math.random().toString(36).substring(2, 9);
    const newAssistantMsg: ChatMessage = {
      id: newAssistantMsgId,
      role: "assistant",
      content: targetMsg.content, // start with existing text
      thinkingContent: targetMsg.thinkingContent,
      modelUsed: modelToUse,
      timestamp: Date.now(),
      isStreaming: true,
    };

    const historyMessages = [
      ...activeConversation.messages.slice(0, msgIndex),
      continuationUserMsg,
    ];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [
                ...activeConversation.messages.map((m) =>
                  m.id === messageId ? { ...m, isInterrupted: false } : m
                ),
                continuationUserMsg,
                newAssistantMsg,
              ],
            }
          : c
      )
    );

    executeChatRequest(
      activeConversation.id,
      historyMessages,
      newAssistantMsgId,
      modelToUse
    );
  };

  // Finish / Mark Interrupted Message as Complete
  const handleFinishMessage = (messageId: string) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, isInterrupted: false } : m
              ),
            }
          : c
      )
    );
  };

  // Retry / Regenerate Assistant Response
  const handleRetryMessage = (messageId: string) => {
    if (!activeConversation) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Remove the target assistant message and any subsequent messages
    const historyMessages = activeConversation.messages.slice(0, msgIndex);
    const modelToUse = selectedModel || activeConversation.modelId || "ollama";

    const newAssistantMsgId = Math.random().toString(36).substring(2, 9);
    const newAssistantMsg: ChatMessage = {
      id: newAssistantMsgId,
      role: "assistant",
      content: "",
      modelUsed: modelToUse,
      timestamp: Date.now(),
      isStreaming: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...historyMessages, newAssistantMsg],
            }
          : c
      )
    );

    executeChatRequest(
      activeConversation.id,
      historyMessages,
      newAssistantMsgId,
      modelToUse
    );
  };

  // Edit User Message & Resend
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversation) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetUserMsg = activeConversation.messages[msgIndex];
    const updatedUserMsg: ChatMessage = {
      ...targetUserMsg,
      content: newContent,
      timestamp: Date.now(),
    };

    // Keep history up to this edited user message
    const historyUpToUser = [...activeConversation.messages.slice(0, msgIndex), updatedUserMsg];
    const modelToUse = selectedModel || activeConversation.modelId || "ollama";

    const newAssistantMsgId = Math.random().toString(36).substring(2, 9);
    const newAssistantMsg: ChatMessage = {
      id: newAssistantMsgId,
      role: "assistant",
      content: "",
      modelUsed: modelToUse,
      timestamp: Date.now(),
      isStreaming: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...historyUpToUser, newAssistantMsg],
            }
          : c
      )
    );

    executeChatRequest(
      activeConversation.id,
      historyUpToUser,
      newAssistantMsgId,
      modelToUse
    );
  };

  // Delete Individual Message
  const handleDeleteMessage = (messageId: string) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: c.messages.filter((m) => m.id !== messageId),
            }
          : c
      )
    );
  };

  // Image Generation Handlers
  const executeImageGeneration = async (
    conversationId: string,
    historyMessages: ChatMessage[],
    assistantMessageId: string,
    userPrompt: string
  ) => {
    setIsGenerating(true);
    setGlobalError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentChatModel = selectedModel || "ollama";
    let currentImageModel = selectedImageModel || (imageModels.length > 0 ? imageModels[0] : null);

    if (!currentImageModel && imageModels.length > 0) {
      currentImageModel = imageModels[0];
      setSelectedImageModel(currentImageModel);
      Storage.saveSelectedImageModel(currentImageModel);
    }

    if (!currentImageModel) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        imageGeneration: {
                          status: "failed",
                          originalRequest: userPrompt,
                          error: "No ComfyUI checkpoint selected. Please ensure ComfyUI is running with checkpoints and select a checkpoint.",
                          createdAt: Date.now(),
                          completedAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
      setIsGenerating(false);
      return;
    }

    try {
      // Resolve generation parameters (saved profile defaults + natural language overrides + hardware capability checking)
      const savedImageProfile =
        Storage.getImageModelProfile(currentImageModel) ||
        getDefaultImageModelProfile(currentImageModel);

      const resolvedParams = resolveImageParameters({
        prompt: userPrompt,
        ckptName: currentImageModel,
        savedProfile: savedImageProfile,
        language: settings.language,
      });

      // Phase 1: Synthesize Prompt using Chat Model and Context
      const enhancedPrompt = await synthesizeImagePrompt({
        userPrompt,
        conversationHistory: historyMessages,
        chatModel: currentChatModel,
        settings,
        signal: abortController.signal,
      });

      // Update message state: Queued
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        imageGeneration: {
                          status: "queued",
                          originalRequest: userPrompt,
                          enhancedPrompt,
                          modelUsed: currentImageModel || undefined,
                          width: resolvedParams.width,
                          height: resolvedParams.height,
                          aspectRatio: resolvedParams.aspectRatio,
                          qualityPreset: resolvedParams.qualityPreset,
                          steps: resolvedParams.steps,
                          totalSteps: resolvedParams.steps,
                          warning: resolvedParams.warning,
                          createdAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );

      // Phase 2: Submit to ComfyUI with actual configurable dimensions & sampling steps
      const promptRes = await ComfyApi.queuePrompt({
        checkpoint: currentImageModel,
        prompt: enhancedPrompt,
        width: resolvedParams.width,
        height: resolvedParams.height,
        steps: resolvedParams.steps,
        cfg: resolvedParams.cfg,
        negativePrompt: savedImageProfile?.negativePrompt,
        endpoint: settings.comfyUiEndpoint,
      });

      // Update message state: Processing
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        imageGeneration: {
                          status: "processing",
                          promptId: promptRes.prompt_id,
                          originalRequest: userPrompt,
                          enhancedPrompt,
                          modelUsed: currentImageModel || undefined,
                          width: resolvedParams.width,
                          height: resolvedParams.height,
                          aspectRatio: resolvedParams.aspectRatio,
                          qualityPreset: resolvedParams.qualityPreset,
                          warning: resolvedParams.warning,
                          progress: undefined,
                          step: 0,
                          totalSteps: resolvedParams.steps,
                          createdAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );

      // Phase 3: Track Progress & Download
      const result = await ComfyApi.trackPrompt({
        promptId: promptRes.prompt_id,
        endpoint: settings.comfyUiEndpoint,
        totalSteps: resolvedParams.steps,
        signal: abortController.signal,
        onProgress: ({ step, totalSteps, percent }) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            imageGeneration: {
                              ...m.imageGeneration!,
                              status: "processing",
                              step,
                              totalSteps,
                              progress: percent,
                            },
                          }
                        : m
                    ),
                  }
                : c
            )
          );
        },
      });

      // Phase 4: Completed
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        imageGeneration: {
                          ...m.imageGeneration!,
                          status: "completed",
                          imageUrl: result.imageUrl,
                          width: resolvedParams.width,
                          height: resolvedParams.height,
                          aspectRatio: resolvedParams.aspectRatio,
                          qualityPreset: resolvedParams.qualityPreset,
                          warning: resolvedParams.warning,
                          completedAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
    } catch (err: any) {
      const isAborted = err.name === "AbortError" || err.message?.includes("aborted");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        imageGeneration: {
                          ...m.imageGeneration!,
                          status: isAborted ? "interrupted" : "failed",
                          error: isAborted ? undefined : err.message || "Failed to generate image.",
                          completedAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetryImage = (messageId: string) => {
    if (!activeConversation) return;
    const msg = activeConversation.messages.find((m) => m.id === messageId);
    if (!msg || !msg.imageGeneration) return;

    const originalRequest = msg.imageGeneration.originalRequest || msg.content || "create an image";
    const msgIndex = activeConversation.messages.indexOf(msg);
    const historyUpToMsg = activeConversation.messages.slice(0, msgIndex);
    const currentImageModel = selectedImageModel || msg.imageGeneration.modelUsed || (imageModels.length > 0 ? imageModels[0] : null);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      imageGeneration: {
                        status: "prompting",
                        originalRequest,
                        modelUsed: currentImageModel || undefined,
                        createdAt: Date.now(),
                      },
                    }
                  : m
              ),
            }
          : c
      )
    );

    executeImageGeneration(activeConversation.id, historyUpToMsg, messageId, originalRequest);
  };

  const handleStopImage = async (messageId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    await ComfyApi.interrupt(settings.comfyUiEndpoint);
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId && m.imageGeneration
                    ? {
                        ...m,
                        imageGeneration: {
                          ...m.imageGeneration,
                          status: "interrupted",
                          completedAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
    }
    setIsGenerating(false);
  };

  /**
   * Direct Image Generation Workflow:
   * Bypasses Ollama and any text LLM completely in application logic.
   * Directly sends the exact user input prompt to ComfyUI.
   */
  const executeDirectImageGeneration = async (promptText: string) => {
    if (!promptText.trim()) return;

    let currentConvId = activeConversationId;
    if (!currentConvId) {
      const newConv: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: promptText.slice(0, 36).trim() || "Image Generation",
        modelId: selectedModel || "ollama",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      currentConvId = newConv.id;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }

    const userMsgId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assistantMsgId = `assistant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let currentImageModel = selectedImageModel || (imageModels.length > 0 ? imageModels[0] : null);
    if (!currentImageModel && imageModels.length > 0) {
      currentImageModel = imageModels[0];
      setSelectedImageModel(currentImageModel);
      Storage.saveSelectedImageModel(currentImageModel);
    }

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: promptText,
      timestamp: Date.now(),
    };

    // Load saved defaults and resolve one-time explicit overrides
    const savedImageProfile =
      Storage.getImageModelProfile(currentImageModel) ||
      getDefaultImageModelProfile(currentImageModel);

    const resolvedParams = resolveImageParameters({
      prompt: promptText,
      ckptName: currentImageModel,
      savedProfile: savedImageProfile,
      language: settings.language,
    });

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      imageGeneration: {
        status: "prompting",
        originalRequest: promptText,
        enhancedPrompt: promptText, // Exact raw prompt without LLM modification
        modelUsed: currentImageModel || undefined,
        width: resolvedParams.width,
        height: resolvedParams.height,
        aspectRatio: resolvedParams.aspectRatio,
        qualityPreset: resolvedParams.qualityPreset,
        steps: resolvedParams.steps,
        totalSteps: resolvedParams.steps,
        warning: resolvedParams.warning,
        createdAt: Date.now(),
      },
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConvId
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...c.messages, userMessage, assistantMessage],
            }
          : c
      )
    );

    setIsGenerating(true);
    setGlobalError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (!currentImageModel) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        imageGeneration: {
                          status: "failed",
                          originalRequest: promptText,
                          enhancedPrompt: promptText,
                          error: "No ComfyUI checkpoint selected. Please ensure ComfyUI is running with checkpoints and select a checkpoint.",
                          createdAt: Date.now(),
                          completedAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
      setIsGenerating(false);
      return;
    }

    try {
      // NOTE: Direct Generation completely BYPASSES Ollama/LLM in application logic.
      // Submit exact promptText directly to ComfyUI workflow:
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        imageGeneration: {
                          ...m.imageGeneration!,
                          status: "queued",
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );

      const promptRes = await ComfyApi.queuePrompt({
        checkpoint: currentImageModel,
        prompt: promptText, // Raw exact prompt without LLM modification
        width: resolvedParams.width,
        height: resolvedParams.height,
        steps: resolvedParams.steps,
        cfg: resolvedParams.cfg,
        negativePrompt: savedImageProfile?.negativePrompt,
        endpoint: settings.comfyUiEndpoint,
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        imageGeneration: {
                          ...m.imageGeneration!,
                          status: "processing",
                          promptId: promptRes.prompt_id,
                          width: resolvedParams.width,
                          height: resolvedParams.height,
                          aspectRatio: resolvedParams.aspectRatio,
                          qualityPreset: resolvedParams.qualityPreset,
                          warning: resolvedParams.warning,
                          step: 0,
                          totalSteps: resolvedParams.steps,
                          progress: undefined,
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );

      // Track progress
      const result = await ComfyApi.trackPrompt({
        promptId: promptRes.prompt_id,
        endpoint: settings.comfyUiEndpoint,
        totalSteps: resolvedParams.steps,
        signal: abortController.signal,
        onProgress: ({ step, totalSteps, percent }) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            imageGeneration: {
                              ...m.imageGeneration!,
                              status: "processing",
                              step,
                              totalSteps,
                              progress: percent,
                            },
                          }
                        : m
                    ),
                  }
                : c
            )
          );
        },
      });

      // Completed
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        imageGeneration: {
                          ...m.imageGeneration!,
                          status: "completed",
                          imageUrl: result.imageUrl,
                          width: resolvedParams.width,
                          height: resolvedParams.height,
                          aspectRatio: resolvedParams.aspectRatio,
                          qualityPreset: resolvedParams.qualityPreset,
                          warning: resolvedParams.warning,
                          completedAt: Date.now(),
                        },
                      }
                    : m
                ),
              }
            : c
        )
      );
    } catch (err: any) {
      if (err.name === "AbortError" || abortController.signal.aborted) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          imageGeneration: {
                            ...m.imageGeneration!,
                            status: "interrupted",
                            completedAt: Date.now(),
                          },
                        }
                      : m
                  ),
                }
              : c
          )
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          imageGeneration: {
                            ...m.imageGeneration!,
                            status: "failed",
                            error: err.message || "Direct image generation failed.",
                            completedAt: Date.now(),
                          },
                        }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Clear All Data
  const handleClearAllData = () => {
    localStorage.clear();
    setConversations([]);
    setActiveConversationId(null);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary,#131418)] text-[var(--text-primary,#e6e9f0)] font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        folders={folders}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onToggleFavoriteConversation={handleToggleFavoriteConversation}
        onToggleArchiveConversation={handleToggleArchiveConversation}
        onDuplicateConversation={handleDuplicateConversation}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onToggleFolderCollapse={handleToggleFolderCollapse}
        onMoveConversationToFolder={handleMoveConversationToFolder}
        onExportConversation={handleExportConversation}
        selectedModel={selectedModel}
        models={models}
        onOpenModelPicker={() => navigateToView({ type: "model-selection" })}
        onOpenSettings={() => navigateToView({ type: "settings" })}
        onOpenContextExplorer={() => navigateToView({ type: "context-explorer" })}
        onOpenTroubleshooter={() => navigateToView({ type: "troubleshooter" })}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        connectionStatus={connectionStatus}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        language={settings.language}
      />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary,#131418)]">
        {activeView.type === "chat" && (
          <>
            {/* Top Header */}
            <Header
              selectedModel={selectedModel}
              models={models}
              onOpenModelPicker={() => navigateToView({ type: "model-selection" })}
              selectedImageModel={selectedImageModel}
              imageModels={imageModels}
              isLoadingImageModels={isLoadingImageModels}
              onSelectImageModel={handleSelectImageModel}
              onRefreshImageModels={checkServicesAndImageModels}
              ollamaServiceState={servicesStatus.ollama?.state || (connectionStatus.isConnected ? "Running" : "Stopped")}
              ollamaServiceError={servicesStatus.ollama?.error}
              onStartOllama={handleStartOllama}
              onStopOllama={handleStopOllama}
              isStartingOllama={isStartingOllama}
              comfyServiceState={servicesStatus.comfyui?.state || "Stopped"}
              comfyServiceError={servicesStatus.comfyui?.error}
              onStartComfy={handleStartComfy}
              onStopComfy={handleStopComfy}
              isStartingComfy={isStartingComfy}
              isModelSpecsOpen={isModelSpecsOpen}
              onToggleModelSpecs={() => setIsModelSpecsOpen((prev) => !prev)}
              liveMetrics={liveMetrics}
              connectionStatus={connectionStatus}
              onRefreshConnection={checkHealthAndModels}
              onOpenSettings={() => navigateToView({ type: "settings" })}
              onOpenContextExplorer={() => navigateToView({ type: "context-explorer" })}
              onOpenTroubleshooter={() => navigateToView({ type: "troubleshooter" })}
              onOpenDebugInspector={() => setIsDebugOpen(true)}
              onExportConversation={
                activeConversation
                  ? (format) => handleExportConversation(activeConversation.id, format)
                  : undefined
              }
              language={settings.language}
            />

            {/* Expandable Model Specs & Runtime Panel */}
            <ModelSpecsPanel
              isOpen={isModelSpecsOpen}
              onClose={() => setIsModelSpecsOpen(false)}
              selectedModel={selectedModel}
              modelObj={models.find((m) => m.name === selectedModel || m.model === selectedModel)}
              settings={settings}
              connectionStatus={connectionStatus}
              liveMetrics={liveMetrics}
              activeConversation={activeConversation}
              onOpenModelDetailsFull={(name) => navigateToView({ type: "model-details", modelName: name })}
              onOpenContextExplorer={() => navigateToView({ type: "context-explorer" })}
            />

            {/* Chat Messages Stream Area / New Chat Centered State */}
            {activeConversation && activeConversation.messages.length > 0 ? (
              <>
                <ChatArea
                  messages={activeConversation.messages}
                  selectedModel={selectedModel}
                  models={models}
                  onSelectPrompt={(promptText) => handleSendMessage(promptText, [])}
                  onOpenModelPicker={() => navigateToView({ type: "model-selection" })}
                  onRetryMessage={handleRetryMessage}
                  onContinueMessage={handleContinueMessage}
                  onFinishMessage={handleFinishMessage}
                  onRetryImage={handleRetryImage}
                  onStopImage={handleStopImage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  isGenerating={isGenerating}
                  activeActivityState={aiActivityState}
                  error={globalError}
                  onDismissError={() => setGlobalError(null)}
                  language={settings.language}
                />

                {/* Chat Input Composer at bottom */}
                <ChatComposer
                  onSendMessage={handleSendMessage}
                  onDirectImageGeneration={executeDirectImageGeneration}
                  onStopGeneration={handleStopGeneration}
                  isGenerating={isGenerating}
                  selectedModel={selectedModel}
                  enableThinking={settings.enableThinking}
                  thinkingMode={settings.thinkingMode || "auto"}
                  onSetThinkingMode={(mode) =>
                    setSettings((prev) => ({
                      ...prev,
                      thinkingMode: mode,
                      enableThinking: mode !== "off",
                    }))
                  }
                  onToggleThinking={() =>
                    setSettings((prev) => ({
                      ...prev,
                      enableThinking: !prev.enableThinking,
                      thinkingMode: !prev.enableThinking ? "on" : "off",
                    }))
                  }
                  enterToSend={settings.enterToSend}
                  supportsThinking={
                    detectModelCapabilities(
                      selectedModel || "",
                      null,
                      models.find((m) => m.name === selectedModel || m.model === selectedModel)
                    ).supportsThinking
                  }
                  language={settings.language}
                  draft={drafts[activeConversationId || "new"] || ""}
                  onDraftChange={handleDraftChange}
                  onOpenContextTool={(tool) => setContextToolModalState({ isOpen: true, mode: tool })}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-3xl xl:max-w-4xl flex flex-col items-center my-auto animate-fadeIn">
                  {/* Welcoming Greeting */}
                  <EmptyState language={settings.language} />

                  {/* Compact Composer Directly Below Greeting */}
                  <div className="w-full mt-6 sm:mt-8">
                    <ChatComposer
                      onSendMessage={handleSendMessage}
                      onDirectImageGeneration={executeDirectImageGeneration}
                      onStopGeneration={handleStopGeneration}
                      isGenerating={isGenerating}
                      selectedModel={selectedModel}
                      enableThinking={settings.enableThinking}
                      thinkingMode={settings.thinkingMode || "auto"}
                      onSetThinkingMode={(mode) =>
                        setSettings((prev) => ({
                          ...prev,
                          thinkingMode: mode,
                          enableThinking: mode !== "off",
                        }))
                      }
                      onToggleThinking={() =>
                        setSettings((prev) => ({
                          ...prev,
                          enableThinking: !prev.enableThinking,
                          thinkingMode: !prev.enableThinking ? "on" : "off",
                        }))
                      }
                      enterToSend={settings.enterToSend}
                      supportsThinking={
                        detectModelCapabilities(
                          selectedModel || "",
                          null,
                          models.find((m) => m.name === selectedModel || m.model === selectedModel)
                        ).supportsThinking
                      }
                      language={settings.language}
                      draft={drafts[activeConversationId || "new"] || ""}
                      onDraftChange={handleDraftChange}
                      onOpenContextTool={(tool) => setContextToolModalState({ isOpen: true, mode: tool })}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeView.type === "settings" && (
          <SettingsView
            initialTab={activeView.tab || "general"}
            onBack={handleBack}
            settings={settings}
            onSaveSettings={(newSettings) => {
              setSettings(newSettings);
              checkHealthAndModels();
            }}
            models={models}
            selectedModel={selectedModel}
            connectionStatus={connectionStatus}
            onRefreshConnection={checkHealthAndModels}
            onOpenModelDetails={(name) => navigateToView({ type: "model-details", modelName: name })}
            onOpenModelProfile={(name) => navigateToView({ type: "model-profile", modelName: name })}
            onOpenThemeBuilder={(themeId, baseThemeId) =>
              navigateToView({ type: "theme-builder", editingThemeId: themeId, baseThemeId })
            }
            onClearAllData={handleClearAllData}
            conversations={conversations}
            activeConversationId={activeConversationId}
          />
        )}

        {activeView.type === "theme-builder" && (
          <CustomThemeBuilderView
            initialThemeId={activeView.editingThemeId}
            baseThemeId={activeView.baseThemeId}
            onBack={handleBack}
            onSaveTheme={(savedTheme) => {
              ThemeEngine.saveCustomTheme(savedTheme);
              const updated = { ...settings, theme: savedTheme.id };
              setSettings(updated);
              Storage.saveSettings(updated);
              ThemeEngine.applyTheme(savedTheme.id);
              handleBack();
            }}
          />
        )}

        {activeView.type === "model-selection" && (
          <ModelSelectionView
            models={models}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
            onRefreshModels={checkHealthAndModels}
            isLoadingModels={isLoadingModels}
            settings={settings}
            onBack={handleBack}
            onOpenModelDetails={(name) => navigateToView({ type: "model-details", modelName: name })}
            onOpenModelProfile={(name) => navigateToView({ type: "model-profile", modelName: name })}
            selectedImageModel={selectedImageModel}
            imageModels={imageModels}
            isLoadingImageModels={isLoadingImageModels}
            onSelectImageModel={handleSelectImageModel}
            onRefreshImageModels={checkServicesAndImageModels}
            ollamaServiceState={servicesStatus.ollama?.state || (connectionStatus.isConnected ? "Running" : "Stopped")}
            onStartOllama={handleStartOllama}
            onStopOllama={handleStopOllama}
            comfyServiceState={servicesStatus.comfyui?.state || "Stopped"}
            onStartComfy={handleStartComfy}
            onStopComfy={handleStopComfy}
          />
        )}

        {activeView.type === "model-details" && (
          <ModelDetailsView
            modelName={activeView.modelName}
            models={models}
            settings={settings}
            onBack={handleBack}
            onSelectModel={handleSelectModel}
            isSelected={selectedModel === activeView.modelName}
            onOpenModelProfile={(name) => navigateToView({ type: "model-profile", modelName: name })}
          />
        )}

        {activeView.type === "model-profile" && (
          <ModelProfileView
            modelName={activeView.modelName}
            models={models}
            imageModels={imageModels}
            settings={settings}
            onBack={handleBack}
            onSaveProfile={handleSaveModelProfile}
            onSaveImageProfile={handleSaveImageModelProfile}
            onOpenModelDetails={(name) => navigateToView({ type: "model-details", modelName: name })}
          />
        )}

        {activeView.type === "troubleshooter" && (
          <TroubleshooterView
            settings={settings}
            connectionStatus={connectionStatus}
            onRefreshConnection={checkHealthAndModels}
            onBack={handleBack}
          />
        )}

        {activeView.type === "context-explorer" && (
          <ContextExplorerView
            conversations={conversations}
            activeConversationId={activeConversationId}
            selectedModel={selectedModel}
            models={models}
            settings={settings}
            onBack={handleBack}
            language={settings.language}
          />
        )}
      </div>

      {/* Auxiliary Overlays (Ctrl+K Command Palette and Debug Inspector) */}
      <DebugInspectorModal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        debugInfo={lastDebugInfo}
      />

      <QuickCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        conversations={conversations}
        models={models}
        onSelectConversation={handleSelectConversation}
        onSelectModel={handleSelectModel}
        onNewConversation={handleNewConversation}
        onOpenContextExplorer={() => navigateToView({ type: "context-explorer" })}
      />

      {/* Context & Memory Tools Modal (+ Menu Tools) */}
      <ContextToolsModal
        isOpen={contextToolModalState.isOpen}
        onClose={() => setContextToolModalState((prev) => ({ ...prev, isOpen: false }))}
        initialMode={contextToolModalState.mode}
        conversations={conversations}
        activeConversation={activeConversation}
        onInsertText={handleInsertContextText}
        onSwitchConversation={handleSelectConversation}
        onOpenContextExplorer={() => navigateToView({ type: "context-explorer" })}
        language={settings.language}
      />
    </div>
  );
}

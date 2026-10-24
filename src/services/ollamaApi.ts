import {
  AppSettings,
  ChatMessage,
  ConnectionStatus,
  OllamaChatRequest,
  OllamaModel,
  OllamaModelShowInfo,
  OllamaStreamChunk,
  ModelCapabilityInfo,
  ModelTestResult,
} from "../types";

export class OllamaApiError extends Error {
  status?: number;
  details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = "OllamaApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Resolves the request URL and headers based on AppSettings
 */
function getApiEndpoint(path: string, settings: AppSettings): { url: string; headers: Record<string, string> } {
  let cleanEndpoint = settings.endpoint.replace(/\/$/, "");
  // Normalize localhost to 127.0.0.1 so offline fetching never fails due to DNS lookups
  if (cleanEndpoint.includes("localhost")) {
    cleanEndpoint = cleanEndpoint.replace("://localhost", "://127.0.0.1");
  }

  const pathWithoutLeadingSlash = path.replace(/^\//, "");

  if (settings.connectionMode === "proxy") {
    // Route through backend Express server proxy /api/ollama/*
    return {
      url: `/api/ollama/${pathWithoutLeadingSlash}`,
      headers: {
        "Content-Type": "application/json",
        "X-Ollama-Endpoint": cleanEndpoint,
      },
    };
  } else {
    // Direct browser fetch to local Ollama instance
    return {
      url: `${cleanEndpoint}/api/${pathWithoutLeadingSlash}`,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
}

export const isVisionModel = (
  modelName: string,
  modelDetails?: OllamaModel["details"],
  showInfo?: OllamaModelShowInfo | null
): boolean => {
  return detectModelCapabilities(modelName, showInfo, { name: modelName, model: modelName, modified_at: "", size: 0, digest: "", details: modelDetails }).supportsVision;
};

export const isThinkingModel = (
  modelName: string,
  modelDetails?: OllamaModel["details"],
  showInfo?: OllamaModelShowInfo | null
): boolean => {
  return detectModelCapabilities(modelName, showInfo, { name: modelName, model: modelName, modified_at: "", size: 0, digest: "", details: modelDetails }).supportsThinking === "supported";
};

export function detectModelCapabilities(
  modelName: string,
  showInfo?: OllamaModelShowInfo | null,
  modelObj?: OllamaModel
): ModelCapabilityInfo {
  const nameLower = (modelName || "").toLowerCase();
  const familyLower = (modelObj?.details?.family || showInfo?.details?.family || "").toLowerCase();
  const familiesLower = (modelObj?.details?.families || showInfo?.details?.families || []).map((f) => f.toLowerCase());
  const templateLower = (showInfo?.template || "").toLowerCase();
  const paramsLower = (showInfo?.parameters || "").toLowerCase();
  const modelfileLower = (showInfo?.modelfile || "").toLowerCase();

  // Vision detection
  const visionKeywords = [
    "vision",
    "vl",
    "llava",
    "bakllava",
    "moondream",
    "minicpm-v",
    "qwen-vl",
    "qwen2-vl",
    "qwen3-vl",
    "cogvlm",
    "smolvlm",
    "mllm",
    "mllama",
    "clip",
    "paligemma",
    "gemma3",
  ];
  const supportsVision =
    visionKeywords.some((kw) => nameLower.includes(kw)) ||
    visionKeywords.some((kw) => familyLower.includes(kw)) ||
    familiesLower.some((f) => visionKeywords.some((kw) => f.includes(kw))) ||
    templateLower.includes("<image>") ||
    templateLower.includes("vision") ||
    modelfileLower.includes("vision");

  // Thinking / Reasoning detection
  const thinkingKeywords = [
    "deepseek-r1",
    "r1",
    "qwq",
    "marco-o1",
    "think",
    "reasoning",
    "qwen2.5-coder-think",
    "distill",
    "qwen3",
    "reasoner",
  ];

  let supportsThinking: "supported" | "unsupported" | "unknown" = "unknown";

  if (
    thinkingKeywords.some((kw) => nameLower.includes(kw)) ||
    thinkingKeywords.some((kw) => familyLower.includes(kw)) ||
    templateLower.includes("<think>") ||
    templateLower.includes("think") ||
    paramsLower.includes("think")
  ) {
    supportsThinking = "supported";
  } else if (showInfo || modelObj) {
    supportsThinking = "unsupported";
  }

  // Context length detection
  let contextLength = 4096;
  const ctxMatch =
    paramsLower.match(/num_ctx\s+(\d+)/) || modelfileLower.match(/num_ctx\s+(\d+)/);
  if (ctxMatch && ctxMatch[1]) {
    contextLength = parseInt(ctxMatch[1], 10);
  }

  const family =
    modelObj?.details?.family ||
    showInfo?.details?.family ||
    (familyLower ? familyLower.toUpperCase() : "llama");

  const parameterSize =
    modelObj?.details?.parameter_size ||
    showInfo?.details?.parameter_size ||
    "Unknown";

  const quantization =
    modelObj?.details?.quantization_level ||
    showInfo?.details?.quantization_level ||
    "Unknown";

  return {
    modelName,
    family,
    parameterSize,
    quantization,
    contextLength,
    supportsVision,
    supportsThinking,
    templateSnippet: showInfo?.template ? showInfo.template.slice(0, 100) : undefined,
  };
}

/**
 * Helper function to determine the active system prompt according to priority:
 * 1. Model-specific prompt (if configured & non-empty)
 * 2. Global prompt (if enabled & non-empty)
 * 3. None (no system prompt)
 */
export function getEffectiveSystemPrompt(
  settings: AppSettings,
  model: string
): { prompt: string; source: "model" | "global" | "none" } {
  if (settings.modelSystemPrompts && settings.modelSystemPrompts[model]) {
    const modelPrompt = settings.modelSystemPrompts[model].trim();
    if (modelPrompt) {
      return { prompt: modelPrompt, source: "model" };
    }
  }

  if (settings.enableGlobalSystemPrompt && settings.globalSystemPrompt) {
    const globalPrompt = settings.globalSystemPrompt.trim();
    if (globalPrompt) {
      return { prompt: globalPrompt, source: "global" };
    }
  }

  return { prompt: "", source: "none" };
}

export const OllamaApi = {
  /**
   * Health check to detect if Ollama is running and accessible
   */
  async checkHealth(settings: AppSettings): Promise<ConnectionStatus> {
    const probeEndpoint = async (path: string) => {
      const { url, headers } = getApiEndpoint(path, settings);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: true, data };
        }
      } catch {
        clearTimeout(timeoutId);
      }
      return { ok: false, data: null };
    };

    // 1. Try /api/version
    let res = await probeEndpoint("version");
    if (res.ok) {
      return {
        isConnected: true,
        endpoint: settings.endpoint,
        version: res.data?.version || "Active",
        lastChecked: Date.now(),
        isChecking: false,
      };
    }

    // 2. Fallback: Try /api/tags
    res = await probeEndpoint("tags");
    if (res.ok) {
      return {
        isConnected: true,
        endpoint: settings.endpoint,
        version: "Active",
        lastChecked: Date.now(),
        isChecking: false,
      };
    }

    return {
      isConnected: false,
      endpoint: settings.endpoint,
      lastChecked: Date.now(),
      error: `Local Ollama is not running at ${settings.endpoint}. Run 'ollama serve' in your terminal.`,
      isChecking: false,
    };
  },

  /**
   * Fetch installed models from Ollama (/api/tags)
   */
  async fetchModels(settings: AppSettings): Promise<OllamaModel[]> {
    const { url, headers } = getApiEndpoint("tags", settings);

    try {
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new OllamaApiError(
          errorData.error || `Failed to fetch models (HTTP ${res.status})`,
          res.status,
          errorData.details
        );
      }

      const data = await res.json();
      if (!data.models || !Array.isArray(data.models)) {
        return [];
      }

      return data.models as OllamaModel[];
    } catch (err: any) {
      if (err instanceof OllamaApiError) throw err;
      throw new OllamaApiError(
        `Unable to fetch models from ${settings.endpoint}: ${err.message}`
      );
    }
  },

  /**
   * Fetch detailed info for a specific model (/api/show)
   */
  async fetchModelInfo(
    settings: AppSettings,
    modelName: string
  ): Promise<OllamaModelShowInfo | null> {
    const { url, headers } = getApiEndpoint("show", settings);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: modelName }),
      });

      if (!res.ok) return null;
      return (await res.json()) as OllamaModelShowInfo;
    } catch {
      return null;
    }
  },

  /**
   * Stream chat completions from Ollama (/api/chat)
   */
  async sendChatStream({
    settings,
    model,
    messages,
    systemPrompt,
    signal,
    onChunk,
    onDebugInfo,
    onStats,
    onThinkingWarning,
  }: {
    settings: AppSettings;
    model: string;
    messages: ChatMessage[];
    systemPrompt?: string;
    signal?: AbortSignal;
    onChunk: (chunkText: string, thinkingText?: string) => void;
    onDebugInfo?: (debug: {
      url: string;
      model: string;
      enableThinking: boolean;
      numCtx: number;
      payload: any;
      timestamp: number;
    }) => void;
    onStats?: (stats: {
      evalCount?: number;
      promptEvalCount?: number;
      evalDurationMs?: number;
      totalDurationMs?: number;
      tokensPerSec?: number;
      thinkingTokens?: number;
      answerTokens?: number;
    }) => void;
    onThinkingWarning?: (warning: string) => void;
  }): Promise<void> {
    const { url, headers } = getApiEndpoint("chat", settings);

    // Format messages for Ollama payload
    const ollamaMessages: OllamaChatRequest["messages"] = [];

    // System prompt resolution
    let effectivePrompt = systemPrompt;
    if (effectivePrompt === undefined) {
      effectivePrompt = getEffectiveSystemPrompt(settings, model).prompt;
    }

    if (effectivePrompt && effectivePrompt.trim()) {
      ollamaMessages.push({
        role: "system",
        content: effectivePrompt.trim(),
      });
    }

    // Process message history
    for (const msg of messages) {
      let content = msg.content;

      // Handle non-image text attachments by appending them as document context
      if (msg.attachments && msg.attachments.length > 0) {
        const textFiles = msg.attachments.filter((a) => !a.isImage && a.textContent);
        if (textFiles.length > 0) {
          const formattedFiles = textFiles
            .map((f) => `--- File: ${f.name} ---\n${f.textContent}\n--- End File ---`)
            .join("\n\n");
          content = `${content}\n\n${formattedFiles}`;
        }
      }

      // Collect image base64 strings for vision models
      const imageAttachments = (msg.attachments || [])
        .filter((a) => a.isImage && a.base64Data)
        .map((a) => a.base64Data!);

      ollamaMessages.push({
        role: msg.role,
        content: content,
        ...(imageAttachments.length > 0 ? { images: imageAttachments } : {}),
      });
    }

    const thinkingMode = settings.thinkingMode || (settings.enableThinking ? "on" : "auto");
    let isThinkingEnabled = false;

    if (thinkingMode === "on") {
      isThinkingEnabled = true;
    } else if (thinkingMode === "auto") {
      const caps = detectModelCapabilities(model);
      isThinkingEnabled = caps.supportsThinking === "supported";
    } else {
      isThinkingEnabled = false;
    }

    const payload: any = {
      model,
      messages: ollamaMessages,
      stream: true,
      think: isThinkingEnabled,
      options: {
        temperature: settings.temperature,
        top_p: settings.topP,
        num_ctx: settings.numCtx,
        think: isThinkingEnabled,
        reasoning: isThinkingEnabled,
      },
    };

    if (!isThinkingEnabled) {
      payload.options.reasoning_effort = "low";
    }

    // Invoke debug payload callback
    onDebugInfo?.({
      url,
      model,
      enableThinking: isThinkingEnabled,
      numCtx: settings.numCtx,
      payload,
      timestamp: Date.now(),
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new OllamaApiError("Request was cancelled by user.");
      }
      throw new OllamaApiError(
        `Failed to communicate with Ollama: ${err.message || "Network error"}`
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let parsedErr = "Ollama returned an error response.";
      try {
        const json = JSON.parse(errText);
        if (json.error) parsedErr = json.error;
      } catch {
        if (errText) parsedErr = errText;
      }

      // Intercept context limit error
      if (parsedErr.includes("exceeds") && parsedErr.includes("context size")) {
        throw new OllamaApiError(
          `Request exceeds model context size limit (${settings.numCtx} tokens).\n\nTry:\n• Increasing Context Size in Settings\n• Starting a new chat session\n• Removing large file/image attachments`,
          response.status,
          parsedErr
        );
      }

      throw new OllamaApiError(`Ollama Error (${response.status}): ${parsedErr}`, response.status, parsedErr);
    }

    if (!response.body) {
      throw new OllamaApiError("Response body is empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    let totalContentLength = 0;
    let totalThinkingLength = 0;
    let inThinkTag = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last partial line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk: any = JSON.parse(trimmed);

          if (chunk.error) {
            throw new OllamaApiError(`Ollama stream error: ${chunk.error}`);
          }

          if (chunk.done) {
            const evalCount = chunk.eval_count || Math.ceil(totalContentLength / 4);
            const promptEvalCount = chunk.prompt_eval_count || 0;
            const evalDurationMs = chunk.eval_duration ? Math.round(chunk.eval_duration / 1e6) : 0;
            const totalDurationMs = chunk.total_duration ? Math.round(chunk.total_duration / 1e6) : 0;
            const tokensPerSec = evalDurationMs > 0 ? Number(((evalCount / evalDurationMs) * 1000).toFixed(1)) : 0;

            onStats?.({
              evalCount,
              promptEvalCount,
              evalDurationMs,
              totalDurationMs,
              tokensPerSec,
              thinkingTokens: Math.ceil(totalThinkingLength / 4),
              answerTokens: Math.ceil(totalContentLength / 4),
            });
          }

          if (chunk.message) {
            let contentText = chunk.message.content || "";
            let thinkingText = chunk.message.thinking || chunk.message.reasoning || chunk.message.reasoning_content || "";

            if (!isThinkingEnabled) {
              if (thinkingText || contentText.includes("<think>")) {
                onThinkingWarning?.("⚠ This model appears to be ignoring the Thinking OFF setting.");
              }
              // Strip any thinking output if thinking is OFF
              thinkingText = "";
              if (contentText.includes("<think>")) {
                inThinkTag = true;
              }
              if (inThinkTag) {
                if (contentText.includes("</think>")) {
                  inThinkTag = false;
                  contentText = contentText.split("</think>")[1] || "";
                } else {
                  contentText = "";
                }
              }
              if (contentText) {
                contentText = contentText.replace(/<think>[\s\S]*?<\/think>/gi, "");
              }
            } else {
              // Handle embedded <think> tags when thinking is ON
              if (contentText.includes("<think>")) {
                inThinkTag = true;
                const parts = contentText.split("<think>");
                if (parts[0]) {
                  totalContentLength += parts[0].length;
                  onChunk(parts[0], undefined);
                }
                contentText = parts[1] || "";
              }

              if (inThinkTag && contentText.includes("</think>")) {
                inThinkTag = false;
                const parts = contentText.split("</think>");
                if (parts[0]) {
                  totalThinkingLength += parts[0].length;
                  onChunk("", parts[0]);
                }
                if (parts[1]) {
                  totalContentLength += parts[1].length;
                  onChunk(parts[1], undefined);
                }
                continue;
              }

              if (inThinkTag) {
                thinkingText = contentText;
                contentText = "";
              }
            }

            if (contentText) totalContentLength += contentText.length;
            if (thinkingText) totalThinkingLength += thinkingText.length;

            onChunk(contentText, thinkingText);
          }
        } catch (parseErr) {
          if (parseErr instanceof OllamaApiError) throw parseErr;
        }
      }
    }

    if (totalContentLength === 0 && totalThinkingLength > 0) {
      onChunk(
        "\n\n*(Model completed reasoning phase but produced no final text response. Ask it to summarize its output.)*",
        undefined
      );
    } else if (totalContentLength === 0 && totalThinkingLength === 0) {
      throw new OllamaApiError(
        "Model returned an empty response. Please verify Ollama is loaded and has sufficient memory."
      );
    }
  },

  /**
   * Performs automated tests on a specific installed model
   */
  async testModel(
    settings: AppSettings,
    modelName: string,
    showInfo?: OllamaModelShowInfo | null,
    modelObj?: OllamaModel
  ): Promise<import("../types").ModelTestResult> {
    const caps = detectModelCapabilities(modelName, showInfo, modelObj);
    const result: import("../types").ModelTestResult = {
      basicChat: { passed: false },
      streaming: { passed: false },
      isTesting: false,
      timestamp: Date.now(),
    };

    const startTime = Date.now();

    // 1. Basic Chat & Streaming test
    try {
      let receivedChunk = false;
      await OllamaApi.sendChatStream({
        settings,
        model: modelName,
        messages: [{ id: "test-1", role: "user", content: "Say hello", timestamp: Date.now() }],
        onChunk: (text) => {
          if (text) receivedChunk = true;
        },
      });
      result.basicChat = { passed: true, durationMs: Date.now() - startTime };
      result.streaming = { passed: receivedChunk, durationMs: Date.now() - startTime };
    } catch (err: any) {
      result.basicChat = { passed: false, error: err.message };
      result.streaming = { passed: false, error: err.message };
    }

    // 2. Thinking ON test
    try {
      let producedThinking = false;
      await OllamaApi.sendChatStream({
        settings: { ...settings, thinkingMode: "on" },
        model: modelName,
        messages: [{ id: "test-2", role: "user", content: "Solve 2+2 step by step", timestamp: Date.now() }],
        onChunk: (_, thinking) => {
          if (thinking) producedThinking = true;
        },
      });
      result.thinkingOn = { passed: true, producedThinking };
    } catch (err: any) {
      result.thinkingOn = { passed: false, error: err.message };
    }

    // 3. Thinking OFF test
    try {
      let producedThinkingWhenOff = false;
      await OllamaApi.sendChatStream({
        settings: { ...settings, thinkingMode: "off" },
        model: modelName,
        messages: [{ id: "test-3", role: "user", content: "What is 2+2?", timestamp: Date.now() }],
        onChunk: (text, thinking) => {
          if (thinking || text.includes("<think>")) producedThinkingWhenOff = true;
        },
      });
      result.thinkingOff = { passed: true, respectsOff: !producedThinkingWhenOff };
    } catch (err: any) {
      result.thinkingOff = { passed: false, error: err.message };
    }

    // 4. Vision test (if vision model)
    if (caps.supportsVision) {
      try {
        const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        await OllamaApi.sendChatStream({
          settings,
          model: modelName,
          messages: [
            {
              id: "test-4",
              role: "user",
              content: "Describe image",
              attachments: [
                {
                  id: "img-1",
                  name: "test.png",
                  size: 100,
                  type: "image/png",
                  base64Data: tinyPng,
                  isImage: true,
                },
              ],
              timestamp: Date.now(),
            },
          ],
          onChunk: () => {},
        });
        result.vision = { passed: true };
      } catch (err: any) {
        result.vision = { passed: false, error: err.message };
      }
    }

    return result;
  },
};

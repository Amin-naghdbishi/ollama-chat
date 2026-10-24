import {
  AIProvider,
  ChatMessage,
  ConnectionStatus,
  UnifiedModel,
  AppSettings,
} from "../types";

export class OpenAiApiError extends Error {
  status?: number;
  details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = "OpenAiApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Resolves fetch URL and headers based on provider configuration and proxy preference
 */
function resolveEndpoint(
  provider: AIProvider,
  path: string,
  settings: AppSettings
): { url: string; headers: Record<string, string> } {
  let cleanBase = (provider.endpoint || "").trim().replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  const fullTargetUrl = `${cleanBase}/${cleanPath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.apiKey) {
    headers["Authorization"] = provider.apiKey.startsWith("Bearer ")
      ? provider.apiKey
      : `Bearer ${provider.apiKey}`;
  }

  if (provider.organizationId) {
    headers["OpenAI-Organization"] = provider.organizationId;
  }

  if (provider.type === "openrouter") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "Ollama Desktop Multi-Provider";
  }

  // If proxy mode is requested or endpoint is localhost/LAN in a browser
  const useProxy = provider.connectionMode !== "direct";

  if (useProxy) {
    return {
      url: `/api/provider-proxy`,
      headers: {
        ...headers,
        "x-target-url": fullTargetUrl,
        ...(provider.apiKey ? { "x-target-api-key": provider.apiKey } : {}),
        ...(provider.organizationId ? { "x-target-org-id": provider.organizationId } : {}),
      },
    };
  }

  return {
    url: fullTargetUrl,
    headers,
  };
}

export const OpenAiApi = {
  /**
   * Health check / Connection test for OpenAI-compatible provider
   */
  async checkHealth(provider: AIProvider, settings: AppSettings): Promise<ConnectionStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const { url, headers } = resolveEndpoint(provider, "models", settings);
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const count = Array.isArray(data?.data) ? data.data.length : undefined;
        return {
          isConnected: true,
          endpoint: provider.endpoint,
          version: count !== undefined ? `${count} models available` : "Active",
          lastChecked: Date.now(),
          isChecking: false,
        };
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error?.message || errData.error || `HTTP ${res.status} error`;
        return {
          isConnected: false,
          endpoint: provider.endpoint,
          lastChecked: Date.now(),
          error: `Provider returned error: ${msg}`,
          isChecking: false,
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        isConnected: false,
        endpoint: provider.endpoint,
        lastChecked: Date.now(),
        error: `Could not connect to ${provider.endpoint}: ${err.message || "Network timeout or unreachable"}`,
        isChecking: false,
      };
    }
  },

  /**
   * Fetch model list from OpenAI-compatible endpoint (/models)
   */
  async fetchModels(provider: AIProvider, settings: AppSettings): Promise<UnifiedModel[]> {
    const { url, headers } = resolveEndpoint(provider, "models", settings);

    try {
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new OpenAiApiError(
          errData.error?.message || errData.error || `Failed to fetch models (HTTP ${res.status})`,
          res.status
        );
      }

      const data = await res.json();
      const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      return rawList.map((item: any): UnifiedModel => {
        const rawId = item.id || item.name || "unknown-model";
        const name = item.name || rawId;
        const lower = rawId.toLowerCase();

        const supportsVision =
          lower.includes("vision") ||
          lower.includes("vl") ||
          lower.includes("4o") ||
          lower.includes("claude-3") ||
          lower.includes("gemini") ||
          lower.includes("llava") ||
          lower.includes("pixtral");

        const isReasoning =
          lower.includes("r1") ||
          lower.includes("o1") ||
          lower.includes("o3") ||
          lower.includes("reasoner") ||
          lower.includes("qwq") ||
          lower.includes("deepseek");

        const contextLength = item.context_length || item.max_tokens || 8192;

        return {
          id: `${provider.id}::${rawId}`,
          rawId,
          name,
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          contextLength,
          isInstalled: true,
          isAvailable: true,
          supportsVision,
          supportsThinking: isReasoning ? "supported" : "unknown",
          canDelete: false,
          canDownload: false,
          description: item.description,
        };
      });
    } catch (err: any) {
      if (err instanceof OpenAiApiError) throw err;
      throw new OpenAiApiError(`Failed to fetch models from ${provider.name}: ${err.message}`);
    }
  },

  /**
   * Stream chat completions via OpenAI-compatible SSE format
   */
  async sendChatStream({
    provider,
    settings,
    model,
    messages,
    systemPrompt,
    signal,
    onChunk,
    onDebugInfo,
    onStats,
  }: {
    provider: AIProvider;
    settings: AppSettings;
    model: string;
    messages: ChatMessage[];
    systemPrompt?: string;
    signal?: AbortSignal;
    onChunk: (chunkText: string, thinkingText?: string) => void;
    onDebugInfo?: (debug: any) => void;
    onStats?: (stats: any) => void;
  }): Promise<void> {
    const { url, headers } = resolveEndpoint(provider, "chat/completions", settings);

    // Format messages for OpenAI Chat format
    const formattedMessages: any[] = [];

    if (systemPrompt && systemPrompt.trim()) {
      formattedMessages.push({
        role: "system",
        content: systemPrompt.trim(),
      });
    }

    for (const msg of messages) {
      const imageAttachments = (msg.attachments || []).filter((a) => a.isImage && (a.dataUrl || a.base64Data));
      const textFiles = (msg.attachments || []).filter((a) => !a.isImage && a.textContent);

      let textContent = msg.content;
      if (textFiles.length > 0) {
        const fileBlock = textFiles
          .map((f) => `--- File: ${f.name} ---\n${f.textContent}\n--- End File ---`)
          .join("\n\n");
        textContent = `${textContent}\n\n${fileBlock}`;
      }

      if (imageAttachments.length > 0) {
        // Multi-modal message content
        const contentParts: any[] = [{ type: "text", text: textContent }];
        for (const img of imageAttachments) {
          const imgUrl = img.dataUrl || (img.base64Data ? `data:${img.type || "image/png"};base64,${img.base64Data}` : "");
          if (imgUrl) {
            contentParts.push({
              type: "image_url",
              image_url: { url: imgUrl },
            });
          }
        }
        formattedMessages.push({
          role: msg.role,
          content: contentParts,
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: textContent,
        });
      }
    }

    const payload: any = {
      model,
      messages: formattedMessages,
      stream: true,
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.numCtx ? Math.min(settings.numCtx, 8192) : 4096,
    };

    onDebugInfo?.({
      url,
      provider: provider.name,
      model,
      payload,
      timestamp: Date.now(),
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let parsedErr = "Provider returned an error.";
      try {
        const json = JSON.parse(errText);
        if (json.error?.message) parsedErr = json.error.message;
        else if (json.error) parsedErr = json.error;
      } catch {
        if (errText) parsedErr = errText;
      }
      throw new OpenAiApiError(`Provider Error (${response.status}): ${parsedErr}`, response.status, parsedErr);
    }

    if (!response.body) {
      throw new OpenAiApiError("Response body is empty.");
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
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (trimmed === "data: [DONE]") {
          onStats?.({
            evalCount: Math.ceil(totalContentLength / 4),
            thinkingTokens: Math.ceil(totalThinkingLength / 4),
          });
          return;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const choice = parsed.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            let contentChunk = delta?.content || "";
            let thinkingChunk = delta?.reasoning_content || delta?.reasoning || delta?.thinking || "";

            // Handle embedded <think> tags if model emits them in content
            if (contentChunk.includes("<think>")) {
              inThinkTag = true;
              const parts = contentChunk.split("<think>");
              if (parts[0]) {
                totalContentLength += parts[0].length;
                onChunk(parts[0], undefined);
              }
              contentChunk = parts[1] || "";
            }

            if (inThinkTag && contentChunk.includes("</think>")) {
              inThinkTag = false;
              const parts = contentChunk.split("</think>");
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
              thinkingChunk = contentChunk;
              contentChunk = "";
            }

            if (contentChunk) totalContentLength += contentChunk.length;
            if (thinkingChunk) totalThinkingLength += thinkingChunk.length;

            onChunk(contentChunk, thinkingChunk);
          } catch {
            // Ignore partial SSE JSON parse
          }
        }
      }
    }
  },
};

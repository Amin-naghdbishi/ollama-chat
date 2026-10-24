import { ServicesStatusResponse, ServiceStatusInfo } from "../types";

export interface ComfyPromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, any>;
}

export interface ComfyHistoryOutput {
  images?: Array<{
    filename: string;
    subfolder: string;
    type: string;
  }>;
}

export interface ComfyHistoryItem {
  prompt: any[];
  outputs: Record<string, ComfyHistoryOutput>;
  status?: {
    status_str: string;
    completed: boolean;
    messages?: any[];
  };
}

class ComfyApiService {
  private isGenerating = false;

  private resolveUrl(path: string, endpoint?: string): { url: string; headers: Record<string, string> } {
    const cleanEndpoint = (endpoint || "http://127.0.0.1:8188").replace(/\/$/, "");
    const subPath = path.replace(/^\//, "");

    if (typeof window !== "undefined") {
      return {
        url: `/api/comfyui/${subPath}`,
        headers: {
          "X-ComfyUI-Endpoint": cleanEndpoint,
        },
      };
    }

    return {
      url: `${cleanEndpoint}/${subPath}`,
      headers: {},
    };
  }

  private resolveServiceUrl(path: string): string {
    const subPath = path.replace(/^\//, "");
    if (typeof window !== "undefined") {
      return `/${subPath}`;
    }
    return `http://127.0.0.1:3000/${subPath}`;
  }

  /**
   * Fetch services status (Ollama and ComfyUI)
   */
  async getServicesStatus(ollamaUrl?: string, comfyUrl?: string): Promise<ServicesStatusResponse> {
    const headers: Record<string, string> = {};
    if (ollamaUrl) headers["X-Ollama-Endpoint"] = ollamaUrl;
    if (comfyUrl) headers["X-ComfyUI-Endpoint"] = comfyUrl;

    const res = await fetch(this.resolveServiceUrl("api/services/status"), { headers });
    if (!res.ok) {
      throw new Error(`Failed to check service status: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Start a service
   */
  async startService(service: "ollama" | "comfyui"): Promise<{ success: boolean; state: string; message?: string }> {
    const res = await fetch(this.resolveServiceUrl(`api/services/${service}/start`), { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed to trigger ${service} start: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Stop a service
   */
  async stopService(service: "ollama" | "comfyui"): Promise<{ success: boolean; state: string; message?: string }> {
    const res = await fetch(this.resolveServiceUrl(`api/services/${service}/stop`), { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed to trigger ${service} stop: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch available checkpoints dynamically from ComfyUI
   */
  async fetchCheckpoints(endpoint?: string): Promise<string[]> {
    // 1. Try CheckpointLoaderSimple object info
    try {
      const { url, headers } = this.resolveUrl("object_info/CheckpointLoaderSimple", endpoint);
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const ckptList = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
        if (Array.isArray(ckptList) && ckptList.length > 0) {
          return ckptList;
        }
      }
    } catch (e) {
      console.warn("CheckpointLoaderSimple check failed, trying models/checkpoints:", e);
    }

    // 2. Try /models/checkpoints
    try {
      const { url, headers } = this.resolveUrl("models/checkpoints", endpoint);
      const res = await fetch(url, { headers });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (e) {
      console.warn("ComfyUI /models/checkpoints failed, trying full object_info:", e);
    }

    // 3. Fallback to full /object_info
    try {
      const { url, headers } = this.resolveUrl("object_info", endpoint);
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const ckptList = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
        if (Array.isArray(ckptList) && ckptList.length > 0) {
          return ckptList;
        }
      }
    } catch (e) {
      console.error("Failed to fetch ComfyUI checkpoints:", e);
    }

    return [];
  }

  /**
   * Interrupt current generation
   */
  async interrupt(endpoint?: string): Promise<void> {
    try {
      const { url, headers } = this.resolveUrl("interrupt", endpoint);
      await fetch(url, {
        method: "POST",
        headers,
      });
    } catch (e) {
      console.warn("ComfyUI interrupt call failed:", e);
    }
    this.isGenerating = false;
  }

  /**
   * Queue text-to-image prompt with ComfyUI
   */
  async queuePrompt(params: {
    checkpoint: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    seed?: number;
    endpoint?: string;
    clientId?: string;
  }): Promise<ComfyPromptResponse> {
    if (this.isGenerating) {
      throw new Error("Another image generation job is currently in progress. Please wait for it to complete.");
    }

    const {
      checkpoint,
      prompt,
      negativePrompt = "text, watermark, blurry, low quality, distortion, deformed, ugly, bad anatomy, bad hands, missing fingers",
      width = 512,
      height = 512,
      steps = 20,
      cfg = 7,
      seed = Math.floor(Math.random() * 1000000000),
      endpoint,
      clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    } = params;

    // Build standard text-to-image graph
    const workflow = {
      "3": {
        class_type: "KSampler",
        inputs: {
          cfg,
          denoise: 1,
          latent_image: ["5", 0],
          model: ["4", 0],
          negative: ["7", 0],
          positive: ["6", 0],
          sampler_name: "euler",
          scheduler: "normal",
          seed,
          steps,
        },
      },
      "4": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: checkpoint,
        },
      },
      "5": {
        class_type: "EmptyLatentImage",
        inputs: {
          batch_size: 1,
          height,
          width,
        },
      },
      "6": {
        class_type: "CLIPTextEncode",
        inputs: {
          clip: ["4", 1],
          text: prompt,
        },
      },
      "7": {
        class_type: "CLIPTextEncode",
        inputs: {
          clip: ["4", 1],
          text: negativePrompt,
        },
      },
      "8": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["3", 0],
          vae: ["4", 2],
        },
      },
      "9": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "OllamaChat",
          images: ["8", 0],
        },
      },
    };

    this.isGenerating = true;

    try {
      const { url: promptUrl, headers: promptHeaders } = this.resolveUrl("prompt", endpoint);
      const res = await fetch(promptUrl, {
        method: "POST",
        headers: {
          ...promptHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: workflow,
          client_id: clientId,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.isGenerating = false;
        throw new Error(`ComfyUI prompt error: ${res.status} - ${errorText}`);
      }

      const data: ComfyPromptResponse = await res.json();
      if (data.node_errors && Object.keys(data.node_errors).length > 0) {
        this.isGenerating = false;
        throw new Error(`ComfyUI workflow error: ${JSON.stringify(data.node_errors)}`);
      }

      return data;
    } catch (err) {
      this.isGenerating = false;
      throw err;
    }
  }

  /**
   * Track prompt progress until image is saved and persist it
   */
  async trackPrompt(params: {
    promptId: string;
    totalSteps?: number;
    endpoint?: string;
    onProgress?: (progress: { step: number; totalSteps: number; percent: number }) => void;
    signal?: AbortSignal;
  }): Promise<{ imageUrl: string; filename: string }> {
    const { promptId, totalSteps = 20, endpoint, onProgress, signal } = params;

    let currentStep = 0;
    const maxPollAttempts = 300; // up to 4-5 minutes
    let attempt = 0;

    try {
      while (attempt < maxPollAttempts) {
        if (signal?.aborted) {
          await this.interrupt(endpoint);
          throw new DOMException("Generation aborted by user", "AbortError");
        }

        attempt++;
        await new Promise((r) => setTimeout(r, 800));

        // Check history
        const { url: historyUrl, headers: historyHeaders } = this.resolveUrl(`history/${promptId}`, endpoint);
        const histRes = await fetch(historyUrl, { headers: historyHeaders });
        if (histRes.ok) {
          const histData: Record<string, ComfyHistoryItem> = await histRes.json();
          const item = histData[promptId];

          if (item) {
            // Check outputs for saved image
            if (item.outputs) {
              for (const nodeId of Object.keys(item.outputs)) {
                const nodeOutput = item.outputs[nodeId];
                if (nodeOutput?.images && nodeOutput.images.length > 0) {
                  const img = nodeOutput.images[0];
                  const viewSubpath = `view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
                  const { url: viewUrl, headers: viewHeaders } = this.resolveUrl(viewSubpath, endpoint);

                  // Persist to local server disk storage
                  let persistentUrl = viewUrl;
                  try {
                    const imgRes = await fetch(viewUrl, { headers: viewHeaders });
                    if (imgRes.ok) {
                      const blob = await imgRes.blob();
                      const arrayBuffer = await blob.arrayBuffer();
                      let base64 = "";
                      if (typeof Buffer !== "undefined") {
                        base64 = Buffer.from(arrayBuffer).toString("base64");
                      } else {
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = "";
                        for (let i = 0; i < bytes.byteLength; i++) {
                          binary += String.fromCharCode(bytes[i]);
                        }
                        base64 = btoa(binary);
                      }
                      const base64Data = `data:${blob.type || "image/png"};base64,${base64}`;

                      const saveRes = await fetch(this.resolveServiceUrl("api/generated-images"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          dataUrl: base64Data,
                          filename: img.filename,
                        }),
                      });

                      if (saveRes.ok) {
                        const saved = await saveRes.json();
                        persistentUrl = saved.url;
                      }
                    }
                  } catch (e) {
                    console.warn("Failed to persist image to backend disk, falling back to direct URL:", e);
                  }

                  this.isGenerating = false;
                  return { imageUrl: persistentUrl, filename: img.filename };
                }
              }
            }

            if (item.status && item.status.completed) {
              this.isGenerating = false;
              throw new Error("ComfyUI generation completed but no output image was produced.");
            }
          }
        }

        // Simulate step progression for responsive feedback
        if (currentStep < totalSteps) {
          currentStep = Math.min(totalSteps - 1, currentStep + 1);
          const percent = Math.round((currentStep / totalSteps) * 100);
          onProgress?.({ step: currentStep, totalSteps, percent });
        }
      }

      this.isGenerating = false;
      throw new Error("ComfyUI generation timed out.");
    } catch (err) {
      this.isGenerating = false;
      throw err;
    }
  }
}

export const ComfyApi = new ComfyApiService();

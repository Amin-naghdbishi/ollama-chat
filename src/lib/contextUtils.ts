import { ChatMessage, FileAttachment } from "../types";

/**
 * Estimates token count for text using a standard heuristic (~4 chars per token).
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Estimates token count for an attachment (image vs text/code file).
 */
export function estimateAttachmentTokens(attachment: FileAttachment): number {
  if (attachment.isImage) {
    // Standard vision model patch allocation (e.g. Qwen2/3-VL or LLaVA allocates ~800-1100 tokens per resized image)
    return 950;
  }
  if (attachment.textContent) {
    return estimateTextTokens(attachment.textContent);
  }
  return 0;
}

/**
 * Estimates total tokens for a set of formatted chat messages including system prompt & attachments.
 */
export function estimateTotalPromptTokens(
  messages: ChatMessage[],
  systemPrompt?: string
): number {
  let total = 0;

  if (systemPrompt) {
    total += estimateTextTokens(systemPrompt) + 10;
  }

  for (const msg of messages) {
    total += estimateTextTokens(msg.content) + 8; // Message wrapper overhead
    if (msg.attachments) {
      for (const att of msg.attachments) {
        total += estimateAttachmentTokens(att);
      }
    }
  }

  return Math.ceil(total);
}

/**
 * Prunes conversation history for API payload so it fits safely within the target num_ctx limit.
 * Always keeps:
 * 1. System prompt
 * 2. Current / latest user message + all its attachments
 * 3. As many recent history messages as possible within the capacity limit.
 *
 * NOTE: UI conversation history is NOT modified; only the array sent to Ollama is pruned.
 */
export function pruneMessagesForContext(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  maxContextTokens: number,
  reserveOutputTokens = 1024
): {
  prunedMessages: ChatMessage[];
  estimatedPromptTokens: number;
  isPruned: boolean;
  totalOriginalMessages: number;
  includedMessagesCount: number;
} {
  if (messages.length === 0) {
    return {
      prunedMessages: [],
      estimatedPromptTokens: estimateTextTokens(systemPrompt || ""),
      isPruned: false,
      totalOriginalMessages: 0,
      includedMessagesCount: 0,
    };
  }

  const capacity = Math.max(1024, maxContextTokens - reserveOutputTokens);

  // System prompt token cost
  const systemTokens = systemPrompt ? estimateTextTokens(systemPrompt) + 10 : 0;

  // Latest message (must be included)
  const latestMessage = messages[messages.length - 1];
  let currentCost = systemTokens + estimateTotalPromptTokens([latestMessage]);

  const history = messages.slice(0, messages.length - 1);
  const includedHistory: ChatMessage[] = [];

  // Iterate backwards through history, adding recent messages until capacity is reached
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const msgTokens = estimateTotalPromptTokens([msg]);

    if (currentCost + msgTokens <= capacity) {
      includedHistory.unshift(msg);
      currentCost += msgTokens;
    } else {
      // Cannot fit older messages
      break;
    }
  }

  const prunedMessages = [...includedHistory, latestMessage];
  const isPruned = prunedMessages.length < messages.length;

  return {
    prunedMessages,
    estimatedPromptTokens: currentCost,
    isPruned,
    totalOriginalMessages: messages.length,
    includedMessagesCount: prunedMessages.length,
  };
}

/**
 * Resizes and compresses image files client-side before base64 encoding.
 * Keeps max dimension <= 1400px and exports clean JPEG at 0.85 quality.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1400,
  quality = 0.85
): Promise<{ dataUrl: string; base64Data: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image format"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw and compress image
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64Data = dataUrl.split(",")[1];

        resolve({
          dataUrl,
          base64Data,
          width,
          height,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

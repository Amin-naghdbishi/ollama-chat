import { ChatMessage, AppSettings } from "../types";
import { ProviderService } from "./providerService";

/**
 * Detects explicit image generation requests while avoiding false positives
 */
export function detectImageIntent(message: string): { isImageRequest: boolean; extractedSubject?: string } {
  if (!message || typeof message !== "string") {
    return { isImageRequest: false };
  }

  const clean = message.trim().toLowerCase();

  // Negative patterns: questions about image concepts, models, or theoretical capability
  const negativePatterns = [
    /\b(how\s+do|how\s+does|how\s+to|what\s+is|what\s+are|explain|describe\s+how)\b.*\b(image|diffusion|comfyui|checkpoint|generation)\b/,
    /\b(can\s+you|do\s+you\s+know|are\s+you\s+able\s+to)\s+(generate|create|make)\s+images?\s*\?/,
    /\bwhy\s+(do|does|is|are)\b.*\b(image|generation)\b/,
    /\bthe\s+concept\s+of\b/,
    /\bcode\s+for\b/,
    /\bwrite\s+a\s+(python|javascript|script|program)\b/,
  ];

  for (const neg of negativePatterns) {
    if (neg.test(clean)) {
      return { isImageRequest: false };
    }
  }

  // Explicit positive patterns for image generation
  const positivePatterns = [
    // "create an image", "generate an image", "draw an image", "make an image", "render an image"
    /\b(create|generate|make|draw|paint|render|produce)\s+(an?|the)?\s*(new\s+)?(image|picture|photo|photograph|portrait|artwork|illustration|visual|rendering|graphic)\b/,
    // "based on ... create/generate an image"
    /\bbased\s+on\s+.*(create|generate|make|draw|paint|render)\s+(an?|the)?\s*(image|picture|photo|portrait|artwork|visual)/,
    // "draw me ...", "paint me ...", "sketch me ..."
    /\b(draw|paint|sketch|illustrate)\s+me\s+/,
    // "give me an image of ...", "visualize this ...", "visualize ..."
    /\b(give\s+me|show\s+me)\s+(an?|the)?\s*(image|picture|photo|visual)\b/,
    /\bvisualize\s+(this|what\s+we|the\s+scene|it)\b/,
    // Direct requests: "an image of ...", "a picture of ...", "photo of ..."
    /^(an?|the)\s+(image|picture|photo|illustration|drawing|painting)\s+of\s+/i,
  ];

  for (const pattern of positivePatterns) {
    if (pattern.test(clean)) {
      return { isImageRequest: true };
    }
  }

  return { isImageRequest: false };
}

/**
 * Transforms the user's request and conversation history into a rich text-to-image prompt
 */
export async function synthesizeImagePrompt(params: {
  userPrompt: string;
  conversationHistory: ChatMessage[];
  chatModel: string;
  settings: AppSettings;
  signal?: AbortSignal;
}): Promise<string> {
  const { userPrompt, conversationHistory, chatModel, settings, signal } = params;

  // Filter last 10 messages for relevant conversational context
  const recentHistory = conversationHistory
    .filter((m) => m.content && !m.imageGeneration)
    .slice(-8);

  const contextSnippet = recentHistory
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 500)}`)
    .join("\n\n");

  const promptSynthesisInstruction = `You are an expert AI image prompt engineer for Stable Diffusion and Flux.
The user wants to generate an image based on their conversation and request.

Relevant conversation history:
${contextSnippet ? contextSnippet : "(No prior conversation)"}

User's generation request:
"${userPrompt}"

Task:
Produce a single, vivid, detailed text-to-image prompt. Include specific visual details (subject, setting, composition, lighting, style, colors, mood).
Rules:
- Output ONLY the descriptive prompt text.
- Do NOT output preamble, conversational filler, markdown formatting, or quotes.
- Keep it under 150 words.`;

  try {
    let resultText = "";
    await ProviderService.sendChatStream({
      settings,
      modelId: chatModel,
      messages: [{ id: "synth-user", role: "user", content: promptSynthesisInstruction, timestamp: Date.now() }],
      systemPrompt: "You are a specialized AI prompt engineer for image generation. Output ONLY the image prompt string.",
      signal,
      onChunk: (chunk) => {
        if (chunk) resultText += chunk;
      },
    });

    const cleanedPrompt = resultText
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/^(here is (the|your) (prompt|image prompt):?)/i, "")
      .replace(/^prompt:\s*/i, "")
      .trim();

    if (cleanedPrompt.length > 10) {
      return cleanedPrompt;
    }
  } catch (err: any) {
    console.warn("LLM prompt synthesis failed or Ollama offline, using contextual heuristic fallback:", err);
  }

  // Fallback: extract context keywords and clean user query
  let fallbackPrompt = userPrompt
    .replace(/\b(based\s+on\s+everything\s+we('?ve|\s+have)?\s+discussed(\s+so\s+far)?,?\s*)/i, "")
    .replace(/\b(create|generate|make|draw|paint|render)\s+(an?|the)?\s*(image|picture|photo|illustration)(\s+of)?\s*/i, "")
    .trim();

  // If the user's prompt was just "create an image" based on previous discussion, pull context from recent assistant messages
  if (!fallbackPrompt || fallbackPrompt.length < 5) {
    const lastAssistant = [...recentHistory].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && lastAssistant.content) {
      fallbackPrompt = lastAssistant.content.slice(0, 200).replace(/\n/g, " ");
    } else {
      fallbackPrompt = "A beautiful, highly detailed digital artwork, cinematic lighting, 8k resolution";
    }
  }

  return `${fallbackPrompt}, detailed, high quality, masterpiece, sharp focus, 8k resolution`;
}

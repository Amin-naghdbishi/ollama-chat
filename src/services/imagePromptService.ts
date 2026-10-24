import { ChatMessage, AppSettings } from "../types";
import { ProviderService } from "./providerService";

/**
 * Detects explicit image generation requests in Persian and English while avoiding false positives
 */
export function detectImageIntent(message: string): { isImageRequest: boolean; extractedSubject?: string } {
  if (!message || typeof message !== "string") {
    return { isImageRequest: false };
  }

  const clean = message.trim().toLowerCase();

  // 1. Negative patterns: Questions or theoretical discussions about image generation / models / concepts
  const negativePatterns = [
    // English negative patterns
    /\b(how\s+do|how\s+does|how\s+to|what\s+is|what\s+are|explain|describe\s+how)\b.*\b(image|diffusion|comfyui|checkpoint|generation)\b/i,
    /\b(can\s+you|do\s+you\s+know|are\s+you\s+able\s+to)\s+(generate|create|make)\s+images?\s*\?/i,
    /\bwhy\s+(do|does|is|are)\b.*\b(image|generation)\b/i,
    /\bthe\s+concept\s+of\b/i,
    /\bcode\s+(for|to)\b/i,
    /\bwrite\s+a\s+(python|javascript|script|program)\b/i,

    // Persian negative patterns: questions, explanations, coding requests about images
    /(چیست|کیست|چگونه|چطور|توضیح\s*بده|تفاوت\s*بین|چرا)\s*.*\s*(تصویر|عکس|نقاشی|مدل\s*انتشار|دفیوژن)/,
    /(مدل\s*(انتشار|تصویرسازی|تولید\s*تصویر))\s*(چیست|چگونه|چطور)/,
    /(کد\s*پایتون|اسکریپت|برنامه)\s*.*\s*(تصویر|عکس|crop|فیلتر)/,
    /آیا\s*(میتونی|میتوانید)\s*(عکس|تصویر)\s*(بسازید|تولید\s*کنید)\s*\?/,
  ];

  for (const neg of negativePatterns) {
    if (neg.test(clean)) {
      return { isImageRequest: false };
    }
  }

  // 2. Persian positive patterns
  const persianPositivePatterns = [
    // «یک عکس بساز», «عکس بساز», «یک تصویر زیبا از غروب بکش», «برام عکس قشنگ تولید کن»
    /(یک\s*)?(عکس|تصویر|نقاشی|طرح|پرتره).*?(بساز|تولید\s*کن|بکش|رسم\s*کن|طراحی\s*کن|خلق\s*کن)/,
    // «برام تصویر تولید کن», «برای من عکس بساز»
    /(برام|برای\s*من|لطفاً|لطفا).*?(عکس|تصویر|نقاشی|طرح|پرتره).*?(تولید\s*کن|بساز|بکش|رسم\s*کن|طراحی\s*کن)/,
    // «این صحنه رو نقاشی کن», «صحنه رو نقاشی کن», «این رو نقاشی کن»
    /(این\s*صحنه|صحنه|این|آن)\s*(رو|را)?.*?(نقاشی\s*کن|به\s*تصویر\s*بکش|تصویرسازی\s*کن|طراحی\s*کن)/,
    // «از این ایده یک تصویر بساز», «از این صحنه عکس بساز», «از این ایده عکس تولید کن»
    /از\s*(این\s*ایده|این\s*صحنه|این\s*موضوع|این|آن|مکالمه|گفتگو|صحبتامون).*?(تصویر|عکس|نقاشی).*?(بساز|تولید\s*کن|بکش|طراحی\s*کن)/,
    // «میخوام این رو به تصویر تبدیل کنی», «این را به عکس تبدیل کن»
    /(میخوام|می\s*خواهم|لطفاً|لطفا)?.*?(این|این\s*ایده|این\s*صحنه|این\s*رو|این\s*را)\s*(رو|را)?.*?(به\s*(تصویر|عکس|نقاشی)\s*تبدیل\s*(کنی|کن))/,
    // «تصویری از ... بساز/بکش», «عکسی از ... بساز/بکش»
    /(تصویر|عکس|نقاشی|طرح|پرتره|تصویری|عکسی|نقاشی‌ای)\s*از\s+.+/,
    // Direct conversational Persian requests: «ازش عکس بساز», «تصویرش رو بساز», «نقاشیش کن»
    /(ازش|تصویرش|عکسش|نقاشیش)\s*(رو|را)?\s*(بساز|بکش|تولید\s*کن|کن)/,
    // «تصویرسازی کن از ...»
    /تصویرسازی\s*کن/,
  ];

  for (const pattern of persianPositivePatterns) {
    if (pattern.test(clean)) {
      return { isImageRequest: true };
    }
  }

  // 3. English positive patterns
  const englishPositivePatterns = [
    // "create an image", "generate an image", "draw an image", "make an image", "render an image", "turn this into an image"
    /\b(create|generate|make|draw|paint|render|produce)\s+(an?|the)?\s*(new\s+)?(image|picture|photo|photograph|portrait|artwork|illustration|visual|rendering|graphic)\b/i,
    // "turn this idea into an illustration", "turn this into an image/picture"
    /\bturn\s+(this|it|that|this\s+idea|this\s+concept|our\s+discussion)\s+into\s+(an?|the)?\s*(image|picture|photo|illustration|drawing|artwork|visual)\b/i,
    // "draw this scene", "paint this scene", "illustrate this scene"
    /\b(draw|paint|illustrate|visualize|render)\s+(this\s+scene|the\s+scene|this\s+moment|this\s+setting|this)\b/i,
    // "create a picture for me", "draw me a picture", "make a picture for me"
    /\b(create|generate|make|draw|paint)\s+(an?|the)?\s*(image|picture|photo|portrait|illustration)\s+(for\s+me)\b/i,
    /\b(draw|paint|sketch|illustrate)\s+me\s+/i,
    // "make an image of him/her/it/them", "generate a picture of him"
    /\b(make|create|generate|draw|paint|render)\s+(an?|the)?\s*(image|picture|photo|portrait|illustration)\s+of\s+(him|her|it|them|this\s+character|the\s+character)\b/i,
    // "make an image of Batman and Superman", "draw a picture of..."
    /\b(make|create|generate|draw|paint|render)\s+(an?|the)?\s*(image|picture|photo|portrait|illustration|drawing)\s+of\s+/i,
    // "based on ... create/generate an image"
    /\bbased\s+on\s+.*(create|generate|make|draw|paint|render)\s+(an?|the)?\s*(image|picture|photo|portrait|artwork|visual)/i,
    // "give me an image of ...", "visualize this ...", "visualize ..."
    /\b(give\s+me|show\s+me)\s+(an?|the)?\s*(image|picture|photo|visual)\b/i,
    /\bvisualize\s+(this|what\s+we|the\s+scene|it)\b/i,
    // Direct requests: "an image of ...", "a picture of ...", "photo of ..."
    /^(an?|the)\s+(image|picture|photo|illustration|drawing|painting)\s+of\s+/i,
  ];

  for (const pattern of englishPositivePatterns) {
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

  const promptSynthesisInstruction = `You are an expert AI image prompt engineer for Stable Diffusion, SDXL, and Flux diffusion models.
The user wants to generate an image based on their conversation and request.
The request may be in English or Persian (Farsi).

Relevant conversation history:
${contextSnippet ? contextSnippet : "(No prior conversation)"}

User's generation request:
"${userPrompt}"

Instructions:
1. Understand the core subject, composition, atmosphere, colors, lighting, and style desired by the user.
2. If the user refers to pronouns or contextual entities like "him", "her", "it", "this scene", «این صحنه», «او», «این ایده», resolve them explicitly from the conversation history above.
3. If the user's request or conversation is in Persian, translate the conceptual description into a vivid, descriptive English prompt (diffusion models achieve best quality with English tags and descriptive clauses).
4. Preserve important details including subjects, composition, art style, atmosphere, lighting, and requested aspect ratio.
5. Produce a single, comprehensive text-to-image prompt.

Rules:
- Output ONLY the descriptive prompt text.
- Do NOT output any preamble, conversational greeting ("Sure, here is..."), markdown formatting, or quotation marks.
- Keep the prompt concise, rich, and under 150 words.`;

  try {
    let resultText = "";
    await ProviderService.sendChatStream({
      settings,
      modelId: chatModel,
      messages: [{ id: "synth-user", role: "user", content: promptSynthesisInstruction, timestamp: Date.now() }],
      systemPrompt: "You are a specialized AI prompt engineer for image generation. Output ONLY the raw image prompt text in English without commentary.",
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
    // English removals
    .replace(/\b(based\s+on\s+everything\s+we('?ve|\s+have)?\s+discussed(\s+so\s+far)?,?\s*)/i, "")
    .replace(/\b(create|generate|make|draw|paint|render)\s+(an?|the)?\s*(image|picture|photo|illustration)(\s+of)?\s*/i, "")
    .replace(/\bturn\s+(this|it|that|this\s+idea)\s+into\s+(an?|the)?\s*(image|picture|illustration)\s*/i, "")
    // Persian removals
    .replace(/(از\s*(این\s*ایده|این\s*صحنه|همه\s*چیزهایی\s*که\s*صحبت\s*کردیم|گفتگومون)،?\s*)/, "")
    .replace(/(یک\s*)?(عکس|تصویر|نقاشی)\s*(از)?\s*(بساز|تولید\s*کن|بکش|رسم\s*کن|طراحی\s*کن)/, "")
    .replace(/(برام|برای\s*من|لطفاً|لطفا)\s*(یک\s*)?(عکس|تصویر)\s*(بساز|تولید\s*کن|بکش)/, "")
    .replace(/(این\s*صحنه\s*رو|این\s*رو)\s*(نقاشی\s*کن|به\s*تصویر\s*بکش)/, "")
    .trim();

  // If the user's prompt was just a conversational trigger like "create an image" / «یک عکس بساز», pull context from recent assistant messages
  if (!fallbackPrompt || fallbackPrompt.length < 4) {
    const lastAssistant = [...recentHistory].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && lastAssistant.content) {
      fallbackPrompt = lastAssistant.content.slice(0, 200).replace(/\n/g, " ");
    } else {
      fallbackPrompt = "A beautiful, highly detailed digital artwork, cinematic lighting, 8k resolution";
    }
  }

  return `${fallbackPrompt}, highly detailed, intricate, high quality, masterpiece, sharp focus, 8k resolution`;
}

import { ImageAspectRatio, ImageQualityPreset, ImageModelProfile } from "../types";
import { Language } from "../lib/i18n";

/**
 * Normalizes Persian and Arabic digits to standard ASCII digits 0-9
 * and unifies Persian characters.
 */
export function normalizeDigitsAndText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
}

/**
 * Checks if a checkpoint belongs to the SDXL / modern high-resolution architecture
 */
export function isSdxlCheckpoint(ckptName?: string): boolean {
  if (!ckptName) return false;
  const lower = ckptName.toLowerCase();
  return (
    lower.includes("xl") ||
    lower.includes("sdxl") ||
    lower.includes("sd_xl") ||
    lower.includes("base_1.0") ||
    lower.includes("flux") ||
    lower.includes("cascade") ||
    lower.includes("pony")
  );
}

/**
 * Returns default profile settings for a given checkpoint
 */
export function getDefaultImageModelProfile(ckptName?: string): ImageModelProfile {
  const isXl = isSdxlCheckpoint(ckptName);
  return {
    width: isXl ? 1024 : 512,
    height: isXl ? 1024 : 512,
    aspectRatio: "square",
    qualityPreset: "standard",
    steps: isXl ? 25 : 20,
    cfg: 7.0,
    sampler: "euler",
    scheduler: "normal",
  };
}

export interface ExtractedImageSettings {
  width?: number;
  height?: number;
  aspectRatio?: ImageAspectRatio;
  qualityPreset?: ImageQualityPreset;
  hasExplicitSettings: boolean;
  cleanedPrompt: string;
}

/**
 * Extracts explicit resolution, aspect ratio, and quality settings from Persian and English text
 */
export function extractImageParametersFromPrompt(prompt: string): ExtractedImageSettings {
  if (!prompt || typeof prompt !== "string") {
    return { hasExplicitSettings: false, cleanedPrompt: "" };
  }

  const normalized = normalizeDigitsAndText(prompt);
  let cleaned = prompt;
  let hasExplicit = false;

  let width: number | undefined;
  let height: number | undefined;
  let aspectRatio: ImageAspectRatio | undefined;
  let qualityPreset: ImageQualityPreset | undefined;

  // 1. Match explicit dimensions (e.g. "1024 × 1024", "1024x1536", "1536 در 1024", "1024 by 1024")
  const dimensionRegex = /(?:با\s*ابعاد|در\s*ابعاد|ابعاد|resolution|dimensions?|at|size)?\s*(\d{3,4})\s*(?:[x×*]|در|by|\*)\s*(\d{3,4})(?:\s*(?:pixels?|پیکسل))?/i;
  const dimMatch = normalized.match(dimensionRegex);
  if (dimMatch) {
    const w = parseInt(dimMatch[1], 10);
    const h = parseInt(dimMatch[2], 10);
    if (!isNaN(w) && !isNaN(h) && w >= 256 && h >= 256) {
      width = w;
      height = h;
      hasExplicit = true;

      if (h > w) {
        aspectRatio = "portrait";
      } else if (w > h) {
        aspectRatio = "landscape";
      } else {
        aspectRatio = "square";
      }

      // Clean matched dimension phrase from prompt
      cleaned = cleaned.replace(new RegExp(`(?:با\\s*ابعاد|در\\s*ابعاد|ابعاد|resolution|dimensions?|at|size)?\\s*[0-9۰-۹]{3,4}\\s*(?:[x×*]|در|by|\\*)\\s*[0-9۰-۹]{3,4}(?:\\s*(?:pixels?|پیکسل))?`, "gi"), "");
    }
  }

  // 2. Match Aspect Ratio / Orientation keywords if not already deduced from dimensions or if explicit
  // Persian: مربعی / مربع, عمودی / پرتره / طولی, افقی / منظره / عریض / لندسکیپ
  // English: square, portrait / vertical / tall, landscape / horizontal / wide / widescreen
  const squareRegex = /\b(square|1:1)\b|(مربعی|مربع|یک\s*به\s*یک)/i;
  const portraitRegex = /\b(portrait|vertical|tall)\b|(عمودی|پرتره|طولی)/i;
  const landscapeRegex = /\b(landscape|horizontal|wide|widescreen)\b|(افقی|منظره|عریض|لندسکیپ)/i;

  if (portraitRegex.test(normalized)) {
    aspectRatio = "portrait";
    hasExplicit = true;
    cleaned = cleaned.replace(/\b(portrait|vertical|tall)\b|(عمودی|پرتره|طولی)/gi, "");
  } else if (landscapeRegex.test(normalized)) {
    aspectRatio = "landscape";
    hasExplicit = true;
    cleaned = cleaned.replace(/\b(landscape|horizontal|wide|widescreen)\b|(افقی|منظره|عریض|لندسکیپ)/gi, "");
  } else if (squareRegex.test(normalized)) {
    aspectRatio = "square";
    hasExplicit = true;
    cleaned = cleaned.replace(/\b(square|1:1)\b|(مربعی|مربع|یک\s*به\s*یک)/gi, "");
  }

  // 3. Match Quality Presets
  // Highest Quality:
  const highestQualityRegex = /\b(highest(\s+available)?\s+quality|maximum\s+quality|ultra\s+quality|best\s+quality|max\s+quality)\b|(بالاترین\s*کیفیت(\s*ممکن)?|بیشترین\s*کیفیت|حداکثر\s*کیفیت|بهترین\s*کیفیت|فوق‌العاده\s*با\s*کیفیت)/i;
  // High Quality:
  const highQualityRegex = /\b(high(er)?\s+quality|great\s+quality)\b|(کیفیت\s*بالا|کیفیت\s*عالی|با\s*کیفیت\s*بالا)/i;
  // Standard Quality:
  const standardQualityRegex = /\b(standard(\s+available)?\s+quality|normal\s+quality)\b|(کیفیت\s*استاندارد|کیفیت\s*معمولی)/i;

  if (highestQualityRegex.test(normalized)) {
    qualityPreset = "highest";
    hasExplicit = true;
    cleaned = cleaned.replace(/\b(at\s+the\s+)?(highest(\s+available)?\s+quality|maximum\s+quality|ultra\s+quality|best\s+quality|max\s+quality)\b|(با\s*)?(بالاترین\s*کیفیت(\s*ممکن)?|بیشترین\s*کیفیت|حداکثر\s*کیفیت|بهترین\s*کیفیت|فوق‌العاده\s*با\s*کیفیت)/gi, "");
  } else if (highQualityRegex.test(normalized)) {
    qualityPreset = "high";
    hasExplicit = true;
    cleaned = cleaned.replace(/\b(at\s+)?(high(er)?\s+quality|great\s+quality)\b|(با\s*)?(کیفیت\s*بالا|کیفیت\s*عالی|با\s*کیفیت\s*بالا)/gi, "");
  } else if (standardQualityRegex.test(normalized)) {
    qualityPreset = "standard";
    hasExplicit = true;
    cleaned = cleaned.replace(/\b(at\s+)?(standard(\s+available)?\s+quality|normal\s+quality)\b|(با\s*)?(کیفیت\s*استاندارد|کیفیت\s*معمولی)/gi, "");
  }

  // Clean remaining stray words like "at pixels", "در پیکسل", etc.
  cleaned = cleaned
    .replace(/\b(at|in|with)\s+(pixels?|dimensions?|resolution)\b/gi, "")
    .replace(/(با\s*ابعاد|در\s*ابعاد|با\s*رزولوشن|پیکسل)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    width,
    height,
    aspectRatio,
    qualityPreset,
    hasExplicitSettings: hasExplicit,
    cleanedPrompt: cleaned,
  };
}

export interface ResolvedImageGenerationParams {
  width: number;
  height: number;
  aspectRatio: ImageAspectRatio;
  qualityPreset: ImageQualityPreset;
  steps: number;
  cfg: number;
  hasExplicitOverrides: boolean;
  warning?: string;
  cleanedPrompt: string;
}

/**
 * Resolves final ComfyUI generation parameters combining saved profile defaults,
 * natural-language explicit overrides, and checkpoint hardware capabilities.
 */
export function resolveImageParameters(params: {
  prompt: string;
  ckptName?: string;
  savedProfile?: ImageModelProfile | null;
  language?: Language;
}): ResolvedImageGenerationParams {
  const { prompt, ckptName, savedProfile, language = "en" } = params;

  const isXl = isSdxlCheckpoint(ckptName);
  const defaults = savedProfile || getDefaultImageModelProfile(ckptName);
  const extracted = extractImageParametersFromPrompt(prompt);

  let finalAspectRatio: ImageAspectRatio = extracted.aspectRatio || defaults.aspectRatio || "square";
  let finalQualityPreset: ImageQualityPreset = extracted.qualityPreset || defaults.qualityPreset || "standard";
  let finalWidth = defaults.width;
  let finalHeight = defaults.height;
  let warning: string | undefined;

  // 1. Resolve Aspect Ratio & Dimensions
  if (extracted.width && extracted.height) {
    // User specified exact width and height
    let w = Math.round(extracted.width / 8) * 8;
    let h = Math.round(extracted.height / 8) * 8;

    // Checkpoint capability check: SD 1.5 vs SDXL
    if (!isXl) {
      // SD 1.5 cannot reliably generate beyond ~1024x768 without out-of-memory or duplicated subjects
      const totalPixels = w * h;
      const maxSd15Pixels = 1024 * 768; // ~786,432 pixels

      if (w > 1024 || h > 1024 || totalPixels > maxSd15Pixels) {
        if (h > w) {
          finalWidth = 512;
          finalHeight = 768;
          finalAspectRatio = "portrait";
        } else if (w > h) {
          finalWidth = 768;
          finalHeight = 512;
          finalAspectRatio = "landscape";
        } else {
          finalWidth = 768;
          finalHeight = 768;
          finalAspectRatio = "square";
        }

        warning =
          language === "fa"
            ? `مدل ${ckptName || "SD 1.5"} دارای معماری با ابعاد بومی ۵۱۲ پیکسل است. تولید با ابعاد ${w} × ${h} ممکن است باعث خطای حافظه یا تکرار سوژه شود، بنابراین ابعاد به ${finalWidth} × ${finalHeight} تنظیم شد.`
            : `Selected SD 1.5 checkpoint (${ckptName || "SD 1.5"}) has a native 512px resolution. Generating at ${w} × ${h} exceeds optimal VRAM capacity, so resolution was adjusted to ${finalWidth} × ${finalHeight}.`;
      } else {
        finalWidth = Math.max(256, Math.min(1024, w));
        finalHeight = Math.max(256, Math.min(1024, h));
        finalAspectRatio = extracted.aspectRatio || (finalHeight > finalWidth ? "portrait" : finalWidth > finalHeight ? "landscape" : "square");
      }
    } else {
      // SDXL supports up to 1536x1024, 1024x1536, 1280x1280 natively
      if (w > 1536 || h > 1536) {
        finalWidth = Math.min(1536, w);
        finalHeight = Math.min(1536, h);
        warning =
          language === "fa"
            ? `ابعاد ${w} × ${h} بالاتر از سقف بهینه SDXL است و به ${finalWidth} × ${finalHeight} محدود شد.`
            : `Requested resolution ${w} × ${h} was clamped to ${finalWidth} × ${finalHeight} for hardware safety.`;
      } else {
        finalWidth = Math.max(256, w);
        finalHeight = Math.max(256, h);
      }
      finalAspectRatio = extracted.aspectRatio || (finalHeight > finalWidth ? "portrait" : finalWidth > finalHeight ? "landscape" : "square");
    }
  } else if (extracted.aspectRatio) {
    // Aspect ratio was specified without exact pixel dimensions
    finalAspectRatio = extracted.aspectRatio;
    if (isXl) {
      if (finalAspectRatio === "portrait") {
        finalWidth = 1024;
        finalHeight = 1536;
      } else if (finalAspectRatio === "landscape") {
        finalWidth = 1536;
        finalHeight = 1024;
      } else {
        finalWidth = 1024;
        finalHeight = 1024;
      }
    } else {
      if (finalAspectRatio === "portrait") {
        finalWidth = 512;
        finalHeight = 768;
      } else if (finalAspectRatio === "landscape") {
        finalWidth = 768;
        finalHeight = 512;
      } else {
        finalWidth = 512;
        finalHeight = 512;
      }
    }
  } else {
    // Neither dimension nor aspect ratio was specified in request; use saved profile defaults
    finalWidth = defaults.width;
    finalHeight = defaults.height;
    finalAspectRatio = defaults.aspectRatio;
  }

  // 2. Resolve Quality Preset & Sampling Steps
  let finalSteps = defaults.steps;
  let finalCfg = defaults.cfg;

  if (extracted.qualityPreset) {
    finalQualityPreset = extracted.qualityPreset;
    if (finalQualityPreset === "highest") {
      finalSteps = isXl ? 50 : 40;
      finalCfg = 8.0;
    } else if (finalQualityPreset === "high") {
      finalSteps = isXl ? 35 : 30;
      finalCfg = 7.5;
    } else {
      finalSteps = isXl ? 25 : 20;
      finalCfg = 7.0;
    }
  } else {
    finalSteps = defaults.steps;
    finalCfg = defaults.cfg;
    finalQualityPreset = defaults.qualityPreset;
  }

  return {
    width: finalWidth,
    height: finalHeight,
    aspectRatio: finalAspectRatio,
    qualityPreset: finalQualityPreset,
    steps: finalSteps,
    cfg: finalCfg,
    hasExplicitOverrides: extracted.hasExplicitSettings,
    warning,
    cleanedPrompt: extracted.cleanedPrompt,
  };
}

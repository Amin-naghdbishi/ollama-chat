/**
 * Color utility functions for Custom Theme Builder:
 * - Hex, RGB, HSL parsing & formatting
 * - Relative luminance calculation (WCAG 2.1)
 * - Contrast ratio calculation
 * - Contrast level evaluation (WCAG AA / AAA)
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HsvColor {
  h: number; // 0 to 360
  s: number; // 0 to 1
  v: number; // 0 to 1
  a?: number; // 0 to 1
}

/**
 * Convert RGB to HSV color space.
 * r, g, b in [0, 255]
 * returns h in [0, 360], s in [0, 1], v in [0, 1]
 */
export function rgbToHsv(rgb: RgbColor): HsvColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.max(0, Math.min(1, s)),
    v: Math.max(0, Math.min(1, v)),
    a: rgb.a !== undefined ? rgb.a : 1,
  };
}

/**
 * Convert HSV to RGB color space.
 * h in [0, 360], s in [0, 1], v in [0, 1]
 * returns r, g, b in [0, 255]
 */
export function hsvToRgb(hsv: HsvColor): RgbColor {
  const h = (hsv.h % 360 + 360) % 360 / 60;
  const s = Math.max(0, Math.min(1, hsv.s));
  const v = Math.max(0, Math.min(1, hsv.v));

  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));

  let r = 0;
  let g = 0;
  let b = 0;

  switch (i) {
    case 0:
      r = v; g = t; b = p;
      break;
    case 1:
      r = q; g = v; b = p;
      break;
    case 2:
      r = p; g = v; b = t;
      break;
    case 3:
      r = p; g = q; b = v;
      break;
    case 4:
      r = t; g = p; b = v;
      break;
    default:
      r = v; g = p; b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsv.a !== undefined ? hsv.a : 1,
  };
}

/**
 * Format RGB/RGBA as CSS string: #rrggbb or rgba(r, g, b, a)
 */
export function rgbToCss(rgb: RgbColor): string {
  const a = rgb.a ?? 1;
  if (a < 1) {
    const cleanAlpha = Math.round(a * 100) / 100;
    return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${cleanAlpha})`;
  }
  return rgbToHex(rgb);
}

export interface ContrastResult {
  ratio: number;
  formattedRatio: string;
  isAaNormal: boolean; // >= 4.5:1
  isAaLarge: boolean;  // >= 3.0:1
  isAaa: boolean;      // >= 7.0:1
  status: "pass" | "warn" | "fail";
  message: string;
}

/**
 * Parse any valid CSS color string (hex, rgb, rgba) to RGB numbers (0-255).
 */
export function parseColorToRgb(colorStr: string): RgbColor | null {
  if (!colorStr) return null;
  const str = colorStr.trim().toLowerCase();

  // Handle Transparent
  if (str === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Hex: #fff, #ffffff, #ffffff80
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // RGB/RGBA: rgb(255, 255, 255), rgba(255, 255, 255, 0.5)
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Convert RGB to Hex format (#rrggbb).
 */
export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => {
    const clamped = Math.min(255, Math.max(0, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Normalize any valid color string to a standard 6-digit hex format (#rrggbb)
 * If invalid or transparent, returns fallback.
 */
export function normalizeToHex(colorStr: string, fallback = "#000000"): string {
  const rgb = parseColorToRgb(colorStr);
  if (!rgb) return fallback;
  return rgbToHex(rgb);
}

/**
 * Calculate relative luminance according to WCAG 2.1 specifications:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(rgb: RgbColor): number {
  const sRgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = sRgb.map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * Blend a foreground color with alpha over an opaque background color.
 */
export function blendColors(fg: RgbColor, bg: RgbColor): RgbColor {
  const alpha = fg.a ?? 1;
  if (alpha >= 1) return fg;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

/**
 * Calculate WCAG contrast ratio between foreground and background colors.
 */
export function calculateContrast(
  fgColorStr: string,
  bgColorStr: string,
  baseBgFallback = "#131418"
): ContrastResult {
  let fgRgb = parseColorToRgb(fgColorStr);
  let bgRgb = parseColorToRgb(bgColorStr);
  const baseRgb = parseColorToRgb(baseBgFallback) || { r: 19, g: 20, b: 24, a: 1 };

  if (!fgRgb) fgRgb = { r: 230, g: 233, b: 240, a: 1 };
  if (!bgRgb) bgRgb = baseRgb;

  // If background is transparent, blend over base fallback
  if ((bgRgb.a ?? 1) < 1) {
    bgRgb = blendColors(bgRgb, baseRgb);
  }
  // If foreground has alpha, blend over effective background
  if ((fgRgb.a ?? 1) < 1) {
    fgRgb = blendColors(fgRgb, bgRgb);
  }

  const l1 = getRelativeLuminance(fgRgb);
  const l2 = getRelativeLuminance(bgRgb);

  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (brighter + 0.05) / (darker + 0.05);

  const formattedRatio = `${ratio.toFixed(2)}:1`;
  const isAaNormal = ratio >= 4.5;
  const isAaLarge = ratio >= 3.0;
  const isAaa = ratio >= 7.0;

  let status: "pass" | "warn" | "fail" = "pass";
  let message = "Good contrast (WCAG AA passed)";

  if (!isAaLarge) {
    status = "fail";
    message = "Very low contrast - text may be difficult to read";
  } else if (!isAaNormal) {
    status = "warn";
    message = "Moderate contrast - passes for large text only";
  }

  return {
    ratio,
    formattedRatio,
    isAaNormal,
    isAaLarge,
    isAaa,
    status,
    message,
  };
}

/**
 * Adjust color brightness by a percentage (-100 to +100).
 */
export function adjustBrightness(hexColor: string, percent: number): string {
  const rgb = parseColorToRgb(hexColor);
  if (!rgb) return hexColor;

  const factor = 1 + percent / 100;
  return rgbToHex({
    r: Math.min(255, Math.max(0, Math.round(rgb.r * factor))),
    g: Math.min(255, Math.max(0, Math.round(rgb.g * factor))),
    b: Math.min(255, Math.max(0, Math.round(rgb.b * factor))),
  });
}

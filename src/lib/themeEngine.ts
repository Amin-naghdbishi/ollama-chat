import { GlassThemeConfig } from "../types";

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  bgElevated: string;
  bgHeader: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  // Accent & Brand
  accentColor: string;
  accentHover: string;
  accentActive: string;
  accentText: string;

  // Buttons
  btnBg: string;
  btnText: string;
  btnHover: string;
  btnActive: string;
  btnDisabledBg: string;
  btnDisabledText: string;

  // Inputs
  inputBg: string;
  inputText: string;
  inputBorder: string;
  inputFocus: string;
  inputPlaceholder: string;

  // Sidebar
  bgSidebar: string;
  sidebarText: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarBorder: string;

  // Chat Bubbles
  bgUserMsg: string;
  userMsgText: string;
  bgAssistantMsg: string;
  assistantMsgText: string;
  messageHover: string;
  messageBorder: string;

  // Code & Syntax
  codeBg: string;
  codeHeaderBg: string;
  codeText: string;
  codeBorder: string;
  codeInlineBg: string;
  codeInlineText: string;

  // Borders & Dividers
  borderColor: string;
  borderSubtle: string;
  borderStrong: string;

  // Status & Feedback
  colorError: string;
  colorWarning: string;
  colorSuccess: string;
  linkColor: string;
  selectionBg: string;
  selectionText: string;

  // Scrollbar
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;

  // Composer Container & Controls
  composerBg?: string;
  composerBorder?: string;
  composerHoverBorder?: string;
  composerFocusBorder?: string;
  composerText?: string;
  composerPlaceholder?: string;

  // Image Generation Animation Colors
  imageGenColor1?: string;
  imageGenColor2?: string;
  imageGenColor3?: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
  isGlass?: boolean;
}

export const DEFAULT_GLASS_DARK: GlassThemeConfig = {
  id: "glass-dark",
  name: "Glass Dark",
  isDark: true,
  primaryColor: "#818cf8", // vibrant indigo
  backgroundColor: "#0d0f15", // deep dark base
  composerHoverBorderColor: "#4f556b",
  glassOpacity: 0.70, // 70% opacity, 30% transparency
};

export const DEFAULT_GLASS_LIGHT: GlassThemeConfig = {
  id: "glass-light",
  name: "Glass Light",
  isDark: false,
  primaryColor: "#4f46e5", // rich indigo
  backgroundColor: "#f0f2f7", // clean light base
  composerHoverBorderColor: "#a3adc2",
  glassOpacity: 0.80, // 80% opacity, 20% transparency
};

function parseToRgb(color: string): { r: number; g: number; b: number } {
  const c = (color || "").trim().toLowerCase();
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((x) => x + x).join("");
    }
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }
  }
  const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return { r: 15, g: 16, b: 22 };
}

function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Automatically coordinate remaining interface colors from:
 * Primary Color, Background Color, Dark/Light mode, and Glass Level.
 */
export function deriveGlassThemeColors(config: GlassThemeConfig): ThemeColors {
  const { isDark, primaryColor, backgroundColor, composerHoverBorderColor, glassOpacity } = config;
  const bg = parseToRgb(backgroundColor);
  const primary = parseToRgb(primaryColor);
  const primaryLum = getLuminance(primary.r, primary.g, primary.b);
  const accentText = primaryLum > 0.55 ? "#09090b" : "#ffffff";

  // Glass opacities
  const op = Math.max(0.15, Math.min(0.95, glassOpacity));
  const surfaceOp = Math.min(0.98, op + (isDark ? 0.08 : 0.05));
  const elevatedOp = Math.min(1, op + (isDark ? 0.16 : 0.12));
  const headerOp = Math.min(0.95, op + 0.1);
  const sidebarOp = Math.min(0.95, op + 0.05);

  // Surface shifts
  const shift = isDark ? 14 : -8;
  const surfR = Math.max(0, Math.min(255, bg.r + shift));
  const surfG = Math.max(0, Math.min(255, bg.g + shift));
  const surfB = Math.max(0, Math.min(255, bg.b + shift + (isDark ? 5 : -5)));

  const elevR = Math.max(0, Math.min(255, bg.r + shift * 1.8));
  const elevG = Math.max(0, Math.min(255, bg.g + shift * 1.8));
  const elevB = Math.max(0, Math.min(255, bg.b + shift * 1.8 + (isDark ? 8 : -8)));

  // Text
  const textPrimary = isDark ? "#f3f4f6" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#4b5563";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const textDisabled = isDark ? "#4b5563" : "#d1d5db";

  // Borders
  const borderColor = isDark
    ? `rgba(255, 255, 255, ${Math.max(0.08, 0.22 - op * 0.1).toFixed(3)})`
    : `rgba(0, 0, 0, ${Math.max(0.08, 0.22 - op * 0.1).toFixed(3)})`;
  const borderSubtle = isDark
    ? `rgba(255, 255, 255, ${Math.max(0.04, 0.12 - op * 0.06).toFixed(3)})`
    : `rgba(0, 0, 0, ${Math.max(0.04, 0.12 - op * 0.06).toFixed(3)})`;

  // Buttons
  const btnBg = isDark ? `rgba(255, 255, 255, 0.08)` : `rgba(255, 255, 255, 0.75)`;
  const btnHover = isDark ? `rgba(255, 255, 255, 0.14)` : `rgba(255, 255, 255, 0.95)`;

  // Composer
  const composerBg = isDark
    ? `rgba(${surfR}, ${surfG}, ${surfB}, ${surfaceOp.toFixed(3)})`
    : `rgba(255, 255, 255, ${Math.min(0.95, surfaceOp + 0.1).toFixed(3)})`;

  // User message
  const bgUserMsg = isDark
    ? `rgba(${Math.round(primary.r * 0.35 + bg.r * 0.65)}, ${Math.round(primary.g * 0.35 + bg.g * 0.65)}, ${Math.round(primary.b * 0.35 + bg.b * 0.65)}, ${elevatedOp.toFixed(3)})`
    : `rgba(${Math.round(primary.r * 0.15 + bg.r * 0.85)}, ${Math.round(primary.g * 0.15 + bg.g * 0.85)}, ${Math.round(primary.b * 0.15 + bg.b * 0.85)}, ${elevatedOp.toFixed(3)})`;

  return {
    bgPrimary: `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${op.toFixed(3)})`,
    bgSecondary: `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${surfaceOp.toFixed(3)})`,
    bgSurface: `rgba(${surfR}, ${surfG}, ${surfB}, ${surfaceOp.toFixed(3)})`,
    bgElevated: `rgba(${elevR}, ${elevG}, ${elevB}, ${elevatedOp.toFixed(3)})`,
    bgHeader: `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${headerOp.toFixed(3)})`,

    textPrimary,
    textSecondary,
    textMuted,
    textDisabled,

    accentColor: primaryColor,
    accentHover: primaryColor,
    accentActive: primaryColor,
    accentText,

    btnBg,
    btnText: textPrimary,
    btnHover,
    btnActive: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 1)",
    btnDisabledBg: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
    btnDisabledText: textDisabled,

    inputBg: isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.8)",
    inputText: textPrimary,
    inputBorder: borderColor,
    inputFocus: primaryColor,
    inputPlaceholder: textMuted,

    bgSidebar: `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${sidebarOp.toFixed(3)})`,
    sidebarText: textSecondary,
    sidebarHover: btnHover,
    sidebarActive: `rgba(${surfR}, ${surfG}, ${surfB}, 0.85)`,
    sidebarBorder: borderColor,

    bgUserMsg,
    userMsgText: textPrimary,
    bgAssistantMsg: "transparent",
    assistantMsgText: textPrimary,
    messageHover: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
    messageBorder: borderSubtle,

    codeBg: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(240, 242, 246, 0.85)",
    codeHeaderBg: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(230, 233, 240, 0.9)",
    codeText: textPrimary,
    codeBorder: borderSubtle,
    codeInlineBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
    codeInlineText: isDark ? "#fca5a5" : "#dc2626",

    borderColor,
    borderSubtle,
    borderStrong: borderColor,

    colorError: "#ef4444",
    colorWarning: "#f59e0b",
    colorSuccess: "#10b981",
    linkColor: primaryColor,
    selectionBg: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.25)`,
    selectionText: textPrimary,

    scrollbarTrack: "transparent",
    scrollbarThumb: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
    scrollbarThumbHover: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",

    composerBg,
    composerBorder: borderColor,
    composerFocusBorder: primaryColor,
    composerText: textPrimary,
    composerPlaceholder: textMuted,
    composerHoverBorder: composerHoverBorderColor,

    imageGenColor1: "#9333ea",
    imageGenColor2: "#2563eb",
    imageGenColor3: "#06b6d4",
  };
}

export const BUILTIN_THEMES: Record<string, ThemeConfig> = {
  "glass-dark": {
    id: "glass-dark",
    name: "Glass Dark",
    isDark: true,
    isGlass: true,
    colors: deriveGlassThemeColors(DEFAULT_GLASS_DARK),
  },
  "glass-light": {
    id: "glass-light",
    name: "Glass Light",
    isDark: false,
    isGlass: true,
    colors: deriveGlassThemeColors(DEFAULT_GLASS_LIGHT),
  },
  dark: {
    id: "dark",
    name: "Neutral Dark",
    isDark: true,
    colors: {
      bgPrimary: "#131418",
      bgSecondary: "#191a21",
      bgSurface: "#1f212a",
      bgElevated: "#282a36",
      bgHeader: "#131418",

      textPrimary: "#e6e9f0",
      textSecondary: "#9ba3b2",
      textMuted: "#6b7280",
      textDisabled: "#4b5563",

      accentColor: "#818cf8",
      accentHover: "#6366f1",
      accentActive: "#4f46e5",
      accentText: "#09090b",

      btnBg: "#1c1e27",
      btnText: "#e5e7eb",
      btnHover: "#262834",
      btnActive: "#2f3242",
      btnDisabledBg: "#16171d",
      btnDisabledText: "#4b5563",

      inputBg: "#16171e",
      inputText: "#e6e9f0",
      inputBorder: "#2a2d3c",
      inputFocus: "#818cf8",
      inputPlaceholder: "#6b7280",

      bgSidebar: "#16171d",
      sidebarText: "#9ba3b2",
      sidebarHover: "#222430",
      sidebarActive: "#1f212a",
      sidebarBorder: "#282a36",

      bgUserMsg: "#232634",
      userMsgText: "#e6e9f0",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#e6e9f0",
      messageHover: "rgba(255, 255, 255, 0.03)",
      messageBorder: "#282a36",

      codeBg: "#0c0d12",
      codeHeaderBg: "#16171f",
      codeText: "#e6e9f0",
      codeBorder: "#282a36",
      codeInlineBg: "#1e202b",
      codeInlineText: "#fb7185",

      borderColor: "#282a36",
      borderSubtle: "#1e2029",
      borderStrong: "#3e4254",

      colorError: "#f87171",
      colorWarning: "#fbbf24",
      colorSuccess: "#34d399",
      linkColor: "#818cf8",
      selectionBg: "rgba(129, 140, 248, 0.25)",
      selectionText: "#ffffff",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(255, 255, 255, 0.12)",
      scrollbarThumbHover: "rgba(255, 255, 255, 0.25)",

      composerBg: "#1f212a",
      composerBorder: "#282a36",
      composerHoverBorder: "#4f556b",
      composerFocusBorder: "#818cf8",
      composerText: "#e6e9f0",
      composerPlaceholder: "#6b7280",

      imageGenColor1: "#9333ea",
      imageGenColor2: "#2563eb",
      imageGenColor3: "#06b6d4",
    },
  },
  light: {
    id: "light",
    name: "Clean Light",
    isDark: false,
    colors: {
      bgPrimary: "#f8f9fa",
      bgSecondary: "#ffffff",
      bgSurface: "#f0f2f5",
      bgElevated: "#ffffff",
      bgHeader: "#f8f9fa",

      textPrimary: "#1e232e",
      textSecondary: "#4b5563",
      textMuted: "#8892a0",
      textDisabled: "#9ca3af",

      accentColor: "#4f46e5",
      accentHover: "#4338ca",
      accentActive: "#3730a3",
      accentText: "#ffffff",

      btnBg: "#ffffff",
      btnText: "#1e232e",
      btnHover: "#f1f3f7",
      btnActive: "#e2e6ee",
      btnDisabledBg: "#f3f4f6",
      btnDisabledText: "#9ca3af",

      inputBg: "#ffffff",
      inputText: "#1e232e",
      inputBorder: "#cbd1dd",
      inputFocus: "#4f46e5",
      inputPlaceholder: "#8892a0",

      bgSidebar: "#f1f3f6",
      sidebarText: "#4b5563",
      sidebarHover: "#e5e8ee",
      sidebarActive: "#ffffff",
      sidebarBorder: "#e1e4ec",

      bgUserMsg: "#e8edf8",
      userMsgText: "#1e232e",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#1e232e",
      messageHover: "rgba(0, 0, 0, 0.02)",
      messageBorder: "#e1e4ec",

      codeBg: "#f6f8fa",
      codeHeaderBg: "#ebeff5",
      codeText: "#24292f",
      codeBorder: "#d0d7de",
      codeInlineBg: "#eff2f6",
      codeInlineText: "#cf222e",

      borderColor: "#e1e4ec",
      borderSubtle: "#eaedf3",
      borderStrong: "#cbd1dd",

      colorError: "#dc2626",
      colorWarning: "#d97706",
      colorSuccess: "#059669",
      linkColor: "#4338ca",
      selectionBg: "rgba(79, 70, 229, 0.18)",
      selectionText: "#1e232e",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(0, 0, 0, 0.14)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.28)",

      composerBg: "#ffffff",
      composerBorder: "#e1e4ec",
      composerHoverBorder: "#a3adc2",
      composerFocusBorder: "#4f46e5",
      composerText: "#1e232e",
      composerPlaceholder: "#8892a0",

      imageGenColor1: "#8b5cf6",
      imageGenColor2: "#3b82f6",
      imageGenColor3: "#0891b2",
    },
  },
  "soft-gray": {
    id: "soft-gray",
    name: "Soft Slate",
    isDark: false,
    colors: {
      bgPrimary: "#f3f4f6",
      bgSecondary: "#ffffff",
      bgSurface: "#e9ebef",
      bgElevated: "#ffffff",
      bgHeader: "#f3f4f6",

      textPrimary: "#181e29",
      textSecondary: "#475569",
      textMuted: "#8e9bb0",
      textDisabled: "#94a3b8",

      accentColor: "#6366f1",
      accentHover: "#4f46e5",
      accentActive: "#4338ca",
      accentText: "#ffffff",

      btnBg: "#ffffff",
      btnText: "#181e29",
      btnHover: "#e9ebf0",
      btnActive: "#d9dce4",
      btnDisabledBg: "#f1f5f9",
      btnDisabledText: "#94a3b8",

      inputBg: "#ffffff",
      inputText: "#181e29",
      inputBorder: "#cbd2dc",
      inputFocus: "#6366f1",
      inputPlaceholder: "#8e9bb0",

      bgSidebar: "#eaecf0",
      sidebarText: "#475569",
      sidebarHover: "#dfe2e8",
      sidebarActive: "#ffffff",
      sidebarBorder: "#d5d9e2",

      bgUserMsg: "#e2e5eb",
      userMsgText: "#181e29",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#181e29",
      messageHover: "rgba(0, 0, 0, 0.02)",
      messageBorder: "#d5d9e2",

      codeBg: "#f1f5f9",
      codeHeaderBg: "#e2e8f0",
      codeText: "#1e293b",
      codeBorder: "#cbd5e1",
      codeInlineBg: "#e2e8f0",
      codeInlineText: "#e11d48",

      borderColor: "#d5d9e2",
      borderSubtle: "#e2e6ee",
      borderStrong: "#cbd2dc",

      colorError: "#ef4444",
      colorWarning: "#f59e0b",
      colorSuccess: "#10b981",
      linkColor: "#4f46e5",
      selectionBg: "rgba(99, 102, 241, 0.18)",
      selectionText: "#181e29",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(0, 0, 0, 0.12)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.24)",

      composerBg: "#ffffff",
      composerBorder: "#d5d9e2",
      composerHoverBorder: "#a3adc2",
      composerFocusBorder: "#6366f1",
      composerText: "#181e29",
      composerPlaceholder: "#8e9bb0",

      imageGenColor1: "#8b5cf6",
      imageGenColor2: "#3b82f6",
      imageGenColor3: "#0891b2",
    },
  },
};

const _memoryGlassConfig: Record<string, GlassThemeConfig> = {};

export const ThemeEngine = {
  /**
   * Get persistent configuration for Glass Dark or Glass Light.
   */
  getGlassThemeConfig(id: "glass-dark" | "glass-light"): GlassThemeConfig {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(`ollama_chat_glass_config_${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const base = id === "glass-dark" ? DEFAULT_GLASS_DARK : DEFAULT_GLASS_LIGHT;
          return { ...base, ...parsed, id };
        }
      } catch (e) {
        console.warn(`Failed to read glass config for ${id}:`, e);
      }
    } else if (_memoryGlassConfig[id]) {
      return { ..._memoryGlassConfig[id] };
    }
    return id === "glass-dark" ? { ...DEFAULT_GLASS_DARK } : { ...DEFAULT_GLASS_LIGHT };
  },

  /**
   * Persistently save configuration for Glass Dark or Glass Light independently.
   */
  saveGlassThemeConfig(config: GlassThemeConfig): void {
    _memoryGlassConfig[config.id] = { ...config };
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`ollama_chat_glass_config_${config.id}`, JSON.stringify(config));
      } catch (e) {
        console.error(`Failed to save glass config for ${config.id}:`, e);
      }
    }
  },

  /**
   * Retrieve any theme configuration.
   */
  getThemeConfig(themeId: string): ThemeConfig {
    if (themeId === "glass-dark") {
      const cfg = this.getGlassThemeConfig("glass-dark");
      return {
        id: "glass-dark",
        name: "Glass Dark",
        isDark: true,
        isGlass: true,
        colors: deriveGlassThemeColors(cfg),
      };
    }

    if (themeId === "glass-light") {
      const cfg = this.getGlassThemeConfig("glass-light");
      return {
        id: "glass-light",
        name: "Glass Light",
        isDark: false,
        isGlass: true,
        colors: deriveGlassThemeColors(cfg),
      };
    }

    if (themeId === "system") {
      const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? BUILTIN_THEMES.dark : BUILTIN_THEMES.light;
    }

    return BUILTIN_THEMES[themeId] || BUILTIN_THEMES.dark;
  },

  /**
   * Apply a theme to document.documentElement via CSS Variables & HTML class.
   */
  applyTheme(themeId: string, glassOverride?: GlassThemeConfig): ThemeConfig {
    let config: ThemeConfig;
    let glassConfig: GlassThemeConfig | null = null;

    if (themeId === "glass-dark" || themeId === "glass-light") {
      glassConfig = glassOverride || this.getGlassThemeConfig(themeId);
      config = {
        id: themeId,
        name: glassConfig.name,
        isDark: glassConfig.isDark,
        isGlass: true,
        colors: deriveGlassThemeColors(glassConfig),
      };
    } else if (themeId === "system") {
      const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      config = prefersDark ? BUILTIN_THEMES.dark : BUILTIN_THEMES.light;
    } else {
      config = BUILTIN_THEMES[themeId] || BUILTIN_THEMES.dark;
    }

    if (typeof document === "undefined") return config;

    const root = document.documentElement;
    const { colors, isDark } = config;

    // Set dark/light class
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", config.id);

    // Apply exact CSS Custom Variables
    const cssVars: Record<string, string> = {
      "--bg-primary": colors.bgPrimary,
      "--bg-secondary": colors.bgSecondary,
      "--bg-surface": colors.bgSurface,
      "--bg-elevated": colors.bgElevated || colors.bgSurface,
      "--bg-header": colors.bgHeader,

      "--text-primary": colors.textPrimary,
      "--text-secondary": colors.textSecondary,
      "--text-muted": colors.textMuted,
      "--text-disabled": colors.textDisabled || "#6b7280",

      "--accent-color": colors.accentColor,
      "--accent-hover": colors.accentHover,
      "--accent-active": colors.accentActive || colors.accentHover,
      "--accent-text": colors.accentText,

      "--btn-bg": colors.btnBg,
      "--btn-text": colors.btnText,
      "--btn-hover": colors.btnHover,
      "--btn-active": colors.btnActive,
      "--btn-disabled-bg": colors.btnDisabledBg || colors.btnBg,
      "--btn-disabled-text": colors.btnDisabledText || colors.textDisabled || "#6b7280",

      "--input-bg": colors.inputBg,
      "--input-text": colors.inputText || colors.textPrimary,
      "--input-border": colors.inputBorder,
      "--input-focus": colors.inputFocus,
      "--input-placeholder": colors.inputPlaceholder || colors.textMuted,

      "--bg-sidebar": colors.bgSidebar,
      "--sidebar-text": colors.sidebarText || colors.textSecondary,
      "--sidebar-hover": colors.sidebarHover || colors.btnHover,
      "--sidebar-active": colors.sidebarActive || colors.bgSurface,
      "--sidebar-border": colors.sidebarBorder || colors.borderColor,

      "--bg-user-msg": colors.bgUserMsg,
      "--user-msg-text": colors.userMsgText || colors.textPrimary,
      "--bg-assistant-msg": colors.bgAssistantMsg,
      "--assistant-msg-text": colors.assistantMsgText || colors.textPrimary,
      "--message-hover": colors.messageHover || "rgba(255, 255, 255, 0.03)",
      "--message-border": colors.messageBorder || colors.borderColor,

      "--code-bg": colors.codeBg,
      "--code-header-bg": colors.codeHeaderBg,
      "--code-text": colors.codeText || colors.textPrimary,
      "--code-border": colors.codeBorder || colors.borderColor,
      "--code-inline-bg": colors.codeInlineBg,
      "--code-inline-text": colors.codeInlineText,

      "--border-color": colors.borderColor,
      "--border-subtle": colors.borderSubtle,
      "--border-strong": colors.borderStrong || colors.borderColor,

      "--color-error": colors.colorError,
      "--color-warning": colors.colorWarning,
      "--color-success": colors.colorSuccess,
      "--link-color": colors.linkColor,
      "--selection-bg": colors.selectionBg,
      "--selection-text": colors.selectionText,

      "--scrollbar-track": colors.scrollbarTrack,
      "--scrollbar-thumb": colors.scrollbarThumb,
      "--scrollbar-thumb-hover": colors.scrollbarThumbHover,

      // Composer Container
      "--composer-bg": colors.composerBg || colors.bgSurface || colors.inputBg,
      "--composer-border": colors.composerBorder || colors.borderColor || colors.inputBorder,
      "--composer-hover-border": colors.composerHoverBorder || colors.borderColor,
      "--composer-focus-border": colors.composerFocusBorder || colors.accentColor || colors.inputFocus,
      "--composer-text": colors.composerText || colors.inputText || colors.textPrimary,
      "--composer-placeholder": colors.composerPlaceholder || colors.inputPlaceholder || colors.textMuted,

      // Image Generation Animation
      "--image-gen-color-1": colors.imageGenColor1 || "#9333ea",
      "--image-gen-color-2": colors.imageGenColor2 || "#2563eb",
      "--image-gen-color-3": colors.imageGenColor3 || "#06b6d4",
    };

    // Apply or remove chat background image
    const bgImage = glassConfig?.chatBackgroundImage;
    if (bgImage) {
      cssVars["--chat-bg-image"] = `url("${bgImage}")`;
    } else {
      root.style.removeProperty("--chat-bg-image");
    }

    Object.entries(cssVars).forEach(([key, val]) => {
      if (val) {
        root.style.setProperty(key, val);
      } else {
        root.style.removeProperty(key);
      }
    });

    return config;
  },

  /**
   * Apply live changes for a glass theme directly to the UI.
   */
  applyLiveGlassTheme(config: GlassThemeConfig): void {
    this.applyTheme(config.id, config);
  },
};

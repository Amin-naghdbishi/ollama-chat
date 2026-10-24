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

  // Syntax Highlighting Tokens (Optional overrides)
  syntaxKeyword?: string;
  syntaxFunction?: string;
  syntaxVariable?: string;
  syntaxString?: string;
  syntaxNumber?: string;
  syntaxComment?: string;
  syntaxType?: string;
  syntaxOperator?: string;
  syntaxConstant?: string;
  syntaxTag?: string;
  syntaxAttr?: string;
  syntaxBuiltin?: string;

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

  // Composer Container
  composerBg?: string;
  composerBorder?: string;
  composerFocusBorder?: string;
  composerText?: string;
  composerPlaceholder?: string;

  // Send Button
  composerSendBg?: string;
  composerSendHoverBg?: string;
  composerSendDisabledBg?: string;
  composerSendIcon?: string;
  composerSendHoverIcon?: string;
  composerSendDisabledIcon?: string;
  composerSendGeneratingBg?: string;
  composerSendGeneratingHoverBg?: string;
  composerSendGeneratingIcon?: string;

  // Thinking Button
  composerThinkOffBg?: string;
  composerThinkOffText?: string;
  composerThinkOffBorder?: string;
  composerThinkOffHoverBg?: string;
  composerThinkOffHoverText?: string;
  composerThinkOnBg?: string;
  composerThinkOnText?: string;
  composerThinkOnBorder?: string;
  composerThinkOnHoverBg?: string;
  composerThinkOnHoverText?: string;

  // Add File Button
  composerAddFileBg?: string;
  composerAddFileBorder?: string;
  composerAddFileText?: string;
  composerAddFileHoverBg?: string;
  composerAddFileHoverBorder?: string;
  composerAddFileHoverText?: string;

  // Legacy composer keys
  composerBtnBg?: string;
  composerBtnHover?: string;
  composerBtnText?: string;
  composerBtnBorder?: string;
  composerSendText?: string;
  composerSendHover?: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
  isCustom?: boolean;
  baseThemeId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CustomTheme extends ThemeConfig {
  isCustom: true;
  baseThemeId: string;
  createdAt: number;
  updatedAt: number;
}

export const BUILTIN_THEMES: Record<string, ThemeConfig> = {
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

      codeBg: "#f1f4f8",
      codeHeaderBg: "#e2e7f0",
      codeText: "#1f2937",
      codeBorder: "#cbd5e1",
      codeInlineBg: "#e5eaf2",
      codeInlineText: "#e11d48",

      borderColor: "#d5d9e2",
      borderSubtle: "#e3e6ee",
      borderStrong: "#b8c0cc",

      colorError: "#dc2626",
      colorWarning: "#d97706",
      colorSuccess: "#059669",
      linkColor: "#4f46e5",
      selectionBg: "rgba(99, 102, 241, 0.18)",
      selectionText: "#181e29",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(0, 0, 0, 0.14)",
      scrollbarThumbHover: "rgba(0, 0, 0, 0.28)",
    },
  },
  "warm-light": {
    id: "warm-light",
    name: "Warm Cream",
    isDark: false,
    colors: {
      bgPrimary: "#f9f6f0",
      bgSecondary: "#ffffff",
      bgSurface: "#f0ebe1",
      bgElevated: "#ffffff",
      bgHeader: "#f9f6f0",

      textPrimary: "#292524",
      textSecondary: "#57534e",
      textMuted: "#969089",
      textDisabled: "#a8a29e",

      accentColor: "#ea580c",
      accentHover: "#c2410c",
      accentActive: "#9a3412",
      accentText: "#ffffff",

      btnBg: "#ffffff",
      btnText: "#292524",
      btnHover: "#f0ebe1",
      btnActive: "#dfd6c6",
      btnDisabledBg: "#f5f0e6",
      btnDisabledText: "#a8a29e",

      inputBg: "#ffffff",
      inputText: "#292524",
      inputBorder: "#d4cbba",
      inputFocus: "#ea580c",
      inputPlaceholder: "#969089",

      bgSidebar: "#f2ece2",
      sidebarText: "#57534e",
      sidebarHover: "#e6decb",
      sidebarActive: "#ffffff",
      sidebarBorder: "#ded5c5",

      bgUserMsg: "#ede6d8",
      userMsgText: "#292524",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#292524",
      messageHover: "rgba(0, 0, 0, 0.02)",
      messageBorder: "#ded5c5",

      codeBg: "#f5eee4",
      codeHeaderBg: "#ece2d2",
      codeText: "#292524",
      codeBorder: "#ded5c5",
      codeInlineBg: "#eee5d5",
      codeInlineText: "#c2410c",

      borderColor: "#ded5c5",
      borderSubtle: "#ebe3d5",
      borderStrong: "#c7bba8",

      colorError: "#dc2626",
      colorWarning: "#d97706",
      colorSuccess: "#059669",
      linkColor: "#c2410c",
      selectionBg: "rgba(234, 88, 12, 0.18)",
      selectionText: "#292524",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(120, 113, 108, 0.18)",
      scrollbarThumbHover: "rgba(120, 113, 108, 0.35)",
    },
  },
  "deep-black": {
    id: "deep-black",
    name: "Deep Black (OLED)",
    isDark: true,
    colors: {
      bgPrimary: "#000000",
      bgSecondary: "#0c0c0e",
      bgSurface: "#141417",
      bgElevated: "#1a1a20",
      bgHeader: "#0a0a0c",

      textPrimary: "#f8fafc",
      textSecondary: "#a1a1aa",
      textMuted: "#52525b",
      textDisabled: "#3f3f46",

      accentColor: "#6366f1",
      accentHover: "#4f46e5",
      accentActive: "#4338ca",
      accentText: "#ffffff",

      btnBg: "#14141a",
      btnText: "#f4f4f5",
      btnHover: "#20202a",
      btnActive: "#2a2a38",
      btnDisabledBg: "#0a0a0d",
      btnDisabledText: "#3f3f46",

      inputBg: "#08080a",
      inputText: "#f8fafc",
      inputBorder: "#22222a",
      inputFocus: "#6366f1",
      inputPlaceholder: "#52525b",

      bgSidebar: "#08080a",
      sidebarText: "#a1a1aa",
      sidebarHover: "#181820",
      sidebarActive: "#141417",
      sidebarBorder: "#22222a",

      bgUserMsg: "#181822",
      userMsgText: "#f8fafc",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#f8fafc",
      messageHover: "rgba(255, 255, 255, 0.03)",
      messageBorder: "#22222a",

      codeBg: "#050507",
      codeHeaderBg: "#0e0e12",
      codeText: "#f8fafc",
      codeBorder: "#22222a",
      codeInlineBg: "#15151c",
      codeInlineText: "#f43f5e",

      borderColor: "#22222a",
      borderSubtle: "#16161c",
      borderStrong: "#383846",

      colorError: "#ef4444",
      colorWarning: "#f59e0b",
      colorSuccess: "#10b981",
      linkColor: "#818cf8",
      selectionBg: "rgba(99, 102, 241, 0.35)",
      selectionText: "#ffffff",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(255, 255, 255, 0.14)",
      scrollbarThumbHover: "rgba(255, 255, 255, 0.32)",
    },
  },
  graphite: {
    id: "graphite",
    name: "Graphite Dark",
    isDark: true,
    colors: {
      bgPrimary: "#14161b",
      bgSecondary: "#1b1e25",
      bgSurface: "#222630",
      bgElevated: "#2b303d",
      bgHeader: "#14161b",

      textPrimary: "#f1f5f9",
      textSecondary: "#94a3b8",
      textMuted: "#64748b",
      textDisabled: "#475569",

      accentColor: "#3b82f6",
      accentHover: "#2563eb",
      accentActive: "#1d4ed8",
      accentText: "#ffffff",

      btnBg: "#202530",
      btnText: "#f1f5f9",
      btnHover: "#2b3241",
      btnActive: "#353e50",
      btnDisabledBg: "#181b22",
      btnDisabledText: "#475569",

      inputBg: "#161920",
      inputText: "#f1f5f9",
      inputBorder: "#2c323f",
      inputFocus: "#3b82f6",
      inputPlaceholder: "#64748b",

      bgSidebar: "#171a20",
      sidebarText: "#94a3b8",
      sidebarHover: "#262b36",
      sidebarActive: "#222630",
      sidebarBorder: "#2c323f",

      bgUserMsg: "#282e3b",
      userMsgText: "#f1f5f9",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#f1f5f9",
      messageHover: "rgba(255, 255, 255, 0.03)",
      messageBorder: "#2c323f",

      codeBg: "#0d0f14",
      codeHeaderBg: "#181c24",
      codeText: "#f1f5f9",
      codeBorder: "#2c323f",
      codeInlineBg: "#222733",
      codeInlineText: "#60a5fa",

      borderColor: "#2c323f",
      borderSubtle: "#202530",
      borderStrong: "#434b5c",

      colorError: "#f87171",
      colorWarning: "#fbbf24",
      colorSuccess: "#34d399",
      linkColor: "#60a5fa",
      selectionBg: "rgba(59, 130, 246, 0.3)",
      selectionText: "#ffffff",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(255, 255, 255, 0.12)",
      scrollbarThumbHover: "rgba(255, 255, 255, 0.25)",
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight Teal",
    isDark: true,
    colors: {
      bgPrimary: "#0a1318",
      bgSecondary: "#101d24",
      bgSurface: "#172730",
      bgElevated: "#213642",
      bgHeader: "#0a1318",

      textPrimary: "#f0fdfa",
      textSecondary: "#5eead4",
      textMuted: "#64748b",
      textDisabled: "#334155",

      accentColor: "#14b8a6",
      accentHover: "#0d9488",
      accentActive: "#0f766e",
      accentText: "#071217",

      btnBg: "#142833",
      btnText: "#f0fdfa",
      btnHover: "#1c3847",
      btnActive: "#24475a",
      btnDisabledBg: "#0c181f",
      btnDisabledText: "#334155",

      inputBg: "#0c171e",
      inputText: "#f0fdfa",
      inputBorder: "#1f3a47",
      inputFocus: "#14b8a6",
      inputPlaceholder: "#64748b",

      bgSidebar: "#0d171d",
      sidebarText: "#5eead4",
      sidebarHover: "#182c37",
      sidebarActive: "#172730",
      sidebarBorder: "#1f3a47",

      bgUserMsg: "#1c323d",
      userMsgText: "#f0fdfa",
      bgAssistantMsg: "transparent",
      assistantMsgText: "#f0fdfa",
      messageHover: "rgba(255, 255, 255, 0.03)",
      messageBorder: "#1f3a47",

      codeBg: "#060e13",
      codeHeaderBg: "#102029",
      codeText: "#f0fdfa",
      codeBorder: "#1f3a47",
      codeInlineBg: "#172b36",
      codeInlineText: "#2dd4bf",

      borderColor: "#1f3a47",
      borderSubtle: "#162a34",
      borderStrong: "#2d5466",

      colorError: "#f87171",
      colorWarning: "#fbbf24",
      colorSuccess: "#34d399",
      linkColor: "#2dd4bf",
      selectionBg: "rgba(20, 184, 166, 0.3)",
      selectionText: "#ffffff",

      scrollbarTrack: "transparent",
      scrollbarThumb: "rgba(20, 184, 166, 0.2)",
      scrollbarThumbHover: "rgba(20, 184, 166, 0.4)",
    },
  },
};

const CUSTOM_THEMES_STORAGE_KEY = "ollama_chat_custom_themes_list";
const LEGACY_CUSTOM_THEME_STORAGE_KEY = "ollama_chat_custom_theme";

/**
 * Merge partial colors with standard base theme colors to guarantee 100% token coverage and safety.
 */
export function normalizeThemeColors(
  partialColors?: Partial<ThemeColors>,
  baseColors: ThemeColors = BUILTIN_THEMES.dark.colors
): ThemeColors {
  return {
    ...baseColors,
    ...(partialColors || {}),
  };
}

export const ThemeEngine = {
  /**
   * Retrieve all saved custom themes.
   */
  getCustomThemes(): CustomTheme[] {
    try {
      const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            const baseTheme = BUILTIN_THEMES[item.baseThemeId] || BUILTIN_THEMES.dark;
            return {
              id: item.id || `custom-${Date.now()}`,
              name: item.name || "Custom Theme",
              isDark: item.isDark ?? baseTheme.isDark,
              isCustom: true as const,
              baseThemeId: item.baseThemeId || "dark",
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now(),
              colors: normalizeThemeColors(item.colors, baseTheme.colors),
            };
          });
        }
      }

      // Check legacy single custom theme storage key for backward compatibility
      const legacyRaw = localStorage.getItem(LEGACY_CUSTOM_THEME_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        const base = BUILTIN_THEMES.dark;
        const migrated: CustomTheme = {
          id: "custom",
          name: "My Custom Theme",
          isDark: parsed.isDark ?? true,
          isCustom: true,
          baseThemeId: "dark",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          colors: normalizeThemeColors(parsed.colors, base.colors),
        };
        this.saveCustomTheme(migrated);
        return [migrated];
      }
    } catch (e) {
      console.error("Failed to read custom themes:", e);
    }
    return [];
  },

  /**
   * Save a single custom theme (insert or update).
   */
  saveCustomTheme(theme: CustomTheme): void {
    try {
      const themes = this.getCustomThemes();
      const existingIdx = themes.findIndex((t) => t.id === theme.id);
      const updatedTheme: CustomTheme = {
        ...theme,
        isCustom: true,
        updatedAt: Date.now(),
        colors: normalizeThemeColors(theme.colors, BUILTIN_THEMES[theme.baseThemeId]?.colors),
      };

      if (existingIdx >= 0) {
        themes[existingIdx] = updatedTheme;
      } else {
        themes.push(updatedTheme);
      }

      localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));

      // Keep legacy storage key synced if it's the default "custom" ID or first custom theme
      if (theme.id === "custom" || themes.length === 1) {
        localStorage.setItem(
          LEGACY_CUSTOM_THEME_STORAGE_KEY,
          JSON.stringify({ isDark: updatedTheme.isDark, colors: updatedTheme.colors })
        );
      }
    } catch (e) {
      console.error("Failed to save custom theme:", e);
    }
  },

  /**
   * Delete a custom theme by ID.
   */
  deleteCustomTheme(themeId: string): void {
    try {
      const themes = this.getCustomThemes().filter((t) => t.id !== themeId);
      localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
    } catch (e) {
      console.error("Failed to delete custom theme:", e);
    }
  },

  /**
   * Create a new custom theme initialized from an existing base theme.
   */
  createCustomThemeFromBase(baseThemeId = "dark", name = "New Custom Theme"): CustomTheme {
    const baseTheme = BUILTIN_THEMES[baseThemeId] || BUILTIN_THEMES.dark;
    const newId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: newId,
      name,
      baseThemeId: baseTheme.id,
      isDark: baseTheme.isDark,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      colors: { ...baseTheme.colors },
    };
  },

  /**
   * Legacy helper for retrieving single custom theme.
   */
  getCustomTheme(): CustomTheme {
    const customThemes = this.getCustomThemes();
    if (customThemes.length > 0) {
      return customThemes[0];
    }
    return {
      id: "custom",
      name: "Custom Theme",
      isDark: true,
      isCustom: true,
      baseThemeId: "dark",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      colors: { ...BUILTIN_THEMES.dark.colors },
    };
  },

  /**
   * Retrieve any theme configuration (built-in or custom).
   */
  getThemeConfig(themeId: string): ThemeConfig {
    if (themeId === "system") {
      const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? BUILTIN_THEMES.dark : BUILTIN_THEMES.light;
    }

    if (BUILTIN_THEMES[themeId]) {
      return BUILTIN_THEMES[themeId];
    }

    const customThemes = this.getCustomThemes();
    const found = customThemes.find((t) => t.id === themeId);
    if (found) return found;

    if (themeId === "custom" && customThemes.length > 0) {
      return customThemes[0];
    }

    return BUILTIN_THEMES.dark;
  },

  /**
   * Apply a theme to document.documentElement via CSS Variables & HTML class.
   */
  applyTheme(themeId: string, customColorsOverride?: Partial<ThemeColors>): ThemeConfig {
    let config: ThemeConfig;

    if (themeId === "system") {
      const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      config = prefersDark ? BUILTIN_THEMES.dark : BUILTIN_THEMES.light;
    } else if (BUILTIN_THEMES[themeId]) {
      config = BUILTIN_THEMES[themeId];
    } else {
      const customThemes = this.getCustomThemes();
      const found = customThemes.find((t) => t.id === themeId);
      if (found) {
        config = found;
      } else {
        config = BUILTIN_THEMES.dark;
      }
    }

    if (customColorsOverride) {
      config = {
        ...config,
        colors: {
          ...config.colors,
          ...customColorsOverride,
        },
      };
    }

    if (typeof document === "undefined") return config;

    const root = document.documentElement;
    const { colors, isDark } = config;

    // Set theme mode flags for CSS class / attribute targets
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

      "--syntax-keyword": colors.syntaxKeyword || "",
      "--syntax-function": colors.syntaxFunction || "",
      "--syntax-variable": colors.syntaxVariable || "",
      "--syntax-string": colors.syntaxString || "",
      "--syntax-number": colors.syntaxNumber || "",
      "--syntax-comment": colors.syntaxComment || "",
      "--syntax-type": colors.syntaxType || "",
      "--syntax-operator": colors.syntaxOperator || "",
      "--syntax-constant": colors.syntaxConstant || "",
      "--syntax-tag": colors.syntaxTag || "",
      "--syntax-attr": colors.syntaxAttr || "",
      "--syntax-builtin": colors.syntaxBuiltin || "",

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
      "--composer-focus-border": colors.composerFocusBorder || colors.accentColor || colors.inputFocus,
      "--composer-text": colors.composerText || colors.inputText || colors.textPrimary,
      "--composer-placeholder": colors.composerPlaceholder || colors.inputPlaceholder || colors.textMuted,

      // Composer Send Button
      "--composer-send-bg": colors.composerSendBg || colors.accentColor,
      "--composer-send-hover-bg": colors.composerSendHoverBg || colors.composerSendHover || colors.accentHover,
      "--composer-send-disabled-bg": colors.composerSendDisabledBg || colors.btnDisabledBg || colors.btnBg,
      "--composer-send-icon": colors.composerSendIcon || colors.composerSendText || colors.accentText,
      "--composer-send-hover-icon": colors.composerSendHoverIcon || colors.composerSendIcon || colors.composerSendText || colors.accentText,
      "--composer-send-disabled-icon": colors.composerSendDisabledIcon || colors.textMuted,
      "--composer-send-generating-bg": colors.composerSendGeneratingBg || colors.textPrimary,
      "--composer-send-generating-hover-bg": colors.composerSendGeneratingHoverBg || colors.composerSendGeneratingBg || colors.textPrimary,
      "--composer-send-generating-icon": colors.composerSendGeneratingIcon || colors.bgPrimary,

      // Composer Thinking Button
      "--composer-think-off-bg": colors.composerThinkOffBg || "#27272a",
      "--composer-think-off-text": colors.composerThinkOffText || "#a1a1aa",
      "--composer-think-off-border": colors.composerThinkOffBorder || "#3f3f46",
      "--composer-think-off-hover-bg": colors.composerThinkOffHoverBg || "#323238",
      "--composer-think-off-hover-text": colors.composerThinkOffHoverText || "#e4e4e7",
      "--composer-think-on-bg": colors.composerThinkOnBg || "#e4e4e7",
      "--composer-think-on-text": colors.composerThinkOnText || "#18181b",
      "--composer-think-on-border": colors.composerThinkOnBorder || "#d4d4d8",
      "--composer-think-on-hover-bg": colors.composerThinkOnHoverBg || "#f4f4f5",
      "--composer-think-on-hover-text": colors.composerThinkOnHoverText || "#18181b",

      // Composer Add File Button
      "--composer-add-file-bg": colors.composerAddFileBg || colors.btnBg,
      "--composer-add-file-border": colors.composerAddFileBorder || colors.borderColor,
      "--composer-add-file-text": colors.composerAddFileText || colors.textSecondary,
      "--composer-add-file-hover-bg": colors.composerAddFileHoverBg || colors.btnHover,
      "--composer-add-file-hover-border": colors.composerAddFileHoverBorder || colors.borderStrong || colors.borderColor,
      "--composer-add-file-hover-text": colors.composerAddFileHoverText || colors.textPrimary,

      // Legacy fallback
      "--composer-btn-bg": colors.composerBtnBg || colors.btnBg,
      "--composer-btn-hover": colors.composerBtnHover || colors.btnHover,
      "--composer-btn-text": colors.composerBtnText || colors.textSecondary,
      "--composer-btn-border": colors.composerBtnBorder || colors.borderColor,
      "--composer-send-text": colors.composerSendText || colors.accentText,
      "--composer-send-hover": colors.composerSendHover || colors.accentHover,
    };

    Object.entries(cssVars).forEach(([key, val]) => {
      if (val) {
        root.style.setProperty(key, val);
      } else {
        root.style.removeProperty(key);
      }
    });

    return config;
  },
};

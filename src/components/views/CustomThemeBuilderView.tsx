import React, { useState, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  Palette,
  Moon,
  Sun,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  Layers,
  Search,
  Maximize2,
  Minimize2,
  Terminal,
  MessageSquare,
} from "lucide-react";
import {
  ThemeColors,
  CustomTheme,
  BUILTIN_THEMES,
  ThemeEngine,
  normalizeThemeColors,
} from "../../lib/themeEngine";
import { calculateContrast } from "../../lib/colorUtils";
import { ColorTokenField } from "../theme/ColorTokenField";
import { LiveThemePreview } from "../theme/LiveThemePreview";

interface CustomThemeBuilderViewProps {
  initialThemeId?: string;
  baseThemeId?: string;
  onBack: () => void;
  onSaveTheme: (savedTheme: CustomTheme) => void;
}

export const CustomThemeBuilderView: React.FC<CustomThemeBuilderViewProps> = ({
  initialThemeId,
  baseThemeId = "dark",
  onBack,
  onSaveTheme,
}) => {
  // Existing theme lookup or create new
  const existingTheme = useMemo(() => {
    if (initialThemeId) {
      const customList = ThemeEngine.getCustomThemes();
      return customList.find((t) => t.id === initialThemeId);
    }
    return undefined;
  }, [initialThemeId]);

  // Initial base theme
  const initialBaseId = existingTheme?.baseThemeId || baseThemeId || "dark";
  const [selectedBaseId, setSelectedBaseId] = useState<string>(initialBaseId);
  const baseThemeConfig = BUILTIN_THEMES[selectedBaseId] || BUILTIN_THEMES.dark;

  // Working custom theme state
  const [themeId] = useState<string>(existingTheme?.id || `custom-${Date.now()}`);
  const [themeName, setThemeName] = useState<string>(existingTheme?.name || "My Custom Theme");
  const [isDark, setIsDark] = useState<boolean>(existingTheme?.isDark ?? baseThemeConfig.isDark);
  const [colors, setColors] = useState<ThemeColors>(() => {
    if (existingTheme) {
      return normalizeThemeColors(existingTheme.colors, baseThemeConfig.colors);
    }
    return { ...baseThemeConfig.colors };
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showContrastModal, setShowContrastModal] = useState(false);
  const [activePickerTokenKey, setActivePickerTokenKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion section open/collapse states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    backgrounds: true,
    text: true,
    accent: true,
    buttons: true,
    inputs: true,
    sidebar: false,
    chat: false,
    code: false,
    borders: false,
    status: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleExpandAll = () => {
    setExpandedSections({
      backgrounds: true,
      text: true,
      accent: true,
      buttons: true,
      inputs: true,
      sidebar: true,
      chat: true,
      code: true,
      borders: true,
      status: true,
    });
  };

  const handleCollapseAll = () => {
    setExpandedSections({
      backgrounds: false,
      text: false,
      accent: false,
      buttons: false,
      inputs: false,
      sidebar: false,
      chat: false,
      code: false,
      borders: false,
      status: false,
    });
  };

  // Base theme change handler
  const handleBaseThemeChange = (newBaseId: string) => {
    setSelectedBaseId(newBaseId);
    const newBase = BUILTIN_THEMES[newBaseId] || BUILTIN_THEMES.dark;
    setIsDark(newBase.isDark);
    setColors({ ...newBase.colors });
  };

  // Reset colors to base theme
  const handleResetToBase = () => {
    const base = BUILTIN_THEMES[selectedBaseId] || BUILTIN_THEMES.dark;
    setColors({ ...base.colors });
    setIsDark(base.isDark);
    setShowResetConfirm(false);
  };

  // Single token change
  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save custom theme
  const handleSave = () => {
    const customTheme: CustomTheme = {
      id: themeId,
      name: themeName.trim() || "Custom Theme",
      baseThemeId: selectedBaseId,
      isDark,
      isCustom: true,
      createdAt: existingTheme?.createdAt || Date.now(),
      updatedAt: Date.now(),
      colors,
    };

    ThemeEngine.saveCustomTheme(customTheme);
    onSaveTheme(customTheme);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Export custom theme JSON
  const handleExportJson = () => {
    const exportData = {
      id: themeId,
      name: themeName,
      baseThemeId: selectedBaseId,
      isDark,
      version: 1,
      createdAt: Date.now(),
      colors,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement("a");
    const safeFilename = (themeName.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "custom_theme") + ".theme.json";
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", safeFilename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import custom theme JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === "object") {
          if (parsed.name) setThemeName(parsed.name);
          if (parsed.isDark !== undefined) setIsDark(Boolean(parsed.isDark));
          if (parsed.baseThemeId && BUILTIN_THEMES[parsed.baseThemeId]) {
            setSelectedBaseId(parsed.baseThemeId);
          }
          if (parsed.colors && typeof parsed.colors === "object") {
            const base = BUILTIN_THEMES[parsed.baseThemeId] || BUILTIN_THEMES.dark;
            setColors(normalizeThemeColors(parsed.colors, base.colors));
          }
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        }
      } catch (err) {
        alert("Failed to parse theme file. Please ensure it is valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Accessibility contrast calculations
  const contrastChecks = useMemo(() => {
    return {
      textOnBg: calculateContrast(colors.textPrimary, colors.bgPrimary),
      secondaryTextOnBg: calculateContrast(colors.textSecondary, colors.bgPrimary),
      accentTextOnAccent: calculateContrast(colors.accentText, colors.accentColor),
      btnTextOnBtnBg: calculateContrast(colors.btnText, colors.btnBg),
      inputTextOnInputBg: calculateContrast(colors.inputText, colors.inputBg),
      userMsgTextOnUserBg: calculateContrast(colors.userMsgText, colors.bgUserMsg),
      codeTextOnCodeBg: calculateContrast(colors.codeText, colors.codeBg),
      sidebarTextOnSidebarBg: calculateContrast(colors.sidebarText, colors.bgSidebar),
    };
  }, [colors]);

  const hasContrastWarnings = Object.values(contrastChecks).some((c) => c.status !== "pass");

  // Filter helper for token search
  const isMatch = (tokenKey: string, label: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return tokenKey.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  };

  // Helper to count modified tokens per section
  const countModified = (keys: Array<keyof ThemeColors>) => {
    return keys.filter(
      (k) => colors[k] && baseThemeConfig.colors[k] && colors[k]?.toLowerCase() !== baseThemeConfig.colors[k]?.toLowerCase()
    ).length;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary,#131418)] animate-fadeIn select-none">
      {/* ====================================================================
          TOP TOOLBAR HEADER
         ==================================================================== */}
      <header className="px-4 sm:px-6 py-3 border-b border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
            title="Return to Appearance Settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-[var(--border-color,#282a36)]" />

          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary,#e6e9f0)]">
              Custom Theme Builder
            </span>
          </div>
        </div>

        {/* Theme Name input & Main Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Theme Name input */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="Theme Name..."
              className="px-2.5 py-1.5 rounded-xl bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] focus:border-[var(--input-focus,#818cf8)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] w-36 sm:w-48 focus:outline-hidden"
            />
          </div>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--accent-color,#818cf8)]"
                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
            }`}
            title="Toggle Light / Dark classification"
          >
            {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isDark ? "Dark Mode" : "Light Mode"}</span>
          </button>

          {/* Contrast Warning Pill / Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowContrastModal(!showContrastModal)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              hasContrastWarnings
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            }`}
            title="Check WCAG 2.1 Color Accessibility"
          >
            {hasContrastWarnings ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{hasContrastWarnings ? "Contrast Warning" : "WCAG AA Pass"}</span>
          </button>

          {/* Hidden File Input for Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.theme.json"
            onChange={handleImportJson}
            className="hidden"
          />

          {/* Import JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
            title="Import Theme JSON"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
            title="Export Theme JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-amber-400 transition-colors cursor-pointer"
              title="Reset all colors to base theme"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {showResetConfirm && (
              <div className="absolute right-0 top-full mt-2 z-40 p-3 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-2xl w-60 space-y-2.5 animate-scaleIn">
                <p className="text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">Reset to base theme?</p>
                <p className="text-[11px] text-[var(--text-muted,#6b7280)]">
                  All custom modifications will be replaced with {baseThemeConfig.name} defaults.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--btn-hover,#262834)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToBase}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save Theme Button */}
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] hover:brightness-110 active:scale-98 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? "Saved!" : "Save Theme"}</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          MAIN TWO-COLUMN WORKSPACE: TOKEN EDITOR & LIVE PREVIEW
         ==================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* LEFT COLUMN: INDEPENDENT SCROLLABLE TOKEN EDITOR */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar border-r border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)] min-h-0 space-y-4">
          {/* BASE THEME PRESET SELECTOR CARD */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3 shrink-0 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color,#818cf8)]">
                  Base Theme Preset
                </h3>
                <p className="text-[11px] text-[var(--text-muted,#6b7280)] mt-0.5">
                  Choose a starting palette. Built-in themes are never overwritten.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(BUILTIN_THEMES).map((th) => {
                const isSelected = selectedBaseId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleBaseThemeChange(th.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/30"
                        : "border-[var(--border-subtle,#1e2029)] bg-[var(--bg-primary,#131418)]/60 hover:border-[var(--border-color,#282a36)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px] text-[var(--text-primary,#e6e9f0)] truncate">
                        {th.name}
                      </span>
                      {th.isDark ? (
                        <Moon className="w-3 h-3 text-[var(--accent-color,#818cf8)]" />
                      ) : (
                        <Sun className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: th.colors.bgPrimary }} />
                      <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: th.colors.accentColor }} />
                      <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: th.colors.textPrimary }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACCESSIBILITY CONTRAST SUMMARY PANEL */}
          {showContrastModal && (
            <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3 animate-fadeIn shrink-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)]">
                    Color Accessibility Evaluation (WCAG 2.1)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContrastModal(false)}
                  className="text-xs text-[var(--text-muted,#6b7280)] hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(contrastChecks).map(([key, res]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-[var(--bg-primary,#131418)]/80 border border-[var(--border-subtle,#1e2029)] flex items-center justify-between"
                  >
                    <span className="text-[11px] text-[var(--text-secondary,#9ba3b2)] capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        res.status === "pass"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : res.status === "warn"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {res.formattedRatio}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH FILTER & SECTION EXPAND/COLLAPSE CONTROLS */}
          <div className="flex items-center justify-between gap-2.5 pt-1 pb-1 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search color tokens (e.g. background, accent, sidebar)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] focus:border-[var(--input-focus,#818cf8)] text-xs text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExpandAll}
                className="p-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
                title="Expand all categories"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="p-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
                title="Collapse all categories"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ==================================================================
              CATEGORY 1: CORE BACKGROUNDS & SURFACES
             ================================================================== */}
          {(isMatch("bgPrimary", "Primary Background") ||
            isMatch("bgSecondary", "Secondary Background") ||
            isMatch("bgSurface", "Surface Background") ||
            isMatch("bgElevated", "Elevated Surface") ||
            isMatch("bgHeader", "Header Background")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("backgrounds")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">1. Core Backgrounds & Surfaces</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Canvas, cards, headers</span>
                      {countModified(["bgPrimary", "bgSecondary", "bgSurface", "bgElevated", "bgHeader"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["bgPrimary", "bgSecondary", "bgSurface", "bgElevated", "bgHeader"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.backgrounds ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.backgrounds && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("bgPrimary", "Primary Background") && (
                    <ColorTokenField
                      label="Primary Background"
                      description="Main chat canvas and page background"
                      tokenKey="bgPrimary"
                      value={colors.bgPrimary}
                      baseValue={baseThemeConfig.colors.bgPrimary}
                      onChange={(v) => handleColorChange("bgPrimary", v)}
                      onResetToBase={() => handleColorChange("bgPrimary", baseThemeConfig.colors.bgPrimary)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                      isImportant
                    />
                  )}
                  {isMatch("bgSecondary", "Secondary Background") && (
                    <ColorTokenField
                      label="Secondary Background"
                      description="Sidebars, secondary toolbars, and panels"
                      tokenKey="bgSecondary"
                      value={colors.bgSecondary}
                      baseValue={baseThemeConfig.colors.bgSecondary}
                      onChange={(v) => handleColorChange("bgSecondary", v)}
                      onResetToBase={() => handleColorChange("bgSecondary", baseThemeConfig.colors.bgSecondary)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("bgSurface", "Surface Background") && (
                    <ColorTokenField
                      label="Surface Background"
                      description="Cards, settings items, and message containers"
                      tokenKey="bgSurface"
                      value={colors.bgSurface}
                      baseValue={baseThemeConfig.colors.bgSurface}
                      onChange={(v) => handleColorChange("bgSurface", v)}
                      onResetToBase={() => handleColorChange("bgSurface", baseThemeConfig.colors.bgSurface)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                      isImportant
                    />
                  )}
                  {isMatch("bgElevated", "Elevated Surface") && (
                    <ColorTokenField
                      label="Elevated Surface"
                      description="Modals, dropdown popovers, and elevated cards"
                      tokenKey="bgElevated"
                      value={colors.bgElevated || colors.bgSurface}
                      baseValue={baseThemeConfig.colors.bgElevated || baseThemeConfig.colors.bgSurface}
                      onChange={(v) => handleColorChange("bgElevated", v)}
                      onResetToBase={() => handleColorChange("bgElevated", baseThemeConfig.colors.bgElevated)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("bgHeader", "Header Background") && (
                    <ColorTokenField
                      label="Header Background"
                      description="Top navigation bar and title header"
                      tokenKey="bgHeader"
                      value={colors.bgHeader}
                      baseValue={baseThemeConfig.colors.bgHeader}
                      onChange={(v) => handleColorChange("bgHeader", v)}
                      onResetToBase={() => handleColorChange("bgHeader", baseThemeConfig.colors.bgHeader)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 2: TEXT & TYPOGRAPHY
             ================================================================== */}
          {(isMatch("textPrimary", "Primary Text") ||
            isMatch("textSecondary", "Secondary Text") ||
            isMatch("textMuted", "Muted Text") ||
            isMatch("textDisabled", "Disabled Text")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("text")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">2. Text & Typography</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Headings, body text, muted details</span>
                      {countModified(["textPrimary", "textSecondary", "textMuted", "textDisabled"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["textPrimary", "textSecondary", "textMuted", "textDisabled"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.text ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.text && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("textPrimary", "Primary Text") && (
                    <ColorTokenField
                      label="Primary Text"
                      description="Main headings, markdown body, and model responses"
                      tokenKey="textPrimary"
                      value={colors.textPrimary}
                      baseValue={baseThemeConfig.colors.textPrimary}
                      onChange={(v) => handleColorChange("textPrimary", v)}
                      onResetToBase={() => handleColorChange("textPrimary", baseThemeConfig.colors.textPrimary)}
                      contrastInfo={contrastChecks.textOnBg}
                      contrastContextLabel="Primary Background"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                      isImportant
                    />
                  )}
                  {isMatch("textSecondary", "Secondary Text") && (
                    <ColorTokenField
                      label="Secondary Text"
                      description="Subtitles, badges, labels, and secondary information"
                      tokenKey="textSecondary"
                      value={colors.textSecondary}
                      baseValue={baseThemeConfig.colors.textSecondary}
                      onChange={(v) => handleColorChange("textSecondary", v)}
                      onResetToBase={() => handleColorChange("textSecondary", baseThemeConfig.colors.textSecondary)}
                      contrastInfo={contrastChecks.secondaryTextOnBg}
                      contrastContextLabel="Primary Background"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("textMuted", "Muted Text") && (
                    <ColorTokenField
                      label="Muted Text"
                      description="Timestamps, metadata, hints, and token counts"
                      tokenKey="textMuted"
                      value={colors.textMuted}
                      baseValue={baseThemeConfig.colors.textMuted}
                      onChange={(v) => handleColorChange("textMuted", v)}
                      onResetToBase={() => handleColorChange("textMuted", baseThemeConfig.colors.textMuted)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("textDisabled", "Disabled Text") && (
                    <ColorTokenField
                      label="Disabled Text"
                      description="Inactive controls and disabled state labels"
                      tokenKey="textDisabled"
                      value={colors.textDisabled || "#6b7280"}
                      baseValue={baseThemeConfig.colors.textDisabled || "#6b7280"}
                      onChange={(v) => handleColorChange("textDisabled", v)}
                      onResetToBase={() => handleColorChange("textDisabled", baseThemeConfig.colors.textDisabled)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 3: BRAND & ACCENT
             ================================================================== */}
          {(isMatch("accentColor", "Accent Color") ||
            isMatch("accentHover", "Accent Hover") ||
            isMatch("accentActive", "Accent Active") ||
            isMatch("accentText", "Accent Foreground Text")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("accent")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">3. Brand & Accent Colors</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Primary highlights, focus states, interactive action buttons</span>
                      {countModified(["accentColor", "accentHover", "accentActive", "accentText"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["accentColor", "accentHover", "accentActive", "accentText"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.accent ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.accent && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("accentColor", "Accent Color") && (
                    <ColorTokenField
                      label="Accent Color"
                      description="Primary brand color, send button, active toggles"
                      tokenKey="accentColor"
                      value={colors.accentColor}
                      baseValue={baseThemeConfig.colors.accentColor}
                      onChange={(v) => handleColorChange("accentColor", v)}
                      onResetToBase={() => handleColorChange("accentColor", baseThemeConfig.colors.accentColor)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                      isImportant
                    />
                  )}
                  {isMatch("accentHover", "Accent Hover") && (
                    <ColorTokenField
                      label="Accent Hover"
                      description="Hover state for primary action buttons"
                      tokenKey="accentHover"
                      value={colors.accentHover}
                      baseValue={baseThemeConfig.colors.accentHover}
                      onChange={(v) => handleColorChange("accentHover", v)}
                      onResetToBase={() => handleColorChange("accentHover", baseThemeConfig.colors.accentHover)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("accentActive", "Accent Active") && (
                    <ColorTokenField
                      label="Accent Active (Pressed)"
                      description="Active/pressed state for primary action buttons"
                      tokenKey="accentActive"
                      value={colors.accentActive || colors.accentHover}
                      baseValue={baseThemeConfig.colors.accentActive || baseThemeConfig.colors.accentHover}
                      onChange={(v) => handleColorChange("accentActive", v)}
                      onResetToBase={() => handleColorChange("accentActive", baseThemeConfig.colors.accentActive)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("accentText", "Accent Foreground Text") && (
                    <ColorTokenField
                      label="Accent Foreground Text"
                      description="Text rendered directly over the accent color"
                      tokenKey="accentText"
                      value={colors.accentText}
                      baseValue={baseThemeConfig.colors.accentText}
                      onChange={(v) => handleColorChange("accentText", v)}
                      onResetToBase={() => handleColorChange("accentText", baseThemeConfig.colors.accentText)}
                      contrastInfo={contrastChecks.accentTextOnAccent}
                      contrastContextLabel="Accent Color"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                      isImportant
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 4: BUTTONS & CONTROLS
             ================================================================== */}
          {(isMatch("btnBg", "Button Background") ||
            isMatch("btnText", "Button Text") ||
            isMatch("btnHover", "Button Hover") ||
            isMatch("btnActive", "Button Active") ||
            isMatch("btnDisabledBg", "Button Disabled Background") ||
            isMatch("btnDisabledText", "Button Disabled Text")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("buttons")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">4. Buttons & Controls</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Default, hover, active, and disabled button states</span>
                      {countModified(["btnBg", "btnText", "btnHover", "btnActive", "btnDisabledBg", "btnDisabledText"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["btnBg", "btnText", "btnHover", "btnActive", "btnDisabledBg", "btnDisabledText"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.buttons ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.buttons && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("btnBg", "Button Background") && (
                    <ColorTokenField
                      label="Button Background (Default)"
                      description="Standard secondary button background"
                      tokenKey="btnBg"
                      value={colors.btnBg}
                      baseValue={baseThemeConfig.colors.btnBg}
                      onChange={(v) => handleColorChange("btnBg", v)}
                      onResetToBase={() => handleColorChange("btnBg", baseThemeConfig.colors.btnBg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("btnText", "Button Text") && (
                    <ColorTokenField
                      label="Button Text"
                      description="Text color inside secondary buttons"
                      tokenKey="btnText"
                      value={colors.btnText}
                      baseValue={baseThemeConfig.colors.btnText}
                      onChange={(v) => handleColorChange("btnText", v)}
                      onResetToBase={() => handleColorChange("btnText", baseThemeConfig.colors.btnText)}
                      contrastInfo={contrastChecks.btnTextOnBtnBg}
                      contrastContextLabel="Button Background"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("btnHover", "Button Hover") && (
                    <ColorTokenField
                      label="Button Hover State"
                      description="Background when hovering over a button"
                      tokenKey="btnHover"
                      value={colors.btnHover}
                      baseValue={baseThemeConfig.colors.btnHover}
                      onChange={(v) => handleColorChange("btnHover", v)}
                      onResetToBase={() => handleColorChange("btnHover", baseThemeConfig.colors.btnHover)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("btnActive", "Button Active") && (
                    <ColorTokenField
                      label="Button Active State"
                      description="Background when button is actively clicked/pressed"
                      tokenKey="btnActive"
                      value={colors.btnActive}
                      baseValue={baseThemeConfig.colors.btnActive}
                      onChange={(v) => handleColorChange("btnActive", v)}
                      onResetToBase={() => handleColorChange("btnActive", baseThemeConfig.colors.btnActive)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("btnDisabledBg", "Button Disabled Background") && (
                    <ColorTokenField
                      label="Button Disabled Background"
                      description="Background for inactive/disabled buttons"
                      tokenKey="btnDisabledBg"
                      value={colors.btnDisabledBg || colors.btnBg}
                      baseValue={baseThemeConfig.colors.btnDisabledBg || baseThemeConfig.colors.btnBg}
                      onChange={(v) => handleColorChange("btnDisabledBg", v)}
                      onResetToBase={() => handleColorChange("btnDisabledBg", baseThemeConfig.colors.btnDisabledBg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("btnDisabledText", "Button Disabled Text") && (
                    <ColorTokenField
                      label="Button Disabled Text"
                      description="Text color inside disabled buttons"
                      tokenKey="btnDisabledText"
                      value={colors.btnDisabledText || colors.textDisabled || "#6b7280"}
                      baseValue={baseThemeConfig.colors.btnDisabledText || baseThemeConfig.colors.textDisabled || "#6b7280"}
                      onChange={(v) => handleColorChange("btnDisabledText", v)}
                      onResetToBase={() => handleColorChange("btnDisabledText", baseThemeConfig.colors.btnDisabledText)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 5: COMPOSER & INPUT CONTROLS
             ================================================================== */}
          {(isMatch("composerBg", "Composer Background") ||
            isMatch("composerBorder", "Composer Border") ||
            isMatch("composerFocusBorder", "Composer Focus Border") ||
            isMatch("composerText", "Composer Text") ||
            isMatch("composerPlaceholder", "Composer Placeholder") ||
            isMatch("composerSendBg", "Send Button Background") ||
            isMatch("composerSendHoverBg", "Send Button Hover Background") ||
            isMatch("composerSendDisabledBg", "Send Button Disabled Background") ||
            isMatch("composerSendIcon", "Send Button Icon") ||
            isMatch("composerSendHoverIcon", "Send Button Hover Icon") ||
            isMatch("composerSendDisabledIcon", "Send Button Disabled Icon") ||
            isMatch("composerSendGeneratingBg", "Send Button Generating Background") ||
            isMatch("composerSendGeneratingHoverBg", "Send Button Generating Hover Background") ||
            isMatch("composerSendGeneratingIcon", "Send Button Generating Icon") ||
            isMatch("composerThinkOffBg", "Thinking OFF Background") ||
            isMatch("composerThinkOffText", "Thinking OFF Text") ||
            isMatch("composerThinkOffBorder", "Thinking OFF Border") ||
            isMatch("composerThinkOffHoverBg", "Thinking OFF Hover Background") ||
            isMatch("composerThinkOffHoverText", "Thinking OFF Hover Text") ||
            isMatch("composerThinkOnBg", "Thinking ON Background") ||
            isMatch("composerThinkOnText", "Thinking ON Text") ||
            isMatch("composerThinkOnBorder", "Thinking ON Border") ||
            isMatch("composerThinkOnHoverBg", "Thinking ON Hover Background") ||
            isMatch("composerThinkOnHoverText", "Thinking ON Hover Text") ||
            isMatch("composerAddFileBg", "Add File Background") ||
            isMatch("composerAddFileBorder", "Add File Border") ||
            isMatch("composerAddFileText", "Add File Text") ||
            isMatch("composerAddFileHoverBg", "Add File Hover Background") ||
            isMatch("composerAddFileHoverBorder", "Add File Hover Border") ||
            isMatch("composerAddFileHoverText", "Add File Hover Text") ||
            isMatch("inputBg", "Input Background") ||
            isMatch("inputText", "Input Text") ||
            isMatch("inputBorder", "Input Border") ||
            isMatch("inputFocus", "Input Focus Outline") ||
            isMatch("inputPlaceholder", "Input Placeholder")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("inputs")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">5. Composer & Input Controls</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Message composer, Send, Thinking, Add File buttons & general inputs</span>
                      {countModified([
                        "composerBg",
                        "composerBorder",
                        "composerFocusBorder",
                        "composerText",
                        "composerPlaceholder",
                        "composerSendBg",
                        "composerSendHoverBg",
                        "composerSendDisabledBg",
                        "composerSendIcon",
                        "composerSendHoverIcon",
                        "composerSendDisabledIcon",
                        "composerSendGeneratingBg",
                        "composerSendGeneratingHoverBg",
                        "composerSendGeneratingIcon",
                        "composerThinkOffBg",
                        "composerThinkOffText",
                        "composerThinkOffBorder",
                        "composerThinkOffHoverBg",
                        "composerThinkOffHoverText",
                        "composerThinkOnBg",
                        "composerThinkOnText",
                        "composerThinkOnBorder",
                        "composerThinkOnHoverBg",
                        "composerThinkOnHoverText",
                        "composerAddFileBg",
                        "composerAddFileBorder",
                        "composerAddFileText",
                        "composerAddFileHoverBg",
                        "composerAddFileHoverBorder",
                        "composerAddFileHoverText",
                        "inputBg",
                        "inputText",
                        "inputBorder",
                        "inputFocus",
                        "inputPlaceholder",
                      ]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified([
                            "composerBg",
                            "composerBorder",
                            "composerFocusBorder",
                            "composerText",
                            "composerPlaceholder",
                            "composerSendBg",
                            "composerSendHoverBg",
                            "composerSendDisabledBg",
                            "composerSendIcon",
                            "composerSendHoverIcon",
                            "composerSendDisabledIcon",
                            "composerSendGeneratingBg",
                            "composerSendGeneratingHoverBg",
                            "composerSendGeneratingIcon",
                            "composerThinkOffBg",
                            "composerThinkOffText",
                            "composerThinkOffBorder",
                            "composerThinkOffHoverBg",
                            "composerThinkOffHoverText",
                            "composerThinkOnBg",
                            "composerThinkOnText",
                            "composerThinkOnBorder",
                            "composerThinkOnHoverBg",
                            "composerThinkOnHoverText",
                            "composerAddFileBg",
                            "composerAddFileBorder",
                            "composerAddFileText",
                            "composerAddFileHoverBg",
                            "composerAddFileHoverBorder",
                            "composerAddFileHoverText",
                            "inputBg",
                            "inputText",
                            "inputBorder",
                            "inputFocus",
                            "inputPlaceholder",
                          ])}{" "}
                          modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.inputs ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />
                )}
              </button>

              {expandedSections.inputs && (
                <div className="p-4 pt-2 space-y-6 border-t border-[var(--border-subtle,#1e2029)]">
                  {/* Subsection 1: Composer Container & Form Inputs */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-color,#818cf8)] border-b border-[var(--border-subtle,#1e2029)] pb-1.5">
                      Composer Container & Form Fields
                    </h5>

                    {isMatch("composerBg", "Composer Container Background") && (
                      <ColorTokenField
                        label="Composer Container Background"
                        description="Background color for the main bottom chat input box"
                        tokenKey="composerBg"
                        value={colors.composerBg || colors.bgSurface || colors.inputBg}
                        baseValue={baseThemeConfig.colors.composerBg || baseThemeConfig.colors.bgSurface}
                        onChange={(v) => handleColorChange("composerBg", v)}
                        onResetToBase={() => handleColorChange("composerBg", baseThemeConfig.colors.composerBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerBorder", "Composer Container Border") && (
                      <ColorTokenField
                        label="Composer Container Border"
                        description="Resting border boundary for the bottom composer box"
                        tokenKey="composerBorder"
                        value={colors.composerBorder || colors.borderColor || colors.inputBorder}
                        baseValue={baseThemeConfig.colors.composerBorder || baseThemeConfig.colors.borderColor}
                        onChange={(v) => handleColorChange("composerBorder", v)}
                        onResetToBase={() => handleColorChange("composerBorder", baseThemeConfig.colors.composerBorder || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerFocusBorder", "Composer Active Focus Border") && (
                      <ColorTokenField
                        label="Composer Active Focus Border / Ring"
                        description="Border and glow ring color when typing in the composer"
                        tokenKey="composerFocusBorder"
                        value={colors.composerFocusBorder || colors.accentColor || colors.inputFocus}
                        baseValue={baseThemeConfig.colors.composerFocusBorder || baseThemeConfig.colors.accentColor}
                        onChange={(v) => handleColorChange("composerFocusBorder", v)}
                        onResetToBase={() => handleColorChange("composerFocusBorder", baseThemeConfig.colors.composerFocusBorder || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerText", "Composer Input Text Color") && (
                      <ColorTokenField
                        label="Composer Input Text"
                        description="Typed message prompt text color"
                        tokenKey="composerText"
                        value={colors.composerText || colors.inputText || colors.textPrimary}
                        baseValue={baseThemeConfig.colors.composerText || baseThemeConfig.colors.textPrimary}
                        onChange={(v) => handleColorChange("composerText", v)}
                        onResetToBase={() => handleColorChange("composerText", baseThemeConfig.colors.composerText || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerPlaceholder", "Composer Placeholder Text") && (
                      <ColorTokenField
                        label="Composer Placeholder Text"
                        description="Guidance placeholder text ('Ask Ollama anything...')"
                        tokenKey="composerPlaceholder"
                        value={colors.composerPlaceholder || colors.inputPlaceholder || colors.textMuted}
                        baseValue={baseThemeConfig.colors.composerPlaceholder || baseThemeConfig.colors.textMuted}
                        onChange={(v) => handleColorChange("composerPlaceholder", v)}
                        onResetToBase={() => handleColorChange("composerPlaceholder", baseThemeConfig.colors.composerPlaceholder || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("inputBg", "General Input Background") && (
                      <ColorTokenField
                        label="General Input Background"
                        description="Search inputs, parameter fields, and modal dialog textboxes"
                        tokenKey="inputBg"
                        value={colors.inputBg}
                        baseValue={baseThemeConfig.colors.inputBg}
                        onChange={(v) => handleColorChange("inputBg", v)}
                        onResetToBase={() => handleColorChange("inputBg", baseThemeConfig.colors.inputBg)}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("inputBorder", "General Input Border") && (
                      <ColorTokenField
                        label="General Input Border"
                        description="Default resting border around standard form fields"
                        tokenKey="inputBorder"
                        value={colors.inputBorder}
                        baseValue={baseThemeConfig.colors.inputBorder}
                        onChange={(v) => handleColorChange("inputBorder", v)}
                        onResetToBase={() => handleColorChange("inputBorder", baseThemeConfig.colors.inputBorder)}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("inputFocus", "General Input Focus Outline") && (
                      <ColorTokenField
                        label="General Input Focus Ring"
                        description="Highlight border when an input is actively focused"
                        tokenKey="inputFocus"
                        value={colors.inputFocus}
                        baseValue={baseThemeConfig.colors.inputFocus}
                        onChange={(v) => handleColorChange("inputFocus", v)}
                        onResetToBase={() => handleColorChange("inputFocus", baseThemeConfig.colors.inputFocus)}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}
                  </div>

                  {/* Subsection 2: Send Button All States */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-color,#818cf8)] border-b border-[var(--border-subtle,#1e2029)] pb-1.5">
                      Send Button (Normal, Hover, Disabled, Generating)
                    </h5>

                    {isMatch("composerSendBg", "Send Button Background - Normal") && (
                      <ColorTokenField
                        label="Send Button Background (Normal)"
                        description="Resting background when message can be sent"
                        tokenKey="composerSendBg"
                        value={colors.composerSendBg || colors.accentColor}
                        baseValue={baseThemeConfig.colors.composerSendBg || baseThemeConfig.colors.accentColor}
                        onChange={(v) => handleColorChange("composerSendBg", v)}
                        onResetToBase={() => handleColorChange("composerSendBg", baseThemeConfig.colors.composerSendBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendHoverBg", "Send Button Hover Background") && (
                      <ColorTokenField
                        label="Send Button Hover Background"
                        description="Background when hovering over the send button"
                        tokenKey="composerSendHoverBg"
                        value={colors.composerSendHoverBg || colors.accentHover}
                        baseValue={baseThemeConfig.colors.composerSendHoverBg || baseThemeConfig.colors.accentHover}
                        onChange={(v) => handleColorChange("composerSendHoverBg", v)}
                        onResetToBase={() => handleColorChange("composerSendHoverBg", baseThemeConfig.colors.composerSendHoverBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendDisabledBg", "Send Button Disabled Background") && (
                      <ColorTokenField
                        label="Send Button Disabled Background"
                        description="Background when input is empty and sending is not allowed"
                        tokenKey="composerSendDisabledBg"
                        value={colors.composerSendDisabledBg || colors.btnBg}
                        baseValue={baseThemeConfig.colors.composerSendDisabledBg || baseThemeConfig.colors.btnBg}
                        onChange={(v) => handleColorChange("composerSendDisabledBg", v)}
                        onResetToBase={() => handleColorChange("composerSendDisabledBg", baseThemeConfig.colors.composerSendDisabledBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendIcon", "Send Button Icon Color") && (
                      <ColorTokenField
                        label="Send Button Icon (Normal)"
                        description="Arrow up icon color when enabled"
                        tokenKey="composerSendIcon"
                        value={colors.composerSendIcon || colors.accentText}
                        baseValue={baseThemeConfig.colors.composerSendIcon || baseThemeConfig.colors.accentText}
                        onChange={(v) => handleColorChange("composerSendIcon", v)}
                        onResetToBase={() => handleColorChange("composerSendIcon", baseThemeConfig.colors.composerSendIcon || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendHoverIcon", "Send Button Hover Icon Color") && (
                      <ColorTokenField
                        label="Send Button Icon (Hover)"
                        description="Arrow up icon color on hover"
                        tokenKey="composerSendHoverIcon"
                        value={colors.composerSendHoverIcon || colors.composerSendIcon || colors.accentText}
                        baseValue={baseThemeConfig.colors.composerSendHoverIcon || baseThemeConfig.colors.accentText}
                        onChange={(v) => handleColorChange("composerSendHoverIcon", v)}
                        onResetToBase={() => handleColorChange("composerSendHoverIcon", baseThemeConfig.colors.composerSendHoverIcon || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendDisabledIcon", "Send Button Disabled Icon Color") && (
                      <ColorTokenField
                        label="Send Button Icon (Disabled)"
                        description="Arrow up icon color when disabled"
                        tokenKey="composerSendDisabledIcon"
                        value={colors.composerSendDisabledIcon || colors.textMuted}
                        baseValue={baseThemeConfig.colors.composerSendDisabledIcon || baseThemeConfig.colors.textMuted}
                        onChange={(v) => handleColorChange("composerSendDisabledIcon", v)}
                        onResetToBase={() => handleColorChange("composerSendDisabledIcon", baseThemeConfig.colors.composerSendDisabledIcon || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendGeneratingBg", "AI Generating Stop Button Background") && (
                      <ColorTokenField
                        label="Generating State Background (Stop Button)"
                        description="Background color when AI is actively streaming response"
                        tokenKey="composerSendGeneratingBg"
                        value={colors.composerSendGeneratingBg || colors.textPrimary}
                        baseValue={baseThemeConfig.colors.composerSendGeneratingBg || baseThemeConfig.colors.textPrimary}
                        onChange={(v) => handleColorChange("composerSendGeneratingBg", v)}
                        onResetToBase={() => handleColorChange("composerSendGeneratingBg", baseThemeConfig.colors.composerSendGeneratingBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerSendGeneratingIcon", "AI Generating Stop Icon Color") && (
                      <ColorTokenField
                        label="Generating State Icon (Stop Button)"
                        description="Square stop icon color while response streams"
                        tokenKey="composerSendGeneratingIcon"
                        value={colors.composerSendGeneratingIcon || colors.bgPrimary}
                        baseValue={baseThemeConfig.colors.composerSendGeneratingIcon || baseThemeConfig.colors.bgPrimary}
                        onChange={(v) => handleColorChange("composerSendGeneratingIcon", v)}
                        onResetToBase={() => handleColorChange("composerSendGeneratingIcon", baseThemeConfig.colors.composerSendGeneratingIcon || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}
                  </div>

                  {/* Subsection 3: Thinking Button */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-color,#818cf8)] border-b border-[var(--border-subtle,#1e2029)] pb-1.5">
                      Thinking Button (Off vs On States)
                    </h5>

                    {isMatch("composerThinkOffBg", "Thinking OFF Background") && (
                      <ColorTokenField
                        label="Thinking OFF Background"
                        description="Background when reasoning is inactive (Dark Gray default)"
                        tokenKey="composerThinkOffBg"
                        value={colors.composerThinkOffBg || "#27272a"}
                        baseValue="#27272a"
                        onChange={(v) => handleColorChange("composerThinkOffBg", v)}
                        onResetToBase={() => handleColorChange("composerThinkOffBg", "#27272a")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOffText", "Thinking OFF Text & Icon") && (
                      <ColorTokenField
                        label="Thinking OFF Text & Icon"
                        description="Label and brain icon color when thinking is OFF"
                        tokenKey="composerThinkOffText"
                        value={colors.composerThinkOffText || "#a1a1aa"}
                        baseValue="#a1a1aa"
                        onChange={(v) => handleColorChange("composerThinkOffText", v)}
                        onResetToBase={() => handleColorChange("composerThinkOffText", "#a1a1aa")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOffBorder", "Thinking OFF Border") && (
                      <ColorTokenField
                        label="Thinking OFF Border"
                        description="Border boundary when thinking is OFF"
                        tokenKey="composerThinkOffBorder"
                        value={colors.composerThinkOffBorder || "#3f3f46"}
                        baseValue="#3f3f46"
                        onChange={(v) => handleColorChange("composerThinkOffBorder", v)}
                        onResetToBase={() => handleColorChange("composerThinkOffBorder", "#3f3f46")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOffHoverBg", "Thinking OFF Hover Background") && (
                      <ColorTokenField
                        label="Thinking OFF Hover Background"
                        description="Hover state background when thinking is OFF"
                        tokenKey="composerThinkOffHoverBg"
                        value={colors.composerThinkOffHoverBg || "#323238"}
                        baseValue="#323238"
                        onChange={(v) => handleColorChange("composerThinkOffHoverBg", v)}
                        onResetToBase={() => handleColorChange("composerThinkOffHoverBg", "#323238")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOnBg", "Thinking ON Background") && (
                      <ColorTokenField
                        label="Thinking ON Background (Active)"
                        description="Active state background when reasoning is enabled (Light Gray default)"
                        tokenKey="composerThinkOnBg"
                        value={colors.composerThinkOnBg || "#e4e4e7"}
                        baseValue="#e4e4e7"
                        onChange={(v) => handleColorChange("composerThinkOnBg", v)}
                        onResetToBase={() => handleColorChange("composerThinkOnBg", "#e4e4e7")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOnText", "Thinking ON Text & Icon") && (
                      <ColorTokenField
                        label="Thinking ON Text & Icon (Active)"
                        description="Label and brain icon color when thinking is ON"
                        tokenKey="composerThinkOnText"
                        value={colors.composerThinkOnText || "#18181b"}
                        baseValue="#18181b"
                        onChange={(v) => handleColorChange("composerThinkOnText", v)}
                        onResetToBase={() => handleColorChange("composerThinkOnText", "#18181b")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOnBorder", "Thinking ON Border") && (
                      <ColorTokenField
                        label="Thinking ON Border (Active)"
                        description="Border boundary when thinking is ON"
                        tokenKey="composerThinkOnBorder"
                        value={colors.composerThinkOnBorder || "#d4d4d8"}
                        baseValue="#d4d4d8"
                        onChange={(v) => handleColorChange("composerThinkOnBorder", v)}
                        onResetToBase={() => handleColorChange("composerThinkOnBorder", "#d4d4d8")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerThinkOnHoverBg", "Thinking ON Hover Background") && (
                      <ColorTokenField
                        label="Thinking ON Hover Background"
                        description="Hover state background when thinking is ON"
                        tokenKey="composerThinkOnHoverBg"
                        value={colors.composerThinkOnHoverBg || "#f4f4f5"}
                        baseValue="#f4f4f5"
                        onChange={(v) => handleColorChange("composerThinkOnHoverBg", v)}
                        onResetToBase={() => handleColorChange("composerThinkOnHoverBg", "#f4f4f5")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}
                  </div>

                  {/* Subsection 4: Add File Button */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-color,#818cf8)] border-b border-[var(--border-subtle,#1e2029)] pb-1.5">
                      Add File / Attachment Button
                    </h5>

                    {isMatch("composerAddFileBg", "Add File Button Background") && (
                      <ColorTokenField
                        label="Add File Button Background"
                        description="Resting circular background for the attachment '+' button"
                        tokenKey="composerAddFileBg"
                        value={colors.composerAddFileBg || colors.btnBg}
                        baseValue={baseThemeConfig.colors.composerAddFileBg || baseThemeConfig.colors.btnBg}
                        onChange={(v) => handleColorChange("composerAddFileBg", v)}
                        onResetToBase={() => handleColorChange("composerAddFileBg", baseThemeConfig.colors.composerAddFileBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerAddFileBorder", "Add File Button Border") && (
                      <ColorTokenField
                        label="Add File Button Border"
                        description="Resting circular border boundary for the attachment '+' button"
                        tokenKey="composerAddFileBorder"
                        value={colors.composerAddFileBorder || colors.borderColor}
                        baseValue={baseThemeConfig.colors.composerAddFileBorder || baseThemeConfig.colors.borderColor}
                        onChange={(v) => handleColorChange("composerAddFileBorder", v)}
                        onResetToBase={() => handleColorChange("composerAddFileBorder", baseThemeConfig.colors.composerAddFileBorder || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerAddFileText", "Add File Button Icon Color") && (
                      <ColorTokenField
                        label="Add File Button Icon"
                        description="Color of the '+' plus icon inside the file attachment button"
                        tokenKey="composerAddFileText"
                        value={colors.composerAddFileText || colors.textSecondary}
                        baseValue={baseThemeConfig.colors.composerAddFileText || baseThemeConfig.colors.textSecondary}
                        onChange={(v) => handleColorChange("composerAddFileText", v)}
                        onResetToBase={() => handleColorChange("composerAddFileText", baseThemeConfig.colors.composerAddFileText || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerAddFileHoverBg", "Add File Button Hover Background") && (
                      <ColorTokenField
                        label="Add File Button Hover Background"
                        description="Hover state background for attachment button"
                        tokenKey="composerAddFileHoverBg"
                        value={colors.composerAddFileHoverBg || colors.btnHover}
                        baseValue={baseThemeConfig.colors.composerAddFileHoverBg || baseThemeConfig.colors.btnHover}
                        onChange={(v) => handleColorChange("composerAddFileHoverBg", v)}
                        onResetToBase={() => handleColorChange("composerAddFileHoverBg", baseThemeConfig.colors.composerAddFileHoverBg || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerAddFileHoverBorder", "Add File Button Hover Border") && (
                      <ColorTokenField
                        label="Add File Button Hover Border"
                        description="Hover state border for attachment button"
                        tokenKey="composerAddFileHoverBorder"
                        value={colors.composerAddFileHoverBorder || colors.borderStrong || colors.borderColor}
                        baseValue={baseThemeConfig.colors.composerAddFileHoverBorder || baseThemeConfig.colors.borderStrong || baseThemeConfig.colors.borderColor}
                        onChange={(v) => handleColorChange("composerAddFileHoverBorder", v)}
                        onResetToBase={() => handleColorChange("composerAddFileHoverBorder", baseThemeConfig.colors.composerAddFileHoverBorder || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}

                    {isMatch("composerAddFileHoverText", "Add File Button Hover Icon Color") && (
                      <ColorTokenField
                        label="Add File Button Hover Icon"
                        description="Hover state icon color for attachment button"
                        tokenKey="composerAddFileHoverText"
                        value={colors.composerAddFileHoverText || colors.textPrimary}
                        baseValue={baseThemeConfig.colors.composerAddFileHoverText || baseThemeConfig.colors.textPrimary}
                        onChange={(v) => handleColorChange("composerAddFileHoverText", v)}
                        onResetToBase={() => handleColorChange("composerAddFileHoverText", baseThemeConfig.colors.composerAddFileHoverText || "")}
                        activePickerTokenKey={activePickerTokenKey}
                        onOpenPicker={(k) => setActivePickerTokenKey(k)}
                        onClosePicker={() => setActivePickerTokenKey(null)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 6: SIDEBAR & NAVIGATION
             ================================================================== */}
          {(isMatch("bgSidebar", "Sidebar Background") ||
            isMatch("sidebarText", "Sidebar Item Text") ||
            isMatch("sidebarHover", "Sidebar Item Hover") ||
            isMatch("sidebarActive", "Sidebar Active Item") ||
            isMatch("sidebarBorder", "Sidebar Right Border")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("sidebar")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">6. Sidebar & Navigation States</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Conversation drawer, hover states, selected chat highlights</span>
                      {countModified(["bgSidebar", "sidebarText", "sidebarHover", "sidebarActive", "sidebarBorder"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["bgSidebar", "sidebarText", "sidebarHover", "sidebarActive", "sidebarBorder"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.sidebar ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.sidebar && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("bgSidebar", "Sidebar Background") && (
                    <ColorTokenField
                      label="Sidebar Background"
                      description="Conversation history sidebar background"
                      tokenKey="bgSidebar"
                      value={colors.bgSidebar}
                      baseValue={baseThemeConfig.colors.bgSidebar}
                      onChange={(v) => handleColorChange("bgSidebar", v)}
                      onResetToBase={() => handleColorChange("bgSidebar", baseThemeConfig.colors.bgSidebar)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("sidebarText", "Sidebar Item Text") && (
                    <ColorTokenField
                      label="Sidebar Item Text"
                      description="Labels for conversations and folders"
                      tokenKey="sidebarText"
                      value={colors.sidebarText || colors.textSecondary}
                      baseValue={baseThemeConfig.colors.sidebarText || baseThemeConfig.colors.textSecondary}
                      onChange={(v) => handleColorChange("sidebarText", v)}
                      onResetToBase={() => handleColorChange("sidebarText", baseThemeConfig.colors.sidebarText)}
                      contrastInfo={contrastChecks.sidebarTextOnSidebarBg}
                      contrastContextLabel="Sidebar Background"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("sidebarHover", "Sidebar Item Hover") && (
                    <ColorTokenField
                      label="Sidebar Item Hover State"
                      description="Background when hovering over a chat item"
                      tokenKey="sidebarHover"
                      value={colors.sidebarHover || colors.btnHover}
                      baseValue={baseThemeConfig.colors.sidebarHover || baseThemeConfig.colors.btnHover}
                      onChange={(v) => handleColorChange("sidebarHover", v)}
                      onResetToBase={() => handleColorChange("sidebarHover", baseThemeConfig.colors.sidebarHover)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("sidebarActive", "Sidebar Active Item") && (
                    <ColorTokenField
                      label="Sidebar Active / Selected Item"
                      description="Background for currently active chat session"
                      tokenKey="sidebarActive"
                      value={colors.sidebarActive || colors.bgSurface}
                      baseValue={baseThemeConfig.colors.sidebarActive || baseThemeConfig.colors.bgSurface}
                      onChange={(v) => handleColorChange("sidebarActive", v)}
                      onResetToBase={() => handleColorChange("sidebarActive", baseThemeConfig.colors.sidebarActive)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("sidebarBorder", "Sidebar Right Border") && (
                    <ColorTokenField
                      label="Sidebar Right Border"
                      description="Vertical separator line next to main chat"
                      tokenKey="sidebarBorder"
                      value={colors.sidebarBorder || colors.borderColor}
                      baseValue={baseThemeConfig.colors.sidebarBorder || baseThemeConfig.colors.borderColor}
                      onChange={(v) => handleColorChange("sidebarBorder", v)}
                      onResetToBase={() => handleColorChange("sidebarBorder", baseThemeConfig.colors.sidebarBorder)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 7: CHAT BUBBLES & MESSAGES
             ================================================================== */}
          {(isMatch("bgUserMsg", "User Message Bubble") ||
            isMatch("userMsgText", "User Message Text") ||
            isMatch("bgAssistantMsg", "Assistant Message Background") ||
            isMatch("assistantMsgText", "Assistant Message Text") ||
            isMatch("messageHover", "Message Hover Highlight") ||
            isMatch("messageBorder", "Message Border")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("chat")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">7. Chat Bubbles & Messages</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>User prompt bubbles, assistant responses, hover overlays</span>
                      {countModified(["bgUserMsg", "userMsgText", "bgAssistantMsg", "assistantMsgText", "messageHover", "messageBorder"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["bgUserMsg", "userMsgText", "bgAssistantMsg", "assistantMsgText", "messageHover", "messageBorder"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.chat ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.chat && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("bgUserMsg", "User Message Bubble") && (
                    <ColorTokenField
                      label="User Message Bubble"
                      description="Background of user prompt bubbles"
                      tokenKey="bgUserMsg"
                      value={colors.bgUserMsg}
                      baseValue={baseThemeConfig.colors.bgUserMsg}
                      onChange={(v) => handleColorChange("bgUserMsg", v)}
                      onResetToBase={() => handleColorChange("bgUserMsg", baseThemeConfig.colors.bgUserMsg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                      isImportant
                    />
                  )}
                  {isMatch("userMsgText", "User Message Text") && (
                    <ColorTokenField
                      label="User Message Text"
                      description="Text color inside user message bubbles"
                      tokenKey="userMsgText"
                      value={colors.userMsgText || colors.textPrimary}
                      baseValue={baseThemeConfig.colors.userMsgText || baseThemeConfig.colors.textPrimary}
                      onChange={(v) => handleColorChange("userMsgText", v)}
                      onResetToBase={() => handleColorChange("userMsgText", baseThemeConfig.colors.userMsgText)}
                      contrastInfo={contrastChecks.userMsgTextOnUserBg}
                      contrastContextLabel="User Message Bubble"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("bgAssistantMsg", "Assistant Message Background") && (
                    <ColorTokenField
                      label="Assistant Message Background"
                      description="Background of model answers (or transparent)"
                      tokenKey="bgAssistantMsg"
                      value={colors.bgAssistantMsg}
                      baseValue={baseThemeConfig.colors.bgAssistantMsg}
                      onChange={(v) => handleColorChange("bgAssistantMsg", v)}
                      onResetToBase={() => handleColorChange("bgAssistantMsg", baseThemeConfig.colors.bgAssistantMsg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("assistantMsgText", "Assistant Message Text") && (
                    <ColorTokenField
                      label="Assistant Message Text"
                      description="Text color for model answers"
                      tokenKey="assistantMsgText"
                      value={colors.assistantMsgText || colors.textPrimary}
                      baseValue={baseThemeConfig.colors.assistantMsgText || baseThemeConfig.colors.textPrimary}
                      onChange={(v) => handleColorChange("assistantMsgText", v)}
                      onResetToBase={() => handleColorChange("assistantMsgText", baseThemeConfig.colors.assistantMsgText)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("messageHover", "Message Hover Highlight") && (
                    <ColorTokenField
                      label="Message Hover Highlight"
                      description="Subtle overlay when hovering a message to reveal actions"
                      tokenKey="messageHover"
                      value={colors.messageHover || "rgba(255, 255, 255, 0.03)"}
                      baseValue={baseThemeConfig.colors.messageHover || "rgba(255, 255, 255, 0.03)"}
                      onChange={(v) => handleColorChange("messageHover", v)}
                      onResetToBase={() => handleColorChange("messageHover", baseThemeConfig.colors.messageHover)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("messageBorder", "Message Border") && (
                    <ColorTokenField
                      label="Message Border"
                      description="Subtle divider / container outline around messages"
                      tokenKey="messageBorder"
                      value={colors.messageBorder || colors.borderColor}
                      baseValue={baseThemeConfig.colors.messageBorder || baseThemeConfig.colors.borderColor}
                      onChange={(v) => handleColorChange("messageBorder", v)}
                      onResetToBase={() => handleColorChange("messageBorder", baseThemeConfig.colors.messageBorder)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 8: CODE & SYNTAX HIGHLIGHTING
             ================================================================== */}
          {(isMatch("codeBg", "Code Block Background") ||
            isMatch("codeHeaderBg", "Code Header Background") ||
            isMatch("codeText", "Code Text Color") ||
            isMatch("codeBorder", "Code Block Border") ||
            isMatch("codeInlineBg", "Inline Code Background") ||
            isMatch("codeInlineText", "Inline Code Text")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("code")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">8. Code & Syntax Highlighting</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Code blocks, language headers, inline code highlights</span>
                      {countModified(["codeBg", "codeHeaderBg", "codeText", "codeBorder", "codeInlineBg", "codeInlineText"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["codeBg", "codeHeaderBg", "codeText", "codeBorder", "codeInlineBg", "codeInlineText"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.code ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.code && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("codeBg", "Code Block Background") && (
                    <ColorTokenField
                      label="Code Block Background"
                      description="Background container for multi-line code blocks"
                      tokenKey="codeBg"
                      value={colors.codeBg}
                      baseValue={baseThemeConfig.colors.codeBg}
                      onChange={(v) => handleColorChange("codeBg", v)}
                      onResetToBase={() => handleColorChange("codeBg", baseThemeConfig.colors.codeBg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("codeHeaderBg", "Code Header Background") && (
                    <ColorTokenField
                      label="Code Header Background"
                      description="Top bar of code blocks with language and copy button"
                      tokenKey="codeHeaderBg"
                      value={colors.codeHeaderBg}
                      baseValue={baseThemeConfig.colors.codeHeaderBg}
                      onChange={(v) => handleColorChange("codeHeaderBg", v)}
                      onResetToBase={() => handleColorChange("codeHeaderBg", baseThemeConfig.colors.codeHeaderBg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("codeText", "Code Text Color") && (
                    <ColorTokenField
                      label="Code Text Color"
                      description="Default foreground font color inside code blocks"
                      tokenKey="codeText"
                      value={colors.codeText || colors.textPrimary}
                      baseValue={baseThemeConfig.colors.codeText || baseThemeConfig.colors.textPrimary}
                      onChange={(v) => handleColorChange("codeText", v)}
                      onResetToBase={() => handleColorChange("codeText", baseThemeConfig.colors.codeText)}
                      contrastInfo={contrastChecks.codeTextOnCodeBg}
                      contrastContextLabel="Code Background"
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("codeBorder", "Code Block Border") && (
                    <ColorTokenField
                      label="Code Block Border"
                      description="Border outlining code block containers"
                      tokenKey="codeBorder"
                      value={colors.codeBorder || colors.borderColor}
                      baseValue={baseThemeConfig.colors.codeBorder || baseThemeConfig.colors.borderColor}
                      onChange={(v) => handleColorChange("codeBorder", v)}
                      onResetToBase={() => handleColorChange("codeBorder", baseThemeConfig.colors.codeBorder)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("codeInlineBg", "Inline Code Background") && (
                    <ColorTokenField
                      label="Inline Code Background"
                      description="Background for inline `code` spans"
                      tokenKey="codeInlineBg"
                      value={colors.codeInlineBg}
                      baseValue={baseThemeConfig.colors.codeInlineBg}
                      onChange={(v) => handleColorChange("codeInlineBg", v)}
                      onResetToBase={() => handleColorChange("codeInlineBg", baseThemeConfig.colors.codeInlineBg)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("codeInlineText", "Inline Code Text") && (
                    <ColorTokenField
                      label="Inline Code Text Color"
                      description="Text color for inline `code` highlights"
                      tokenKey="codeInlineText"
                      value={colors.codeInlineText}
                      baseValue={baseThemeConfig.colors.codeInlineText}
                      onChange={(v) => handleColorChange("codeInlineText", v)}
                      onResetToBase={() => handleColorChange("codeInlineText", baseThemeConfig.colors.codeInlineText)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("syntaxKeyword", "Syntax Keyword") && (
                    <ColorTokenField
                      label="Syntax Keyword"
                      description="Keywords: def, function, const, return, if, class, import"
                      tokenKey="syntaxKeyword"
                      value={colors.syntaxKeyword || (baseThemeConfig.isDark ? "#ff7b72" : "#cf222e")}
                      baseValue={baseThemeConfig.colors.syntaxKeyword || (baseThemeConfig.isDark ? "#ff7b72" : "#cf222e")}
                      onChange={(v) => handleColorChange("syntaxKeyword", v)}
                      onResetToBase={() => handleColorChange("syntaxKeyword", baseThemeConfig.colors.syntaxKeyword || "")}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("syntaxFunction", "Syntax Function") && (
                    <ColorTokenField
                      label="Syntax Function"
                      description="Function calls and definitions: render(), quicksort(), fetch()"
                      tokenKey="syntaxFunction"
                      value={colors.syntaxFunction || (baseThemeConfig.isDark ? "#79c0ff" : "#0969da")}
                      baseValue={baseThemeConfig.colors.syntaxFunction || (baseThemeConfig.isDark ? "#79c0ff" : "#0969da")}
                      onChange={(v) => handleColorChange("syntaxFunction", v)}
                      onResetToBase={() => handleColorChange("syntaxFunction", baseThemeConfig.colors.syntaxFunction || "")}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("syntaxString", "Syntax String") && (
                    <ColorTokenField
                      label="Syntax String"
                      description="String literals, template strings, character values"
                      tokenKey="syntaxString"
                      value={colors.syntaxString || (baseThemeConfig.isDark ? "#a5d6ff" : "#0a8537")}
                      baseValue={baseThemeConfig.colors.syntaxString || (baseThemeConfig.isDark ? "#a5d6ff" : "#0a8537")}
                      onChange={(v) => handleColorChange("syntaxString", v)}
                      onResetToBase={() => handleColorChange("syntaxString", baseThemeConfig.colors.syntaxString || "")}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("syntaxNumber", "Syntax Number") && (
                    <ColorTokenField
                      label="Syntax Number"
                      description="Numbers, floating points, hex values: 42, 3.14"
                      tokenKey="syntaxNumber"
                      value={colors.syntaxNumber || (baseThemeConfig.isDark ? "#ffa657" : "#953800")}
                      baseValue={baseThemeConfig.colors.syntaxNumber || (baseThemeConfig.isDark ? "#ffa657" : "#953800")}
                      onChange={(v) => handleColorChange("syntaxNumber", v)}
                      onResetToBase={() => handleColorChange("syntaxNumber", baseThemeConfig.colors.syntaxNumber || "")}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("syntaxComment", "Syntax Comment") && (
                    <ColorTokenField
                      label="Syntax Comment"
                      description="Code comments, docstrings, and annotations"
                      tokenKey="syntaxComment"
                      value={colors.syntaxComment || (baseThemeConfig.isDark ? "#8b949e" : "#57606a")}
                      baseValue={baseThemeConfig.colors.syntaxComment || (baseThemeConfig.isDark ? "#8b949e" : "#57606a")}
                      onChange={(v) => handleColorChange("syntaxComment", v)}
                      onResetToBase={() => handleColorChange("syntaxComment", baseThemeConfig.colors.syntaxComment || "")}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("syntaxType", "Syntax Type") && (
                    <ColorTokenField
                      label="Syntax Type & Class"
                      description="Type annotations, interfaces, classes: Promise<T>, string"
                      tokenKey="syntaxType"
                      value={colors.syntaxType || (baseThemeConfig.isDark ? "#d2a8ff" : "#8250df")}
                      baseValue={baseThemeConfig.colors.syntaxType || (baseThemeConfig.isDark ? "#d2a8ff" : "#8250df")}
                      onChange={(v) => handleColorChange("syntaxType", v)}
                      onResetToBase={() => handleColorChange("syntaxType", baseThemeConfig.colors.syntaxType || "")}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 9: BORDERS & DIVIDERS
             ================================================================== */}
          {(isMatch("borderColor", "Default Border Color") ||
            isMatch("borderSubtle", "Subtle Border") ||
            isMatch("borderStrong", "Strong Border")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("borders")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">9. Borders & Structural Dividers</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Card borders, subtle separators, high-contrast outlines</span>
                      {countModified(["borderColor", "borderSubtle", "borderStrong"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["borderColor", "borderSubtle", "borderStrong"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.borders ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.borders && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("borderColor", "Default Border Color") && (
                    <ColorTokenField
                      label="Default Border Color"
                      description="Standard container, card, and panel borders"
                      tokenKey="borderColor"
                      value={colors.borderColor}
                      baseValue={baseThemeConfig.colors.borderColor}
                      onChange={(v) => handleColorChange("borderColor", v)}
                      onResetToBase={() => handleColorChange("borderColor", baseThemeConfig.colors.borderColor)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("borderSubtle", "Subtle Border") && (
                    <ColorTokenField
                      label="Subtle Border"
                      description="Faint inner dividers and list item separators"
                      tokenKey="borderSubtle"
                      value={colors.borderSubtle}
                      baseValue={baseThemeConfig.colors.borderSubtle}
                      onChange={(v) => handleColorChange("borderSubtle", v)}
                      onResetToBase={() => handleColorChange("borderSubtle", baseThemeConfig.colors.borderSubtle)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("borderStrong", "Strong Border") && (
                    <ColorTokenField
                      label="Strong / Active Border"
                      description="High-contrast borders for selected cards and active focus"
                      tokenKey="borderStrong"
                      value={colors.borderStrong || colors.borderColor}
                      baseValue={baseThemeConfig.colors.borderStrong || baseThemeConfig.colors.borderColor}
                      onChange={(v) => handleColorChange("borderStrong", v)}
                      onResetToBase={() => handleColorChange("borderStrong", baseThemeConfig.colors.borderStrong)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              CATEGORY 10: STATUS, LINKS & SCROLLBARS
             ================================================================== */}
          {(isMatch("colorSuccess", "Success Color") ||
            isMatch("colorWarning", "Warning Color") ||
            isMatch("colorError", "Error Color") ||
            isMatch("linkColor", "Link Color") ||
            isMatch("scrollbarThumb", "Scrollbar Thumb") ||
            isMatch("scrollbarThumbHover", "Scrollbar Thumb Hover")) && (
            <div className="rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xs transition-all">
              <button
                type="button"
                onClick={() => toggleSection("status")}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--bg-secondary,#191a21)]/50 transition-colors cursor-pointer rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-color,#818cf8)]/10 text-[var(--accent-color,#818cf8)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold">10. Status, Links & Scrollbars</span>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted,#6b7280)] font-normal mt-0.5">
                      <span>Connection status badges, hyperlinks, custom scrollbar thumbs</span>
                      {countModified(["colorSuccess", "colorWarning", "colorError", "linkColor", "scrollbarThumb", "scrollbarThumbHover"]) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] font-medium">
                          {countModified(["colorSuccess", "colorWarning", "colorError", "linkColor", "scrollbarThumb", "scrollbarThumbHover"])} modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedSections.status ? <ChevronUp className="w-4 h-4 text-[var(--text-muted,#6b7280)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />}
              </button>

              {expandedSections.status && (
                <div className="p-4 pt-2 space-y-3 border-t border-[var(--border-subtle,#1e2029)]">
                  {isMatch("colorSuccess", "Success Color") && (
                    <ColorTokenField
                      label="Success Color"
                      description="Connected status indicators and success alerts"
                      tokenKey="colorSuccess"
                      value={colors.colorSuccess}
                      baseValue={baseThemeConfig.colors.colorSuccess}
                      onChange={(v) => handleColorChange("colorSuccess", v)}
                      onResetToBase={() => handleColorChange("colorSuccess", baseThemeConfig.colors.colorSuccess)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("colorWarning", "Warning Color") && (
                    <ColorTokenField
                      label="Warning Color"
                      description="Caution alerts and thinking token warnings"
                      tokenKey="colorWarning"
                      value={colors.colorWarning}
                      baseValue={baseThemeConfig.colors.colorWarning}
                      onChange={(v) => handleColorChange("colorWarning", v)}
                      onResetToBase={() => handleColorChange("colorWarning", baseThemeConfig.colors.colorWarning)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("colorError", "Error Color") && (
                    <ColorTokenField
                      label="Error Color"
                      description="Ollama connection errors and validation alerts"
                      tokenKey="colorError"
                      value={colors.colorError}
                      baseValue={baseThemeConfig.colors.colorError}
                      onChange={(v) => handleColorChange("colorError", v)}
                      onResetToBase={() => handleColorChange("colorError", baseThemeConfig.colors.colorError)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("linkColor", "Link Color") && (
                    <ColorTokenField
                      label="Link Color"
                      description="Hyperlinks and clickable URLs in markdown"
                      tokenKey="linkColor"
                      value={colors.linkColor}
                      baseValue={baseThemeConfig.colors.linkColor}
                      onChange={(v) => handleColorChange("linkColor", v)}
                      onResetToBase={() => handleColorChange("linkColor", baseThemeConfig.colors.linkColor)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("scrollbarThumb", "Scrollbar Thumb") && (
                    <ColorTokenField
                      label="Scrollbar Thumb"
                      description="Color of custom scrollbar handle"
                      tokenKey="scrollbarThumb"
                      value={colors.scrollbarThumb}
                      baseValue={baseThemeConfig.colors.scrollbarThumb}
                      onChange={(v) => handleColorChange("scrollbarThumb", v)}
                      onResetToBase={() => handleColorChange("scrollbarThumb", baseThemeConfig.colors.scrollbarThumb)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                  {isMatch("scrollbarThumbHover", "Scrollbar Thumb Hover") && (
                    <ColorTokenField
                      label="Scrollbar Thumb Hover"
                      description="Color of custom scrollbar handle when hovered"
                      tokenKey="scrollbarThumbHover"
                      value={colors.scrollbarThumbHover}
                      baseValue={baseThemeConfig.colors.scrollbarThumbHover}
                      onChange={(v) => handleColorChange("scrollbarThumbHover", v)}
                      onResetToBase={() => handleColorChange("scrollbarThumbHover", baseThemeConfig.colors.scrollbarThumbHover)}
                      activePickerTokenKey={activePickerTokenKey}
                      onOpenPicker={(k) => setActivePickerTokenKey(k)}
                      onClosePicker={() => setActivePickerTokenKey(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto p-4 sm:p-6 bg-[var(--bg-secondary,#191a21)]/30 min-h-0 custom-scrollbar">
          <LiveThemePreview colors={colors} isDark={isDark} themeName={themeName} />
        </div>
      </div>
    </div>
  );
};

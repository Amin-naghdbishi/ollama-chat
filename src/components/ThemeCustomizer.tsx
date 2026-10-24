import React, { useState, useEffect } from "react";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Download,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BUILTIN_THEMES,
  ThemeEngine,
  ThemeConfig,
  ThemeColors,
  CustomTheme,
} from "../lib/themeEngine";

interface ThemeCustomizerProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const [customConfig, setCustomConfig] = useState<CustomTheme>(() =>
    ThemeEngine.getCustomTheme()
  );
  const [isCustomizing, setIsCustomizing] = useState<boolean>(
    currentTheme === "custom"
  );
  const [basePreset, setBasePreset] = useState<string>("dark");

  useEffect(() => {
    // When theme selection changes, apply theme immediately
    ThemeEngine.applyTheme(currentTheme);
  }, [currentTheme]);

  const handleSelectTheme = (themeId: string) => {
    onThemeChange(themeId);
    if (themeId === "custom") {
      setIsCustomizing(true);
      ThemeEngine.applyTheme("custom", customConfig.colors);
    } else {
      ThemeEngine.applyTheme(themeId);
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    const updatedColors = { ...customConfig.colors, [key]: value };
    const updatedConfig: CustomTheme = {
      ...customConfig,
      colors: updatedColors,
      isCustom: true,
      updatedAt: Date.now(),
    };
    setCustomConfig(updatedConfig);
    ThemeEngine.saveCustomTheme(updatedConfig);

    if (currentTheme !== "custom") {
      onThemeChange("custom");
    }
    ThemeEngine.applyTheme("custom", updatedColors);
  };

  const handleApplyPresetToBase = (presetId: string) => {
    setBasePreset(presetId);
    const preset = BUILTIN_THEMES[presetId] || BUILTIN_THEMES.dark;
    const updatedConfig: CustomTheme = {
      id: "custom",
      name: "Custom Theme",
      isDark: preset.isDark,
      isCustom: true,
      baseThemeId: presetId,
      createdAt: customConfig.createdAt || Date.now(),
      updatedAt: Date.now(),
      colors: { ...preset.colors },
    };
    setCustomConfig(updatedConfig);
    ThemeEngine.saveCustomTheme(updatedConfig);
    onThemeChange("custom");
    ThemeEngine.applyTheme("custom", preset.colors);
  };

  const handleExportTheme = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(customConfig, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `custom-theme.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.colors) {
          const newConfig: CustomTheme = {
            id: "custom",
            name: parsed.name || "Custom Theme",
            isDark: parsed.isDark ?? true,
            isCustom: true,
            baseThemeId: parsed.baseThemeId || "dark",
            createdAt: parsed.createdAt || Date.now(),
            updatedAt: Date.now(),
            colors: { ...customConfig.colors, ...parsed.colors },
          };
          setCustomConfig(newConfig);
          ThemeEngine.saveCustomTheme(newConfig);
          onThemeChange("custom");
          ThemeEngine.applyTheme("custom", newConfig.colors);
        }
      } catch (err) {
        alert("Invalid theme JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const darkThemes = Object.values(BUILTIN_THEMES).filter((t) => t.isDark);
  const lightThemes = Object.values(BUILTIN_THEMES).filter((t) => !t.isDark);

  const COLOR_GROUPS: Array<{
    title: string;
    items: Array<{ key: keyof ThemeColors; label: string }>;
  }> = [
    {
      title: "Canvas & Surfaces",
      items: [
        { key: "bgPrimary", label: "Primary BG" },
        { key: "bgSecondary", label: "Secondary BG" },
        { key: "bgSurface", label: "Surface BG" },
        { key: "bgSidebar", label: "Sidebar BG" },
        { key: "bgHeader", label: "Header BG" },
        { key: "borderColor", label: "Borders" },
      ],
    },
    {
      title: "Messages & Typography",
      items: [
        { key: "bgUserMsg", label: "User Message" },
        { key: "textPrimary", label: "Primary Text" },
        { key: "textSecondary", label: "Secondary Text" },
        { key: "textMuted", label: "Muted Text" },
      ],
    },
    {
      title: "Accents & Controls",
      items: [
        { key: "accentColor", label: "Accent Color" },
        { key: "accentHover", label: "Accent Hover" },
        { key: "btnBg", label: "Button BG" },
        { key: "btnText", label: "Button Text" },
        { key: "inputBg", label: "Input BG" },
        { key: "inputBorder", label: "Input Border" },
        { key: "inputFocus", label: "Input Focus" },
        { key: "linkColor", label: "Link Color" },
      ],
    },
    {
      title: "Code & Syntax",
      items: [
        { key: "codeBg", label: "Code Block BG" },
        { key: "codeHeaderBg", label: "Code Header BG" },
        { key: "codeInlineBg", label: "Inline Code BG" },
        { key: "codeInlineText", label: "Inline Code Text" },
      ],
    },
    {
      title: "Status & Scrollbar",
      items: [
        { key: "colorError", label: "Error" },
        { key: "colorWarning", label: "Warning" },
        { key: "colorSuccess", label: "Success" },
        { key: "scrollbarThumb", label: "Scrollbar Thumb" },
      ],
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      {/* 1. Dark Themes Section */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Moon className="w-4 h-4 text-[#818cf8]" />
          <h4 className="font-semibold text-sm text-[var(--text-primary,#eee)]">
            Dark Themes
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {darkThemes.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[var(--btn-active,#262626)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#eee)] shadow-md ring-1 ring-[var(--accent-color,#818cf8)]"
                    : "bg-[var(--bg-secondary,#141418)] border-[var(--border-color,#262626)] text-[var(--text-secondary,#888)] hover:border-[var(--btn-hover,#444)] hover:text-[var(--text-primary,#eee)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.bgPrimary }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.accentColor }}
                    />
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                  )}
                </div>

                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary,#eee)]">
                    {theme.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Light Themes Section */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Sun className="w-4 h-4 text-amber-400" />
          <h4 className="font-semibold text-sm text-[var(--text-primary,#eee)]">
            Light Themes
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {lightThemes.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[var(--btn-active,#262626)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#eee)] shadow-md ring-1 ring-[var(--accent-color,#818cf8)]"
                    : "bg-[var(--bg-secondary,#141418)] border-[var(--border-color,#262626)] text-[var(--text-secondary,#888)] hover:border-[var(--btn-hover,#444)] hover:text-[var(--text-primary,#eee)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.bgPrimary }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.accentColor }}
                    />
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                  )}
                </div>

                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary,#eee)]">
                    {theme.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. System Theme Option */}
      <div>
        <button
          type="button"
          onClick={() => handleSelectTheme("system")}
          className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
            currentTheme === "system"
              ? "bg-[var(--btn-active,#262626)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#eee)] shadow-md"
              : "bg-[var(--bg-secondary,#141418)] border-[var(--border-color,#262626)] text-[var(--text-secondary,#888)] hover:border-[var(--btn-hover,#444)] hover:text-[var(--text-primary,#eee)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="font-semibold text-xs text-[var(--text-primary,#eee)]">
                System Mode
              </div>
              <div className="text-[10px] text-[var(--text-muted,#888)]">
                Automatically matches your operating system light / dark preference
              </div>
            </div>
          </div>
          {currentTheme === "system" && (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
        </button>
      </div>

      {/* 4. Custom Theme Builder Section */}
      <div className="pt-4 border-t border-[var(--border-color,#262626)]">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              if (!isCustomizing) {
                handleSelectTheme("custom");
              } else {
                setIsCustomizing(!isCustomizing);
              }
            }}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-color,#818cf8)]/10 border border-[var(--accent-color,#818cf8)]/30 flex items-center justify-center">
              <Palette className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            </div>
            <div>
              <div className="font-bold text-sm text-[var(--text-primary,#eee)] group-hover:text-[var(--accent-color,#818cf8)] transition-colors flex items-center gap-2">
                <span>Custom Theme Builder</span>
                {currentTheme === "custom" && (
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#000)]">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted,#888)]">
                Customize interface colors without code changes
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="p-1.5 rounded-lg bg-[var(--bg-secondary,#141418)] border border-[var(--border-color,#262626)] text-[var(--text-secondary,#888)] hover:text-[var(--text-primary,#eee)] transition-colors cursor-pointer"
          >
            {isCustomizing ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {isCustomizing && (
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary,#141418)] border border-[var(--border-color,#262626)] space-y-5 animate-fadeIn">
            {/* Top Toolbar: Base Preset Copy & Import/Export */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface,#1a1a20)] border border-[var(--border-subtle,#262626)]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-secondary,#888)] font-medium">
                  Base Preset:
                </span>
                <select
                  value={basePreset}
                  onChange={(e) => handleApplyPresetToBase(e.target.value)}
                  className="bg-[var(--input-bg,#101014)] border border-[var(--input-border,#272734)] text-[var(--text-primary,#eee)] text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[var(--accent-color,#818cf8)] cursor-pointer"
                >
                  {Object.values(BUILTIN_THEMES).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1c24)] hover:bg-[var(--btn-hover,#282836)] text-[var(--text-primary,#eee)] text-[11px] font-medium border border-[var(--border-color,#262626)] cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                  <span>Import</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportTheme}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleExportTheme}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1c24)] hover:bg-[var(--btn-hover,#282836)] text-[var(--text-primary,#eee)] text-[11px] font-medium border border-[var(--border-color,#262626)] cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Customizer Color Swatch Groups */}
            <div className="space-y-4">
              {COLOR_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h5 className="font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted,#888)]">
                    {group.title}
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {group.items.map((item) => {
                      const colorVal = customConfig.colors[item.key] || "#000000";
                      return (
                        <div
                          key={item.key}
                          className="p-2 rounded-xl bg-[var(--input-bg,#101014)] border border-[var(--input-border,#272734)] flex items-center justify-between gap-2"
                        >
                          <div className="truncate flex-1">
                            <div className="text-[10px] font-medium text-[var(--text-secondary,#888)] truncate">
                              {item.label}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-primary,#eee)] truncate">
                              {colorVal}
                            </div>
                          </div>
                          <input
                            type="color"
                            value={colorVal.startsWith("#") ? colorVal : "#818cf8"}
                            onChange={(e) =>
                              handleColorChange(item.key, e.target.value)
                            }
                            className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer p-0 shrink-0"
                            title={`Change ${item.label}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

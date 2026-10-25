import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Palette,
  Terminal,
  Server,
  Sliders,
  ShieldCheck,
  Check,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Cpu,
  HelpCircle,
  HardDrive,
  Info,
  ExternalLink,
  Keyboard,
  Globe,
  SlidersHorizontal,
  FileCode,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Copy,
  Download,
  Upload,
  Sparkles,
  Brain,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { AIProvider, AppSettings, ConnectionStatus, Conversation, GlassThemeConfig, OllamaModel, UnifiedModel } from "../../types";
import { OllamaApi } from "../../services/ollamaApi";
import { BUILTIN_THEMES, ThemeEngine } from "../../lib/themeEngine";
import { formatBytes } from "../../lib/formatters";
import { Language, getTranslation } from "../../lib/i18n";
import { DEFAULT_IMAGE_PROMPT_INSTRUCTIONS } from "../../lib/storage";
import { ModelManagementTab } from "../settings/ModelManagementTab";
import { ProviderManagementTab } from "../settings/ProviderManagementTab";
import { ContextExplorerView } from "./ContextExplorerView";

export type SettingsTabId =
  | "general"
  | "appearance"
  | "chat"
  | "models"
  | "providers"
  | "context-explorer"
  | "advanced"
  | "about";

interface SettingsViewProps {
  initialTab?: SettingsTabId;
  onBack: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  models: OllamaModel[];
  unifiedModels?: UnifiedModel[];
  providers?: AIProvider[];
  onProvidersChange?: (providers: AIProvider[]) => void;
  onSelectModel?: (modelId: string) => void;
  isLoadingModels?: boolean;
  selectedModel: string | null;
  connectionStatus: ConnectionStatus;
  onRefreshConnection: () => void;
  onOpenModelDetails: (modelName: string) => void;
  onOpenModelProfile: (modelName: string) => void;
  onOpenThemeBuilder?: (themeId?: string, baseThemeId?: string) => void;
  onClearAllData: () => void;
  conversations?: Conversation[];
  activeConversationId?: string | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialTab = "general",
  onBack,
  settings,
  onSaveSettings,
  models,
  unifiedModels = [],
  providers = [],
  onProvidersChange = () => {},
  onSelectModel = () => {},
  isLoadingModels = false,
  selectedModel,
  connectionStatus,
  onRefreshConnection,
  onOpenModelDetails,
  onOpenModelProfile,
  onOpenThemeBuilder,
  onClearAllData,
  conversations = [],
  activeConversationId = null,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const bgImageInputRef = React.useRef<HTMLInputElement>(null);

  // Independent Glass Dark and Glass Light Theme Configurations
  const activeGlassId: "glass-dark" | "glass-light" =
    formData.theme === "glass-light" ? "glass-light" : "glass-dark";
  const [glassDarkConfig, setGlassDarkConfig] = useState<GlassThemeConfig>(() =>
    ThemeEngine.getGlassThemeConfig("glass-dark")
  );
  const [glassLightConfig, setGlassLightConfig] = useState<GlassThemeConfig>(() =>
    ThemeEngine.getGlassThemeConfig("glass-light")
  );

  const activeGlassConfig = activeGlassId === "glass-dark" ? glassDarkConfig : glassLightConfig;

  const handleUpdateActiveGlass = (updates: Partial<GlassThemeConfig>) => {
    if (activeGlassId === "glass-dark") {
      const updated = { ...glassDarkConfig, ...updates, id: "glass-dark" as const };
      setGlassDarkConfig(updated);
      ThemeEngine.applyLiveGlassTheme(updated);
    } else {
      const updated = { ...glassLightConfig, ...updates, id: "glass-light" as const };
      setGlassLightConfig(updated);
      ThemeEngine.applyLiveGlassTheme(updated);
    }
  };

  const handleSaveActiveGlassTheme = () => {
    const configToSave = activeGlassId === "glass-dark" ? glassDarkConfig : glassLightConfig;
    ThemeEngine.saveGlassThemeConfig(configToSave);
    ThemeEngine.applyTheme(activeGlassId, configToSave);
    handleAutoSave({ ...formData, theme: activeGlassId });
  };

  const handleBackgroundImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleUpdateActiveGlass({ chatBackgroundImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const [selectedPromptModel, setSelectedPromptModel] = useState<string>(
    selectedModel || (models[0]?.name ?? "gemma3:4b")
  );
  const [testStatus, setTestStatus] = useState<ConnectionStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    if (selectedModel) {
      setSelectedPromptModel(selectedModel);
    } else if (models.length > 0 && !selectedPromptModel) {
      setSelectedPromptModel(models[0].name);
    }
  }, [selectedModel, models]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    const result = await OllamaApi.checkHealth(formData);
    setTestStatus(result);
    setIsTesting(false);
  };

  const handleAutoSave = (updated: AppSettings) => {
    setFormData(updated);
    onSaveSettings(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleSelectTheme = (themeId: string) => {
    const updated = { ...formData, theme: themeId };
    setFormData(updated);
    if (themeId === "glass-dark") {
      ThemeEngine.applyTheme("glass-dark", glassDarkConfig);
    } else if (themeId === "glass-light") {
      ThemeEngine.applyTheme("glass-light", glassLightConfig);
    } else {
      ThemeEngine.applyTheme(themeId);
    }
    onSaveSettings(updated);
  };

  const updateModelPrompt = (modelName: string, promptValue: string) => {
    const updated = {
      ...formData,
      modelSystemPrompts: {
        ...formData.modelSystemPrompts,
        [modelName]: promptValue,
      },
    };
    handleAutoSave(updated);
  };

  const currentModelPrompt = formData.modelSystemPrompts?.[selectedPromptModel] || "";

  const lang: Language = formData.language || "en";
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

  const navItems: Array<{ id: SettingsTabId; label: string; icon: React.ReactNode; description: string }> = [
    {
      id: "general",
      label: t("tabGeneral"),
      icon: <Globe className="w-4 h-4" />,
      description: lang === "fa" ? "زبان، ورودی و پیمایش" : "Language, input & scrolling",
    },
    {
      id: "appearance",
      label: t("tabAppearance"),
      icon: <Palette className="w-4 h-4" />,
      description: lang === "fa" ? "تم‌ها و رنگ‌ها" : "Themes & colors",
    },
    {
      id: "chat",
      label: t("tabChat"),
      icon: <Terminal className="w-4 h-4" />,
      description: lang === "fa" ? "پرامپت‌های سیستم و پارامترها" : "System prompts & parameters",
    },
    {
      id: "models",
      label: t("tabModelManagement"),
      icon: <Cpu className="w-4 h-4" />,
      description: lang === "fa" ? "مدل‌های من، کشف و دانلودها" : "My models, discover & downloads",
    },
    {
      id: "providers",
      label: t("tabProviderManagement"),
      icon: <Server className="w-4 h-4" />,
      description: lang === "fa" ? "اولاما، اوپن‌ای‌آی و اوپن‌روتر" : "Ollama, OpenAI & OpenRouter",
    },
    {
      id: "context-explorer",
      label: t("tabContextExplorer"),
      icon: <Brain className="w-4 h-4" />,
      description: lang === "fa" ? "مدیریت حافظه، فشرده‌سازی و بازیابی" : "Memory, compression & recall",
    },
    {
      id: "advanced",
      label: t("tabAdvanced"),
      icon: <Sliders className="w-4 h-4" />,
      description: lang === "fa" ? "ذخیره‌سازی و مدیریت داده‌ها" : "Storage & data management",
    },
    {
      id: "about",
      label: t("tabAbout"),
      icon: <Info className="w-4 h-4" />,
      description: lang === "fa" ? "اطلاعات برنامه و محیط اجرا" : "App & environment information",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary,#131418)] animate-fadeIn">
      {/* Top Header with clean Back button */}
      <header className="h-14 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#282a36)] px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-primary,#e6e9f0)] hover:text-white transition-all shadow-xs cursor-pointer group"
            title={t("backToChat")}
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent-color,#818cf8)] group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:rotate-180 transition-transform" />
            <span>{t("backToChat")}</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color,#282a36)]" />

          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            <h1 className="font-semibold text-sm text-[var(--text-primary,#e6e9f0)]">{t("settings")}</h1>
          </div>
        </div>

        {saveToast && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-mono animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{t("saved")}</span>
          </div>
        )}
      </header>

      {/* Main Settings Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sub-Sidebar (Left Navigation) */}
        <aside className="w-56 sm:w-64 bg-[var(--bg-secondary,#191a21)] border-r rtl:border-l rtl:border-r-0 border-[var(--border-color,#282a36)] flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-3 space-y-1">
          <div className="px-2 py-1.5 text-[11px] font-bold text-[var(--text-muted,#6b7280)] uppercase tracking-wider">
            {t("preferencesCategory")}
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm sm:text-xs font-medium transition-all text-left rtl:text-right cursor-pointer ${
                  isActive
                    ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] border border-[var(--border-color,#282a36)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/20"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)]"
                      : "bg-[var(--btn-bg,#1c1e27)] text-[var(--text-muted,#6b7280)]"
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-semibold text-sm sm:text-xs text-[var(--text-primary,#e6e9f0)]">{item.label}</span>
                  <span className="text-[11px] sm:text-[10px] text-[var(--text-muted,#6b7280)] truncate">{item.description}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Settings Content (Right Panel) */}
        <main
          className={`flex-1 ${
            activeTab === "context-explorer"
              ? "overflow-hidden bg-[var(--bg-primary,#131418)]"
              : "overflow-y-auto p-5 sm:p-8 custom-scrollbar bg-[var(--bg-primary,#131418)]"
          }`}
        >
          {activeTab === "context-explorer" ? (
            <ContextExplorerView
              conversations={conversations}
              activeConversationId={activeConversationId}
              selectedModel={selectedModel}
              models={models}
              settings={formData}
              onBack={onBack}
              language={lang}
              isEmbeddedInSettings={true}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* TAB 1: GENERAL */}
              {activeTab === "general" && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary,#e6e9f0)]">{t("generalHeading")}</h2>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <h3 className="text-sm sm:text-xs font-semibold text-[var(--accent-color,#818cf8)] uppercase tracking-wider">
                    {t("languageAndDirection")}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleAutoSave({ ...formData, language: "en" })}
                      className={`px-3 py-2.5 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex items-center justify-between ${
                        formData.language === "en"
                          ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] ring-1 ring-[var(--accent-color,#818cf8)]/30"
                          : "border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)]/70 hover:border-[var(--text-muted,#6b7280)]"
                      }`}
                    >
                      <span className="font-medium text-sm sm:text-xs text-[var(--text-primary,#e6e9f0)]">{t("languageEnglish")}</span>
                      {formData.language === "en" && <Check className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAutoSave({ ...formData, language: "fa" })}
                      className={`px-3 py-2.5 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex items-center justify-between ${
                        formData.language === "fa"
                          ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] ring-1 ring-[var(--accent-color,#818cf8)]/30"
                          : "border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)]/70 hover:border-[var(--text-muted,#6b7280)]"
                      }`}
                    >
                      <span className="font-medium text-sm sm:text-xs text-[var(--text-primary,#e6e9f0)] font-vazir">{t("languagePersian")}</span>
                      {formData.language === "fa" && <Check className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <h3 className="text-sm sm:text-xs font-semibold text-[var(--accent-color,#818cf8)] uppercase tracking-wider">
                    {t("chatInputAndScrolling")}
                  </h3>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--bg-primary,#131418)]/60 border border-[var(--border-subtle,#1e2029)] cursor-pointer">
                      <span className="font-medium text-sm sm:text-xs text-[var(--text-primary,#e6e9f0)]">{t("enterKeySends")}</span>
                      <input
                        type="checkbox"
                        checked={formData.enterToSend}
                        onChange={(e) => handleAutoSave({ ...formData, enterToSend: e.target.checked })}
                        className="w-4 h-4 rounded accent-[var(--accent-color,#818cf8)] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--bg-primary,#131418)]/60 border border-[var(--border-subtle,#1e2029)] cursor-pointer">
                      <span className="font-medium text-sm sm:text-xs text-[var(--text-primary,#e6e9f0)]">{t("autoScrollTitle")}</span>
                      <input
                        type="checkbox"
                        checked={formData.autoScroll}
                        onChange={(e) => handleAutoSave({ ...formData, autoScroll: e.target.checked })}
                        className="w-4 h-4 rounded accent-[var(--accent-color,#818cf8)] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE & THEMES */}
            {activeTab === "appearance" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary,#e6e9f0)]">
                      {lang === "fa" ? "پوسته‌ها و سفارشی‌سازی ظاهر" : "Themes & Appearance"}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary,#9ba3b2)]">
                      {lang === "fa"
                        ? "انتخاب پوسته و سفارشی‌سازی شیشه‌ای با اعمال زنده"
                        : "Select theme and customize live glass transparency and colors"}
                    </p>
                  </div>

                  {/* Save Theme Action Button */}
                  <button
                    type="button"
                    onClick={handleSaveActiveGlassTheme}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] font-bold text-xs flex items-center gap-2 shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Save className="w-4 h-4 stroke-[2.2]" />
                    <span>{lang === "fa" ? "ذخیره پوسته" : "Save Theme"}</span>
                  </button>
                </div>

                {/* 6.1 Two Independent Glass Themes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === "fa" ? "پوسته‌های شیشه‌ای (Glass Themes)" : "Glass Themes"}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Glass Dark Card */}
                    <div
                      onClick={() => handleSelectTheme("glass-dark")}
                      className={`p-4 rounded-2xl border text-left rtl:text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                        formData.theme === "glass-dark"
                          ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] shadow-md ring-2 ring-[var(--accent-color,#818cf8)]/30"
                          : "border-[var(--border-color,#282a36)] bg-[var(--bg-surface,#1f212a)] hover:border-[var(--text-muted,#6b7280)]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <Moon className="w-4.5 h-4.5 text-[var(--accent-color,#818cf8)]" />
                          <span className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">
                            Glass Dark
                          </span>
                        </div>
                        {formData.theme === "glass-dark" && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 w-fit">
                        <div className="w-4 h-4 rounded-md border border-white/20" style={{ backgroundColor: glassDarkConfig.backgroundColor }} />
                        <div className="w-4 h-4 rounded-md border border-white/20" style={{ backgroundColor: glassDarkConfig.primaryColor }} />
                        <div className="w-4 h-4 rounded-md border border-white/20" style={{ backgroundColor: glassDarkConfig.composerHoverBorderColor }} />
                      </div>
                    </div>

                    {/* Glass Light Card */}
                    <div
                      onClick={() => handleSelectTheme("glass-light")}
                      className={`p-4 rounded-2xl border text-left rtl:text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                        formData.theme === "glass-light"
                          ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] shadow-md ring-2 ring-[var(--accent-color,#818cf8)]/30"
                          : "border-[var(--border-color,#282a36)] bg-[var(--bg-surface,#1f212a)] hover:border-[var(--text-muted,#6b7280)]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <Sun className="w-4.5 h-4.5 text-amber-500" />
                          <span className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">
                            Glass Light
                          </span>
                        </div>
                        {formData.theme === "glass-light" && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/40 border border-black/10 w-fit">
                        <div className="w-4 h-4 rounded-md border border-black/20" style={{ backgroundColor: glassLightConfig.backgroundColor }} />
                        <div className="w-4 h-4 rounded-md border border-black/20" style={{ backgroundColor: glassLightConfig.primaryColor }} />
                        <div className="w-4 h-4 rounded-md border border-black/20" style={{ backgroundColor: glassLightConfig.composerHoverBorderColor }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6.2 Simple Theme Customization Controls */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle,#1e2029)] pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                      <h3 className="font-bold text-xs text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider">
                        {lang === "fa"
                          ? `سفارشی‌سازی ${activeGlassId === "glass-dark" ? "Glass Dark" : "Glass Light"}`
                          : `Customize ${activeGlassId === "glass-dark" ? "Glass Dark" : "Glass Light"}`}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-muted,#6b7280)]">
                      {lang === "fa" ? "اعمال فوری تغییرات در کل برنامه" : "Immediate live updates"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* A. Primary / Accent Color */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-primary,#e6e9f0)]">
                        {lang === "fa" ? "رنگ اصلی / تأکیدی" : "Primary / Accent Color"}
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)]">
                        <input
                          type="color"
                          value={activeGlassConfig.primaryColor}
                          onChange={(e) => handleUpdateActiveGlass({ primaryColor: e.target.value })}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={activeGlassConfig.primaryColor}
                          onChange={(e) => handleUpdateActiveGlass({ primaryColor: e.target.value })}
                          className="w-full bg-transparent font-mono text-xs text-[var(--text-primary,#e6e9f0)] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* B. Background Color */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-primary,#e6e9f0)]">
                        {lang === "fa" ? "رنگ پس‌زمینه" : "Background Color"}
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)]">
                        <input
                          type="color"
                          value={activeGlassConfig.backgroundColor}
                          onChange={(e) => handleUpdateActiveGlass({ backgroundColor: e.target.value })}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={activeGlassConfig.backgroundColor}
                          onChange={(e) => handleUpdateActiveGlass({ backgroundColor: e.target.value })}
                          className="w-full bg-transparent font-mono text-xs text-[var(--text-primary,#e6e9f0)] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* C. Composer Hover-Border Color */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-primary,#e6e9f0)]">
                        {lang === "fa" ? "رنگ حاشیه شناور ورودی چت" : "Composer Hover-Border"}
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)]">
                        <input
                          type="color"
                          value={activeGlassConfig.composerHoverBorderColor}
                          onChange={(e) => handleUpdateActiveGlass({ composerHoverBorderColor: e.target.value })}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={activeGlassConfig.composerHoverBorderColor}
                          onChange={(e) => handleUpdateActiveGlass({ composerHoverBorderColor: e.target.value })}
                          className="w-full bg-transparent font-mono text-xs text-[var(--text-primary,#e6e9f0)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* D. Glass / Transparency Level Slider */}
                  <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">
                        {lang === "fa" ? "سطح شفافیت شیشه‌ای (Glass Transparency)" : "Glass / Transparency Level"}
                      </span>
                      <span className="font-mono text-xs text-[var(--accent-color,#818cf8)] font-bold">
                        {Math.round(activeGlassConfig.glassOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.95"
                      step="0.05"
                      value={activeGlassConfig.glassOpacity}
                      onChange={(e) => handleUpdateActiveGlass({ glassOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                      <span>{lang === "fa" ? "شفاف‌تر (حداقل ۱۵٪)" : "More Transparent (15%)"}</span>
                      <span>{lang === "fa" ? "مات‌تر (حداکثر ۹۵٪)" : "More Opaque (95%)"}</span>
                    </div>
                  </div>

                  {/* E. Chat Background Image */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                    <label className="text-[11.5px] font-semibold text-[var(--text-primary,#e6e9f0)] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                      <span>{lang === "fa" ? "تصویر پس‌زمینه چت" : "Chat Background Image"}</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        ref={bgImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundImageSelect}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => bgImageInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {activeGlassConfig.chatBackgroundImage
                            ? lang === "fa" ? "تغییر تصویر پس‌زمینه" : "Replace Background Image"
                            : lang === "fa" ? "انتخاب تصویر محلی" : "Choose Local Image"}
                        </span>
                      </button>

                      {activeGlassConfig.chatBackgroundImage && (
                        <>
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border-color,#282a36)] shadow-xs shrink-0">
                            <img
                              src={activeGlassConfig.chatBackgroundImage}
                              alt="Background Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateActiveGlass({ chatBackgroundImage: undefined })}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{lang === "fa" ? "حذف پس‌زمینه" : "Remove"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Standard Built-in Themes (Dark, Light, Soft Slate) */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-subtle,#1e2029)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted,#6b7280)]">
                    {lang === "fa" ? "پوسته‌های کلاسیک" : "Classic Built-in Themes"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {["dark", "light", "soft-gray"].map((thId) => {
                      const th = BUILTIN_THEMES[thId];
                      if (!th) return null;
                      const isSelected = formData.theme === th.id;
                      return (
                        <div
                          key={th.id}
                          onClick={() => handleSelectTheme(th.id)}
                          className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                            isSelected
                              ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/30"
                              : "border-[var(--border-color,#282a36)] bg-[var(--bg-surface,#1f212a)] hover:border-[var(--text-muted,#6b7280)]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {th.isDark ? (
                                <Moon className="w-3.5 h-3.5 text-[var(--text-secondary,#9ba3b2)]" />
                              ) : (
                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              <span className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)]">
                                {th.name}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] flex items-center justify-center">
                                <Check className="w-2 h-2 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] w-fit">
                            <div className="w-3.5 h-3.5 rounded-md border border-black/10" style={{ backgroundColor: th.colors.bgPrimary }} />
                            <div className="w-3.5 h-3.5 rounded-md border border-black/10" style={{ backgroundColor: th.colors.bgSurface }} />
                            <div className="w-3.5 h-3.5 rounded-md border border-black/10" style={{ backgroundColor: th.colors.accentColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MODEL MANAGEMENT */}
            {activeTab === "models" && (
              <ModelManagementTab
                settings={formData}
                models={unifiedModels}
                providers={providers}
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                onRefreshModels={onRefreshConnection}
                onOpenModelDetails={onOpenModelDetails}
                onOpenModelProfile={onOpenModelProfile}
                isLoadingModels={isLoadingModels}
              />
            )}

            {/* TAB 4: PROVIDER MANAGEMENT */}
            {activeTab === "providers" && (
              <ProviderManagementTab
                settings={formData}
                providers={providers}
                onProvidersChange={onProvidersChange}
                onRefreshModels={onRefreshConnection}
              />
            )}

            {/* TAB 5: CHAT & PROMPTS */}
            {activeTab === "chat" && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary,#e6e9f0)]">{t("chatParametersHeading")}</h2>
                </div>

                {/* Global System Prompt */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)]">{t("enableGlobalSystemPrompt")}</h3>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enableGlobalSystemPrompt}
                      onChange={(e) =>
                        handleAutoSave({ ...formData, enableGlobalSystemPrompt: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                  </div>

                  {formData.enableGlobalSystemPrompt && (
                    <textarea
                      value={formData.globalSystemPrompt}
                      onChange={(e) => setFormData({ ...formData, globalSystemPrompt: e.target.value })}
                      onBlur={() => handleAutoSave(formData)}
                      placeholder={t("systemPromptPlaceholder")}
                      rows={4}
                      className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs p-3 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] leading-relaxed font-mono"
                    />
                  )}
                </div>

                {/* Configurable Image-Intent Detection & Prompt Instructions */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
                      <div>
                        <h3 className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)]">
                          {t("imagePromptInstructionsHeading")}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAutoSave({
                          ...formData,
                          imagePromptInstructions: DEFAULT_IMAGE_PROMPT_INSTRUCTIONS,
                        });
                      }}
                      className="text-[11px] text-[var(--accent-color,#818cf8)] hover:underline cursor-pointer shrink-0"
                    >
                      {settings.language === "fa" ? "بازنشانی پیش‌فرض" : "Reset Default"}
                    </button>
                  </div>

                  <textarea
                    value={formData.imagePromptInstructions ?? DEFAULT_IMAGE_PROMPT_INSTRUCTIONS}
                    onChange={(e) => setFormData({ ...formData, imagePromptInstructions: e.target.value })}
                    onBlur={() => handleAutoSave(formData)}
                    rows={8}
                    className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs p-3 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] leading-relaxed font-mono"
                    placeholder="Instructions for converting Persian and English requests into ComfyUI prompts..."
                  />

                  <p className="text-[10.5px] text-[var(--text-muted,#777)] font-mono leading-relaxed">
                    {settings.language === "fa"
                      ? "نکته: این تنظیمات فقط برای تولید تصویر گفتگو-محور (Chat-Assisted) اعمال می‌شود. تولید مستقیم از منوی (+) از این دستورالعمل‌ها مستقل است و مدل متنی را دور می‌زند."
                      : "Note: These instructions only apply to chat-assisted image generation. Direct generation triggered from the (+) menu bypasses the LLM and sends your exact prompt to ComfyUI."}
                  </p>
                </div>

                {/* Global Default Generation Parameters */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--accent-color,#818cf8)] uppercase tracking-wider">
                    {t("defaultSamplingParams")}
                  </h3>

                  {/* Temperature */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">{t("temperature")}</span>
                      <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">{formData.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={formData.temperature}
                      onChange={(e) =>
                        handleAutoSave({ ...formData, temperature: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted,#6b7280)] mt-1">
                      <span>{t("tempPrecise")}</span>
                      <span>{t("tempBalanced")}</span>
                      <span>{t("tempCreative")}</span>
                    </div>
                  </div>

                  {/* Top P */}
                  <div className="pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">{t("topP")}</span>
                      <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">{formData.topP}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={formData.topP}
                      onChange={(e) =>
                        handleAutoSave({ ...formData, topP: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                  </div>

                  {/* Context Window (num_ctx) */}
                  <div className="pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">{t("numCtx")}</span>
                      <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">{formData.numCtx} tokens</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[2048, 4096, 8192, 16384].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleAutoSave({ ...formData, numCtx: size })}
                          className={`py-2 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                            formData.numCtx === size
                              ? "bg-[var(--accent-color,#818cf8)] text-white border-[var(--accent-color,#818cf8)]"
                              : "bg-[var(--bg-primary,#131418)] text-[var(--text-secondary,#9ba3b2)] border-[var(--border-subtle,#1e2029)] hover:border-[var(--text-muted,#6b7280)]"
                          }`}
                        >
                          {size} tokens
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ADVANCED & STORAGE */}
            {activeTab === "advanced" && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary,#e6e9f0)]">{t("advancedHeading")}</h2>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--accent-color,#818cf8)] uppercase tracking-wider">
                    {t("localCacheHeading")}
                  </h3>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary,#131418)]/60 border border-[var(--border-subtle,#1e2029)]">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-4.5 h-4.5 text-[var(--text-muted,#6b7280)]" />
                      <div>
                        <span className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)] block">
                          {t("clientLocalStorage")}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t("clearAllData")}</span>
                    </button>
                  </div>

                  {showClearConfirm && (
                    <div className="p-4 rounded-xl bg-red-950/50 border border-red-700/80 space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span>{t("confirmClearAllTitle")}</span>
                      </div>
                      <p className="text-red-200/80 text-[11px]">
                        {t("confirmClearAllDesc")}
                      </p>
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white"
                        >
                          {t("cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClearAllData();
                            setShowClearConfirm(false);
                            onBack();
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          {t("yesWipeEverything")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: ABOUT */}
            {activeTab === "about" && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary,#e6e9f0)]">{t("aboutHeading")}</h2>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle,#1e2029)]">
                    <span className="text-[var(--text-muted,#6b7280)]">{t("clientAppLabel")}:</span>
                    <span className="text-[var(--text-primary,#e6e9f0)] font-bold">Ollama Desktop Web</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle,#1e2029)]">
                    <span className="text-[var(--text-muted,#6b7280)]">{t("ollamaServerLabel")}:</span>
                    <span className="text-[var(--text-primary,#e6e9f0)] font-mono dir-ltr">{formData.endpoint}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle,#1e2029)]">
                    <span className="text-[var(--text-muted,#6b7280)]">{t("connectionStatusLabel")}:</span>
                    <span className={connectionStatus.isConnected ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {connectionStatus.isConnected ? t("onlineStatus") : t("offlineStatus")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[var(--text-muted,#6b7280)]">{t("installedModelsLabel")}:</span>
                    <span className="text-[var(--text-primary,#e6e9f0)]">{models.length}</span>
                  </div>
                </div>

                {/* Keyboard Shortcuts Cheatsheet */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--accent-color,#818cf8)] uppercase tracking-wider flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4" /> {t("keyboardShortcuts")}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#131418)]/70">
                      <span className="text-[var(--text-secondary,#9ba3b2)]">{t("newChat")}</span>
                      <kbd className="px-2 py-0.5 rounded bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] text-[var(--accent-color,#818cf8)] font-bold text-[10px] font-mono">
                        Ctrl+N
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#131418)]/70">
                      <span className="text-[var(--text-secondary,#9ba3b2)]">{t("quickPaletteShortcut")}</span>
                      <kbd className="px-2 py-0.5 rounded bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] text-[var(--accent-color,#818cf8)] font-bold text-[10px] font-mono">
                        Ctrl+K
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary,#131418)]/70">
                      <span className="text-[var(--text-secondary,#9ba3b2)]">{t("toggleSidebarShortcut")}</span>
                      <kbd className="px-2 py-0.5 rounded bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] text-[var(--accent-color,#818cf8)] font-bold text-[10px] font-mono">
                        Ctrl+Shift+S
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

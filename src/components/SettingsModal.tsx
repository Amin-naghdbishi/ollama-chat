import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Server,
  Sliders,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Palette,
  Terminal,
  Sun,
  Moon,
  Monitor,
  Cpu,
} from "lucide-react";
import { AppSettings, ConnectionStatus, OllamaModel } from "../types";
import { OllamaApi } from "../services/ollamaApi";
import { BUILTIN_THEMES, ThemeEngine } from "../lib/themeEngine";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllData: () => void;
  models?: OllamaModel[];
  selectedModel?: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
  models = [],
  selectedModel,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<"appearance" | "prompts" | "connection" | "interface">("prompts");
  const [selectedPromptModel, setSelectedPromptModel] = useState<string>(
    selectedModel || (models[0]?.name ?? "gemma3:4b")
  );
  const [testStatus, setTestStatus] = useState<ConnectionStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings, isOpen]);

  useEffect(() => {
    if (selectedModel) {
      setSelectedPromptModel(selectedModel);
    } else if (models.length > 0 && !selectedPromptModel) {
      setSelectedPromptModel(models[0].name);
    }
  }, [selectedModel, models]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    const result = await OllamaApi.checkHealth(formData);
    setTestStatus(result);
    setIsTesting(false);
  };

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  const updateModelPrompt = (modelName: string, promptValue: string) => {
    setFormData((prev) => ({
      ...prev,
      modelSystemPrompts: {
        ...prev.modelSystemPrompts,
        [modelName]: promptValue,
      },
    }));
  };

  const handleSelectTheme = (themeId: string) => {
    setFormData({ ...formData, theme: themeId });
    ThemeEngine.applyTheme(themeId);
  };

  const currentModelPrompt = formData.modelSystemPrompts?.[selectedPromptModel] || "";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] flex items-center justify-center">
              <Settings className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            </div>
            <h2 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">Settings</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-[var(--bg-primary,#131418)] border-b border-[var(--border-color,#282a36)] overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "appearance"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold border border-[var(--border-color,#282a36)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]"
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
            <span>Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab("prompts")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "prompts"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold border border-[var(--border-color,#282a36)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
            <span>System Prompt</span>
          </button>

          <button
            onClick={() => setActiveTab("connection")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "connection"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold border border-[var(--border-color,#282a36)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
            <span>Ollama Connection</span>
          </button>

          <button
            onClick={() => setActiveTab("interface")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "interface"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] font-semibold border border-[var(--border-color,#282a36)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
            <span>Parameters & Data</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-xs">
          {/* TAB: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="font-semibold text-[var(--text-primary,#e6e9f0)] text-sm mb-1">Color Theme</h3>
                <p className="text-[var(--text-secondary,#9ba3b2)] text-xs">
                  Choose a refined, calm color theme tailored for long coding and chat sessions.
                </p>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(BUILTIN_THEMES).map((th) => {
                  const isSelected = (formData.theme || "dark") === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleSelectTheme(th.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-[var(--accent-color,#818cf8)] bg-[var(--bg-secondary,#191a21)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/30"
                          : "border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)]/70 hover:border-[var(--text-muted,#6b7280)]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {th.isDark ? (
                            <Moon className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                          ) : (
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)]">
                            {th.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-color,#818cf8)] text-[var(--accent-text,#09090b)] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Swatches preview */}
                      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--bg-surface,#1f212a)] border border-[var(--border-subtle,#1e2029)]">
                        <div
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: th.colors.bgPrimary }}
                          title="Background"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: th.colors.bgSurface }}
                          title="Surface"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: th.colors.accentColor }}
                          title="Accent"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: th.colors.textPrimary }}
                          title="Text"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Language Settings */}
              <div className="pt-4 border-t border-[var(--border-color,#282a36)] space-y-3">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary,#e6e9f0)] text-sm mb-1">Language & Layout</h3>
                  <p className="text-[var(--text-secondary,#9ba3b2)] text-xs">
                    Select application interface language. Persian enables full RTL (Right-to-Left) direction.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "en" })}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      (formData.language || "en") === "en"
                        ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                        : "bg-[var(--bg-primary,#131418)]/70 border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🇺🇸</span>
                      <div>
                        <div className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">English</div>
                        <div className="text-[10px] text-[var(--text-muted,#6b7280)]">Standard LTR Layout</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="language"
                      checked={(formData.language || "en") === "en"}
                      onChange={() => setFormData({ ...formData, language: "en" })}
                      className="accent-[var(--accent-color,#818cf8)]"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, language: "fa" })}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      formData.language === "fa"
                        ? "bg-[var(--bg-secondary,#191a21)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                        : "bg-[var(--bg-primary,#131418)]/70 border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🇮🇷</span>
                      <div>
                        <div className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">فارسی (Persian)</div>
                        <div className="text-[10px] text-[var(--text-muted,#6b7280)]">چیدمان راست‌چین (RTL)</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="language"
                      checked={formData.language === "fa"}
                      onChange={() => setFormData({ ...formData, language: "fa" })}
                      className="accent-[var(--accent-color,#818cf8)]"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM PROMPT */}
          {activeTab === "prompts" && (
            <div className="space-y-5 animate-fadeIn">
              {/* Priority Explainer Banner */}
              <div className="p-3 bg-[var(--bg-secondary,#191a21)] border border-[var(--border-color,#282a36)] rounded-xl text-xs text-[var(--text-secondary,#9ba3b2)]">
                <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">Resolution Priority: </span>
                <span className="font-mono text-[var(--accent-color,#818cf8)]">Model-specific prompt</span> →{" "}
                <span className="font-mono text-emerald-400">Global prompt</span> →{" "}
                <span className="font-mono text-[var(--text-muted,#6b7280)]">No custom prompt</span>
              </div>

              {/* Global System Prompt */}
              <div className="space-y-3 bg-[var(--bg-secondary,#191a21)]/70 p-4 rounded-xl border border-[var(--border-color,#282a36)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-semibold text-sm text-[var(--text-primary,#e6e9f0)]">Global System Prompt</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-[var(--text-secondary,#9ba3b2)]">
                      {formData.enableGlobalSystemPrompt ? "Enabled" : "Disabled"}
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.enableGlobalSystemPrompt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          enableGlobalSystemPrompt: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[var(--accent-color,#818cf8)] rounded cursor-pointer"
                    />
                  </label>
                </div>

                <p className="text-xs text-[var(--text-secondary,#9ba3b2)]">
                  Applies to all Ollama models unless overridden by a model-specific system prompt below.
                </p>

                <textarea
                  value={formData.globalSystemPrompt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalSystemPrompt: e.target.value,
                    })
                  }
                  disabled={!formData.enableGlobalSystemPrompt}
                  placeholder={
                    formData.enableGlobalSystemPrompt
                      ? "Enter global system instructions..."
                      : "Global system prompt is currently disabled. Toggle switch above to enable."
                  }
                  rows={3}
                  className={`w-full text-xs p-3 rounded-xl border transition-all resize-y font-mono ${
                    formData.enableGlobalSystemPrompt
                      ? "bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                      : "bg-[var(--bg-primary,#131418)] text-[var(--text-muted,#6b7280)] border-[var(--border-subtle,#1e2029)] cursor-not-allowed"
                  }`}
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        globalSystemPrompt: "",
                      })
                    }
                    disabled={!formData.globalSystemPrompt}
                    className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Clear Global Prompt
                  </button>
                </div>
              </div>

              {/* Model-specific System Prompts */}
              <div className="space-y-3 bg-[var(--bg-secondary,#191a21)]/70 p-4 rounded-xl border border-[var(--border-color,#282a36)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                    <h4 className="font-semibold text-sm text-[var(--text-primary,#e6e9f0)]">Model-Specific Prompts</h4>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary,#9ba3b2)]">
                  Define custom system prompts tailored to specific installed models. Overrides global prompt.
                </p>

                {/* Model Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-[var(--text-secondary,#9ba3b2)] shrink-0">Target Model:</label>
                  <select
                    value={selectedPromptModel}
                    onChange={(e) => setSelectedPromptModel(e.target.value)}
                    className="flex-1 bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] font-mono"
                  >
                    {models.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} {formData.modelSystemPrompts?.[m.name] ? "✓ (Custom)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={currentModelPrompt}
                  onChange={(e) => updateModelPrompt(selectedPromptModel, e.target.value)}
                  placeholder={`Enter specific system instructions for ${selectedPromptModel}...`}
                  rows={3}
                  className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs p-3 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] resize-y font-mono"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-muted,#6b7280)] font-mono">
                    Model: <strong className="text-[var(--accent-color,#818cf8)]">{selectedPromptModel}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => updateModelPrompt(selectedPromptModel, "")}
                    disabled={!currentModelPrompt}
                    className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Clear Model Prompt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONNECTION */}
          {activeTab === "connection" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-3 bg-[var(--bg-secondary,#191a21)]/70 p-4 rounded-xl border border-[var(--border-color,#282a36)]">
                <label className="block text-[var(--text-primary,#e6e9f0)] font-semibold text-xs">
                  Ollama Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) =>
                      setFormData({ ...formData, endpoint: e.target.value })
                    }
                    placeholder="http://127.0.0.1:11434"
                    className="flex-1 bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#e6e9f0)] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`}
                    />
                    <span>Test</span>
                  </button>
                </div>

                {testStatus && (
                  <div
                    className={`mt-2 p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                      testStatus.isConnected
                        ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                        : "bg-red-950/40 border border-red-800 text-red-300"
                    }`}
                  >
                    {testStatus.isConnected ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Connected! Ollama version: {testStatus.version}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{testStatus.error}</span>
                      </>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-[var(--text-secondary,#9ba3b2)] font-medium mb-1.5">
                    Connection Route Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, connectionMode: "proxy" })
                      }
                      className={`p-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                        formData.connectionMode === "proxy"
                          ? "bg-[var(--bg-surface,#1f212a)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                          : "bg-[var(--bg-primary,#131418)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--btn-hover,#262834)]"
                      }`}
                    >
                      <div className="font-bold text-[var(--text-primary,#e6e9f0)]">Express Proxy</div>
                      <div className="text-[10px] text-[var(--text-muted,#6b7280)]">
                        Recommended for preview sandbox
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, connectionMode: "direct" })
                      }
                      className={`p-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                        formData.connectionMode === "direct"
                          ? "bg-[var(--bg-surface,#1f212a)] border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                          : "bg-[var(--bg-primary,#131418)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--btn-hover,#262834)]"
                      }`}
                    >
                      <div className="font-bold text-[var(--text-primary,#e6e9f0)]">Direct Fetch</div>
                      <div className="text-[10px] text-[var(--text-muted,#6b7280)]">
                        Direct client browser fetch
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PARAMETERS & INTERFACE */}
          {activeTab === "interface" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-3 bg-[var(--bg-secondary,#191a21)]/70 p-4 rounded-xl border border-[var(--border-color,#282a36)]">
                <h4 className="font-semibold text-[var(--text-primary,#e6e9f0)] text-sm mb-2">Model Generation Parameters</h4>

                {/* Temperature */}
                <div>
                  <div className="flex justify-between text-[var(--text-secondary,#9ba3b2)] font-medium mb-1">
                    <span>Temperature</span>
                    <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">
                      {formData.temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--accent-color,#818cf8)] bg-[var(--btn-bg,#1c1e27)] rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Top P */}
                <div>
                  <div className="flex justify-between text-[var(--text-secondary,#9ba3b2)] font-medium mb-1">
                    <span>Top P</span>
                    <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">
                      {formData.topP}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.topP}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        topP: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--accent-color,#818cf8)] bg-[var(--btn-bg,#1c1e27)] rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Context Window Size */}
                <div>
                  <label className="block text-[var(--text-secondary,#9ba3b2)] font-medium mb-1">
                    Context Window Size (num_ctx)
                  </label>
                  <select
                    value={formData.numCtx}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numCtx: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                  >
                    <option value={2048}>2,048 tokens</option>
                    <option value={4096}>4,096 tokens (Default)</option>
                    <option value={8192}>8,192 tokens</option>
                    <option value={16384}>16,384 tokens</option>
                    <option value={32768}>32,768 tokens</option>
                  </select>
                </div>
              </div>

              {/* Interface Switches */}
              <div className="space-y-2 bg-[var(--bg-secondary,#191a21)]/70 p-4 rounded-xl border border-[var(--border-color,#282a36)]">
                <label className="flex items-center justify-between text-[var(--text-primary,#e6e9f0)] cursor-pointer">
                  <span>Enter to Send Messages</span>
                  <input
                    type="checkbox"
                    checked={formData.enterToSend}
                    onChange={(e) =>
                      setFormData({ ...formData, enterToSend: e.target.checked })
                    }
                    className="w-4 h-4 accent-[var(--accent-color,#818cf8)] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-[var(--text-primary,#e6e9f0)] cursor-pointer">
                  <span>Auto-scroll during generation</span>
                  <input
                    type="checkbox"
                    checked={formData.autoScroll}
                    onChange={(e) =>
                      setFormData({ ...formData, autoScroll: e.target.checked })
                    }
                    className="w-4 h-4 accent-[var(--accent-color,#818cf8)] rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Danger Zone */}
              <div className="pt-2 border-t border-[var(--border-color,#282a36)]">
                {showClearConfirm ? (
                  <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl space-y-2">
                    <p className="font-semibold text-red-300">
                      Delete all local chats & settings?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onClearAllData();
                          setShowClearConfirm(false);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 cursor-pointer"
                      >
                        Confirm Clear All
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--btn-hover,#262834)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-red-300 font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Clear All Local Storage Data</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-[var(--accent-color,#818cf8)] hover:bg-[var(--accent-hover,#6366f1)] text-[var(--accent-text,#09090b)] text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

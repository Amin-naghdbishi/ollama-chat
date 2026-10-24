import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  SlidersHorizontal,
  Terminal,
  Cpu,
  Save,
  Check,
  RotateCcw,
  Brain,
  Info,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { OllamaModel, AppSettings, ModelProfileSettings } from "../../types";
import { Storage } from "../../lib/storage";

interface ModelProfileViewProps {
  modelName: string;
  models: OllamaModel[];
  settings: AppSettings;
  onBack: () => void;
  onSaveProfile: (modelName: string, profile: ModelProfileSettings) => void;
  onOpenModelDetails: (modelName: string) => void;
}

export const ModelProfileView: React.FC<ModelProfileViewProps> = ({
  modelName,
  models,
  settings,
  onBack,
  onSaveProfile,
  onOpenModelDetails,
}) => {
  // Load saved profile or fallback to defaults
  const [profile, setProfile] = useState<ModelProfileSettings>(() => {
    const saved = Storage.getModelProfile(modelName);
    return {
      systemPrompt: saved?.systemPrompt ?? settings.modelSystemPrompts?.[modelName] ?? "",
      temperature: saved?.temperature ?? settings.temperature ?? 0.7,
      topP: saved?.topP ?? settings.topP ?? 0.9,
      topK: saved?.topK ?? 40,
      numCtx: saved?.numCtx ?? settings.numCtx ?? 4096,
      enableThinking: saved?.enableThinking ?? settings.enableThinking ?? true,
      thinkingMode: saved?.thinkingMode ?? settings.thinkingMode ?? "auto",
      repeatPenalty: saved?.repeatPenalty ?? 1.1,
      seed: saved?.seed ?? undefined,
      numPredict: saved?.numPredict ?? -1,
    };
  });

  const [hasSavedToast, setHasSavedToast] = useState(false);

  useEffect(() => {
    const saved = Storage.getModelProfile(modelName);
    setProfile({
      systemPrompt: saved?.systemPrompt ?? settings.modelSystemPrompts?.[modelName] ?? "",
      temperature: saved?.temperature ?? settings.temperature ?? 0.7,
      topP: saved?.topP ?? settings.topP ?? 0.9,
      topK: saved?.topK ?? 40,
      numCtx: saved?.numCtx ?? settings.numCtx ?? 4096,
      enableThinking: saved?.enableThinking ?? settings.enableThinking ?? true,
      thinkingMode: saved?.thinkingMode ?? settings.thinkingMode ?? "auto",
      repeatPenalty: saved?.repeatPenalty ?? 1.1,
      seed: saved?.seed ?? undefined,
      numPredict: saved?.numPredict ?? -1,
    });
  }, [modelName, settings]);

  const handleSave = () => {
    onSaveProfile(modelName, profile);
    setHasSavedToast(true);
    setTimeout(() => setHasSavedToast(false), 2500);
  };

  const handleResetDefaults = () => {
    const defaults: ModelProfileSettings = {
      systemPrompt: "",
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numCtx: 4096,
      enableThinking: true,
      thinkingMode: "auto",
      repeatPenalty: 1.1,
      seed: undefined,
      numPredict: -1,
    };
    setProfile(defaults);
    onSaveProfile(modelName, defaults);
    setHasSavedToast(true);
    setTimeout(() => setHasSavedToast(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary,#131418)] animate-fadeIn">
      {/* Top Header */}
      <header className="h-14 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#282a36)] px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-primary,#e6e9f0)] hover:text-white transition-all shadow-xs cursor-pointer group shrink-0"
            title="Return to previous view"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent-color,#818cf8)] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color,#282a36)] hidden sm:block" />

          <div className="flex items-center gap-2 overflow-hidden">
            <SlidersHorizontal className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
            <h1 className="font-mono font-bold text-sm text-[var(--text-primary,#e6e9f0)] truncate">
              Model Profile: {modelName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenModelDetails(modelName)}
            className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Specs</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {hasSavedToast ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{hasSavedToast ? "Profile Saved!" : "Save Profile"}</span>
          </button>
        </div>
      </header>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header Description */}
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary,#e6e9f0)]">
              Model-Specific Configuration
            </h2>
            <p className="text-xs text-[var(--text-secondary,#9ba3b2)] mt-0.5">
              These settings apply automatically whenever <span className="font-mono text-[var(--accent-color,#818cf8)]">{modelName}</span> is used in chat.
            </p>
          </div>

          {/* Model System Prompt */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" /> Model System Prompt & Persona
                </h3>
                <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                  Custom instructions, persona definitions, or system directives specific to {modelName}.
                </p>
              </div>
            </div>

            <textarea
              value={profile.systemPrompt || ""}
              onChange={(e) => setProfile({ ...profile, systemPrompt: e.target.value })}
              placeholder={`Enter custom system instructions for ${modelName}... (e.g. You are a senior TypeScript architect...)`}
              rows={4}
              className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs p-3.5 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)] font-mono leading-relaxed"
            />
          </div>

          {/* Thinking / Reasoning Controls */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-[var(--accent-color,#818cf8)]" /> Deep Reasoning & Thinking Mode
              </h3>
              <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                Controls whether the model outputs internal reasoning blocks (<span className="font-mono text-[var(--accent-color,#818cf8)]">&lt;think&gt;</span>).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setProfile({ ...profile, thinkingMode: "on", enableThinking: true })
                }
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  profile.enableThinking
                    ? "border-[var(--accent-color,#818cf8)] bg-[var(--accent-color,#818cf8)]/15 text-[var(--text-primary,#e6e9f0)] ring-1 ring-[var(--accent-color,#818cf8)]/40"
                    : "border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)]/70 text-[var(--text-secondary,#9ba3b2)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Thinking ON</span>
                  {profile.enableThinking && <Check className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />}
                </div>
                <span className="text-[10px] opacity-80">
                  Enables deep reasoning flags and thought stream display.
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setProfile({ ...profile, thinkingMode: "off", enableThinking: false })
                }
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  !profile.enableThinking
                    ? "border-[var(--accent-color,#818cf8)] bg-[var(--accent-color,#818cf8)]/15 text-[var(--text-primary,#e6e9f0)] ring-1 ring-[var(--accent-color,#818cf8)]/40"
                    : "border-[var(--border-color,#282a36)] bg-[var(--bg-primary,#131418)]/70 text-[var(--text-secondary,#9ba3b2)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Thinking OFF</span>
                  {!profile.enableThinking && <Check className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />}
                </div>
                <span className="text-[10px] opacity-80">
                  Direct response generation without internal thinking step.
                </span>
              </button>
            </div>
          </div>

          {/* Model Sampling Parameters */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-5">
            <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)]">
              Sampling & Context Window Parameters
            </h3>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">Temperature</span>
                <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">
                  {profile.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={profile.temperature ?? 0.7}
                onChange={(e) =>
                  setProfile({ ...profile, temperature: parseFloat(e.target.value) })
                }
                className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted,#6b7280)] mt-1">
                <span>0.0 (Deterministic / Code)</span>
                <span>0.7 (Standard)</span>
                <span>2.0 (High Creativity)</span>
              </div>
            </div>

            {/* Top-P */}
            <div className="pt-3 border-t border-[var(--border-subtle,#1e2029)]">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">Top-P (Nucleus Sampling)</span>
                <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">
                  {profile.topP}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={profile.topP ?? 0.9}
                onChange={(e) =>
                  setProfile({ ...profile, topP: parseFloat(e.target.value) })
                }
                className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
              />
            </div>

            {/* Context Window (num_ctx) */}
            <div className="pt-3 border-t border-[var(--border-subtle,#1e2029)]">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-[var(--text-primary,#e6e9f0)]">Context Window (num_ctx)</span>
                <span className="font-mono text-[var(--accent-color,#818cf8)] font-bold">
                  {profile.numCtx} tokens
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[2048, 4096, 8192, 16384, 32768, 65536].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setProfile({ ...profile, numCtx: size })}
                    className={`py-2 rounded-xl font-mono text-xs font-semibold border transition-all cursor-pointer ${
                      profile.numCtx === size
                        ? "bg-[var(--accent-color,#818cf8)] text-white border-[var(--accent-color,#818cf8)] shadow-xs"
                        : "bg-[var(--bg-primary,#131418)] text-[var(--text-secondary,#9ba3b2)] border-[var(--border-subtle,#1e2029)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    {size >= 1024 ? `${size / 1024}k` : size} ({size})
                  </button>
                ))}
              </div>
            </div>

            {/* Repeat Penalty & Top-K */}
            <div className="pt-3 border-t border-[var(--border-subtle,#1e2029)] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary,#e6e9f0)] mb-1">
                  Repeat Penalty ({profile.repeatPenalty ?? 1.1})
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={profile.repeatPenalty ?? 1.1}
                  onChange={(e) =>
                    setProfile({ ...profile, repeatPenalty: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary,#e6e9f0)] mb-1">
                  Top-K (Optional)
                </label>
                <input
                  type="number"
                  value={profile.topK ?? 40}
                  onChange={(e) =>
                    setProfile({ ...profile, topK: parseInt(e.target.value) || 40 })
                  }
                  className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3 py-1.5 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                />
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Profile to Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

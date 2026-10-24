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
  Image as ImageIcon,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import {
  OllamaModel,
  AppSettings,
  ModelProfileSettings,
  ImageModelProfile,
  ImageAspectRatio,
  ImageQualityPreset,
} from "../../types";
import { Storage } from "../../lib/storage";
import {
  getDefaultImageModelProfile,
  isSdxlCheckpoint,
} from "../../services/imageSettingsService";

interface ModelProfileViewProps {
  modelName: string;
  models: OllamaModel[];
  imageModels?: string[];
  settings: AppSettings;
  onBack: () => void;
  onSaveProfile: (modelName: string, profile: ModelProfileSettings) => void;
  onSaveImageProfile?: (modelName: string, profile: ImageModelProfile) => void;
  onOpenModelDetails: (modelName: string) => void;
}

export const ModelProfileView: React.FC<ModelProfileViewProps> = ({
  modelName,
  models,
  imageModels = [],
  settings,
  onBack,
  onSaveProfile,
  onSaveImageProfile,
  onOpenModelDetails,
}) => {
  const isImageModel =
    imageModels.includes(modelName) ||
    modelName.endsWith(".safetensors") ||
    modelName.endsWith(".ckpt") ||
    modelName.endsWith(".pt") ||
    isSdxlCheckpoint(modelName);

  const isXl = isSdxlCheckpoint(modelName);

  // LLM Text Model Profile State
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

  // Image Generation Model Profile State
  const [imageProfile, setImageProfile] = useState<ImageModelProfile>(() => {
    const saved = Storage.getImageModelProfile(modelName);
    return saved || getDefaultImageModelProfile(modelName);
  });

  const [hasSavedToast, setHasSavedToast] = useState(false);

  useEffect(() => {
    if (isImageModel) {
      const saved = Storage.getImageModelProfile(modelName);
      setImageProfile(saved || getDefaultImageModelProfile(modelName));
    } else {
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
    }
  }, [modelName, settings, isImageModel]);

  const handleSave = () => {
    if (isImageModel) {
      Storage.saveImageModelProfile(modelName, imageProfile);
      onSaveImageProfile?.(modelName, imageProfile);
    } else {
      onSaveProfile(modelName, profile);
    }
    setHasSavedToast(true);
    setTimeout(() => setHasSavedToast(false), 2500);
  };

  const handleResetDefaults = () => {
    if (isImageModel) {
      const defaults = getDefaultImageModelProfile(modelName);
      setImageProfile(defaults);
      Storage.saveImageModelProfile(modelName, defaults);
      onSaveImageProfile?.(modelName, defaults);
    } else {
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
    }
    setHasSavedToast(true);
    setTimeout(() => setHasSavedToast(false), 2500);
  };

  // Helper to change aspect ratio and set corresponding default dimensions
  const handleSelectAspectRatio = (ratio: ImageAspectRatio) => {
    let w = imageProfile.width;
    let h = imageProfile.height;

    if (isXl) {
      if (ratio === "square") {
        w = 1024;
        h = 1024;
      } else if (ratio === "portrait") {
        w = 1024;
        h = 1536;
      } else {
        w = 1536;
        h = 1024;
      }
    } else {
      if (ratio === "square") {
        w = 512;
        h = 512;
      } else if (ratio === "portrait") {
        w = 512;
        h = 768;
      } else {
        w = 768;
        h = 512;
      }
    }

    setImageProfile({
      ...imageProfile,
      aspectRatio: ratio,
      width: w,
      height: h,
    });
  };

  // Helper to change quality preset
  const handleSelectQualityPreset = (preset: ImageQualityPreset) => {
    let steps = 20;
    let cfg = 7.0;

    if (isXl) {
      if (preset === "highest") {
        steps = 50;
        cfg = 8.0;
      } else if (preset === "high") {
        steps = 35;
        cfg = 7.5;
      } else {
        steps = 25;
        cfg = 7.0;
      }
    } else {
      if (preset === "highest") {
        steps = 40;
        cfg = 8.0;
      } else if (preset === "high") {
        steps = 30;
        cfg = 7.5;
      } else {
        steps = 20;
        cfg = 7.0;
      }
    }

    setImageProfile({
      ...imageProfile,
      qualityPreset: preset,
      steps,
      cfg,
    });
  };

  const isResolutionHighForSd15 = !isXl && (imageProfile.width > 768 || imageProfile.height > 768);

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
            {isImageModel ? (
              <ImageIcon className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
            ) : (
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
            )}
            <h1 className="font-mono font-bold text-sm text-[var(--text-primary,#e6e9f0)] truncate">
              {isImageModel ? "Image Model Profile" : "Model Profile"}: {modelName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isImageModel && (
            <button
              onClick={() => onOpenModelDetails(modelName)}
              className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Specs</span>
            </button>
          )}

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
              {isImageModel ? "Image Generation Model Configuration" : "Model-Specific Configuration"}
            </h2>
            <p className="text-xs text-[var(--text-secondary,#9ba3b2)] mt-0.5">
              {isImageModel
                ? `Configure default resolution, aspect ratio, and sampling quality for ${modelName}.`
                : `These settings apply automatically whenever ${modelName} is used in chat.`}
            </p>
          </div>

          {/* =========================================================================
             IMAGE GENERATION PROFILE VIEW (for ComfyUI Checkpoints)
             ========================================================================= */}
          {isImageModel ? (
            <div className="space-y-5">
              {/* Active Profile Status Summary Card */}
              <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary,#eee)]">Checkpoint:</span>
                    <span className="font-mono text-xs font-bold text-[var(--accent-color,#818cf8)] truncate max-w-[280px]">
                      {modelName}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold border ${
                      isXl
                        ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                        : "bg-sky-950/60 border-sky-700/60 text-sky-300"
                    }`}
                  >
                    {isXl ? "SDXL 1.0 (Native 1024px)" : "SD 1.5 (Native 512px)"}
                  </span>
                </div>

                {/* Selected Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-subtle,#1e2029)]">
                  <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-primary,#16171d)] border border-[var(--border-color,#282a36)] text-xs font-mono text-[var(--text-primary,#eee)]">
                    Resolution: <strong className="text-[var(--accent-color,#818cf8)]">{imageProfile.width} × {imageProfile.height} px</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-primary,#16171d)] border border-[var(--border-color,#282a36)] text-xs font-mono text-[var(--text-primary,#eee)]">
                    Aspect Ratio: <strong className="text-zinc-200 capitalize">{imageProfile.aspectRatio}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-primary,#16171d)] border border-[var(--border-color,#282a36)] text-xs font-mono text-[var(--text-primary,#eee)]">
                    Quality: <strong className="text-zinc-200 capitalize">{imageProfile.qualityPreset}</strong> ({imageProfile.steps} steps)
                  </span>
                </div>
              </div>

              {/* 1. Aspect Ratio Configuration */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                    <Square className="w-3.5 h-3.5" /> Aspect Ratio
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                    Select target image orientation. Changing aspect ratio automatically sets recommended pixel dimensions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Square */}
                  <button
                    type="button"
                    onClick={() => handleSelectAspectRatio("square")}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      imageProfile.aspectRatio === "square"
                        ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#eee)] shadow-xs"
                        : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <Square className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                    <span className="text-xs font-bold">Square (1:1)</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted,#777)]">
                      {isXl ? "1024 × 1024" : "512 × 512"}
                    </span>
                  </button>

                  {/* Portrait */}
                  <button
                    type="button"
                    onClick={() => handleSelectAspectRatio("portrait")}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      imageProfile.aspectRatio === "portrait"
                        ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#eee)] shadow-xs"
                        : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <RectangleVertical className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                    <span className="text-xs font-bold">Portrait (Vertical)</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted,#777)]">
                      {isXl ? "1024 × 1536" : "512 × 768"}
                    </span>
                  </button>

                  {/* Landscape */}
                  <button
                    type="button"
                    onClick={() => handleSelectAspectRatio("landscape")}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      imageProfile.aspectRatio === "landscape"
                        ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#eee)] shadow-xs"
                        : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <RectangleHorizontal className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
                    <span className="text-xs font-bold">Landscape (Horizontal)</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted,#777)]">
                      {isXl ? "1536 × 1024" : "768 × 512"}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Resolution Settings */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Output Resolution (Pixels)
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                    Configure generated canvas dimensions. Dimensions pass directly into ComfyUI's EmptyLatentImage.
                  </p>
                </div>

                {/* Quick Presets Pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary,#888)] block">
                    Supported Presets for {isXl ? "SDXL" : "SD 1.5"}:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(isXl
                      ? [
                          { label: "1024 × 1024 (1:1)", w: 1024, h: 1024, ratio: "square" },
                          { label: "1024 × 1536 (2:3)", w: 1024, h: 1536, ratio: "portrait" },
                          { label: "1536 × 1024 (3:2)", w: 1536, h: 1024, ratio: "landscape" },
                          { label: "896 × 1152 (3:4)", w: 896, h: 1152, ratio: "portrait" },
                          { label: "1152 × 896 (4:3)", w: 1152, h: 896, ratio: "landscape" },
                          { label: "768 × 768 (1:1)", w: 768, h: 768, ratio: "square" },
                        ]
                      : [
                          { label: "512 × 512 (1:1)", w: 512, h: 512, ratio: "square" },
                          { label: "512 × 768 (2:3)", w: 512, h: 768, ratio: "portrait" },
                          { label: "768 × 512 (3:2)", w: 768, h: 512, ratio: "landscape" },
                          { label: "448 × 768 (9:16)", w: 448, h: 768, ratio: "portrait" },
                          { label: "768 × 448 (16:9)", w: 768, h: 448, ratio: "landscape" },
                          { label: "768 × 768 (1:1)", w: 768, h: 768, ratio: "square" },
                        ]
                    ).map((p) => {
                      const isMatch = imageProfile.width === p.w && imageProfile.height === p.h;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            setImageProfile({
                              ...imageProfile,
                              width: p.w,
                              height: p.h,
                              aspectRatio: p.ratio as ImageAspectRatio,
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                            isMatch
                              ? "bg-[var(--accent-color,#818cf8)] text-white border-[var(--accent-color,#818cf8)] font-bold"
                              : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#aaa)] hover:text-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Width & Height Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary,#e6e9f0)] mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={256}
                      max={isXl ? 2048 : 1024}
                      step={8}
                      value={imageProfile.width}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 512;
                        const w = Math.round(val / 8) * 8;
                        const h = imageProfile.height;
                        const ratio = h > w ? "portrait" : w > h ? "landscape" : "square";
                        setImageProfile({ ...imageProfile, width: w, aspectRatio: ratio });
                      }}
                      className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                    />
                    <span className="text-[10px] text-[var(--text-muted,#777)] font-mono mt-0.5 block">
                      Multiples of 8 (min: 256, max: {isXl ? 1536 : 1024})
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary,#e6e9f0)] mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={256}
                      max={isXl ? 2048 : 1024}
                      step={8}
                      value={imageProfile.height}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 512;
                        const h = Math.round(val / 8) * 8;
                        const w = imageProfile.width;
                        const ratio = h > w ? "portrait" : w > h ? "landscape" : "square";
                        setImageProfile({ ...imageProfile, height: h, aspectRatio: ratio });
                      }}
                      className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                    />
                    <span className="text-[10px] text-[var(--text-muted,#777)] font-mono mt-0.5 block">
                      Multiples of 8 (min: 256, max: {isXl ? 1536 : 1024})
                    </span>
                  </div>
                </div>

                {/* SD 1.5 Capability Warning */}
                {isResolutionHighForSd15 && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-semibold text-xs">High Resolution Notice for SD 1.5</p>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed mt-0.5">
                        SD 1.5 checkpoints have a native latent resolution of 512px. Generating above 768px may increase VRAM consumption and introduce repeating artifacts.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Quality Preset Selection */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Quality Preset
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                    Choose generation quality level. Higher presets increase sampling steps and prompt guidance.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Standard */}
                  <button
                    type="button"
                    onClick={() => handleSelectQualityPreset("standard")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      imageProfile.qualityPreset === "standard"
                        ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] shadow-xs"
                        : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary,#eee)]">Standard</span>
                      <span className="text-[10px] font-mono text-[var(--accent-color,#818cf8)]">
                        {isXl ? "25 steps" : "20 steps"}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted,#777)] mt-1">
                      Fast, well-balanced quality and generation speed.
                    </p>
                  </button>

                  {/* High Quality */}
                  <button
                    type="button"
                    onClick={() => handleSelectQualityPreset("high")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      imageProfile.qualityPreset === "high"
                        ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] shadow-xs"
                        : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary,#eee)]">High Quality</span>
                      <span className="text-[10px] font-mono text-[var(--accent-color,#818cf8)]">
                        {isXl ? "35 steps" : "30 steps"}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted,#777)] mt-1">
                      Enhanced fine details, coherence, and textures.
                    </p>
                  </button>

                  {/* Highest Quality */}
                  <button
                    type="button"
                    onClick={() => handleSelectQualityPreset("highest")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      imageProfile.qualityPreset === "highest"
                        ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] shadow-xs"
                        : "bg-[var(--bg-primary,#16171d)] border-[var(--border-color,#282a36)] hover:border-[var(--text-muted,#6b7280)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary,#eee)]">Highest Quality</span>
                      <span className="text-[10px] font-mono text-[var(--accent-color,#818cf8)]">
                        {isXl ? "50 steps" : "40 steps"}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted,#777)] mt-1">
                      Maximum sampling iterations for best sharpness.
                    </p>
                  </button>
                </div>
              </div>

              {/* 4. Generation Parameters (KSampler) */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> ComfyUI KSampler Parameters
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                    Fine-tune sampling steps, CFG prompt guidance scale, and negative prompt.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sampling Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">
                        Sampling Steps: {imageProfile.steps}
                      </label>
                      <span className="text-[10.5px] font-mono text-[var(--text-muted,#777)]">
                        10 – 60 steps
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="1"
                      value={imageProfile.steps}
                      onChange={(e) =>
                        setImageProfile({
                          ...imageProfile,
                          steps: parseInt(e.target.value) || 20,
                        })
                      }
                      className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                  </div>

                  {/* CFG Scale */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">
                        CFG Scale: {imageProfile.cfg}
                      </label>
                      <span className="text-[10.5px] font-mono text-[var(--text-muted,#777)]">
                        1.0 – 15.0
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="15.0"
                      step="0.5"
                      value={imageProfile.cfg}
                      onChange={(e) =>
                        setImageProfile({
                          ...imageProfile,
                          cfg: parseFloat(e.target.value) || 7.0,
                        })
                      }
                      className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Negative Prompt */}
                <div className="pt-2 border-t border-[var(--border-subtle,#1e2029)]">
                  <label className="block text-xs font-semibold text-[var(--text-primary,#e6e9f0)] mb-1">
                    Default Negative Prompt
                  </label>
                  <input
                    type="text"
                    value={
                      imageProfile.negativePrompt ??
                      "text, watermark, blurry, low quality, distortion, deformed, ugly, bad anatomy, bad hands, missing fingers"
                    }
                    onChange={(e) =>
                      setImageProfile({ ...imageProfile, negativePrompt: e.target.value })
                    }
                    placeholder="text, watermark, blurry, low quality, distortion..."
                    className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                  />
                </div>
              </div>

              {/* Reset Defaults & Save Profile Bottom Bar */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3.5 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {hasSavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================================
               TEXT MODEL PROFILE VIEW (Ollama LLM)
               ========================================================================= */
            <div className="space-y-6">
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
                    Configure default reasoning behavior for models supporting chain-of-thought (e.g. DeepSeek-R1, QwQ).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { mode: "auto", label: "Auto (Model Decides)", desc: "Relies on model prompt" },
                      { mode: "on", label: "Always ON", desc: "Enforces reasoning thoughts" },
                      { mode: "off", label: "Always OFF", desc: "Suppresses reasoning traces" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          thinkingMode: item.mode,
                          enableThinking: item.mode !== "off",
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        profile.thinkingMode === item.mode
                          ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                          : "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:border-[var(--border-color,#3e4255)]"
                      }`}
                    >
                      <div className="font-bold text-xs">{item.label}</div>
                      <div className="text-[10px] text-[var(--text-muted,#6b7280)] mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sampling Parameters */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[var(--accent-color,#818cf8)]" /> Sampling Parameters
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                    Adjust randomness, predictability, and context window limits for this model.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">
                        Temperature ({profile.temperature ?? 0.7})
                      </label>
                      <span className="text-[10px] font-mono text-[var(--text-muted,#6b7280)]">0.0 – 2.0</span>
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
                    <div className="flex justify-between text-[9px] text-[var(--text-muted,#6b7280)] mt-0.5">
                      <span>Deterministic</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Top-P */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">
                        Top-P ({profile.topP ?? 0.9})
                      </label>
                      <span className="text-[10px] font-mono text-[var(--text-muted,#6b7280)]">0.0 – 1.0</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={profile.topP ?? 0.9}
                      onChange={(e) =>
                        setProfile({ ...profile, topP: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[var(--accent-color,#818cf8)] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-muted,#6b7280)] mt-0.5">
                      <span>Strict</span>
                      <span>Nucleus</span>
                    </div>
                  </div>
                </div>

                {/* Context Window (num_ctx) */}
                <div className="pt-3 border-t border-[var(--border-subtle,#1e2029)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">
                      Context Window Limit (Tokens: {profile.numCtx ?? 4096})
                    </label>
                    <span className="text-[10px] font-mono text-[var(--accent-color,#818cf8)]">
                      {((profile.numCtx ?? 4096) / 1024).toFixed(0)}k tokens
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[2048, 4096, 8192, 16384, 32768, 65536, 131072].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setProfile({ ...profile, numCtx: size })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer border ${
                          profile.numCtx === size
                            ? "bg-[var(--accent-color,#818cf8)] text-white border-[var(--accent-color,#818cf8)] font-bold shadow-xs"
                            : "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white"
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
          )}
        </div>
      </div>
    </div>
  );
};

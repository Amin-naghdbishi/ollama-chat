import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  Gauge,
  Layers,
  Brain,
  Eye,
  FileCode,
  Copy,
  Check,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  SlidersHorizontal,
  Info,
  Terminal,
  Activity,
  Zap,
} from "lucide-react";
import { OllamaModel, OllamaModelShowInfo, AppSettings, ModelTestResult } from "../../types";
import { formatBytes } from "../../lib/formatters";
import { OllamaApi, detectModelCapabilities } from "../../services/ollamaApi";

interface ModelDetailsViewProps {
  modelName: string;
  models: OllamaModel[];
  settings: AppSettings;
  onBack: () => void;
  onSelectModel: (modelName: string) => void;
  isSelected: boolean;
  onOpenModelProfile: (modelName: string) => void;
}

export const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({
  modelName,
  models,
  settings,
  onBack,
  onSelectModel,
  isSelected,
  onOpenModelProfile,
}) => {
  const [modelDetails, setModelDetails] = useState<OllamaModelShowInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [copiedModelfile, setCopiedModelfile] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "modelfile" | "template" | "tests">("overview");

  const currentModelObj = models.find((m) => m.name === modelName || m.model === modelName);

  useEffect(() => {
    setIsLoadingDetails(true);
    setTestResult(null);
    setCopiedModelfile(false);

    OllamaApi.fetchModelInfo(settings, modelName)
      .then((info) => setModelDetails(info))
      .catch((err) => {
        console.warn("Could not fetch detailed model info from Ollama:", err);
      })
      .finally(() => setIsLoadingDetails(false));
  }, [modelName, settings]);

  const capabilities = detectModelCapabilities(modelName, modelDetails, currentModelObj);

  const handleCopyModelfile = () => {
    if (modelDetails?.modelfile) {
      navigator.clipboard.writeText(modelDetails.modelfile);
      setCopiedModelfile(true);
      setTimeout(() => setCopiedModelfile(false), 2000);
    }
  };

  const handleRunDiagnosticTest = async () => {
    setIsTestingModel(true);
    try {
      const res = await OllamaApi.testModel(settings, modelName, modelDetails, currentModelObj);
      setTestResult(res);
    } catch (err) {
      console.error("Test model failed:", err);
    } finally {
      setIsTestingModel(false);
    }
  };

  // Technical parameters parsed from Ollama
  const paramSize = currentModelObj?.details?.parameter_size || modelDetails?.details?.parameter_size || "Not specified";
  const quantLevel = currentModelObj?.details?.quantization_level || modelDetails?.details?.quantization_level || "Not specified";
  const family = currentModelObj?.details?.family || modelDetails?.details?.family || "Not specified";
  const families = currentModelObj?.details?.families || modelDetails?.details?.families || [];
  const format = currentModelObj?.details?.format || modelDetails?.details?.format || "GGUF";
  const fileSize = currentModelObj?.size ? formatBytes(currentModelObj.size) : "Not available";
  const digest = currentModelObj?.digest || "Not available";

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
            <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
            <h1 className="font-mono font-bold text-sm text-[var(--text-primary,#e6e9f0)] truncate">
              {modelName}
            </h1>
            {isSelected && (
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-[var(--accent-color,#818cf8)] text-white text-[10px] font-bold">
                ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenModelProfile(modelName)}
            className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Model Profile</span>
          </button>

          <button
            onClick={() => {
              onSelectModel(modelName);
              onBack();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isSelected
                ? "bg-[var(--accent-color,#818cf8)] text-white hover:brightness-110 shadow-xs"
                : "bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--accent-color,#818cf8)] hover:text-white border border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSelected ? "Active in Chat" : "Use This Model"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Overview Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted,#6b7280)] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" /> Parameter Count
              </span>
              <span className="text-base font-bold font-mono text-[var(--text-primary,#e6e9f0)]">
                {paramSize}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted,#6b7280)] flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Quantization
              </span>
              <span className="text-base font-bold font-mono text-[var(--text-primary,#e6e9f0)]">
                {quantLevel}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted,#6b7280)] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> File Size
              </span>
              <span className="text-base font-bold font-mono text-[var(--text-primary,#e6e9f0)]">
                {fileSize}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted,#6b7280)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" /> Architecture
              </span>
              <span className="text-base font-bold font-mono text-[var(--text-primary,#e6e9f0)] capitalize">
                {family}
              </span>
            </div>
          </div>

          {/* Capabilities Badges Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)]">
              Detected Model Capabilities
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vision Support */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  capabilities.supportsVision
                    ? "bg-blue-950/30 border-blue-800/60 text-blue-200"
                    : "bg-[var(--bg-primary,#131418)]/60 border-[var(--border-subtle,#1e2029)] text-[var(--text-muted,#6b7280)]"
                }`}
              >
                <div className={`p-2 rounded-lg ${capabilities.supportsVision ? "bg-blue-900/50 text-blue-400" : "bg-[var(--btn-bg,#1c1e27)]"}`}>
                  <Eye className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs">
                    {capabilities.supportsVision ? "Vision Multi-Modal Supported" : "Text Only (No Vision)"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {capabilities.supportsVision
                      ? "Can analyze uploaded images, diagrams, screenshots, and photos."
                      : "Standard language model without native image encoder."}
                  </span>
                </div>
              </div>

              {/* Reasoning / Thinking Support */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  capabilities.supportsThinking === "supported"
                    ? "bg-purple-950/30 border-purple-800/60 text-purple-200"
                    : "bg-[var(--bg-primary,#131418)]/60 border-[var(--border-subtle,#1e2029)] text-[var(--text-muted,#6b7280)]"
                }`}
              >
                <div className={`p-2 rounded-lg ${capabilities.supportsThinking === "supported" ? "bg-purple-900/50 text-purple-400" : "bg-[var(--btn-bg,#1c1e27)]"}`}>
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs">
                    {capabilities.supportsThinking === "supported"
                      ? "Deep Reasoning / Thinking Supported"
                      : "Standard Direct Response"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {capabilities.supportsThinking === "supported"
                      ? "Supports chain-of-thought internal reasoning blocks (<think>)."
                      : "Generates output directly without thinking tokens."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary,#191a21)] rounded-2xl border border-[var(--border-color,#282a36)] text-xs font-semibold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                  : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
              }`}
            >
              Specifications & Digest
            </button>
            <button
              onClick={() => setActiveTab("modelfile")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === "modelfile"
                  ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                  : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
              }`}
            >
              Modelfile
            </button>
            <button
              onClick={() => setActiveTab("template")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === "template"
                  ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                  : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
              }`}
            >
              Prompt Template
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "tests"
                  ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                  : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automated Tests</span>
            </button>
          </div>

          {/* TAB 1: SPECIFICATIONS */}
          {activeTab === "overview" && (
            <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4 text-xs font-mono">
              <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                <span className="text-[var(--text-muted,#6b7280)]">Model ID:</span>
                <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{modelName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                <span className="text-[var(--text-muted,#6b7280)]">Format:</span>
                <span className="text-[var(--text-primary,#e6e9f0)]">{format}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                <span className="text-[var(--text-muted,#6b7280)]">Architecture Family:</span>
                <span className="text-[var(--text-primary,#e6e9f0)] capitalize">{family}</span>
              </div>
              {families.length > 1 && (
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                  <span className="text-[var(--text-muted,#6b7280)]">Related Families:</span>
                  <span className="text-[var(--text-primary,#e6e9f0)]">{families.join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                <span className="text-[var(--text-muted,#6b7280)]">Parameter Size:</span>
                <span className="text-[var(--text-primary,#e6e9f0)]">{paramSize}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                <span className="text-[var(--text-muted,#6b7280)]">Quantization Level:</span>
                <span className="text-[var(--text-primary,#e6e9f0)]">{quantLevel}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border-subtle,#1e2029)]">
                <span className="text-[var(--text-muted,#6b7280)]">Storage Digest:</span>
                <span className="text-[var(--text-primary,#e6e9f0)] truncate max-w-[250px] sm:max-w-md">{digest}</span>
              </div>
            </div>
          )}

          {/* TAB 2: MODELFILE */}
          {activeTab === "modelfile" && (
            <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)]">
                  Ollama Modelfile
                </span>
                {modelDetails?.modelfile && (
                  <button
                    onClick={handleCopyModelfile}
                    className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedModelfile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedModelfile ? "Copied!" : "Copy Modelfile"}</span>
                  </button>
                )}
              </div>

              {isLoadingDetails ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-[var(--text-muted,#6b7280)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color,#818cf8)]" />
                  <span>Fetching modelfile from Ollama...</span>
                </div>
              ) : modelDetails?.modelfile ? (
                <pre className="p-4 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] text-xs text-[var(--text-primary,#e6e9f0)] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 custom-scrollbar">
                  {modelDetails.modelfile}
                </pre>
              ) : (
                <div className="p-6 text-center text-xs text-[var(--text-muted,#6b7280)]">
                  Modelfile content not returned by local Ollama server for this model.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEMPLATE */}
          {activeTab === "template" && (
            <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-3">
              <span className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)] block">
                Prompt Formatting Template
              </span>

              {isLoadingDetails ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-[var(--text-muted,#6b7280)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color,#818cf8)]" />
                  <span>Fetching template from Ollama...</span>
                </div>
              ) : modelDetails?.template ? (
                <pre className="p-4 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] text-xs text-[var(--text-primary,#e6e9f0)] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 custom-scrollbar">
                  {modelDetails.template}
                </pre>
              ) : (
                <div className="p-6 text-center text-xs text-[var(--text-muted,#6b7280)]">
                  Default Ollama template is used.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUTOMATED DIAGNOSTIC TESTS */}
          {activeTab === "tests" && (
            <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)]">
                    Model Live Diagnostic Test Suite
                  </h3>
                  <p className="text-xs text-[var(--text-secondary,#9ba3b2)] mt-0.5">
                    Tests streaming response, token latency, thinking reasoning tags, and vision capabilities.
                  </p>
                </div>

                <button
                  onClick={handleRunDiagnosticTest}
                  disabled={isTestingModel}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  {isTestingModel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isTestingModel ? "Running Tests..." : "Run Diagnostic Tests"}</span>
                </button>
              </div>

              {/* Test Results Output */}
              {testResult ? (
                <div className="space-y-2.5 pt-2 font-mono text-xs">
                  {/* Basic Chat Test */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      testResult.basicChat.passed
                        ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                        : "bg-red-950/30 border-red-800 text-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {testResult.basicChat.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span>Basic Generation Response</span>
                    </div>
                    <span>{testResult.basicChat.durationMs ? `${testResult.basicChat.durationMs}ms` : "-"}</span>
                  </div>

                  {/* Streaming Test */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      testResult.streaming.passed
                        ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                        : "bg-red-950/30 border-red-800 text-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {testResult.streaming.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span>Token Streaming Protocol</span>
                    </div>
                    <span>{testResult.streaming.durationMs ? `${testResult.streaming.durationMs}ms` : "-"}</span>
                  </div>

                  {/* Thinking Test */}
                  {testResult.thinkingOn && (
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        testResult.thinkingOn.passed
                          ? "bg-purple-950/30 border-purple-800 text-purple-300"
                          : "bg-[var(--bg-primary,#131418)] border-[var(--border-subtle,#1e2029)] text-[var(--text-secondary,#9ba3b2)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span>Thinking / CoT Reasoning Block</span>
                      </div>
                      <span>{testResult.thinkingOn.producedThinking ? "Verified" : "Skipped"}</span>
                    </div>
                  )}

                  {/* Vision Test */}
                  {testResult.vision && (
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        testResult.vision.passed
                          ? "bg-blue-950/30 border-blue-800 text-blue-300"
                          : "bg-red-950/30 border-red-800 text-red-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span>Vision Encoder Test</span>
                      </div>
                      <span>{testResult.vision.passed ? "Passed" : "Failed"}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] text-xs text-[var(--text-muted,#6b7280)]">
                  Click &quot;Run Diagnostic Tests&quot; to execute real-time latency and capability checks against {modelName}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

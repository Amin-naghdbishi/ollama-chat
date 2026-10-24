import React, { useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  Server,
} from "lucide-react";
import { AppSettings, ConnectionStatus } from "../../types";

interface TroubleshooterViewProps {
  settings: AppSettings;
  connectionStatus: ConnectionStatus;
  onRefreshConnection: () => void;
  onBack: () => void;
}

export const TroubleshooterView: React.FC<TroubleshooterViewProps> = ({
  settings,
  connectionStatus,
  onRefreshConnection,
  onBack,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const troubleshootingSteps = [
    {
      title: "1. Ensure Ollama is installed and running",
      description: "Open your local terminal or command prompt and run the following command to start Ollama:",
      command: "ollama serve",
    },
    {
      title: "2. Configure CORS for Web Browser Access",
      description:
        "When running or developing web clients, Ollama requires CORS permissions to allow requests from the browser:",
      command: 'OLLAMA_ORIGINS="*" ollama serve',
    },
    {
      title: "3. Download a Model",
      description:
        "If you haven't pulled any models yet, install a lightweight model like Llama 3.2, DeepSeek R1, or Qwen 2.5:",
      command: "ollama run llama3.2",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary,#131418)] animate-fadeIn">
      {/* Top Header */}
      <header className="h-14 bg-[var(--bg-header,#0d0d0d)]/90 backdrop-blur-md border-b border-[var(--border-color,#282a36)] px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-medium text-[var(--text-primary,#e6e9f0)] hover:text-white transition-all shadow-xs cursor-pointer group"
            title="Return to previous view"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent-color,#818cf8)] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color,#282a36)]" />

          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            <h1 className="font-semibold text-sm text-[var(--text-primary,#e6e9f0)]">
              Ollama Connection Troubleshooter
            </h1>
          </div>
        </div>

        <button
          onClick={onRefreshConnection}
          className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus.isChecking ? "animate-spin" : ""}`} />
          <span>Retry Connection</span>
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Status Banner */}
          <div
            className={`p-5 rounded-2xl border flex items-center gap-3.5 ${
              connectionStatus.isConnected
                ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                : "bg-red-950/30 border-red-800 text-red-300"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                connectionStatus.isConnected
                  ? "bg-emerald-900/50 border-emerald-700/60 text-emerald-400"
                  : "bg-red-900/50 border-red-700/60 text-red-400"
              }`}
            >
              {connectionStatus.isConnected ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>

            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm">
                {connectionStatus.isConnected
                  ? `Connected to Ollama Instance (${connectionStatus.endpoint})`
                  : `Cannot Connect to Ollama at ${connectionStatus.endpoint}`}
              </span>
              <span className="text-xs opacity-90 font-mono mt-0.5">
                {connectionStatus.isConnected
                  ? "Ollama service is reachable and ready for local inference."
                  : connectionStatus.error || "The server is offline or blocking connections."}
              </span>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-primary,#e6e9f0)] uppercase tracking-wider text-[var(--accent-color,#818cf8)]">
              Quick Setup Steps
            </h3>

            <div className="space-y-4">
              {troubleshootingSteps.map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-primary,#e6e9f0)]">{step.title}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary,#9ba3b2)]">{step.description}</p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary,#131418)] border border-[var(--border-subtle,#1e2029)] font-mono text-xs text-[var(--accent-color,#818cf8)]">
                    <span className="truncate mr-2">$ {step.command}</span>
                    <button
                      onClick={() => handleCopy(step.command, idx)}
                      className="p-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

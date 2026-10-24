import React, { useState } from "react";
import {
  X,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { AppSettings, ConnectionStatus } from "../types";
import { OllamaApi } from "../services/ollamaApi";

interface TroubleshooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  connectionStatus: ConnectionStatus;
  onRefreshConnection: () => void;
}

export const TroubleshooterModal: React.FC<TroubleshooterModalProps> = ({
  isOpen,
  onClose,
  settings,
  connectionStatus,
  onRefreshConnection,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const troubleshootingSteps = [
    {
      title: "1. Ensure Ollama is installed and running",
      description:
        "Open your local terminal or command prompt and run the following command to start Ollama:",
      command: "ollama serve",
    },
    {
      title: "2. Configure CORS for Web Browser Access",
      description:
        "When using web preview environments, Ollama requires CORS permissions to allow requests from the browser:",
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle,#1e2029)] bg-[var(--bg-secondary,#191a21)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">Ollama Setup & Diagnostics</h2>
              <p className="text-xs text-[var(--text-muted,#6b7280)]">
                Target endpoint: <code className="text-amber-400 font-mono">{settings.endpoint}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
          {/* Status banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              connectionStatus.isConnected
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-rose-950/40 border-rose-800 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  connectionStatus.isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="font-semibold text-xs">
                {connectionStatus.isConnected
                  ? `Connected! Version ${connectionStatus.version || "Active"}`
                  : `Cannot connect to Ollama at ${settings.endpoint}`}
              </span>
            </div>

            <button
              onClick={onRefreshConnection}
              className="px-3 py-1.5 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>

          {/* Diagnostic steps */}
          <div className="space-y-4 pt-2">
            {troubleshootingSteps.map((step, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] space-y-2">
                <h3 className="font-semibold text-[var(--text-primary,#e6e9f0)] text-xs">{step.title}</h3>
                <p className="text-[var(--text-secondary,#9ba3b2)] text-xs leading-relaxed">{step.description}</p>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] font-mono text-xs text-emerald-400">
                  <code>{step.command}</code>
                  <button
                    onClick={() => handleCopy(step.command, idx)}
                    className="p-1 rounded hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Copy command"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[var(--bg-secondary,#191a21)] rounded-xl border border-[var(--border-subtle,#1e2029)] text-[var(--text-secondary,#9ba3b2)] text-[11px] flex items-center justify-between">
            <span>Need to download Ollama for macOS, Windows, or Linux?</span>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-color,#818cf8)] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Download Ollama</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-[var(--border-subtle,#1e2029)] bg-[var(--bg-secondary,#191a21)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

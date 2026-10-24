import React, { useState, useEffect } from "react";
import {
  Search,
  MessageSquare,
  Cpu,
  Plus,
  X,
  Command,
  Brain,
} from "lucide-react";
import { Conversation, OllamaModel } from "../types";

interface QuickCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  models: OllamaModel[];
  onSelectConversation: (id: string) => void;
  onSelectModel: (modelName: string) => void;
  onNewConversation: () => void;
  onOpenContextExplorer?: () => void;
}

export const QuickCommandPalette: React.FC<QuickCommandPaletteProps> = ({
  isOpen,
  onClose,
  conversations,
  models,
  onSelectConversation,
  onSelectModel,
  onNewConversation,
  onOpenContextExplorer,
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          /* Triggered by parent */
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredChats = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="relative w-full max-w-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-scaleIn">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle,#1e2029)] bg-[var(--bg-secondary,#191a21)]">
          <Search className="w-4 h-4 text-[var(--text-muted,#6b7280)] mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a chat title or model name..."
            className="w-full bg-transparent text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--btn-bg,#1c1e27)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar text-xs">
          {/* Action: New Chat */}
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-950/40 text-emerald-300 font-medium transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>Start New Chat</span>
          </button>

          {/* Action: Context Explorer */}
          {onOpenContextExplorer && (
            <button
              onClick={() => {
                onOpenContextExplorer();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-indigo-950/40 text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
              </div>
              <span>Open Context Explorer & Memory Manager</span>
            </button>
          )}

          {/* Conversations Section */}
          {filteredChats.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-muted,#6b7280)] uppercase tracking-wider">
                Chats ({filteredChats.length})
              </div>
              {filteredChats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--bg-secondary,#191a21)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors text-left cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[var(--text-muted,#6b7280)] shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                  <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                    {c.modelId}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Models Section */}
          {filteredModels.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-muted,#6b7280)] uppercase tracking-wider">
                Ollama Models ({filteredModels.length})
              </div>
              {filteredModels.map((m) => (
                <button
                  key={m.name}
                  onClick={() => {
                    onSelectModel(m.name);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--bg-secondary,#191a21)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors text-left cursor-pointer"
                >
                  <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)] shrink-0" />
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary,#e6e9f0)]">
                    {m.name}
                  </span>
                  {m.details?.parameter_size && (
                    <span className="text-[10px] bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] text-[var(--text-secondary,#9ba3b2)] px-1.5 py-0.5 rounded font-mono ml-auto">
                      {m.details.parameter_size}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

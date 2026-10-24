import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  MessageSquare,
  BookOpen,
  Search,
  X,
  Pin,
  ExternalLink,
  Plus,
  Clock,
  Cpu,
  FileText,
  Sparkles,
  ArrowRight,
  Folder,
  Tag,
  Check,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import {
  ContextMemoryItem,
  Conversation,
  ContextToolType,
} from "../types";
import { MemoryService } from "../services/memoryService";
import { UnifiedSearchResultItem } from "../lib/retrievalEngine";
import { Language, getTranslation } from "../lib/i18n";

interface ContextToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: "search_memories" | "search_conversations" | "search_context";
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onInsertText: (textToInsert: string) => void;
  onSwitchConversation?: (id: string) => void;
  onOpenContextExplorer?: () => void;
  language?: Language;
}

export const ContextToolsModal: React.FC<ContextToolsModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  conversations,
  activeConversation,
  onInsertText,
  onSwitchConversation,
  onOpenContextExplorer,
  language = "en",
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  const [activeTab, setActiveTab] = useState<"search_memories" | "search_conversations" | "search_context">(initialMode);
  const [query, setQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setQuery("");
      setInsertedId(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialMode]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const folders = useMemo(() => MemoryService.getFolders(), [isOpen]);

  // Unified Search Results based on Active Tab
  const results: UnifiedSearchResultItem[] = useMemo(() => {
    if (!isOpen) return [];

    if (activeTab === "search_memories") {
      return MemoryService.searchMemories(query, {
        folderId: selectedFolderId === "all" ? undefined : selectedFolderId,
        onlyPinned: onlyPinned ? true : undefined,
        maxResults: 30,
      });
    } else if (activeTab === "search_conversations") {
      return MemoryService.searchConversations(query, conversations, {
        maxResults: 30,
      });
    } else if (activeTab === "search_context") {
      return MemoryService.searchActiveContext(query, activeConversation, {
        maxResults: 30,
      });
    }

    return [];
  }, [isOpen, activeTab, query, selectedFolderId, onlyPinned, conversations, activeConversation]);

  // Handle Insertion / Citation into Chat Composer
  const handleInsert = (item: UnifiedSearchResultItem) => {
    let textToInsert = "";

    if (item.type === "memory") {
      const rawMem = item.metadata?.rawObject as ContextMemoryItem | undefined;
      if (rawMem) {
        textToInsert = `[Context Memory: "${rawMem.title}" - ${rawMem.summary}${
          rawMem.keyFacts.length > 0 ? ` | Facts: ${rawMem.keyFacts.join("; ")}` : ""
        }]`;
      } else {
        textToInsert = `[Memory: "${item.title}" - ${item.snippet}]`;
      }
    } else if (item.type === "conversation") {
      textToInsert = `[Reference from chat "${item.title}" (${item.subtitle}): "${item.snippet}"]`;
    } else if (item.type === "context") {
      textToInsert = `[Quoted from ${item.title}: "${item.snippet}"]`;
    } else if (item.type === "file") {
      textToInsert = `[Attached File Context: "${item.title}" - ${item.snippet}]`;
    }

    if (textToInsert) {
      onInsertText(textToInsert);
      setInsertedId(item.id);
      setTimeout(() => {
        onClose();
      }, 350);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[var(--bg-surface,#181920)] border border-[var(--border-color,#323545)] shadow-2xl overflow-hidden text-[var(--text-primary,#e4e6eb)]"
      >
        {/* Header with Tabs */}
        <div className="px-4 py-3.5 border-b border-[var(--border-color,#2b2d3c)] bg-[var(--bg-secondary,#14151b)] flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-color,#818cf8)]/15 border border-[var(--accent-color,#818cf8)]/30 flex items-center justify-center text-[var(--accent-color,#818cf8)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight text-[var(--text-primary,#eee)]">
                  {language === "fa" ? "ابزارهای متنی و حافظه" : "Context & Memory Tools"}
                </h3>
                <p className="text-[11px] text-[var(--text-muted,#8b92a5)]">
                  {language === "fa"
                    ? "جستجو در حافظه‌های عمومی، تاریخچه گفتگوها و متن فعال"
                    : "Search global memories, conversation history, and active context"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenContextExplorer && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenContextExplorer();
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--btn-bg,#222530)] hover:bg-[var(--btn-hover,#2c303f)] border border-[var(--border-color,#36394c)] text-[var(--text-secondary,#9ea5b8)] hover:text-[var(--text-primary,#eee)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={t("contextExplorer")}
                >
                  <Brain className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
                  <span className="hidden sm:inline text-[11px] font-medium">{t("contextExplorer")}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-muted,#8b92a5)] hover:text-[var(--text-primary,#eee)] hover:bg-[var(--btn-hover,#2c303f)] transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-primary,#0f1015)] border border-[var(--border-subtle,#252733)]">
            <button
              onClick={() => {
                setActiveTab("search_memories");
                setQuery("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "search_memories"
                  ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs font-semibold"
                  : "text-[var(--text-secondary,#9ea5b8)] hover:text-[var(--text-primary,#eee)] hover:bg-[var(--btn-hover,#1d1f29)]"
              }`}
            >
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span>{language === "fa" ? "جستجوی حافظه‌ها" : "Search Memories"}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("search_conversations");
                setQuery("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "search_conversations"
                  ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs font-semibold"
                  : "text-[var(--text-secondary,#9ea5b8)] hover:text-[var(--text-primary,#eee)] hover:bg-[var(--btn-hover,#1d1f29)]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>{language === "fa" ? "جستجوی گفتگوها" : "Search Conversations"}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("search_context");
                setQuery("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "search_context"
                  ? "bg-[var(--accent-color,#818cf8)] text-white shadow-xs font-semibold"
                  : "text-[var(--text-secondary,#9ea5b8)] hover:text-[var(--text-primary,#eee)] hover:bg-[var(--btn-hover,#1d1f29)]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{language === "fa" ? "جستجوی متن چت" : "Search Context"}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-3 border-b border-[var(--border-color,#282a38)] bg-[var(--bg-surface,#181920)] flex flex-col gap-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#71788e)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === "search_memories"
                  ? language === "fa"
                    ? "جستجو در حافظه‌ها، تصمیمات، حقایق و نیازمندی‌ها..."
                    : "Search global memories, decisions, facts & requirements..."
                  : activeTab === "search_conversations"
                  ? language === "fa"
                    ? "جستجو در متن پیام‌ها و عنوان تمام گفتگوها..."
                    : "Search past conversations and dialogue turns..."
                  : language === "fa"
                  ? "جستجو در پیام‌ها و فایل‌های این گفتگو..."
                  : "Search messages, system prompt & attachments in active chat..."
              }
              className="w-full bg-[var(--bg-primary,#0f1015)] border border-[var(--border-color,#2e3142)] focus:border-[var(--accent-color,#818cf8)] rounded-xl pl-9 pr-8 rtl:pl-8 rtl:pr-9 py-2 text-xs text-[var(--text-primary,#eee)] placeholder-[var(--text-muted,#60667b)] outline-none transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted,#71788e)] hover:text-[var(--text-primary,#eee)] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Additional Filter Row for Memories */}
          {activeTab === "search_memories" && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[var(--text-muted,#8b92a5)]" />
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="bg-[var(--bg-primary,#121319)] border border-[var(--border-color,#2b2e3d)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-secondary,#a8b0c4)] outline-none cursor-pointer"
                >
                  <option value="all">{language === "fa" ? "همه دسته‌ها" : "All Categories"}</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setOnlyPinned((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  onlyPinned
                    ? "bg-amber-950/40 border-amber-700/60 text-amber-300"
                    : "bg-[var(--bg-primary,#121319)] border-[var(--border-color,#2b2e3d)] text-[var(--text-muted,#8b92a5)] hover:text-[var(--text-secondary,#ccc)]"
                }`}
              >
                <Pin className="w-3 h-3 text-amber-400 fill-amber-400/40" />
                <span>{language === "fa" ? "فقط سنجاق‌شده‌ها" : "Pinned Only"}</span>
              </button>

              <span className="text-[11px] text-[var(--text-muted,#6f768b)] ml-auto rtl:ml-0 rtl:mr-auto">
                {results.length} {language === "fa" ? "مورد یافت شد" : "memories"}
              </span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-[260px] max-h-[420px]">
          {results.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary,#12131a)] border border-[var(--border-color,#262936)] flex items-center justify-center text-[var(--text-muted,#60667b)] mb-3">
                <Search className="w-6 h-6 opacity-60" />
              </div>
              <h4 className="text-xs font-semibold text-[var(--text-secondary,#b0b8cb)] mb-1">
                {language === "fa" ? "موردی یافت نشد" : "No results found"}
              </h4>
              <p className="text-[11px] text-[var(--text-muted,#737b90)] max-w-sm">
                {query
                  ? language === "fa"
                    ? `هیچ نتیجه‌ای با عبارت "${query}" مطابقت نداشت. لطفاً عبارت دیگری جستجو کنید.`
                    : `No matches for "${query}". Try different keywords or reset filters.`
                  : activeTab === "search_memories"
                  ? language === "fa"
                    ? "هنوز حافظه‌ای در سیستم ثبت نشده است. با چت کردن و فشرده‌سازی متن یا از طریق Context Explorer حافظه بسازید."
                    : "No memories saved yet. Memories are automatically generated from chats or manually in Context Explorer."
                  : language === "fa"
                  ? "هیچ پیامی برای نمایش وجود ندارد."
                  : "No messages available in this view."}
              </p>
            </div>
          ) : (
            results.map((item) => {
              const isJustInserted = insertedId === item.id;
              const isMem = item.type === "memory";
              const isConv = item.type === "conversation";
              const rawMem = item.metadata?.rawObject as ContextMemoryItem | undefined;

              return (
                <div
                  key={item.id}
                  className="group relative p-3 rounded-xl bg-[var(--bg-secondary,#13141a)] hover:bg-[var(--bg-hover,#1a1b24)] border border-[var(--border-color,#282a38)] hover:border-[var(--border-hover,#3e4256)] transition-all flex flex-col gap-1.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isMem ? (
                        <div className="w-6 h-6 rounded-lg bg-[var(--accent-color,#818cf8)]/15 border border-[var(--accent-color,#818cf8)]/30 flex items-center justify-center text-[var(--accent-color,#818cf8)] shrink-0">
                          <Brain className="w-3.5 h-3.5" />
                        </div>
                      ) : isConv ? (
                        <div className="w-6 h-6 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-sky-950/40 border border-sky-800/40 flex items-center justify-center text-sky-400 shrink-0">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <h4 className="font-semibold text-xs text-[var(--text-primary,#eee)] truncate">
                        {item.title}
                      </h4>

                      {rawMem?.isPinned && (
                        <span className="px-1.5 py-0.2 text-[9.5px] rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5 fill-current" />
                          <span>Pinned</span>
                        </span>
                      )}

                      {rawMem?.importance && (
                        <span
                          className={`px-1.5 py-0.2 text-[9.5px] rounded uppercase font-mono border ${
                            rawMem.importance === "critical"
                              ? "bg-rose-950/50 text-rose-300 border-rose-800/50"
                              : rawMem.importance === "high"
                              ? "bg-amber-950/50 text-amber-300 border-amber-800/50"
                              : "bg-zinc-800/50 text-zinc-400 border-zinc-700/50"
                          }`}
                        >
                          {rawMem.importance}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConv && item.provenance.conversationId && onSwitchConversation && (
                        <button
                          onClick={() => {
                            onClose();
                            onSwitchConversation(item.provenance.conversationId!);
                          }}
                          className="px-2 py-1 rounded-lg text-[10.5px] bg-[var(--btn-bg,#1e202b)] hover:bg-[var(--btn-hover,#292c3a)] border border-[var(--border-color,#333649)] text-[var(--text-secondary,#9ea5b8)] hover:text-[var(--text-primary,#eee)] flex items-center gap-1 transition-colors cursor-pointer"
                          title={language === "fa" ? "رفتن به این گفتگو" : "Open Conversation"}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">{language === "fa" ? "باز کردن" : "Open"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleInsert(item)}
                        disabled={isJustInserted}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isJustInserted
                            ? "bg-emerald-600 text-white shadow-xs font-semibold"
                            : "bg-[var(--accent-color,#818cf8)] hover:bg-[var(--accent-hover,#6366f1)] text-white shadow-xs active:scale-95"
                        }`}
                      >
                        {isJustInserted ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === "fa" ? "اضافه شد" : "Inserted"}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {isMem
                                ? language === "fa"
                                  ? "درج در متن"
                                  : "Insert into Chat"
                                : isConv
                                ? language === "fa"
                                  ? "نقل قول"
                                  : "Cite in Prompt"
                                : language === "fa"
                                ? "نقل در پیام"
                                : "Quote in Prompt"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Subtitle / Provenance */}
                  {item.subtitle && (
                    <div className="text-[10.5px] font-mono text-[var(--text-muted,#7f879d)] flex items-center gap-2">
                      <span>{item.subtitle}</span>
                      {item.metadata?.tokenEstimate && (
                        <span>• ~{item.metadata.tokenEstimate} tok</span>
                      )}
                    </div>
                  )}

                  {/* Snippet / Facts */}
                  <p className="text-[11.5px] text-[var(--text-secondary,#c0c6d6)] leading-relaxed line-clamp-3 bg-[var(--bg-primary,#0e0f14)] p-2 rounded-lg border border-[var(--border-subtle,#1f212c)]">
                    {item.snippet}
                  </p>

                  {/* Facts bullets if Memory */}
                  {rawMem?.keyFacts && rawMem.keyFacts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {rawMem.keyFacts.slice(0, 3).map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-1.5 py-0.5 rounded bg-[var(--bg-primary,#12131a)] border border-[var(--border-color,#252735)] text-[10px] text-[var(--text-muted,#8d95ab)] truncate max-w-[240px]"
                        >
                          • {f}
                        </span>
                      ))}
                      {rawMem.keyFacts.length > 3 && (
                        <span className="text-[10px] text-[var(--text-muted,#6e758a)] self-center">
                          +{rawMem.keyFacts.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-[var(--border-color,#2b2d3c)] bg-[var(--bg-secondary,#14151b)] flex items-center justify-between text-[11px] text-[var(--text-muted,#788096)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {language === "fa"
                ? "حافظه مستقل از مدل (Global Memory Store)"
                : "Application-level Global Memory (Model ≠ Memory)"}
            </span>
          </div>
          <span className="font-mono text-[10px]">Esc to close</span>
        </div>
      </motion.div>
    </div>
  );
};
